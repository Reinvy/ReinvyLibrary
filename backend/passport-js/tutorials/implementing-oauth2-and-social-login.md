---
title: "Implementing OAuth2 and Social Login in Express.js"
description: "This material explains how to implement OAuth2 to enable Social Login (like Google, GitHub, or Facebook) in an Express.js application using the Passport.js libr"
category: "backend"
technology: "passport-js"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Implementing OAuth2 and Social Login in Express.js

## Summary

This material explains how to implement OAuth2 to enable Social Login (like Google, GitHub, or Facebook) in an Express.js application using the Passport.js library. You will learn how the OAuth2 flow works and how to integrate it securely, allowing users to log in without creating a new password.

---

## Target Audience

- **Target Audience:** Intermediate backend developers.
- **Level:** Intermediate.

---

## Prerequisites

- Understanding of basic Express.js routing and middleware.
- Familiarity with session management and cookies in Express.js.
- Basic knowledge of authentication concepts.

---

## Learning Objectives

After reading this material, you will understand:

- How the OAuth2 protocol works for authentication and authorization.
- How to configure Passport.js with the Google OAuth2 strategy in Express.js.
- How to manage user sessions after a successful social login.
- The benefits and potential pitfalls of using third-party identity providers.

---

## Context and Motivation

In modern web applications, forcing users to create and remember yet another password can increase friction and reduce sign-up rates. Social Login solves this by allowing users to authenticate using their existing accounts from providers like Google, GitHub, or Apple.

Under the hood, this is typically powered by OAuth2 (Open Authorization). It is a standard protocol that allows a user to grant a third-party application limited access to their resources without exposing their password. Understanding how to implement OAuth2 in Express.js is a highly sought-after skill for building modern, user-friendly, and secure applications.

---

## Core Content

### 1. Understanding the OAuth2 Flow

Before diving into code, it's crucial to understand the high-level flow of OAuth2 for authentication (often referred to as OpenID Connect):

1. **User requests login:** The user clicks "Login with Google" on your site.
2. **Redirect to Provider:** Your server redirects the user to Google's consent screen.
3. **User grants permission:** The user logs into Google and grants your app permission to access their profile.
4. **Callback with Authorization Code:** Google redirects the user back to your server with a temporary "authorization code".
5. **Exchange Code for Tokens:** Your server secretly exchanges this code with Google for an Access Token (and sometimes a Refresh Token or ID Token) and user profile information.
6. **Session Creation:** Your server uses the profile info to create or log in the user, establishing a session.

### 2. Setting Up Passport.js

In the Node.js ecosystem, [Passport.js](https://www.passportjs.org/) is the de facto standard for authentication. It uses "strategies" for different providers. For Google, we use `passport-google-oauth20`.

You also need `express-session` to keep the user logged in between requests.

### 3. Configuring the Google Strategy

First, you must create credentials (Client ID and Client Secret) in the Google Cloud Console.

Then, configure Passport in your Express app:

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// Configure Session
app.use(session({
  secret: 'your_super_secret_key',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // In a real app, you would find or create a user in your database here
    // Example: User.findOrCreate({ googleId: profile.id }, function (err, user) { return done(err, user); });

    // For this example, we just pass the profile as the user
    return done(null, profile);
  }
));

// Serialize and Deserialize User
passport.serializeUser((user, done) => {
  // Store user.id in the session
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Fetch user from database by ID
  // Example: User.findById(id, function(err, user) { done(err, user); });
  done(null, { id: id, name: 'John Doe' }); // Mocked user
});
```

### 4. Creating the Authentication Routes

You need two routes: one to initiate the login, and one to handle the callback from Google.

```javascript
// 1. Initiate the login process
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. Handle the callback after Google authenticates the user
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  }
);
```

### 5. Protecting Routes

To protect routes, you can check if `req.isAuthenticated()` is true.

```javascript
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.send(`Welcome, ${req.user.name}`);
});
```

---

## Code Examples

Imagine you want to enter an exclusive club (your app), but you forgot your ID.
Instead of filling out a long form to get a new ID from the club, the bouncer says, "Do you have your driving license?" (Google).
You show your driving license. The bouncer trusts the government (Google) that issued it, writes down your name, and lets you in.
OAuth2 is this process of establishing trust between your application and a third-party identity provider.

---

## Insight Penting

- **Security of Client Secret:** Never expose your `Client Secret` in frontend code or public repositories. It must remain securely on your backend server, usually stored in `.env` variables.
- **Callback URL Mismatch:** The most common error in OAuth2 is `redirect_uri_mismatch`. Ensure the callback URL configured in your Google Cloud Console exactly matches the `callbackURL` in your Passport strategy.
- **Handling Existing Users:** If a user signs up with email/password and later tries to log in with Google using the same email, your application should gracefully handle linking the accounts instead of throwing a duplicate email error.

---

## Ringkasan Akhir

- OAuth2 allows secure, passwordless authentication using third-party providers.
- Passport.js simplifies OAuth2 implementation in Express through strategies like `passport-google-oauth20`.
- The process requires a client ID and client secret from the provider.
- You must handle the initial redirect to the provider and the callback route to exchange the authorization code.
- Sessions are typically used to maintain the authenticated state after a successful OAuth2 login.

---

## Langkah Belajar Berikutnya

- Explore implementing multiple OAuth providers (e.g., GitHub, Facebook) alongside Google.
- Learn how to integrate OAuth2 with JSON Web Tokens (JWT) instead of sessions for stateless authentication.
- Implement account linking logic in your database (e.g., merging a Google login with an existing email login).

---

## Metadata

- Level: Intermediate
- Topik utama: Express.js, Backend Development
- Topik terkait: Authentication, OAuth2, Security, Passport.js
- Kata kunci: express oauth2, passport js, google login, social login, openid connect
- Estimasi waktu baca: 10 - 15 minutes
