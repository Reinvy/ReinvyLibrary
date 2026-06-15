---
title: "Getting Started with Go Programming"
description: "A beginner-friendly tutorial covering Go fundamentals — installation, syntax, data types, control structures, functions, concurrency basics, and building a CLI application."
category: "backend"
technology: "golang"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Getting Started with Go Programming

## Summary

This tutorial introduces the Go programming language (Golang) from the ground up. You will learn how to set up a Go development environment, understand core language concepts such as variables, control flow, functions, and structs, and build a practical command-line to-do application. By the end, you will have a solid foundation to write efficient, concurrent Go programs.

## Target Audience

- Beginner developers with basic programming experience in any language (JavaScript, Python, etc.).
- Developers interested in learning a compiled, statically-typed language for backend or systems programming.

## Prerequisites

- Basic understanding of programming concepts (variables, loops, functions).
- A computer with internet access to download Go and a code editor (VS Code recommended).
- Familiarity with the terminal or command line.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Install Go and configure a development workspace.
- Write and run Go programs using `go run` and `go build`.
- Use Go's basic types, variables, constants, and control structures.
- Define and call functions, including multiple return values.
- Work with composite types: arrays, slices, maps, and structs.
- Handle errors idiomatically using Go's error interface.
- Write a simple concurrent program using goroutines and channels.
- Build and structure a CLI application with packages.

## Context and Motivation

Go was created at Google in 2009 by Robert Griesemer, Rob Pike, and Ken Thompson to address the challenges of modern software engineering: slow build times, uncontrolled dependencies, and the complexity of concurrent programming. It has since become the backbone of cloud infrastructure (Docker, Kubernetes, Terraform are all written in Go), making it one of the most valuable languages for backend and DevOps engineers. Go's clean syntax, fast compilation, built-in concurrency model, and excellent standard library make it an ideal first compiled language to learn.

## Core Content

### Installing Go

Go is distributed as a single binary installer. Download the latest stable version from [go.dev/dl](https://go.dev/dl/).

**Linux / macOS**: Download the tarball and extract it:

```bash
wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz
```

Add Go to your `PATH` by appending this to `~/.bashrc` or `~/.zshrc`:

```bash
export PATH=$PATH:/usr/local/go/bin
```

**Windows**: Download the MSI installer and follow the wizard. Go is automatically added to your PATH.

Verify the installation:

```bash
go version
# Expected output: go version go1.22.5 linux/amd64
```

### Your First Go Program

Create a new directory for your project and a file called `main.go`:

```bash
mkdir hello-go
cd hello-go
touch main.go
```

Write the following code:

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}
```

Run it:

```bash
go run main.go
```

You should see `Hello, Go!` printed. The `go run` command compiles and runs your program in one step. For a production binary, use `go build` instead:

```bash
go build -o hello
./hello
```

### Variables and Constants

Go is statically typed, but supports type inference with the `:=` short declaration:

```go
package main

import "fmt"

func main() {
    // Explicit declaration with type
    var name string = "Go"

    // Type inference
    version := 1.22

    // Multiple variables
    var x, y int = 10, 20

    // Constants (cannot use :=)
    const greeting = "Welcome to"

    fmt.Println(greeting, name, "version", version)
    fmt.Println("Sum:", x+y)
}
```

**Key rules**:
- Variables declared without an initial value get a **zero value** (0 for numbers, `""` for strings, `false` for booleans).
- Unused variables cause a compilation error — Go enforces clean code.
- Constants are evaluated at compile time and cannot be reassigned.

### Basic Data Types

Go's built-in types can be grouped into four families:

| Category | Types | Description |
|----------|-------|-------------|
| Boolean | `bool` | `true` or `false` |
| Numeric (integer) | `int`, `int8`, `int16`, `int32`, `int64`, `uint`, `uint8`, `byte`, `uint16`, `uint32`, `uint64` | Signed and unsigned integers |
| Numeric (float) | `float32`, `float64` | Floating-point numbers |
| Numeric (complex) | `complex64`, `complex128` | Complex numbers |
| Text | `string` | UTF-8 encoded text |

```go
var (
    active   bool    = true
    age      int     = 30
    price    float64 = 29.99
    message  string  = "Hello, 世界" // Unicode works natively
)
```

### Control Flow

Go uses standard control flow keywords with a few unique traits — no parentheses around conditions, and braces are required.

#### If / Else

```go
score := 85

if score >= 90 {
    fmt.Println("Grade: A")
} else if score >= 75 {
    fmt.Println("Grade: B")
} else {
    fmt.Println("Grade: C")
}
```

Go also supports a compact **if with statement** — a common idiom for scoping variables:

```go
if err := doSomething(); err != nil {
    fmt.Println("Error:", err)
}
// err is not accessible here
```

#### For Loop

Go has only one looping keyword — `for` — but it covers all patterns:

```go
// Classic three-part loop
for i := 0; i < 5; i++ {
    fmt.Println(i)
}

// While-like
sum := 0
for sum < 10 {
    sum += 3
}

// Infinite loop (break to exit)
for {
    fmt.Println("running...")
    break
}

// Range loop (slice/map iteration)
names := []string{"Alice", "Bob", "Charlie"}
for index, name := range names {
    fmt.Printf("%d: %s\n", index, name)
}
```

#### Switch

Go switches are concise — each case automatically breaks:

```go
day := "Monday"

switch day {
case "Saturday", "Sunday":
    fmt.Println("Weekend!")
default:
    fmt.Println("Weekday")
}
```

### Functions

Functions are declared with `func`, parameters come before types, and Go supports multiple return values — a feature heavily used for error handling:

```go
package main

import (
    "errors"
    "fmt"
)

// Simple function
func greet(name string) string {
    return "Hello, " + name + "!"
}

// Multiple return values (result, error pattern)
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// Named return values
func sum(numbers ...int) (total int) {
    for _, n := range numbers {
        total += n
    }
    return // naked return — returns 'total'
}

func main() {
    fmt.Println(greet("Gopher"))

    result, err := divide(10, 3)
    if err != nil {
        fmt.Println("Error:", err)
    } else {
        fmt.Println("10 / 3 =", result)
    }

    fmt.Println("Sum:", sum(1, 2, 3, 4, 5))
}
```

### Arrays, Slices, and Maps

**Arrays** have a fixed size set at compile time:

```go
var arr [3]int = [3]int{1, 2, 3}
```

**Slices** are dynamic arrays — the most common collection type:

```go
// Create a slice
fruits := []string{"apple", "banana", "cherry"}

// Append (returns a new slice)
fruits = append(fruits, "date")

// Slice operations
fmt.Println(fruits[1:3]) // [banana cherry]
fmt.Println(len(fruits)) // 4
```

**Maps** are key-value stores:

```go
scores := map[string]int{
    "Alice": 95,
    "Bob":   82,
}

// Add / update
scores["Charlie"] = 88

// Check existence with the comma-ok idiom
value, exists := scores["Alice"]
if exists {
    fmt.Println("Alice's score:", value)
}

// Delete
delete(scores, "Bob")
```

### Structs and Methods

Go uses structs (not classes) for grouping data. Methods are functions with a **receiver** argument:

```go
package main

import "fmt"

// Struct definition
type Person struct {
    Name string
    Age  int
}

// Method with value receiver
func (p Person) Greet() string {
    return fmt.Sprintf("Hi, I'm %s and I'm %d years old", p.Name, p.Age)
}

// Method with pointer receiver (can modify the struct)
func (p *Person) Birthday() {
    p.Age++
}

func main() {
    person := Person{Name: "Alice", Age: 30}
    fmt.Println(person.Greet())

    person.Birthday()
    fmt.Println("After birthday:", person.Age)
}
```

Pointer receivers are used when the method needs to modify the struct or when the struct is large and copying would be expensive.

### Error Handling

Go does not have exceptions. Errors are values returned from functions:

```go
package main

import (
    "fmt"
    "os"
)

func readFile(filename string) (string, error) {
    data, err := os.ReadFile(filename)
    if err != nil {
        return "", fmt.Errorf("failed to read %s: %w", filename, err)
    }
    return string(data), nil
}

func main() {
    content, err := readFile("config.json")
    if err != nil {
        fmt.Println("Error:", err)
        os.Exit(1)
    }
    fmt.Println(content)
}
```

Custom errors are created with `errors.New` or `fmt.Errorf`. Use `%w` to wrap errors so callers can unwrap them with `errors.Is` or `errors.As`.

### Goroutines and Channels

Concurrency is a first-class citizen in Go. **Goroutines** are lightweight threads, and **channels** are typed conduits for communication between them:

```go
package main

import (
    "fmt"
    "time"
)

func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        time.Sleep(time.Second) // simulate work
        results <- job * 2
    }
}

func main() {
    const numJobs = 5
    jobs := make(chan int, numJobs)
    results := make(chan int, numJobs)

    // Start 3 workers
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }

    // Send jobs
    for j := 1; j <= numJobs; j++ {
        jobs <- j
    }
    close(jobs)

    // Collect results
    for r := 1; r <= numJobs; r++ {
        <-results
    }

    fmt.Println("All jobs completed")
}
```

The motto is: **"Do not communicate by sharing memory; instead, share memory by communicating."**

### Packages and Modules

Every Go program is organized into packages. The `main` package defines an executable. Libraries are imported with their module path:

```bash
# Initialize a module
go mod init github.com/yourname/todo-app
```

This creates a `go.mod` file that tracks dependencies. Importing external packages is as simple as:

```go
import (
    "fmt"
    "github.com/google/uuid" // automatically fetched on build
)
```

## Code Examples

### CLI To-Do Application

This complete example ties together everything learned — structs, methods, slices, error handling, and a simple CLI interface:

```go
package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "strings"
)

// Task represents a single to-do item
type Task struct {
    ID     int
    Title  string
    Done   bool
}

// TaskList manages a collection of tasks
type TaskList struct {
    tasks []Task
    nextID int
}

// Add creates a new task and appends it to the list
func (tl *TaskList) Add(title string) {
    task := Task{
        ID:    tl.nextID,
        Title: title,
        Done:  false,
    }
    tl.tasks = append(tl.tasks, task)
    tl.nextID++
    fmt.Printf("Added task %d: %s\n", task.ID, title)
}

// List prints all tasks
func (tl *TaskList) List() {
    if len(tl.tasks) == 0 {
        fmt.Println("No tasks yet!")
        return
    }
    for _, t := range tl.tasks {
        status := " "
        if t.Done {
            status = "✓"
        }
        fmt.Printf("[%s] %d: %s\n", status, t.ID, t.Title)
    }
}

// Complete marks a task as done by ID
func (tl *TaskList) Complete(id int) error {
    for i, t := range tl.tasks {
        if t.ID == id {
            tl.tasks[i].Done = true
            fmt.Printf("Task %d marked as done\n", id)
            return nil
        }
    }
    return fmt.Errorf("task %d not found", id)
}

func main() {
    tl := TaskList{}
    scanner := bufio.NewScanner(os.Stdin)

    fmt.Println("=== Go To-Do App ===")
    fmt.Println("Commands: add <title>, list, done <id>, quit")

    for {
        fmt.Print("> ")
        if !scanner.Scan() {
            break
        }

        input := strings.TrimSpace(scanner.Text())
        parts := strings.SplitN(input, " ", 2)
        command := parts[0]

        switch command {
        case "add":
            if len(parts) < 2 {
                fmt.Println("Usage: add <title>")
                continue
            }
            tl.Add(parts[1])

        case "list":
            tl.List()

        case "done":
            if len(parts) < 2 {
                fmt.Println("Usage: done <id>")
                continue
            }
            id, err := strconv.Atoi(parts[1])
            if err != nil {
                fmt.Println("Invalid ID:", parts[1])
                continue
            }
            if err := tl.Complete(id); err != nil {
                fmt.Println("Error:", err)
            }

        case "quit":
            fmt.Println("Goodbye!")
            return

        default:
            fmt.Println("Unknown command. Try: add, list, done, quit")
        }
    }
}
```

To run:

```bash
go run main.go
```

Sample interaction:

```text
> add Learn Go
Added task 0: Learn Go
> add Build a web server
Added task 1: Build a web server
> list
[ ] 0: Learn Go
[ ] 1: Build a web server
> done 0
Task 0 marked as done
> list
[✓] 0: Learn Go
[ ] 1: Build a web server
> quit
Goodbye!
```

## Key Insights

- **Simplicity by design**: Go's language spec is small and readable. You can learn most of the language in a weekend. This simplicity leads to codebases that are easy to navigate and maintain over years.
- **The zero value is your friend**: Every variable in Go starts with a predictable zero value (`0`, `""`, `false`, `nil`). This eliminates undefined-behavior bugs common in C and C++ and means you rarely need explicit initializers.
- **Errors are values, not exceptions**: Go's explicit error handling forces you to think about failure cases at every call site. While verbose, this leads to more robust software because errors are never silently swallowed.
- **Goroutines are cheap**: You can start thousands of goroutines in the same process. They share the same address space, but Go's scheduler multiplexes them onto OS threads efficiently, making concurrency accessible without the overhead of thread pools or async/await.
- **`go fmt` enforces style**: The `gofmt` tool (run automatically by most editors) reformats your code to a single canonical style. This eliminates all style debates in code reviews and makes every Go codebase feel familiar.

## Next Steps

- Explore Go's standard library: `net/http` for building web servers, `encoding/json` for API work, and `database/sql` for database access.
- Read "[Effective Go](https://go.dev/doc/effective_go)" — the official guide to writing idiomatic Go.
- Learn about interfaces and generics (Go 1.18+) to write more reusable abstractions.
- Try building a REST API with Go's `net/http` package or a framework like Gin or Echo.

## Conclusion

Go provides a powerful yet simple foundation for building modern, concurrent software. You have learned the core language features — from variables and control flow to goroutines and packages — and built a practical CLI application. Go's emphasis on clarity, fast compilation, and built-in concurrency makes it an excellent choice for APIs, CLI tools, microservices, and cloud infrastructure. Continue practicing by building small projects, and you will quickly appreciate why Go has become a dominant language in cloud-native development.
