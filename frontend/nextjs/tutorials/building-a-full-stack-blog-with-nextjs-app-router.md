---
title: "Building a Full-Stack Blog with Next.js App Router"
description: "A hands-on tutorial covering Next.js App Router, React Server Components, Server Actions, data fetching patterns, and deployment."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Full-Stack Blog with Next.js App Router

## Summary

In this tutorial, you will build a production-ready blog application using the Next.js App Router. You will learn how to leverage React Server Components for rendering, Server Actions for form handling, dynamic routing for individual posts, and how to deploy your application to Vercel. By the end, you will have a fully functional blog with content management capabilities.

## Target Audience

- Frontend and full-stack developers who are comfortable with React.
- Developers looking to transition from the Pages Router to the App Router.
- Expected developer level: Intermediate.

## Prerequisites

- Basic knowledge of React (components, hooks, props).
- Node.js 18+ installed on your machine.
- A code editor (VS Code recommended).
- A free Vercel account for deployment (optional but recommended).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a Next.js project with the App Router.
- Build layouts with the nested routing system.
- Create static and dynamic routes using file-based conventions.
- Fetch and display data using React Server Components.
- Handle form submissions and mutations with Server Actions.
- Implement loading states, error boundaries, and not-found pages.
- Deploy a Next.js application to Vercel.

## Context and Motivation

Next.js has evolved significantly since the introduction of the App Router in version 13.4. The App Router represents a paradigm shift from client-side page-based routing to a server-first architecture that leverages React Server Components (RSC). This approach dramatically reduces client-side JavaScript, improves initial page load performance, and simplifies data fetching by running database queries directly in your components.

For developers building content-driven applications like blogs, the App Router provides an ideal blend of static site generation (SSG) for fast content delivery and server-side rendering (SSR) for dynamic features. Understanding how to use the App Router effectively is essential for modern Next.js development.

## Core Content

### Setting Up the Project

Start by creating a new Next.js project with the App Router enabled:

```bash
npx create-next-app@latest nextjs-blog --typescript --tailwind --eslint --app --src-dir
cd nextjs-blog
```

The `--app` flag enables the App Router and generates the `src/app/` directory structure.

### Understanding the App Router File Conventions

The App Router uses a file-system based routing paradigm inside `src/app/`:

| File | Convention | Purpose |
| :--- | :--- | :--- |
| `page.tsx` | Route segment UI | Defines the main UI for a route |
| `layout.tsx` | Shared layout | Wraps child pages and persists across navigations |
| `loading.tsx` | Loading UI | Shows a fallback while the page loads |
| `error.tsx` | Error boundary | Catches errors in the segment and its children |
| `not-found.tsx` | 404 UI | Displays when a route or resource is not found |

### Creating the Root Layout

Open `src/app/layout.tsx` to see the root layout. This layout wraps every page in the application:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Next.js Blog",
  description: "A full-stack blog built with Next.js App Router",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### Building the Home Page

Replace the default home page in `src/app/page.tsx` with a blog landing page. We will use a React Server Component to fetch blog posts directly from the filesystem:

```typescript
import Link from "next/link";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
}

const posts: BlogPost[] = [
  {
    slug: "getting-started-with-nextjs",
    title: "Getting Started with Next.js",
    excerpt: "Learn how to build modern web applications with the React framework for production.",
    date: "2026-06-01",
  },
  {
    slug: "server-components-explained",
    title: "React Server Components Explained",
    excerpt: "Understand how Server Components improve performance and simplify data fetching.",
    date: "2026-06-05",
  },
  {
    slug: "mastering-server-actions",
    title: "Mastering Server Actions",
    excerpt: "A deep dive into mutations and form handling in the App Router.",
    date: "2026-06-10",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-4xl font-bold">My Blog</h1>
      <p className="mb-8 text-lg text-gray-600">
        Thoughts on Next.js, React, and modern web development.
      </p>
      <div className="space-y-6">
        {posts.map((post) => (
          <article key={post.slug} className="border-b pb-6">
            <Link href={`/posts/${post.slug}`} className="group">
              <h2 className="text-xl font-semibold group-hover:text-blue-600">
                {post.title}
              </h2>
            </Link>
            <p className="mt-1 text-gray-600">{post.excerpt}</p>
            <time className="mt-2 block text-sm text-gray-400">{post.date}</time>
          </article>
        ))}
      </div>
    </main>
  );
}
```

### Creating Dynamic Routes for Individual Posts

Create a dynamic route segment by adding a folder with square brackets:

```bash
mkdir -p src/app/posts/[slug]
```

Create `src/app/posts/[slug]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";

interface BlogPost {
  slug: string;
  title: string;
  content: string;
  date: string;
}

const posts: Record<string, BlogPost> = {
  "getting-started-with-nextjs": {
    slug: "getting-started-with-nextjs",
    title: "Getting Started with Next.js",
    content: `Next.js is a React framework that enables server-side rendering, static site generation, and full-stack development. It provides file-system based routing, built-in performance optimizations, and a rich ecosystem of plugins.

In this post, we explore the core features of Next.js and how to get started building modern web applications.`,
    date: "2026-06-01",
  },
  "server-components-explained": {
    slug: "server-components-explained",
    title: "React Server Components Explained",
    content: `React Server Components allow you to render components on the server, sending only the resulting HTML to the client. This reduces bundle size and improves performance by keeping heavy dependencies on the server.

Server Components can access the filesystem, databases, and other server-side resources directly.`,
    date: "2026-06-05",
  },
  "mastering-server-actions": {
    slug: "mastering-server-actions",
    title: "Mastering Server Actions",
    content: `Server Actions are functions that run on the server but can be called from the client. They simplify form handling and data mutations by eliminating the need for separate API routes.

To use a Server Action, define an async function with the 'use server' directive.`,
    date: "2026-06-10",
  },
};

interface Props {
  params: { slug: string };
}

export default function PostPage({ params }: Props) {
  const post = posts[params.slug];

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-8 block text-blue-600 hover:underline">
        &larr; Back to Home
      </Link>
      <article>
        <h1 className="mb-2 text-3xl font-bold">{post.title}</h1>
        <time className="mb-8 block text-sm text-gray-400">{post.date}</time>
        <div className="prose max-w-none leading-relaxed text-gray-700">
          {post.content.split("\n\n").map((paragraph, i) => (
            <p key={i} className="mb-4">{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
```

### Implementing a Loading State

Create `src/app/posts/[slug]/loading.tsx` to show a skeleton while the page loads:

```typescript
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 h-4 w-24 animate-pulse bg-gray-200" />
      <div className="mb-2 h-8 w-3/4 animate-pulse bg-gray-200" />
      <div className="mb-8 h-4 w-32 animate-pulse bg-gray-200" />
      <div className="space-y-4">
        <div className="h-4 w-full animate-pulse bg-gray-200" />
        <div className="h-4 w-5/6 animate-pulse bg-gray-200" />
        <div className="h-4 w-4/5 animate-pulse bg-gray-200" />
      </div>
    </main>
  );
}
```

### Adding a Custom 404 Page

Create `src/app/not-found.tsx`:

```typescript
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="mb-4 text-6xl font-bold text-gray-300">404</h1>
      <p className="mb-6 text-lg text-gray-600">
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        Go back home
      </Link>
    </main>
  );
}
```

### Adding Server Actions for a Newsletter Signup

Server Actions are ideal for handling form submissions without building a separate API route. Create a new component in `src/app/newsletter-form.tsx`:

```typescript
"use client";

import { useActionState } from "react";
import { submitNewsletter } from "./actions";

export default function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(submitNewsletter, {
    message: "",
    success: false,
  });

  return (
    <form action={formAction} className="rounded-lg border p-6">
      <h2 className="mb-2 text-xl font-semibold">Subscribe to our newsletter</h2>
      <p className="mb-4 text-sm text-gray-600">
        Get the latest posts delivered to your inbox.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Subscribing..." : "Subscribe"}
        </button>
      </div>
      {state.message && (
        <p className={`mt-2 text-sm ${state.success ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

Create the Server Action in `src/app/actions.ts`:

```typescript
"use server";

import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

interface FormState {
  message: string;
  success: boolean;
}

export async function submitNewsletter(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email") as string;

  const result = emailSchema.safeParse({ email });

  if (!result.success) {
    return {
      message: result.error.errors[0].message,
      success: false,
    };
  }

  try {
    // In a real application, you would save the email to a database
    console.log(`Subscribing email: ${email}`);

    return {
      message: "Thank you for subscribing!",
      success: true,
    };
  } catch (error) {
    return {
      message: "Something went wrong. Please try again later.",
      success: false,
    };
  }
}
```

Now import and render the newsletter form on the home page by adding it at the bottom of the landing section.

### Using Route Groups for Authentication Layouts

Route groups allow you to organize routes without affecting the URL path. Create `src/app/(auth)/` to group authentication-related pages:

```bash
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/register
```

Create `src/app/(auth)/login/page.tsx`:

```typescript
export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-24">
      <h1 className="mb-6 text-2xl font-bold">Login</h1>
      <form className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </main>
  );
}
```

### Deploying to Vercel

Deploy your blog to Vercel, the platform built by the creators of Next.js:

```bash
npm run build
```

Then connect your Git repository to Vercel, or use the Vercel CLI:

```bash
npx vercel --prod
```

## Code Examples

Here is a complete directory structure of the final project:

```text
nextjs-blog/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── posts/
│   │   │   └── [slug]/
│   │   │       ├── loading.tsx
│   │   │       └── page.tsx
│   │   ├── actions.ts
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── newsletter-form.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx
│   └── ...
├── public/
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

The `src/app/layout.tsx` root layout:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Next.js Blog",
  description: "A full-stack blog built with Next.js App Router",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

## Key Insights

- **Server Components are the default**: In the App Router, every component in the `app/` directory is a React Server Component by default. You only add `'use client'` when you need interactivity (event handlers, hooks, browser APIs). This reduces client-side JavaScript by keeping rendering on the server.
- **File-based conventions simplify state management**: Instead of managing loading states and error boundaries manually, create `loading.tsx` and `error.tsx` files in your route segments. Next.js automatically wires them into React Suspense and Error Boundaries.
- **Server Actions eliminate boilerplate**: Form submissions no longer require separate API routes. Define `'use server'` functions that run on the server and are callable directly from client components via form actions.
- **Route groups keep URLs clean**: Use `(groupName)` folder syntax to organize code without changing the URL structure. This is especially useful for authentication, dashboards, and admin sections.
- **Dynamic segments with error handling**: Always handle the case where a dynamic parameter does not match any data. Use the `notFound()` function from `next/navigation` to trigger the closest `not-found.tsx` boundary rather than rendering a broken page.

## Next Steps

- Explore Next.js Middleware for authentication and redirects.
- Learn about Incremental Static Regeneration (ISR) for content that changes over time.
- Integrate a headless CMS like Sanity or Contentful for managing blog posts.
- Add a search feature using the `searchParams` prop in page components.

## Conclusion

You have built a fully functional blog using the Next.js App Router. You created dynamic routes with the `[slug]` pattern, implemented loading states with `loading.tsx`, handled 404s with `not-found.tsx`, used Server Actions for form handling, and organized routes using route groups. This architecture provides a solid foundation for building content-driven applications that are fast, scalable, and maintainable.
