---
title: "Bun Bundler API and Plugins Cheatsheet"
description: "A quick reference for the Bun bundler JavaScript API — Bun.build() options, CLI build flags, the plugin system (onResolve/onLoad), loaders, macros, and standalone executable compilation."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Bun Bundler API and Plugins Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Bundle with the JS API | `Bun.build({ entrypoints, outdir })` | Programmatic equivalent of `bun build` |
| Set output target | `target: "bun"` | `"bun"`, `"browser"`, or `"node"` |
| Choose module format | `format: "esm"` | `"esm"`, `"cjs"`, or `"iife"` |
| Minify output | `minify: true` | Also accepts `{ syntax, whitespace, identifiers }` |
| Generate source maps | `sourcemap: "external"` | `"none"`, `"inline"`, `"external"`, `"linked"` |
| Split shared code | `splitting: true` | Common chunks across multiple entrypoints |
| Rename output files | `naming: "[dir]/[name].[ext]"` | Pattern with placeholders |
| Keep packages external | `external: ["react"]` | Do not bundle the listed packages |
| Strip console calls | `drop: ["console"]` | Remove `console` and `debugger` statements |
| Inject environment variables | `env: "BUN_"` | Inline env vars matching the prefix |
| Replace constants | `define: { "KEY": "value" }` | Compile-time constant substitution |
| Register a plugin | `plugin(myPlugin)` | `Bun.plugin` or the `plugin` named export |
| Resolve module paths | `onResolve({ filter })` | Custom resolution inside a plugin |
| Transform module content | `onLoad({ filter })` | Custom loading inside a plugin |
| Map file extensions | `loader: { ".txt": "text" }` | Built-in loader per extension |
| Run code at build time | `import f from "./m" with { type: "macro" }` | Macro imports execute during build |
| Compile to a binary | `bun build --compile src.ts --outfile app` | Standalone native executable |

## Common Commands

### Programmatic Builds with Bun.build()

```typescript
import { build } from "bun";

const result = await build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun", // "bun" | "browser" | "node"
  format: "esm", // "esm" | "cjs" | "iife"
  minify: true,
  sourcemap: "external",
  splitting: true,
  naming: "[dir]/[name].[ext]",
  external: ["react", "sharp"],
  env: "BUN_",
  define: {
    "import.meta.env.MODE": '"production"',
  },
  drop: ["console", "debugger"],
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}
```

### Reading Build Outputs

```typescript
const result = await Bun.build({
  entrypoints: ["./src/index.ts", "./src/worker.ts"],
  outdir: "./dist",
  splitting: true,
});

for (const output of result.outputs) {
  console.log(output.path); // absolute output path
  console.log(output.kind); // "entry-point" | "chunk" | "asset" | "sourcemap"
  console.log(output.hash); // content hash used in the filename
}

// result.success: boolean — false when the build failed
// result.logs: array of build errors and warnings
```

### Equivalent CLI Build Flags

```bash
# Basic build for the Bun runtime
bun build src/index.ts --outdir dist --target bun

# Browser bundle with code splitting
bun build src/index.ts src/admin.ts --outdir dist --target browser --splitting

# Minify and generate external source maps
bun build src/index.ts --outdir dist --minify --sourcemap=external

# Rebuild on file changes
bun build src/index.ts --outdir dist --watch

# Strip console and debugger statements
bun build src/index.ts --outdir dist --drop=console,debugger

# Inline environment variables with a prefix
bun build src/index.ts --outdir dist --env BUN_

# Keep a package out of the bundle
bun build src/index.ts --outdir dist --external react

# Compile a standalone executable
bun build --compile src/cli.ts --outfile ./dist/mycli

# HTML-aware build (bundles scripts, styles, and assets)
bun build src/index.html --outdir dist --minify --html
```

### Registering a Plugin

```typescript
import { plugin } from "bun";

plugin({
  name: "markdown-loader",
  setup(build) {
    build.onLoad({ filter: /\.md$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      return { contents: JSON.stringify(text), loader: "js" };
    });
  },
});
```

### Resolving Custom Modules with onResolve

```typescript
import { plugin } from "bun";

plugin({
  name: "app-alias",
  setup(build) {
    // Rewrite @app/ imports to the local src directory
    build.onResolve({ filter: /^@app\// }, (args) => ({
      path: args.path.replace(/^@app\//, "./src/"),
    }));

    // Keep a heavy native package unbundled
    build.onResolve({ filter: /^aws-sdk$/ }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
});
```

### Virtual Modules with Namespaces

```typescript
import { plugin } from "bun";

plugin({
  name: "virtual-config",
  setup(build) {
    // Route imports of "config" to a synthetic module
    build.onResolve({ filter: /^config$/ }, () => ({
      path: "config",
      namespace: "virtual",
    }));

    // Provide the module's contents
    build.onLoad({ filter: /.*/, namespace: "virtual" }, () => ({
      contents: `export const apiUrl = "https://api.example.com";`,
      loader: "ts",
    }));
  },
});
```

### Mapping File Extensions to Loaders

```typescript
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  loader: {
    ".svg": "file",
    ".png": "file",
    ".txt": "text",
    ".sql": "text",
    ".yaml": "text",
  },
});

// Built-in loader values:
// "js" | "jsx" | "ts" | "tsx" | "json" | "toml" | "text" | "base64"
// | "dataurl" | "file" | "wasm"
```

### Macros — Code That Runs at Build Time

```typescript
// build-time-math.ts — executed by the bundler, not shipped to the runtime
export function double(x: number): number {
  return x * 2;
}

// app.ts — macro functions are inlined into the bundle
import { double } from "./build-time-math" with { type: "macro" };

console.log(double(21)); // inlined as console.log(42)
```

## Code Snippets

### Production Build Script

```typescript
// build.ts — run with: bun run build.ts
import { build } from "bun";

const result = await build({
  entrypoints: ["./src/server.ts", "./src/worker.ts"],
  outdir: "./dist",
  target: "bun",
  format: "esm",
  minify: true,
  sourcemap: "external",
  splitting: true,
  naming: "[dir]/[name].[ext]",
  external: ["sharp", "aws-sdk"],
  env: "BUN_",
  define: {
    "import.meta.env.MODE": '"production"',
  },
  drop: ["console", "debugger"],
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}

for (const output of result.outputs) {
  console.log(`built: ${output.path}`);
}
```

### Plugin: Compiling YAML Configs at Build Time

```typescript
import { plugin } from "bun";

plugin({
  name: "yaml-config",
  setup(build) {
    build.onLoad({ filter: /\.yaml$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const config = parseYaml(source); // any YAML parser
      return {
        contents: `export default ${JSON.stringify(config)};`,
        loader: "js",
      };
    });
  },
});
```

### Plugin: Inlining Feature Flags

```typescript
import { plugin } from "bun";

plugin({
  name: "feature-flags",
  setup(build) {
    build.onLoad({ filter: /feature-flags\.ts$/ }, () => ({
      contents: `export const flags = ${JSON.stringify({
        checkoutEnabled: true,
        recommendationsEnabled: false,
      })};`,
      loader: "ts",
    }));
  },
});
```

### Watching for Incremental Rebuilds

```typescript
// With watch: true, the promise resolves after the first build
// completes, then subsequent rebuilds are logged to stdout.
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  watch: true,
});
```

### Compiling a Standalone Binary

```bash
# Bundle a CLI into a single native executable
bun build --compile src/cli.ts --outfile ./dist/checkout

# Embed imported assets directly inside the executable
bun build --compile src/cli.ts --outfile ./dist/checkout --assetPrefix "bun-embed:"

# Minify the bundle that goes into the binary
bun build --compile --minify src/cli.ts --outfile ./dist/checkout
```
