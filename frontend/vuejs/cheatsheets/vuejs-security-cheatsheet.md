---
title: "Vue.js Security Cheatsheet"
description: "A quick reference for securing Vue.js 3 applications: XSS prevention, Content Security Policy, CSRF protection, secure authentication, dependency auditing, and production hardening."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Vue.js Security Cheatsheet

## Quick Reference Table

| Threat | Defense | Tool / Pattern |
|--------|---------|----------------|
| XSS via `v-html` | Sanitize before binding; never render unsanitized user HTML | `v-html` + DOMPurify |
| Template injection | Keep untrusted content in interpolations; never compile it as a template | `{{ }}` auto-escaping |
| `javascript:` URL injection | Validate dynamic `:href` / `:src` against a protocol allowlist | URL validator composable |
| Script injection via CSP gaps | Enforce a strict Content Security Policy without `unsafe-inline` / `unsafe-eval` | CSP response headers |
| CSRF on state-changing requests | SameSite cookies plus a double-submit CSRF token | `SameSite=Lax` + `X-XSRF-TOKEN` |
| Auth token theft via XSS | Keep tokens in HttpOnly + Secure cookies, not JavaScript-accessible storage | Cookie flags |
| Clickjacking | Block the app from being framed | CSP `frame-ancestors` |
| Supply-chain compromise | Lock the dependency tree and audit it in CI | `package-lock.json` + `npm audit` |
| Secrets shipped to the browser | Keep secrets server-side; never expose them via `VITE_` env vars | `import.meta.env`, runtime config |
| Sensitive data in logs | Redact tokens, passwords, and PII before logging | Redaction helper |
| Third-party script tampering | Pin CDN scripts with Subresource Integrity | `integrity` + `crossorigin` attributes |
| SSR data leakage | Never embed secrets in server-rendered payloads | Nuxt runtime config |

## Common Commands

### Installing Security Packages

```bash
# HTML sanitizer used before any v-html binding
npm install dompurify

# HTTP client with built-in CSRF token support
npm install axios

# Linting rules for Vue Single File Components
npm install --save-dev eslint eslint-plugin-vue
```

### Auditing Dependencies

```bash
# List known vulnerabilities in the dependency tree
npm audit

# Auto-apply non-breaking security fixes
npm audit fix

# Audit only the production dependency surface
npm audit --omit=dev

# CI gate: fail the build when high-severity issues exist
npm audit --audit-level=high
```

### Generating an SRI Hash for CDN Scripts

```bash
# Compute the SHA-384 integrity value for a third-party script
curl -s https://cdn.example.com/lib.js \
  | openssl dgst -sha384 -binary \
  | openssl base64 -A
```

### Enabling HTTPS in the Vite Dev Server

```bash
# HTTPS is required to test Secure cookies in development
npm install --save-dev @vitejs/plugin-basic-ssl
```

## Code Snippets

### Sanitizing HTML Before v-html

```vue
<script setup lang="ts">
import DOMPurify from 'dompurify'

const props = defineProps<{ html: string }>()

// DOMPurify strips scripts, event handlers, and dangerous URLs
const safeHtml = DOMPurify.sanitize(props.html, {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'form', 'iframe'],
})
</script>

<template>
  <!-- Only ever bind sanitized output to v-html -->
  <div v-html="safeHtml"></div>
</template>
```

### Validating Dynamic URLs

```vue
<script setup lang="ts">
const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tel:'])

// new URL() normalizes the input; the allowlist blocks javascript: and data:
function safeUrl(raw: string | null | undefined): string {
  if (!raw) return ''
  const url = new URL(raw, window.location.origin)
  return SAFE_PROTOCOLS.has(url.protocol) ? url.href : ''
}
</script>

<template>
  <a :href="safeUrl(userProvidedUrl)">Profile</a>
</template>
```

### Content Security Policy for Production

```text
# nginx — strict CSP for a Vue SPA (style-src needs 'unsafe-inline'
# only when CSS is injected at runtime instead of extracted)
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### CSRF-Safe API Calls with axios

```javascript
// axios reads the XSRF-TOKEN cookie and sends it as the X-XSRF-TOKEN
// header on every request when withCredentials is enabled
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})
```

### HttpOnly Cookie Authentication

```javascript
// The token never reaches JavaScript: the server sets an HttpOnly cookie
const response = await fetch('/api/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})

// The browser stores the session cookie automatically; JS cannot read it
if (response.ok) await router.push('/dashboard')
```

### Route Guard for Protected Pages

```typescript
// router/guards.ts — keep authorization checks out of component code
import { useAuthStore } from '@/stores/auth'

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})
```

### Pinning a CDN Script with SRI

```html
<!-- index.html — the integrity hash pins the exact CDN payload -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-ABC123...=="
  crossorigin="anonymous"
></script>
```

### Redacting Sensitive Data Before Logging

```typescript
// Never log request payloads containing credentials
function redact(input: unknown): unknown {
  if (input && typeof input === 'object') {
    const clone = { ...input } as Record<string, unknown>
    for (const key of Object.keys(clone)) {
      if (/(token|password|secret|authorization)/i.test(key)) {
        clone[key] = '[REDACTED]'
      }
    }
    return clone
  }
  return input
}

console.debug('API response', redact(response.data))
```

### Keeping Secrets Out of the Client Bundle

```text
# .env — any variable prefixed with VITE_ is inlined into the bundle
# and visible to anyone who opens the built JavaScript
VITE_API_BASE_URL=https://api.example.com

# Private keys (database credentials, signing secrets) belong on the
# server only; load them through runtime configuration, never VITE_ env.
```
