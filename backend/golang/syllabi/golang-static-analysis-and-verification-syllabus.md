---
title: "Go Static Analysis and Verification Engineering Syllabus"
description: "A 12-week advanced curriculum for senior Go engineers on proving code correct before it ships: parsing and type-checking internals, custom analyzers with go/analysis, SSA dataflow analysis, linter governance, coverage-guided fuzzing, race detection, property-based and mutation testing, concurrency model checking, and CI enforcement."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Go Static Analysis and Verification Engineering Syllabus

## Overview

Most engineering teams treat correctness as something the review process catches by accident. Go makes a different bargain available: the toolchain ships a parser, a type checker, a whole-program loader, an SSA builder, a race detector, and a coverage-guided fuzzer as importable libraries. That means a team can encode its own definition of "correct" as an executable check and run it on every pull request, instead of writing it in a style guide nobody reads.

This 12-week advanced syllabus is for Go engineers who already ship production services and now want to own the machinery that decides whether code is allowed to merge. Weeks 1 through 3 build the foundation: what the language actually guarantees, how `go/parser` turns source into a syntax tree, and how `go/types` resolves identifiers and evaluates the type system. Weeks 4 through 7 build the analysis layer: analyzers with `golang.org/x/tools/go/analysis`, whole-program loading with `go/packages`, static single assignment and dataflow analysis, and then the operational problem of governing a linter fleet without drowning developers in noise. Weeks 8 through 11 cover dynamic verification: fuzzing, the race detector, property-based and mutation testing, deterministic simulation, and finally model checking of concurrency invariants. Week 12 is a capstone in which learners ship a real analyzer and a verification gate into a working repository.

The curriculum is ordered by dependency, not by fashion. You cannot write a meaningful dataflow analysis (Week 6) without knowing the type checker's output (Week 3), and you cannot decide which checks belong in CI (Week 11) without having measured their false-positive rate (Week 7). Every module ends in a lab that produces a working program or a measured result, and those labs accumulate into the capstone rather than being discarded exercises.

By the end of the course, learners will be able to read and manipulate Go source programmatically, write and distribute custom analyzers with fixes that apply themselves, reason about dataflow to catch bugs that grep cannot, calibrate a linter fleet so developers trust its signal, and combine fuzzing, race detection, and model checking into a verification strategy that is honest about what it does and does not prove.

## Curriculum

### Module 1: Correctness as an Engineering Discipline (Week 1)

- **What the Go compiler actually guarantees**
  - Type safety, memory safety in safe code, and the absence of uninitialized variables — and the boundaries where `unsafe`, `reflect`, and `cgo` dissolve them
  - Nil pointer dereference, nil map write, and index-out-of-range as runtime panics rather than compile errors
  - Why "it compiles" is a statement about syntax and types, never about behavior
- **A taxonomy of defects**
  - Specification defects (the code does what was asked, and what was asked was wrong)
  - Dataflow defects (an error is dropped, a lock is not released, a context is not checked)
  - Concurrency defects (data races, deadlocks, goroutine leaks, lost wakeups)
  - Resource defects (leaked file descriptors, unbounded queues, missing `defer` cleanup)
- **The verification ladder**
  - Types → static analysis → unit tests → property tests → fuzzing → runtime assertions → model checking → formal proof
  - Cost of detection versus cost of escape, and why pushing checks left is an economic argument rather than a moral one
  - Soundness versus completeness in practice: every useful check must accept some false negatives to stay usable
- **The economics of noise**
  - Signal-to-noise ratio as the primary metric of a verification system
  - Why a linter with a 2 percent false-positive rate gets disabled within a quarter
  - Baseline ratcheting: enforcing "no new violations" so legacy debt never blocks forward progress
- **Hands-on Lab**: Classify ten real defects from a public Go project's issue tracker into the taxonomy above, and for each one identify the cheapest check that would have caught it before merge

### Module 2: Parsing and the Go AST (Week 2)

- **The token layer**
  - `go/token`: `FileSet`, `File`, `Pos`, and `Position` — why positions are offsets and how to convert them to line and column
  - `go/scanner` and how Go's automatic semicolon insertion shows up in the token stream
- **Building the tree**
  - `go/parser.ParseFile` in `ParseComments` mode and the difference between parser modes
  - Using `parser.ParseDir` and `go/ast.File` declarations to enumerate functions, types, and imports
  - Error-tolerant parsing: why returning a partial AST with an error is often the right behavior for a linter
- **Traversing and pattern matching**
  - `ast.Inspect` versus `ast.Walk`, and how to stop descent early
  - Type-asserting nodes with `astutil.Apply` and the `astutil` filter helpers
  - The difference between an `*ast.Ident` used as a declaration and the same identifier used as a reference
- **Rewriting source safely**
  - `go/printer` with `printer.Config{Tabwidth: 8, Mode: printer.UseSpaces | printer.TabIndent}`
  - Why printing an AST loses comments attached outside the node's position range
  - `golang.org/x/tools/go/ast/astutil` for import insertion and deletion
- **Hands-on Lab**: Write a tool that walks a package and reports every function whose `context.Context` is the first parameter but never used in the body, printing file, line, and column

```go
package main

import (
    "fmt"
    "go/ast"
    "go/parser"
    "go/token"
    "os"
)

func main() {
    fset := token.NewFileSet()
    file, err := parser.ParseFile(fset, os.Args[1], nil, parser.ParseComments)
    if err != nil {
        fmt.Fprintf(os.Stderr, "parse error: %v\n", err)
        os.Exit(1)
    }

    ast.Inspect(file, func(n ast.Node) bool {
        fn, ok := n.(*ast.FuncDecl)
        if !ok || fn.Body == nil {
            return true
        }
        if !hasContextParam(fn) {
            return true
        }
        pos := fset.Position(fn.Pos())
        fmt.Printf("%s:%d:%d %s takes a context but does not use it\n",
            pos.Filename, pos.Line, pos.Column, fn.Name.Name)
        return true
    })
}

func hasContextParam(fn *ast.FuncDecl) bool {
    if fn.Type.Params == nil || len(fn.Type.Params.List) == 0 {
        return false
    }
    first := fn.Type.Params.List[0]
    sel, ok := first.Type.(*ast.SelectorExpr)
    if !ok {
        return false
    }
    pkg, ok := sel.X.(*ast.Ident)
    return ok && pkg.Name == "context" && sel.Sel.Name == "Context"
}
```

### Module 3: Type Checking with go/types (Week 3)

- **Why the type checker is the real source of truth**
  - Syntactic analysis sees names; type analysis sees objects, and objects are what you actually want to reason about
  - How `go/types` re-implements the language specification, and why the compiler and the checker must agree
- **Running the checker**
  - `types.Config` with `Importer`, `Error` callback, and `Sizes` for target platform correctness
  - `types.Info` maps: `Types`, `Defs`, `Uses`, `Selections`, `Scopes`, `Implicits`, and what each answers
  - Resolving an identifier to its declaration with `Info.Defs` versus `Info.Uses`
- **The type system in code**
  - Named versus underlying types, and `types.Unalias` in the post-generics world
  - Interfaces and `types.Implements`, including method sets on pointer versus value receivers
  - Type parameters: `*types.TypeParam`, `*types.TypeList`, and instantiated signatures
- **Practical traps**
  - Checking only a single package produces unresolved imports — you need an importer over export data
  - Type errors cascade: one bad declaration can poison hundreds of uses, so decide early whether to abort or continue
  - `types.Object` identity is per-checker-run; never persist it across runs
- **Hands-on Lab**: Write a checker pass that reports every exported function returning a concrete error type instead of `error`, and verify it on a package that uses `*url.Error`

```go
package main

import (
    "fmt"
    "go/ast"
    "go/importer"
    "go/parser"
    "go/token"
    "go/types"
    "os"
)

func main() {
    dir := os.Args[1]
    fset := token.NewFileSet()
    pkgs, err := parser.ParseDir(fset, dir, nil, 0)
    if err != nil {
        fmt.Fprintf(os.Stderr, "parse: %v\n", err)
        os.Exit(1)
    }

    info := &types.Info{
        Types: map[ast.Expr]types.TypeAndValue{},
        Defs:  map[*ast.Ident]types.Object{},
        Uses:  map[*ast.Ident]types.Object{},
    }

    for _, pkg := range pkgs {
        conf := types.Config{Importer: importer.Default()}
        if _, err := conf.Check(pkg.Name, fset, fileSlice(pkg), info); err != nil {
            fmt.Fprintf(os.Stderr, "type check: %v\n", err)
        }
    }

    for ident, obj := range info.Defs {
        fn, ok := obj.(*types.Func)
        if !ok || !fn.Exported() {
            continue
        }
        sig, ok := fn.Type().(*types.Signature)
        if !ok || sig.Results().Len() == 0 {
            continue
        }
        last := sig.Results().At(sig.Results().Len() - 1)
        if !types.IsInterface(last.Type()) && ident.Name != "main" {
            pos := fset.Position(ident.Pos())
            fmt.Printf("%s: %s returns concrete %s\n", pos, fn.Name(), last.Type().String())
        }
    }
}

func fileSlice(pkg *ast.Package) []*ast.File {
    files := make([]*ast.File, 0, len(pkg.Files))
    for _, f := range pkg.Files {
        files = append(files, f)
    }
    return files
}
```

### Module 4: Writing Analyzers with golang.org/x/tools/go/analysis (Week 4)

- **The analyzer contract**
  - The `analysis.Analyzer` struct: `Name`, `Doc`, `Flags`, `Requires`, and `Run`
  - Why `Run(pass *analysis.Pass) (interface{}, error)` returns an opaque result that other analyzers consume
  - `Requires` for dependency ordering: reusing a type checker instead of rebuilding one
- **Reporting findings that developers act on**
  - `pass.Reportf` versus `analysis.Diagnostic` with explicit `Pos` and `End`
  - `Diagnostic.Related` for multi-location findings such as a lock acquired here and never released there
  - `SuggestedFixes` and `TextEdit`: making the fix a keystroke instead of a chore, which is the single largest driver of adoption
- **Cross-package facts**
  - `pass.ExportObjectFact` and `pass.ImportObjectFact` for results that must survive past one package
  - Why facts require a serializable encoding and why time-dependent data cannot go in them
- **Testing analyzers**
  - `analysistest.Run` with the `// want "regexp"` annotation convention
  - Golden-file testing for suggested fixes with `analysistest.RunWithSuggestedFixes`
  - Wiring the analyzer into `go vet` via the `unitchecker` protocol for zero-friction local use
- **Hands-on Lab**: Ship a `deferinloop` analyzer that flags `defer` inside a loop body, with a suggested fix that extracts the body into a helper function

```go
package deferinloop

import (
    "go/ast"
    "golang.org/x/tools/go/analysis"
)

var Analyzer = &analysis.Analyzer{
    Name: "deferinloop",
    Doc:  "reports defer statements inside loop bodies, which accumulate until the function returns",
    Run:  run,
}

func run(pass *analysis.Pass) (interface{}, error) {
    for _, file := range pass.Files {
        ast.Inspect(file, func(n ast.Node) bool {
            loop, ok := n.(*ast.ForStmt)
            if !ok || loop.Body == nil {
                return true
            }
            ast.Inspect(loop.Body, func(inner ast.Node) bool {
                def, ok := inner.(*ast.DeferStmt)
                if !ok {
                    return true
                }
                pass.Report(analysis.Diagnostic{
                    Pos:     def.Pos(),
                    End:     def.End(),
                    Message: "defer inside loop body holds resources until the enclosing function returns",
                })
                return true
            })
            return true
        })
    }
    return nil, nil
}
```

### Module 5: Whole-Program Loading and Analysis at Scale (Week 5)

- **go/packages as the loader**
  - `packages.Load` with a `Config{Mode: ...}`: `NeedSyntax`, `NeedTypes`, `NeedTypesInfo`, `NeedDeps`, and `NeedModule`
  - The cost curve: `NeedDeps` with syntax across a thousand packages is gigabytes, so load what you need per analyzer
  - Module-aware loading versus GOPATH mode, and what `GOFLAGS` does to your run in CI
- **Multi-package drivers**
  - `singlechecker` for one analyzer, `multichecker` for a suite, `unitchecker` for `go vet -vettool`
  - Building an analysis driver binary and running it as a `go vet` replacement across a monorepo
- **Incremental analysis**
  - Why full re-analysis on every save is unacceptable and what caching key must include (source hash, Go version, flags, analyzer version)
  - Content-addressed caching with facts serialized to disk
- **Failure modes at scale**
  - Build-tag-dependent code: analyzing `linux` files on a `darwin` runner produces phantom results
  - Packages that fail to type-check poisoning dependents, and the policy decision to skip or abort them
  - Generated files: detecting `// Code generated ... DO NOT EDIT.` and deciding whether to analyze them
- **Hands-on Lab**: Build a driver that loads a repository with `NeedSyntax | NeedTypes | NeedTypesInfo | NeedDeps`, runs three analyzers, caches results by content hash, and reports the second run's wall-clock speedup

```go
package main

import (
    "fmt"
    "os"
    "time"

    "golang.org/x/tools/go/packages"
)

func main() {
    cfg := &packages.Config{
        Mode:  packages.NeedName | packages.NeedSyntax | packages.NeedTypes | packages.NeedTypesInfo | packages.NeedDeps,
        Tests: false,
    }

    start := time.Now()
    pkgs, err := packages.Load(cfg, os.Args[1:]...)
    if err != nil {
        fmt.Fprintf(os.Stderr, "load: %v\n", err)
        os.Exit(1)
    }

    loaded, files := 0, 0
    packages.Visit(pkgs, nil, func(p *packages.Package) {
        loaded++
        files += len(p.Syntax)
    })

    fmt.Printf("loaded %d packages and %d syntax files in %s\n", loaded, files, time.Since(start).Round(time.Millisecond))
}
```

### Module 6: SSA and Dataflow Analysis (Week 6)

- **Static single assignment**
  - `ssa.NewProgram` with `ssa.BuilderMode(0)` and `prog.Build()` over loaded packages
  - Basic blocks, `ssa.Value`, `ssa.Instruction`, and phi nodes — why SSA makes reaching definitions trivial
  - Converting between AST and SSA: `ssautil.AllFunctions` and the `Function` type
- **Building the call graph**
  - `callgraph.CHA`, `RTA`, and `VTA`: precision versus cost, and when CHA's over-approximation is acceptable
  - Why RTA requires a synthetic root over `main` and `init` to be sound
- **Dataflow in practice**
  - Forward and backward analyses, lattices, and the monotonicity requirement that guarantees termination
  - Modeling a bug as a path property: acquire without release, write without flush, decode without close
- **Taint analysis as the flagship case**
  - Sources (`http.Request` fields), sinks (`database/sql` query strings), and sanitizers
  - Building the sanitizer list first, because a taint analysis without one is a false-positive generator
  - Interprocedural propagation and the soundness cliff you accept at library boundaries
- **Hands-on Lab**: Implement a backward dataflow analysis that reports any `*sql.Rows` value whose originating `Query` call is not followed by a `Close` on every path to function exit

```go
package main

import (
    "fmt"
    "os"

    "golang.org/x/tools/go/packages"
    "golang.org/x/tools/go/ssa"
    "golang.org/x/tools/go/ssa/ssautil"
)

func main() {
    cfg := &packages.Config{Mode: packages.NeedSyntax | packages.NeedTypes | packages.NeedTypesInfo | packages.NeedDeps}
    pkgs, err := packages.Load(cfg, os.Args[1:]...)
    if err != nil {
        fmt.Fprintf(os.Stderr, "load: %v\n", err)
        os.Exit(1)
    }

    prog, ssaPkgs := ssautil.AllPackages(pkgs, ssa.InstantiateGenerics)
    prog.Build()

    for _, p := range ssaPkgs {
        if p == nil {
            continue
        }
        for _, fn := range p.Members {
            f, ok := fn.(*ssa.Function)
            if !ok || f.Blocks == nil {
                continue
            }
            fmt.Printf("%s: %d blocks, %d params\n", f.String(), len(f.Blocks), len(f.Params))
        }
    }
}
```

### Module 7: Governing the Linter Ecosystem (Week 7)

- **How golangci-lint actually works**
  - It is a runner, not a checker: each enabled linter is an adapter over an analyzer or a native implementation
  - Presets, `enable`/`disable`, `enable-all` traps, and the per-linter settings block
  - Why running 40 linters is not 40 times better than running 5, and how overlapping checks produce contradictory advice
- **Choosing a defensible set**
  - Start from `errcheck`, `govet`, `staticcheck`, `ineffassign`, `unused`, `bodyclose`, `nilerr`, `errorlint`, and `gosec` where the threat model justifies it
  - Judging a linter by its remediation rate, not its finding count
- **Suppression policy**
  - `//nolint:lintername // reason` — mandatory reason, mandatory named linter, never a bare `//nolint`
  - Suppression review: a quarterly report of suppressions per file, with a cap that forces refactoring
  - `exclude-rules` for generated code and test fixtures instead of sprinkling directives
- **Baseline ratcheting and CI gates**
  - Recording the current violation count per linter and failing only when it increases
  - Per-directory budgets so a new package starts at zero
  - Making the gate fast: cache warm-up, changed-package-only analysis, and a hard time budget
- **Hands-on Lab**: Take a repository with 300 violations and produce a configuration plus baseline that passes CI immediately while guaranteeing the count can only decrease

### Module 8: Fuzzing, Race Detection, and Leak Verification (Week 8)

- **Native fuzzing**
  - `func FuzzX(f *testing.F)` with `f.Add` seeds and `f.Fuzz` targets, and how `go test -fuzz` does coverage-guided mutation
  - The corpus directory (`testdata/fuzz/FuzzX`), crasher minimization, and turning a found input into a permanent regression seed
  - Writing fuzz targets that reach deep code: seeding with valid encodings instead of empty strings
- **What fuzzing cannot find**
  - Bugs behind authentication, timing, or external I/O without a seam to inject
  - Semantic bugs: fuzzing proves "does not panic," not "returns the right answer," which is why differential fuzzing against a reference implementation matters
- **The race detector**
  - `go test -race` and the happens-before vector clock implementation underneath
  - Why a clean `-race` run is not proof of race freedom: it only reports races it actually observes
  - ThreadSanitizer's tenfold cost and how to run it on a subset in CI rather than everything
- **Leak detection**
  - `go.uber.org/goleak` with `VerifyTestMain` to fail a package on leftover goroutines
  - Tracking file descriptors and connection pool saturation as a companion check
- **Hands-on Lab**: Fuzz a URL parser and a CSV writer, feed every crasher back as a corpus seed, then run the same package under `-race` and `goleak` and write up which class of defect each method caught

```go
package parser

import "testing"

func FuzzParseQuery(f *testing.F) {
    f.Add("a=1&b=2")
    f.Add("")
    f.Add("k=%zz")

    f.Fuzz(func(t *testing.T, raw string) {
        got, err := ParseQuery(raw)
        if err != nil {
            return
        }
        for k, v := range got {
            if k == "" && v != "" {
                t.Fatalf("empty key with non-empty value %q for input %q", v, raw)
            }
        }
    })
}
```

### Module 9: Property-Based Testing and Mutation Testing (Week 9)

- **Properties over examples**
  - The three property families that find real bugs: round-trip (encode then decode equals input), invariants (order is preserved), and metamorphic relations (sorting twice equals sorting once)
  - `testing/quick` for straightforward cases and `pgregory.net/rapid` for shrinking and stateful properties
  - Generating valid inputs from a constrained generator instead of hoping random bytes hit the happy path
- **Stateful property testing**
  - Modeling a system as commands with preconditions and postconditions, then letting the framework explore sequences
  - Using a simple in-memory model as the oracle for a concurrent or persistent implementation
- **Mutation testing**
  - Deliberately breaking code (`<` to `<=`, `&&` to `||`) and checking whether the suite notices
  - `go-mutesting` and `ooze` for Go, and why mutation score beats line coverage as a suite-quality metric
  - The economic limit: mutating a large repository is expensive, so target the packages that carry the most risk
- **Deterministic simulation testing**
  - Replacing time, randomness, network, and disk with a seeded simulation harness that runs thousands of executions per second
  - Reproducing a failure by replaying a seed, and shrinking a failing schedule
- **Hands-on Lab**: Write a stateful property test for an in-memory LRU cache, then run mutation testing on the same package and raise the mutation score above 80 percent

### Module 10: Concurrency Verification and Model Checking (Week 10)

- **The Go memory model**
  - Happens-before as the only currency: goroutine creation, channel send and receive, mutex lock and unlock, and `sync/atomic`
  - Why `sync.Once`, `errgroup`, and `context` are memory-model constructs, not convenience wrappers
- **Reasoning about invariants**
  - Stating an invariant before writing the code, then identifying every transition that could violate it
  - Common broken patterns: check-then-act outside a lock, close-once assumptions violated by two closers, channel close versus send ordering
- **Model checking with TLA+ and PlusCal**
  - Writing a small specification: variables, `Init`, `Next`, and an invariant checked over all reachable states
  - Translating a Go mutex-and-channel design into a specification, then letting the model checker find the interleaving that breaks it
  - Reading a counterexample trace and mapping it back to the Go code
- **Linearizability checking in tests**
  - Recording a concurrent history and checking it against a sequential specification with `porcupine`
  - Why this catches reordering bugs that `-race` cannot, since reordering is not a data race
- **Hands-on Lab**: Specify a bounded work queue with a close protocol in PlusCal, find a lost-wakeup interleaving with the model checker, fix the design, then confirm the fix with a `porcupine` linearizability test

```text
---- MODULE BoundedQueue ----
EXTENDS Integers, Sequences, TLC

CONSTANTS Capacity

VARIABLES queue, closed, producers, consumers

Init ==
  /\ queue = <<>>
  /\ closed = FALSE
  /\ producers = {}
  /\ consumers = {}

Produce(p, v) ==
  /\ p \notin producers
  /\ Len(queue) < Capacity
  /\ queue' = Append(queue, v)
  /\ producers' = producers \union {p}
  /\ UNCHANGED <<closed, consumers>>

Consume(c) ==
  /\ c \notin consumers
  /\ Len(queue) > 0
  /\ queue' = Tail(queue)
  /\ consumers' = consumers \union {c}
  /\ UNCHANGED <<closed, producers>>

Next ==
  \/ \E p \in {1, 2}, v \in {1, 2} : Produce(p, v)
  \/ \E c \in {1, 2} : Consume(c)

NoOverCapacity == Len(queue) <= Capacity
====
```

### Module 11: Operating Verification in CI and On-Call Reality (Week 11)

- **Designing the gate**
  - Layering: fast checks on every push, expensive checks nightly, fuzzing continuously on a dedicated corpus branch
  - Time budgets per stage and what to do when a stage exceeds them
  - Reproducibility: pinning tool versions so a linter upgrade cannot fail a build that did not change
- **Reporting that engineers read**
  - Inline annotations on the diff versus a wall of console output
  - Grouping findings by root cause so one refactor resolves twenty reports
  - Distinguishing new violations from pre-existing debt in every message
- **Measuring the program**
  - Defect escape rate, time-to-detect, false-positive ratio per check, and remediation latency
  - Retiring checks that never fire or that developers always suppress — both are dead weight
- **The human side**
  - Writing the policy: what must be fixed now, what may be baselined, who approves an exception
  - Onboarding: a new contributor's first pull request must not be a wall of red
- **Hands-on Lab**: Take the analyzer from Module 4, wire it into a CI workflow with caching and inline annotations, and document the policy that governs when a finding blocks a merge

### Module 12: Capstone Project (Week 12)

- Build a **custom analyzer plus a verification gate** for a real Go repository, and defend every design decision with measured data
- Must demonstrate at least five of the following: a `go/analysis` analyzer with suggested fixes, cross-package facts, SSA- or callgraph-based dataflow, a golangci-lint integration, a fuzz target promoted from a real crasher, a `-race` and `goleak` configuration, a stateful property test, a mutation score report, a PlusCal specification with a checked invariant, and a CI gate with baselining
- Deliver a noise budget: every check shipped must report its false-positive ratio measured on at least five real repositories
- Publish a short design document explaining what the gate does not catch, because the honest boundary of a verification system matters more than its feature list

## Final Project

Learners build a complete verification system for a Go service or library of their choosing — not a demo, but the checks that would actually gate their own team's merges.

- **Pick one target repository**:
  - **Service**: an HTTP or gRPC service with a database dependency, so error handling, context propagation, and connection lifecycle all become analyzable
  - **Library**: a package with a public API and nontrivial invariants, so the property tests and mutation analysis have real semantics to defend
- **Required deliverables**:
  - A custom `go/analysis` analyzer that catches a defect class no off-the-shelf linter catches in that codebase, with at least one suggested fix
  - A test for the analyzer itself using `analysistest`, including cases that must not be flagged
  - A golangci-lint configuration with a documented baseline, a suppression policy, and a measured false-positive ratio
  - A fuzz target seeded from at least one real crasher, plus a `-race` and `goleak` configuration
  - A stateful property test whose oracle is an independent model
  - A mutation score for the two highest-risk packages, with the surviving mutants listed and explained
  - One concurrency design specified in PlusCal or TLA+ with an invariant the model checker verifies
  - A CI workflow wiring the fast gate and the nightly deep checks together
- **Presentation**: a 15-minute walkthrough that states the invariant being protected, the evidence it holds, and the classes of defect the system still misses

## Assessment Criteria

- **Weekly Labs (30%)**
  - 10 graded labs across Weeks 1 through 11, each producing a working tool or a measured result rather than a written answer
  - Graded on whether the check produces correct findings on a real codebase and stays quiet on code that is correct
  - Late submissions penalized 10% per day

- **Quizzes (20%)**
  - 4 quizzes at the end of Weeks 3, 6, 9, and 11
  - Conceptual questions on type-checker behavior, dataflow lattice properties, happens-before reasoning, and fuzzing semantics
  - Learners must be able to predict a check's output on a given snippet, not merely recall an API
  - Minimum 70 percent pass rate required to proceed to the capstone

- **Capstone Project (40%)**
  - Analyzer quality: correctness, absence of false positives on correct code, and usefulness of the suggested fix (15%)
  - Verification breadth: coverage of static, dynamic, and model-level checks with evidence each works (15%)
  - Engineering quality: tests, documentation, CI integration, and reproducibility (7%)
  - Design document and final presentation quality (3%)

- **Participation and Code Reviews (10%)**
  - Peer review of two classmates' analyzer designs before implementation
  - Constructive critique of false-positive analysis and suppression policy
  - Attendance and lab-discussion participation

## References

- [The Go Programming Language Specification](https://go.dev/ref/spec) — The authoritative definition of what the language guarantees
- [The Go Memory Model](https://go.dev/ref/mem) — Happens-before rules and the formal basis for race reasoning
- [go/ast documentation](https://pkg.go.dev/go/ast) — AST node types, traversal, and inspection
- [go/types documentation](https://pkg.go.dev/go/types) — The type checker, `Info` maps, and the type system API
- [golang.org/x/tools/go/analysis](https://pkg.go.dev/golang.org/x/tools/go/analysis) — The analyzer framework, diagnostics, facts, and suggested fixes
- [golang.org/x/tools/go/packages](https://pkg.go.dev/golang.org/x/tools/go/packages) — Whole-program loading with build-system fidelity
- [golang.org/x/tools/go/ssa](https://pkg.go.dev/golang.org/x/tools/go/ssa) — SSA construction and the call graph builders
- [Staticcheck](https://staticcheck.dev/docs/) — The most rigorous Go static analysis suite and a study in check design
- [golangci-lint documentation](https://golangci-lint.run/) — Linter runner configuration, presets, and exclusion rules
- [Go Fuzzing](https://go.dev/doc/fuzz/) — Official guide to native coverage-guided fuzzing
- [Data Race Detector](https://go.dev/doc/articles/race_detector) — How `-race` works and what it can and cannot observe
- [pgregory.net/rapid](https://pgregory.net/rapid) — Property-based testing with integrated shrinking for Go
- [go.uber.org/goleak](https://github.com/uber-go/goleak) — Goroutine leak detection for tests
- [porcupine](https://github.com/anishathalye/porcupine) — Linearizability checking for concurrent Go data structures
- [Specifying Systems (Leslie Lamport)](https://lamport.azurewebsites.net/tla/book.html) — The TLA+ book, including the PlusCal language
- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/) — Background on the distributed failures that model checking is meant to surface
