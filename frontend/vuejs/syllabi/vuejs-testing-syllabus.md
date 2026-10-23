---
title: "Vue.js Testing Syllabus"
description: "A 6-module curriculum that takes Vue.js 3 developers from first unit tests to a wired CI quality gate, covering component testing, end-to-end flows, mocking strategy, and coverage policy."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Vue.js Testing Syllabus

## Overview

Most Vue.js teams do not fail because they lack tests — they fail because the tests they have are slow, brittle, or assert the wrong things. This syllabus teaches testing as a design discipline rather than an afterthought: each module adds one layer of confidence and one layer of cost, so participants learn where a test belongs and what it must prove.

The course runs as six modules over six weeks, sized for working developers at roughly five to seven hours per week. It assumes Vue 3 with the Composition API and Vite, and deliberately keeps the tool count small: Vitest and Vue Test Utils for unit and component tests, Playwright for end-to-end journeys, MSW for network boundaries, and GitHub Actions for the pipeline. Every module ends with a hands-on lab on one shared application that grows throughout the course, so the final weeks inherit real tests instead of throwaway exercises.

## Curriculum

### Module 1: Unit Testing Foundations

- Why the testing pyramid still holds for frontend work: cost per test, feedback speed, and failure diagnosis
- Project setup: Vitest through the Vite plugin, `environment: "jsdom"`, script wiring in `package.json`
- Test anatomy: Arrange-Act-Assert, behavior-first names, one reason to fail per test
- Assertion style: `expect` matchers that matter (`toEqual`, `toStrictEqual`, `toThrow`, `toMatchObject`)
- Testing pure logic first: formatters, validators, reducers, URL builders — the cheapest tests you will write
- Structure and discovery: co-located `*.spec.ts` files, `describe` nesting, shared setup via `beforeEach`
- Watch mode discipline: `vitest --watch` while developing, the full suite in the pre-push hook
- **Lab**: Extract three utility modules from the course app and cover them, including error paths

### Module 2: Component Testing with Vue Test Utils

- `mount` versus `shallowMount`: isolation benefits against refactor resistance
- Driving components through their public surface: props in, `emitted()` out, slots rendered
- Async behavior: `flushPromises`, `nextTick`, and awaiting `onMounted` fetches without arbitrary sleeps
- Query strategy: role and label based queries from Testing Library, `data-testid` as a last resort
- Stubbing children, globals, and plugins: `global.stubs`, `global.mocks`, router and Pinia in tests
- Testing states rather than internals: loading, empty, error, and populated rendering
- Snapshot discipline: inline snapshots for small stable output, none for large DOM trees
- **Lab**: Fully test a data-table component and a multi-step form, including validation and submit paths

### Module 3: End-to-End Testing with Playwright

- What only e2e can prove: routing, real browser APIs, and integration with the backend contract
- Playwright setup for a Vite app: `webServer`, `baseURL`, trace on first retry, screenshot on failure
- Page Object Model: encapsulating selectors and flows so specs read like user stories
- Test data strategy: factories, per-test API seeding, isolation between parallel workers
- Authenticated journeys: storage-state reuse instead of logging in through the UI on every test
- Debugging failures: trace viewer, `--ui` mode, asserting on network responses when the DOM lies
- CI cost control: tag slow specs, smoke set on every push, full suite nightly
- **Lab**: Write the purchase journey — browse, cart, checkout, confirmation — on two viewports

### Module 4: Mocking Strategy and Test Boundaries

- The mocking ladder: real implementation, fake, stub, spy, and module mock — and when each is honest
- Vitest module mocking with `vi.mock` and hoisting rules, plus `vi.importActual` for partial mocks
- Spies and call assertions: `vi.spyOn`, `mockResolvedValue`, restoring state between tests
- Network boundaries with MSW: handlers per endpoint, `server.use` overrides per test, unhandled-request failures
- Faking time and randomness: `vi.useFakeTimers`, `vi.setSystemTime`, deterministic IDs
- Mock hygiene: why over-mocking hides bugs, how to keep fakes aligned with the real contract
- Contract drift: export MSW handlers so e2e stubs and component tests share one fixture source
- **Lab**: Replace ad-hoc fetch stubs with MSW handlers and remove three brittle mocks

### Module 5: Coverage Strategy and Test Economics

- Coverage providers (`v8`, `istanbul`) and what each metric actually measures
- Reading a coverage report critically: uncovered branches matter more than uncovered lines
- Policy design: global thresholds, per-directory thresholds, and diff coverage on pull requests
- Where 100% is worth it (money math, auth guards, parsers) and where it is theater (generated code, wrappers)
- Detecting weak suites with mutation testing on a critical module
- Test suite performance: parallel workers, `isolate: false` trade-offs, splitting unit and e2e runs
- Time budgets: under 90 seconds for unit tests, under 10 minutes for the e2e suite
- **Lab**: Set a coverage policy for the course app and document two justified exclusions

### Module 6: Continuous Integration and Quality Gates

- Pipeline topology: what runs on pull requests, what runs on main, what runs nightly
- GitHub Actions workflow: caching pnpm/npm, matrix sharding of Vitest, Playwright browser install
- Artifacts and reporting: JUnit XML, HTML reports, traces and videos on failure, PR annotations
- Failing fast without failing often: required checks, branch protection, and skip policies
- Secrets and environment parity for e2e against a preview deployment
- The quality dashboard: coverage trend, flake rate, mean time to green
- Rollout strategy: run new gates in shadow mode for two weeks before making them required
- **Lab**: Ship the full pipeline and open a deliberately broken PR to prove the gate blocks it

## Final Project

Participants deliver a tested Vue.js 3 application (the course app, extended with one feature of their choosing) plus the pipeline that guards it. Required deliverables: a unit suite for all business logic, component tests covering every interactive state, an e2e suite for at least three critical journeys with page objects, MSW-based network mocking shared between unit and component tests, an enforced coverage policy including diff coverage, and a GitHub Actions workflow that runs everything on pull requests and publishes reports. A short written testing strategy memo must justify every layer, name what is deliberately not tested, and state the maintenance cost the team is accepting.

## Assessment Criteria

- **Assignments**: Weekly labs are graded on test quality, not count. A test that would pass against a broken implementation scores zero. Graders look for behavior-focused assertions, deterministic async handling, minimal mocking, and readable names.
- **Quizzes**: A short quiz per module covers trade-off reasoning — pyramid placement, mock boundaries, threshold policy, and gate design.
- **Peer review**: Each participant reviews one peer pull request against a shared test-quality checklist.
- **Final Project**: Evaluated with a checklist: all layers green, coverage policy enforced in CI, e2e suite stable across three consecutive runs, no `sleep` calls in specs, reports published as artifacts, and the strategy memo consistent with the code actually shipped. Bonus credit for removing an existing flaky test with a documented root cause.
- **Pass bar**: 70% overall with the final project passed; the final project cannot be compensated by quiz scores.

## References

- [Vue.js testing guide](https://vuejs.org/guide/scaling-up/testing.html)
- [Vitest documentation](https://vitest.dev/guide/) — runner, mocking, timers, coverage
- [Vue Test Utils](https://test-utils.vuejs.org/) — mounting, events, stubs, slots
- [Vue Testing Library](https://testing-library.com/docs/vue-testing-library/intro/)
- [Playwright documentation](https://playwright.dev/docs/intro)
- [MSW — Mock Service Worker](https://mswjs.io/docs/)
- [Pinia testing cookbook](https://pinia.vuejs.org/cookbook/testing.html)
- [StrykerJS mutation testing](https://stryker-mutator.io/docs/)
- [GitHub Actions — workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Kent C. Dodds — Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Testing Vue components with Vitest (Vue School)](https://vueschool.io/articles/vuejs-tutorials/testing-vue-components-with-vitest/)
