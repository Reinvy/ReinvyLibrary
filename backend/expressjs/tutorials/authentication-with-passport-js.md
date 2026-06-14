---
title: "Authentication with Passport JS in Express"
description: "Learn how to implement secure local authentication (username and password) in an Express.js application using Passport.js middleware."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Authentication with Passport JS in Express

## Summary

This tutorial guides you through setting up Local Authentication (username and password) in an Express.js application using the Passport.js library, securing user sessions, and protecting private routes.

## Target Audience

Intermediate backend developers who want to understand session-based authentication and modular strategy setups in Node.js.

## Prerequisites

- Good understanding of Express.js and session middleware (`express-session`).
- Node.js installed locally.

## Learning Objectives

By the end of this tutorial, you will be able to:
- Understand Passport's modular architecture and its "Strategy" concept.
- Configure `passport-local` to validate user credentials against database records.
- Implement session serialization and deserialization.
- Protect Express routes with authentication middleware.

## Context and Motivation

Authentication is a core requirement of almost every web application. Building custom authentication logic from scratch is error-prone. Passport.js provides a robust, pluggable ecosystem with over 500+ authentication strategies, allowing you to easily manage user sessions and seamlessly upgrade to OAuth or social logins later.

## Core Content

### 1. Installation

Install Passport, the local strategy module, and express-session:

```bash
npm install passport passport-local express-session bcryptjs
```

### 2. Configuring Local Strategy

Define how Passport will verify user credentials:

```javascript
// passport-config.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Dummy database search helper
const findUserByUsername = (username) => {
  // In reality: return await db.users.findUnique({ where: { username } });
  return { id: 1, username: 'admin', passwordHash: 'hashed_password' };
};

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = findUserByUsername(username);
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Session Serialization
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  // Find user by id in database
  done(null, { id: 1, username: 'admin' });
});
```

### 3. Integrating with Express

Initialize Passport and session middleware inside your Express app:

```javascript
// app.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('./passport-config');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
```

## Code Examples

Here is how you handle login request and protect sensitive routes:

```javascript
// Auth Routes
app.post('/api/login', passport.authenticate('local', {
  successRedirect: '/api/dashboard',
  failureRedirect: '/api/login-failed'
}));

// Authentication protection middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized access" });
}

app.get('/api/dashboard', ensureAuthenticated, (req, res) => {
  res.json({ message: `Welcome to the dashboard, ${req.user.username}!` });
});
```

## Key Insights

- **Serialization Concept**: Serializing stores only the user ID in the session cookie, keeping the payload small. Deserializing queries the database on every subsequent request to load user details into `req.user`.
- **Bcrypt Security**: Always hash passwords using bcrypt before saving. Never compare plain-text passwords.
- **Session Security**: In production, ensure session cookies use `secure: true` (requiring HTTPS) and `httpOnly: true` to mitigate cross-site scripting (XSS) risks.

## Next Steps

- Replace the dummy database methods with real database queries using Mongoose or Prisma.
- Implement password recovery and validation middleware.

## Conclusion

You have successfully set up local username-password authentication using Passport.js, integrated it into Express.js session middleware, and secured dashboard routes.
