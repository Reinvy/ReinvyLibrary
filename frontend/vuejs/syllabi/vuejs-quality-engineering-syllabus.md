---
title: "Vue.js Quality Engineering Syllabus"
description: "An 8-week advanced curriculum covering the full quality-engineering stack for Vue.js 3 applications: testing strategy and the frontend testing pyramid, unit testing with Vitest and Vue Test Utils, composable and Pinia store testing, component and interaction testing, end-to-end testing with Playwright, visual regression and accessibility testing, mutation and contract testing, performance budgets, and CI/CD quality gates with a production-grade capstone quality pipeline."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Vue.js Quality Engineering Syllabus

## Overview

This 8-week syllabus is designed for Vue.js developers who want to move beyond "it works on my machine" and build measurable, repeatable confidence in frontend codebases. Quality engineering treats testing as a discipline: every layer of the test pyramid is deliberate, every test earns its place, and every merge is gated by automated quality signals rather than manual clicking. The curriculum covers unit testing with Vitest and Vue Test Utils, isolated testing of composables and Pinia stores, component and interaction testing, end-to-end testing with Playwright, visual regression and accessibility auditing, mutation and contract testing, performance budgets, and the CI/CD plumbing that turns all of it into a quality gate. By the end, participants will have built a complete quality pipeline for a realistic Vue.js application — one that runs hundreds of tests, blocks regressions, and produces a readable quality report on every pull request.

## Curriculum

### Week 1: Testing Strategy and the Vue Testing Landscape

- The failure modes of manual QA: regression blindness, click-fatigue, and the cost of late discovery
- The frontend testing pyramid: unit → component → e2e, and where Vue apps actually fail
- What to test in a Vue application: props and emits, derived state, user flows, rendered output; what not to test: framework internals, implementation details, beautiful snapshots of everything
- Test structure and naming: Arrange-Act-Assert, behavior-driven test names, per-feature test file layout
- Setting up the runner: Vitest with `jsdom` and `happy-dom`, `vite.config.ts` test section, globals vs explicit imports
- Code coverage tooling: `v8` provider, coverage thresholds, and the economics of coverage (which lines deserve 100%)
- **Exercise**: Scaffold a Vite + Vue 3 project with Vitest configured, add a CI runnable `npm run test` script, and write the first unit test for a pure utility function

### Week 2: Unit Testing Fundamentals with Vitest and Vue Test Utils

- Mounting strategies: `mount` vs `shallowMount`, when stubbing child components is the right call, and the trade-off with refactor resistance
- Testing component input surface: `props` variations, `defineProps` defaults, `defineEmits` payload assertions with `emitted()`
- Testing slots and scoped slots: rendering slot content, asserting slot props
- Async component behavior: `flushPromises`, `nextTick`, awaiting nested updates, testing `onMounted` fetches
- Mocking strategies: `vi.mock` module mocks, `vi.spyOn` partial spies, `vi.fn` call assertions, `vi.stubGlobal` for browser APIs
- Asserting rendered output: text and structure queries, data-testid conventions, avoiding over-assertion
- **Exercise**: Unit-test a data table component — props-driven rendering, emit on row select, loading and empty states, async data loading

### Week 3: Testing Composables and Pinia Stores in Isolation

- Why composables deserve their own test harness: logic extracted from the component tree
- Testing reactive state: asserting `ref`/`reactive` mutations after composable calls, effect scheduling with `effectScope`
- Testing `computed` and `watch`: derived-state assertions, watch callback firing conditions, cleanup behavior
- Testing time-based logic: Vitest fake timers (`vi.useFakeTimers`), debounce/throttle composables, polling loops
- Testing Pinia stores with `createTestingPinia`: store unit tests without a real app, mocking store dependencies
- Testing store actions that call APIs: injecting a mocked client, asserting loading/error/success state transitions
- Testing `provide`/`inject` pairs: writing harness components that consume injected keys
- **Exercise**: Extract a `usePagination` composable and a `useAuthStore` Pinia store from an existing app, then write full unit suites for both

### Week 4: Component and Interaction Testing Patterns

- From `trigger` to `user-event`: realistic interaction simulation, `@testing-library/user-event`, keyboard and pointer semantics
- Testing complex flows: multi-step forms, dependent fields, validation error display, submit paths
- Router testing: `createRouter` with `createMemoryHistory`, mocking `useRoute`/`useRouter`, asserting navigation after actions
- Testing teleport and transition components: `Teleport` target mounting, transition stubbing, `TransitionStub`
- Testing provide/inject boundaries and component composition: wrapper components, `global.provide`
- Testing error boundaries and suspense: `onErrorCaptured` assertions, async component fallback content
- Flaky-test hygiene: deterministic selectors, avoiding timing sleeps, scoping queries
- **Exercise**: Build and test an interactive checkout form — validation states, cart summary reactivity, order submission with route navigation

### Week 5: End-to-End Testing with Playwright

- E2E philosophy: user journeys over page snippets, keeping the suite fast enough to run on every PR
- Playwright project setup for Vue apps: webServer config, baseURL, trace and screenshot on failure
- The page object model: encapsulating selectors and actions, readable test scenarios in plain language
- Network interception and mocking: `page.route`, API stubbing for deterministic e2e runs, aborting third-party requests
- Fixtures and test data: factory functions, seeded backend state, per-test isolation
- Cross-browser and mobile viewport testing: browser projects, devices presets, responsive assertions
- Debugging e2e failures: trace viewer, `--ui` mode, step-by-step inspection
- **Exercise**: Write a full purchase-journey e2e suite — product listing, cart, checkout, order confirmation — with mocked API responses and mobile viewport coverage

### Week 6: Visual Regression and Accessibility Testing

- Why visual regressions escape unit tests: CSS, rendering engines, and layout context
- Visual testing with Storybook + Chromatic: story coverage as the visual contract, review workflows, baselines and approval
- Snapshot strategy and maintenance: when snapshots help (icons, charts, design tokens) and when they become noise
- Accessibility testing: axe-core integration (`jest-axe` in component tests, `@axe-core/playwright` in e2e), WCAG 2.2 AA checks
- Keyboard navigation and focus management testing: tab order, focus traps, skip links
- Color contrast and text scaling: automated contrast assertions, manual verification checklists
- Building an a11y regression gate: axe failures fail CI, severity thresholds, a11y storybook addon
- **Exercise**: Add visual regression coverage to a design-system component set and wire axe-core into both the component suite and the e2e suite

### Week 7: Advanced Quality Techniques

- Mutation testing with StrykerJS: measuring test effectiveness, `kill` rates, surviving-mutant triage, incremental mutation runs
- Contract testing: MSW for API contract simulation in tests, Pact for consumer-driven contracts with backend teams
- Property-based testing with `fast-check`: generating inputs, invariant assertions, shrinking failing cases
- Test data engineering: factories with Faker, seeders, avoiding shared mutable fixtures
- Performance testing: Lighthouse CI budgets (LCP, TBT, CLS, bundle size), performance regression gates, profiling workflows
- Flaky test management: quarantine strategy, retry policy, root-cause analysis, flake dashboarding
- Testing performance-sensitive code: CPU profiling in tests, large-list virtualization assertions
- **Exercise**: Run Stryker on the Week 2 component suite, fix the weakest mutant clusters, and add a Lighthouse CI budget to the pull-request workflow

### Week 8: Quality Gates and CI/CD Integration

- Designing the merge quality gate: which suites run on which events (PR, push to main, nightly), parallelism and sharding
- Coverage thresholds as policy: diff coverage vs total coverage, failing the build on uncovered changed lines
- CI pipeline design: GitHub Actions workflow for Vitest, Playwright, Chromatic, Lighthouse CI; artifact and report publishing
- Test reporting and visibility: JUnit XML, coverage badges, quality dashboards, trend tracking
- Branch protection in practice: required checks, status checks wiring, review requirements
- Quality culture and metrics: defect escape rate, time-to-green, flake rate; using metrics to drive process change
- The quality engineering role: evangelizing gates, writing testability improvements into components, mentoring
- **Capstone integration**: assemble every layer from Weeks 1-7 into one production-quality pipeline
- **Exercise**: Deploy the capstone quality pipeline on a real repository and produce a written quality report covering coverage, mutation score, a11y findings, performance budgets, and flake history

## Final Project

Participants build a **quality pipeline** for a realistic Vue.js 3 application (a dashboard-style app with forms, data tables, composable-driven logic, and routed navigation). The deliverable is a working pipeline that runs on every pull request and includes: a unit and component suite with diff-coverage enforcement, an e2e suite covering the primary user journeys, visual regression baselines for the design-system components, axe-driven accessibility gating, a Stryker mutation score above an agreed threshold for critical modules, a Lighthouse CI performance budget, and a CI workflow that reports all signals in a pull-request comment. A written quality report documents the strategy, the metrics, and how each gate changed the team's ability to ship confidently.

## Assessment Criteria

- **Assignments**: Weekly exercises are graded on test quality rather than volume: meaningful assertions (no tautological tests), correct isolation of units, deterministic async handling, and appropriate mocking boundaries. Each week includes a short quiz on the week's concepts (testing-pyramid trade-offs, mocking strategies, gate design).
- **Final Project**: The capstone pipeline is validated against a checklist: every test layer present and green, coverage diff enforcement active, mutation score meets the agreed threshold, e2e suite runs on the CI workflow, a11y and performance gates wired in, reports published, and the written quality report accurately reflects the measured signals. Credit is also given for defensible exclusions — tests deliberately skipped with a documented reason are worth more than tests written to inflate coverage.

## References

- [Vitest documentation](https://vitest.dev/) — test runner, mocking, fake timers, coverage
- [Vue Test Utils](https://test-utils.vuejs.org/) — mounting, emitted events, slots, stubs
- [Testing Library — Vue Testing Library](https://testing-library.com/docs/vue-testing-library/intro/) — user-centric queries and interactions
- [Playwright documentation](https://playwright.dev/docs/intro) — e2e testing, page objects, network interception
- [Pinia testing guide](https://pinia.vuejs.org/cookbook/testing.html) — store unit testing with `createTestingPinia`
- [StrykerJS](https://stryker-mutator.io/) — mutation testing
- [MSW (Mock Service Worker)](https://mswjs.io/) — API mocking in tests
- [Pact](https://docs.pact.io/) — consumer-driven contract testing
- [fast-check](https://fast-check.dev/) — property-based testing
- [axe-core](https://github.com/dequelabs/axe-core) — accessibility rule engine
- [Chromatic](https://www.chromatic.com/) — visual regression testing for Storybook
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) — performance budgets and gates
