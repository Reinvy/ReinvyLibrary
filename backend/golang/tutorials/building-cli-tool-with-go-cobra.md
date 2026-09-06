---
title: "Building a CLI Tool with Go using Cobra"
description: "A practical tutorial on building a runnable todo CLI in Go with Cobra and Viper, covering commands, flags, args, persistent flags, command hierarchy, configuration, and in-process command testing."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a CLI Tool with Go using Cobra

## Summary

You will build a complete, runnable todo CLI (`todo add "buy milk"`, `todo list`) using the Cobra framework and the Viper configuration library. Along the way you will learn how commands, flags, and arguments work, how persistent flags propagate through a command hierarchy, and how to test commands in-process.

## Target Audience

- Backend developers and tooling engineers who already write basic Go (structs, functions, error handling).
- Intermediate — comfortable with `go mod` and running Go programs from a terminal.

## Prerequisites

- Go 1.22+ installed ([go.dev/dl](https://go.dev/dl)).
- No prior Cobra or Viper experience required — everything is explained from scratch.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a CLI with a root command and subcommands.
- Define flags, persistent flags, and positional arguments with validators.
- Structure a command hierarchy and share state across commands.
- Load YAML configuration with Viper, including defaults and flag precedence.
- Persist data to disk with full error handling.
- Test commands in-process with `SetArgs` and `SetOut`.

## Context and Motivation

Small, focused CLI tools automate the repetitive parts of every developer workflow. Cobra is the de facto standard framework for Go CLIs — it powers `kubectl`, `gh`, `docker`, and `hugo` — so learning it transfers directly to real-world tooling. Cobra gives you structured command trees, automatic help and shell completion, and consistent flag parsing, while Viper handles configuration with a clear precedence: **flag > environment variable > config file > default**.

## Core Content

### Commands, Flags, and Arguments

A `cobra.Command` defines one executable action: `Use` is its name, `Short`/`Long` are help texts, `Args` validates positional arguments, and `RunE` is the handler that returns an `error` — Cobra prints it and usage when non-nil, which is why `RunE` beats `Run` for real programs.

### Persistent Flags and Command Hierarchy

`Flags()` adds flags local to one command; `PersistentFlags()` are inherited by every subcommand — ideal for shared settings such as a store path. `AddCommand` builds the tree; running `todo list` makes Cobra walk it and dispatch automatically, and every subcommand reads the persistent flag variable.

### Configuration with Viper

`cobra.OnInitialize(initConfig)` runs after flags are parsed but before any command executes — the right moment to load configuration. Viper reads `config.yaml` from the current directory and applies defaults; because `--file` is already bound to a variable, it takes precedence over the config file, giving users an override without editing YAML.

### Error Handling in Persistence

Tasks are stored as one title per line in a text file. The key insight: a missing file is a valid empty store (first run), while every read and write failure is wrapped with `fmt.Errorf("%w", err)` so the root cause survives unwrapping. Note the edge case: a present but empty file must not be split into one bogus empty task.

## Code Examples

All blocks are complete and runnable — the two Go files form one module you can build and test as-is. Optional `config.yaml` (same folder) sets `tasks.file` to a custom path; the `--file` flag overrides it.

### Project Setup

```bash
mkdir todo-cli && cd todo-cli
go mod init todo-cli
go get github.com/spf13/cobra@latest
go get github.com/spf13/viper@latest
go run . add "buy milk"
```

### todo/main.go — Command Tree, Flags, Config, and Store

```go
package main

import (
    "errors"
    "fmt"
    "os"
    "strings"

    "github.com/spf13/cobra"
    "github.com/spf13/viper"
)

var taskFile string // bound to the --file persistent flag

// loadTasks reads one task title per line; a missing or empty file is an empty list.
func loadTasks(path string) ([]string, error) {
    data, err := os.ReadFile(path)
    if errors.Is(err, os.ErrNotExist) {
        return nil, nil
    }
    if err != nil {
        return nil, fmt.Errorf("read store: %w", err)
    }
    clean := strings.TrimSpace(string(data))
    if clean == "" {
        return nil, nil
    }
    return strings.Split(clean, "\n"), nil
}

func saveTasks(path string, tasks []string) error {
    body := strings.Join(tasks, "\n") + "\n"
    if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
        return fmt.Errorf("write store: %w", err)
    }
    return nil
}

func main() {
    if err := newRootCmd().Execute(); err != nil {
        fmt.Fprintln(os.Stderr, "error:", err)
        os.Exit(1)
    }
}

func newRootCmd() *cobra.Command {
    cmd := &cobra.Command{Use: "todo", Short: "A minimal todo CLI"}
    cmd.PersistentFlags().StringVar(&taskFile, "file", "", "path to the task file")
    cobra.OnInitialize(initConfig)
    cmd.AddCommand(newAddCmd(), newListCmd())
    return cmd
}

func initConfig() {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")
    viper.SetDefault("tasks.file", "tasks.txt")
    if err := viper.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            fmt.Fprintln(os.Stderr, "warning: could not read config:", err)
        }
    }
    if taskFile == "" {
        taskFile = viper.GetString("tasks.file")
    }
}

func newAddCmd() *cobra.Command {
    return &cobra.Command{
        Use:   "add [title]",
        Short: "Add a new task",
        Args:  cobra.ExactArgs(1),
        RunE: func(cmd *cobra.Command, args []string) error {
            tasks, err := loadTasks(taskFile)
            if err != nil {
                return err
            }
            tasks = append(tasks, args[0])
            if err := saveTasks(taskFile, tasks); err != nil {
                return err
            }
            fmt.Printf("Added task %d: %q\n", len(tasks), args[0])
            return nil
        },
    }
}

func newListCmd() *cobra.Command {
    return &cobra.Command{
        Use:   "list",
        Short: "List all tasks",
        Args:  cobra.NoArgs,
        RunE: func(cmd *cobra.Command, args []string) error {
            tasks, err := loadTasks(taskFile)
            if err != nil {
                return err
            }
            if len(tasks) == 0 {
                fmt.Println("No tasks yet.")
                return nil
            }
            for i, t := range tasks {
                fmt.Printf("%2d  %s\n", i+1, t)
            }
            return nil
        },
    }
}
```

### todo/main_test.go — Testing Commands In-Process

Cobra commands are plain objects, so tests execute them directly: `SetArgs` injects argv, `SetOut` captures stdout, and `Execute` runs the full parse-and-dispatch pipeline. `t.TempDir()` isolates each test.

```go
package main

import (
    "bytes"
    "os"
    "path/filepath"
    "strings"
    "testing"
)

func TestAddThenList(t *testing.T) {
    path := filepath.Join(t.TempDir(), "tasks.txt")
    run := func(args ...string) (string, error) {
        var out bytes.Buffer
        root := newRootCmd()
        root.SetOut(&out)
        root.SetArgs(append([]string{"--file", path}, args...))
        return out.String(), root.Execute()
    }
    if out, err := run("add", "write docs"); err != nil {
        t.Fatalf("add failed: %v", err)
    } else if !strings.Contains(out, "write docs") {
        t.Fatalf("unexpected output: %q", out)
    }
    out, err := run("list")
    if err != nil {
        t.Fatalf("list failed: %v", err)
    }
    if !strings.Contains(out, "write docs") {
        t.Fatalf("task missing from list: %q", out)
    }
    if _, err := os.Stat(path); err != nil {
        t.Fatalf("store file missing: %v", err)
    }
}
```

## Key Insights

- **Use `RunE`, not `Run`**: returning an `error` lets Cobra render consistent messages and exit codes; `Run` swallows failures.
- **Viper precedence**: bind flags to variables first, then let Viper fill only what is still empty — never the reverse, or flags get overwritten by config.
- **`Args` validators prevent bad input early**: `cobra.ExactArgs`, `cobra.NoArgs`, and `cobra.MinimumNArgs` beat manual `len(args)` checks.
- **Wrap every I/O error with `%w`** so callers can use `errors.Is`/`errors.As` to distinguish "missing file" from real corruption.
- **Keep `newRootCmd()` parameterless** to make testing trivial: create it, set args and output, execute.

## Next Steps

- Add a `complete [id]` command with `cobra.ExactArgs(1)` that marks a task done — a great exercise for this material.
- Explore shell completion: `rootCmd.CompletionOptions` gives you `todo completion bash` for free.
- Read the official [Cobra user guide](https://cobra.dev) and the [Viper README](https://github.com/spf13/viper).

## Conclusion

You built a runnable todo CLI with Cobra and Viper: a root command with persistent flags, subcommands with validated args, YAML-driven configuration, disk persistence with real error handling, and in-process tests. These same patterns — command trees, shared flags, config precedence — are exactly what production CLIs like `kubectl` and `gh` are built on.
