---
title: "Implementing OAuth 2.0 and Social Login in Express JS"
description: "A comprehensive guide on integrating Google OAuth 2.0 social login into an Express.js application using Passport.js."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Implementing OAuth 2.0 and Social Login in Express JS

## Summary

This tutorial covers the integration of Google OAuth 2.0 social login in an Express.js application using Passport.js, explaining the underlying OAuth flow, client registration, callback configuration, and session security.

## Target Audience

Intermediate backend developers who want to replace or augment username-password logins with secure, third-party social authentication.

## Prerequisites

- Understanding of Express.js, session middleware, and basic passport configuration.
- A Google Developer Account to create Client IDs.

## Learning Objectives

By the end of this tutorial, you will be able to:
- Explain the OAuth 2.0 Authorization Code flow.
- Register an application in Google Cloud Console and generate Client credentials.
- Set up `passport-google-oauth20` strategy in Express.
- Handle OAuth callback routes and manage user profiles in databases.

## Context and Motivation

Users prefer avoiding creating unique passwords for every site. Social login reduces friction during sign-up and sign-in while outsourcing password security and multi-factor authentication (MFA) to trusted identity providers like Google, GitHub, or Facebook.

## Core Content

### 1. Installation

Install Passport and the Google OAuth 2.0 strategy package:

```bash
npm install passport passport-google-oauth20 express-session dotenv
```

### 2. Registering with Google Console

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Configure the **OAuth consent screen** (User Type: External).
4. Go to **Credentials**, click **Create Credentials**, and choose **OAuth client ID**.
5. Set Application Type to **Web application**.
6. Under **Authorized redirect URIs**, add:
   `http://localhost:3000/auth/google/callback`
7. Save and copy the generated **Client ID** and **Client Secret** into your `.env` file.

```env
GOOGLE_CLIENT_ID="your_client_id"
GOOGLE_CLIENT_SECRET="your_client_secret"
SESSION_SECRET="supersecretkey"
```

### 3. Configuring Google Strategy

Configure Passport to handle Google identity tokens:

```javascript
// passport-oauth.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Look up user in local database using profile.id (Google ID)
      // If user doesn't exist, create a new record in your database.
      const user = { id: profile.id, displayName: profile.displayName };
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
```

## Code Examples

Set up redirect and callback endpoints in Express:

```javascript
// app.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();
require('./passport-oauth');

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Route to initiate Google login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback route where Google redirects the user
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login-failed' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Protected Dashboard route
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ message: `Logged in as ${req.user.displayName} via Google!` });
});

app.listen(3000, () => console.log('Server started on port 3000'));
```

## Key Insights

- **Scopes**: Only request fields you actually need (e.g. `profile`, `email`). Requesting unnecessary scopes might lead users to decline logging in.
- **State Parameter**: Although handled automatically by Passport, the `state` parameter is crucial for protecting against CSRF (Cross-Site Request Forgery) attacks.
- **Handling token updates**: Access tokens are temporary. In advanced scenarios, save the `refreshToken` in a secure database to request new access tokens offline.

## Next Steps

- Handle database storage logic in the Google Strategy callback to link Google accounts with existing local user accounts.
- Learn how to integrate GitHub OAuth2 strategy for developer-centric login.

## Conclusion

You have successfully registered an OAuth application in the Google Developer Console, configured Passport's Google OAuth 2.0 strategy, initiated auth redirects, and secured callback session handlers.
