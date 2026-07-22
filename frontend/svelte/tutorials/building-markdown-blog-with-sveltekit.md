---
title: "Building a Markdown Blog with SvelteKit"
description: "A comprehensive tutorial on building a fully-featured blog with SvelteKit — covering file-based routing, dynamic routes, server load functions, markdown rendering with mdsvex, syntax highlighting, SEO optimization, static site generation, and client-side search."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Markdown Blog with SvelteKit

## Summary

SvelteKit is a full-stack framework for building web applications with Svelte. It provides file-based routing, server-side rendering, static site generation, and a rich set of adapters for deploying anywhere. In this tutorial, you will build a complete markdown-powered blog from scratch using SvelteKit.

The blog will include a post listing page, individual post pages with syntax-highlighted code blocks, SEO meta tags, a search feature, and a fully responsive design. You will learn how to use SvelteKit's load functions for server-side data fetching, dynamic route parameters, layout nesting, and static prerendering to generate a production-ready blog.

## Target Audience

- Frontend developers and full-stack developers who know the basics of Svelte and want to learn SvelteKit by building a real project.
- Intermediate level — comfortable with HTML, CSS, and JavaScript ES6+; some exposure to Svelte components and reactivity is helpful but not required.

## Prerequisites

- Node.js 18 or later and npm installed.
- Basic familiarity with Svelte (components, reactive declarations, props, and event handling).
- A code editor (VS Code recommended with the Svelte extension).
- Willingness to use the terminal for scaffolding and running the project.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a SvelteKit project with TypeScript support.
- Create file-based routes including layouts and dynamic `[slug]` pages.
- Fetch and process data on the server using SvelteKit load functions.
- Parse markdown files with frontmatter metadata using mdsvex and gray-matter.
- Render rich blog posts with syntax-highlighted code blocks.
- Add SEO meta tags dynamically per page using `svelte:head`.
- Implement a client-side search feature that filters posts by title and tags.
- Configure static prerendering for a fully static blog output.

## Context and Motivation

Content-driven websites — blogs, documentation sites, portfolios, and knowledge bases — power a massive portion of the web. Traditional approaches like WordPress require a database and server runtime. Static site generators like Jekyll and Hugo are fast but force you into a different ecosystem.

SvelteKit solves this tension. It gives you the developer experience of a modern component framework with the option to prerender every page as static HTML at build time. You get the best of both worlds: dynamic development with live reload and hot module replacement during development, and a lightning-fast static site in production.

Building a markdown blog is the ideal project to explore SvelteKit's core capabilities. You will touch every major feature — routing, layouts, server data loading, dynamic parameters, static prerendering, and SEO — in a single cohesive application.

## Core Content

### Project Scaffolding

Start by creating a new SvelteKit project using the official CLI. The setup wizard lets you choose TypeScript, ESLint, Prettier, and testing options.

```bash
npm create svelte@latest sveltekit-blog
```

When prompted, make the following selections:

- **Which Svelte app template?**: Skeleton project.
- **Add type checking with TypeScript?**: Yes, using TypeScript syntax.
- **Select additional options**: Add ESLint and Prettier.

Navigate into the project directory and install dependencies:

```bash
cd sveltekit-blog
npm install
```

Install the additional packages you will need for markdown processing:

```bash
npm install mdsvex gray-matter
```

`mdsvex` is a Svelte preprocessor that lets you use markdown directly in Svelte components. `gray-matter` parses YAML frontmatter from markdown files.

### Project Structure Overview

A SvelteKit project follows a convention-based file structure inside the `src/` directory:

```text
src/
├── app.html          # HTML shell shared by all pages
├── app.css           # Global styles
├── lib/              # Shared components and utilities
│   ├── components/   # Reusable UI components
│   └── data/         # Data-fetching utilities
└── routes/           # File-based routing
    ├── +layout.svelte
    ├── +page.svelte
    └── posts/
        ├── [slug]/
        │   └── +page.svelte
        └── +page.svelte
```

Every file name with a `+` prefix is a SvelteKit route file. `+page.svelte` defines a page, `+layout.svelte` defines a layout wrapper, and files like `+page.server.ts` contain server-only logic such as load functions.

### Configuring mdsvex

`mdsvex` needs to be registered as a Svelte preprocessor in the project's configuration file. Update `svelte.config.js` to import and configure mdsvex:

```typescript
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
  extensions: ['.md'],
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],
  preprocess: [vitePreprocess(), mdsvex(mdsvexOptions)],
  kit: {
    adapter: adapter(),
  },
};

export default config;
```

The `extensions` array tells SvelteKit to treat `.md` files as valid components. The mdsvex preprocessor transforms markdown into Svelte components at compile time.

### Creating the Blog Post Data Structure

Create a directory for your markdown posts. By convention, you can place them in a top-level `posts/` directory outside `src/`:

```bash
mkdir -p posts
```

Each blog post is a markdown file with YAML frontmatter. Create a sample post to test with:

````markdown
---
title: "Getting Started with SvelteKit"
date: "2026-06-15"
tags: ["svelte", "sveltekit", "tutorial"]
description: "An introduction to building web applications with SvelteKit — the official framework for Svelte."
author: "Your Name"
---

# Getting Started with SvelteKit

SvelteKit is a framework for building web applications with Svelte. It provides file-based routing, server-side rendering, static site generation, and a rich plugin ecosystem...

## Why SvelteKit?

- **File-based routing** — routes are defined by the file system structure.
- **Server-side rendering** — pages are rendered on the server for fast initial loads.
- **Static site generation** — prerender pages at build time for deployment to CDNs.
- **Form actions** — handle form submissions without client-side JavaScript.

```svelte
<script lang="ts">
  let count = $state(0);
</script>

<button onclick={() => count++}>
  Count is {count}
</button>
```

## Next Steps

Explore the official [SvelteKit documentation](https://kit.svelte.dev/docs) to learn about adapters, hooks, and advanced routing patterns.
````

Create at least three posts with different tags and dates to make the search and tag filtering features meaningful. Store them as `posts/getting-started-with-sveltekit.md`, `posts/svelte-stores-guide.md`, and `posts/sveltekit-vs-other-frameworks.md`.

### Server Load Functions — Fetching Posts

SvelteKit's load functions run on the server (during SSR) or at build time (during prerendering) to fetch data before rendering a page. Create a utility to read and parse all posts:

```typescript
// src/lib/data/posts.ts
import type { Post } from '$lib/types';

// In a real project, these would be read from the filesystem at build time.
// For simplicity, we import the markdown files directly.
const modules = import.meta.glob('/posts/*.md', { eager: true });

export function getAllPosts(): Post[] {
  const posts: Post[] = [];

  for (const [filepath, module] of Object.entries(modules)) {
    const { metadata } = module as { metadata: Record<string, unknown> };
    const slug = filepath.replace('/posts/', '').replace('.md', '');

    posts.push({
      slug,
      title: metadata.title as string,
      date: metadata.date as string,
      tags: metadata.tags as string[],
      description: metadata.description as string,
      author: (metadata.author as string) ?? 'Anonymous',
    });
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
```

Define the `Post` type in a types file:

```typescript
// src/lib/types.ts
export interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
  author: string;
}
```

### Building the Post Listing Page

SvelteKit's `+page.server.ts` (or `+page.ts`) files export a `load` function that returns data to the corresponding `+page.svelte`. Create the blog index page:

```typescript
// src/routes/posts/+page.server.ts
import { getAllPosts } from '$lib/data/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const posts = getAllPosts();
  return { posts };
};
```

```svelte
<!-- src/routes/posts/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { posts } = $derived(data);

  let searchQuery = $state('');
  let activeTag = $state('');

  const allTags = $derived([...new Set(posts.flatMap((p) => p.tags))].sort());

  const filteredPosts = $derived(
    posts.filter((post) => {
      const matchesSearch =
        searchQuery === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesTag = activeTag === '' || post.tags.includes(activeTag);

      return matchesSearch && matchesTag;
    })
  );
</script>

<svelte:head>
  <title>Blog — My SvelteKit Blog</title>
  <meta name="description" content="A collection of articles about Svelte, SvelteKit, and modern web development." />
</svelte:head>

<h1>Blog</h1>

<div class="controls">
  <input
    type="search"
    bind:value={searchQuery}
    placeholder="Search posts..."
    aria-label="Search blog posts"
  />

  <div class="tags">
    <button
      class:active={activeTag === ''}
      onclick={() => (activeTag = '')}
    >
      All
    </button>
    {#each allTags as tag}
      <button
        class:active={activeTag === tag}
        onclick={() => (activeTag = tag)}
      >
        {tag}
      </button>
    {/each}
  </div>
</div>

<div class="posts-grid">
  {#if filteredPosts.length === 0}
    <p class="no-results">No posts found. Try adjusting your search or filters.</p>
  {:else}
    {#each filteredPosts as post}
      <article class="post-card">
        <a href="/posts/{post.slug}">
          <h2>{post.title}</h2>
          <time datetime={post.date}>
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
          <p>{post.description}</p>
          <div class="post-tags">
            {#each post.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        </a>
      </article>
    {/each}
  {/if}
</div>

<style>
  .controls {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  input[type='search'] {
    padding: 0.75rem 1rem;
    border: 1px solid #ccc;
    border-radius: 0.5rem;
    font-size: 1rem;
    max-width: 24rem;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tags button {
    padding: 0.35rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .tags button.active {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
  }

  .posts-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .post-card {
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    transition: box-shadow 0.2s;
  }

  .post-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .post-card a {
    text-decoration: none;
    color: inherit;
  }

  .post-card h2 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
  }

  .post-card time {
    display: block;
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
  }

  .post-card p {
    margin: 0 0 1rem;
    color: #374151;
    line-height: 1.5;
  }

  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .tag {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: #f3f4f6;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #4b5563;
  }

  .no-results {
    grid-column: 1 / -1;
    text-align: center;
    color: #6b7280;
    padding: 3rem 0;
  }
</style>
```

This page provides a responsive grid of post cards, a search input that filters by title and tags in real time, and tag-based filter buttons.

### Dynamic Route — Single Post Page

Dynamic routes in SvelteKit use the `[slug]` directory naming convention. Create a page that renders a single post:

```typescript
// src/routes/posts/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const slug = params.slug;

  try {
    // Dynamically import the markdown file for this post
    const post = await import(`/posts/${slug}.md`);

    return {
      content: post.default,
      metadata: post.metadata,
      slug,
    };
  } catch {
    throw error(404, `Post "${slug}" not found`);
  }
};
```

```svelte
<!-- src/routes/posts/[slug]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { content, metadata, slug } = $derived(data);
</script>

<svelte:head>
  <title>{metadata.title} — My SvelteKit Blog</title>
  <meta name="description" content={metadata.description} />
  <meta property="og:title" content={metadata.title} />
  <meta property="og:description" content={metadata.description} />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary" />
</svelte:head>

<article class="post">
  <header>
    <h1>{metadata.title}</h1>
    <div class="meta">
      <time datetime={metadata.date}>
        {new Date(metadata.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </time>
      <span class="author">By {metadata.author}</span>
    </div>
    <div class="tags">
      {#each metadata.tags as tag}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  </header>

  <div class="content">
    <svelte:component this={content} />
  </div>
</article>

<nav class="back-nav">
  <a href="/posts">&larr; Back to all posts</a>
</nav>

<style>
  .post {
    max-width: 48rem;
    margin: 0 auto;
  }

  header {
    margin-bottom: 3rem;
  }

  header h1 {
    margin: 0 0 1rem;
    font-size: 2rem;
    line-height: 1.3;
  }

  .meta {
    display: flex;
    gap: 1rem;
    align-items: center;
    color: #6b7280;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .author {
    font-weight: 500;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .tag {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: #f3f4f6;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #4b5563;
  }

  .content {
    line-height: 1.8;
    font-size: 1.1rem;
  }

  .content :global(h2) {
    margin-top: 2.5rem;
    margin-bottom: 1rem;
  }

  .content :global(p) {
    margin-bottom: 1.25rem;
  }

  .content :global(pre) {
    background: #1f2937;
    color: #f3f4f6;
    padding: 1.25rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1.5rem 0;
  }

  .content :global(code) {
    font-size: 0.875rem;
  }

  .content :global(img) {
    max-width: 100%;
    border-radius: 0.5rem;
    margin: 1.5rem 0;
  }

  .back-nav {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .back-nav a {
    color: #4f46e5;
    text-decoration: none;
    font-weight: 500;
  }

  .back-nav a:hover {
    text-decoration: underline;
  }
</style>
```

The `svelte:head` element injects page-specific meta tags for SEO and social sharing. The `svelte:component` directive renders the imported markdown content as a Svelte component.

### Configuring the Homepage Layout

Create a root layout that wraps all pages with consistent navigation:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  let { children }: { children: import('svelte').Snippet } = $props();
</script>

<nav class="site-nav">
  <a href="/" class="logo">My Blog</a>
  <div class="nav-links">
    <a href="/">Home</a>
    <a href="/posts">Blog</a>
  </div>
</nav>

<main>
  {@render children()}
</main>

<footer>
  <p>&copy; 2026 My SvelteKit Blog. Built with SvelteKit.</p>
</footer>

<style>
  .site-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    max-width: 64rem;
    margin: 0 auto;
  }

  .logo {
    font-weight: 700;
    font-size: 1.25rem;
    text-decoration: none;
    color: inherit;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
  }

  .nav-links a {
    text-decoration: none;
    color: #4b5563;
    font-weight: 500;
  }

  .nav-links a:hover {
    color: #4f46e5;
  }

  main {
    max-width: 64rem;
    margin: 2rem auto;
    padding: 0 2rem;
    min-height: 70vh;
  }

  footer {
    text-align: center;
    padding: 2rem;
    color: #9ca3af;
    font-size: 0.875rem;
  }
</style>
```

Update the homepage to show a welcome message and link to the blog:

```svelte
<!-- src/routes/+page.svelte -->
<svelte:head>
  <title>Home — My SvelteKit Blog</title>
</svelte:head>

<section class="hero">
  <h1>Welcome to My Blog</h1>
  <p>Thoughts and tutorials about Svelte, SvelteKit, and modern web development.</p>
  <a href="/posts" class="cta">Read the Blog</a>
</section>

<style>
  .hero {
    text-align: center;
    padding: 4rem 0;
  }

  .hero h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  .hero p {
    font-size: 1.2rem;
    color: #6b7280;
    margin-bottom: 2rem;
  }

  .cta {
    display: inline-block;
    padding: 0.75rem 2rem;
    background: #4f46e5;
    color: white;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 600;
    transition: background 0.2s;
  }

  .cta:hover {
    background: #4338ca;
  }
</style>
```

### Static Site Generation with Prerendering

SvelteKit can prerender every page into static HTML at build time. This produces a fully static site that can be deployed to any CDN or static hosting provider.

Enable prerendering for the entire blog section by adding an `+page.ts` file that declares the `prerender` option:

```typescript
// src/routes/posts/+page.ts
export const prerender = true;
```

For the dynamic `[slug]` routes, SvelteKit needs to know all possible parameter values at build time. Use the `entries` function in the load file:

```typescript
// src/routes/posts/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';

export const entries: EntryGenerator = async () => {
  const modules = import.meta.glob('/posts/*.md', { eager: true });

  return Object.keys(modules).map((filepath) => ({
    slug: filepath.replace('/posts/', '').replace('.md', ''),
  }));
};

export const load: PageServerLoad = async ({ params }) => {
  const slug = params.slug;

  try {
    const post = await import(`/posts/${slug}.md`);

    return {
      content: post.default,
      metadata: post.metadata,
      slug,
    };
  } catch {
    throw error(404, `Post "${slug}" not found`);
  }
};
```

Now build the site to generate all static pages:

```bash
npm run build
```

The output in the `build/` directory contains a fully static version of every blog page, including all individual post pages.

### Adding Global Styles

Create a base CSS file that sets typography, colors, and resets:

```css
/* src/app.css */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    Oxygen, Ubuntu, sans-serif;
  color: #111827;
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1.2;
}

a {
  color: #4f46e5;
}

img {
  max-width: 100%;
  height: auto;
}
```

Import this global stylesheet in the root layout to apply it across all pages:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  // ...rest of script
</script>
```

## Code Examples

The complete project code is structured across the files listed above. Here is a quick reference for the key files you created:

```text
sveltekit-blog/
├── posts/
│   ├── getting-started-with-sveltekit.md
│   ├── svelte-stores-guide.md
│   └── sveltekit-vs-other-frameworks.md
├── src/
│   ├── app.css
│   ├── app.html
│   ├── lib/
│   │   ├── data/
│   │   │   └── posts.ts
│   │   └── types.ts
│   └── routes/
│       ├── +layout.svelte
│       ├── +page.svelte
│       └── posts/
│           ├── +page.svelte
│           ├── +page.server.ts
│           ├── +page.ts
│           └── [slug]/
│               ├── +page.svelte
│               └── +page.server.ts
├── svelte.config.js
├── package.json
├── tsconfig.json
└── vite.config.ts
```

To run the development server:

```bash
npm run dev -- --open
```

To build for production with full prerendering:

```bash
npm run build
npm run preview
```

The `preview` command serves the built static files locally so you can verify everything works before deploying.

## Key Insights

- **Prerender by default for content sites**: For blogs, documentation, and marketing pages, prerendering eliminates server costs and delivers the fastest possible user experience. SvelteKit makes this as easy as exporting `export const prerender = true;`.
- **Load functions encapsulate data logic**: Keeping data fetching in `+page.server.ts` files separates concerns and makes components easier to test. The data flows in one direction — server to component — which simplifies reasoning about your application.
- **Dynamic imports for scalability**: Using `import.meta.glob` to discover and import markdown files means you never have to manually register new posts. Adding a file to the `posts/` directory automatically makes it available on the blog.
- **SEO with svelte:head**: Injecting per-page meta tags directly in the component template keeps SEO metadata co-located with the content it describes. This is far more maintainable than a global SEO configuration file.
- **Client-side search is fast enough**: For blogs with dozens or hundreds of posts, filtering on the client side via `$derived` reactive state provides instant feedback without server round trips. For thousands of posts, consider indexing with a library like Lunr or Minisearch.
- **Styling collocated components**: Svelte's scoped styles mean you can write component-specific CSS without naming collisions. The `:global()` modifier lets you selectively style content rendered from markdown (like code blocks and images) without affecting the rest of the page.
- **EntryGenerator enables full static output**: Without the `entries` export, SvelteKit cannot know which `[slug]` values exist at build time, and it will fall back to server-side rendering for dynamic routes. Providing entries is essential for a fully static blog.

## Next Steps

- Deploy your blog to Vercel, Netlify, or Cloudflare Pages using the appropriate SvelteKit adapter (`@sveltejs/adapter-vercel`, `@sveltejs/adapter-netlify`, or `@sveltejs/adapter-cloudflare`).
- Add a CMS integration with Sanity, Contentful, or Strapi for non-technical editors.
- Implement RSS and Atom feeds using `sveltekit-rss`.
- Explore the official [SvelteKit documentation](https://kit.svelte.dev/docs) for advanced topics like form actions, web sockets, and authentication.
- Review the [Svelte Best Practices Guide](/frontend/svelte/guides/svelte-best-practices-guide) and the [Svelte Syllabus](/frontend/svelte/syllabi/svelte-syllabus) for a structured learning path.

## Conclusion

In this tutorial, you built a fully functional markdown blog with SvelteKit. You scaffolded a SvelteKit project, configured mdsvex for markdown support, created a post listing page with search and tag filtering, implemented dynamic routes for individual posts, added SEO meta tags, and configured static prerendering for production deployment.

The skills you learned — file-based routing, load functions, dynamic parameters, prerendering, and reactive client-side filtering — are directly transferable to any SvelteKit project. Whether you are building a documentation site, a portfolio, or a full-featured application, the same patterns apply.
