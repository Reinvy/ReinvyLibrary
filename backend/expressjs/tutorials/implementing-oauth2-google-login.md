---
title: "Implementing OAuth2 Google Login in Express JS"
description: "This tutorial explains how to implement Google OAuth2 authentication in an Express.js application using passport and passport-google-oauth20. You will learn how"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Implementing OAuth2 Google Login in Express JS

## Summary

This tutorial explains how to implement Google OAuth2 authentication in an Express.js application using `passport` and `passport-google-oauth20`. You will learn how to securely authenticate users via their Google accounts, handle callbacks, and manage sessions effectively.

## Target Audience

- **Target Audience:** Intermediate back-end developers.
- **Level:** Intermediate.

## Prerequisites

- Solid understanding of Express.js routing and middleware.
- Familiarity with session management and cookies (see [Understanding Cookies and Session Management in Express JS](Understanding%20Cookies%20and%20Session%20Management%20in%20Express%20JS.md)).
- A basic understanding of Authentication and Authorization concepts.
- A Google Cloud Console account to generate OAuth credentials.

## Learning Objectives

- Understand the OAuth 2.0 flow and how it works with Google.
- Configure Google Cloud Console to obtain a Client ID and Client Secret.
- Integrate `passport` and `passport-google-oauth20` into an Express.js app.
- Serialize and deserialize users to maintain login sessions.
- Securely handle the callback from Google and retrieve user profiles.

## Context and Motivation

Users today prefer not to create new passwords for every site they visit. Implementing "Login with Google" using OAuth 2.0 provides a frictionless onboarding experience, increases conversion rates, and delegates password security to Google. However, implementing OAuth manually involves complex handshakes and token validations. Passport.js simplifies this by providing a unified abstraction over various authentication strategies, allowing you to easily add robust social logins to your Express application.

## Core Content

### 1. Understanding the OAuth2 Flow

OAuth 2.0 is an authorization framework. For Google Login, the flow is:

1. **Redirect**: The user clicks "Login with Google" and is redirected to Google's consent screen.
2. **Consent**: The user grants your application permission to read their profile/email.
3. **Callback**: Google redirects the user back to your server with an authorization `code`.
4. **Token Exchange**: Your server exchanges the `code` for an `access_token` behind the scenes.
5. **Profile Fetch**: Your server uses the `access_token` to fetch the user's profile information.

### 2. Setting Up Google Cloud Console

Before writing code, you need credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials** and select **OAuth client ID**.
5. Choose **Web application** as the application type.
6. Add `http://localhost:3000` to **Authorized JavaScript origins**.
7. Add `http://localhost:3000/auth/google/callback` to **Authorized redirect URIs**.
8. Save the generated **Client ID** and **Client Secret**. Keep these secure in your `.env` file!

### 3. Installing Dependencies

You will need Express, Express Session, Passport, and the Google Strategy:

```bash
npm install express express-session passport passport-google-oauth20 dotenv
```

### 4. Configuring Passport and Express

Create an Express app and configure session management and Passport.

```javascript
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// Configure Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'super_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS in production
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Mock database for illustration purposes
const mockUserDatabase = [];

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // In a real application, you would find or create the user in your database
    let user = mockUserDatabase.find(u => u.googleId === profile.id);

    if (!user) {
      user = {
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : ''
      };
      mockUserDatabase.push(user);
    }

    // Pass the user object to the next stage (serialization)
    return cb(null, user);
  }
));

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.googleId);
});

// Deserialize user from the session
passport.deserializeUser((id, done) => {
  const user = mockUserDatabase.find(u => u.googleId === id);
  done(null, user);
});
```

### 5. Defining the Routes

Now, define the routes that trigger the authentication and handle the callback.

```javascript
// 1. Route to initiate the Google Login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. Callback route that Google redirects to
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  }
);

// Middleware to protect routes
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) { return next(); }
  res.status(401).send('Please log in first.');
};

// Protected profile route
app.get('/profile', ensureAuthenticated, (req, res) => {
  res.send(`Welcome, ${req.user.name}! Your email is ${req.user.email}`);
});

// Logout route
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

## Code Examples

Imagine entering an exclusive club (your app). Instead of signing up and giving them your ID to photocopy (traditional registration), you simply show them a VIP pass stamped by a trusted authority like the Mayor (Google). The club trusts the Mayor. When you show the pass, the club asks the Mayor, "Is this person legit?" The Mayor says, "Yes, here is their name and public email." The club lets you in and gives you a temporary wristband (Session Cookie) so they don't have to call the Mayor every time you go to the bar.

## Insight Penting

- **Always Use Environment Variables**: Never hardcode your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Always use `.env` files and add them to your `.gitignore`.
- **Session Store**: In the example, we use the default memory store for sessions, which is NOT meant for production as it leaks memory and resets on server restart. Use Redis (`connect-redis`) or your primary database for session storage in production.
- **Handling Existing Users**: If a user previously signed up with an email/password, and then later clicks "Login with Google" using the *same* email, you need logic to link the Google ID to their existing account rather than creating a duplicate.
- **HTTPS is Mandatory**: OAuth2 relies heavily on the confidentiality of tokens and callbacks. In production, your callback URL must use HTTPS.

## Ringkasan Akhir

- OAuth2 allows users to authenticate using external providers like Google, enhancing user experience and security.
- `passport.js` and `passport-google-oauth20` abstract away the complex token exchange and redirect flows.
- The process involves redirecting the user to Google, handling the callback with an authorization code, fetching the profile, and establishing a local session.
- Secure session management and environment variable configuration are critical for a secure implementation.

## Langkah Belajar Berikutnya

- Integrating a proper database (like MongoDB or PostgreSQL) to persist users.
- [Implementing Refresh Tokens with JWT in Express](Implementing%20Refresh%20Tokens%20with%20JWT%20in%20Express.md).
- Adding alternative social logins (e.g., GitHub or Facebook) using other Passport strategies.

## Metadata

- Level: Intermediate
- Topik utama: Express.js, Authentication
- Topik terkait: OAuth2, Passport.js, Session Management, Security
- Kata kunci: express js, google login, oauth2, passport, passport-google-oauth20, authentication
- Estimasi waktu baca: 10 - 15 minutes
