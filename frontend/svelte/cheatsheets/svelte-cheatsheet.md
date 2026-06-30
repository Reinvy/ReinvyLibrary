---
title: "Svelte Cheat Sheet"
description: "A quick reference guide for Svelte reactive declarations, component syntax, template directives, stores, lifecycle functions, transitions, and SvelteKit file conventions."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Svelte Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Create SvelteKit project | `npm create svelte@latest my-app` | Scaffold a new SvelteKit application |
| Create vanilla Svelte project | `npm create vite@latest my-app -- --template svelte` | Scaffold with Vite's Svelte template |
| Install dependencies | `npm install` | Install project dependencies |
| Start dev server | `npm run dev` | Start development server with hot reload |
| Build for production | `npm run build` | Build the application for production |
| Preview production build | `npm run preview` | Preview the production build locally |
| Run tests | `npm test` | Run test suite (Vitest) |
| Reactive assignment | `count += 1` | Triggers reactivity on assignment |
| Reactive statement | `$: doubled = count * 2` | Re-run when dependencies change |
| Reactive block | `$: { ... }` | Multi-statement reactive block |
| Export prop declaration | `export let name` | Declare a component prop |
| Create event dispatcher | `const dispatch = createEventDispatcher()` | Create custom event emitter |
| Declare a store | `const count = writable(0)` | Create a writable store |
| Auto-subscribe to store | `$count` | Auto-subscribe and unsubscribe with `$` prefix |
| Lifecycle: on mount | `onMount(() => { ... })` | Run code after component is mounted |
| Lifecycle: before update | `beforeUpdate(() => { ... })` | Run code before the DOM updates |
| Lifecycle: after update | `afterUpdate(() => { ... })` | Run code after the DOM updates |
| Lifecycle: on destroy | `onDestroy(() => { ... })` | Cleanup when component unmounts |
| Apply transition | `<div transition:fade>` | Apply fade transition on enter/exit |
| Scoped style | `<style>` | CSS is scoped to the component by default |
| Global style escape | `:global(body)` | Apply styles outside the component's scope |
| Module context | `<script context="module">` | Code runs once per component instance group |

## Common Commands

### Project Initialization

```bash
# Create a new SvelteKit project with interactive CLI prompts
npm create svelte@latest my-app

# Create a vanilla Svelte project via Vite
npm create vite@latest my-app -- --template svelte

# Create a Svelte project with TypeScript via Vite
npm create vite@latest my-app -- --template svelte-ts

# Navigate into the project and install dependencies
cd my-app && npm install

# Start the development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### SvelteKit CLI (adapter and config)

```bash
# Add the Node.js adapter for server-side rendering
npm install --save-dev @sveltejs/adapter-node

# Add the static adapter for static site generation
npm install --save-dev @sveltejs/adapter-static

# Add the Vercel adapter
npm install --save-dev @sveltejs/adapter-vercel

# Add the Netlify adapter
npm install --save-dev @sveltejs/adapter-netlify

# Check for Svelte 5 migration status
npx svelte-migrate
```

### Package Management and Tooling

```bash
# Install Svelte type checking
npm install --save-dev typescript svelte-check

# Lint Svelte files with ESLint
npm install --save-dev eslint eslint-plugin-svelte

# Format with Prettier
npm install --save-dev prettier prettier-plugin-svelte

# Install testing utilities
npm install --save-dev vitest @sveltejs/vite-plugin-svelte

# Run type checking
npx svelte-check
```

### SvelteKit Routing

```bash
# Create a page route
# src/routes/+page.svelte — root page
# src/routes/about/+page.svelte — /about route
# src/routes/blog/[slug]/+page.svelte — dynamic route

# Create an API endpoint
# src/routes/api/posts/+server.js — GET /api/posts
# src/routes/api/posts/[id]/+server.js — GET /api/posts/:id
```

## Code Snippets

### Component Basics

```svelte
<script>
  // Props — declared with export let
  export let name = 'World';
  export let count = 0;
  export let items = [];

  // Reactive declarations
  $: doubled = count * 2;
  $: greeting = `Hello, ${name}!`;

  // Reactive statements (re-run when dependencies change)
  $: {
    console.log(`Count changed to ${count}`);
    document.title = `Count: ${count}`;
  }

  // Reactive statements with conditionals
  $: if (count > 10) {
    console.log('Count exceeds threshold!');
  }
</script>

<p>{greeting}</p>
<p>Count doubled is {doubled}</p>
```

### Event Handling and Modifiers

```svelte
<script>
  let count = 0;
  function handleClick(event) {
    count += 1;
  }
  function handleSubmit(event) {
    event.preventDefault();
    // handle form submission
  }
  function handleKeydown(event) {
    console.log('Key pressed:', event.key);
  }
</script>

<!-- Standard event handler -->
<button on:click={handleClick}>
  Clicked {count} {count === 1 ? 'time' : 'times'}
</button>

<!-- Inline event handler -->
<button on:click={() => count = 0}>
  Reset
</button>

<!-- Event modifiers: preventDefault, stopPropagation, once, passive, capture -->
<form on:submit|preventDefault={handleSubmit}>
  <input type="text" />
  <button type="submit">Submit</button>
</form>

<!-- Chained modifiers -->
<div on:click|stopPropagation|once={handleKeydown}>
  Click me (runs only once, stops propagation)
</div>

<!-- Other common modifiers -->
<!-- on:click|self — only triggers if event.target === the element -->
<!-- on:scroll|passive — improves scroll performance -->
<!-- on:click|capture — use capture phase instead of bubble -->
```

### Conditional Rendering and Loops

```svelte
<script>
  let user = null;
  let loggedIn = false;
  let todos = [
    { id: 1, text: 'Learn Svelte', done: true },
    { id: 2, text: 'Build an app', done: false },
    { id: 3, text: 'Deploy to production', done: false }
  ];
  let promise = fetch('/api/data').then(res => res.json());
</script>

<!-- Conditional: {#if} ... {:else if} ... {:else} -->
{#if user}
  <p>Welcome back, {user.name}!</p>
{:else if loggedIn}
  <p>Loading user data...</p>
{:else}
  <p>Please log in.</p>
{/if}

<!-- Loops: {#each} with key -->
<ul>
  {#each todos as todo, i (todo.id)}
    <li class:done={todo.done}>
      {i + 1}. {todo.text}
    </li>
  {/each}
</ul>

<!-- Empty state for {#each} -->
{#each items as item}
  <div>{item.name}</div>
{:else}
  <p>No items to display.</p>
{/each}

<!-- Await promise states -->
{#await promise}
  <p>Loading...</p>
{:then data}
  <pre>{JSON.stringify(data, null, 2)}</pre>
{:catch error}
  <p class="error">Error: {error.message}</p>
{/await}
```

### Two-Way Bindings

```svelte
<script>
  let name = '';
  let checked = false;
  let selected = 'all';
  let volume = 50;
  let bio = '';
  let toppings = [];

  // For bind:this pattern
  let inputElement;
  function focusInput() {
    inputElement.focus();
  }
</script>

<!-- Input text -->
<input bind:value={name} placeholder="Enter your name" />
<p>Hello, {name}!</p>

<!-- Checkbox -->
<label>
  <input type="checkbox" bind:checked={checked} />
  Accept terms
</label>

<!-- Radio group -->
<label><input type="radio" bind:group={selected} value="all" /> All</label>
<label><input type="radio" bind:group={selected} value="active" /> Active</label>
<label><input type="radio" bind:group={selected} value="completed" /> Completed</label>

<!-- Select dropdown -->
<select bind:value={selected}>
  <option value="all">All</option>
  <option value="active">Active</option>
  <option value="completed">Completed</option>
</select>

<!-- Range slider -->
<input type="range" bind:value={volume} min="0" max="100" />
<p>Volume: {volume}%</p>

<!-- Textarea -->
<textarea bind:value={bio}></textarea>

<!-- Content editable div -->
<div contenteditable="true" bind:innerHTML={bio}></div>

<!-- Bind to element ref -->
<input bind:this={inputElement} />
<button on:click={focusInput}>Focus Input</button>
```

### Stores

```svelte
<script>
  import { writable, readable, derived } from 'svelte/store';
  import { onMount } from 'svelte';

  // Writable store — basic read/write store
  export const count = writable(0);

  // Readable store — read-only, useful for external data
  export const time = readable(null, (set) => {
    set(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      set(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  });

  // Derived store — computed from other stores
  export const doubled = derived(count, ($count) => $count * 2);

  // Custom store — wraps writable with custom methods
  function createTodoStore() {
    const { subscribe, set, update } = writable([]);

    return {
      subscribe,
      addItem: (text) => update(items => [...items, { id: Date.now(), text, done: false }]),
      toggleItem: (id) => update(items => items.map(item =>
        item.id === id ? { ...item, done: !item.done } : item
      )),
      removeItem: (id) => update(items => items.filter(item => item.id !== id)),
      reset: () => set([])
    };
  }

  export const todos = createTodoStore();

  // Store methods
  count.set(10);              // Set value directly
  count.update(n => n + 1);   // Update based on current value
  const unsubscribe = count.subscribe(value => {
    console.log('Count:', value);
  });
  unsubscribe();              // Manual unsubscription
</script>

<!-- Auto-subscribe with $ prefix — automatically unsubscribes on destroy -->
<h1>Count: {$count}</h1>
<h2>Doubled: {$doubled}</h2>
<h3>Current time: {$time}</h3>

<!-- Using custom store -->
<button on:click={() => $count = $count + 1}>Increment</button>
<button on:click={count.set(0)}>Reset</button>
```

### Lifecycle Functions

```svelte
<script>
  import { onMount, onDestroy, beforeUpdate, afterUpdate, tick } from 'svelte';

  let scrollPosition = 0;

  // Runs once when component is mounted
  onMount(() => {
    console.log('Component mounted');
    // Return a cleanup function (same as onDestroy)
    return () => {
      console.log('Cleanup on unmount');
    };
  });

  // Runs before the DOM is updated
  beforeUpdate(() => {
    console.log('About to update DOM');
  });

  // Runs after the DOM has been updated
  afterUpdate(() => {
    console.log('DOM updated');
    scrollPosition = window.scrollY;
  });

  // Runs when component is destroyed
  onDestroy(() => {
    console.log('Component unmounted');
    // Clean up event listeners, intervals, etc.
  });

  // tick() — returns a promise that resolves after pending DOM updates
  async function handleClick() {
    // After this assignment, the DOM hasn't updated yet
    scrollPosition = 0;
    // Wait for all pending state changes to be applied
    await tick();
    // DOM is now updated
    console.log('DOM synced');
  }
</script>

<button on:click={handleClick}>
  Reset Scroll
</button>
```

### Transitions and Animations

```svelte
<script>
  import { fade, fly, slide, scale, blur, crossfade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { sineOut, elasticInOut } from 'svelte/easing';

  let visible = false;
  let items = ['Apple', 'Banana', 'Cherry', 'Date'];

  function removeItem(index) {
    items = items.filter((_, i) => i !== index);
  }
</script>

<button on:click={() => visible = !visible}>
  Toggle
</button>

<!-- Basic fade transition -->
{#if visible}
  <div transition:fade={{ duration: 300 }}>
    Fades in and out
  </div>
{/if}

<!-- Fly transition (slide in from specified direction) -->
{#if visible}
  <div transition:fly={{ y: 20, duration: 400, easing: sineOut }}>
    Flies in from below
  </div>
{/if}

<!-- Slide transition -->
{#if visible}
  <div transition:slide={{ duration: 300 }}>
    Slides open and closed
  </div>
{/if}

<!-- Scale transition -->
{#if visible}
  <div transition:scale={{ start: 0.5, duration: 300 }}>
    Scales from 0.5 to full size
  </div>
{/if}

<!-- Blur transition with custom easing -->
{#if visible}
  <div transition:blur={{ duration: 500, easing: elasticInOut }}>
    Blurs in with elastic easing
  </div>
{/if}

<!-- In/out transitions (different effect on enter vs exit) -->
{#if visible}
  <div in:fly={{ x: -100 }} out:fade>
    Enters from left, exits with fade
  </div>
{/if}

<!-- Flip animation for list reordering -->
<ul>
  {#each items as item, i (item)}
    <li animate:flip={{ duration: 300, easing: sineOut }}>
      {item}
      <button on:click={() => removeItem(i)}>Remove</button>
    </li>
  {/each}
</ul>
```

### Class and Style Directives

```svelte
<script>
  let active = false;
  let error = false;
  let large = true;
  let theme = 'dark';
  let color = 'blue';
</script>

<!-- Class directive: toggle a CSS class -->
<button class:active={active} class:error>
  Toggle
</button>

<!-- Shorthand class directive (class name matches variable name) -->
<button class:active>
  {active ? 'Active' : 'Inactive'}
</button>

<!-- Multiple class directives -->
<div class:active class:error class:large>
  Status indicator
</div>

<!-- Style directive: set inline styles dynamically -->
<div style:color={color}>
  Text color is {color}
</div>

<div style:background-color={theme === 'dark' ? '#333' : '#fff'}
     style:color={theme === 'dark' ? '#fff' : '#333'}>
  Themed content
</div>
```

### Component Communication

```svelte
<!-- Parent.svelte -->
<script>
  import Child from './Child.svelte';

  let message = '';
  function handleCustomEvent(event) {
    message = event.detail;
  }

  // bind:property for two-way binding with component props
  let parentValue = 'Hello from parent';
</script>

<!-- Listening to custom events from child -->
<Child on:greet={handleCustomEvent} />

<!-- Forwarding an event -->
<Child on:click on:keydown />

<!-- Two-way binding with component props -->
<Child bind:value={parentValue} />

<p>Message from child: {message}</p>

<!-- Slot for content projection -->
<Child>
  <span>This is slotted content</span>
</Child>

<!-- Named slots -->
<Child>
  <h1 slot="header">Header Content</h1>
  <p slot="footer">Footer Content</p>
</Child>
```

```svelte
<!-- Child.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let value = '';

  function greet() {
    dispatch('greet', { text: 'Hello from child!' });
  }

  // Forward native DOM events from child to parent
  import { get_current_component } from 'svelte/internal';
</script>

<button on:click={greet}>
  Greet Parent
</button>

<!-- Receiving slotted content -->
<slot></slot>

<!-- Named slots with fallback content -->
<slot name="header">
  <h2>Default Header</h2>
</slot>
<slot name="footer">
  <p>Default Footer</p>
</slot>

<!-- Slot props (scoped slots) -->
<slot name="item" {item} index={i}>
  <span>Default item rendering</span>
</slot>
```

### Scoped CSS and Global Styles

```svelte
<!-- Component styles are scoped by default — styles only affect this component -->

<style>
  /* These styles only apply to elements in this component */
  p {
    color: #333;
    font-size: 1rem;
  }

  button {
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
  }

  button:hover {
    background: #4338ca;
  }

  /* :global() — escape scoping to style elements outside this component */
  :global(body) {
    margin: 0;
    font-family: system-ui, sans-serif;
  }

  :global(.toast) {
    position: fixed;
    top: 1rem;
    right: 1rem;
  }

  /* :global() on a selector — apply a global class within a scoped block */
  .card :global(h2) {
    font-size: 1.25rem;
  }
</style>

<p>This paragraph is affected by the scoped styles above.</p>
<button>Styled Button</button>
```

### SvelteKit File Conventions

```svelte
<!-- src/routes/+page.svelte — Root page route -->
<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
</script>

<h1>Home Page</h1>
<p>Current path: {$page.url.pathname}</p>
<button on:click={() => goto('/about')}>Go to About</button>

<!-- +page.svelte at src/routes/about/+page.svelte — /about route -->
<h1>About Page</h1>

<!-- Dynamic route: src/routes/blog/[slug]/+page.svelte -->
<script>
  import { page } from '$app/stores';
  export let data; // data from +page.server.js or +page.js
</script>

<h1>{data.post.title}</h1>
<p>Slug: {$page.params.slug}</p>
```

```javascript
// src/routes/+layout.svelte — Layout wrapper applied to all child routes
<script>
  import { navigating } from '$app/stores';
</script>

<header>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/blog">Blog</a>
  </nav>
</header>

{#if $navigating}
  <div class="loading-bar">Loading...</div>
{/if}

<main>
  <slot />
</main>

<footer>
  <p>&copy; 2026 My App</p>
</footer>
```

```javascript
// src/routes/blog/[slug]/+page.server.js — Server load function
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, fetch }) {
  const res = await fetch(`/api/posts/${params.slug}`);

  if (!res.ok) {
    throw error(404, 'Post not found');
  }

  return {
    post: await res.json()
  };
}
```

```javascript
// src/routes/api/posts/+server.js — API endpoint (GET handler)
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, fetch }) {
  const limit = Number(url.searchParams.get('limit')) || 10;
  const posts = await fetchPosts(limit);

  return json(posts);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  const body = await request.json();
  const newPost = await createPost(body);

  return json(newPost, { status: 201 });
}
```

### Context API

```svelte
<!-- Parent component: set context -->
<script>
  import { setContext } from 'svelte';

  // Context key (use a unique symbol or string to avoid collisions)
  const THEME_KEY = Symbol('theme');

  setContext(THEME_KEY, {
    color: 'blue',
    background: '#f0f0f0',
    fontSize: '16px'
  });
</script>

<slot />
```

```svelte
<!-- Child component: get context -->
<script>
  import { getContext } from 'svelte';

  const THEME_KEY = Symbol('theme');
  const theme = getContext(THEME_KEY);
</script>

<div style="color: {theme.color}; background: {theme.background}; font-size: {theme.fontSize};">
  <slot />
</div>
```

### Action Functions

```svelte
<script>
  // Custom action — a function that receives a DOM element
  function clickOutside(node, callback) {
    function handleClick(event) {
      if (!node.contains(event.target)) {
        callback();
      }
    }

    document.addEventListener('click', handleClick, true);

    return {
      destroy() {
        document.removeEventListener('click', handleClick, true);
      },
      update(newCallback) {
        callback = newCallback;
      }
    };
  }

  let showDropdown = false;
</script>

<button on:click={() => showDropdown = !showDropdown}>
  Toggle Dropdown
</button>

{#if showDropdown}
  <div use:clickOutside={() => showDropdown = false} class="dropdown">
    <p>This dropdown closes when clicking outside.</p>
  </div>
{/if}
```

### Environment Variables (SvelteKit)

```javascript
// .env — environment variables (prefix with PUBLIC_ for client-side access)
// PUBLIC_API_URL=https://api.example.com
// SECRET_API_KEY=my-secret-key (server-only)

// In +page.server.js or +page.js (server-side load functions)
// Access all variables via:
// import { env } from '$env/dynamic/private';

// In client-side code or .svelte files:
import { env } from '$env/dynamic/public';
console.log(env.PUBLIC_API_URL);

// Static env (available at build time):
import { PUBLIC_API_URL } from '$env/static/public';
import { SECRET_API_KEY } from '$env/static/private';
```
