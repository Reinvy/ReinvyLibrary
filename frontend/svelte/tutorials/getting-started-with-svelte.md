---
title: "Getting Started with Svelte"
description: "A comprehensive tutorial on Svelte — covering the reactive declaration model, component architecture, scoped styling, props and event handling, reactive statements, lifecycle functions, stores for state management, and building a complete interactive application."
category: "frontend"
technology: "svelte"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Getting Started with Svelte

## Summary

Svelte is a radical frontend framework that shifts the work from the browser to the compile step. Unlike React or Vue, which ship runtime libraries to the browser and use virtual DOM diffing, Svelte is a compiler that converts your declarative components into highly efficient imperative JavaScript at build time. The result is smaller bundle sizes, faster runtime performance, and a simpler developer experience.

This tutorial covers everything you need to start building web applications with Svelte — from project setup and component architecture to reactive declarations, event handling, scoped styles, and state management with Svelte stores. By the end, you will have built a complete interactive to-do application that demonstrates all the core concepts.

## Target Audience

- Frontend developers and full-stack developers who want to learn a modern, compiler-based approach to UI development.
- Beginner to intermediate level — no prior Svelte experience needed, but basic familiarity with HTML, CSS, and JavaScript is expected.

## Prerequisites

- Basic knowledge of HTML, CSS, and JavaScript (ES6+ syntax, arrow functions, modules).
- Node.js (version 16 or later) and npm installed on your development machine.
- A code editor (VS Code recommended with the Svelte extension).

## Learning Objectives

By the end of this tutorial, you will be able to:
- Initialize a Svelte project using the official scaffolding tool
- Understand the Svelte component model (`.svelte` files, script, style, markup sections)
- Use reactive declarations (`$:` ) to automatically update derived values
- Handle user events and manage component state with two-way bindings
- Pass data between components using props and dispatch custom events
- Apply scoped CSS and use the `:global()` modifier
- Manage shared application state with Svelte writable stores
- Build and deploy a Svelte application to production

## Context and Motivation

Traditional frontend frameworks like React, Vue, and Angular operate at runtime. When a user visits a page, the browser downloads a JavaScript bundle that includes the framework runtime, then uses virtual DOM diffing to determine what changed and update the real DOM. This runtime overhead affects both initial load time (larger bundle) and ongoing performance (diffing cost on every state change).

Svelte takes a fundamentally different approach. It is a **compiler**, not a runtime. When you build your application, Svelte compiles your components into highly optimized, framework-free JavaScript that directly manipulates the DOM. There is no virtual DOM, no diffing algorithm, and no framework runtime to download. The result is dramatically smaller bundle sizes — a minimal Svelte app is roughly 1.5 KB gzipped compared to 30+ KB for React — and faster performance because updates are surgical rather than comparative.

Beyond performance, Svelte offers a refreshing developer experience. Components are written in single-file `.svelte` files that co-locate HTML, CSS, and JavaScript in a way that feels natural. CSS is scoped by default, reactivity is declarative (you write `count += 1` and the UI updates), and there are fewer concepts to learn compared to other frameworks. This makes Svelte an excellent choice for projects where bundle size and performance matter — such as interactive embeds, mobile web, and content-focused sites — while still being powerful enough for full-scale single-page applications.

## Core Content

### Project Setup with SvelteKit

SvelteKit is the official application framework for Svelte, similar to Next.js for React or Nuxt for Vue. It provides file-based routing, server-side rendering, static site generation, and API routes out of the box.

Create a new SvelteKit project:

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

During setup, you will be prompted to choose options like TypeScript support, ESLint, and testing. For this tutorial, select the skeleton project with JavaScript.

The project structure looks like this:

```text
my-app/
├── src/
│   ├── routes/
│   │   ├── +page.svelte
│   │   └── +layout.svelte
│   └── app.html
├── static/
├── svelte.config.js
├── vite.config.js
└── package.json
```

### Understanding Svelte Components

A Svelte component is a single `.svelte` file containing three sections: `<script>`, `<style>`, and markup (HTML). Here is the simplest possible component:

```svelte
<script>
  let name = 'world';
</script>

<h1>Hello {name}!</h1>

<style>
  h1 {
    color: purple;
  }
</style>
```

The `{name}` syntax is Svelte's template interpolation. When `name` changes, the DOM updates automatically without any explicit render call. The `<style>` section is **scoped by default** — the CSS only applies to elements within this component, avoiding style conflicts across your application.

### Reactive Declarations

One of Svelte's most distinctive features is the reactive declaration, denoted by `$:`. Think of it as a spreadsheet formula — whenever any variable referenced inside the declaration changes, the declaration re-runs automatically.

```svelte
<script>
  let count = 0;
  let doubled = count * 2;

  // Reactive declaration: runs whenever count changes
  $: doubled = count * 2;

  // Reactive statement with side effects
  $: console.log(`count is now ${count}`);

  // Multi-line reactive block
  $: {
    console.log(`doubled is ${doubled}`);
    // You can put any statements here
  }

  function increment() {
    count += 1;
  }
</script>

<button on:click={increment}>
  Clicked {count} times
</button>

<p>{count} doubled is {doubled}</p>
```

Note that `doubled = count * 2` on its own (without `$:`) would not be reactive — it would only compute the value once when the component initializes. The `$:` prefix makes it reactive.

### Event Handling and Bindings

Svelte uses the `on:` directive for event handling and `bind:` for two-way data binding.

```svelte
<script>
  let name = '';
  let items = [];

  function handleSubmit() {
    items = [...items, name];
    name = '';
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<input
  bind:value={name}
  on:keydown={handleKeydown}
  placeholder="Enter an item"
/>

<button on:click={handleSubmit}>Add</button>

<ul>
  {#each items as item, i}
    <li>{i + 1}: {item}</li>
  {/each}
</ul>
```

This example demonstrates:
- `bind:value={name}` — two-way binding between the input and the `name` variable
- `on:click` and `on:keydown` — event listeners
- `{#each items as item, i}` — Svelte's template syntax for looping over arrays

### Component Props and Events

Components accept data through **props** (`export let`) and communicate upward through **events** (`createEventDispatcher`).

**Child component** (`Item.svelte`):

```svelte
<script>
  import { createEventDispatcher } from 'svelte';

  // Declare props with export let
  export let text = '';
  export let done = false;

  const dispatch = createEventDispatcher();

  function toggle() {
    dispatch('toggle', !done);
  }

  function remove() {
    dispatch('remove');
  }
</script>

<div class="item" class:done>
  <span on:click={toggle}>{text}</span>
  <button on:click={remove}>✕</button>
</div>

<style>
  .item { display: flex; align-items: center; gap: 0.5rem; }
  .done span { text-decoration: line-through; opacity: 0.5; }
</style>
```

**Parent component** using the child:

```svelte
<script>
  import Item from './Item.svelte';

  let todos = [
    { id: 1, text: 'Learn Svelte', done: false },
    { id: 2, text: 'Build an app', done: false }
  ];

  function handleToggle(event, id) {
    todos = todos.map(t =>
      t.id === id ? { ...t, done: event.detail } : t
    );
  }

  function handleRemove(id) {
    todos = todos.filter(t => t.id !== id);
  }
</script>

{#each todos as todo (todo.id)}
  <Item
    text={todo.text}
    done={todo.done}
    on:toggle={(e) => handleToggle(e, todo.id)}
    on:remove={() => handleRemove(todo.id)}
  />
{/each}
```

The `(todo.id)` in the `{#each}` block is a **key expression** that helps Svelte efficiently update the list when items are added, removed, or reordered, similar to React's `key` prop.

### Reactive Statements and Control Flow

Svelte provides template syntax for conditionals and loops that stays close to HTML:

```svelte
<script>
  let user = null;
  let score = 85;
  let colors = ['red', 'green', 'blue'];
</script>

<!-- Conditionals -->
{#if user}
  <p>Welcome back, {user.name}!</p>
{:else if user === null}
  <p>Loading...</p>
{:else}
  <p>Please log in.</p>
{/if}

<!-- Loops -->
<ul>
  {#each colors as color, index}
    <li style="color: {color}">{index}: {color}</li>
  {/each}
</ul>

<!-- Await promises -->
{#await promise}
  <p>Loading...</p>
{:then value}
  <p>Result: {value}</p>
{:catch error}
  <p>Error: {error.message}</p>
{/await}
```

### State Management with Stores

For shared state across components, Svelte provides **stores**. The most common is a writable store:

```svelte
<script>
  // lib/stores.js
  import { writable, derived } from 'svelte/store';

  // A writable store holds a value that can be read and mutated from anywhere
  export const todos = writable([]);

  // A derived store computes its value from other stores
  export const activeCount = derived(todos, ($todos) =>
    $todos.filter(t => !t.done).length
  );

  export function addTodo(text) {
    todos.update(t => [...t, { id: Date.now(), text, done: false }]);
  }

  export function toggleTodo(id) {
    todos.update(t => t.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ));
  }
</script>
```

Using a store in a component:

```svelte
<script>
  import { todos, activeCount, addTodo } from './lib/stores.js';

  let newTodo = '';

  // Auto-subscribe: prefix the store name with $ to read its value
  // $todos and $activeCount are automatically subscribed/unsubscribed
</script>

<p>{$activeCount} items remaining</p>

<input bind:value={newTodo} placeholder="Add a todo" />
<button on:click={() => { addTodo(newTodo); newTodo = ''; }}>Add</button>

{#each $todos as todo (todo.id)}
  <div>
    <input type="checkbox" checked={todo.done} on:click={() => toggleTodo(todo.id)} />
    <span class:done={todo.done}>{todo.text}</span>
  </div>
{/each}
```

The `$` prefix is Svelte's **store auto-subscription** syntax. When you prefix a store variable with `$`, Svelte automatically subscribes to the store in the component's `onMount` and unsubscribes in `onDestroy`. This means you never need to manually call `.subscribe()` or worry about cleanup.

### Lifecycle Functions

Svelte provides several lifecycle functions that you can import from `svelte`:

```svelte
<script>
  import { onMount, onDestroy, beforeUpdate, afterUpdate, tick } from 'svelte';

  onMount(() => {
    // Runs after the component is first rendered
    // Return a cleanup function that runs on destroy
    const interval = setInterval(() => console.log('tick'), 1000);
    return () => clearInterval(interval);
  });

  beforeUpdate(() => {
    // Runs before the DOM is updated
  });

  afterUpdate(() => {
    // Runs after the DOM is updated
  });

  onDestroy(() => {
    // Runs when the component is destroyed
    // Cleanup is also handled by returning from onMount
  });
</script>
```

### Scoped Styles and Global Modifiers

Styles in a `.svelte` file are scoped by default. Svelte generates unique class names to prevent leakage:

```svelte
<style>
  /* Only affects <p> elements in THIS component */
  p {
    color: blue;
  }

  /* Override scoping for specific selectors */
  :global(body) {
    margin: 0;
    font-family: sans-serif;
  }

  /* Compose scoped and global: apply scoped class to global elements */
  :global(.dark-mode) p {
    color: white;
  }
</style>
```

## Code Examples

### Complete Interactive Todo Application

Here is a complete Svelte todo application that ties together all the concepts covered in this tutorial.

**`src/lib/stores.js`** — Shared state:

```javascript
import { writable, derived } from 'svelte/store';

export const todos = writable([]);

export const activeCount = derived(todos, ($todos) =>
  $todos.filter(t => !t.done).length
);

export const filteredTodos = derived(todos, ($todos) =>
  $todos.filter(t =>
    filter === 'active' ? !t.done :
    filter === 'completed' ? t.done :
    true
  )
);

export const filter = writable('all');

export function addTodo(text) {
  todos.update(t => [...t, { id: Date.now(), text, done: false }]);
}

export function toggleTodo(id) {
  todos.update(t => t.map(item =>
    item.id === id ? { ...item, done: !item.done } : item
  ));
}

export function removeTodo(id) {
  todos.update(t => t.filter(item => item.id !== id));
}

export function clearCompleted() {
  todos.update(t => t.filter(item => !item.done));
}
```

**`src/routes/+page.svelte`** — Main page:

```svelte
<script>
  import { todos, activeCount, filter, addTodo, toggleTodo, removeTodo, clearCompleted } from '$lib/stores.js';
  import { derived } from 'svelte/store';

  let newTodo = '';

  $: filteredTodos = $filter === 'all'
    ? $todos
    : $filter === 'active'
      ? $todos.filter(t => !t.done)
      : $todos.filter(t => t.done);

  function handleAdd() {
    if (newTodo.trim()) {
      addTodo(newTodo.trim());
      newTodo = '';
    }
  }
</script>

<main>
  <h1>Todo App</h1>

  <div class="input-row">
    <input
      bind:value={newTodo}
      on:keydown={(e) => e.key === 'Enter' && handleAdd()}
      placeholder="What needs to be done?"
    />
    <button on:click={handleAdd}>Add</button>
  </div>

  {#if $todos.length > 0}
    <div class="filters">
      <button class:active={$filter === 'all'} on:click={() => filter.set('all')}>All</button>
      <button class:active={$filter === 'active'} on:click={() => filter.set('active')}>Active</button>
      <button class:active={$filter === 'completed'} on:click={() => filter.set('completed')}>Completed</button>
    </div>

    <ul>
      {#each filteredTodos as todo (todo.id)}
        <li class:done={todo.done}>
          <input
            type="checkbox"
            checked={todo.done}
            on:click={() => toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
          <button class="remove" on:click={() => removeTodo(todo.id)}>✕</button>
        </li>
      {/each}
    </ul>

    <div class="footer">
      <span>{$activeCount} item{$activeCount !== 1 ? 's' : ''} remaining</span>
      {#if $todos.some(t => t.done)}
        <button on:click={clearCompleted}>Clear completed</button>
      {/if}
    </div>
  {:else}
    <p class="empty">No todos yet. Add one above!</p>
  {/if}
</main>

<style>
  main {
    max-width: 500px;
    margin: 2rem auto;
    font-family: system-ui, sans-serif;
  }

  h1 {
    text-align: center;
    color: #333;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  input[type="text"] {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  button:hover {
    background: #f0f0f0;
  }

  .filters {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
    justify-content: center;
  }

  .filters button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }

  li.done span {
    text-decoration: line-through;
    opacity: 0.5;
  }

  li .remove {
    margin-left: auto;
    border: none;
    background: none;
    color: #999;
    cursor: pointer;
  }

  li .remove:hover {
    color: #e74c3c;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: #666;
  }

  .empty {
    text-align: center;
    color: #999;
    font-style: italic;
  }
</style>
```

## Key Insights

- **Compile-time over runtime**: Svelte's key advantage is that it compiles away the framework. The output is plain JavaScript with no virtual DOM overhead, resulting in bundles that are 5–10× smaller than equivalent React or Vue applications.
- **Reactivity is the core mental model**: Understanding `$:` reactive declarations is the most important concept after the component model itself. Unlike React's `useState` — where you must call a setter function — Svelte lets you write `count += 1` and the UI updates automatically because the compiler instruments assignments.
- **Scoped CSS by default**: Styles in a `.svelte` file are scoped to that component, which eliminates CSS conflicts without needing CSS Modules, styled-components, or BEM naming conventions. Use `:global()` intentionally for styles that need to escape the component scope.
- **Stores for shared state, not local state**: Svelte's local reactivity (reactive declarations and `bind:` directives) handles most component-local state. Stores should be reserved for state that genuinely needs to be shared across unrelated components. Overusing stores for local state adds unnecessary indirection.
- **The `$` store prefix is magical**: When you write `$storeName`, Svelte automatically subscribes in `onMount` and unsubscribes in `onDestroy`. You can also write `$storeName = value` to call `.set()` — the `$` syntax handles both reads and writes seamlessly.

## Next Steps

- Learn about Svelte transitions and animations for adding motion to your applications
- Explore SvelteKit's advanced routing patterns (layout groups, page endpoints, form actions)
- Set up server-side rendering and static site generation with SvelteKit
- Study the Svelte tutorial at [learn.svelte.dev](https://learn.svelte.dev) for interactive exercises

## Conclusion

Svelte offers a compelling alternative to traditional frontend frameworks by shifting the work to compile time. Its component model is intuitive — HTML, CSS, and JavaScript naturally co-exist in a single file — and its reactive model makes state management feel like plain JavaScript. The combination of small bundle sizes, excellent runtime performance, and a shallow learning curve makes Svelte an ideal choice for both small interactive widgets and full-scale web applications.

You now have the foundational knowledge to build real applications with Svelte. Start with the todo application from this tutorial, experiment with stores and reactive declarations, and explore SvelteKit's routing and server-side rendering capabilities as your application grows.
