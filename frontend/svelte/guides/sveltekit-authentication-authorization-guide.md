---
title: "SvelteKit Authentication and Authorization Guide"
description: "A comprehensive guide to implementing secure authentication and authorization in SvelteKit — covering session-based authentication with HTTP-only cookies, route protection via hooks, RBAC, OAuth 2.0/OIDC integration, CSRF defense, and testing auth flows."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# SvelteKit Authentication and Authorization Guide

## Introduction

Authentication — verifying who a user is — and authorization — verifying what that user may do — are the two security pillars of almost every real-world application. In SvelteKit, the framework's server-first architecture gives you a clean set of primitives to build both correctly: `hooks.server.ts` runs before every request, `+page.server.ts` load functions gate data access, and form actions handle mutations with built-in progressive enhancement.

This guide shows you how to assemble those primitives into a production-grade authentication system. You will learn how to implement session-based authentication with HTTP-only cookies, centralize session validation in hooks, protect route groups with layout guards, enforce role-based access control (RBAC) in load functions, integrate external login through OAuth 2.0 / OpenID Connect, defend against CSRF, harden your application with security headers and rate limits, and finally test the whole flow with unit and end-to-end tests.

The approach is deliberately library-agnostic: we implement sessions, password hashing, and permissions directly so you understand every security decision. Where a battle-tested library saves you from subtle mistakes — notably OAuth provider flows — we adopt it explicitly.

## Best Practices

### 1. Prefer Server-Side Sessions Stored in HTTP-Only Cookies

Store a random, unguessable session token in an `httpOnly` cookie and keep the session record — with its expiry and user reference — on the server. The cookie flag `httpOnly` prevents JavaScript from reading the token, which neutralizes the most common XSS payloads. Set `sameSite=lax` to stop cross-site cookie sending for most CSRF scenarios, and `secure` in production so the cookie only travels over HTTPS.

```typescript
// src/lib/server/session.ts
export function sessionCookie(token: string): string[] {
  return [
    `session=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=2592000', // 30 days
    ...(import.meta.env.PROD ? ['Secure'] : [])
  ];
}
```

### 2. Validate the Session in a Single Hooks Guard

`hooks.server.ts`'s `handle` function is the only place that sees every incoming request, so it is the correct single choke point for session resolution. Resolve the user once and attach them to `event.locals`; every load function and form action can then trust `locals.user` without re-parsing cookies. Keeping this logic in one place means a security fix — rotating a hashing algorithm or tightening an expiry — lands in exactly one file.

### 3. Group Protected Routes and Guard Whole Layouts

Use SvelteKit route groups to separate public from authenticated areas:

```text
src/routes/
  +layout.svelte          # public shell
  +page.svelte            # homepage
  (auth)/
    +layout.server.ts     # redirects unauthenticated users
    +layout.svelte        # authenticated shell
    account/
      +page.svelte        # /account — requires login
    settings/
      +page.svelte        # /settings — requires login
  login/
    +page.svelte          # public login page
```

A layout-level guard cannot be bypassed by merely linking to a nested page, because the layout load runs for every route in the group.

### 4. Re-Check Authorization Inside Load Functions and Form Actions

Layout guards handle "is this user logged in?" — but authorization ("may this user do this?") must be re-checked at the data boundary. A dashboard layout may be shared by admins and members; the `load` function for the admin panel must verify the role itself. Never rely on hiding UI: always enforce in the server load function or form action, because those are the only places that run with server authority.

### 5. Hash Passwords with Argon2id

Never store plaintext or weakly hashed passwords. Argon2id is the current recommended memory-hard hash: it resists GPU cracking, defends against timing attacks, and is implemented by well-maintained packages. Always set a per-user random salt (the library generates one for you) and a work factor appropriate to the hardware that will verify logins.

### 6. Issue Short-Lived Sessions and Rotate Them

A stolen session cookie is only as dangerous as its lifetime. Set a sensible expiry (hours to a month depending on the app), and rotate the session token on privilege changes — after login, after password reset, and on role escalation — by deleting the old session and issuing a new one. Rotation guarantees that an attacker replaying an old token is locked out once the user re-authenticates.

### 7. Delegate Third-Party Login to OAuth 2.0 / OpenID Connect

Do not implement Google/GitHub password flows yourself. Use the provider's standard OAuth 2.0 authorization code flow with PKCE, verify the `sub` claim from the ID token (OIDC) or the profile response, and link the returned identity to your local user record. A small, audited library such as `arctic` removes the PKCE bookkeeping and keeps your provider handlers concise.

### 8. Defend Mutations Against CSRF

`SameSite=lax` cookies stop the browser from sending the session cookie on cross-site POSTs, which defeats most CSRF attacks. Add a second layer for state-changing endpoints: verify the request's `Origin` header against the app's origin, and use SvelteKit form actions (which send the same-origin form POST) rather than accepting bare JSON from arbitrary origins.

### 9. Enforce RBAC with a Permission Model, Not Role Names Alone

Model authorization as permissions — `post:create`, `user:delete`, `billing:view` — and group permissions into roles. Checking `user.role === 'admin'` becomes unmaintainable the moment a second role needs a subset of admin powers. A table mapping `(role, permission)` pairs lets you answer "can this user perform this action?" with one query and keeps the check logic independent of the role hierarchy.

### 10. Set Security Headers and a Hardening Baseline

Add a security header baseline — `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security` — plus rate limiting on login, registration, and password reset endpoints. SvelteKit projects commonly apply these centrally with the `sveltekit-adapter`-agnostic `handle` hook or a middleware-style header map, so every response benefits without per-route work.

### 11. Test Auth Flows at the Unit, Integration, and E2E Levels

Authentication code is security-critical and notoriously easy to break with refactors. Unit-test password hashing and session helpers, integration-test load functions with a mocked `locals.user`, and run Playwright end-to-end tests for the canonical journeys: successful login, failed login, protected route redirect, session expiry, and logout.

## Implementation Steps

### Step 1: Design the Session Schema

Create a `sessions` table that stores a hash of the token rather than the token itself, so a database leak does not leak usable sessions. Store the user reference, an expiry, and optional rotation metadata.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',
  created_at    INTEGER NOT NULL
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  expires_at    INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE permissions (
  role       TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);
```

Seed the permission table with your initial roles:

```sql
INSERT INTO permissions (role, permission) VALUES
  ('member', 'post:create'),
  ('member', 'post:read'),
  ('admin',  'post:create'),
  ('admin',  'post:delete'),
  ('admin',  'user:delete'),
  ('admin',  'billing:view');
```

### Step 2: Implement Password Hashing and Session Helpers

Install the dependencies for hashing and secure token generation:

```bash
npm install @node-rs/argon2
```

Write the hashing helpers and the session token utilities:

```typescript
// src/lib/server/auth.ts
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,  // 19 MiB
    timeCost: 2,
    parallelism: 1
  });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return verify(hash, password);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

### Step 3: Build the Login and Logout Form Actions

Create `src/routes/login/+page.server.ts` with a form action that verifies credentials, creates a session, and returns the `Set-Cookie` header. Form actions keep the login flow progressive — it works without JavaScript and enhances automatically.

```typescript
// src/routes/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { hashSessionToken, generateSessionToken, verifyPassword } from '$lib/server/auth';
import { sessionCookie } from '$lib/server/session';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');

    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as { id: string; password_hash: string } | undefined;

    if (!user || !(await verifyPassword(user.password_hash, password))) {
      return fail(400, { error: 'Invalid email or password.' });
    }

    const token = generateSessionToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;

    db.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), user.id, hashSessionToken(token), expiresAt, Math.floor(Date.now() / 1000));

    cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    redirect(303, '/account');
  }
};
```

For logout, delete the session record and clear the cookie:

```typescript
// src/routes/logout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { hashSessionToken } from '$lib/server/auth';

export const actions: Actions = {
  default: async ({ cookies }) => {
    const token = cookies.get('session');
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(token));
    }
    cookies.delete('session', { path: '/' });
    redirect(303, '/login');
  }
};
```

### Step 4: Read and Validate Sessions in Hooks

Centralize session resolution in `src/hooks.server.ts`. Resolve the token, look up its hash, check expiry, and attach the user to `event.locals`:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { hashSessionToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session');

  if (token) {
    const session = db
      .prepare(
        `SELECT s.id AS session_id, s.expires_at, u.*
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`
      )
      .get(hashSessionToken(token)) as
      | { session_id: string; expires_at: number; id: string; email: string; role: string }
      | undefined;

    if (session && session.expires_at > Math.floor(Date.now() / 1000)) {
      event.locals.user = {
        id: session.id,
        email: session.email,
        role: session.role
      };
      event.locals.sessionId = session.session_id;
    } else if (session) {
      // Expired: clean up and drop the cookie
      db.prepare('DELETE FROM sessions WHERE id = ?').run(session.session_id);
      event.cookies.delete('session', { path: '/' });
    }
  }

  return resolve(event);
};
```

Declare the locals types in `src/app.d.ts`:

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      user?: { id: string; email: string; role: string };
      sessionId?: string;
    }
  }
}

export {};
```

### Step 5: Protect Routes with Layout Guards

Define a guard in the protected route group's server layout. Any route inside `(auth)` inherits it:

```typescript
// src/routes/(auth)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/login');
  }
  return { user: locals.user };
};
```

For the login page, add the inverse guard — redirect already-authenticated users away:

```typescript
// src/routes/login/+page.server.ts (load)
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    redirect(303, '/account');
  }
};
```

### Step 6: Implement RBAC Permissions in Load Functions

Add a reusable authorization helper that checks a permission against the user's role:

```typescript
// src/lib/server/authorize.ts
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { Locals } from '$lib/types';

export async function requirePermission(
  locals: Locals,
  permission: string
): Promise<void> {
  const user = locals.user;
  if (!user) {
    error(401, 'Authentication required.');
  }

  const row = db
    .prepare('SELECT 1 FROM permissions WHERE role = ? AND permission = ?')
    .get(user.role, permission);

  if (!row) {
    error(403, 'You do not have permission to perform this action.');
  }
}
```

Then call it at the top of protected load functions and actions:

```typescript
// src/routes/(auth)/admin/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/authorize';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
  await requirePermission(locals, 'user:delete');
  const users = db.prepare('SELECT id, email, role FROM users').all();
  return { users };
};

export const actions: Actions = {
  deleteUser: async ({ locals, request }) => {
    await requirePermission(locals, 'user:delete');
    const data = await request.formData();
    db.prepare('DELETE FROM users WHERE id = ?').run(String(data.get('userId')));
  }
};
```

### Step 7: Integrate OAuth 2.0 with an External Provider

Install `arctic` for standards-compliant provider flows:

```bash
npm install arctic
```

Create a provider instance, then handle the two-legged flow — redirect to the provider, exchange the code:

```typescript
// src/lib/server/oauth.ts
import { GitHub } from 'arctic';

export const github = new GitHub(
  import.meta.env.VITE_GITHUB_CLIENT_ID,
  import.meta.env.VITE_GITHUB_CLIENT_SECRET
);
```

```typescript
// src/routes/login/github/+server.ts
import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier } from 'arctic';
import type { RequestHandler } from './$types';
import { github } from '$lib/server/oauth';

export const GET: RequestHandler = async ({ cookies }) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = github.createAuthorizationURL(state, codeVerifier, ['read:user', 'user:email']);

  cookies.set('oauth_state', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });
  cookies.set('oauth_code_verifier', codeVerifier, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });

  redirect(302, url.toString());
};
```

Exchange the authorization code in the callback route, verify the returned provider identity, and upsert the local user:

```typescript
// src/routes/login/github/callback/+server.ts
import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier } from 'arctic';
import type { RequestHandler } from './$types';
import { github } from '$lib/server/oauth';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('oauth_state');
  const codeVerifier = cookies.get('oauth_code_verifier');

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    redirect(303, '/login?error=oauth_state_mismatch');
  }

  const tokens = await github.validateAuthorizationCode(code, codeVerifier);
  const githubUser = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokens.accessToken}` }
  }).then((r) => r.json());

  const email = githubUser.email ?? `${githubUser.login}@users.noreply.github.com`;
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    // Never store a password for OAuth-only users: mark the account as OAuth-linked
    db.prepare('INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), email, '', 'member', Math.floor(Date.now() / 1000));
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  // Issue a normal session cookie, exactly like the password flow
  const token = generateSessionToken();
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  db.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), user.id, hashSessionToken(token), expiresAt, Math.floor(Date.now() / 1000));

  cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
  cookies.delete('oauth_state', { path: '/' });
  cookies.delete('oauth_code_verifier', { path: '/' });

  redirect(303, '/account');
};
```

### Step 8: Harden Headers and Rate-Limit Auth Endpoints

Apply security headers centrally in the `handle` hook so every response — including error pages — carries them:

```typescript
// src/hooks.server.ts (extended)
import type { Handle } from '@sveltejs/kit';

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Frame-Options': 'DENY'
};

export const handle: Handle = async ({ event, resolve }) => {
  // ...session resolution from Step 4...

  const response = await resolve(event);
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
};
```

Rate-limit login attempts with a small in-memory store keyed by IP and email. In production, move this to a shared store (Redis or your database) so it survives restarts and scales across instances:

```typescript
// src/lib/server/rate-limit.ts
const attempts = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    attempts.set(key, recent);
    return true;
  }
  recent.push(now);
  attempts.set(key, recent);
  return false;
}
```

### Step 9: Write Unit and E2E Tests for the Auth Flow

Unit-test the pure helpers — token generation round-trips, password hashing verification, and the permission lookup:

```typescript
// src/lib/server/auth.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken } from './auth';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });
});

describe('session tokens', () => {
  it('stores a hash, never the raw token', () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toBe(token);
    expect(hashSessionToken(token)).toHaveLength(64);
  });
});
```

End-to-end with Playwright — exercise the real redirect and cookie behavior in a browser:

```typescript
// tests/auth.spec.ts
import { expect, test } from '@playwright/test';

test('unauthenticated users are redirected to /login', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login/);
});

test('successful login reaches the protected area', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByText('Welcome back')).toBeVisible();
});

test('logout clears the session', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login/);
});
```

Run the suite in CI after every push:

```bash
npm run test:unit && npm run test:e2e
```

## Next Steps

With a secure authentication and authorization foundation in place, explore hardening your session lifecycle further — session revocation endpoints, device management dashboards, multi-factor authentication with TOTP, and audit logging of privilege changes. Each of these builds naturally on the session and permission model you just implemented.

## Conclusion

SvelteKit's hooks, load functions, and form actions map cleanly onto the security primitives every application needs. By centralizing session validation in `hooks.server.ts`, enforcing permissions at the data boundary with explicit permission checks, delegating identity verification to OAuth providers, and defending the transport layer with cookies, headers, and rate limits, you get an authentication architecture that is secure by default and straightforward to extend. The same structure scales from a solo project with password login to a multi-tenant platform with OAuth, RBAC, and audit trails — because each concern lives in exactly one place.
