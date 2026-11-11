---
title: "Kotlin Java Interop and Migration Guide"
description: "Design null-safe, Java-friendly Kotlin APIs and migrate a mixed Java/Kotlin codebase incrementally without breaking binary compatibility or reflection-based frameworks."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Kotlin Java Interop and Migration Guide

## Introduction

Almost no Kotlin codebase is Kotlin-only. Android projects carry legacy Java from the pre-2017 era, JVM backends inherit Spring and JPA layers written in Java, and shared libraries must be consumable by both language ecosystems. The Kotlin compiler makes this coexistence feel effortless at first: Java classes are importable, Kotlin classes are visible from Java, and a mixed module compiles without any configuration. That seamlessness is exactly what makes interop bugs so expensive — they surface as `NullPointerException`s at runtime, as `NoSuchMethodError` after an innocuous refactor, or as dependency-injection failures when a framework cannot find a constructor it expected.

The core asymmetry is this: **Kotlin understands Java, but Java does not understand Kotlin.** When Kotlin calls Java, the compiler degrades unannotated Java types to *platform types* (`String!`), which means "nullable or not, I refuse to say" — the compiler stops helping you. When Java calls Kotlin, the compiler generates extra synthetic methods, mangled names, and `@NotNull`/`@Nullable` annotations that Java tooling only partially respects, so the Java-facing shape of a Kotlin class is rarely the shape you wrote.

This guide covers both directions of that asymmetry and then the migration strategy that ties them together: how to harden Java call sites, how to design a deliberate Java-facing API surface on Kotlin types, how to survive reflection-heavy frameworks, and how to convert a module from Java to Kotlin incrementally while keeping every commit compilable and every published API binary-compatible.

## Best Practices

### 1. Treat Platform Types as Untrusted Input

A platform type is the compiler telling you it has no nullability information. Every value that crosses from Java into Kotlin must be validated at the boundary, not deep inside business logic. The cheapest discipline is to give the boundary a declared type immediately: assign the Java result to an explicitly nullable Kotlin type, then handle the null case where the failure is still attributable to a specific call.

```kotlin
// Java library returns a platform type: the compiler will not warn here.
val legacyName: String? = legacyUserService.findDisplayName(id) // explicit nullable type

val displayName = legacyName?.trim()?.takeIf { it.isNotEmpty() }
    ?: throw IllegalStateException("Legacy user $id has no display name")
```

Avoid the reverse mistake of asserting non-nullness with `!!` at the boundary. `!!` converts a diagnosable data problem into an anonymous `NullPointerException` with a stack trace pointing at your assertion instead of the real defect.

### 2. Design the Java-Facing Surface Deliberately

Never let the Java API of a Kotlin class be an accident of how you wrote the Kotlin. Decide up front which members Java consumers use, and give them a shape a Java developer would have designed: real static methods, real overloads, no default parameters that only exist in Kotlin metadata, no companion-object indirection.

A useful rule: **if a member is not intended for Java, make it `internal`.** The Kotlin compiler then mangles or hides it, and you avoid committing to a shape you never designed.

### 3. Apply `@JvmStatic`, `@JvmField`, and `@JvmOverloads` With Intent

These three annotations are the main levers for making Kotlin feel native to Java, and each has a cost.

- `@JvmStatic` on a companion-object member generates a real static method on the enclosing class. Use it for factory methods and constants that Java consumers actually call; applying it everywhere doubles the generated API surface without benefit.
- `@JvmField` exposes a property as a plain public field, skipping the generated getter/setter. It only works on properties without custom accessors or delegation, and it freezes the field in your binary API — treat it as a permanent decision.
- `@JvmOverloads` generates the overload chain for a function with default parameters. It is the only way Java can call `fun render(title: String, size: Int = 14, bold: Boolean = false)` without passing every argument.

```kotlin
class ReportFormatter @JvmOverloads constructor(
    private val locale: Locale = Locale.getDefault(),
    private val debug: Boolean = false
) {
    companion object {
        @JvmStatic
        fun forEnglish(): ReportFormatter = ReportFormatter(Locale.ENGLISH)
    }

    @JvmOverloads
    fun format(body: String, width: Int = 80, wrap: Boolean = true): String =
        if (wrap) body.chunked(width).joinToString("\n") else body
}
```

From Java, both `new ReportFormatter()` and `new ReportFormatter(locale)` now exist, and `format(body)` resolves without passing defaults.

### 4. Stabilize Binary Names With `@JvmName` and `@file:JvmName`

Kotlin mangles names in two situations that matter to Java callers: top-level functions land in a file-class named after the file (`UserUtilsKt`), and functions that clash after type erasure get suffixed (`filter$default`). Both break Java code the moment someone renames a file — and both are fixed by an explicit annotation rather than by hoping nobody renames anything.

```kotlin
@file:JvmName("StringFormatting")
package com.example.shared.text

fun slugify(input: String): String =
    input.trim().lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
```

Java now calls `StringFormatting.slugify(...)`, and the file can be renamed freely. The same trick resolves erasure clashes, where `@JvmName("parseUsers")` and `@JvmName("parseOrders")` let two overloads coexist that erasure would otherwise collide.

### 5. Bridge Kotlin Variance and Java Wildcards Explicitly

Kotlin declaration-site variance (`out T`, `in T`) and Java use-site wildcards (`? extends T`, `? super T`) are two encodings of the same idea, and the compiler translates between them. The translation usually works, but it produces signatures Java developers find surprising, and occasionally it produces a signature that will not compile from Java at all.

When a Java caller cannot pass a `List<Subtype>` where you declared `List<Base>`, the answer is almost never "cast it in Java". Use `@JvmSuppressWildcards` on the parameter type to emit a plain `List<Base>`, or `@JvmWildcard` to force a wildcard where the compiler omitted one.

```kotlin
interface Repository<out T> {
    // Without the annotation the Java signature is Collection<? extends T>
    fun saveAll(items: Collection<@JvmSuppressWildcards T>): Int
}
```

### 6. Prefer `fun interface` Over Java Single-Method Interfaces

A Kotlin `fun interface` compiles to a real Java functional interface, so Java lambdas work at the call site exactly as they do for `Runnable` or `Predicate`. A regular interface with a single method does **not** get SAM conversion on the Java side in the way you expect from a `@FunctionalInterface`; using `fun interface` is the declarative fix.

```kotlin
fun interface RetryPolicy {
    fun shouldRetry(attempt: Int, error: Throwable): Boolean
}

val policy = RetryPolicy { attempt, error ->
    attempt < 3 && error is IOException
}
```

On the Kotlin side this also enables the trailing-lambda syntax, so both ecosystems get the ergonomics they expect from the same declaration.

### 7. Declare Checked Exceptions at the Boundary

Kotlin has no checked exceptions, and the compiler will not warn when a Kotlin function throws something Java considers checked. Java callers then either cannot compile their `try/catch` (because the compiler says the exception is never thrown) or silently lose the ability to handle a documented failure mode.

Any function intended for Java that can throw a checked exception needs `@Throws`. This is not cosmetic: it changes the generated bytecode signature and therefore the Java-facing contract.

```kotlin
@Throws(IOException::class)
fun exportTo(file: File, rows: List<Row>) {
    file.outputStream().bufferedWriter().use { writer ->
        rows.forEach { writer.write(it.toCsvLine()) }
    }
}
```

### 8. Keep Kotlin-Only Semantics Out of Java Contracts

Several Kotlin features have no Java equivalent and quietly become traps when exposed directly:

- **Default parameters** vanish from Java unless annotated with `@JvmOverloads` — Java sees only the full-arity method.
- **`data class` `copy` and `componentN`** are generated but semantically meaningless to Java, which cannot use destructuring.
- **Sealed hierarchies** compile to ordinary classes; Java can implement or extend them unless the constructors are `internal`, which is the enforcement you actually want.
- **Extension functions** are static methods on a file-class, so they read as `ExtensionsKt.trimToLength(x)` rather than `x.trimToLength()`.
- **Inline classes and value classes** are mangled at the bytecode level and are effectively unusable from Java.

The defensive habit: for any type that Java will consume, add a small adapter at the boundary rather than exposing the Kotlin type directly. A hand-written Java-friendly wrapper is cheaper than a year of confused call sites.

### 9. Migrate Leaf-First and Freeze the Boundary

Migration order determines how much pain you absorb. Converting a leaf class (no Kotlin dependents, few Java callers) is reversible and testable in isolation. Converting a central service first forces every caller to change in the same commit, which is how "migration" turns into a six-week branch that never merges.

Two rules make migration safe:

1. **The module compiles and the test suite passes at every commit.** Kotlin and Java coexist in one source set, so there is no technical reason for a broken intermediate state.
2. **A static check prevents new Java from being added to already-migrated packages.** Without that gate, the migration never finishes — files keep appearing in the language you are leaving.

Binary compatibility deserves its own rule: converting a class to Kotlin changes its generated API (getters become properties, constructors gain synthetic parameters). If the class is published as a library, run a binary-compatibility validator in CI before publishing, not after.

## Implementation Steps

### Step 1: Map the Interop Boundary

Start by enumerating which classes cross the language line and in which direction. Do not guess — measure.

```bash
# Kotlin files that import Java classes from the same module
grep -rl "^import com.example" --include="*.kt" . | head -50

# Java files that reference Kotlin-generated file-classes
grep -rn "Kt\." --include="*.java" . | grep -v "\.class" | head -50

# Count source files per language to size the migration
find . -name "*.kt" -not -path "*/build/*" | wc -l
find . -name "*.java" -not -path "*/build/*" | wc -l
```

Record the boundary in a short document: every Kotlin class with Java callers, every Java class with Kotlin callers, and the framework entry points (constructors, `@Inject` targets, `@Entity` types, serialization models). This list is the migration backlog and the source of every risk item in later steps.

### Step 2: Configure a Mixed Java and Kotlin Module

A mixed module needs no special plugin, but it does need a deliberate source layout and JVM target alignment. Kotlin and Java must compile to the same bytecode version or the Java compiler will fail on Kotlin output.

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.0.20"
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        // Fail on compiler warnings in interop code: they are usually real defects
        allWarningsAsErrors.set(true)
        // Generate JSR-305 annotations for Java consumers
        freeCompilerArgs.add("-Xjvm-default=all")
    }
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

dependencies {
    implementation(kotlin("stdlib"))
    testImplementation(kotlin("test"))
}
```

Two settings matter most. `jvmToolchain(21)` keeps both compilers on one target, and `-Xjvm-default=all` makes interface default methods real Java default methods instead of `DefaultImpls` indirection — which is what Java callers expect when they implement a Kotlin interface.

### Step 3: Harden Java Call Sites With Nullability Contracts

The fastest way to remove platform-type risk is to make the Java side tell the truth. Add JSpecify or JSR-305 annotations to Java classes that Kotlin consumes; the Kotlin compiler then reads real nullability instead of degrading to platform types.

```java
// Before: Kotlin sees String! and cannot help
public String findDisplayName(long id) {
    return repository.find(id).map(User::name).orElse(null);
}
```

```java
// After: Kotlin sees String? and forces the null check
import org.jspecify.annotations.Nullable;

public @Nullable String findDisplayName(long id) {
    return repository.find(id).map(User::name).orElse(null);
}
```

Then convert every boundary call site to an explicit Kotlin type and remove `!!` from interop code entirely. A practical audit:

```bash
# Find non-null assertions in code that touches Java APIs
grep -rn '!!' --include="*.kt" . | grep -v "/build/"
```

Each remaining `!!` is either a missing annotation on the Java side or a missing null branch on the Kotlin side. Fix the cause, not the assertion.

### Step 4: Shape the Java-Facing API Surface

For each Kotlin class with Java callers, write down the intended Java signature before touching annotations. Then apply the annotations that produce it.

```kotlin
class CacheClient private constructor(
    private val backend: CacheBackend,
    private val ttlSeconds: Long
) {
    companion object {
        // Real static factory for Java: CacheClient.create(backend)
        @JvmStatic
        @JvmOverloads
        fun create(backend: CacheBackend, ttlSeconds: Long = 300): CacheClient =
            CacheClient(backend, ttlSeconds)

        // Constants Java can read without getter noise
        @JvmField
        val DEFAULT_REGION: String = "eu-west-1"
    }

    @JvmOverloads
    fun get(key: String, refresh: Boolean = false): String? =
        backend.read(key, refresh)
}
```

Verify the result instead of trusting the source. `javap` shows exactly what Java will see:

```bash
# Inspect the generated Java surface of a compiled Kotlin class
javap -classpath build/classes/kotlin/main com.example.cache.CacheClient
```

If `javap` does not show a `public static CacheClient create(CacheBackend)`, the annotation is in the wrong place — most often on the companion object instead of its member.

### Step 5: Resolve Generics and Variance Mismatches

When a Java call site fails to compile against a Kotlin declaration, read the generated signature first, then decide whether to change the declaration or the call site.

```kotlin
class EventBus {
    private val subscribers = mutableListOf<Subscriber>()

    // Java callers pass List<SubscriberImpl> without wildcard gymnastics
    fun registerAll(all: List<@JvmSuppressWildcards Subscriber>) {
        subscribers.addAll(all)
    }

    // Force the wildcard where Java's PECS rules require it
    fun publish(event: @JvmWildcard Class<out DomainEvent>) {
        subscribers.forEach { it.onEvent(event) }
    }
}
```

The decision rule: suppress wildcards on **producer-agnostic collection parameters** you intend Java to fill, and force wildcards on **consumer positions** where Java's type system needs the flexibility. Never paper over the mismatch with an unchecked cast in Java — that moves a compile-time diagnostic into a `ClassCastException` at runtime.

### Step 6: Make Exception Contracts Explicit

Audit every Kotlin function called from Java that performs I/O, parses untrusted input, or reflects. Each needs `@Throws` listing exactly what Java may catch — no more, no less, because over-declaring forces dead `catch` blocks.

```kotlin
@Throws(IOException::class, MalformedInputException::class)
fun parseConfig(source: Path): Config {
    val text = try {
        Files.readString(source)
    } catch (e: IOException) {
        throw IOException("Cannot read config at $source", e)
    }
    return ConfigParser.parse(text) // throws MalformedInputException
}
```

Keep the Kotlin side idiomatic — prefer returning `Result<T>` or a sealed error type for new Kotlin-only code — and reserve `@Throws` for the members that Java genuinely consumes. Mixing both styles in one class is fine as long as the Java-facing members are the annotated ones.

### Step 7: Interop With Reflection-Heavy Java Frameworks

Frameworks are the highest-risk surface because they do not read Kotlin semantics; they read bytecode. Four patterns cause most failures:

- **Dependency injection by constructor.** Frameworks with single-constructor auto-wiring work fine. Frameworks that require a no-arg constructor need `@JvmOverloads` on a primary constructor with all-default parameters, or an explicit secondary constructor.
- **JPA entities.** Entities need a no-arg constructor and non-final properties. Kotlin classes and properties are final by default, so the entity plugin exists for exactly this reason:

```kotlin
// build.gradle.kts
plugins {
    kotlin("plugin.jpa") version "2.0.20"
    kotlin("plugin.noarg") version "2.0.20"
    kotlin("plugin.allopen") version "2.0.20"
}

noArg {
    annotation("jakarta.persistence.Entity")
}
```

- **Jackson deserialization.** Data classes with default values need `jackson-module-kotlin` to use the primary constructor; without it Jackson falls back to field reflection and default values are ignored.
- **Annotation targets.** A Kotlin annotation on a property lands on the constructor parameter by default. Persistence frameworks reading fields need an explicit target: `@field:Column(name = "user_name")`.

```kotlin
@Entity
class Invoice(
    @field:Id @field:GeneratedValue
    var id: Long? = null,
    @field:Column(name = "issued_at", nullable = false)
    var issuedAt: Instant = Instant.now()
)
```

### Step 8: Prove the Boundary With Cross-Language Tests

Unit tests written in Kotlin do not exercise the Java-facing contract — they call the Kotlin signature, which is exactly the one that is not at risk. Add a small set of Java tests that call the boundary the way a Java consumer would: constructor overloads, static factories, default-argument elision, checked exceptions, and generics.

```java
// src/test/java/com/example/cache/CacheClientJavaInteropTest.java
class CacheClientJavaInteropTest {

    @Test
    void staticFactoryUsesDefaultTtl() {
        CacheClient client = CacheClient.create(new InMemoryCacheBackend());
        assertNotNull(client);
    }

    @Test
    void formatAcceptsPositionalArguments() {
        ReportFormatter formatter = ReportFormatter.forEnglish();
        assertTrue(formatter.format("hello world").contains("hello"));
    }

    @Test
    void checkedExceptionIsCatchable() {
        assertThrows(IOException.class, () -> new ConfigLoader().parseConfig(Path.of("/missing")));
    }
}
```

If these tests do not compile, the interop contract is broken even though the Kotlin suite is green. Wire them into CI as a required job — a Java test that fails to compile is the cheapest possible detection of an accidental API change.

### Step 9: Execute the Incremental Migration

With the boundary mapped and tested, migrate in small, reversible increments.

1. **Convert leaves first.** Pick classes with no Kotlin dependents and few Java callers. Convert with the IDE's Java-to-Kotlin converter, then fix what it gets wrong — it reliably mishandles nullability, static state, and generics.
2. **Keep one language per commit per package.** A commit that adds Kotlin for `com.example.legacy.reports` and deletes the Java for it is reviewable; a commit that touches five packages is not.
3. **Run the Java interop tests after every conversion.** They are the only signal that the generated surface still matches what callers expect.
4. **Add the gate that ends the migration:**

```bash
# Fail the build if new Java appears in already-migrated packages
if grep -rq --include="*.java" "" src/main/java/com/example/reports; then
    echo "Migrated package contains Java files; convert them or move them out" >&2
    exit 1
fi
```

1. **Validate binary compatibility before publishing.** If the module is a library, run a validator such as `binary-compatibility-validator` so any accidental API removal fails CI rather than the consumers' build.
2. **Delete the Java sources only after** the Kotlin versions have shipped for one release cycle. Keeping them one release longer costs nothing; deleting them too early costs a rollback.

When the last Java file in a package is gone, remove the JSR-305 annotations from its neighbors, drop `@JvmStatic` and `@JvmOverloads` that no longer have Java consumers, and re-run the full suite. Interop annotations are debt: pay it down as soon as the reason for it disappears.
