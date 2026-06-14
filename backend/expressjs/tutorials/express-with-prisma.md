---
title: "Integrating Prisma ORM with Express.js"
description: "A complete step-by-step guide to integrating Prisma ORM in an Express.js application, setting up schemas, migrations, and database queries."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Integrating Prisma ORM with Express.js

## Summary

This tutorial guides you through integrating Prisma ORM with an Express.js application. You will learn to set up PostgreSQL connection, define Prisma schemas, run migrations, and execute database queries in Express routes.

## Target Audience

Intermediate backend developers who want a modern, type-safe data access layer for relational databases in Express.js.

## Prerequisites

- Node.js and PostgreSQL database installed.
- Basic understanding of Express.js and SQL database concepts.

## Learning Objectives

By the end of this tutorial, you will be able to:
- Install Prisma CLI and Prisma Client.
- Configure PostgreSQL database connection strings in environment variables.
- Write models in `schema.prisma` and run migrations.
- Initialize and use Prisma Client in Express route handlers for CRUD operations.

## Context and Motivation

Traditionally, connecting relational databases in Node.js involved raw SQL queries or complex ORMs like Sequelize. Prisma offers a modern developer experience with complete type safety, auto-generated queries, and database migration tooling out of the box.

## Core Content

### 1. Setup Prisma

Install Prisma CLI as a developer dependency, and Prisma Client as a core dependency:

```bash
npm install prisma --save-dev
npm install @prisma/client
```

### 2. Initialize Prisma

Run the init command to create the schema and environment configuration:

```bash
npx prisma init
```

This creates a new `prisma` directory containing `schema.prisma`, and updates your `.env` file.

### 3. Database Connection

Configure your database connection URL in the `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/my_database?schema=public"
```

Define a model inside `prisma/schema.prisma`:

```prisma
model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
}
```

### 4. Database Migration

Run migration to apply the schema changes to your database:

```bash
npx prisma migrate dev --name init
```

## Code Examples

Create a shared Prisma Client instance:

```javascript
// db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
```

Use Prisma inside an Express router:

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();
const prisma = require('../db');

// GET all users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create user
router.post('/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    const user = await prisma.user.create({
      data: { name, email }
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
```

## Key Insights

- **Connection Pool**: Initialize the Prisma Client once and reuse it. Creating new instances in every route handler causes database connection exhaustion.
- **Environment Parity**: Always use environment variables for database URLs to keep credentials secure and separate production configuration.
- **Studio tool**: Use `npx prisma studio` to launch an interactive visual editor for your database records.

## Next Steps

- Explore relations (one-to-many, many-to-many) in Prisma schema.
- Implement data seeding to populate your database with dummy records for testing.

## Conclusion

You have successfully integrated Prisma ORM with Express.js, configured a database connection, run migrations, and handled database requests securely in Express routes.
