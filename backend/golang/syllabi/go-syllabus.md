---
title: "Go Programming Language Syllabus"
description: "A comprehensive 12-week curriculum covering Go syntax, concurrency, standard library, web development, testing, CLI tool building, deployment, and a capstone project."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Go Programming Language Syllabus

## Overview

This 12-week syllabus is designed for developers with prior programming experience who want to master Go (Golang). The curriculum progresses from language fundamentals and syntax through advanced topics such as concurrency, standard library mastery, web development with `net/http`, database integration, testing, and production deployment. Each week builds on the previous, culminating in a full-featured capstone project that demonstrates all major concepts. By the end of this course, students will be prepared to build, test, and deploy production-grade Go applications with confidence.

## Curriculum

### Week 1: Go Fundamentals

- **Why Go?**
  - Language history, philosophy, and design goals (simplicity, safety, speed)
  - Comparing Go with other languages for backend and systems programming
  - Go's ecosystem: standard library, modules, tooling
- **Installation and Setup**
  - Installing Go from `go.dev` or via package manager
  - Setting up `GOPATH`, `GOROOT`, and the Go workspace
  - Introduction to `go` commands: `go version`, `go env`, `go doc`
- **Your First Go Program**
  - Package declaration and `import` statements
  - The `main` function and program entry point
  - `fmt.Println` and basic output
  - Compiling and running: `go run` vs `go build`

### Week 2: Variables, Types, and Control Flow

- **Variables and Data Types**
  - `var` declarations, type inference with `:=`
  - Basic types: `int`, `float64`, `string`, `bool`
  - Zero values and type conversion
  - Constants with `const` and `iota`
- **Control Flow**
  - `if`, `else`, and `else if` statements with initialization syntax
  - `for` loops: standard, condition-only, infinite, and `range`
  - `switch` statements with expressionless and type-switch variants
- **Functions**
  - Function declarations, parameters, and return values
  - Multiple return values and named returns
  - Variadic functions and function values
  - Anonymous functions and closures

### Week 3: Composite Types and Data Structures

- **Arrays and Slices**
  - Array declaration and limitations
  - Slice internals: pointer, length, capacity
  - `append`, `copy`, slicing expressions, and `make`
  - Slice tricks and common patterns
- **Maps**
  - Map declaration, initialization with `make` and literals
  - CRUD operations: add, get, delete, check existence
  - Iteration order and the `comma ok` idiom
- **Structs**
  - Struct definition and field tagging
  - Struct embedding and composition over inheritance
  - Methods on structs: value vs pointer receivers
- **Pointers**
  - `&` and `*` operators, pointer semantics
  - When to use pointers (performance, mutation, nil-ability)

### Week 4: Error Handling and Testing

- **Error Handling in Go**
  - The `error` interface and idiomatic error handling
  - Custom error types with `fmt.Errorf` and `errors.New`
  - Error wrapping with `%w` and `errors.Is`, `errors.As`
  - Sentinel errors and error handling best practices
- **Defer, Panic, and Recover**
  - `defer` statements and cleanup patterns
  - `panic` for unrecoverable errors
  - `recover` in deferred functions
- **Testing Fundamentals**
  - `testing` package: `Test*` functions and `t *testing.T`
  - Table-driven tests with subtests (`t.Run`)
  - Coverage profiling with `go test -cover`
  - Benchmarking with `Benchmark*` functions

### Week 5: Interfaces and Generics

- **Interfaces**
  - Interface definition and satisfaction (duck typing)
  - The empty interface `interface{}` and `any`
  - Type assertions and type switches
  - Interface embedding and composition
- **Popular Standard Interfaces**
  - `io.Reader` and `io.Writer` — the backbone of Go I/O
  - `fmt.Stringer` and `error` interfaces
  - `sort.Interface` for custom sorting
- **Generics (Go 1.18+)**
  - Type parameters and constraints
  - Writing generic functions and types
  - The `constraints` package and custom constraints
  - When to use generics vs interfaces

### Week 6: Concurrency — Goroutines and Channels

- **Goroutines**
  - Goroutine lifecycle: lightweight threads managed by the Go runtime
  - Starting goroutines with `go` keyword
  - Synchronization with `sync.WaitGroup`
- **Channels**
  - Channel types: unbuffered vs buffered
  - Send, receive, and close semantics
  - Range over channels and directional channels
- **Select Statement**
  - Multiplexing channel operations with `select`
  - Timeouts with `time.After` and `context.Done()`
  - Non-blocking channel operations with `default`
- **Concurrency Patterns**
  - Fan-out, fan-in pattern
  - Pipeline pattern with channels
  - Worker pool implementation

### Week 7: Advanced Concurrency and Synchronization

- **Mutexes and Atomic Operations**
  - `sync.Mutex` and `sync.RWMutex` for shared state protection
  - `sync.Map` for concurrent map access
  - `sync/atomic` for lock-free counters and flags
- **Context Package**
  - `context.Context` for cancellation, deadlines, and request-scoped values
  - Deriving child contexts: `WithCancel`, `WithTimeout`, `WithDeadline`
  - Passing context through HTTP handlers and goroutines
- **errgroup Pattern**
  - `golang.org/x/sync/errgroup` for goroutine error propagation
  - Cancellation propagation with errgroup
- **Race Detection**
  - Using `-race` flag for data race detection
  - The Go memory model and happens-before guarantees

### Week 8: Standard Library Deep Dive

- **File I/O and System Interaction**
  - `os` package: file operations, environment variables, process control
  - `io` and `io/ioutil`: readers, writers, copy, pipes
  - `bufio`: buffered reading and writing
  - `encoding/csv`, `encoding/json`, `encoding/xml` for data serialization
- **Date, Time, and Formatting**
  - `time` package: durations, timers, tickers, formatting
  - `fmt` package deep dive: formatting verbs, `Sprintf`, `Fprintf`
  - `strings` and `strconv` for string manipulation and conversion
- **Networking Basics**
  - `net` package: IP addresses, TCP/UDP connections
  - `net/http` client: making requests, handling responses
  - `net/url` for URL parsing and query building

### Week 9: Web Development with net/http

- **Building Web Servers**
  - `http.Handler` interface and `http.HandlerFunc`
  - `http.ServeMux` and route registration
  - Middleware pattern: logging, recovery, authentication
- **RESTful API Development**
  - Handling path parameters and query strings
  - JSON request/response encoding and decoding
  - Status codes, headers, and content negotiation
- **Advanced HTTP Patterns**
  - Graceful shutdown with `ShutdownContext`
  - Request context propagation
  - Rate limiting and throttling middleware
  - File server and static file serving
- **Third-Party Web Frameworks** (optional introduction)
  - Chi, Gin, or Echo for advanced routing
  - When to use the standard library vs a framework

### Week 10: Database Integration and SQL

- **Database Access with database/sql**
  - `database/sql` interface and driver registration
  - Connection pooling configuration (`SetMaxOpenConns`, `SetMaxIdleConns`)
  - CRUD operations: `Query`, `QueryRow`, `Exec`
  - Prepared statements and transaction management
- **Working with PostgreSQL**
  - Connecting with `lib/pq` or `pgx`
  - Scanning rows into structs
  - Migrations with `golang-migrate` or `pressly/goose`
- **Working with Redis**
  - Connecting with `go-redis` or `redigo`
  - Caching patterns and session storage
  - Pub/sub with Redis channels
- **ORM vs Raw SQL**
  - Introduction to GORM for ORM-style access
  - When to use raw SQL vs an ORM

### Week 11: CLI Tools, Build, and Deployment

- **Building CLI Tools**
  - `flag` package for command-line argument parsing
  - `cobra` and `viper` for advanced CLI applications
  - Reading from stdin, writing to stdout/stderr
- **Build and Cross-Compilation**
  - `go build` with build tags and conditional compilation
  - Cross-compilation with `GOOS` and `GOARCH`
  - Build caching and `go install`
  - Reducing binary size with `-ldflags="-s -w"`
- **Module Management**
  - `go mod init`, `go mod tidy`, `go mod vendor`
  - Module versioning and semantic import versioning
  - Private modules with `GOPRIVATE` and `GONOSUMCHECK`
- **Dockerizing Go Applications**
  - Multi-stage Docker builds for minimal images
  - Distroless and scratch base images
  - Health checks and graceful shutdown in containers

### Week 12: Capstone Project

- **Project Specification**
  - Full-stack Go application using all learned concepts
  - Suggested project types: REST API service, CLI productivity tool, web application with auth and database
- **Architecture Planning**
  - Layered architecture: handlers, services, repositories
  - Dependency injection with interfaces
  - Configuration management with environment variables
- **Implementation Phase**
  - Week 1-4 of project: project scaffolding, models, database schema
  - Week 5-8 of project: API handlers, business logic, middleware
  - Week 9-12 of project: testing, documentation, containerization, deployment
- **Final Review and Presentation**
  - Code review checklist (error handling, concurrency safety, test coverage)
  - Performance profiling with `pprof` and tracing
  - Deployment to production (cloud VM or container orchestration)

## Final Project

Students will build a **production-grade Go application** of their choice. The project must demonstrate:

- **At least three packages** organized in a layered architecture (handlers, services, repositories)
- **Interfaces** for dependency injection and testability
- **Concurrency** using goroutines and channels or `sync` primitives (e.g., worker pool, pipeline, or fan-out/fan-in)
- **Context propagation** for cancellation and timeouts across HTTP handlers, database calls, and goroutines
- **Error handling** with sentinel errors, wrapping, and proper HTTP status mapping
- **Testing** with table-driven tests, at least 70% coverage, and integration tests against a real database
- **RESTful API** with proper status codes, content negotiation, and input validation
- **Database integration** with at least one database (PostgreSQL or Redis) using `database/sql` or driver
- **Graceful shutdown** handling SIGINT/SIGTERM signals
- **Dockerization** with multi-stage build and health checks
- **Complete documentation** including README, API docs, and setup instructions

Example project ideas:

- **Task Management API**: RESTful API with user authentication, CRUD for tasks/projects, background worker for reminders, PostgreSQL storage, Redis caching
- **URL Shortener Service**: High-throughput HTTP service with redirect logic, click tracking, rate limiting, PostgreSQL for persistence, Redis for caching
- **CLI DevOps Tool**: Command-line application for server management, deployment automation, or log analysis with concurrent file processing, colored output, and configuration file support
- **Real-Time Chat Server**: WebSocket-based chat application with room management, message broadcasting, user presence tracking, and persistent message history

## Assessment Criteria

- **Weekly Assignments (30%)**
  - 10 weekly coding assignments (Weeks 1-10)
  - Each assignment builds on the previous week's concepts
  - Graded on correctness, code quality, idiomatic Go style, and adherence to `gofmt` conventions
  - Late submissions penalized 10% per day

- **Quizzes (20%)**
  - 4 quizzes (end of Weeks 3, 6, 9, 11)
  - Mix of conceptual understanding and code analysis
  - Multiple choice, short answer, and code review questions
  - Minimum 70% pass rate required to proceed to capstone

- **Capstone Project (40%)**
  - Code quality, architecture, and idiomatic Go usage (15%)
  - Feature completeness against specification (10%)
  - Testing coverage and quality (5%)
  - Concurrency correctness and race-condition safety (5%)
  - Deployment and production readiness (5%)

- **Participation and Code Reviews (10%)**
  - Peer code reviews on two classmates' projects
  - Active participation in design discussions
  - Documentation quality (README, API docs, setup instructions)

## References

- [Go Official Documentation](https://go.dev/doc/) — Complete language reference, tutorials, and package docs
- [Effective Go](https://go.dev/doc/effective_go) — Idiomatic Go writing guidelines
- [Go by Example](https://gobyexample.com/) — Hands-on introduction with annotated example programs
- [The Go Blog](https://go.dev/blog/) — Official blog covering language features, best practices, and case studies
- [Go Standard Library](https://pkg.go.dev/std) — Comprehensive documentation for all standard packages
- [Practical Go: Real World Advice](https://dave.cheney.net/practical-go) — Dave Cheney's guide to writing production Go
- [Concurrency in Go](https://www.oreilly.com/library/view/concurrency-in-go/9781491941297/) — Katherine Cox-Buday's book on Go concurrency patterns
- [Let's Go](https://lets-go.alexedwards.net/) — Alex Edwards' book on building web applications with Go
