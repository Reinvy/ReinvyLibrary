---
title: "Next.js Development Syllabus"
description: "A comprehensive 12-week curriculum covering Next.js App Router, routing patterns, Server and Client Components, data fetching, authentication, deployment, and a capstone project."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Next.js Development Syllabus

## Overview

This 12-week syllabus is designed for developers with foundational React knowledge who want to master Next.js and the modern App Router architecture. The curriculum progresses from core routing concepts through advanced patterns like parallel and intercepting routes, Server Actions, caching strategies, authentication, and production deployment. Each week builds on the previous, culminating in a full-featured capstone project that demonstrates all major concepts. By the end of this course, students will be prepared to architect, build, and deploy real-world Next.js applications with confidence.

## Curriculum

### Week 1: Next.js Foundations

- **What is Next.js?**
  - Framework overview, history, and the shift from Pages Router to App Router
  - Benefits: SSR, SSG, ISR, file-based routing, API routes
  - Comparing Next.js with other React meta-frameworks (Remix, Gatsby)
- **Project Setup and Development Environment**
  - `create-next-app` with TypeScript, ESLint, Tailwind CSS options
  - Project structure overview (`app/`, `public/`, configuration files)
  - Development server, hot reloading, and the React Server Components prompt
- **First App Router Application**
  - Creating the first page and layout
  - Understanding the `app/` directory conventions
  - Basic navigation with the `<Link>` component

### Week 2: Routing Fundamentals

- **File Conventions**
  - `page.tsx`: Defining route segments
  - `layout.tsx`: Shared UI across routes
  - `loading.tsx`: Loading UI and streaming
  - `error.tsx`: Error boundaries per route segment
  - `not-found.tsx`: Custom 404 pages
- **Nested Routes and Layouts**
  - Creating nested route segments with folders
  - Nested layouts and template inheritance
  - Route Groups `(group)` for organizational separation
- **Linking and Navigation**
  - `<Link>` component prefetching behavior
  - `useRouter` hook for programmatic navigation
  - `usePathname` and `useSearchParams` hooks

### Week 3: Dynamic Routes and Advanced Routing

- **Dynamic Route Segments**
  - `[slug]` and `[...catchAll]` patterns
  - `generateStaticParams` for static generation with dynamic routes
  - `generateMetadata` for dynamic SEO metadata
- **Parallel Routes**
  - `@slot` convention for dashboard-style layouts
  - Independent route rendering within the same layout
  - Conditional rendering based on route state
- **Intercepting Routes**
  - `(.)segment` pattern for modal overlays
  - Combining intercepting and parallel routes for complex UIs
  - Photo gallery and feed detail patterns

### Week 4: Server and Client Components

- **React Server Components (RSC)**
  - The mental model: components that run on the server
  - Benefits: zero bundle size, direct database access, automatic code splitting
  - Server-rendered HTML streaming
- **Client Components**
  - The `'use client'` directive
  - When to use client vs server components
  - Interleaving server and client components
- **Composition Patterns**
  - Passing server components as children to client components
  - Extracting client boundaries for interactivity
  - Avoiding common pitfalls (serialization, importing server code into client)

### Week 5: Data Fetching

- **Server-Side Data Fetching**
  - `fetch` with `cache: 'force-cache'`, `'no-store'`, and `{ next: { revalidate } }`
  - Database queries directly in server components
  - Parallel data fetching with `Promise.all`
- **Client-Side Data Fetching**
  - `useEffect` vs `use` hook (React 19)
  - SWR and TanStack Query integration patterns
  - Optimistic updates and cache invalidation
- **Streaming and Suspense**
  - Streaming server-rendered UI with `<Suspense>`
  - Granular loading states per component
  - `loading.js` conventions and streaming boundaries

### Week 6: Server Actions and Mutations

- **Server Actions Fundamentals**
  - The `'use server'` directive
  - Form actions with `<form action={serverAction}>`
  - Revalidating data with `revalidatePath` and `revalidateTag`
- **Mutations and Form Handling**
  - Using `useActionState` for pending states and validation errors
  - File uploads with Server Actions
  - Progressive enhancement: forms that work without JavaScript
- **Server Action Best Practices**
  - Authorization checks inside Server Actions
  - Rate limiting and error handling
  - Optimistic updates on the client

### Week 7: Middleware, Authentication, and Security

- **Next.js Middleware**
  - `middleware.ts` conventions and execution order
  - Request matching with `matcher` config
  - Redirects, rewrites, and header manipulation
- **Authentication Strategies**
  - NextAuth.js / Auth.js integration
  - Session-based vs JWT authentication
  - Protecting routes with middleware
- **Security Best Practices**
  - CSRF protection with Server Actions
  - Content Security Policy headers
  - Rate limiting and API route protection

### Week 8: Caching and Performance

- **Next.js Caching Architecture**
  - Full Route Cache, Data Cache, Router Cache
  - How each cache works and when it invalidates
  - `noStore()`, `revalidateTag()`, and `revalidatePath()` in depth
- **Static and Dynamic Rendering**
  - Static Site Generation (SSG) at build time
  - Incremental Static Regeneration (ISR)
  - Dynamic rendering and opting out of caching
- **Performance Optimization**
  - Image optimization with `next/image`
  - Font optimization with `next/font`
  - Bundle analysis with `@next/bundle-analyzer`
  - Core Web Vitals and Lighthouse optimization

### Week 9: API Routes and Route Handlers

- **Route Handlers**
  - `route.ts` conventions for API endpoints
  - GET, POST, PUT, DELETE handlers
  - Request and Response helpers
- **Middleware and API Security**
  - CORS configuration for API routes
  - Rate limiting with `lru-cache` or Upstash
  - Webhook signature verification
- **Background Jobs and Webhooks**
  - Running background tasks with Serverless functions
  - Webhook receiver implementation
  - Cron jobs with Vercel Cron

### Week 10: State Management and Global State

- **React Context with Server Components**
  - Server-only context providers
  - Cookie-based state for server components
  - Reading cookies and headers with `next/headers`
- **Client-Side State Management**
  - Zustand, Jotai, or Redux with Next.js
  - Hydration mismatch prevention
  - Persisting state to localStorage
- **URL State Management**
  - Search params as source of truth
  - `useSearchParams` and `useRouter` for URL updates
  - Shallow routing patterns

### Week 11: Testing, Debugging, and Deployment

- **Testing Strategies**
  - Unit testing with Vitest
  - Integration testing with React Testing Library
  - E2E testing with Playwright or Cypress
  - Testing Server Actions and API routes
- **Debugging and Monitoring**
  - React DevTools and Next.js DevTools
  - Server component debugging with `server-only`
  - Logging with `pino` or `winston`
- **Deployment**
  - Vercel deployment: environment variables, preview deployments
  - Docker deployment for self-hosted Next.js
  - Node.js server mode vs serverless mode

### Week 12: Capstone Project

- **Project Specification**
  - Full-stack application using all learned concepts
  - Suggested project types: e-commerce store, project management tool, blog platform with CMS
- **Architecture Planning**
  - Route design and layout hierarchy
  - Data model and API design
  - Authentication and authorization flow
- **Implementation Phase**
  - Week 1-4 of project: core pages, layouts, data fetching
  - Week 5-8 of project: mutations, authentication, polish
  - Week 9-12 of project: testing, performance optimization, deployment
- **Final Review and Presentation**
  - Code review checklist
  - Performance audit report
  - Deployment to production

## Final Project

Students will build a **full-stack production-ready application** of their choice. The project must demonstrate:

- **App Router architecture** with at least three levels of nested layouts
- **At least two route groups** for organizational separation
- **Dynamic routes** with `generateStaticParams` and metadata
- **Parallel routes** (e.g., a dashboard with independent panels) combined with **intercepting routes** (e.g., a modal overlay for detail views)
- **Server Actions** for all mutations with `useActionState` for pending and error states
- **Authentication** using NextAuth.js with at least one OAuth provider and credentials provider
- **Data fetching** using both server-side fetch with revalidation and client-side SWR/TanStack Query
- **Middleware** for route protection and header manipulation
- **Comprehensive error handling** with custom error and not-found pages
- **Testing** with at least 80% coverage (Vitest + testing-library) and E2E tests for critical user flows
- **Production deployment** to Vercel with custom domain, environment variables, and monitoring

Example project ideas:

- **E-Commerce Platform**: Product catalog, cart with Server Actions, checkout flow, admin dashboard with parallel routes, order management
- **Project Management Tool**: Kanban boards, team collaboration, real-time updates, role-based access, reporting dashboard
- **Content Management System**: Blog platform with markdown editor, media library, user roles, analytics dashboard, SEO optimization

## Assessment Criteria

- **Weekly Assignments (30%)**
  - 10 weekly coding assignments (Weeks 1-10)
  - Each assignment builds on the previous week's concepts
  - Graded on correctness, code quality, and adherence to Next.js conventions
  - Late submissions penalized 10% per day

- **Quizzes (20%)**
  - 4 quizzes (end of Weeks 3, 6, 9, 11)
  - Mix of conceptual understanding and code analysis
  - Multiple choice, short answer, and code review questions
  - Minimum 70% pass rate required to proceed to capstone

- **Capstone Project (40%)**
  - Code quality and architecture decisions (15%)
  - Feature completeness against specification (10%)
  - Testing coverage and quality (5%)
  - Performance and accessibility audit (5%)
  - Deployment and production readiness (5%)

- **Participation and Code Reviews (10%)**
  - Peer code reviews on two classmates' projects
  - Active participation in design discussions
  - Documentation quality (README, API docs, setup instructions)

## References

- [Next.js Official Documentation](https://nextjs.org/docs) - Complete App Router reference
- [Next.js Learn Course](https://nextjs.org/learn) - Interactive tutorial by the Vercel team
- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md) - Official RSC specification
- [NextAuth.js Documentation](https://next-auth.js.org/) - Authentication library for Next.js
- [Vercel Documentation](https://vercel.com/docs) - Deployment and platform features
- [The App Router Playbook](https://vercel.com/app-router) - Real-world patterns and examples
- [Web Dev Simplified Next.js Course](https://www.youtube.com/@WebDevSimplified) - Video tutorials
- [Josh W. Comeau's Next.js Guide](https://www.joshwcomeau.com/nextjs/) - Deep dives into Next.js internals
