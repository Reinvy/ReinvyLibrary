---
title: "Database Integration with MongoDB and Mongoose in Express JS"
description: "This tutorial explains how to connect and interact with a MongoDB database in an Express.js application using Mongoose. You will learn how to set up the connect"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Database Integration with MongoDB and Mongoose in Express JS

## Summary

This tutorial explains how to connect and interact with a MongoDB database in an Express.js application using Mongoose. You will learn how to set up the connection, define schemas, build models, and perform basic CRUD (Create, Read, Update, Delete) operations.

## Target Audience

Beginner to intermediate backend developers who are already familiar with Express.js routing and middleware, and want to learn how to integrate a NoSQL database (MongoDB) into their Express applications.

## Prerequisites

- Basic understanding of Node.js and Express.js.
- Familiarity with RESTful API concepts.
- Node.js and npm installed on your machine.
- Access to a MongoDB database (either local installation or MongoDB Atlas).

## Learning Objectives

- Understand what MongoDB and Mongoose are and why they are used together.
- Learn how to establish a connection to a MongoDB database in an Express app.
- Learn how to define data structures using Mongoose Schemas and Models.
- Implement CRUD operations in Express routes using Mongoose.

## Context and Motivation

Most real-world applications need a way to store data persistently. MongoDB is a popular NoSQL database that pairs excellently with Node.js because it stores data in JSON-like documents (BSON). However, interacting directly with the native MongoDB driver can sometimes be verbose and lacks built-in data validation.

Mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js. It provides a straightforward, schema-based solution to model your application data. It includes built-in type casting, validation, query building, and business logic hooks, making database interactions in Express much safer and easier to manage.

## Core Content

### 1. Installing Dependencies

To get started, you need to install `mongoose` in your Express project.

```bash
npm install mongoose
```

### 2. Connecting to MongoDB

You should establish the database connection when your Express server starts. Create a separate file or add the connection logic in your main app file.

```javascript
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/my_express_db')
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));
```

*Note: In a production environment, always store your connection string in an environment variable (e.g., `process.env.MONGODB_URI`).*

### 3. Defining Schemas and Models

A Schema in Mongoose defines the structure of the document, default values, validators, etc. A Model is a compiled version of the Schema, which provides an interface to interact with the database.

Create a file named `User.js` in a `models` directory:

```javascript
const mongoose = require('mongoose');

// Define the Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  age: {
    type: Number,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compile the Model
const User = mongoose.model('User', userSchema);

module.exports = User;
```

### 4. Performing CRUD Operations

Once the model is defined, you can use it in your Express routes to perform CRUD operations. Mongoose models provide built-in methods like `.find()`, `.findById()`, `.create()`, `.findByIdAndUpdate()`, and `.findByIdAndDelete()`.

## Code Examples

Here is an example of an Express router implementing CRUD operations for the `User` model.

```javascript
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// CREATE: Add a new user
router.post('/users', async (req, res) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    console.error(error);
    // Generic error message to avoid Information Exposure
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// READ: Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// READ: Get a user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// UPDATE: Update a user by ID
router.put('/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Return updated doc and run schema validators
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE: Delete a user by ID
router.delete('/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
```

## Insight Penting

- **Validation:** Always define required fields, unique constraints, and types in your Mongoose schema. This is your first line of defense against bad data.
- **`runValidators` on Update:** By default, Mongoose does not run validators on `.findByIdAndUpdate()`. You must pass `{ runValidators: true }` in the options object.
- **Error Handling:** When a unique constraint (like `email: { unique: true }`) is violated, MongoDB throws a duplicate key error (code 11000). Ensure you catch these errors and return an appropriate response. Do not return raw database errors to the client to prevent Information Exposure.
- **Asynchronous Operations:** All Mongoose database operations are asynchronous. Always use `async/await` and wrap your logic in `try/catch` blocks.

## Ringkasan Akhir

- **Mongoose** is an ODM library that makes working with MongoDB in Node.js easier by providing schemas and models.
- You connect to MongoDB using `mongoose.connect()`.
- A **Schema** defines the structure of your data, while a **Model** is used to interact with the database.
- You can easily perform CRUD operations in your Express routes using Mongoose model methods like `.find()`, `.save()`, `.findByIdAndUpdate()`, and `.findByIdAndDelete()`.

## Langkah Belajar Berikutnya

- Learn how to implement relationships between different models (Population in Mongoose).
- Explore advanced query operators in MongoDB (e.g., `$gt`, `$in`, `$regex`).
- Understand how to structure a scalable Express app using the MVC (Model-View-Controller) architecture.

## Metadata

- Level: Beginner to Intermediate
- Topik utama: Express.js, Database Integration
- Topik terkait: MongoDB, Mongoose, Node.js, CRUD
- Kata kunci: express mongoose, mongodb express, mongoose schema, mongoose crud, express database
- Estimasi waktu baca: 10 menit
