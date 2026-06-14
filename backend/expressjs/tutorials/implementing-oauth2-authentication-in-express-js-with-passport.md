---
title: "Implementing OAuth2 Authentication in Express JS with Passport"
description: "This tutorial covers how to implement OAuth2 authentication in an Express JS application using the popular passport library and passport-google-oauth20 strategy"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Implementing OAuth2 Authentication in Express JS with Passport

## Summary

This tutorial covers how to implement OAuth2 authentication in an Express JS application using the popular `passport` library and `passport-google-oauth20` strategy. It provides a robust, secure, and user-friendly way to authenticate users using third-party providers like Google.

---

## Target Audience

* Backend developers using Express JS
* Developers looking to integrate third-party login (SSO)
* Level: Intermediate

---

## Prerequisites

* Basic understanding of Express JS routing and middleware
* Familiarity with sessions in Express (`express-session`)
* Basic knowledge of authentication concepts
* A Google Cloud Console account to create OAuth credentials

---

## Learning Objectives

Setelah membaca materi ini, pembaca akan memahami:

* The core concepts of OAuth2 and how it differs from traditional username/password authentication.
* How to configure and use Passport.js in an Express application.
* How to implement Google OAuth2 for user login and registration.
* Best practices for managing user sessions and profile data after a successful OAuth login.

---

## Context and Motivation

In modern web applications, forcing users to create yet another username and password creates friction. OAuth2 allows users to log in using their existing accounts from trusted providers like Google, Facebook, or GitHub. This not only improves user experience by enabling Single Sign-On (SSO) but also enhances security, as your application doesn't need to store or manage user passwords directly. `passport.js` is the standard library in the Node.js ecosystem for implementing various authentication strategies, including OAuth2, in a clean, modular way.

---

## Core Content

### What is OAuth2?

OAuth2 is an authorization framework that enables applications to obtain limited access to user accounts on an HTTP service, such as Google or GitHub. It works by delegating user authentication to the service that hosts the user account and authorizing third-party applications to access the user account.

### Why Use Passport.js?

Passport is authentication middleware for Node.js. It is extremely flexible and modular. It supports over 500 authentication strategies (local, OAuth, OpenID). Using Passport saves you from writing complex authentication logic from scratch and ensures you follow industry best practices.

### 1. Setting Up Google Credentials

Before writing code, you need a Client ID and Client Secret from Google:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Navigate to "APIs & Services" > "Credentials".
4. Create "OAuth client ID" credentials.
5. Set the application type to "Web application".
6. Add an Authorized redirect URI (e.g., `http://localhost:3000/auth/google/callback`).
7. Save the Client ID and Client Secret securely.

### 2. Basic Setup and Configuration

First, install the required packages.

```bash
npm install express express-session passport passport-google-oauth20 dotenv
```

Next, configure Passport and Express.

### 3. Implementing the Strategy

You need to tell Passport how to use the Google strategy and how to handle user data serialization for sessions.

---

## Code Examples

Here is a complete, minimal example of implementing Google OAuth2 in Express.

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// 1. Session Middleware configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'a_very_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS in production
}));

// 2. Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// 3. Configure the Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // In a real application, you would find or create a user in your database here.
    // For this example, we just pass the profile along.
    // Example: User.findOrCreate({ googleId: profile.id }, function (err, user) { return cb(err, user); });

    // Simulating database lookup:
    const user = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails && profile.emails[0].value
    };
    return cb(null, user);
  }
));

// 4. Serialize and Deserialize User
// Serialization tells Passport what data to store in the session (usually just the user ID).
passport.serializeUser(function(user, done) {
  done(null, user);
});

// Deserialization uses the stored ID to retrieve the full user object on subsequent requests.
passport.deserializeUser(function(user, done) {
  // In a real app, you would fetch the user from the DB using the stored ID.
  done(null, user);
});

// --- Routes ---

// Home route
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`<h1>Hello, ${req.user.name}</h1> <a href="/logout">Logout</a>`);
  } else {
    res.send(`<h1>Welcome</h1> <a href="/auth/google">Login with Google</a>`);
  }
});

// 5. Authentication Route
// Redirects the user to Google for authentication. We ask for profile and email scopes.
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 6. Callback Route
// Google redirects back to this URL after authentication.
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

// 7. Logout Route
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 3000;
// Export for testing
if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
}
module.exports = app;
```

---

## Insight Penting

* **Security via Secrets:** Never hardcode your Client ID or Client Secret. Always use environment variables (`.env` files).
* **Session Management:** OAuth2 relies heavily on sessions to maintain the logged-in state after the initial authentication flow. Ensure your `express-session` is configured securely, especially in production (e.g., using secure cookies, proper session stores like Redis).
* **Finding vs. Creating Users:** The `verify` callback in the Passport strategy is where the crucial bridge between the OAuth provider and your application's database happens. You must handle both cases: an existing user logging in, and a new user registering via OAuth.
* **Token Storage:** The strategy callback provides an `accessToken` and `refreshToken`. If you only need to authenticate the user, you typically don't need to store these. However, if your application needs to make API calls to Google on behalf of the user (e.g., reading their calendar), you must store these tokens securely in your database.

---

## Ringkasan Akhir

* OAuth2 simplifies user login by offloading authentication to trusted third-party providers.
* `passport.js` is the standard tool for implementing authentication in Express, providing a modular architecture via strategies.
* Implementing Google OAuth2 requires setting up credentials in the Google Cloud Console.
* The integration involves configuring the `passport-google-oauth20` strategy, setting up session middleware, writing serialization/deserialization logic, and creating the necessary login and callback routes.

---

## Langkah Belajar Berikutnya

* Database Integration: Modify the strategy callback to save and retrieve users from a real database like MongoDB (using Mongoose) or PostgreSQL.
* Token Management: Learn how to handle and refresh OAuth `accessToken`s if you need to access Google APIs on behalf of the user.
* Combining Strategies: Learn how to implement both Local (username/password) and OAuth authentication in the same application.

---

## Metadata

* Level: Intermediate
* Topik utama: Express JS Authentication
* Topik terkait: OAuth2, Passport.js, Security, Sessions
* Kata kunci: express, oauth2, passport, google login, sso, authentication
* Estimasi waktu baca: 15 menit
