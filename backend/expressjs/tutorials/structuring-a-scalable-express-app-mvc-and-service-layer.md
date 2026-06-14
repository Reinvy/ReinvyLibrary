---
title: "Structuring a Scalable Express.js Application: MVC and Service Layer"
description: "This tutorial covers how to structure a growing Express.js application using the Model-View-Controller (MVC) pattern enhanced with a Service layer. You will lea"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Structuring a Scalable Express.js Application: MVC and Service Layer

## Summary

This tutorial covers how to structure a growing Express.js application using the Model-View-Controller (MVC) pattern enhanced with a Service layer. You will learn how to decouple your routing, business logic, and database access to create a maintainable, testable, and scalable backend architecture.

## Target Audience

- **Target audience:** Intermediate web developers building Express.js APIs.
- **Level:** Intermediate (Menengah).

## Prerequisites

- Understanding of basic Express.js concepts (Routing and Middleware).
- Have completed [Basic Routing and Middleware in Express](Basic%20Routing%20and%20Middleware%20in%20Express.md).
- Basic understanding of asynchronous JavaScript and RESTful APIs.

## Learning Objectives

After completing this tutorial, you will be able to:

- Understand the limitations of putting all logic inside route handlers.
- Implement the MVC architectural pattern in an Express.js context.
- Introduce a Service Layer to isolate core business logic.
- Organize your project folder structure for long-term scalability.
- Write cleaner and more easily testable code.

## Context and Motivation

When starting with Express.js, it's common to place everything—request validation, database queries, business logic, and response formatting—directly inside the `app.get()` or `router.post()` callbacks. While this works for simple apps, it quickly becomes a "fat controller" nightmare as your application grows. The code becomes hard to read, impossible to reuse, and very difficult to test.

By adopting a structured architecture like MVC along with a Service Layer, you divide responsibilities into clear, distinct parts. Controllers handle HTTP requests, Services handle the "business rules," and Models handle data storage. This separation of concerns is the secret to building large-scale, enterprise-ready Node.js applications.

## Core Content

### 1. The Problem with "Fat Controllers"

A typical anti-pattern in Express.js is the "fat controller," where a single route handler does too much:

```javascript
// Anti-pattern: Everything in one place
router.post('/register', async (req, res) => {
  try {
    // 1. Validation
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // 2. Database check
    const existingUser = await db.query('SELECT * FROM users WHERE email = ?', [req.body.email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 3. Business logic (hashing password)
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // 4. Database insert
    const newUser = await db.query('INSERT INTO users (email, password) VALUES (?, ?)', [req.body.email, hashedPassword]);

    // 5. Response formatting
    res.status(201).json({ id: newUser.insertId, email: req.body.email });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

This code is hard to test without mocking the entire HTTP request/response cycle and the database. It's time to break it down.

### 2. The Solution: Controllers, Services, and Models

To fix the fat controller, we separate the logic into three distinct layers:

1. **Routes (`routes/`)**: Define the endpoints and map them to specific controllers.
2. **Controllers (`controllers/`)**: Handle the HTTP layer. They extract data from the request (`req.body`, `req.params`), pass it to the service, and send the HTTP response (`res.status().json()`).
3. **Services (`services/`)**: Contain the core business logic. They receive plain data, process it, interact with the Models, and return the result. They know *nothing* about HTTP requests or responses.
4. **Models (`models/` or `repositories/`)**: Handle direct database interactions (e.g., Prisma queries or raw SQL).

### 3. Recommended Folder Structure

A scalable project structure looks like this:

```text
src/
├── controllers/    # Request/Response handling
│   └── user.controller.js
├── services/       # Business logic
│   └── user.service.js
├── routes/         # API Route definitions
│   └── user.routes.js
├── models/         # Database schemas/queries
│   └── user.model.js
├── middlewares/    # Custom middlewares
└── app.js          # Express app setup
```

### 4. Refactoring Step-by-Step

Let's refactor the previous example using our new architecture.

**Step A: The Service Layer (`services/user.service.js`)**

The service handles the *how*. Notice there is no `req` or `res` here.

```javascript
const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');

const registerUser = async (email, password) => {
  const existingUser = await userModel.findByEmail(email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await userModel.create(email, hashedPassword);

  return { id: newUser.id, email: newUser.email };
};

module.exports = {
  registerUser
};
```

**Step B: The Controller Layer (`controllers/user.controller.js`)**

The controller handles the HTTP translation.

```javascript
const userService = require('../services/user.service');

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Call the service, pass pure data
    const user = await userService.registerUser(email, password);

    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(400).json({ error: error.message });
    }
    // Pass to global error handler
    next(error);
  }
};

module.exports = {
  register
};
```

**Step C: The Route Layer (`routes/user.routes.js`)**

The router merely wires the HTTP path to the controller.

```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

router.post('/register', userController.register);

module.exports = router;
```

## Code Examples

Imagine running a restaurant:

1. **The Route is the Menu:** It tells the customer what they can order (e.g., `POST /order-pizza`).
2. **The Controller is the Waiter:** The waiter takes the customer's order (HTTP Request), validates that the order makes sense, and carries it to the kitchen. When the food is ready, the waiter brings it back to the table (HTTP Response). The waiter does *not* cook the food.
3. **The Service Layer is the Chef:** The chef receives the order details, follows the recipe (business logic), and decides what ingredients are needed. The chef doesn't care how the customer asked for the food; they only care about making it correctly.
4. **The Model is the Pantry/Fridge:** This is where the raw ingredients (Database) are stored and retrieved by the chef.

## Key Insights

- **Reusability:** Because Services are independent of Express.js, you can reuse the same `userService.registerUser` logic in a CLI tool, a GraphQL resolver, or a cron job without changing the code.
- **Testability:** You can easily unit test the Service layer by passing in normal variables (e.g., `registerUser('test@test.com', 'password')`) without needing tools like Supertest to mock HTTP requests.
- **Keep Controllers Thin:** A good rule of thumb is that controllers should rarely exceed 10-15 lines of code. If a controller is doing heavy data manipulation, move that logic down to the Service layer.

## Conclusion

- "Fat controllers" mix HTTP logic, business rules, and database queries, making code difficult to maintain and test.
- The Controller Layer should only handle HTTP requests and responses.
- The Service Layer should contain pure business logic, decoupled from the web framework.
- Structuring your application into Routes, Controllers, Services, and Models ensures separation of concerns and long-term scalability.

## Next Steps

Now that your application is well-structured, you should look into:

- [Data Validation and Error Handling in Express](Data%20Validation%20and%20Error%20Handling%20in%20Express.md) (To move validation out of controllers using middleware like Joi or Zod).
- [Testing Express API with Jest and Supertest](Testing%20Express%20API%20with%20Jest%20and%20Supertest.md) (To see how easy it is to test separated service functions).
