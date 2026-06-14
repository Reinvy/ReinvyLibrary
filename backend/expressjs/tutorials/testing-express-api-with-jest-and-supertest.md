---
title: "Testing Express API with Jest and Supertest"
description: "This tutorial introduces API testing in Express.js using Jest and Supertest. You will learn how to write automated tests for your endpoints, ensuring your appli"
category: "backend"
technology: "expressjs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Testing Express API with Jest and Supertest

## Summary

This tutorial introduces API testing in Express.js using Jest and Supertest. You will learn how to write automated tests for your endpoints, ensuring your application behaves as expected and catching bugs early before they reach production.

---

## Target Audience

* **Target pembaca:** Backend Developers, QA Engineers, and Full-Stack Developers.
* **Level pembaca:** Intermediate.

---

## Prerequisites

* Basic understanding of JavaScript and Node.js.
* Familiarity with Express.js routing and middleware.
* Basic knowledge of HTTP methods and status codes.

---

## Learning Objectives

Setelah membaca materi ini, pembaca akan memahami:

* The importance of automated testing for APIs.
* How to set up Jest and Supertest in an Express.js project.
* How to write unit and integration tests for Express routes.
* How to mock data and handle asynchronous operations in tests.

---

## Context and Motivation

Testing is a critical part of software development. As your Express.js application grows, manually testing every endpoint becomes time-consuming and error-prone. Automated testing ensures that new features do not break existing functionality (regression) and acts as living documentation for your API. Jest provides a robust testing framework with built-in assertion and mocking capabilities, while Supertest allows you to simulate HTTP requests without actually starting a server, making your tests fast and reliable.

---

## Core Content

### 1. What are Jest and Supertest?

* **Jest:** A delightful JavaScript Testing Framework with a focus on simplicity. It provides an environment for running tests, asserting expected outcomes, and mocking dependencies.
* **Supertest:** A super-agent driven library for testing Node.js HTTP servers. It allows you to send requests to your Express app and assert the responses easily.

### 2. Setting Up the Testing Environment

First, install the necessary dependencies as dev dependencies:

```bash
npm install --save-dev jest supertest
```

Configure Jest by adding a test script in your `package.json`:

```json
"scripts": {
  "test": "jest"
}
```

### 3. Structuring Your App for Testing

To use Supertest effectively, you should export your Express app instance without calling `app.listen()`. This allows Supertest to bind the app to a random port during testing.

**`app.js` (Your Express App)**

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/users', (req, res) => {
  res.status(200).json([{ id: 1, name: 'John Doe' }]);
});

app.post('/api/users', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  res.status(201).json({ id: 2, name });
});

module.exports = app;
```

**`server.js` (The Entry Point)**

```javascript
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Code Examples

### Writing Your First Test

Create a file named `app.test.js`. Jest automatically finds files ending in `.test.js` or `.spec.js`.

```javascript
const request = require('supertest');
const app = require('./app');

describe('User API Endpoints', () => {

  // Test GET route
  it('should return a list of users', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toHaveProperty('name', 'John Doe');
  });

  // Test POST route - Success Case
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Jane Doe' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Jane Doe');
  });

  // Test POST route - Error Case
  it('should return 400 if name is missing', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Name is required');
  });

});
```

Run the tests using the command:

```bash
npm test
```

---

## Key Insights

* **Test Independence:** Each test should be independent. Do not rely on the state mutated by a previous test. Use `beforeEach` and `afterEach` hooks to reset the database or mock data.
* **Mocking External Services:** Do not hit real third-party APIs or production databases in your tests. Use Jest's mocking capabilities (`jest.mock()`) to simulate responses from external dependencies.
* **Coverage over Quantity:** Focus on writing meaningful tests that cover edge cases, error handling, and business logic, rather than just achieving 100% code coverage.
* **Separate Server from App:** Always separate your `app.listen()` call from your Express app setup. This is crucial for Supertest to work correctly without causing port conflicts.

---

## Conclusion

* Automated API testing ensures code reliability and prevents regressions.
* Jest is a powerful testing framework for running tests and making assertions.
* Supertest enables easy simulation of HTTP requests to Express endpoints.
* Separating the Express `app` definition from the `server` startup is a best practice for testing.
* Tests should cover both successful operations and expected error states.

---

## Next Steps

* Explore database mocking with Prisma or Mongoose in Jest.
* Learn about Continuous Integration (CI) to run tests automatically on GitHub Actions.
* Deep dive into advanced Jest features like snapshot testing and custom matchers.

---
