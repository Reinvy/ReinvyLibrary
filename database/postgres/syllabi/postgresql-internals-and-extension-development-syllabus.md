---
title: "PostgreSQL Internals and Extension Development Syllabus"
description: "A 12-week systems-level curriculum on PostgreSQL server internals and C extension authoring — memory contexts, page and tuple layout, the buffer manager, WAL, the SPI, planner hooks, custom scan and index access methods, background workers, foreign data wrappers, memory-safety testing, and cross-version packaging."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# PostgreSQL Internals and Extension Development Syllabus

## Overview

Most PostgreSQL education stops at the SQL surface: write a query, read a plan, add an index. Yet a large part of what makes PostgreSQL valuable happens one layer below — in the C code that owns the heap, the write-ahead log, the planner, and the extension API that lets third parties change all three. Teams that understand that layer can diagnose problems no configuration flag will fix, and teams that can write extensions stop waiting for upstream to solve their problem.

This 12-week advanced curriculum is written for senior backend engineers, database platform engineers, and systems programmers who already know PostgreSQL well as users — comfortable with MVCC semantics, indexing strategies, and replication — and now want to work inside the server rather than beside it. Every week moves between the source tree and a running server: reading the relevant subsystem, then writing code that talks to it. The track is deliberately narrow. It is not a performance-tuning course and not an operations course; those are covered elsewhere in this library. Here the deliverable is always code — a C function, a custom type, a background worker, an access method — that compiles against the server headers and behaves correctly under concurrency, crash recovery, and version upgrades.

By the end, learners will have shipped a packaged, version-tolerant extension with tests, benchmarks, and documentation, and will be able to read the PostgreSQL source tree with confidence when the next unfamiliar behaviour appears in production.

## Curriculum

### Week 1: Process Architecture, Memory Contexts, and Error Handling
- **The Server Process Model**
  - Postmaster, backend processes, and auxiliary processes (`checkpointer`, `bgwriter`, `walwriter`, `autovacuum launcher`)
  - Shared memory layout: buffer pool, lock tables, proc array, and the free space map
  - Backend lifecycle from `fork()` to query loop, and what survives a backend crash
- **Memory Management**
  - `MemoryContext` trees and the `CurrentMemoryContext` implicit argument
  - `palloc`, `palloc0`, `pfree`, and why extensions must never call `malloc` for query-lifetime data
  - `AllocSetContextCreate`, context resets, and the per-tuple context pattern
- **Error Handling and Logging**
  - `ereport` and `elog` levels, and the difference between `ERROR` and `FATAL` for extension code
  - `PG_TRY` / `PG_CATCH` / `PG_FINALLY` and why `longjmp` semantics forbid skipping cleanup
  - `errmsg`, `errdetail`, `errhint`, and building useful diagnostics for DBAs
- **Practical Labs**
  - Build PostgreSQL from source with debug symbols and run the regression suite
  - Attach `gdb` to a backend and inspect the memory context tree during a query
  - Trigger and recover from an `ERROR` inside a C function without leaking memory

### Week 2: Storage Layout, the Heap, and the Buffer Manager
- **On-Disk Structures**
  - Page header, line pointers, free space, and special space at the end of a page
  - `HeapTupleHeaderData`: `xmin`, `xmax`, `ctid`, infomask bits, and HOT chains
  - Relation forks (main, free space map, visibility map, init) and the `smgr` layer
- **TOAST and Variable-Length Data**
  - The 2 KB tuple threshold and the four TOAST strategies
  - Out-of-line storage, compression, and how to read TOASTed values safely in C
  - When an extension should store large payloads outside the heap entirely
- **Buffer Manager and Caching**
  - `ReadBuffer`, `ReadBufferExtended`, buffer pins, and content locks
  - Dirty buffers, the clock sweep, and how the background writer interacts with extensions
  - Data checksums and what they mean for custom storage code
- **Practical Labs**
  - Write a pageinspect-style function that dumps line pointers for a live table
  - Trace buffer pin counts while scanning a table with `pg_buffercache`
  - Measure the tuple size threshold where TOAST kicks in and verify the strategy chosen

### Week 3: Your First Extension — Build System, Control Files, and C Functions
- **Project Anatomy**
  - `PG_MODULE_MAGIC`, `_PG_init`, and the shared library entry points
  - The `.control` file: `default_version`, `module_pathname`, `relocatable`, `requires`
  - SQL install scripts and the `--2.0--2.1.sql` upgrade script convention
- **Calling C from SQL**
  - `PG_FUNCTION_INFO_V1` and the version-1 calling convention
  - `Datum` in, `Datum` out: `PG_GETARG_*`, `PG_RETURN_*`, and strictness
  - Returning sets, composite types, and `SRF_FIRSTCALL_INIT` materialisation patterns
- **Building and Iterating**
  - PGXS makefiles versus the meson build used by recent releases
  - `pg_config` variables, include paths, and compiling against multiple installed majors
  - Development loop: recompile, `DROP EXTENSION` / `CREATE EXTENSION`, and restart-free iteration
- **Practical Labs**
  - Scaffold an extension that exposes a C function computing a checksum over a `bytea`
  - Add a second SQL-callable function with a set-returning interface
  - Package it so `CREATE EXTENSION ... VERSION` upgrades cleanly from 1.0 to 1.1

### Week 4: Type System — Custom Types, Operators, and Casts
- **The Type Catalogue**
  - `pg_type` internals: `typlen`, `typbyval`, `typalign`, `typstorage`, and `typcategory`
  - Base types versus domains versus composite types, from the catalogue's point of view
  - Why the I/O functions define a type's behaviour at the SQL boundary
- **Implementing a Base Type**
  - Input, output, receive, and send functions for text and binary protocols
  - Typmod input/output for parameterised types
  - `CREATE TYPE ... (INPUT = ..., OUTPUT = ...)` and binary-coercible variants
- **Operators, Casts, and Operator Classes**
  - `CREATE OPERATOR` backed by a C function, and commutation/negation hints
  - Casts: implicit, assignment, and explicit — and the planner consequences of each
  - Supporting index usage by attaching a type to an existing operator class
- **Practical Labs**
  - Implement a fixed-width base type with correct binary send/receive support
  - Add a cast to and from `text` and verify plan behaviour with implicit versus explicit casts
  - Write regression tests that pin the textual output format

### Week 5: SPI — Executing SQL from Inside the Server
- **The Server Programming Interface**
  - `SPI_connect` / `SPI_finish`, and why nesting requires care inside triggers
  - `SPI_execute`, `SPI_execute_with_args`, and `SPI_prepare` with saved plans
  - Reading `SPITupleTable` results and detoasting columns correctly
- **Correctness Under the Executor**
  - Managing memory with `SPI_palloc` and the SPI procedure context
  - Command counter increments when writing inside a function
  - Read-only versus read-write SPI, and the volatility contract with the planner
- **Performance Patterns**
  - Saved plans, parameterised execution, and avoiding parse overhead in hot loops
  - Cursors via `SPI_cursor_open` for large result sets
  - Bulk operations: `SPI_execute` with `UPSERT` and `COPY` alternatives
- **Practical Labs**
  - Write a C function that runs a parameterised aggregation and returns a composite row
  - Build a trigger function that maintains a derived table without recursive firing
  - Benchmark saved-plan versus re-parsed execution across ten thousand iterations

### Week 6: WAL, Durability, and Write-Ahead Correctness
- **How Durability Works**
  - WAL record structure, LSN ordering, and the `XLogInsert` / `XLogFlush` path
  - Checkpoints, restartpoints, and the redo loop that replays the log
  - Full-page writes, torn pages, and why the first write after a checkpoint is special
- **Writing WAL-Aware Code**
  - Registering a custom resource manager with `rmgr` IDs and redo callbacks
  - The generic WAL interface for extensions that need it without a full rmgr
  - Ordering rules: log before data, and marking buffers dirty only after the record is inserted
- **Recovery-Safe Extension Design**
  - Unlogged tables, temporary relations, and what an extension may not assume survives a crash
  - Interaction with physical replication: what a standby must be able to replay
  - Testing recovery with `pg_waldump` and forced crash scenarios
- **Practical Labs**
  - Register a minimal custom WAL resource manager and replay it after a crash
  - Instrument an extension with `pg_waldump` output to prove correct ordering
  - Kill a backend mid-write with `kill -9` and verify the extension recovers consistently

### Week 7: Locking, Latches, and Concurrency
- **Locking Primitives**
  - Lightweight locks, spinlocks, and the heavyweight lock manager's lock tags
  - `LWLockAcquire` modes, lock tranches, and avoiding lock-ordering inversions
  - Latches, `WaitLatch`, and building interruptible waits that respect query cancel
- **Concurrency Contracts**
  - Snapshot usage and `GetTransactionSnapshot` inside functions and workers
  - Atomics, memory barriers, and safe publication of shared state
  - Deadlock avoidance when an extension takes locks across subsystems
- **Parallel Safety**
  - The `PARALLEL SAFE` / `RESTRICTED` / `UNSAFE` marking and its planner consequences
  - Shared state in parallel workers via dynamic shared memory (`dsa`, `shm_toc`)
  - What breaks when an extension writes in a parallel worker
- **Practical Labs**
  - Implement a shared counter protected by an LWLock and validate it under `pgbench`
  - Build a function that cancels cleanly when the user presses Ctrl-C
  - Reproduce a deadlock involving an extension lock and fix the ordering

### Week 8: Planner and Executor Hooks, Custom Scans, and Access Methods
- **Hooking the Planner**
  - `_PG_init` hook registration and the chain-of-responsibility pattern
  - `planner_hook`, `set_rel_pathlist_hook`, `set_join_pathlist_hook`, and cost adjustments
  - When to add a path versus when to rewrite the query tree
- **Executor Integration**
  - `CustomScan` nodes: `custom_plans`, `custom_private`, and serialisation across workers
  - `ExecutorStart_hook` / `ExecutorRun_hook` for instrumentation and policy enforcement
  - Expression evaluation with `ExecInitExpr` and `ExecEvalExpr`
- **Access Method Interfaces**
  - Table AM callbacks versus index AM callbacks, and the minimal viable set
  - Building an index AM on top of an existing one by delegation
  - `amhandler` functions and registering an AM in the catalogue
- **Practical Labs**
  - Add a planner hook that logs rejected paths for one query family
  - Implement a `CustomScan` that reads a file and returns rows without a relation
  - Wrap the heap table AM to add per-tuple auditing and measure the overhead

### Week 9: Background Workers, Hooks, and Event Triggers
- **Static and Dynamic Workers**
  - `BackgroundWorker` registration, `bgw_main`, and shared memory request hooks
  - Connecting a worker to the database with `BackgroundWorkerInitializeConnection`
  - Dynamic workers, restart policies, and supervisor-style extensions
- **Hooks Beyond the Planner**
  - `ProcessUtility_hook` for DDL interception and policy enforcement
  - `object_access_hook` and `ExecutorCheckPerms_hook` for fine-grained security
  - Event triggers written in C versus PL/pgSQL, and transaction boundaries
- **Operational Concerns**
  - Singletons, leader election between workers, and avoiding duplicate schedulers
  - Worker lifecycle across promotion, `pg_ctl reload`, and crash restart
  - Observability: exposing worker state through a custom view or GUC
- **Practical Labs**
  - Build a periodic worker that refreshes a materialised view on a schedule
  - Intercept and audit `CREATE ROLE` through a utility hook
  - Expose worker lag through a function that reads shared memory

### Week 10: Foreign Data Wrappers and Federation Internals
- **The FDW Callback Contract**
  - `GetForeignRelSize`, `GetForeignPaths`, `GetForeignPlan`, and `BeginForeignScan`
  - `IterateForeignScan`, `ReScanForeignScan`, and `EndForeignScan` lifecycle
  - `ExplainForeignScan` and honest cost reporting
- **Pushdown and Optimisation**
  - Classifying restrictions with `is_foreign_expr`-style logic
  - Join and aggregate pushdown, and the correctness traps in each
  - `AnalyzeForeignTable` and `ImportForeignSchema` for realistic statistics
- **Write Support and Reference Implementations**
  - `BeginForeignModify`, `ExecForeignInsert`, and batching strategies
  - Reading `postgres_fdw` and `file_fdw` as reference implementations
  - Security model: user mappings, credentials, and connection caching
- **Practical Labs**
  - Implement a read-only FDW over a CSV-backed HTTP endpoint
  - Add restriction pushdown and prove it with `EXPLAIN VERBOSE`
  - Extend the wrapper with `IMPORT FOREIGN SCHEMA` support

### Week 11: Testing, Memory Safety, and Cross-Version Support
- **Test Infrastructure**
  - `pg_regress` suites, expected-output files, and stable output formatting
  - TAP tests for multi-session and crash-recovery scenarios
  - Isolation tester for concurrency bugs, and fuzzing the I/O functions
- **Memory and Concurrency Debugging**
  - Building with `--enable-cassert`, `--enable-debug`, and sanitizers
  - Valgrind runs against the regression suite, and reading the reports
  - `gdb` breakpoints in backend processes, core dumps, and stack traces from production
- **Version Drift and Distribution**
  - `PG_VERSION_NUM` guards and maintaining a compatibility shim across majors
  - CI matrices that compile against three or four release branches
  - Packaging: PGXN metadata, Debian and RPM specs, and signed release artifacts
- **Practical Labs**
  - Convert a manual test script into a `pg_regress` suite with stable output
  - Run the extension's tests under Valgrind and fix every reported leak
  - Set up a CI matrix that builds against PostgreSQL 14 through 17

### Week 12: Capstone — Ship a Production Extension
- **Scope and Design**
  - Choose a problem worth solving with a custom type, an access method, or a worker
  - Write the design note first: durability, concurrency, and upgrade story
  - Define the SQL surface deliberately, because it is the part you cannot change later
- **Implementation and Hardening**
  - Implement, test, and benchmark the extension against a realistic dataset
  - Run crash, concurrency, and upgrade scenarios with recovery evidence
  - Produce documentation for both DBAs and developers
- **Release and Review**
  - Package a signed release with changelog and upgrade scripts
  - Present the design and benchmark results for peer critique
  - Publish, tag, and maintain an issue tracker for the extension

## Final Project

Learners will design, implement, test, package, and document a **production-grade PostgreSQL extension** of their own choosing, subject to instructor approval. The extension must exercise at least three subsystems covered in the course — for example a custom base type with an operator class, an FDW with pushdown, or a background worker combined with a utility hook.

Deliverables:

1. **Source repository**: extension code, control file, versioned SQL scripts, and upgrade scripts between at least two versions.
2. **SQL surface**: documented functions, types, or access methods with explicit volatility, parallel-safety, and privilege requirements.
3. **Test suite**: a `pg_regress` suite with stable expected output, at least one TAP test covering a multi-session or crash-recovery scenario, and a concurrency test.
4. **Correctness evidence**: a written durability analysis explaining WAL usage, lock ordering, and recovery behaviour, backed by a demonstrated crash test.
5. **Benchmarks**: measured overhead or speedup against a baseline, with the harness included and reproducible.
6. **Packaging**: PGXN-ready metadata or a distribution package, a changelog, and a documented compatibility range across PostgreSQL majors.
7. **Documentation**: an architecture note for maintainers and a DBA-facing usage guide with operational caveats.

## Assessment Criteria

- **Internals Understanding (20%)**: Correct use of memory contexts, buffer pins, and lock primitives; code that would survive `--enable-cassert` and Valgrind without complaint.
- **Durability and Concurrency Correctness (25%)**: Demonstrated WAL ordering, deadlock-free locking, parallel-safety marking, and a crash test that actually proves recovery works.
- **Design Quality (15%)**: A coherent SQL surface, sensible type and API boundaries, and a credible upgrade path.
- **Testing Rigour (15%)**: Regression, isolation, and TAP coverage that would catch real regressions; stable expected output rather than brittle text matching.
- **Performance Evidence (10%)**: Benchmark methodology that separates signal from noise, with justified overhead trade-offs.
- **Packaging and Documentation (15%)**: A release someone else could install, upgrade, diagnose, and maintain without asking the author.

## References

- **Official Documentation**: [PostgreSQL Documentation](https://www.postgresql.org/docs/)
  - Internals overview: [https://www.postgresql.org/docs/current/internals.html](https://www.postgresql.org/docs/current/internals.html)
  - Server programming and extension API: [https://www.postgresql.org/docs/current/server-programming.html](https://www.postgresql.org/docs/current/server-programming.html)
  - Write-ahead logging: [https://www.postgresql.org/docs/current/wal-internals.html](https://www.postgresql.org/docs/current/wal-internals.html)
  - Foreign data wrappers: [https://www.postgresql.org/docs/current/fdwhandler.html](https://www.postgresql.org/docs/current/fdwhandler.html)
  - Background workers: [https://www.postgresql.org/docs/current/bgworker.html](https://www.postgresql.org/docs/current/bgworker.html)
- **Books**:
  - "The Internals of PostgreSQL" by Hironobu Suzuki — free online chapters on storage, WAL, and the planner
  - "PostgreSQL 14 Internals" by Egor Rogov — deep treatment of pages, MVCC, and the buffer manager
  - "The Art of PostgreSQL" by Dimitri Fontaine — SQL-level context for extension design
- **Source and Community**:
  - [PostgreSQL source tree](https://github.com/postgres/postgres) — read `src/backend/access/heap` and `src/backend/utils/mmgr` first
  - [pgsql-hackers mailing list](https://www.postgresql.org/list/pgsql-hackers/) — how API changes are debated and reviewed
  - [PGXN](https://pgxn.org/) — extension packaging ecosystem and reference releases
  - [PostgreSQL Wiki](https://wiki.postgresql.org/) — developer and internals notes
- **Tooling**:
  - [Valgrind](https://valgrind.org/) and compiler sanitizers for memory-safety verification
  - [pgTAP and pg_regress guides](https://pgtap.org/) for test harness design
  - [pg_waldump](https://www.postgresql.org/docs/current/pgwaldump.html) for reading the log during recovery drills
