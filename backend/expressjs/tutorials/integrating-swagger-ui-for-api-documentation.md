---
title: "Integrating Swagger UI for API Documentation in Express.js"
description: "This tutorial explains how to integrate Swagger UI into an Express.js application using swagger-ui-express and swagger-jsdoc. By the end of this guide, you will"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Integrating Swagger UI for API Documentation in Express.js

## Summary

This tutorial explains how to integrate Swagger UI into an Express.js application using `swagger-ui-express` and `swagger-jsdoc`. By the end of this guide, you will be able to automatically generate and serve interactive API documentation directly from your code annotations.

## Target Audience

This material is designed for beginner to intermediate Node.js developers who have built RESTful APIs using Express.js and want to learn how to document them professionally.

## Prerequisites

- Basic understanding of JavaScript and Node.js.
- Familiarity with Express.js routing and middleware.
- Knowledge of what a RESTful API is (endpoints, HTTP methods, status codes).

## Learning Objectives

- Understand what Swagger and OpenAPI are.
- Learn how to set up `swagger-ui-express` and `swagger-jsdoc` in an Express project.
- Write JSDoc comments to document API endpoints according to the OpenAPI specification.
- Serve interactive API documentation via a dedicated endpoint.

## Context and Motivation

Building a great API is only half the battle; the other half is communicating how to use it. Without proper documentation, frontend developers, mobile teams, or external clients will struggle to integrate with your services. Swagger (based on the OpenAPI Specification) solves this by providing a standardized, machine-readable format for describing APIs. Integrating Swagger UI into your Express app allows consumers to explore and test endpoints interactively from their browsers, reducing integration time and minimizing miscommunication.

## Core Content

### 1. Introduction to Swagger and OpenAPI

OpenAPI is a specification for building APIs, and Swagger is a suite of tools built around the OpenAPI specification. In the Express.js ecosystem, we typically use two libraries:

- **`swagger-jsdoc`**: Reads your JSDoc-annotated source code and generates an OpenAPI JSON configuration.
- **`swagger-ui-express`**: Takes the JSON configuration and serves it using the Swagger UI interface.

### 2. Installing the Dependencies

To get started, you need to install the required packages in your Express project:

```bash
npm install swagger-ui-express swagger-jsdoc
```

### 3. Configuring Swagger

You need to create a configuration object that tells Swagger about your API (title, version, description) and where to find your endpoint documentation (e.g., in your route files).

### 4. Documenting Endpoints with JSDoc

Once configured, you write JSDoc comments above your route handlers. These comments use YAML syntax to define the endpoint's path, HTTP method, parameters, request body, and possible responses.

## Code Examples

Here is a complete example of setting up Swagger in an Express application.

**app.js (or index.js)**:

```javascript
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(express.json());

// 1. Define Swagger Options
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Users API',
      version: '1.0.0',
      description: 'A simple Express API to manage users',
      contact: {
        name: 'Developer',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./app.js'],
};

// 2. Initialize swagger-jsdoc
const swaggerDocs = swaggerJsdoc(swaggerOptions);

// 3. Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- API Routes with Documentation ---

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Retrieve a list of users
 *     description: Retrieve a list of users from the database.
 *     responses:
 *       200:
 *         description: A list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: John Doe
 */
app.get('/users', (req, res) => {
  res.status(200).json([
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' }
  ]);
});

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Alice
 *     responses:
 *       201:
 *         description: User created successfully.
 */
app.post('/users', (req, res) => {
  const { name } = req.body;
  res.status(201).json({ id: Date.now(), name });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
```

When you run this application and navigate to `http://localhost:3000/api-docs`, you will see a fully interactive UI where you can test the `GET /users` and `POST /users` endpoints.

## Insight Penting

- **Keep Documentation Close to Code**: By using `swagger-jsdoc`, your documentation lives right next to your route logic. This makes it much easier to keep the documentation up-to-date as the code evolves.
- **YAML Indentation**: The JSDoc comments use YAML format. YAML is strictly reliant on indentation. A common mistake is misaligning spaces, which will cause Swagger to fail to render that specific endpoint.
- **Security Definitions**: In real-world APIs, you often need authentication (like JWT). Swagger allows you to define global security schemes (e.g., Bearer auth) so you can test protected endpoints directly from the UI.
- **Separation of Concerns**: In larger projects, instead of pointing `apis: ['./app.js']`, you will point it to your routes folder (e.g., `apis: ['./routes/*.js']`) to keep the main entry file clean.

## Ringkasan Akhir

- Swagger UI provides a visual, interactive interface for exploring REST APIs.
- The `swagger-ui-express` library serves the UI, while `swagger-jsdoc` generates the OpenAPI specification from comments in your code.
- Setting up Swagger involves defining a configuration object, initializing the docs, and writing YAML-based JSDoc comments above your routes.
- This approach greatly improves developer experience (DX) for anyone consuming your API.

## Langkah Belajar Berikutnya

- Learn how to document protected endpoints by configuring Bearer Token/JWT authentication in Swagger.
- Explore how to extract Swagger definitions into separate YAML or JSON files for highly complex APIs.
- Study "Data Validation and Error Handling in Express" to ensure your documented endpoints gracefully handle bad requests.

## Metadata

- Level: Menengah
- Topik utama: Express.js, API Documentation
- Topik terkait: RESTful API, Swagger, OpenAPI
- Kata kunci: express, swagger, swagger-ui, swagger-jsdoc, api documentation, openapi
- Estimasi waktu baca: 10 menit
