---
title: "Getting Started with Express Generator"
description: "Learn how to easily scaffold and set up a new Express.js application using the Express Generator CLI."
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Getting Started with Express Generator

## Summary

This tutorial walks you through installing and using the Express Generator command-line tool to quickly bootstrap a structured Express.js application layout.

## Target Audience

Beginner web developers who want to skip boilerplate setup and quickly establish a standard directory layout for Express.js.

## Prerequisites

- Node.js and npm installed on your system.
- Basic understanding of JavaScript and Command Line Interfaces (CLI).

## Learning Objectives

By the end of this tutorial, you will be able to:
- Install Express Generator globally.
- Scaffold a new project with or without view engines.
- Install project dependencies and run the development server.
- Understand the generated file structure and add a basic route.

## Context and Motivation

Setting up an Express.js project from scratch requires creating folder layouts, writing initial routing boilerplate, and configuring static assets. Express Generator automates this by scaffolding a standard layout, saving developers time.

## Core Content

### 1. Installation

Install Express Generator globally using npm:

```bash
npm install -g express-generator
```

### 2. Creating a Project

You can create a project with a view engine (like Pug or EJS) or without a view engine (using HTML/JSON APIs).

#### Scaffolding without a View Engine (Recommended for APIs)

```bash
express my-express-app --no-view
```

### 3. Running the Server

Navigate to the project folder, install dependencies, and start the app:

```bash
cd my-express-app
npm install
npm start
```

Your app will be running at `http://localhost:3000`.

## Code Examples

Here is how you add a new route inside the generated `routes/index.js` file:

```javascript
// routes/index.js
const express = require('express');
const router = express.Router();

router.get('/api/welcome', (req, res) => {
  res.json({ message: "Welcome to your scaffolded Express API!" });
});

module.exports = router;
```

## Key Insights

- **API-First Development**: If you are building a SPA (React/Vue/Next.js) or a mobile app, always scaffold with `--no-view` to avoid rendering overhead.
- **Production Running**: Avoid running with `npm start` in production. Instead, use a process manager like PM2:
  ```bash
  npm install -g pm2
  pm2 start bin/www --name "my-app"
  ```

## Next Steps

- Integrate a database like MongoDB or PostgreSQL into your new app.
- Learn how to structure routes using controllers for larger applications.

## Conclusion

You have successfully scaffolded an Express.js project using Express Generator, understood its folder structure, and added a custom JSON API endpoint.
