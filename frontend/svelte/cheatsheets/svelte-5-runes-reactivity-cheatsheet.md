---
title: "Svelte 5 Runes and Modern Reactivity Cheatsheet"
description: "A quick reference for Svelte 5 runes — $state, $derived, $effect, $props, $bindable, $inspect, snippets, and event attributes — with practical examples for writing modern reactive components."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Svelte 5 Runes and Modern Reactivity Cheatsheet

## Quick Reference Table

| Rune / Feature | Code | Description |
|----------------|------|-------------|
| Runes mode | `runes: true` in `svelte.config.js` | Enables the modern reactivity system project-wide |
| `$state` | `let count = $state(0)` | Declares a reactive variable; assignments trigger re-renders |
| `$state` object/class | `let user = $state({ name: 'Ada' })` | Deep reactivity — nested properties are reactive too |
| `$state.raw` | `let rows = $state.raw(bigArray)` | Shallow reactive state without deep proxying |
| `$state.snapshot` | `const plain = $state.snapshot(user)` | Takes a plain, non-reactive copy of reactive state |
| `$state.is` | `$state.is(value)` | Returns `true` if a value is reactive state |
| `$derived` | `let doubled = $derived(count * 2)` | Declares a value derived from reactive state |
| `$derived.by` | `let total = $derived.by(() => sum(items))` | Derives from a block of code |
| `$effect` | `$effect(() => subscribe(store))` | Runs code whenever its tracked state changes and cleans up |
| `$effect.pre` | `$effect.pre(() => measure())` | Runs before the DOM is updated |
| `$effect.untracked` | `$effect.untracked(() => log())` | Runs code without tracking dependencies |
| `$props` | `let { title = 'Hi' } = $props()` | Declares component props with defaults |
| `$bindable` | `let { value = $bindable(0) } = $props()` | Marks a prop as two-way bindable |
| `$inspect` | `$inspect(count)` | Logs tracked state changes with source location |
| `$host` | `const el = $host()` | Returns the host element inside a custom element component |
| Snippet | `{#snippet chip(text)}...{/snippet}` | Reusable markup fragment, rendered with `{@render chip(text)}` |
| Event attribute | `onclick={() => count++}` | Modern event syntax replacing `on:click` |

## Common Commands

### Project Setup

```bash
# Scaffold a new Svelte 5 project with the sv CLI
npx sv create my-app

# Add Svelte to an existing Vite project
npm create vite@latest my-app -- --template svelte

# Install dependencies
npm install
```

### Enabling Runes Mode

```bash
# Add compilerOptions.runes to svelte.config.js, then restart the dev server
npm run dev
```

### Type Checking and Migration

```bash
# Type-check all Svelte files
npx svelte-check

# Migrate a legacy component to runes syntax
npx sv migrate runes
```

### Development Commands

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the production build
```

## Code Snippets

### Runes Mode Configuration

```javascript
// svelte.config.js — enabling runes for the whole project
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: { runes: true }
};

export default config;
```

### `$state` — Reactive Variables

```svelte
<script>
  let count = $state(0);

  function increment() {
    count += 1;
  }
</script>

<button onclick={increment}>
  Clicks: {count}
</button>
```

### `$derived` — Computed Values

```svelte
<script>
  let quantity = $state(2);
  let price = $state(19.99);

  // Inline derivation
  let total = $derived(quantity * price);

  // Block form for multi-step derivation
  let tax = $derived.by(() => {
    const base = total * 0.1;
    return Math.round(base * 100) / 100;
  });
</script>

<p>{quantity} x {price} = {total} (tax {tax})</p>
```

### `$effect` — Side Effects

```svelte
<script>
  let theme = $state('light');

  // Re-runs whenever `theme` changes; returned function is the cleanup
  $effect(() => {
    document.documentElement.dataset.theme = theme;
    return () => console.log('theme effect disposed');
  });

  // Runs before DOM updates — safe for measuring layout
  $effect.pre(() => {
    console.log('Layout width:', document.body.offsetWidth);
  });

  // Reads without creating a subscription
  $effect.untracked(() => {
    console.log('Untracked read:', theme);
  });
</script>

<button onclick={() => (theme = theme === 'light' ? 'dark' : 'light')}>
  Toggle theme
</button>
```

### `$props` and `$bindable` — Component Communication

```svelte
<!-- Counter.svelte -->
<script>
  let { label = 'Counter', value = $bindable(0) } = $props();
</script>

<button onclick={() => value++}>
  {label}: {value}
</button>
```

```svelte
<!-- App.svelte -->
<script>
  import Counter from './Counter.svelte';
  let total = $state(0);
</script>

<Counter label="Score" bind:value={total} />
<p>Total: {total}</p>
```

### Deep Reactivity with Objects and Arrays

```svelte
<script>
  let todos = $state([{ id: 1, done: false, text: 'Learn runes' }]);

  function toggle(id) {
    // Nested mutation is reactive — no reassignment needed
    const todo = todos.find((t) => t.id === id);
    if (todo) todo.done = !todo.done;
  }

  function addTodo(text) {
    todos.push({ id: todos.length + 1, done: false, text });
  }
</script>

{#each todos as todo}
  <button onclick={() => toggle(todo.id)}>
    {todo.done ? 'done' : 'todo'} — {todo.text}
  </button>
{/each}
```

### `$state.raw` and `$state.snapshot`

```svelte
<script>
  // Shallow state: mutate by reassigning the whole value, not nested fields
  let rows = $state.raw(loadRows());

  function markAllTouched() {
    rows = rows.map((row) => ({ ...row, touched: true }));
  }

  // Escape reactivity when handing data to non-reactive libraries
  function exportJson() {
    const plain = $state.snapshot(rows);
    console.log(JSON.stringify(plain));
  }
</script>
```

### `$inspect` — Development-Time Tracing

```svelte
<script>
  let search = $state('');

  // Logs every change with a link to the source location (dev only)
  $inspect(search);
</script>

<input bind:value={search} placeholder="Type to inspect" />
```

### Snippets and Render Tags

```svelte
<script>
  let items = $state(['Svelte', 'Runes', 'Snippets']);
</script>

{#snippet chip(text)}
  <span class="chip">{text}</span>
{/snippet}

{#snippet renderList(list)}
  {#each list as item}
    {@render chip(item)}
  {/each}
{/snippet}

{@render renderList(items)}
```

### Event Attributes vs Legacy Directives

```svelte
<script>
  let name = $state('world');
</script>

<!-- Modern: event attributes take a function directly -->
<input value={name} oninput={(e) => (name = e.target.value)} />

<!-- Two-way bindings remain supported -->
<input bind:value={name} />

<!-- Legacy on:event directives still compile but are deprecated -->
```

### Reactive Classes and `$state.is`

```svelte
<script>
  class Timer {
    seconds = $state(0);
    #interval;

    start() {
      this.#interval = setInterval(() => this.seconds++, 1000);
    }

    stop() {
      clearInterval(this.#interval);
    }
  }

  const timer = new Timer();
  timer.start();

  // `$state.is` distinguishes reactive from plain data
  let plainNumber = 42;
  console.log($state.is(timer.seconds)); // true
  console.log($state.is(plainNumber));   // false
</script>

<p>Elapsed: {timer.seconds}s</p>
```
