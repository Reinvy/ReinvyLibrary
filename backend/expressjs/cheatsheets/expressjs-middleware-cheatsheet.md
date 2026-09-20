---
title: "Express.js Middleware Cheatsheet"
description: "A compact reference for Express middleware: application versus router scope, execution order, error handlers, built-in parsers, third-party packages, and async wrapper patterns."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Express.js Middleware Cheatsheet

Middleware is any function with the `(req, res, next)` signature. Express runs middleware in the exact order it was registered, so most production bugs come from ordering, scope, and forgetting to call `next()`.

## Quick Reference Table

| Action | Code / Pattern | Description |
|--------|----------------|-------------|
| Application-level middleware | `app.use(fn)` | Runs for every request that reaches the app |
| Path-scoped middleware | `app.use('/api', fn)` | Runs only when the path prefix matches |
| Router-level middleware | `router.use(fn)` | Runs for requests entering that router |
| Route middleware | `app.get('/x', fn1, fn2, handler)` | Chain runs left to right for one route only |
| Mount a router | `app.use('/users', usersRouter)` | Prefixes all router routes and trims the mount path |
| Pass control | `next()` | Continue to the next middleware in the stack |
| Skip remaining routes | `next('route')` | Leave the current route and try the next matching one |
| Abort with error | `next(err)` | Jump to the nearest 4-arity error handler |
| Error handler | `app.use((err, req, res, next) => {})` | Must declare 4 parameters or Express treats it as normal middleware |
| JSON body parser | `express.json({ limit: '1mb' })` | Built-in parser for `application/json` |
| URL-encoded parser | `express.urlencoded({ extended: true })` | Built-in parser for HTML form posts |
| Static files | `express.static('public', { maxAge: '1d' })` | Serves files and sets cache headers |
| Cookie parsing | `cookieParser(secret)` | Third-party; populates `req.cookies` and `req.signedCookies` |
| Security headers | `helmet()` | Sets CSP, HSTS, and other hardening headers |
| Request logging | `morgan('combined')` | Standard access log line per request |
| Async safety | `asyncHandler(fn)` | Forwards rejected promises to the error handler |

## Common Commands

### Install the usual middleware set

```bash
# Core dependencies
npm install express cookie-parser cors helmet morgan compression

# Development-only tooling
npm install --save-dev nodemon supertest
```

### Verify middleware behaviour from the shell

```bash
# Inspect the response headers added by helmet and compression
curl -sI http://localhost:3000/health | grep -Ei 'content-security|x-frame|content-encoding'

# Confirm body parsing rejects oversized or malformed JSON
curl -s -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"email":'
```

## Code Snippets

### Application-level middleware

```javascript
const express = require('express');
const requestId = require('express-request-id');

const app = express();

// Runs first for every request, adds a correlation id used by logs
app.use(requestId());

// Runs for every verb and path below the mount point
app.use((req, res, next) => {
  res.setHeader('X-Request-Id', req.id);
  next(); // forgetting this call is the classic hanging-request bug
});
```

### Router-level middleware and mounting paths

```javascript
const { Router } = require('express');
const usersRouter = Router();

// Router-scoped middleware: only requests entering this router see it
usersRouter.use((req, res, next) => {
  req.scope = 'users';
  next();
});

usersRouter.get('/:id', (req, res) => {
  // req.params.id only, because the mount path is stripped
  res.json({ id: req.params.id, scope: req.scope });
});

// Mount path is removed from req.url but kept in req.baseUrl
app.use('/api/v1/users', usersRouter);
```

### Built-in parsers and static assets

```javascript
// Parsers must be registered before any route that reads req.body
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static('public', { maxAge: '1d', etag: true }));

app.post('/api/users', (req, res) => {
  if (!req.body.email) {
    return res.status(422).json({ error: 'email is required' });
  }
  res.status(201).json({ email: req.body.email });
});
```

### Ordering: auth before handlers

```javascript
function requireApiKey(req, res, next) {
  const key = req.get('x-api-key');
  if (!key) return res.status(401).json({ error: 'missing api key' });
  req.apiKey = key;
  next();
}

// Mounted before the protected routes, so it always runs first
app.use('/api', requireApiKey);
app.use('/api/orders', ordersRouter);
app.use('/api/reports', reportsRouter);
```

### Async wrapper pattern

```javascript
// Express 4 does not catch rejected promises; wrap every async handler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/orders/:id', asyncHandler(async (req, res) => {
  const order = await orderRepository.findById(req.params.id);
  if (!order) {
    const err = new Error('order not found');
    err.status = 404;
    throw err; // forwarded to the error middleware by the wrapper
  }
  res.json(order);
}));
```

### Error middleware and the 404 tail

```javascript
// 404 catcher must come after all routes but before the error handler
app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.originalUrl });
});

// Four arguments, always last: Express identifies error handlers by arity
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err); // let the default handler close the socket
  const status = err.status || 500;
  console.error(JSON.stringify({ requestId: req.id, status, message: err.message }));
  res.status(status).json({ error: err.expose ? err.message : 'internal error', requestId: req.id });
});
```
