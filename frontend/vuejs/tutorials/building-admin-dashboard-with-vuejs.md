---
title: "Building an Admin Dashboard with Vue.js"
description: "Build a Vue 3 admin dashboard with a persistent layout shell, route guards, typed API integration, sortable data tables, lazy charts, role-based UI, and i18n."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building an Admin Dashboard with Vue.js

## Summary

This tutorial builds a complete Vue 3 admin dashboard: a persistent layout shell, authenticated routing with role guards, a typed API layer, a sortable data table, deferred charts, permission-aware UI, and bilingual support. The result is a skeleton you extend with domain modules instead of rebuilding the same plumbing for every screen.

## Target Audience

- Frontend developers comfortable with Vue 3 components, `ref`, and `computed`.
- Full-stack developers moving from tutorial-scale apps to multi-route applications with access control.

## Prerequisites

- Node.js 20+ and npm installed, plus working knowledge of the Composition API and Vue Router.
- Basic TypeScript: interfaces, generics, and type narrowing.
- A backend or mock API exposing `GET /api/users` and `POST /api/login`.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Structure a dashboard with a shell that survives route changes.
- Protect routes with authentication and role-based navigation guards.
- Centralize API access behind a typed client with consistent error handling.
- Build a reusable table and load charts without blocking the first paint.
- Gate UI by permission and switch languages without a reload.

## Context and Motivation

Admin dashboards look simple in demos and turn unmaintainable in production. The layout is duplicated per page, authorization is checked in three places, every screen writes its own `fetch`, and "hide the delete button" logic gets copied into a dozen components. Each shortcut costs nothing on day one and a week of refactoring on day ninety.

The fix is architectural: one shell, one router contract, one API client, one permission helper, one translation layer. This tutorial builds those five pieces so later domain screens stay small and consistent.

## Core Content

### The Layout Shell

Split the app into a shell route and child routes. The shell owns the sidebar, top bar, and notifications; children render only their content into `<RouterView>`. Because the shell stays mounted, navigation does not tear down sidebar state, scroll position, or open menus. Keep the shell free of business data — it should know about navigation and the current user, nothing else.

### Guards and the API Layer

Route guards belong in the router, not in `onMounted`. A global `beforeEach` answers three questions in order: is there a session, is the route marked `requiresAuth`, and does the session hold one of `route.meta.roles`. Redirect to login with a `redirect` query so the user lands where they intended.

Every screen calling `fetch` directly guarantees inconsistent error handling. Wrap the API in one client that attaches credentials, parses JSON, throws on non-2xx responses, and normalizes errors into a displayable shape. Inject the client via `provide` so tests can swap in a fake without touching the network.

### Tables and Charts

A dashboard is mostly tables. Extract sorting, filtering, and pagination into a composable that takes rows and returns derived state plus handlers, leaving the table component presentational: props in, events out. For server-side pagination, pass `total` and emit page changes instead of slicing locally.

Charts are the heaviest dependency in the bundle. Import them with `defineAsyncComponent` so the shell and table paint first, and reserve height in CSS to avoid layout shift while the library downloads.

### Permissions and Language

Expose one `can(action)` helper derived from the session's roles and use it in `v-if` and a small `v-can` directive. Hiding a button is convenience, never security — the API must enforce the same rule. For i18n, keep per-locale JSON files, expose `t()` and a locale switcher in the shell, and format dates with `Intl` rather than template strings.

## Code Examples

### Router with Guarded Child Routes

```typescript
// router/index.ts — the shell owns layout, children own content
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/',
      component: () => import('@/layouts/DashboardShell.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'overview', component: () => import('@/views/OverviewView.vue') },
        { path: 'users', name: 'users', component: () => import('@/views/UsersView.vue'), meta: { roles: ['admin'] } },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const needsAuth = to.matched.some((record) => record.meta.requiresAuth)
  if (needsAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles?.length && !roles.some((role) => auth.roles.includes(role))) {
    return { name: 'overview' }
  }
  return true
})
```

### Typed API Client

```typescript
// api/client.ts — one place handles credentials, parsing, and errors
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw Object.assign(new Error(body || `Request failed with ${res.status}`), { status: res.status })
  }
  return (res.status === 204 ? null : await res.json()) as T
}

export const api = {
  users: (page: number) => request<{ items: User[]; total: number }>(`/users?page=${page}`),
}
```

### Table Composable

```typescript
// composables/useTable.ts — sorting stays out of the template
export function useTable<T extends Record<string, unknown>>(rows: Ref<T[]>) {
  const query = ref('')
  const sortKey = ref<keyof T | null>(null)
  const sortDir = ref<'asc' | 'desc'>('asc')

  const visible = computed(() => {
    const needle = query.value.trim().toLowerCase()
    const filtered = rows.value.filter((row) =>
      !needle || Object.values(row).some((v) => String(v).toLowerCase().includes(needle)),
    )
    if (!sortKey.value) return filtered
    const key = sortKey.value
    const factor = sortDir.value === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * factor)
  })

  function sortBy(key: keyof T) {
    sortDir.value = sortKey.value === key && sortDir.value === 'asc' ? 'desc' : 'asc'
    sortKey.value = key
  }
  return { query, sortKey, sortDir, visible, sortBy }
}
```

## Key Insights

- Guard on `to.matched`, not `to.meta`: child routes inherit metadata only when you walk the matched records.
- Client-side role checks improve UX, never security; the API must reject unauthorized writes independently.
- Lazy-load charts and any view above ~50 KB; first paint matters more than a warm chart.
- Keep the shell data-free so navigation does not refetch user or tenant data on every route change.
- Normalize API errors in one place; drive `<html lang>` from the active locale for `Intl` formatting.

## Next Steps

- Add optimistic updates and retries to the API client for flaky mobile networks.
- Move table state into the URL query so views become shareable and bookmarkable.
- Replace hand-rolled table primitives with PrimeVue or Naive UI, and cover login plus role redirects with Playwright.

## Conclusion

You now have a dashboard with a persistent shell, guarded routes, a typed client, reusable table logic, deferred charts, permission-aware UI, and bilingual support — the pieces that decide whether the next ten screens are cheap or expensive. Extend it module by module: each new screen should add a view and a route, not another copy of the plumbing.
