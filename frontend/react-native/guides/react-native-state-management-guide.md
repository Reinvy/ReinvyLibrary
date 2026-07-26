---
title: "React Native State Management Guide"
description: "A comprehensive guide to state management in React Native applications — covering local component state, global state with Context API and Zustand, server state with React Query, and choosing the right architecture for your app's scale."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# React Native State Management Guide

## Introduction

State management is one of the most consequential architectural decisions you will make in a React Native application. Unlike a single-page web app where the browser tab is the only client, a React Native app runs on a device with limited memory, intermittent connectivity, and a native UI thread that must coordinate with the JavaScript thread. Every state update travels across the React Native bridge, and poorly managed state can cause janky animations, unnecessary re-renders, and battery drain.

This guide surveys the landscape of state management approaches available for React Native — from the built-in `useState` and `useReducer` hooks to global solutions like Zustand, Jotai, and Redux Toolkit, as well as server-state libraries like TanStack React Query. Each approach is evaluated through the lens of mobile-specific constraints: bridge overhead, memory pressure, screen lifecycle, and offline resilience. By the end, you will have a clear decision framework for choosing the right state architecture for your app's current needs and future growth.

## Best Practices

### Keep State as Local as Possible

The single most impactful practice is to push state down to the leaf components that actually need it. Every piece of global state that ends up in a context provider forces all consumers to re-render when that state changes, even if they only read a different slice. Before reaching for a global store, ask: does this state need to persist across screens? Is it shared between more than two unrelated components? If the answer to both is no, keep it in `useState` or `useReducer` local to the component.

```tsx
// ❌ Over-elevated state — entire screen re-renders on every input keystroke
const [formData, setFormData] = useState({ name: '', email: '', bio: '' });

// ✅ Localized per-field state — only the input component re-renders
function NameInput() {
  const [name, setName] = useState('');
  return <TextInput value={name} onChangeText={setName} />;
}
```

### Separate Server State from UI State

Server state (data fetched from an API) has fundamentally different characteristics from UI state (modal visibility, current tab, form input values). Server state is asynchronous, potentially stale, and shared across sessions. Treating it the same way as UI state leads to redundant fetches, manual cache invalidation bugs, and complex loading/error logic duplicated across every screen.

Use a dedicated server-state library like TanStack React Query (formerly React Query) or RTK Query. These libraries handle caching, background refetching, pagination, optimistic updates, and stale-while-revalidate patterns out of the box — patterns that would take hundreds of lines of hand-rolled Redux middleware to implement correctly.

```tsx
// ✅ React Query separates concerns cleanly
function useProducts(categoryId: string) {
  return useQuery({
    queryKey: ['products', categoryId],
    queryFn: () => api.fetchProducts(categoryId),
    staleTime: 5 * 60 * 1000, // 5 minutes before refetch
  });
}

// Component only cares about UI state
function ProductScreen() {
  const [filterOpen, setFilterOpen] = useState(false);
  const { data, isLoading } = useProducts('electronics');

  if (isLoading) return <ActivityIndicator />;
  return (/* render products */);
}
```

### Choose Predictability over Boilerplate

React Native apps have a tighter bundle-size budget than web apps. A state management library that adds 30 KB gzipped to the JavaScript bundle directly impacts cold-start time on low-end devices. However, the right trade-off depends on team size and app complexity:

- **Solo developer or small team, simple app**: Context API + `useReducer` is sufficient. Resist the temptation to add a library prematurely.
- **Medium app with cross-cutting state**: Zustand or Jotai. Both are under 2 KB, have zero boilerplate, and work outside React components (useful for navigation or analytics helpers).
- **Large team, complex state transitions**: Redux Toolkit (RTK). The middleware ecosystem (thunks, listeners) and devtools pay off when multiple developers need to reason about state flows.

```tsx
// Zustand — minimal boilerplate, works outside components
import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  login: async (credentials) => {
    const { token, user } = await api.login(credentials);
    set({ token, user });
  },
  logout: () => set({ token: null, user: null }),
}));

// Access from any component or service file
export { useAuthStore };
```

### Handle Screen Lifecycle and Memory

React Native screens are not destroyed when you navigate away — they remain in the navigation stack, holding references to their component trees and any subscriptions they created. A screen that subscribes to a store but never unsubscribes will continue to receive updates and re-render in the background, consuming both CPU and memory.

Always unsubscribe from stores and observers in `useEffect` cleanup functions. For Zustand stores, call the `unsubscribe` function returned by `subscribe`. For React Query, the query client automatically cancels in-flight requests when a component unmounts, but you should still configure `gcTime` (formerly `cacheTime`) to control how long inactive query data stays in memory.

```tsx
useEffect(() => {
  const unsub = useAuthStore.subscribe((state) => {
    console.log('Auth state changed:', state.token ? 'logged in' : 'logged out');
  });
  return () => unsub(); // critical for memory
}, []);
```

### Prefer Atomic Updates to Avoid Bridge Spam

Each `setState` or dispatch call triggers a JavaScript re-render cycle that must synchronize with the native UI thread. When updating multiple pieces of related state, batch them into a single update. React 18 automatically batches updates inside event handlers, but updates inside `setTimeout`, `Promise` callbacks, or native event listeners do not batch automatically — use `unstable_batchedUpdates` from `react-dom` or batch manually with Zustand's `set` function.

```tsx
// ❌ Three separate bridge crossings
setIsLoading(true);
setError(null);
setData(response.data);

// ✅ Single update
setState({ isLoading: true, error: null, data: response.data });

// ✅ Zustand batches naturally
store.setState({ isLoading: true, error: null, data: response.data });
```

## Implementation Steps

### Step 1: Audit Your Current State

Before adopting any library, map out every piece of state in your application. Create a table with three columns: the state variable, which components read it, and which components write it. This exercise immediately reveals:

- State that is only read by one component (keep local).
- State written by one component but read by many (candidate for Context).
- State written and read by many unrelated components (candidate for Zustand or Redux).
- State that originates from an API (candidate for React Query).

```text
| State            | Readers                        | Writers          | Category   |
|------------------|--------------------------------|------------------|------------|
| currentUser      | Header, Profile, Settings      | LoginScreen      | Auth       |
| productList      | ProductGrid, SearchBar         | API fetch        | Server     |
| cartItems        | CartBadge, CartScreen, Checkout| ProductCard      | Cross-cut  |
| isDarkMode       | ThemeProvider                  | SettingsScreen   | Preference |
| searchQuery      | SearchBar                      | SearchBar        | Local      |
```

### Step 2: Install Dependencies Based on Scale

Add libraries incrementally — never install everything upfront.

**Minimum setup (simple app):**

```bash
npm install @tanstack/react-query
```

This gives you a dedicated layer for server state, which is the most error-prone category to handle manually. UI state stays in `useState` and `useReducer`.

**Medium setup (cross-cutting state needed):**

```bash
npm install zustand @tanstack/react-query
```

Zustand replaces Context for global state. It avoids the provider-nesting problem and the re-render cascades that plague deeply nested Context chains.

**Large setup (complex business logic, many developers):**

```bash
npm install @reduxjs/toolkit react-redux @tanstack/react-query
```

RTK provides a standardized pattern that every developer on the team immediately understands, and its devtools make debugging state transitions significantly easier.

### Step 3: Configure QueryClientProvider

Wrap your app's root with `QueryClientProvider` regardless of which global-state library you choose. This is the single non-negotiable layer.

```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false, // not relevant on mobile
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
```

### Step 4: Implement a Feature-Sliced Store Pattern

For Zustand (or Redux Toolkit slices), organize stores by feature domain rather than by technical category. A single auth store is clearer than separate `userReducer`, `tokenReducer`, and `permissionsReducer` that are always dispatched together.

```tsx
// stores/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  total: () => number;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...product, quantity: 1 }] };
        }),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(0, qty) } : i
          ),
        })),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

The `persist` middleware writes the cart to `AsyncStorage` automatically, so the cart survives app restarts without any extra code.

### Step 5: Connect Server State with React Query Hooks

Create custom hooks that encapsulate API calls, loading states, and error handling. Components consume these hooks without knowing whether data comes from the cache or the network.

```tsx
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'https://api.example.com';

export function useProducts(categoryId: string) {
  return useQuery({
    queryKey: ['products', categoryId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/products?category=${categoryId}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();

  return useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`${API_BASE}/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error('Failed to add to cart');
      return res.json();
    },
    onSuccess: (data, productId) => {
      // Optimistically update the local store
      addItem({ id: productId, name: data.name, price: data.price, imageUrl: data.image });
      // Invalidate the cart count query
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
    },
  });
}
```

### Step 6: Handle Loading and Error States Consistently

Define reusable components or hooks for the common state machine that every server-dependent screen shares: loading, error, empty, and success.

```tsx
// components/ScreenShell.tsx
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ScreenShellProps {
  isLoading: boolean;
  error: Error | null;
  children: React.ReactNode;
  onRetry?: () => void;
}

export function ScreenShell({ isLoading, error, children, onRetry }: ScreenShellProps) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 16, color: '#D32F2F', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

// Usage in a screen
function ProductListScreen() {
  const { data, isLoading, error, refetch } = useProducts('electronics');

  return (
    <ScreenShell isLoading={isLoading} error={error} onRetry={refetch}>
      <FlatList
        data={data}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item.id}
      />
    </ScreenShell>
  );
}
```

### Step 7: Test State Logic in Isolation

Extract business logic from state stores and test it independently. Zustand stores are plain functions — test them without rendering any components.

```tsx
// __tests__/cart-store.test.ts
import { useCartStore } from '../stores/useCartStore';

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('CartStore', () => {
  const sampleProduct = { id: '1', name: 'Test Item', price: 10, imageUrl: 'https://example.com/img.png' };

  it('adds an item to an empty cart', () => {
    useCartStore.getState().addItem(sampleProduct);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('increments quantity when adding an existing item', () => {
    useCartStore.getState().addItem(sampleProduct);
    useCartStore.getState().addItem(sampleProduct);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('calculates total correctly', () => {
    useCartStore.getState().addItem(sampleProduct);
    useCartStore.getState().addItem({ ...sampleProduct, id: '2', price: 20 });
    expect(useCartStore.getState().total()).toBe(30);
  });

  it('clears the cart', () => {
    useCartStore.getState().addItem(sampleProduct);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
```

Run state tests as part of your CI pipeline. They execute in milliseconds and catch the most common class of bugs in React Native apps — incorrect state transitions that users experience as data loss or inconsistent UI.
