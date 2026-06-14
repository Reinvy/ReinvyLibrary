---
title: "Implementing OAuth2 Authentication with Passport in Express JS"
description: "This tutorial explains how to implement OAuth2 authentication in an Express.js application using the popular passport library. We will focus on integrating \"Log"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Implementing OAuth2 Authentication with Passport in Express JS

## Summary

This tutorial explains how to implement OAuth2 authentication in an Express.js application using the popular `passport` library. We will focus on integrating "Login with Google" as a practical example to demonstrate the OAuth2 flow, including setting up an application in the Google Developer Console, configuring Passport strategies, and managing user sessions.

## Target Audience

This material is designed for intermediate backend developers who have a basic understanding of Express.js, routing, and session management, and are looking to add third-party social login capabilities (like Google, GitHub, or Facebook) to their applications securely.

## Prerequisites

- Basic understanding of Express.js routing and middleware.
- Familiarity with the concepts of authentication and sessions.
- Node.js installed on your local machine.
- A basic understanding of how APIs and callbacks work.

## Learning Objectives

- Understand the basic concepts and flow of the OAuth2 protocol.
- Learn how to configure an OAuth2 application (e.g., Google OAuth2).
- Learn how to integrate `passport` and `passport-google-oauth20` into an Express.js application.
- Understand how to handle authentication callbacks and manage user sessions after a successful OAuth2 login.

## Context and Motivation

Modern web applications frequently offer users the ability to log in using their existing accounts from providers like Google, Facebook, or GitHub. This improves user experience by eliminating the need to create and remember a new password, and it often increases conversion rates. OAuth2 is the industry-standard protocol for authorization that makes this possible. Implementing OAuth2 from scratch can be complex and error-prone, but using the `passport` library in Express.js significantly simplifies the process, providing a standardized way to handle various authentication strategies.

## Core Content

### 1. Understanding the OAuth2 Flow

OAuth2 allows an application to access resources hosted by other web apps on behalf of a user. The typical "Social Login" flow involves:

1. **The User** clicks "Login with Google".
2. **The App** redirects the user to Google's consent screen.
3. **The User** logs in to Google and grants the App permission to access their profile.
4. **Google** redirects the user back to the App with an authorization code.
5. **The App** exchanges the authorization code for an access token (and optionally a refresh token) directly with Google.
6. **The App** uses the access token to fetch the user's profile data and logs the user in.

### 2. Setting up the Google Developer Console

To use Google OAuth2, you must create a project in the [Google Cloud Console](https://console.cloud.google.com/):

1. Create a new project.
2. Navigate to **APIs & Services > Credentials**.
3. Click **Create Credentials > OAuth client ID**.
4. Configure the OAuth consent screen if prompted (select "External" for testing).
5. Set the Application type to **Web application**.
6. Add an **Authorized redirect URI** (e.g., `http://localhost:3000/auth/google/callback`).
7. Save the **Client ID** and **Client Secret**. Keep the secret secure!

### 3. Installing Dependencies

You will need Express, Passport, the Google Strategy, and a session manager.

```bash
npm install express passport passport-google-oauth20 express-session
```

### 4. Configuring Passport and Express

You need to configure `express-session` to manage user sessions, initialize Passport, and set up the Passport Google Strategy using your Client ID and Secret. You also need to define how Passport serializes and deserializes user information to and from the session.

### 5. Creating Authentication Routes

You need two primary routes:

- The route to initiate the authentication (redirects the user to Google).
- The callback route where Google redirects the user back to your app with the authorization code.

## Code Examples

Here is a complete, minimal example of an Express application using `passport-google-oauth20`:

```javascript
// app.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// 1. Configure Express Session
app.use(session({
  secret: 'your_super_secret_key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: true,
}));

// 2. Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// 3. Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: 'YOUR_GOOGLE_CLIENT_ID',         // Replace with your Client ID
    clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET', // Replace with your Client Secret
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // In a real application, you would find or create the user in your database here.
    // For this example, we just pass the profile as the user object.
    return done(null, profile);
  }
));

// 4. Serialize and Deserialize User
passport.serializeUser(function(user, done) {
  // Store the user's unique identifier in the session
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  // In a real app, fetch the user from the database using the id
  // For this example, we'll just mock the user object
  done(null, { id: id, name: 'Mock User' });
});

// 5. Authentication Routes

// Initiate Google Login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Callback Route
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });

// 6. Protected Route Example
app.get('/profile', (req, res) => {
  // req.isAuthenticated() is provided by Passport
  if (req.isAuthenticated()) {
      res.send(`<h1>Welcome, ${req.user.name}</h1><a href="/logout">Logout</a>`);
  } else {
      res.redirect('/auth/google');
  }
});

// 7. Logout Route
app.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.get('/', (req, res) => {
    res.send('<a href="/auth/google">Login with Google</a>');
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```

## Insight Penting

- **Security:** Never expose your `clientSecret` to the client-side code or commit it to a public repository. Always use environment variables (`.env`).
- **Scopes:** The `scope` parameter in `passport.authenticate` defines what information you are requesting from the user (e.g., `['profile', 'email']`). Only request the data you actually need.
- **Stateless APIs:** If you are building a purely stateless API (e.g., a backend for a React/Vue SPA or mobile app) instead of a traditional server-rendered web app, you might not use `express-session`. Instead, after a successful OAuth callback, your server would generate a JWT (JSON Web Token) and send it back to the client.
- **Database Integration:** The `verify` callback in the `GoogleStrategy` is where you bridge the gap between the OAuth provider and your own database. You should look up the user by their Google ID, and if they don't exist, create a new user record before calling `done(null, user)`.

## Ringkasan Akhir

- OAuth2 provides a secure and user-friendly way to implement social logins.
- `passport.js` acts as a middleware for Node.js that abstracts the complexities of various authentication strategies.
- Implementing Google OAuth2 requires setting up credentials in the Google Developer Console, configuring `passport-google-oauth20`, handling sessions, and defining login and callback routes.
- Always secure your client secrets and handle user data responsibly.

## Langkah Belajar Berikutnya

- [Authentication and Authorization with JWT in Express](Authentication%20and%20Authorization%20with%20JWT%20in%20Express.md)
- [Working with Cookies and Sessions in Express JS](Working%20with%20Cookies%20and%20Sessions%20in%20Express%20JS.md)
- [Environment Variables in Express JS](Environment%20Variables%20in%20Express%20JS.md)

## Metadata

- Level: Intermediate
- Topik utama: Authentication, Express.js
- Topik terkait: Passport.js, OAuth2, Security, Sessions
- Kata kunci: express, passport, oauth2, google login, authentication, social login
- Estimasi waktu baca: 12 menit
