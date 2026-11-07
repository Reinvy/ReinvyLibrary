---
title: "Vue.js Error Handling and Observability Guide"
description: "An advanced guide to making Vue.js 3 applications fail loudly and observably: a global error handler, onErrorCaptured boundaries, async and router error surfaces, correlation IDs, retrying HTTP clients, structured telemetry transport, Sentry and OpenTelemetry wiring, Web Vitals, and symptom-based alerting."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Vue.js Error Handling and Observability Guide

## Introduction

A Vue.js 3 single-page application is a runtime that lives in someone else's browser. When a component throws during render, a watcher rejects, or a store action fails after the user pressed "Pay", the page usually does not crash — it silently renders a blank panel, logs one red line to a console nobody is watching, and keeps accepting clicks. The user sees a broken product; the team sees nothing until a support ticket arrives three days later.

Handling errors and observing a frontend are two halves of the same discipline. Error handling decides what the application *does* when something fails: which surface catches it, whether the user gets a retry or a fallback, and whether the failure is allowed to corrupt application state. Observability decides what the application *tells you* about it: the structured event, the correlation ID that links the browser to the API request, the trace span, the metric that reveals the failure rate is climbing on one browser version and not another.

This guide covers both halves with concrete, runnable patterns for a Vue 3 application built with Vite, TypeScript, Pinia, and Vue Router. It goes beyond "add a global error handler": you will build an error taxonomy, containment boundaries, correlation IDs that survive the client-to-server hop, a batching telemetry transport that respects user privacy, Sentry and OpenTelemetry wiring, Web Vitals instrumentation, and alerts that fire on user-visible symptoms instead of raw error counts.

## Best Practices

### 1. Install a Global Handler as the Last Line of Defense, Not the First

`app.config.errorHandler` catches errors thrown during render, lifecycle hooks, watchers, and event handlers that Vue owns. It is essential — but it is the backstop, not the strategy. A handler that receives every error with no local context produces reports like "Cannot read properties of undefined" with no idea which screen the user was on. Install it on day one, and treat every error it receives as a bug in your own error design: something failed where a boundary should have caught it with better context.

### 2. Know Which Surface Owns Which Failure

Vue exposes several distinct failure surfaces, and each needs a different hook. Guessing wrong is the most common reason errors go unreported.

```text
Surface                        Hook that catches it
-----------------------------  ----------------------------------------------
Component render / setup       app.config.errorHandler, onErrorCaptured
Lifecycle hook, watcher        app.config.errorHandler, onErrorCaptured
Template event handler         app.config.errorHandler, onErrorCaptured
Async setup (Suspense)         onErrorCaptured on an enclosing boundary
await inside a composable      the caller's try/catch (Vue does not own it)
Floating promise rejection     window 'unhandledrejection'
Route guard / chunk load       router.onError, router.isReady().catch()
Failed fetch / XHR status      your HTTP client layer
Vue warnings (dev only)        app.config.warnHandler
```

The key line in that table is the fourth: Vue only catches errors in the synchronous call stack it invoked. Once code awaits, control leaves Vue's ownership and a rejection will not reach the global handler unless it becomes an unhandled rejection at the browser level.

### 3. Place Boundaries at Routed Views, Not Around Every Component

Wrap each routed view (and any independently deployed widget such as a checkout panel or a live dashboard tile) in a boundary component. A boundary per `<div>` multiplies boilerplate and hides errors one level too deep; a single boundary at the app root means one failure blanks the entire shell, including the navigation the user needs to recover.

### 4. Never Leave a Promise Unawaited

A floating promise is an error that disappears. Enable `@typescript-eslint/no-floating-promises` and treat its output as a build failure rather than a warning. Every call to a store action, an API client method, or a dynamically imported chunk should be awaited, caught, or explicitly marked with `void` plus an error path.

### 5. Classify Before You Report

Not every failure is an incident. Split errors into three classes and route each one differently: *expected* failures (validation, 401 after token expiry, 404, offline), *recoverable* failures (timeout, 5xx on a read, transient network loss), and *defects* (render crash, undefined access, schema mismatch, unhandled rejection). Expected failures belong in product analytics, recoverable ones in a retry path with a metric, and defects in the error tracker with full context. Mixing all three into one stream is why teams mute their alert channels.

### 6. Send Context, Not Just a Message

An error report without a route, a component name, a build SHA, and the last few user actions is nearly worthless. Attach a normalized payload: error class, message, stack, route name and params (scrubbed), component name, app version and git SHA, browser and locale, plus a bounded breadcrumb ring buffer of the last twenty user actions and API calls.

### 7. Give Every Request a Correlation ID

Generate a client-side ID per user action (not per HTTP request) and send it as `X-Correlation-Id`. Log it in the browser telemetry payload and have the backend echo it into its logs. When a user reports "it failed at checkout", that single ID connects the click, the browser error, the API request, the server stack trace, and the database query.

### 8. Degrade Gracefully, and Retry Only What Is Safe

A good failure keeps the application usable: show a fallback panel with a retry button, keep the surrounding navigation alive, and preserve unsaved input. Retry reads and idempotent writes with exponential backoff and jitter; never blindly retry `POST` endpoints that create money-moving side effects unless they accept an idempotency key. Cap retries, then surface a real message instead of spinning forever.

### 9. Treat Telemetry as Personal Data

Error payloads routinely leak emails in messages, tokens in URLs, and card fragments in request bodies. Scrub before sending: strip query strings on sensitive routes, redact known field names, truncate bodies, and never send `localStorage` or form values wholesale. Respect consent state, and keep a documented allowlist of what the payload may contain.

### 10. Sample and Batch the Client Pipeline

Telemetry must never become the reason the app is slow. Buffer events in memory, flush on a timer or when the buffer fills, and use `navigator.sendBeacon` during `pagehide` so the last events survive navigation. Sample verbose events (route changes, successful requests) aggressively while keeping defects at full rate — a volume spike during an incident is exactly when you need complete defect data.

### 11. Instrument the Journey, Not Just the Crash

An error with no surrounding context cannot be prioritized. Record the user journey — page views, key business events, API latency, and Web Vitals such as LCP and INP — so a defect report shows what the user was trying to do and whether the page was already slow. A checkout failure on a page with 4-second LCP is a different problem from the same failure on a fast page.

### 12. Alert on Symptoms, Close the Loop with Tests

Alert on user-visible outcomes — error rate per session, checkout success rate, route-level failure ratio — rather than raw counts, which scale with traffic and time of day. And close the loop: every defect that reaches production earns a regression test, a boundary that would have caught it earlier, or a documented known-issue entry with an owner.

## Implementation Steps

### Step 1: Define the Error Taxonomy and Telemetry Contract

Start with types, because every later step depends on them. The taxonomy is a discriminated union: the `kind` field decides whether an error is retried, shown to the user, or reported as a defect.

```typescript
// src/telemetry/types.ts
export type ErrorKind = 'expected' | 'recoverable' | 'defect';

export interface TelemetryContext {
  correlationId: string;
  routeName: string;
  routeParams: Record<string, string>;
  component?: string;
  appVersion: string;
  gitSha: string;
  sessionId: string;
}

export interface TelemetryEvent {
  type: 'error' | 'event' | 'metric';
  name: string;
  kind?: ErrorKind;
  message?: string;
  stack?: string;
  durationMs?: number;
  value?: number;
  breadcrumbs?: Array<{ at: number; action: string; detail?: string }>;
  context: TelemetryContext;
  timestamp: number;
}
```

Then create the app-level helpers that will tag every event consistently. Reading values from Vite's `import.meta.env` keeps version and SHA in one place.

```typescript
// src/telemetry/trace.ts
let counter = 0;

export function newCorrelationId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${(counter++).toString(36)}-${random}`;
}

export function newSessionId(): string {
  const key = 'telemetry.session';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const created = newCorrelationId();
  sessionStorage.setItem(key, created);
  return created;
}
```

Keep the breadcrumb buffer small and bounded; an unbounded log is a memory leak that reproduces itself in every report.

```typescript
// src/telemetry/breadcrumbs.ts
export interface Breadcrumb {
  at: number;
  action: string;
  detail?: string;
}

const MAX = 20;
const buffer: Breadcrumb[] = [];

export function addBreadcrumb(action: string, detail?: string): void {
  buffer.push({ at: Date.now(), action, detail });
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...buffer];
}
```

### Step 2: Classify Errors into a Normalized Shape

Browsers produce errors in at least four shapes: `Error`, `DOMException`, a rejected string, and an axios/fetch wrapper. Normalize them once, at the boundary, so downstream code never branches on shape.

```typescript
// src/telemetry/normalize.ts
export interface NormalizedError {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

export function normalizeError(value: unknown): NormalizedError {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack, cause: value.cause };
  }
  if (typeof value === 'string') {
    return { name: 'StringRejection', message: value };
  }
  if (value && typeof value === 'object') {
    const candidate = value as { message?: unknown; name?: unknown };
    return {
      name: typeof candidate.name === 'string' ? candidate.name : 'UnknownObject',
      message: typeof candidate.message === 'string' ? candidate.message : JSON.stringify(value).slice(0, 500),
    };
  }
  return { name: 'Unknown', message: String(value) };
}
```

Classification belongs next to normalization, keyed on HTTP status and a small set of application codes.

```typescript
// src/telemetry/classify.ts
import type { ErrorKind } from './types';

export function classifyHttpStatus(status: number): ErrorKind {
  if (status === 401 || status === 403) return 'expected';
  if (status === 404 || status === 422 || status === 429) return 'expected';
  if (status >= 500) return 'recoverable';
  return 'defect';
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
```

### Step 3: Install the Global Handler and a Warning Handler

The global handler is intentionally dumb: normalize, attach context, forward to the transport, and never re-throw (throwing inside the handler produces an infinite loop in some browsers).

```typescript
// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { reportError } from './telemetry/report';
import { normalizeError } from './telemetry/normalize';

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  const normalized = normalizeError(err);
  reportError({
    ...normalized,
    kind: 'defect',
    component: instance?.$options.name ?? 'anonymous',
    detail: info,
  });
};

app.config.warnHandler = (msg, instance, trace) => {
  if (import.meta.env.PROD) {
    reportError({ name: 'VueWarning', message: msg, kind: 'defect', detail: trace });
    return;
  }
  console.warn(msg, trace);
};

app.use(router);
app.mount('#app');
```

Note the environment split on the warning handler: warnings are noise in development and defects in production, because a production build should never emit one.

### Step 4: Build a Boundary Component with a Real Fallback

`onErrorCaptured` lets a subtree absorb a failure, report it with component context, and render a fallback instead of a blank screen. Returning `false` stops propagation to the global handler — do that only when the boundary genuinely recovered.

```vue
<!-- src/components/ErrorBoundary.vue -->
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import { reportError } from '@/telemetry/report';
import { normalizeError } from '@/telemetry/normalize';

const props = defineProps<{ name: string; title?: string }>();
const failed = ref(false);
const lastMessage = ref('');

onErrorCaptured((err, instance, info) => {
  const normalized = normalizeError(err);
  lastMessage.value = normalized.message;
  failed.value = true;
  reportError({
    ...normalized,
    kind: 'defect',
    component: props.name,
    detail: info,
  });
  return false;
});

function reset() {
  failed.value = false;
  lastMessage.value = '';
}
</script>

<template>
  <div v-if="failed" class="boundary-fallback" role="alert">
    <h2>{{ title ?? 'This section failed to load' }}</h2>
    <p class="boundary-detail">{{ lastMessage }}</p>
    <button type="button" @click="reset">Try again</button>
    <a href="/support">Contact support</a>
  </div>
  <slot v-else />
</template>
```

`role="alert"` makes the fallback announce itself to screen readers, and the retry button gives the user a way out without reloading the whole application.

### Step 5: Cover the Async Surfaces Vue Does Not Own

Three async surfaces escape component boundaries: route guards and lazy chunk loads, floating promise rejections, and errors thrown after an `await` inside a composable. Handle each explicitly.

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { reportError } from '@/telemetry/report';
import { normalizeError } from '@/telemetry/normalize';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/views/CheckoutView.vue'),
    },
  ],
});

router.onError((err, to) => {
  const normalized = normalizeError(err);
  const isChunkError = /dynamically imported module|Loading chunk/i.test(normalized.message);
  reportError({
    ...normalized,
    kind: isChunkError ? 'recoverable' : 'defect',
    component: 'router',
    detail: `navigation to ${to.fullPath}`,
  });
});
```

A failed chunk load after a deploy is the classic "white screen on the old tab" bug. Treat it as recoverable and force one reload with a cache-busting guard instead of reporting it as a defect every time.

```typescript
// src/telemetry/global-listeners.ts
import { addBreadcrumb } from './breadcrumbs';
import { reportError } from './report';
import { normalizeError } from './normalize';

const RELOAD_KEY = 'chunk.reloadAt';

export function installGlobalListeners(): void {
  window.addEventListener('unhandledrejection', (event) => {
    const normalized = normalizeError(event.reason);
    const chunkFailure = /dynamically imported module|Loading chunk/i.test(normalized.message);

    if (chunkFailure) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
        return;
      }
    }

    reportError({ ...normalized, kind: 'defect', component: 'window' });
  });

  window.addEventListener('error', (event) => {
    const normalized = normalizeError(event.error ?? event.message);
    reportError({ ...normalized, kind: 'defect', component: 'window' });
  });

  addBreadcrumb('app:listeners-installed');
}
```

Composables that await need their own guard, because the rejection never reaches Vue. A small wrapper keeps every call site honest.

```typescript
// src/utils/guard.ts
import { reportError } from '@/telemetry/report';
import { normalizeError } from '@/telemetry/normalize';

export async function guard<T>(
  label: string,
  task: () => Promise<T>,
  fallback?: T,
): Promise<T | undefined> {
  try {
    return await task();
  } catch (err) {
    const normalized = normalizeError(err);
    reportError({ ...normalized, kind: 'recoverable', component: label });
    return fallback;
  }
}
```

### Step 6: Wrap the HTTP Client with Correlation IDs and Safe Retries

This is where most real failures originate, and where the correlation ID is minted. Retry only idempotent methods, back off with jitter, and give up with a typed error the UI can render.

```typescript
// src/api/client.ts
import { newCorrelationId } from '@/telemetry/trace';
import { addBreadcrumb } from '@/telemetry/breadcrumbs';
import { classifyHttpStatus } from '@/telemetry/classify';
import { reportError } from '@/telemetry/report';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly correlationId: string,
    readonly kind: ReturnType<typeof classifyHttpStatus>,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const RETRYABLE = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);

function backoff(attempt: number): number {
  const base = Math.min(2000, 200 * 2 ** attempt);
  return base + Math.random() * 200;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  maxRetries = 2,
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const correlationId = init.headers instanceof Headers
    ? init.headers.get('X-Correlation-Id') ?? newCorrelationId()
    : newCorrelationId();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const started = performance.now();
    try {
      const response = await fetch(path, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers as Record<string, string> | undefined),
          'X-Correlation-Id': correlationId,
        },
      });

      addBreadcrumb('http', `${method} ${path} -> ${response.status}`);

      if (response.ok) {
        return (await response.json()) as T;
      }

      const kind = classifyHttpStatus(response.status);
      const body = await response.text();

      if (kind === 'recoverable' && RETRYABLE.has(method) && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoff(attempt)));
        continue;
      }

      const error = new HttpError(response.status, correlationId, kind, body.slice(0, 300));
      if (kind === 'defect') {
        reportError({
          name: error.name,
          message: error.message,
          kind: 'defect',
          component: 'api',
          durationMs: performance.now() - started,
        });
      }
      throw error;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      if (err instanceof HttpError) throw err;
      if (isLastAttempt) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        reportError({
          ...normalized,
          kind: 'recoverable',
          component: 'api',
          detail: `${method} ${path} after ${attempt + 1} attempts`,
          durationMs: performance.now() - started,
        });
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, backoff(attempt)));
    }
  }

  throw new Error(`unreachable: exhausted retries for ${method} ${path}`);
}
```

Store actions then call `request` and let expected failures flow into UI state rather than into the error tracker.

```typescript
// src/stores/checkout.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { request, HttpError } from '@/api/client';
import { reportError } from '@/telemetry/report';

export const useCheckoutStore = defineStore('checkout', () => {
  const submitting = ref(false);
  const errorMessage = ref<string | null>(null);

  async function submit(payload: { cartId: string; paymentToken: string }) {
    submitting.value = true;
    errorMessage.value = null;
    try {
      await request('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ ...payload, idempotencyKey: crypto.randomUUID() }),
      });
      return true;
    } catch (err) {
      if (err instanceof HttpError && err.kind === 'expected') {
        errorMessage.value = 'We could not process that payment method. Please review your details.';
        return false;
      }
      reportError({
        name: 'CheckoutSubmitFailed',
        message: err instanceof Error ? err.message : String(err),
        kind: 'recoverable',
        component: 'checkout-store',
      });
      errorMessage.value = 'Something went wrong while placing your order. Please try again.';
      return false;
    } finally {
      submitting.value = false;
    }
  }

  return { submitting, errorMessage, submit };
});
```

### Step 7: Ship Events Through a Batched, Scrubbed Transport

The transport owns three concerns: scrubbing, batching, and delivery. Keep it independent of any vendor SDK so you can add Sentry or OpenTelemetry later without touching call sites.

```typescript
// src/telemetry/transport.ts
import type { TelemetryEvent } from './types';

const ENDPOINT = '/api/telemetry';
const FLUSH_MS = 5000;
const MAX_BATCH = 25;

let queue: TelemetryEvent[] = [];
let timer: number | undefined;

const REDACT_KEYS = ['password', 'token', 'authorization', 'card', 'cvv', 'email'];

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      REDACT_KEYS.some((needle) => key.toLowerCase().includes(needle)) ? '[redacted]' : scrub(entry, depth + 1),
    ]),
  );
}

function deliver(events: TelemetryEvent[]) {
  const body = JSON.stringify({ events: scrub(events) });
  if (navigator.sendBeacon && document.visibilityState === 'hidden') {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Telemetry failure must never surface to the user.
  });
}

export function enqueue(event: TelemetryEvent): void {
  queue.push(event);
  if (queue.length >= MAX_BATCH) {
    flush();
    return;
  }
  if (timer === undefined) {
    timer = window.setTimeout(flush, FLUSH_MS);
  }
}

export function flush(): void {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  deliver(batch);
}

export function installFlushOnHide(): void {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
```

Sampling lives above the transport so a noisy event class cannot flood the queue. Defects always pass at full rate.

```typescript
// src/telemetry/report.ts
import type { ErrorKind, TelemetryEvent } from './types';
import { enqueue } from './transport';
import { getBreadcrumbs } from './breadcrumbs';
import { getContext } from './context';

interface ErrorInput {
  name: string;
  message: string;
  stack?: string;
  kind: ErrorKind;
  component?: string;
  detail?: string;
  durationMs?: number;
}

const SAMPLE_RATE: Record<ErrorKind, number> = {
  defect: 1,
  recoverable: 0.5,
  expected: 0.05,
};

export function reportError(input: ErrorInput): void {
  const rate = SAMPLE_RATE[input.kind];
  if (Math.random() > rate) return;

  const event: TelemetryEvent = {
    type: 'error',
    name: input.name,
    kind: input.kind,
    message: input.message.slice(0, 1000),
    stack: input.stack?.slice(0, 4000),
    durationMs: input.durationMs,
    breadcrumbs: getBreadcrumbs(),
    context: getContext(input.component, input.detail),
    timestamp: Date.now(),
  };

  enqueue(event);
  if (input.kind === 'defect') console.error('[telemetry]', input.name, input.message);
}
```

### Step 8: Wire an Error Tracker and Distributed Tracing

With the transport in place, Sentry is a thin adapter rather than a second architecture. Initialize it before `mount`, disable its default integrations you already cover, and attach the correlation ID as a tag so browser and server reports join on the same key.

```typescript
// src/telemetry/sentry.ts
import * as Sentry from '@sentry/vue';
import type { App } from 'vue';
import type { Router } from 'vue-router';

export function initSentry(app: App, router: Router): void {
  if (!import.meta.env.PROD) return;

  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `${import.meta.env.VITE_APP_VERSION}+${import.meta.env.VITE_GIT_SHA}`,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 0.2,
    beforeSend(event) {
      if (event.request?.url) event.request.url = event.request.url.split('?')[0];
      return event;
    },
  });
}
```

For teams that standardize on OpenTelemetry, the same correlation ID becomes a span attribute, and the API client start becomes a child span so the trace crosses into the backend collector.

```typescript
// src/telemetry/otel.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('vue-app', import.meta.env.VITE_APP_VERSION);

export async function withSpan<T>(
  name: string,
  correlationId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttribute('correlation.id', correlationId);
    span.setAttribute('app.version', import.meta.env.VITE_APP_VERSION);
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err instanceof Error ? err : String(err));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Step 9: Instrument the Journey and Perceived Performance

Errors explain what broke; metrics explain the blast radius. Report route changes and Web Vitals so a defect can be sliced by page, device, and connection quality.

```typescript
// src/telemetry/vitals.ts
import { onCLS, onINP, onLCP, onTTFB } from 'web-vitals';
import type { TelemetryEvent } from './types';
import { enqueue } from './transport';
import { getContext } from './context';

const reported = new Set<string>();

function sendMetric(name: string, value: number, rating: string): void {
  const key = `${name}:${Math.round(value)}`;
  if (reported.has(key)) return;
  reported.add(key);

  const event: TelemetryEvent = {
    type: 'metric',
    name,
    value,
    kind: 'expected',
    context: { ...getContext('web-vitals'), routeParams: { rating } },
    timestamp: Date.now(),
  };
  enqueue(event);
}

export function installVitals(): void {
  onLCP((metric) => sendMetric('lcp', metric.value, metric.rating));
  onINP((metric) => sendMetric('inp', metric.value, metric.rating));
  onCLS((metric) => sendMetric('cls', metric.value, metric.rating));
  onTTFB((metric) => sendMetric('ttfb', metric.value, metric.rating));
}
```

Route-level timing comes free from the router, and it is the metric that most often explains "the app feels broken" reports with no error attached.

```typescript
// src/router/timing.ts
import type { Router } from 'vue-router';
import { addBreadcrumb } from '@/telemetry/breadcrumbs';
import { enqueue } from '@/telemetry/transport';
import { getContext } from '@/telemetry/context';

export function installRouteTiming(router: Router): void {
  let started = performance.now();

  router.beforeEach((to) => {
    started = performance.now();
    addBreadcrumb('route:start', String(to.name ?? to.path));
    return true;
  });

  router.afterEach((to) => {
    const durationMs = performance.now() - started;
    addBreadcrumb('route:end', `${String(to.name)} ${Math.round(durationMs)}ms`);
    enqueue({
      type: 'metric',
      name: 'route.transition',
      value: durationMs,
      kind: 'expected',
      context: getContext('router'),
      timestamp: Date.now(),
    });
  });
}
```

### Step 10: Alert on Symptoms and Prove the Pipeline Works

The last step is operational: define what pages on-call, and verify the pipeline end to end before you trust it. Alert on ratios, not counts — "checkout failures above 3 percent of sessions for 5 minutes" catches a real incident, while "500 errors today" fires every weekday at noon.

```text
Signal                                    Condition                       Action
----------------------------------------  ------------------------------  ------------------
Defect rate per route                     > 2% of sessions, 5 min         Page on-call
Checkout submit failures                  > 3% of attempts, 5 min         Page on-call
Chunk load failures                       > 1% of navigations, 15 min     Deploy checklist
Unhandled rejections                      new signature, any volume       Ticket
LCP p75 (mobile)                          > 2500 ms, 30 min               Ticket
INP p75                                   > 200 ms, 30 min                Ticket
Telemetry ingestion gap                   zero events, 10 min             Page platform
```

Then run a deliberate failure drill: throw from a hidden debug route, confirm the boundary renders the fallback, confirm the event arrives with the correlation ID, breadcrumbs, and release tag, and confirm the alert fires in staging. A telemetry pipeline that has never been triggered is a hypothesis, not a monitoring system.

```typescript
// src/telemetry/self-check.ts
import { reportError } from './report';
import { flush } from './transport';

export async function telemetrySelfCheck(): Promise<void> {
  reportError({
    name: 'TelemetrySelfCheck',
    message: 'Synthetic drill event — safe to ignore',
    kind: 'defect',
    component: 'self-check',
  });
  flush();
  await new Promise((resolve) => setTimeout(resolve, 500));
}
```

Run that drill in staging on every release, and again after any change to the transport, the scrubber, or the vendor adapter.
