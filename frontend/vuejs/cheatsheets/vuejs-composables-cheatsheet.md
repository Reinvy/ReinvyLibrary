---
title: "Vue.js Composables Cheatsheet"
description: "A quick reference for Vue 3 composables: Composition API patterns, lifecycle hooks inside composables, shared state, effectScope cleanup, and unit testing."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Vue.js Composables Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Declare a composable | `export function useCounter() {}` | File in `composables/`, name always starts with `use` |
| Return reactive state | `return { count, increment }` | Return refs unwrapped, never raw values |
| Async composable | `export async function useUser(id) {}` | Caller must `await` before using the returned refs |
| Accept a ref argument | `toValue(source)` | Normalizes `ref`, getter, or plain value |
| Watch a ref argument | `watch(toValue(source), cb)` | Keeps reactivity on props passed as getters |
| Cleanup on dispose | `onScopeDispose(() => {})` | Works in components and detached scopes |
| Shared singleton state | `const state = reactive({})` | Declare at module scope, outside the factory |
| Per-call isolated state | `const state = ref(0)` in factory | New state per component that calls it |
| Group reactive effects | `const scope = effectScope()` | Lets watchers stop together |
| Stop a scope | `scope.stop()` | Disposes every effect created inside |
| Inject a dependency | `useX(inject(Key) as T)` | Pass ports in instead of importing singletons |

## Common Commands

### Scaffolding and Test Tooling

```bash
# Create a project, then a standalone composable file
npm create vue@latest my-app
mkdir -p src/composables && touch src/composables/useCounter.ts

# Harness for composables that touch lifecycle hooks
npm install --save-dev vitest @vue/test-utils jsdom
```

### Type Checking and Running Tests

```bash
# Catch reactivity mistakes: destructured props, lost .value, stale refs
npx vue-tsc --noEmit

# jsdom provides the DOM that mount() requires
npx vitest run --environment jsdom src/composables
```

## Code Snippets

### Basic Composable

```typescript
// composables/useCounter.ts — state is created per call
export function useCounter(initial = 0, step = 1) {
  if (!Number.isFinite(initial) || !Number.isFinite(step)) {
    throw new TypeError('useCounter expects finite numbers')
  }
  const count = ref(initial)
  const isPositive = computed(() => count.value > 0)
  const increment = () => (count.value += step)
  return { count, isPositive, increment, reset: () => (count.value = initial) }
}
```

### Accepting Refs, Getters, or Plain Values

```typescript
// composables/useFullName.ts — toValue keeps every input shape reactive
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

export function useFullName(first: MaybeRefOrGetter<string>, last: MaybeRefOrGetter<string>) {
  return computed(() => `${toValue(first)} ${toValue(last)}`.trim().replace(/\s+/g, ' '))
}
```

### Lifecycle Inside a Composable

```typescript
// composables/useWindowWidth.ts — guard for non-component scopes
import { getCurrentScope, onScopeDispose, ref } from 'vue'

export function useWindowWidth() {
  const width = ref(window.innerWidth)
  const onResize = () => (width.value = window.innerWidth)
  window.addEventListener('resize', onResize, { passive: true })

  if (getCurrentScope()) {
    onScopeDispose(() => window.removeEventListener('resize', onResize))
  } else {
    console.warn('useWindowWidth called outside a scope; listener will leak')
  }
  return width
}
```

### Shared Singleton State

```typescript
// composables/useAuth.ts — module-scope state is shared by every caller
const session = ref<Session | null>(null)

export function useAuth() {
  const isAuthenticated = computed(() => session.value !== null)

  async function login(email: string, password: string) {
    const res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error(`Login failed with status ${res.status}`)
    session.value = (await res.json()) as Session
  }

  // readonly() stops components from mutating shared state directly
  return { session: readonly(session), isAuthenticated, login, logout: () => (session.value = null) }
}
```

### Isolating Async Work with effectScope

```typescript
// composables/useSearch.ts — the whole watcher tree dies with the scope
export function createSearchScope(fetcher: (q: string) => Promise<string[]>) {
  const scope = effectScope()
  const query = ref('')
  const results = ref<string[]>([])
  const error = ref<string | null>(null)

  scope.run(() => {
    watch(query, async (q) => {
      if (q.length < 2) return void (results.value = [])
      try {
        results.value = await fetcher(q)
        error.value = null
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Unknown error'
      }
    })
  })
  return { query, results, error, stop: () => scope.stop() }
}
```

### Testing a Composable

```typescript
// useWindowWidth.spec.ts — mount a host so lifecycle hooks exist
const Host = defineComponent({
  setup() {
    const width = useWindowWidth()
    return () => h('span', width.value)
  },
})

it('tracks resize events', () => {
  const wrapper = mount(Host)
  window.innerWidth = 1280
  window.dispatchEvent(new Event('resize'))
  expect(wrapper.text()).toBe('1280')
  wrapper.unmount()
})
```
