---
title: "Express.js Error Handling Guide"
description: "A practical guide to centralized Express error handling: operational versus programmer errors, async error forwarding, custom error classes, HTTP status mapping, and correlated logging."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Express.js Error Handling Guide

## Introduction

Express gives you exactly one built-in strategy for errors: call `next(err)` and something with four arguments will eventually run. In small apps that is enough. In production it is not, because a system needs to answer four separate questions: what went wrong, who is affected, what should the client see, and how do we find the corresponding log line six hours later.

The failure modes are predictable. A handler throws inside an `async` function and Express silently leaves the request hanging until the client times out. A stack trace leaks into a JSON response. A single `catch` block returns `500` for a validation error that should have been `422`. Logs are emitted without any request identifier, so correlating them with a support ticket is guesswork.

This guide describes a centralized error architecture that keeps handlers thin, makes error responses predictable, and produces logs that can actually be searched. Everything here works on Express 4 and Express 5 with only minor differences in how rejected promises are treated.

## Best Practices

- **Centralize, never format locally.** Route handlers should throw or call `next(err)`; exactly one error middleware decides the HTTP status and the response body. When formatting lives in handlers, every endpoint drifts.
- **Separate operational from programmer errors.** Operational errors (invalid input, missing record, upstream timeout) are expected and map to a specific 4xx/5xx with a safe message. Programmer errors (typo, null dereference, wrong type) are bugs: return a generic `500`, log with full stack, and alert.
- **Use custom error classes, not string matching.** An `AppError` with `status`, `code`, and `isOperational` removes `if (message.includes('not found'))` from every handler.
- **Treat `expose` as a security switch.** Only messages from operational errors may reach the client. Stack traces, SQL fragments, and internal hostnames never do.
- **Wrap every async handler.** Express 5 forwards rejected promises automatically; Express 4 does not. An explicit `asyncHandler` keeps the codebase portable and makes the intent visible.
- **Log once, at the boundary.** Two layers logging the same failure produces duplicate alerts. The error middleware is the single logging point, and it needs the request id, the route, the user id, and the error code.
- **Propagate request ids.** Accept an incoming `x-request-id` when a gateway supplies one, otherwise generate a UUID, put it on `req.id`, return it in the response header, and include it in every log line.
- **Never swallow errors to keep the response "clean".** `catch (e) {}` hides broken invariants; catch only to translate, then rethrow or forward.
- **Distinguish "not found" from "not allowed".** Returning `404` for a resource the caller cannot see is often intentional; `403` leaks existence. Decide per resource and be consistent.

## Implementation Steps

### Step 1: Define the error type

```javascript
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const badRequest = (msg, details) => new AppError(msg, 400, 'BAD_REQUEST', details);
const notFound = (msg = 'resource not found') => new AppError(msg, 404, 'NOT_FOUND');
const conflict = (msg) => new AppError(msg, 409, 'CONFLICT');
```

Anything that is not an `AppError` is, by definition, unexpected. That single rule drives the rest of the design.

### Step 2: Map domain errors to HTTP status codes

| Situation | Status | Code | Client-visible message |
|-----------|--------|------|------------------------|
| Malformed or missing field | 400 | `VALIDATION_ERROR` | Field-level details |
| Missing or invalid token | 401 | `UNAUTHENTICATED` | `authentication required` |
| Authenticated but not permitted | 403 | `FORBIDDEN` | `not allowed` |
| Entity does not exist | 404 | `NOT_FOUND` | `resource not found` |
| Duplicate key or version clash | 409 | `CONFLICT` | Human-readable reason |
| Rate limit exceeded | 429 | `RATE_LIMITED` | Retry hint |
| Upstream dependency failed | 502 | `UPSTREAM_ERROR` | `service temporarily unavailable` |
| Anything unhandled | 500 | `INTERNAL_ERROR` | `internal server error` |

Keep the mapping table in one module so review discussions become mechanical rather than stylistic.

### Step 3: Wrap async handlers

```javascript
// Express 4 needs this; Express 5 can rely on native promise forwarding
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.patch('/orders/:id', asyncHandler(async (req, res) => {
  const order = await orders.findByPk(req.params.id);
  if (!order) throw notFound('order not found');

  if (order.status === 'shipped') {
    throw conflict('shipped orders cannot be edited');
  }

  await order.update(pick(req.body, ['note', 'address']));
  res.json(order);
}));
```

Handlers now read as straight-line logic. There is no `try`/`catch` per route, and no error path is forgotten.

### Step 4: Add request ids before anything else

```javascript
const { randomUUID } = require('crypto');

app.use((req, res, next) => {
  req.id = req.get('x-request-id') || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});
```

Register this first. Every later middleware, including the error handler and the access logger, can depend on `req.id` existing.

### Step 5: Install the terminal handler

```javascript
const logger = require('./logger');

app.use((req, res) => {
  res.status(404).json({ error: 'route not found', requestId: req.id });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err); // stream or download already started

  const operational = err instanceof AppError && err.isOperational;
  const status = operational ? err.status : 500;
  const code = operational ? err.code : 'INTERNAL_ERROR';

  logger.error({
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id ?? null,
    status,
    code,
    message: err.message,
    stack: operational ? undefined : err.stack,
  });

  res.status(status).json({
    error: operational ? err.message : 'internal server error',
    code,
    requestId: req.id,
    ...(operational && err.details ? { details: err.details } : {}),
  });
});
```

Note the asymmetry: the log always receives the full message and stack, while the response receives only what the caller is allowed to know. Both carry `requestId`, which is the join key between a user report and your log store.

### Step 6: Fail loudly on startup, quietly in requests

Programmer errors still deserve attention. Wire `process.on('unhandledRejection')` and `process.on('uncaughtException')` to log the error and exit non-zero so the supervisor restarts a clean process. Swallowing them leaves the service running in an undefined state, which is worse than a restart.

### Step 7: Verify with tests and a smoke check

```bash
# Operational error: expect 404, a code, and a request id
curl -si http://localhost:3000/orders/does-not-exist | head -n 8

# Malformed payload: expect 400 with field details
curl -si -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' -d '{"qty":"many"}'

# Programmer error: expect 500 and no stack trace in the body
curl -si http://localhost:3000/orders/boom | grep -i 'express\|at '
```

Assert three things in integration tests: the status code, the `code` field, and the absence of `stack` for non-operational errors. Those assertions catch most regressions in the error layer.
