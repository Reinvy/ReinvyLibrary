---
title: "Vue Router Navigation and Route Guards Cheatsheet"
description: "Quick reference for Vue Router 4: route record options, nested and aliased routes, lazy loading, global and in-component navigation guards, typed params, scroll behavior, and navigation failure handling."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Vue Router Navigation and Route Guards Cheatsheet

## Quick Reference Table

| Task | Code | Notes |
|------|------|-------|
| Create the router | `createRouter({ history, routes })` | Requires a history factory, not a string |
| History modes | `createWebHistory()`, `createWebHashHistory()`, `createMemoryHistory()` | Memory history is the one to use in unit tests |
| Register the plugin | `app.use(router)` | Mount only after `router.isReady()` when doing SSR |
| Declare a route | `{ path: '/users/:id', name: 'user', component: User }` | `name` is required for typed navigation |
| Nested children | `{ path: 'profile', component: Profile }` inside `children` | Child paths are relative — no leading slash |
| Redirect | `{ path: '/old', redirect: '/new' }` | Redirect can also be a function or a named location |
| Alias | `{ path: '/', alias: '/home' }` | Two URLs, one record, no redirect round-trip |
| Lazy view | `component: () => import('./views/About.vue')` | Produces a separate chunk per route |
| Route props | `props: true` or `props: (route) => ({ id: route.params.id })` | Decouples the view from `useRoute()` |
| Global guard | `router.beforeEach((to, from) => {})` | Return `false` to cancel, a location to redirect |
| Resolve guard | `router.beforeResolve(async (to) => {})` | Runs after all in-component guards pass |
| Post-navigation hook | `router.afterEach((to, from, failure) => {})` | No return value — analytics and titles live here |
| Per-route guard | `beforeEnter: (to, from) => {}` | Only fires when entering that record |
| Leave guard | `onBeforeRouteLeave((to, from) => {})` | Composition API replacement for `beforeRouteLeave` |
| Update guard | `onBeforeRouteUpdate((to, from) => {})` | Fires when the same record reuses params |
| Navigate | `router.push({ name: 'user', params: { id: 7 } })` | Returns a promise resolving to a failure or `undefined` |
| Resolve without navigating | `router.resolve({ name: 'user', params: { id: 7 } })` | Gives you `href` for plain anchors |
| Add a route at runtime | `router.addRoute('parent', route)` | Returns a remover function |
| Inspect the failure | `isNavigationFailure(failure, NavigationFailureType.aborted)` | Distinguishes cancelled from duplicated navigation |

## Common Commands

### Scaffolding a Project with the Router

```bash
# Official scaffold — answer "yes" to the Router prompt
npm create vue@latest my-app

# Or add the router to an existing Vue 3 project
npm install vue-router@4
```

### Type-Checking and Previewing Route Changes

```bash
# Route files are plain TypeScript, so vue-tsc checks them too
npx vue-tsc --noEmit

# Production build — each lazy route becomes its own asset chunk
npm run build

# Serve the built output to verify history-mode fallback works
npm run preview
```

### Auditing Lazy Route Chunks

```bash
# One chunk per lazily loaded view, named after the file it came from
ls -1 dist/assets | grep -i view

# History mode needs an SPA fallback on the server; preview already does this
curl -I http://localhost:4173/some/deep/route
```

## Code Snippets

### Router Instance and History Modes

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  strict: false
})
```

History choice decides what the server must support. `createWebHistory` needs an SPA fallback rewrite so deep URLs return `index.html`; `createWebHashHistory` avoids that at the cost of `#` in URLs; `createMemoryHistory` keeps navigation entirely in memory and is the right choice for tests and non-browser targets.

### Route Records: Dynamic, Nested, and Aliased

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/projects/:projectId',
    component: () => import('@/layouts/ProjectLayout.vue'),
    props: true,
    children: [
      { path: '', name: 'project-overview', component: () => import('@/views/ProjectOverview.vue') },
      { path: 'settings', name: 'project-settings', component: () => import('@/views/ProjectSettings.vue') },
      { path: 'members/:memberId', name: 'project-member', component: () => import('@/views/MemberDetail.vue') }
    ]
  },
  { path: '/legacy/dashboard', alias: '/dashboard', redirect: { name: 'project-overview', params: { projectId: 'default' } } }
]
```

Children inherit the parent path segment, so `path: 'settings'` resolves to `/projects/:projectId/settings`. An empty child path (`path: ''`) renders inside the parent layout at the exact parent URL — the standard pattern for an index view that shares a shell.

### Lazy Loading Views and Per-Route Props

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/reports/:reportId',
    name: 'report',
    component: () => import('@/views/ReportView.vue'),
    props: (route) => ({
      reportId: String(route.params.reportId),
      tab: route.query.tab ?? 'summary'
    })
  }
]
```

```vue
<script setup lang="ts">
const props = defineProps<{ reportId: string; tab: string }>()
</script>

<template>
  <ReportBody :id="props.reportId" :tab="props.tab" />
</template>
```

`props: true` maps every param to a prop with the same name. The function form is what you want as soon as params need coercion or query values need defaults — the view then takes plain props and becomes trivial to test without mounting a router.

### Global Navigation Guards

```typescript
router.beforeEach(async (to) => {
  const session = useSessionStore()

  if (to.meta.requiresAuth && !session.isAuthenticated) {
    return { name: 'sign-in', query: { redirect: to.fullPath } }
  }

  if (!session.isReady) {
    await session.hydrate()
  }
})

router.beforeResolve(async (to) => {
  if (to.meta.preloadData) {
    await preloadRouteData(to)
  }
})

router.afterEach((to, from, failure) => {
  if (!failure) {
    document.title = (to.meta.title as string) ?? 'App'
  }
})
```

Guards run in registration order and resolve top to bottom: `beforeEach` on every navigation, then `beforeEnter` on the target record, then in-component `beforeRouteUpdate`, then in-component `beforeRouteLeave`, then `beforeResolve`, then the navigation is confirmed, then `afterEach`. Returning a location from a guard cancels the current navigation and starts a new one — the new navigation runs the whole chain again, so redirect guards must not loop.

### Authenticated Areas with a Meta-Driven Guard

```typescript
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: Array<'admin' | 'editor' | 'viewer'>
    title?: string
    preloadData?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      { path: 'users', name: 'admin-users', component: () => import('@/views/AdminUsers.vue'), meta: { title: 'Users' } }
    ]
  }
]

router.beforeEach((to) => {
  if (!to.meta.roles?.length) return true
  const role = useSessionStore().role
  return to.meta.roles.includes(role) ? true : { name: 'forbidden' }
})
```

Meta merges down the record tree: a child inherits `requiresAuth` from the parent but overrides `title` with its own. Augmenting `RouteMeta` turns `to.meta.roles` into a typed field instead of `unknown`, which is what makes meta-driven guards safe to refactor.

### In-Component Guards with the Composition API

```vue
<script setup lang="ts">
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { useDraftStore } from '@/stores/draft'

const draft = useDraftStore()

onBeforeRouteLeave(() => {
  if (!draft.isDirty) return true
  return window.confirm('Discard unsaved changes?')
})

onBeforeRouteUpdate(async (to, from) => {
  if (to.params.id !== from.params.id) {
    await draft.load(String(to.params.id))
  }
})
</script>
```

The composition-API guards only work inside a component rendered by `<RouterView>`. `onBeforeRouteLeave` cancels with `false` (or confirms with `true`), while `onBeforeRouteUpdate` fires when the same record is reused with different params — the case a full remount never sees.

### Typed Params and Route Meta Augmentation

```typescript
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => String(route.params.projectId))
const page = computed(() => {
  const raw: LocationQueryValue | LocationQueryValue[] = route.query.page
  return Number(Array.isArray(raw) ? raw[0] : raw ?? 1)
})

async function openSettings() {
  await router.push({ name: 'project-settings', params: { projectId: projectId.value } })
}
```

Params always arrive as strings, and repeated query keys arrive as arrays — coerce at the edge of the component rather than scattering `Number()` calls through the template. `route.params` is not reactive in the way people expect; a param change with the same record updates `route.params` in place without remounting, so derive values through `computed` instead of capturing them once.

### Scroll Behavior and Route Transitions

```typescript
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  }
})
```

```vue
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="fade" mode="out-in">
      <KeepAlive :include="['ProjectOverview']">
        <component :is="Component" :key="route.path" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>
```

`savedPosition` is only populated on browser back and forward, which is what makes restoring scroll position on history navigation work. Keying the component on `route.path` forces a transition on param changes; drop the key if the view should update in place.

### Programmatic Navigation and Failure Handling

```typescript
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

async function goToReport(id: string) {
  const failure = await router.push({ name: 'report', params: { reportId: id } })

  if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    return
  }

  if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
    console.info('Navigation cancelled by a guard')
  }
}
```

`router.push` resolves rather than rejects: a guard that cancels produces a failure object, not a thrown error. That is why `try/catch` around `push` silently misses cancelled navigations — check the resolved value with `isNavigationFailure` instead.

### Reacting to Param Changes Without Remounting

```typescript
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(
  () => route.params.reportId,
  async (next, previous) => {
    if (next === previous) return
    await loadReport(String(next))
  },
  { immediate: true }
)
```

Watching the param is the alternative to remounting the view on every navigation. It keeps local state and scroll position alive between sibling reports, which is usually what an in-place list-to-detail drill-down wants.

### RouterLink Slots for Custom Navigation UI

```vue
<template>
  <RouterLink v-slot="{ href, navigate, isActive, isExactActive }" to="/reports" custom>
    <a
      :href="href"
      :class="{ 'nav-active': isActive, 'nav-precise': isExactActive }"
      @click="navigate"
    >
      Reports
    </a>
  </RouterLink>
</template>
```

The `custom` slot gives you the resolved `href` and a `navigate` handler so a design-system component can render its own markup while keeping router-aware link semantics — middle-click, modifier keys, and `isActive` styling all keep working.

### Adding Routes at Runtime

```typescript
const removePluginRoutes = router.addRoute({
  path: '/plugin/:slug',
  name: 'plugin-page',
  component: () => import('@/views/PluginPage.vue')
})

// Feature-flagged area nested under an existing record
router.addRoute('admin', {
  path: 'audit-log',
  name: 'admin-audit-log',
  component: () => import('@/views/AuditLog.vue')
})

// Later, on teardown
removePluginRoutes()
```

`addRoute` returns a remover, which is the clean way to unload a lazily registered module. Adding a child record requires the parent's `name`, and the added route only becomes navigable after the next navigation — resolve it explicitly if code needs to build a link immediately.
