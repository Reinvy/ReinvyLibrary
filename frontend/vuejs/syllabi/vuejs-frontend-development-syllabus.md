---
title: "Vue.js Frontend Development Syllabus"
description: "A 12-week comprehensive curriculum covering Vue.js 3, Composition API, Vue Router, Pinia, testing, performance optimization, SSR with Nuxt 3, and a capstone project."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Vue.js Frontend Development Syllabus

## Overview

This 12-week syllabus is designed to take a developer from intermediate JavaScript proficiency to a skilled Vue.js frontend developer. The curriculum covers modern Vue.js 3 development using the Composition API, Single File Components, client-side routing with Vue Router, state management with Pinia, form validation, API integration, component design patterns, automated testing with Vitest and Vue Test Utils, performance optimization techniques, server-side rendering with Nuxt 3, and culminates in a capstone project that demonstrates all learned skills. Each week combines conceptual learning with hands-on coding exercises.

## Curriculum

### Week 1: Vue.js 3 & Vite Setup
- Introduction to Vue.js 3 ecosystem and reactivity model
- Scaffolding projects with `npm create vue@latest` and Vite
- Understanding the project structure: `src/`, `public/`, `vite.config.js`
- Running the dev server and building for production
- **Exercise**: Scaffold a new Vue project with Vue Router and Pinia enabled, explore the default file structure

### Week 2: Composition API Deep Dive
- `ref` vs `reactive`: when to use each
- `computed` properties and caching behavior
- `watch` vs `watchEffect`: use cases and differences
- `toRef` and `toRefs` for destructuring reactivity
- Advanced patterns: composable functions for logic reuse
- **Exercise**: Build a reactive counter app and a currency converter composable

### Week 3: Single File Component Patterns
- `<script setup>` syntax and its advantages
- Template syntax: interpolations, directives, class and style bindings
- Scoped styles, CSS modules, and deep selectors (`:deep()`)
- Dynamic components with `<component :is="">`
- **Exercise**: Build a tabbed interface component with dynamic rendering

### Week 4: Routing with Vue Router
- Creating router instance with `createRouter` and `createWebHistory`
- Named routes, nested routes, and dynamic route matching
- Navigation guards: `beforeEach`, `beforeEnter`, `beforeRouteLeave`
- Route meta fields and transition animations
- Lazy loading route components for code splitting
- **Exercise**: Build a multi-page dashboard with nested user profiles and auth guards

### Week 5: State Management with Pinia
- Setting up Pinia in a Vue 3 application
- Setup stores (Composition API style) vs Options stores
- Getters for derived state and computed properties
- Actions for synchronous and asynchronous mutations
- Plugins: persisting state with `pinia-plugin-persistedstate`
- **Exercise**: Build a shopping cart store with add/remove/update functionality

### Week 6: Forms and Validation
- Two-way binding with `v-model` on form elements
- Custom `v-model` components with `modelValue` and `update:modelValue`
- Form validation patterns: manual validation, computed validation errors
- Using libraries: VeeValidate with Zod/Yup schemas
- **Exercise**: Build a multi-step registration form with real-time validation

### Week 7: API Integration
- Fetching data with the native Fetch API and Axios
- Loading, empty, and error state patterns
- Aborting requests with `AbortController`
- Interceptors in Axios for auth tokens and error handling
- Caching and deduplication strategies for API calls
- **Exercise**: Build a product listing page with search, pagination, and error handling

### Week 8: Component Design Patterns
- Props validation with `defineProps` and TypeScript
- Emits typing with `defineEmits`
- Slots: default, named, scoped slots for render delegation
- `provide` / `inject` for dependency injection across deep component trees
- Higher-order components and renderless components
- **Exercise**: Build a reusable data table component with sortable columns and action slots

### Week 9: Testing with Vitest and Vue Test Utils
- Setting up Vitest in a Vue 3 project
- Writing unit tests for composables and utility functions
- Mounting components with `mount` and `shallowMount`
- Testing props, emits, slots, and reactivity
- Mocking API calls with `vi.mock`
- **Exercise**: Write tests for the shopping cart store and data table component

### Week 10: Performance Optimization
- Lazy loading components with `defineAsyncComponent`
- Using `KeepAlive` to cache component state
- `Suspense` for async dependency handling
- Memoization with `computed` and `v-memo`
- Virtual scrolling with libraries like `vue-virtual-scroller`
- Bundle analysis with `vite-plugin-inspect` and `rollup-plugin-visualizer`
- **Exercise**: Optimize a large list component with virtual scrolling and lazy loading

### Week 11: SSR with Nuxt 3
- Introduction to Nuxt 3 architecture and conventions
- File-based routing in the `pages/` directory
- Server routes with `server/api/` and `server/routes/`
- Data fetching with `useFetch`, `useAsyncData`, and `$fetch`
- Auto-imports, modules, and the Nuxt configuration
- Deployment targets: Node.js server, Vercel, Netlify
- **Exercise**: Migrate an existing Vue SPA to Nuxt 3 with SSR

### Week 12: Capstone Project
- Design and build a complete full-stack application using Vue.js 3
- Must include: Composition API, Vue Router with guards, Pinia state management, form validation, API integration, unit tests, and performance optimizations
- Optional: Nuxt 3, TypeScript, i18n, E2E tests with Playwright
- Present project architecture, challenges, and solutions

## Final Project

Students will build a **Task Management Application** (Jira-style) with the following requirements:

- User authentication with login/register forms (JWT-based)
- Project and task CRUD operations with a REST API (can use JSON Server or a real backend)
- Drag-and-drop task board with kanban columns (To Do, In Progress, Done)
- Real-time search and filtering by status, priority, and assignee
- Dashboard with charts showing task statistics
- Responsive design with Vue transitions and animations
- Unit tests for stores and components (minimum 80% coverage on critical paths)
- Optional: Nuxt 3 SSR deployment, dark mode (tailwindcss), E2E tests

## Assessment Criteria

- **Weekly Assignments (40%)**: Each week has a coding exercise evaluated on correctness, code quality, and adherence to Vue.js best practices.
- **Final Project (50%)**: Evaluated on architecture design, code organization, feature completeness, testing coverage, and performance.
- **Participation & Code Reviews (10%)**: Peer review contributions and engagement in discussions.

## References

- [Official Vue.js Documentation](https://vuejs.org/guide/introduction.html)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils Guide](https://test-utils.vuejs.org/)
- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [VeeValidate Documentation](https://vee-validate.logaretm.com/v4/)
- [Awesome Vue](https://github.com/vuejs/awesome-vue) — curated list of Vue resources
