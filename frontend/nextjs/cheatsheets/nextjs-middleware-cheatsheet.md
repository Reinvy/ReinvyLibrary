---
title: "Next.js Middleware Cheatsheet"
description: "A quick reference for Next.js middleware: matcher configuration, redirects and rewrites, auth gating, request and response headers, cookies, and the Edge runtime constraints that shape what you can safely run there."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Next.js Middleware Cheatsheet

## Quick Reference Table

| Action | Code / Config | Description |
|--------|---------------|-------------|
| Scope to a path tree | `matcher: ['/dashboard/:path*']` | Runs for `/dashboard` and everything below it |
| Exclude internals | `matcher: ['/((?!api\|_next/static\|_next/image\|favicon.ico).*)']` | Runs everywhere except static assets and API routes |
| Match methods | `matcher: [{ source: '/api/:path*', has: [{ type: 'header', key: 'x-csrf' }] }]` | Conditional match using `has` / `missing` |
| Redirect | `NextResponse.redirect(new URL('/login', req.url), 307)` | Returns a redirect; 307 preserves the method |
| Rewrite (internal) | `NextResponse.rewrite(new URL('/beta', req.url))` | Serves other content without changing the browser URL |
| Pass through | `NextResponse.next()` | Continue to the route handler or page |
| Forward headers | `NextResponse.next({ request: { headers } })` | Makes modified request headers visible downstream |
| Response header | `res.headers.set('X-Frame-Options', 'DENY')` | Attach security or cache headers to the response |
| Read cookie | `request.cookies.get('session')?.value` | Cookie values are strings; `undefined` when absent |
| Set cookie | `res.cookies.set('sid', value, { httpOnly: true })` | Emits `Set-Cookie` on the response |
| Read path | `request.nextUrl.pathname` | Decoded pathname used for matching and logging |
| Clone URL | `request.nextUrl.clone()` | Safe way to mutate path or search params |
| Base URL | `request.url` | Absolute URL with scheme and host, required by `new URL()` |
| Skip prefetch | `request.headers.get('next-router-prefetch')` | Prefetch requests should usually short-circuit |
| Node.js APIs | Not available | Edge runtime has no `fs`, `path`, `net`, `Buffer`, or `eval` |
| Node runtime | `runtime: 'nodejs'` in `config` | Experimental opt-out of the Edge runtime (15.2+) |

## Common Commands

### Development and Build

```bash
npx next dev            # middleware runs on every matched request in dev
npx next build          # prints the middleware bundle size in the route summary
npx next start          # production server; middleware applies here too
```

### Verify Behavior with curl

```bash
# Follow the redirect chain and show each status
curl -sIL http://localhost:3000/dashboard | grep -iE '^(HTTP|location)'

# Expect 307 + Location: /login when the session cookie is missing
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/dashboard

# Same request with a cookie, to test the gate's happy path
curl -s -o /dev/null -w '%{http_code}\n' -H 'Cookie: session=valid-token' http://localhost:3000/dashboard

# Inspect headers injected by middleware
curl -sI http://localhost:3000/ | grep -i 'x-request-id'
```

## Code Snippets

### Matcher Configuration

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    return NextResponse.next(); // runs only on the paths declared below
}

export const config = {
    // Arrays must be static literals — variables are not statically analyzable
    matcher: [
        '/dashboard/:path*',
        '/account/:path*',
        '/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)',
    ],
};
```

### Auth Gating with an Edge-Safe JWT Library

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // edge-compatible, uses Web Crypto

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('session')?.value;
    if (!token) {
        const login = new URL('/login', request.url);
        login.searchParams.set('next', request.nextUrl.pathname);
        return NextResponse.redirect(login);
    }
    try {
        await jwtVerify(token, secret); // throws on expiry or bad signature
        return NextResponse.next();
    } catch {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session'); // clear the unusable token
        return response;
    }
}

export const config = { matcher: ['/dashboard/:path*', '/account/:path*'] };
```

### Rewrite and Proxy with Header Forwarding

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();

    // Internal A/B split: rewrite, do not redirect
    if (url.pathname === '/pricing' && request.cookies.get('beta')?.value === '1') {
        url.pathname = '/pricing-v2';
        return NextResponse.rewrite(url);
    }

    // Proxy an external API through the same origin
    if (url.pathname.startsWith('/api/legacy')) {
        const path = url.pathname.replace('/api/legacy', '');
        const target = new URL(path, process.env.LEGACY_API_URL);
        const headers = new Headers(request.headers);
        headers.set('x-forwarded-host', request.headers.get('host') ?? '');
        headers.delete('cookie'); // never leak session cookies upstream
        return NextResponse.rewrite(target, { request: { headers } });
    }
    return NextResponse.next();
}
```

### Security Headers and Request IDs

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const requestId = crypto.randomUUID(); // Web Crypto global, no import needed
    const headers = new Headers(request.headers);
    headers.set('x-request-id', requestId);

    const response = NextResponse.next({ request: { headers } });
    response.headers.set('x-request-id', requestId);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
}
```

### Edge Runtime Limits Worth Remembering

```typescript
// Allowed: fetch, Web Crypto (crypto.subtle), TextEncoder/TextDecoder, URL, Headers, cookies
// Not allowed: fs, path, net, child_process, Buffer, native addons, eval, Node-only SDKs
// No response bodies: middleware may only redirect, rewrite, or modify headers.

export const config = {
    matcher: ['/app/:path*'],
    // runtime: 'nodejs', // experimental: enables Node APIs, slower cold starts
};
```
