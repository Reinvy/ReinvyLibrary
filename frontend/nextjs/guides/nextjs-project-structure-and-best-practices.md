---
title: "Next.js Project Structure and Best Practices"
description: "A comprehensive guide to organizing Next.js applications with the App Router, covering folder structure conventions, component patterns, data fetching strategies, and performance optimization."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Next.js Project Structure and Best Practices

## Introduction

Next.js has evolved significantly since the introduction of the App Router in version 13. The new paradigm shifts from page-based routing to a file-system-based routing model built on React Server Components. This guide provides a structured approach to organizing Next.js projects, covering folder conventions, server versus client boundaries, data fetching patterns, and performance optimization techniques. Following these best practices ensures maintainable, scalable, and performant applications that leverage the full power of the App Router.

## Best Practices

### 1. Organize by Feature, Not by Type

Group related files by feature domain rather than by technical role. A features-based structure keeps related components, hooks, and utilities colocated and makes it easier to reason about application boundaries.

```text
src/
  app/              # App Router pages and layouts
  features/
    auth/           # Authentication feature
      components/   # Auth-specific UI
      hooks/        # Auth-specific hooks
      utils/        # Auth utilities
      api/          # Auth API routes
    dashboard/      # Dashboard feature
      components/
      hooks/
      utils/
  lib/              # Shared utilities and configuration
  ui/               # Shared design system components
```

### 2. Leverage Server Components by Default

Next.js App Router defaults to React Server Components (RSC). Keep components on the server whenever possible — they reduce client-side JavaScript, improve initial page load, and can directly access databases and file systems. Only add `"use client"` when you need interactivity: event handlers, browser-only APIs, state, or effects.

**When to use `"use client"`:**
- Forms with `useState` or form actions requiring client feedback
- Interactive UI (modals, dropdowns, tabs with animation)
- Components using `useEffect`, `useContext`, or browser APIs
- Third-party component libraries that require the client

### 3. Centralize Data Fetching in Server Components

Fetch data directly in Server Components rather than using `useEffect` on the client. This eliminates client-server waterfalls, allows automatic request deduplication, and enables streaming with Suspense boundaries.

```typescript
// app/dashboard/page.tsx — Server Component
import { Suspense } from "react";
import { DashboardContent } from "./dashboard-content";
import { DashboardSkeleton } from "./dashboard-skeleton";

export default async function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
```

### 4. Use Route Groups for Logical Organization

Route Groups (`(groupName)`) organize routes without affecting the URL path. Use them to separate application sections, apply different layouts, or isolate authentication flows.

```text
app/
  (marketing)/
    page.tsx          → /
    about/page.tsx    → /about
  (dashboard)/
    layout.tsx        → Dashboard layout (authenticated)
    dashboard/
      page.tsx        → /dashboard
  (auth)/
    layout.tsx        → Auth layout (centered card)
    login/page.tsx    → /login
    register/page.tsx → /register
```

### 5. Keep Shared Code in a Dedicated `lib` Directory

Place shared utilities, database clients, API helpers, configuration constants, and type definitions in a top-level `lib/` directory. This creates a clear boundary between application logic and reusable infrastructure.

```text
lib/
  db.ts               # Database client (Prisma, Drizzle)
  session.ts          # Session management
  api-client.ts       # External API client
  constants.ts        # App-wide constants
  utils.ts            # Pure utility functions
  types.ts            # Shared TypeScript types
```

### 6. Prefer `fetch` with Next.js Caching over Raw Database Calls

Next.js extends the native `fetch` function with caching and revalidation semantics. Use `fetch` for API calls and `cache()` (from React) for database queries to enable fine-grained cache control with `revalidateTag` and `revalidatePath`.

```typescript
import { cache } from "react";
import { db } from "@/lib/db";

export const getPosts = cache(async () => {
  return db.post.findMany({ where: { published: true } });
});
```

### 7. Structure API Routes with the Route Handler Pattern

Use the App Router's route handler convention (`route.ts`) for API endpoints. Export named functions (`GET`, `POST`, `PUT`, `DELETE`) rather than a single handler function, keeping each method focused and testable.

```typescript
// app/api/posts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";

export async function GET() {
  const posts = await getPosts();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const post = await createPost(body);
  return NextResponse.json(post, { status: 201 });
}
```

### 8. Use Environment Variables with Validation

Access environment variables through validated configuration objects instead of `process.env` directly. This catches missing variables at build time and provides type safety.

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

## Implementation Steps

### Step 1: Scaffold the Project Structure

Initialize a new Next.js project and immediately establish the folder layout before writing any application code.

```bash
npx create-next-app@latest my-app --typescript --tailwind --app --src-dir
cd my-app
```

Create the feature-based directory structure:

```bash
mkdir -p src/features/{auth,dashboard,posts,settings}/{components,hooks,utils,api}
mkdir -p src/lib src/ui
```

### Step 2: Set Up the Shared Library

Configure your database client, session management, and shared utilities in `src/lib/`. Choose a database ORM (Prisma or Drizzle) and set up the connection layer.

```bash
npm install @prisma/client
npx prisma init
```

Create `src/lib/db.ts` with a singleton Prisma client pattern, and `src/lib/env.ts` with Zod validation for environment variables.

### Step 3: Build the App Layout Hierarchy

Create a root layout that wraps the entire application, then use Route Groups to apply different layouts for different sections.

```bash
touch src/app/layout.tsx
mkdir -p src/app/\(marketing\) src/app/\(dashboard\) src/app/\(auth\)
```

Each route group gets its own `layout.tsx` with shared navigation, sidebars, or authentication guards for that section.

### Step 4: Implement a Feature Module

Build one complete feature (e.g., a blog post listing) to validate the architecture. Start with a Server Component that fetches data directly, wrap it in a Suspense boundary, and add a loading skeleton.

Create `src/features/posts/components/post-list.tsx` as a Server Component, and `src/features/posts/components/post-list-skeleton.tsx` for the loading state.

### Step 5: Add Client Components for Interactivity

Identify interactive elements (search bars, pagination controls, theme toggles) and extract them into Client Components. Place them in the feature's `components/` directory and import them into Server Component parents without adding `"use client"` to the parent.

```typescript
// A Client Component colocated with its feature
"use client";
export function PostSearch({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <input
      type="search"
      onChange={(e) => onSearch(e.target.value)}
      placeholder="Search posts..."
      className="border p-2 rounded"
    />
  );
}
```

### Step 6: Add API Route Handlers

Create API endpoints using the route handler pattern for client-side mutations (e.g., creating posts, signing in users). Place them in `app/api/<resource>/route.ts`.

```bash
mkdir -p src/app/api/posts
touch src/app/api/posts/route.ts
```

### Step 7: Configure Caching and Revalidation

Set up ISR (Incremental Static Regeneration) for pages that can be static with periodic updates, and use `revalidateTag` and `revalidatePath` for on-demand cache invalidation after mutations.

```typescript
export const revalidate = 3600; // Revalidate this page every hour

// Or for on-demand revalidation in a route handler
import { revalidateTag } from "next/cache";

export async function POST() {
  await createPost();
  revalidateTag("posts");
  return Response.json({ success: true });
}
```

### Step 8: Test and Verify

Run the development server, verify that pages render correctly, check that Server Components produce minimal client JavaScript, and confirm that data fetching works without waterfalls. Use `next build` to confirm a clean production build.

```bash
npm run dev   # Verify in development
npm run build # Confirm production build passes
```
