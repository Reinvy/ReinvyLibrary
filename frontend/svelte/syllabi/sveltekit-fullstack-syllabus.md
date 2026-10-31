---
title: "SvelteKit Fullstack Syllabus"
description: "A seven-module curriculum that takes developers from SvelteKit routing to a deployed fullstack application, covering data loading, form actions, authentication, database access, testing, and production deployment."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# SvelteKit Fullstack Syllabus

## Overview

This seven-module syllabus is built for developers who already write components and want to own the whole stack: routes, server data, mutations, sessions, a real database, tests, and a deployment pipeline. SvelteKit is unusual among frontend frameworks because the server is not an afterthought — `+page.server.ts`, form actions, hooks, and adapters are part of the framework's core contract. That makes it an excellent vehicle for learning fullstack work without stitching three separate tools together.

Each module follows the same rhythm: a conceptual briefing, a guided lab that adds one vertical slice to a single application, and a review checklist. Nothing is throwaway — the labs accumulate into one working product (a team task tracker with projects, members, and comments) so that by Module 7 you are deploying code you have actually built up over six weeks.

The course deliberately teaches the framework's boundaries before its conveniences. Load functions versus universal loads, server-only modules, form actions versus API endpoints, and the distinction between prerendered, server-rendered, and client-rendered routes are covered early because nearly every production bug in a SvelteKit app traces back to getting one of them wrong.

## Curriculum

### Module 1: Routing and Project Anatomy (Week 1)

- **The filesystem router**
  - `+page.svelte`, `+layout.svelte`, `+error.svelte`, and how nesting composes
  - Dynamic segments (`[id]`), rest parameters (`[...path]`), and optional parameters (`[[lang]]`)
  - Route groups `(app)` for shared layouts without a URL segment
- **Layout data and invalidation**
  - `+layout.ts` versus `+layout.server.ts`: what runs where and when
  - `depends()` and `invalidate()` for surgical cache refresh
- **Rendering modes**: SSR by default, `prerender = true` for static routes, `ssr = false` for client-only islands
- **Lab**: Scaffold the task tracker with a marketing route group, an authenticated app group, and nested project routes

### Module 2: Data Loading on the Server (Week 2)

- **Load function mechanics**
  - What `load` receives (`params`, `url`, `parent`, `fetch`, `locals`) and what it may return
  - Serialization rules: only JSON-safe data crosses the server/client boundary
  - Streaming promises for slow, non-blocking data
- **Server-only code**
  - `$lib/server` and the `$env/static/private` modules; how SvelteKit refuses to bundle secrets
  - Structuring a data-access layer so routes never touch the ORM directly
- **The universal `fetch`**
  - Why `event.fetch` must be used in load functions and how it forwards cookies
  - Handling upstream failures without crashing the page: `error()` versus return values
- **Lab**: Build project list and project detail loads with pagination, error boundaries, and one streamed widget

### Module 3: Forms, Actions, and Validation (Week 3)

- **Progressive enhancement first**
  - `use:enhance` as an upgrade, not a requirement: forms must work with JavaScript disabled
  - Named actions on one route, and `?/actionName` routing
- **Validation architecture**
  - Zod schemas shared between client and server; server validation is the only authority
  - Returning `fail(400, { data, errors })` and rendering field-level errors
- **Mutations that touch multiple tables**
  - Transactions inside actions; rolling back on constraint violations
  - Redirects after success (`redirect(303, ...)`) and the double-submit problem
- **Lab**: Implement create, edit, and delete actions for tasks with shared Zod validation and optimistic UI

```typescript
// src/routes/projects/[id]/tasks/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';

const TaskInput = z.object({
    title: z.string().min(3).max(120),
    dueDate: z.coerce.date().optional()
});

export const actions = {
    create: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: 'Sign in required' });

        const parsed = TaskInput.safeParse(Object.fromEntries(await request.formData()));
        if (!parsed.success) {
            return fail(400, { errors: parsed.error.flatten().fieldErrors });
        }

        try {
            await db.task.create({
                data: { ...parsed.data, projectId: params.id, ownerId: locals.user.id }
            });
        } catch (err) {
            console.error('task.create failed', err);
            return fail(500, { message: 'Could not save the task, please retry' });
        }

        redirect(303, `/projects/${params.id}`);
    }
};
```

### Module 4: Authentication and Sessions (Week 4)

- **Session patterns**
  - Cookie sessions with an opaque token versus signed JWTs; why rotation matters
  - Hashing with argon2 or bcrypt, and timing-safe comparison
- **Hooks as the auth gate**
  - Reading the session cookie in `handle`, populating `event.locals`, redirecting early
  - Protecting route groups in one place instead of per-page checks
- **Authorization, not just authentication**
  - Role and ownership checks inside load functions and actions
  - Preventing IDOR: every query filters by the current user or team membership
- **Lab**: Add email/password registration, login, logout, session expiry, and role-gated project settings

### Module 5: Database Access and Data Modeling (Week 5)

- **Schema design with Drizzle or Prisma**
  - Relations, foreign keys, cascading deletes, and indexes that match real queries
  - Migrations as versioned files; never `db push` in production
- **Connection handling**: Pooling for serverless versus long-lived Node servers
- **Query hygiene**
  - Selecting only needed columns; avoiding N+1 in list views
  - Transactions and isolation levels for multi-table writes
- **Lab**: Model projects, memberships, tasks, and comments; add a migration and a dashboard aggregate query

### Module 6: Testing the Full Stack (Week 6)

- **Unit and component tests**
  - Vitest for pure logic (permissions, validation, formatters)
  - `@testing-library/svelte` for component behavior with user events
- **Integration tests of server code**
  - Calling actions and load functions directly with a synthetic `RequestEvent`
  - A disposable test database migrated per run
- **End-to-end tests**: Playwright against `vite preview`, covering sign-up → create project → create task
- **Lab**: Reach meaningful coverage on permissions and the task lifecycle, plus three E2E flows

### Module 7: Deployment and Operations (Week 7)

- **Adapters**
  - `adapter-node`, `adapter-vercel`, `adapter-static`: what each one changes about your app
  - Environment variable strategy per platform and build-time versus runtime config
- **Performance and caching**: Cache headers on load responses; CDN-friendly rendering modes per route
- **Observability**
  - `handleError` for structured server error reporting; request IDs in logs
  - Health checks, graceful shutdown, and graceful degradation of the database layer
- **Lab**: Deploy to a Node host behind a reverse proxy, wire error reporting, and run a load smoke test

## Final Project

Build and deploy **TeamFlow**, a multi-tenant task tracker, in SvelteKit:

- Registration, login, logout, and session expiry with server-verified cookies
- Projects with membership roles (owner, editor, viewer) enforced in every load and action
- Tasks with due dates, assignment, and a status board that updates through form actions
- Comment threads with server-side validation and optimistic rendering
- A Postgres database accessed through a data-access layer with migrations checked into the repo
- Vitest unit tests for permission logic and Playwright coverage of the four critical flows
- A production deployment with error reporting, structured logs, and documented environment variables

## Assessment Criteria

- **Assignments**: Each module lab is reviewed for correctness (the slice actually works end to end) and for boundary discipline — no secrets in client bundles, no authorization checks only on the client, no validation only in the browser.
- **Final Project**: Graded on feature completeness, security posture (session handling, IDOR resistance, CSRF-safe actions), test quality, deployment reproducibility, and the clarity of the written architecture note explaining why each rendering mode was chosen.

## References

- [SvelteKit Documentation](https://svelte.dev/docs/kit) — routing, load, form actions, hooks, and adapters
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/what-are-runes) — `$state`, `$derived`, `$props`, and `$effect`
- [SvelteKit Auth Helpers](https://authjs.dev/reference/sveltekit) — session patterns with Auth.js
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview) — schema, migrations, and queries
- [Vitest](https://vitest.dev/guide/) and [Playwright](https://playwright.dev/docs/intro) — unit and end-to-end testing
