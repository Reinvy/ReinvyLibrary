---
title: "SvelteKit Routing and Data Loading Cheatsheet"
description: "A quick reference guide for SvelteKit file-based routing conventions, load functions, form actions, hooks, page options, and adapter configuration."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# SvelteKit Routing and Data Loading Cheatsheet

## Quick Reference Table

| Action | Code / Convention | Description |
|--------|-------------------|-------------|
| Page route | `src/routes/+page.svelte` | Root and nested page components |
| Layout route | `src/routes/+layout.svelte` | Shared layout wrapping nested pages |
| Dynamic param | `src/routes/blog/[slug]/+page.svelte` | Route segment as `params.slug` |
| API endpoint | `src/routes/api/posts/+server.js` | GET/POST/PUT/DELETE request handler |
| Server load | `export const load = async (event) => {...}` in `+page.server.js` | Runs on server for initial page data |
| Universal load | `export const load = async (event) => {...}` in `+page.js` | Runs on server and client |
| Form action | `export const actions = { default: async (event) => {...} }` in `+page.server.js` | Handle form POST with progressive enhancement |
| Handle hook | `export const handle = async ({ event, resolve }) => {...}` in `hooks.server.js` | Intercept all incoming requests |
| Page option | `export const ssr = false` / `export const prerender = true` | Configure rendering strategy per route |
| Param matcher | `export function match(param) { return /^\d+$/.test(param); }` | Validate dynamic route parameters |

## Common Commands

### File-Based Routing Conventions

```text
src/routes/
  +page.svelte             -- root page (/)
  +layout.svelte           -- root layout wraps all pages
  +error.svelte            -- root error boundary
  about/
    +page.svelte           -- /about
  blog/
    [slug]/
      +page.svelte         -- /blog/hello-world (params.slug = 'hello-world')
    [category]/
      [article]/
        +page.svelte       -- /blog/tech/deep-dive (params: {category, article})
  (auth)/
    login/
      +page.svelte         -- /login (route group, no segment in URL)
    register/
      +page.svelte         -- /register (shared auth layout)
  api/
    posts/
      +server.js           -- /api/posts (handles GET, POST, PUT, DELETE)
    posts/
      [id]/
        +server.js         -- /api/posts/123
```

### Route Groups, Optional Params, and Rest Params

```text
# Route group -- organizes files without affecting URL path
(src/routes/(marketing)/)  ->  /pricing  (no /marketing/ prefix)

# Optional parameter -- use [[optional]] for params that may be absent
src/routes/[[lang]]/+page.svelte     -- matches /en, /fr, or /

# Rest parameter -- [...slug] captures one or more segments
src/routes/[...path]/+page.svelte    -- matches /a, /a/b, /a/b/c
```

```javascript
// src/params/integer.js -- validates that a param is an integer
/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
  return /^\d+$/.test(param);
}
```

### Server Load Functions (+page.server.js / +layout.server.js)

```javascript
// +page.server.js -- runs on server only; has access to cookies, headers, platform
export const load = async ({ params, url, locals, cookies, request, fetch, depends, parent, route }) => {
  // params: route parameters (e.g., { slug: 'hello-world' })
  // url: current request URL (URL object)
  // locals: custom data from hooks.handle (e.g., authenticated user)
  // cookies: Cookie API (get, set, delete)
  // fetch: authenticated fetch (respects cookie forwarding)
  // depends: declare dependencies for invalidation
  // parent: loads the parent layout's data
  // route: { id: 'blog/[slug]' }

  const post = await db.post.findUnique({ where: { slug: params.slug } });
  if (!post) throw error(404, 'Post not found');

  const parentData = await parent();

  return { post, parentData };
};
```

### Universal Load Functions (+page.js / +layout.js)

```javascript
// +page.js -- runs on server during SSR, then on client during navigation
// Limited access: url, params, fetch, parent, depends, route, data (from server load)
export const load = async ({ params, fetch, data, depends, parent, url }) => {
  // data: the result of the server load function (from +page.server.js)
  // fetch: standard fetch (not authenticated unless explicitly forwarded)

  const comments = await fetch(`/api/posts/${params.slug}/comments`).then(r => r.json());

  return { ...data, comments };
};
```

### Dependent Invalidation

```javascript
// +page.js or +page.server.js
export const load = async ({ depends, fetch }) => {
  depends('posts:list');     // declare dependency key
  const posts = await fetch('/api/posts').then(r => r.json());
  return { posts };
};
```

```javascript
// Invalidate from any component or action
import { invalidate, invalidateAll } from '$app/navigation';

// Invalidate a specific key
await invalidate('posts:list');

// Invalidate all data
await invalidateAll();
```

### Form Actions

```javascript
// +page.server.js -- form actions handle POST requests
export const actions = {
  // Named action -- accessed via ?/create in the form action attribute
  create: async ({ request, locals, cookies, url, params, fetch }) => {
    const data = await request.formData();
    const title = data.get('title');
    const content = data.get('content');

    // Return validation errors -- available as $page.form in the page
    const errors = {};
    if (!title) errors.title = 'Title is required';
    if (title && title.length < 3) errors.title = 'Title must be at least 3 characters';
    if (Object.keys(errors).length) return { errors, title, content };

    const post = await db.post.create({ data: { title, content, authorId: locals.user.id } });

    // Successful action -- use redirect for POST-redirect-GET pattern
    throw redirect(303, `/posts/${post.id}`);
  },

  // Default action (when no ?/actionName is specified)
  default: async ({ request }) => {
    const data = await request.formData();
    // ... handle default submission
  }
};
```

```svelte
<!-- +page.svelte -- form with progressive enhancement -->
<script>
  import { enhance } from '$app/forms';
  export let form;
</script>

<form method="POST" action="?/create" use:enhance>
  <input name="title" placeholder="Post title" />
  {#if form?.errors?.title}
    <p class="error">{form.errors.title}</p>
  {/if}
  <textarea name="content" placeholder="Content"></textarea>
  <button type="submit">Create Post</button>
</form>
```

### Server Hooks

```javascript
// src/hooks.server.js -- handle hook for request interception
export const handle = async ({ event, resolve }) => {
  // event.locals -- populate with authenticated user, DB client, etc.
  const session = await getSession(event.cookies.get('session'));
  event.locals.user = session?.user ?? null;

  // resolve(event) -- render the response
  const response = await resolve(event);

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
};

// Error hook -- catch server errors for monitoring
export const handleError = async ({ error, event }) => {
  console.error('Server error:', error, 'at', event.url.pathname);
  return { message: 'An unexpected error occurred.' };
};

// Fetch hook -- intercept fetch during load functions
export const handleFetch = async ({ event, request, fetch }) => {
  // Forward auth tokens to internal API requests
  if (request.url.startsWith('https://api.internal.com')) {
    request.headers.set('Authorization', `Bearer ${event.locals.user.token}`);
  }
  return fetch(request);
};
```

```javascript
// src/hooks.client.js -- client-side hooks
export const handleError = async ({ error, event }) => {
  console.error('Client error:', error);
  return { message: 'A client-side error occurred.' };
};
```

### Page Options

```javascript
// +page.js, +layout.js, +page.server.js, or +layout.server.js
export const ssr = true;             // enable server-side rendering (default: true)
export const csr = true;             // enable client-side rendering (default: true)
export const prerender = 'auto';     // prerender at build time ('auto', true, false)
export const trailingSlash = 'never';// trailing slash handling ('never', 'always', 'ignore')
export const entries = [];           // prerender entries for dynamic routes
```

### Adapter Configuration

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true,
      envPrefix: '',
    })
  }
};
```

```text
Adapter selection guide:

@sveltejs/adapter-node     -- Node.js server (SSR, API routes)
@ sveltejs/adapter-static  -- static site generation (no server)
@ sveltejs/adapter-vercel  -- Vercel serverless functions
@ sveltejs/adapter-cloudflare -- Cloudflare Workers/Pages
@ sveltejs/adapter-netlify -- Netlify Edge Functions
```

## Code Snippets

### Complete Page with Data Loading and Error Handling

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
  export let data;

  $: ({ post, comments } = data);
</script>

<svelte:head>
  <title>{post.title} - My Blog</title>
  <meta name="description" content={post.excerpt} />
</svelte:head>

<article>
  <h1>{post.title}</h1>
  <div class="meta">
    <time datetime={post.date}>{post.formattedDate}</time>
    {#each post.tags as tag}
      <span class="tag">{tag}</span>
    {/each}
  </div>
  <div class="content">
    {@html post.html}
  </div>
</article>

<section class="comments">
  <h2>Comments ({comments.length})</h2>
  {#each comments as comment}
    <div class="comment">
      <strong>{comment.author}</strong>
      <p>{comment.text}</p>
    </div>
  {/each}
</section>
```

```svelte
<!-- src/routes/blog/[slug]/+error.svelte -->
<script>
  import { page } from '$app/stores';
  export let error;
</script>

<h1>{error.message}</h1>
<p>Status code: {$page.status}</p>
<p>Route: /blog/{$page.params.slug}</p>

<a href="/blog">Back to blog</a>
```

### Shared Layout with Authentication

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { page } from '$app/stores';
  import { navigating } from '$app/stores';
  export let data;
  export let children;
</script>

<nav>
  <a href="/">Home</a>
  <a href="/blog">Blog</a>
  {#if data.user}
    <span>Welcome, {data.user.name}</span>
    <a href="/logout">Logout</a>
  {:else}
    <a href="/login">Login</a>
  {/if}
</nav>

{#if $navigating}
  <div class="loading-bar" />
{/if}

<main>
  {@render children()}
</main>
```

```javascript
// src/routes/+layout.server.js
export const load = async ({ locals }) => {
  return {
    user: locals.user ?? null
  };
};
```
