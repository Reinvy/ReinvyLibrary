---
title: "React Native Testing Guide"
description: "A comprehensive guide to testing React Native applications — from Jest unit tests and React Native Testing Library component tests to Detox end-to-end suites, with CI integration and coverage guardrails."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# React Native Testing Guide

## Introduction

React Native apps are harder to test than plain React web apps for three concrete reasons: the JavaScript code runs on a separate thread from the native UI, a large share of the functionality lives inside native modules that do not exist in a Node.js test environment, and the app targets multiple platforms with subtly different runtime behavior. A test suite written without accounting for these constraints either tests nothing meaningful (everything mocked away) or collapses under maintenance weight (every keystroke of UI interaction asserting implementation details).

This guide establishes a testing strategy that works at every level of your React Native application: fast unit tests for business logic, component and integration tests with React Native Testing Library that simulate real user interaction, and a deliberately small end-to-end suite with Detox or Maestro that validates the critical journeys on an actual simulator or emulator. You will learn how to configure Jest correctly for native projects, mock native modules at the right boundaries, keep asynchronous tests deterministic, and wire the whole pipeline into CI with coverage thresholds that act as guardrails rather than vanity metrics.

## Best Practices

### Test at the Level of the Pyramid That Fits the Risk

The testing pyramid maps to React Native economics directly. A unit test costs milliseconds and runs thousands at a time inside Jest; a Detox test boots a simulator, installs the app, and can take minutes per scenario — and it is charged against your CI pipeline on every run. Push the bulk of your test effort into the fast layers: pure logic (validators, date utilities, reducers, API mappers), hooks, and component behavior. Reserve end-to-end tests for the handful of journeys where the integration of many moving parts is itself the risk: onboarding, authentication, checkout, and deep-link entry points.

```text
        /\
       /  \      End-to-end (Detox / Maestro): 5-15 critical journeys
      /    \
     /------\    Integration (RNTL + mocks): screen-level flows
    /        \
   /----------\  Unit (Jest): business logic, hooks, utilities
  /____________\
```

### Query Like a User, Not Like an Implementation

React Native Testing Library (RNTL) provides queries that mirror how a user experiences the app. Prefer `getByRole`, `getByText`, and `getByPlaceholderText` before reaching for `getByTestId` — they keep tests coupled to visible behavior. Reserve `testID` for the cases no accessible query can express: a pressable icon button with no text, or a list item whose label is duplicated across the screen. Add `testID` as a first-class part of the component API (the same identifier doubles as the Detox hook), and never assert on internal state variables or prop values that are invisible to the user — that is testing the implementation, which is allowed to change.

```tsx
// ❌ Tests the implementation, breaks when styling or layout refactors
expect(screen.getByTestId('submit-button')).toHaveStyle({ backgroundColor: '#6200EE' });

// ✅ Tests observable behavior
await userEvent.press(screen.getByRole('button', { name: 'Create Account' }));
expect(await screen.findByText('Welcome back!')).toBeOnTheScreen();
```

### Mock Native Modules at the Boundary, Not in Every Test

Native modules — AsyncStorage, `expo-location`, `react-native-maps`, InAppPurchases — cannot run in Node. The temptation is to mock them individually inside each test; the result is a test suite where the mocks drift apart from the real API. Instead, define a single `jest.setup.js` that mocks every native module the app touches, share those mocks as the source of truth, and let individual tests override only the slice they care about. Keep the mock surface as small as the module's TypeScript interface — a module mocked to the full shape of its implementation breaks the moment the native side changes.

```tsx
// jest.setup.js — one place that knows how the native boundary behaves
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore[key] = value;
  }),
}));
```

### Keep Async Tests Deterministic

React Native components frequently couple UI updates to promises, timers, and animation frames. Three disciplines prevent flaky tests: use `findBy*` or `waitFor` whenever state resolves asynchronously instead of guessing with `setTimeout`; wrap state updates in `act()` (or rely on RNTL's `userEvent`, which does it for you) so React's warnings surface real bugs instead of being suppressed; and when the component depends on timers or dates, use Jest fake timers in the test that owns that behavior and real timers everywhere else.

```tsx
test('shows the empty state after the feed request fails', async () => {
  (api.fetchFeed as jest.Mock).mockRejectedValueOnce(new Error('offline'));

  render(<HomeScreen />);
  expect(await screen.findByText('Could not load your feed')).toBeOnTheScreen();
  expect(api.fetchFeed).toHaveBeenCalledTimes(1);
});
```

### Test Behavior, Not Implementation Details

A test that passes today and fails after a refactor that does not change any user-visible behavior is a liability, not an asset. Assert on what the user sees and the side effects the screen produces: text rendered, navigation events emitted, API calls issued with the right payload, storage writes performed. If a test needs to reach into the component's internals, that is a signal the behavior is not expressed through a clean observable interface — restructure the component rather than loosening the test.

```tsx
// ❌ Brittle — asserts on internal counter state
expect(wrapper.instance().state.count).toBe(1);

// ✅ Stable — asserts on the consequence of the interaction
await userEvent.press(screen.getByLabelText('Increment'));
expect(screen.getByText('1 item in cart')).toBeOnTheScreen();
```

### Add testID from the Start of the Component API

`testID` is the contractual surface between your UI and your tests, at every level: RNTL for integration tests, Detox and Maestro for E2E. Decide the identifier when the component is written — a stable, descriptive name scoped to its screen (`checkout.pay-button`, `feed.item-3`) — and treat its absence in a merged PR as a review issue. Screen-scoped prefixes keep identifiers unique across an app that grows, which is a hard requirement for E2E selectors that scan the whole rendered tree.

### Keep End-to-End Coverage Small and High-Value

Cost-per-test is the deciding factor. Every E2E scenario multiplies across iOS and Android configurations, adds minutes to CI, and breaks on physical-device variance. Enforce a rule for what earns a place in the E2E suite: the journey must cross at least two of these boundaries — native module, network, navigation, deep link, or third-party SDK. Checkout with a real payment mock, login with biometrics fallback, and a push-notification deep link are canonical examples; a form with two text inputs is not.

### Make Coverage a Guardrail, Not a Goal

`coverageThreshold` is a contract, not a motivator. Set a threshold that the critical code paths comfortably exceed and that catches regressions: enforcing 80% on `utils/`, `hooks/`, and `store/` while keeping the global line threshold lower acknowledges that a screen with forty conditional branches is not where the insurance value lives. Coverage numbers alone say nothing about whether the important behavior is tested — pair the threshold with a short review checklist (loading, error, and empty states covered? navigation effects asserted? native boundary mocked correctly?) that runs in code review.

## Implementation Steps

### Step 1: Scaffold the Testing Stack

Install the testing dependencies. For an Expo project, `jest-expo` provides the platform-aware preset; for a bare React Native project, the `react-native` preset is the baseline. React Native Testing Library v12.4 and later ship their own Jest matchers (`toBeOnTheScreen`, `toHaveTextContent`, `toBeDisabled`), so the deprecated `@testing-library/jest-native` package is not needed.

```bash
# Expo project
npm install --save-dev jest jest-expo @testing-library/react-native @types/jest

# Bare React Native project
npm install --save-dev jest @testing-library/react-native @types/jest
```

### Step 2: Configure Jest

For an Expo app, add the preset and the transform ignore patterns that let Jest compile the ESM-only packages in `node_modules` (Expo, React Navigation, and friends ship untranspiled code). For a bare app, `preset: 'react-native'` plus the same `transformIgnorePatterns` handles the packages that publish untranspiled JavaScript.

```json
{
  "preset": "jest-expo",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))"
  ],
  "collectCoverageFrom": [
    "src/utils/**/*.{ts,tsx}",
    "src/hooks/**/*.{ts,tsx}",
    "src/store/**/*.{ts,tsx}",
    "!src/**/*.types.ts"
  ]
}
```

Add the npm scripts the CI pipeline and developers will call:

```json
{
  "scripts": {
    "test": "jest",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:update": "jest -u"
  }
}
```

### Step 3: Write Component Tests with React Native Testing Library

Component tests render a component in isolation, interact with it the way a user would, and assert on the visible outcome. Use `userEvent` for interactions — it wraps `fireEvent` with realistic timing and automatic `act()` handling.

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { LoginForm } from '../LoginForm';

test('rejects submission with an invalid email', async () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  await userEvent.type(screen.getByPlaceholderText('Email'), 'not-an-email');
  await userEvent.press(screen.getByRole('button', { name: 'Sign In' }));

  expect(await screen.findByText('Enter a valid email address')).toBeOnTheScreen();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('submits valid credentials', async () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  await userEvent.type(screen.getByPlaceholderText('Email'), 'user@example.com');
  await userEvent.type(screen.getByPlaceholderText('Password'), 's3cret!');
  await userEvent.press(screen.getByRole('button', { name: 'Sign In' }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 's3cret!',
  });
});
```

### Step 4: Test Hooks and Business Logic

Hooks are the highest-ROI unit target in a React Native app: they isolate the logic that screens depend on, and they can be tested without rendering a single component. RNTL's `renderHook` gives them an honest React environment, including `act()` for state updates.

```tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProducts } from '../useProducts';

test('loads products and exposes loading and error states', async () => {
  (api.fetchProducts as jest.Mock).mockResolvedValueOnce([{ id: 1, name: 'Chair' }]);

  const { result } = renderHook(() => useProducts('furniture'));

  expect(result.current.isLoading).toBe(true);

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.products).toEqual([{ id: 1, name: 'Chair' }]);
});

test('clears the cart when the session expires', () => {
  const { result } = renderHook(() => useCartStore());

  act(() => result.current.addItem({ id: 1, price: 99 }));
  act(() => result.current.expireSession());

  expect(result.current.items).toHaveLength(0);
});
```

Pure functions — validators, currency formatters, date arithmetic, reducer cases — need no rendering at all. Keep them dependency-free so the plain Jest test stays trivially fast.

```tsx
import { groupByCategory } from '../utils/catalog';

test('groups products by category preserving insertion order', () => {
  const products = [
    { id: 1, category: 'chairs' },
    { id: 2, category: 'tables' },
    { id: 3, category: 'chairs' },
  ];

  expect(groupByCategory(products)).toEqual({
    chairs: [products[0], products[2]],
    tables: [products[1]],
  });
});
```

### Step 5: Mock Native Modules at the Boundary

Centralize native-module mocks in `jest.setup.js` so every test file shares the same contract, then override per-test where a specific behavior matters.

```tsx
// jest.setup.js — shared native boundary mocks
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Marker: View };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: -6.2, longitude: 106.8 },
  })),
}));
```

When a single test needs different behavior, override through the mock's own API — never call `jest.mock` a second time inside the test file body.

```tsx
test('shows the permission prompt when location is denied', async () => {
  (expoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'denied',
  });

  render(<NearbyPlacesScreen />);
  expect(await screen.findByText('Location permission is required')).toBeOnTheScreen();
});
```

For third-party SDKs with heavy native surfaces (maps, analytics, payments), prefer the library's officially published mock when one exists — `async-storage` and `react-native-keychain` ship tested mocks that track the real API more faithfully than a hand-rolled stub.

### Step 6: Add End-to-End Tests with Detox

Detox drives a real simulator or emulator and must synchronize with the app's event loop. Configure it in `.detoxrc.js`, naming the same `testID` identifiers your component tests already use — the contract carries over between the two levels.

```javascript
// .detoxrc.js
module.exports = {
  testRunner: { args: { $0: 'jest', config: 'e2e/jest.config.js' } },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/YourApp.app',
      build: "xcodebuild -workspace ios/YourApp.xcworkspace -scheme YourApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
  },
  devices: {
    simulator: { type: 'ios.simulator', device: { type: 'iPhone 15' } },
  },
  configurations: {
    'ios.sim.debug': { device: 'simulator', app: 'ios.debug' },
  },
};
```

An E2E scenario reads as the user's journey: launch, interact through the UI by `testID` or text, assert on the screen state that results.

```typescript
// e2e/checkout.e2e.ts
describe('Checkout flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('completes a purchase end to end', async () => {
    await element(by.id('checkout.pay-button')).tap();
    await expect(element(by.id('checkout.processing'))).toBeVisible();
    await expect(element(by.id('checkout.success'))).toBeVisible();
  });
});
```

If Detox's native build pipeline feels heavy for a small team, Maestro is a lighter alternative: it drives the app through the accessibility tree with a YAML flow, requires no native build integration, and integrates smoothly into CI.

```yaml
# flow.yaml — Maestro version of the same journey
appId: com.example.yourapp
---
- launchApp
- tapOn:
    id: "checkout.pay-button"
- assertVisible:
    id: "checkout.success"
```

### Step 7: Run Tests in CI

Wire unit, integration, and E2E layers into a GitHub Actions pipeline. Fast layers run on every push; the expensive E2E suite runs on the main branch and on pull requests that touch app code, so the suite pays for itself at merge time.

```yaml
name: test
on:
  push:
    branches: [main, development]
  pull_request:

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:ci

  e2e-ios:
    runs-on: macos-14
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx detox build --configuration ios.sim.debug
      - run: npx detox test --configuration ios.sim.debug
```

For Expo projects, EAS Build provides managed CI without maintaining macOS runners: `eas build` with a `test` profile runs the Jest suite, and EAS Update metadata can gate promotion on test results.

### Step 8: Set Coverage Thresholds and Quality Gates

Make the quality gate enforceable, not aspirational. A threshold that fails the build when the core logic regresses is worth more than a dashboard nobody reads.

```json
{
  "jest": {
    "coverageThreshold": {
      "global": { "lines": 70, "statements": 70, "branches": 60 },
      "./src/utils/": { "lines": 90, "statements": 90, "branches": 80 },
      "./src/hooks/": { "lines": 85, "statements": 85 },
      "./src/store/": { "lines": 85, "statements": 85 }
    }
  }
}
```

Add a second, human gate in the pull-request template asking three questions: are the loading, error, and empty states tested for every new screen; is the native boundary mocked in `jest.setup.js` rather than inline; and does the change add or reuse a `testID` for every interactive element. The combination of an automated threshold and a short checklist keeps the suite honest as the app grows.
