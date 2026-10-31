---
title: "Go CLI and Tooling Syllabus"
description: "A six-week curriculum for building production-grade Go command-line tools: command design, Cobra and Viper, layered configuration, reproducible cross-compiled builds, scripted end-to-end tests, and signed releases with GoReleaser."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Go CLI and Tooling Syllabus

## Overview

Go is the default language for infrastructure tooling for one practical reason: `go build` produces a single static binary with no runtime dependency, sub-20 ms startup, and a cross-compilation matrix that fits in a shell loop. Docker, kubectl, Terraform, gh, and Helm are all distributed this way. Yet most teams write their internal CLIs as an afterthought — a `main.go` that parses `os.Args`, prints to stdout, and exits with code 0 no matter what happened.

This six-week course treats the command-line interface as a product surface with its own design constraints: discoverable command grammar, layered configuration that respects twelve-factor environments, deterministic builds, scriptable test coverage, and a release pipeline that ships checksums and signatures rather than a tarball on a wiki page.

The curriculum is ordered by dependency. Weeks 1 and 2 establish the user-facing contract (grammar, then Cobra). Week 3 makes that contract configurable. Week 4 makes it buildable and shippable for every OS. Week 5 proves it works with tests a CI runner can execute. Week 6 publishes it. Each module ends with a lab that feeds directly into the capstone, so learners are never writing throwaway code.

## Curriculum

### Module 1: CLI Design and Command-Line UX (Week 1)

- **Command grammar before code**
  - Noun-verb ordering (`depctl service deploy`) versus verb-noun (`depctl deploy service`) and why kubectl chose the former
  - Mapping your domain model onto a command tree instead of inventing new verbs
  - Reserved words, aliases, and abbreviations that will not collide later
- **Flag conventions users already know**
  - POSIX short flags, GNU long flags, `--flag=value` vs `--flag value`
  - The `--` terminator and why positional arguments must survive parsing
  - Boolean negation (`--color` / `--no-color`) and environment parity
- **Streams and exit codes as an API**
  - Data to stdout, diagnostics to stderr, never both mixed
  - Exit code taxonomy: `0` success, `1` generic failure, `2` usage error, `126`/`127` for exec problems
  - Machine-readable output behind `--json` / `--output yaml` for pipeline consumption
- **Lab**: Write a one-page command specification for `depctl`, including the full command tree, every global flag, and the exit-code contract

### Module 2: Command Trees with Cobra (Week 2)

- **Structure and execution model**
  - `cobra.Command` fields that matter: `Use`, `Short`, `Long`, `Example`, `Args`, `RunE`
  - `RunE` over `Run`: returning errors keeps `main` free of `os.Exit` calls
  - `PersistentPreRunE` for cross-cutting setup such as logging and client construction
- **Validation and ergonomics**
  - Built-in validators (`cobra.ExactArgs`, `cobra.NoArgs`) and custom `Args` functions
  - `MarkFlagRequired`, `MarkFlagsMutuallyExclusive`, and deprecation warnings
  - Automatic suggestions for misspelled subcommands and hidden internal commands
- **Shell completion**
  - Generating bash, zsh, fish, and PowerShell completions
  - Dynamic completion functions for resource names fetched from an API
- **Lab**: Implement the `depctl deploy`, `depctl status`, and `depctl rollback` command tree from the Module 1 spec

### Module 3: Configuration with Viper and Precedence (Week 3)

- **The precedence ladder**
  - Flags override environment, environment overrides file, file overrides defaults — and one helper that documents it
  - `viper.BindPFlag` and `viper.BindEnv` wiring so a single struct describes all sources
  - Why `viper.AutomaticEnv` alone silently misses nested keys and needs `SetEnvKeyReplacer`
- **Configuration discovery**
  - Explicit `--config` path, then `$XDG_CONFIG_HOME`, then `os.UserConfigDir()`
  - Profile overlays (`config.staging.yaml`) and strict unknown-key rejection
- **Secrets discipline**
  - Tokens come from the environment or an OS keychain, never from the checked-in file
  - Redacting sensitive values in `depctl config view` output and in debug logs
  - Validating the merged result once, at startup, with a typed struct
- **Lab**: Add layered configuration with three profiles and a `depctl config view` command that redacts secrets

### Module 4: Packaging, Cross-Compilation, and Reproducibility (Week 4)

- **Layout that stays testable**
  - `cmd/depctl/main.go` stays under thirty lines; all logic lives in `internal/`
  - The `Run(args []string, stdout, stderr io.Writer) int` entrypoint that makes the whole CLI unit-testable
  - Avoiding package-level state so two `Run` calls in one test binary cannot interfere
- **Deterministic builds**
  - `-trimpath`, `-buildvcs=false`, `CGO_ENABLED=0`, and `-ldflags "-s -w"`
  - Version injection with `-X main.version=...` driven by `git describe --tags --dirty`
  - Reproducible-output check by building twice and comparing SHA-256 hashes
- **The build matrix**
  - `GOOS`/`GOARCH` pairs that matter in practice: linux/amd64, linux/arm64, darwin/arm64, windows/amd64
  - Darwin universal binaries by combining `arm64` and `amd64` outputs with `lipo`
- **Lab**: Produce a build script that emits six artifacts with injected version metadata and identical hashes across two runs

### Module 5: Testing CLIs End to End (Week 5)

- **Unit level**
  - Table-driven tests against `Run` with `bytes.Buffer` streams and `t.TempDir()` as the config root
  - Asserting exit codes and stderr text, not just the absence of a panic
- **Golden files**
  - Snapshotting `--help` output so documentation cannot drift from behaviour
  - An `-update` flag to regenerate goldens deliberately rather than blindly
- **Scripted integration tests**
  - `rogpeppe/go-internal/testscript` for multi-step scenarios expressed as `.txtar` scripts
  - Faking stdin, the network, and the clock through injected interfaces
  - Running the suite across the build matrix in CI with `go test ./... -race`
- **Lab**: Reach meaningful coverage with goldens for every command plus two testscript scenarios covering failure paths

### Module 6: Release, Distribution, and Supply Chain (Week 6)

- **GoReleaser**
  - `.goreleaser.yaml`: archives, `nfpm` packages, Homebrew tap, Scoop bucket, multi-arch Docker images
  - Checksums, SBOM generation, and `cosign` signing of artifacts
  - Changelog generation from conventional commits
- **Pipelines and trust**
  - A tag-triggered GitHub Actions workflow with `permissions: contents: write` and no long-lived tokens
  - `GONOSUMDB`/`GOSUMDB` expectations and verifying builds in a clean container
  - Versioning policy: semver for the CLI contract means breaking flag changes are major versions
- **Lab**: Cut a signed `v1.0.0` release from a clean CI run and install it on a second machine via the Homebrew tap

## Final Project

Learners build **`depctl`**, a dependency-audit CLI that scans a repository for outdated or vulnerable modules and reports results in both human-readable and `--json` form.

Requirements:

- A Cobra command tree with `scan`, `report`, `config`, and `version`, plus shell completion for each
- Layered configuration (flags, environment, profile files) validated into a single typed struct at startup
- A `Run(...) int` entrypoint covered by table-driven unit tests, golden help snapshots, and at least two testscript scenarios
- Cross-compiled binaries for four platform pairs with version metadata injected at link time
- A GoReleaser pipeline that publishes archives, a checksum file, a signed SBOM, and a Homebrew formula
- Documented exit codes and stable `--json` output that a follow-up script can consume without parsing prose

## Assessment Criteria

- **Weekly labs (40%)**: each lab is graded on functional correctness, test presence, and whether the output is scriptable. Late labs lose 10% per day.
- **Code review exercises (15%)**: learners review a deliberately flawed CLI pull request and must identify at least five of seven seeded issues covering exit codes, secret leakage, and non-deterministic builds.
- **Final project (45%)**: scored against a rubric — command design and help text (10%), configuration layering and secret handling (10%), test coverage breadth (10%), reproducible builds and release pipeline (10%), and documentation quality including exit-code contract (5%).

A passing grade requires the release pipeline to succeed from a clean checkout; a project that only builds on the author's machine is not accepted.

## References

- Cobra documentation: https://cobra.dev
- Viper documentation: https://github.com/spf13/viper
- GoReleaser documentation: https://goreleaser.com
- `go-internal/testscript`: https://pkg.go.dev/github.com/rogpeppe/go-internal/testscript
- "Command Line Interface Guidelines" (clig.dev): https://clig.dev
- Go cross-compilation reference: https://pkg.go.dev/cmd/go#hdr-Environment_variables
