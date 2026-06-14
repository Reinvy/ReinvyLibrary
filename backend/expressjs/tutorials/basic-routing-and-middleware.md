---
title: "Understanding Basic Routing and Middleware in Express.js"
description: "This material covers fundamental concepts in Express.js: Routing and Middleware. You will learn how to direct data flow from incoming requests to outgoing respo"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Understanding Basic Routing and Middleware in Express.js

## Brief Summary

This material covers fundamental concepts in Express.js: *Routing* and *Middleware*. You will learn how to direct data flow from incoming *requests* to outgoing *responses*, and how to inject additional logic midway through the process in a structured manner.

## For Whom This Material Is

- **Target Audience:** Beginner to intermediate web developers.
- **Level:** Foundation.

## Prerequisites

- Basic understanding of JavaScript (especially *callbacks* and *arrow functions*).
- Have followed the [Install Express JS](Install%20Express%20JS.md) tutorial and successfully run your first Express.js server.
- Basic understanding of HTTP Methods (GET, POST, PUT, DELETE).

## Learning Objectives

After completing this material, you will be able to:

- Understand how Express.js handles different types of URL routes.
- Separate routes into different files using `express.Router()`.
- Understand the concept, lifecycle, and functionality of *middleware*.
- Create a simple custom *middleware*, such as a logger.
- Apply best practices in route error handling (preventing system information exposure).

## Context and Motivation

When building a real-world web application, you wouldn't place all your code logic in a single `app.js` file. As features grow, you need a way to organize paths (*routes*) neatly and modularly. This is where *Routing* comes in.

Furthermore, you often need to perform checks before a route is executed (e.g., "Is this user logged in?", "Is the sent data valid?"). Instead of repeating validation code in every route, Express.js uses the concept of **Middleware**. Mastering these two concepts is key to building scalable and organized Express APIs and applications.

## Core Material

### 1. What is Routing?

*Routing* refers to how an application responds to a *request* from a client directed at a specific *endpoint*, which consists of a URI (or path) and a specific HTTP request method (GET, POST, etc.).

The basic structure of a *route* in Express:

```javascript
app.METHOD(PATH, HANDLER)
```

- `app` is an instance of express.
- `METHOD` is an HTTP method (get, post, put, delete, etc.) in lowercase.
- `PATH` is the path/route on the server (e.g., `/`, `/users`, `/products`).
- `HANDLER` is the function (*callback*) executed when the route is accessed.

### 2. Using `express.Router`

For large applications, defining routes in `app.js` will make it cluttered. Express provides `express.Router` to create modular, mountable route *handlers*.

**Example: Creating a route for users (`routes/users.js`)**

```javascript
const express = require('express');
const router = express.Router();

// This route will respond to GET /users/
router.get('/', (req, res) => {
  res.send('Displaying user list');
});

// This route will respond to POST /users/
router.post('/', (req, res) => {
  res.send('Adding a new user');
});

module.exports = router;
```

**Mounting the route in `app.js`:**

```javascript
const express = require('express');
const app = express();
const usersRouter = require('./routes/users');

// Connect the /users route to usersRouter
app.use('/users', usersRouter);

app.listen(3000, () => console.log('Server running on port 3000'));
```

### 3. What is Middleware?

Think of *middleware* as a "security guard" or "interpreter" standing between the incoming *Request* and the outgoing *Response*.

*Middleware* functions are functions that have access to the *request* object (`req`), the *response* object (`res`), and the next *middleware* function in the application's request-response cycle (commonly named `next`).

Middleware functions can perform the following tasks:

1. Execute any code.
2. Make changes to the request and response objects (e.g., adding user data after token verification).
3. End the request-response cycle (e.g., if a user is not logged in, immediately reject with a 401 code).
4. Call the next *middleware* in the stack using the `next()` function.

### 4. Creating Custom Middleware

Let's build a simple logger *middleware*. This *middleware* will print the time every time a *request* comes in.

```javascript
const express = require('express');
const app = express();

// Middleware Function
const loggerMiddleware = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] Request to: ${req.url}`);

  // MANDATORY: Call next() so the process continues to the next middleware/route
  next();
};

// Mount middleware globally (applies to all routes)
app.use(loggerMiddleware);

app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

app.listen(3000);
```

### 5. Secure Error Handling (Best Practice)

When an error occurs in your code, it is very dangerous if you directly send system error details to the client (known as *Information Exposure*). This can be exploited by hackers.

Best practice: Log the error details internally (on the server), then return a generic *error* message to the user.

```javascript
app.get('/secret-data', (req, res) => {
  try {
    // Simulate error when accessing the database
    throw new Error('Database connection failed: Timeout at 192.168.1.100');
  } catch (error) {
    // 1. Log error details only on the server for debugging purposes (safe)
    console.error('[INTERNAL ERROR]', error);

    // 2. Return a generic message to the client (without exposing IP or details)
    res.status(500).send('Internal Server Error. Please try again later.');
  }
});
```

## Example / Illustration

Imagine you are entering a luxury office building (Your Express Application).

1. **Main Door (Main Router):** Where everyone enters.
2. **Receptionist (Authentication Middleware):** Before entering the hallway (`/admin`), the receptionist checks your ID. If the ID is wrong, you are not allowed in and are told to leave immediately (`res.send('Unauthorized')`). If correct, the receptionist lets you proceed (`next()`).
3. **3rd Floor Hallway (`/admin` Router):** You are directed to a specific place according to your destination.
4. **Meeting Room (Final Handler):** The place where you are finally received and served according to your needs (`res.send('Welcome Admin')`).

## Key Insights

- **Don't Forget `next()`**: The most common mistake for beginners is forgetting to call `next()` inside a *middleware* function. If `next()` is not called and `res.send()` is also not executed, the request from the client will hang (*timeout*).
- **Order is Crucial**: Express executes *middleware* sequentially (*top-to-bottom*) in the order you write `app.use()`. Ensure security *middleware* (like token verification) is placed *before* the routes that need protection.
- **Information Security**: Always follow the "Log details internally, return generic safely" principle to prevent leaking your system architecture to the outside world.

## Final Summary

- *Routing* is used to direct requests from the *client* (URL & Method) to the appropriate code (*handler*).
- `express.Router()` helps organize applications by breaking routes down into separate modules.
- *Middleware* is a function that sits in the middle of the request/response flow, useful for logging, authentication, *request* modification, and more.
- Secure error handling must be done on the server-side to protect sensitive information.

## Next Learning Steps

Now that you understand Routing and Middleware, you are ready for:

- [Express Integration with Multer](Express%20With%20Multer.md) (To learn file uploading).
- [Express Integration with Prisma](Express%20With%20Prisma.md) (To connect your API with a Database).

## Metadata

- **Level:** Foundation
- **Main Topic:** Express.js, Backend Development
- **Related Topics:** Routing, Middleware, Web API
- **Keywords:** express router, express middleware, next function, node.js, api error handling
- **Estimated Reading Time:** 7 - 10 minutes
