---
title: "Elysia.js Security Hardening Guide"
description: "An advanced security hardening guide for Elysia.js applications — secure headers, strict TypeBox validation, JWT authentication with refresh-token rotation, guard-based authorization, CSRF protection, rate limiting, SSRF defense, supply-chain hardening, and security event logging."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Elysia.js Security Hardening Guide

## Introduction

Elysia.js is a high-performance, Bun-native web framework that prides itself on end-to-end type safety and a predictable lifecycle model. That foundation gives developers a real advantage when hardening an API: validation is declarative and centralized, hooks run in a deterministic order, and the runtime (Bun) is modern enough to expose first-class Web Crypto, streaming, and timeout primitives. However, type safety alone does not make an application secure. OWASP-style threats — broken authentication, CSRF, injection, SSRF, excessive data exposure, rate-limit bypasses, and supply-chain compromise — still apply, and they require deliberate defense.

This guide is written for teams that already ship Elysia.js services and now want to raise their security baseline to a production standard. It covers the complete attack surface of a typical Elysia API: what to configure at the HTTP layer, how to structure validation so malformed and malicious input never reaches your business logic, how to design authentication and authorization that fail closed, how to protect cookie-based sessions from CSRF, how to defend against brute force and resource exhaustion, how to prevent server-side request forgery when your API calls other services, and finally how to harden your dependencies, secrets, and runtime. Every section pairs a concrete best practice with runnable Elysia code so you can adopt the patterns incrementally.

## Best Practices

### 1. Set Security Headers at the Application Edge

HTTP response headers are the cheapest and most reliable layer of defense for browser-facing clients. They tell the browser how to treat your responses: never sniff content types, never embed the page in a frame, never send the full referrer, and restrict which browser features your page may use. On an Elysia application you should apply these headers globally so every response — including errors and 404s — is covered. The following plugin attaches an industry-standard set of headers to every request:

```typescript
import { Elysia } from 'elysia'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export const securityHeaders = new Elysia().onRequest(({ set }) => {
  set.headers['Content-Security-Policy'] = CSP
  set.headers['X-Content-Type-Options'] = 'nosniff'
  set.headers['X-Frame-Options'] = 'DENY'
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
  set.headers['Permissions-Policy'] =
    'camera=(), microphone=(), geolocation=(), payment=()'
  set.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
  set.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
  set.headers['X-Powered-By'] = ''
})
```

The `onRequest` hook runs before any routing logic, so `set.headers` here is the earliest possible place to mutate the response. Note that clearing `X-Powered-By` with an empty string removes the default Elysia banner that advertises the framework to scanners.

### 2. Validate Every Input with Strict TypeBox Schemas

Elysia's killer feature for security is declarative runtime validation via TypeBox. Every `body`, `query`, `params`, and `headers` schema is enforced before your handler runs, and invalid payloads short-circuit with a `VALIDATION` error. The mistake most teams make is leaving schemas open: by default TypeBox objects ignore unknown properties, which silently enables mass-assignment and parameter-pollution attacks. Always close the schema surface:

```typescript
import { Elysia, t } from 'elysia'

const CreateUserSchema = t.Object(
  {
    name: t.String({ minLength: 2, maxLength: 100 }),
    email: t.String({ format: 'email', maxLength: 254 }),
    password: t.String({
      minLength: 12,
      maxLength: 128,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$',
    }),
    role: t.Optional(t.Union([t.Literal('user'), t.Literal('admin')])),
  },
  { additionalProperties: false },
)

export const users = new Elysia()
  .post('/users', async ({ body }) => {
    // body is fully validated, strictly typed, and contains no extra keys
    return createUser(body)
  }, {
    body: CreateUserSchema,
    detail: { tags: ['users'] },
  })
```

Three rules make this airtight. First, always pass `{ additionalProperties: false }` so unknown JSON keys are rejected instead of silently dropped. Second, encode length and format constraints (`minLength`, `maxLength`, `format`, `pattern`) on every string — unbounded strings are a memory and regex-ReDoS liability. Third, keep schemas shared between the API and the client with Eden Treaty so the frontend can never send a shape the server does not expect.

### 3. Authenticate with Short-Lived Signed JWTs

For API-only services, the most robust authentication model is stateless: sign a short-lived access token with a strong algorithm, verify it on every request, and keep a separate refresh token that can be revoked. The `@elysiajs/jwt` plugin wraps the Web Crypto implementation and lets you pin the algorithm instead of accepting whatever a token header claims:

```typescript
import { jwt } from '@elysiajs/jwt'

const ACCESS_TTL_SECONDS = 15 * 60 // 15 minutes

export const auth = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET!, // >= 32 random bytes, rotated regularly
      alg: 'HS256',
    }),
  )
  .derive(async ({ jwt, request }) => {
    const header = request.headers.get('authorization')
    if (!header?.startsWith('Bearer ')) {
      return { currentUser: null }
    }
    const payload = await jwt.verify(header.slice(7))
    if (!payload || typeof payload.sub !== 'string') {
      return { currentUser: null }
    }
    return { currentUser: { id: payload.sub, role: payload.role as Role } }
  })
```

Keep access tokens short-lived (5–15 minutes) so a leaked token has a small window of usefulness. Include `jti` (a unique token ID) and `iat`/`exp` claims, and validate `iss` and `aud` when you have more than one service. Store refresh tokens hashed with `Bun.password` (argon2id), never in plaintext, so a database leak does not become a session-leak.

### 4. Enforce Authorization with Centralized Guards

Authentication answers "who are you?"; authorization answers "what may you do?". Elysia's `guard` and route-level `beforeHandle` hooks are the idiomatic place for authorization. Centralize the check in a reusable guard so a new endpoint cannot accidentally ship without one, and make every check fail closed — missing context must be treated as `401`, and an authenticated user without the required role must get `403`:

```typescript
import { Elysia } from 'elysia'

export type Role = 'user' | 'admin'

export function requireRole(...roles: Role[]) {
  return new Elysia().guard({
    beforeHandle({ currentUser, set }) {
      if (!currentUser) {
        set.status = 401
        return { error: 'Unauthorized' }
      }
      if (!roles.includes(currentUser.role)) {
        set.status = 403
        return { error: 'Forbidden' }
      }
    },
  })
}

export const adminApi = new Elysia()
  .use(requireRole('admin'))
  .get('/users', listUsers)
  .post('/users', createUser, { body: CreateUserSchema })
```

Prefer deriving the current user once in a parent scope (as in Practice 3) and then composing role guards on top, rather than re-parsing tokens in every route. If your authorization rules are complex — multi-tenant, resource-owner checks, scopes — model them as small predicate functions and combine them inside guards so rules stay testable.

### 5. Harden Cookie-Based Sessions Against CSRF

If your Elysia service issues session cookies (for example, a refresh token for a single-page application), you must defend against cross-site request forgery. A browser will happily attach a session cookie to a request sent from a malicious origin, so the server cannot trust the cookie alone. The defense is layered: set strict cookie attributes, verify the `Origin` header on state-changing methods, and use a double-submit token so every mutation requires a value an attacker cannot read.

```typescript
// Login / session-issuance: set an unguessable token cookie
setCookie('csrf_token', crypto.randomUUID(), {
  httpOnly: false, // readable by the SPA via document.cookie
  secure: true,
  sameSite: 'strict',
  path: '/',
})
```

The SPA then sends that value back in the `X-CSRF-Token` header, and the server compares it with the cookie on every state-changing request:

```typescript
import { Elysia } from 'elysia'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export const csrfProtection = new Elysia().onBeforeHandle(
  ({ request }) => {
    if (SAFE_METHODS.has(request.method.toUpperCase())) return

    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (!origin || !host) {
      return new Response('Forbidden: missing Origin', { status: 403 })
    }

    let originHost: string
    try {
      originHost = new URL(origin).host
    } catch {
      return new Response('Forbidden: malformed Origin', { status: 403 })
    }
    if (originHost !== host) {
      return new Response('Forbidden: cross-origin', { status: 403 })
    }

    const headerToken = request.headers.get('x-csrf-token')
    const cookieToken = /(?:^|;\s*)csrf_token=([^;]+)/.exec(
      request.headers.get('cookie') ?? '',
    )?.[1]
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return new Response('Forbidden: CSRF token mismatch', { status: 403 })
    }
  },
)
```

For pure JSON APIs consumed by server-to-server clients, CSRF risk is minimal — but the `Origin` check is still cheap and worth keeping. For browser-facing SPAs, the double-submit pattern above is the minimum viable defense.

### 6. Rate-Limit Requests to Defend Against Brute Force and DoS

Authentication endpoints, public search APIs, and any resource that triggers expensive work need rate limiting. A fixed per-IP window is the baseline; after authentication you should also key buckets per user and per route. The following plugin implements a sliding window over a bounded in-memory map — suitable for a single instance, and easy to swap for Redis when you scale horizontally:

```typescript
import { Elysia } from 'elysia'

interface Bucket {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 100
const MAX_BUCKETS = 10_000
const buckets = new Map<string, Bucket>()

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export const rateLimiter = new Elysia().onRequest(({ request }) => {
  const now = Date.now()
  const key = clientKey(request)

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  bucket.count += 1
  if (bucket.count > MAX_PER_WINDOW) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    })
  }
})
```

Never trust `x-forwarded-for` blindly — it can be spoofed when the edge proxy does not overwrite it; make your ingress (nginx, an L7 load balancer, or a CDN) the only source of that header. For login endpoints in particular, apply a much tighter per-account limit (for example, 5 attempts per minute per email) in addition to the per-IP limit.

### 7. Prevent Injection and SSRF in Data and Outbound Calls

Two injection families still dominate real-world breaches: SQL injection through string-built queries, and server-side request forgery through user-supplied URLs. For the first, the rule is absolute — never interpolate user input into SQL text; always use parameterized queries or an ORM:

```typescript
import { sql } from 'drizzle-orm'

// Safe: the driver binds the value as a parameter
const user = await db.execute(
  sql`SELECT * FROM users WHERE email = ${email}`,
)

// Unsafe: never do this
// const user = await db.execute(`SELECT * FROM users WHERE email = '${email}'`)
```

For the second, every outbound request your API makes on behalf of a user must be validated against an allow-list of schemes and hosts, and must never be allowed to reach internal infrastructure. See Step 8 for a complete `safeFetch` implementation that blocks private IP ranges and refuses to follow redirects automatically.

### 8. Harden the Supply Chain and Runtime Secrets

Your code can be flawless and your service can still be compromised through a malicious dependency, a leaked secret, or an over-privileged runtime. Make the following part of your definition-of-done:

- **Audit dependencies in CI**: run `bun audit` on every pull request and fail the build on `high` and `critical` advisories.
- **Pin your lockfile**: `bun.lock` must be committed and installed with `--frozen-lockfile` in CI and production.
- **Never commit secrets**: `.env` files stay out of the repository; document variables in a `.env.example` with placeholder values and inject real values through your orchestrator or secret manager.
- **Validate the environment at boot**: fail fast at startup if a required variable is missing, instead of crashing halfway through a request.
- **Run as an unprivileged user**: containers should not run as root (see Step 9 for a hardened Dockerfile).
- **Limit exposure**: disable the `X-Powered-By` banner (Practice 1), avoid stack traces in production responses, and keep the API behind a TLS-terminating proxy with HTTP/2 enabled.

### 9. Log Security Events and Prepare for Incident Review

You cannot respond to an attack you cannot see. Every authentication failure, guard denial, validation rejection, and rate-limit hit should be written to a structured log with a correlation ID so an incident can be reconstructed end to end. Use `console.error`/`console.warn` with a single JSON object per event — Bun writes JSON lines natively and your log pipeline can ingest them without parsing gymnastics. A minimal security logger is the final component in the reference application (Step 10), and it should be paired with an alerting rule on the pattern `event="validation_failure" OR event="guard_denied" OR status=429`.

## Implementation Steps

### Step 1: Scaffold a Hardened Project Baseline

Start from a fresh Bun project with strict TypeScript and a security-oriented layout. Every concern from this guide gets its own module so the hardening is explicit and auditable:

```bash
bun init -y
bun add elysia @elysiajs/jwt @elysiajs/cookie @sinclair/typebox
bun add -d typescript @types/bun
```

```text
src/
├── app.ts                          # Elysia instance composition (root)
├── env.ts                          # env schema validation (fail fast)
├── plugins/
│   ├── security-headers.ts         # Practice 1
│   ├── error-handler.ts            # centralized typed errors
│   ├── rate-limiter.ts             # Practice 6
│   └── csrf.ts                     # Practice 5
├── modules/
│   ├── auth/
│   │   ├── auth.plugin.ts          # Practice 3 (JWT + derive)
│   │   └── auth.routes.ts          # login / refresh / logout
│   └── users/
│       ├── users.routes.ts         # Practice 4 (guards)
│       └── users.service.ts
└── db/
    ├── schema.ts
    └── client.ts
```

Enable `strict` and `noUncheckedIndexedAccess` in `tsconfig.json`, and add `.env` to `.gitignore` before anything else.

### Step 2: Add Global Security Headers via a Plugin

Create `src/plugins/security-headers.ts` with the plugin from Practice 1. Register it first in the root application so every response — including 404s and errors — carries the full header set:

```typescript
import { Elysia } from 'elysia'
import { securityHeaders } from './plugins/security-headers'

const app = new Elysia({
  serve: {
    idleTimeout: 30,
    maxRequestBodySize: 1024 * 1024,
    compression: true,
  },
})
  .use(securityHeaders)
  .get('/health', () => ({ ok: true, at: new Date().toISOString() }))
  .listen(Number(process.env.PORT ?? 3000))

export type App = typeof app
```

The `serve` options also cap the request body at 1 MB and enable response compression; the `idleTimeout` defends against slowloris-style connections that hold a socket open without completing a request.

### Step 3: Define Strict TypeBox Schemas for All Inputs

Centralize every request schema in a `schemas` module and always pass `{ additionalProperties: false }`. Add a shared `error-handler` plugin so validation and internal failures return consistent, non-informative JSON:

```typescript
import { Elysia } from 'elysia'

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export const errorHandler = new Elysia()
  .error({ UNAUTHORIZED: UnauthorizedError, FORBIDDEN: ForbiddenError })
  .onError(({ code, error, set }) => {
    if (code === 'UNAUTHORIZED') {
      set.status = 401
      return { error: error.message }
    }
    if (code === 'FORBIDDEN') {
      set.status = 403
      return { error: error.message }
    }
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Invalid request' } // never echo the full validator output
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not Found' }
    }
    set.status = 500
    return { error: 'Internal Server Error' }
  })
```

Never return raw exception messages or stack traces to clients. The validator's detailed message may contain schema internals that are useful to attackers; log it server-side instead (Step 10) and return a generic `Invalid request` to the caller.

### Step 4: Implement JWT Authentication with Token Rotation

Build the authentication module from Practice 3, and add a login route that verifies credentials with `Bun.password`, issues a short-lived access token, and rotates a hashed refresh token:

```typescript
import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'

const ACCESS_TTL_SECONDS = 15 * 60
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60
const REFRESH_COOKIE = 'refresh_token'

export const auth = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET!,
      alg: 'HS256',
    }),
  )
  .use(
    cookie({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    }),
  )
  .post(
    '/auth/login',
    async ({ body, jwt, setCookie, set }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, body.email),
      })
      if (!user || !(await Bun.password.verify(body.password, user.passwordHash))) {
        set.status = 401
        return { error: 'Invalid credentials' }
      }

      const accessToken = await jwt.sign({
        sub: user.id,
        role: user.role,
        jti: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
      })

      const refreshToken = crypto.randomUUID()
      const refreshHash = await Bun.password.hash(refreshToken, {
        algorithm: 'argon2id',
      })
      // Persist refreshHash + expiry for this user, and revoke on logout
      await db.insert(refreshSessions).values({
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      })

      setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: REFRESH_TTL_SECONDS,
      })

      return { accessToken, expiresIn: ACCESS_TTL_SECONDS }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email', maxLength: 254 }),
        password: t.String({ minLength: 8, maxLength: 128 }),
      }),
    },
  )
```

On every refresh, rotate the refresh token: issue a new random value, replace the stored hash, and revoke the previous one. Refresh tokens are bearer credentials — hashing them at rest means a database dump does not immediately leak working sessions.

### Step 5: Enforce Guard-Based Authorization with Derived Context

Wire the `requireRole` guard from Practice 4 into the module routes, then compose the root application:

```typescript
import { auth } from './modules/auth/auth.plugin'
import { adminApi } from './modules/users/users.routes'

const app = new Elysia()
  .use(securityHeaders)
  .use(errorHandler)
  .use(rateLimiter)
  .use(csrfProtection)
  .use(auth)
  .use(adminApi)
  .get('/me', ({ currentUser }) => {
    if (!currentUser) {
      return { error: 'Unauthorized' }
    }
    return currentUser
  })
  .listen(Number(process.env.PORT ?? 3000))
```

Note that `derive` in the `auth` plugin is scoped to everything that uses it, so `currentUser` is available in `adminApi` and in the root handler without any re-parsing. Every route that reads `currentUser` must still handle the `null` case explicitly — that is the fail-closed default.

### Step 6: Protect Cookie-Based Sessions from CSRF

Because the login flow stores the refresh token in a cookie, add the `csrfProtection` plugin from Practice 5 to the root application. Sequence matters: it runs in `onBeforeHandle`, after `rateLimiter` (which runs in `onRequest`), and before any handler. On login and refresh, additionally set the `csrf_token` cookie so the SPA can echo it back in the `X-CSRF-Token` header. If a native mobile client is your only consumer, the CSRF plugin can be skipped — but the same-origin `Origin` check remains a zero-cost hardening for the web client.

### Step 7: Add Rate Limiting and Request Caps

Register the `rateLimiter` plugin from Practice 6 first in the composition so it counts every request, including those that later fail authentication. Then add a per-user guard for sensitive endpoints such as login and password reset:

```typescript
export function userRateLimit(limit: number, windowMs: number) {
  const userBuckets = new Map<string, Bucket>()
  return new Elysia().guard({
    beforeHandle({ currentUser, request, set }) {
      if (!currentUser) return
      const now = Date.now()
      const url = new URL(request.url)
      const key = `${currentUser.id}:${request.method}:${url.pathname}`
      const bucket = userBuckets.get(key)
      if (!bucket || bucket.resetAt <= now) {
        userBuckets.set(key, { count: 1, resetAt: now + windowMs })
        return
      }
      bucket.count += 1
      if (bucket.count > limit) {
        return new Response('Too Many Requests', { status: 429 })
      }
    },
  })
}
```

For multi-instance deployments, move the bucket map to Redis with an `INCR` + `EXPIRE` script so the limit is shared across replicas; an in-memory map only holds per-instance state.

### Step 8: Harden Outbound HTTP Against SSRF

Create a `safeFetch` helper that all outbound calls use. It validates the scheme and host against an allow-list, blocks private and link-local addresses (including after DNS resolution, to resist DNS rebinding), and refuses to follow redirects automatically:

```typescript
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const ALLOWED_PROTOCOLS = new Set(['https:'])
const ALLOWED_HOSTS = new Set(['api.example.com', 'hooks.example.com'])
const PRIVATE_IP = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
]

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host === '::1' || host === '::') return true
  if (host.endsWith('.internal') || host.endsWith('.local')) return true
  if (isIP(host) && PRIVATE_IP.some((re) => re.test(host))) return true
  return false
}

async function resolveSafe(url: URL): Promise<URL> {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error('Only HTTPS URLs are allowed')
  }
  if (ALLOWED_HOSTS.size > 0 && !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error('Host is not allow-listed')
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error('Host is blocked')
  }
  const addresses = await lookup(url.hostname, { all: true })
  for (const { address } of addresses) {
    if (isIP(address) && PRIVATE_IP.some((re) => re.test(address))) {
      throw new Error('Resolved address is private')
    }
  }
  return url
}

export async function safeFetch(rawUrl: string, init?: RequestInit) {
  const url = await resolveSafe(new URL(rawUrl))
  return fetch(url, {
    ...init,
    redirect: 'manual', // never follow redirects automatically
    signal: AbortSignal.timeout(5_000),
  })
}
```

If your service must call internal services, put them on a separate network and egress policy rather than extending the allow-list with private ranges — the allow-list is for public hosts only.

### Step 9: Audit Dependencies, Secrets, and Runtime Settings

Run the audit commands locally and in CI:

```bash
bun audit                       # full dependency audit
bun audit --production          # production-only advisory check
```

Validate the environment at boot so misconfiguration fails fast and loudly. The example below uses TypeBox's `Value.Parse` from `@sinclair/typebox/value`, which throws on the first missing or invalid variable:

```typescript
import { Value } from '@sinclair/typebox/value'
import { t } from 'elysia'

const EnvSchema = t.Object(
  {
    NODE_ENV: t.Union([
      t.Literal('development'),
      t.Literal('test'),
      t.Literal('production'),
    ]),
    PORT: t.String({ default: '3000' }),
    JWT_SECRET: t.String({ minLength: 32 }),
    DATABASE_URL: t.String({ minLength: 1 }),
    LOG_LEVEL: t.Optional(
      t.Union([
        t.Literal('debug'),
        t.Literal('info'),
        t.Literal('warn'),
        t.Literal('error'),
      ]),
    ),
  },
  { additionalProperties: true },
)

export const env = Value.Parse(EnvSchema, Bun.env)
```

Document every variable in a committed `.env.example` with placeholder values:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=openssl-rand-hex-32-bytes
DATABASE_URL=postgres://app:CHANGE_ME@db.internal:5432/app
LOG_LEVEL=info
```

Finally, deploy as an unprivileged user. A minimal hardened container for a compiled Elysia service:

```dockerfile
FROM oven/bun:1.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build --compile ./src/index.ts --outfile /app/server

FROM debian:bookworm-slim
RUN useradd --create-home --uid 10001 appuser
COPY --from=build /app/server /usr/local/bin/server
USER appuser
EXPOSE 3000
CMD ["server"]
```

### Step 10: Wire Security Event Logging and Run a Final Review

Attach a security logger to the root application that emits structured JSON for the events that matter, then walk a threat-model checklist before every release:

```typescript
import { Elysia } from 'elysia'

function logSecurityEvent(
  event: string,
  request: Request,
  extra: Record<string, unknown> = {},
) {
  console.warn(
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      method: request.method,
      path: new URL(request.url).pathname,
      ip:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        'unknown',
      ...extra,
    }),
  )
}

export const securityLogger = new Elysia()
  .onError(({ code, error, request }) => {
    if (code === 'VALIDATION') {
      logSecurityEvent('validation_failure', request, {
        detail: error.message,
      })
    }
  })
  .onResponse(({ request, set }) => {
    if (set.status >= 400) {
      logSecurityEvent('client_error', request, { status: set.status })
    }
  })
```

Final review checklist:

- **Headers**: CSP, nosniff, frame deny, referrer policy, permissions policy present on every response; `X-Powered-By` removed.
- **Validation**: every route has `body`/`query`/`params` schemas with `additionalProperties: false`; no route accepts raw `unknown` input.
- **Auth**: access tokens expired in 15 minutes or less; `alg` pinned; refresh tokens hashed at rest and rotated on every use.
- **Authorization**: every protected route composes `requireRole` or an equivalent guard; deny-by-default for missing context.
- **CSRF**: `Origin` check on all state-changing methods; double-submit token for cookie-authenticated browser clients.
- **Rate limits**: per-IP window plus tighter per-user buckets on auth endpoints; `Retry-After` returned on 429.
- **SSRF**: all outbound traffic through `safeFetch`; private ranges and DNS rebinding blocked; redirects disabled.
- **Supply chain**: `bun audit` green in CI; lockfile pinned; secrets injected, not committed.
- **Runtime**: unprivileged container user; body size and idle timeouts set; TLS terminated at the edge.

Reviewing this checklist after every change — not just at launch — is what keeps the hardening from rotting as the codebase evolves.
