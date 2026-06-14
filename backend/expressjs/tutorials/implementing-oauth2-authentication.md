---
title: "Implementing OAuth2 Authentication in Express JS"
description: "This material covers the integration of OAuth2 authentication in an Express.js application using Passport.js. You will learn how to allow users to log in using"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Implementing OAuth2 Authentication in Express JS

## Summary

This material covers the integration of OAuth2 authentication in an Express.js application using Passport.js. You will learn how to allow users to log in using third-party providers like Google or GitHub, securely manage the authentication flow, and handle user sessions.

## Target Audience

- **Target Audience:** Intermediate backend developers who want to add social login features to their applications.
- **Level:** Intermediate.

## Prerequisites

- Solid understanding of Express.js routing and middleware.
- Familiarity with session management and cookies in Express.js.
- Basic understanding of how OAuth2 works conceptually.
- Have read [Authentication and Authorization with JWT in Express](Authentication%20and%20Authorization%20with%20JWT%20in%20Express.md).

## Learning Objectives

After completing this material, you will be able to:

- Understand the OAuth2 authentication flow.
- Set up a third-party OAuth2 application (e.g., Google Console) to get Client ID and Client Secret.
- Install and configure Passport.js with an OAuth2 strategy.
- Create login, callback, and logout routes for OAuth2.
- Securely store and retrieve user data from the database upon successful authentication.

## Context and Motivation

Building your own authentication system (username and password) from scratch is error-prone and adds friction for users who have to remember yet another password. OAuth2 solves this by allowing users to securely authenticate using their existing accounts from trusted providers like Google, GitHub, or Facebook.

For developers, integrating OAuth2 reduces the risk of password breaches since your application never stores the user's password. Passport.js is the most popular authentication middleware for Node.js, providing an elegant and modular way to integrate hundreds of different authentication strategies, including OAuth2.

## Core Content

### 1. The OAuth2 Flow

The typical OAuth2 flow involves a few key steps:

1. **User Initiates Login:** The user clicks "Login with Google".
2. **Redirect to Provider:** Your app redirects the user to Google's authorization server.
3. **User Grants Permission:** The user logs into Google and grants your app permission to access their profile.
4. **Callback:** Google redirects the user back to your app with an authorization code.
5. **Exchange for Token:** Your app exchanges the code for an access token (and optionally a refresh token) behind the scenes.
6. **Fetch Profile:** Your app uses the token to fetch the user's profile data and logs them in.

### 2. Setting Up Passport.js

First, you need to install the necessary packages. For this example, we will use the Google OAuth2 strategy.

```bash
npm install passport passport-google-oauth20 express-session
```

### 3. Configuring the Strategy

You must obtain a Client ID and Client Secret from your provider (e.g., Google Cloud Console) and provide them to Passport.

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists in the database
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // If not, create a new user
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value
        });
      }

      // Return the user object
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));
```

### 4. Session Serialization

Passport needs to know how to store the user in the session and how to retrieve them on subsequent requests.

```javascript
passport.serializeUser((user, done) => {
  // Store only the user ID in the session to save space
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Retrieve the full user object from the database using the ID
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
```

### 5. Creating Authentication Routes

Now, you need to create the routes that initiate the login and handle the callback.

```javascript
const express = require('express');
const app = express();

// Initialize session middleware
app.use(require('express-session')({ secret: 'secret_key', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Route to initiate the login flow
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Route for the callback from Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  }
);

// Route to check if user is logged in
app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Welcome ${req.user.name}`);
  } else {
    res.redirect('/login');
  }
});

// Logout route
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});
```

## Code Examples

Think of OAuth2 like using a valet parking ticket to get a key to a specific hotel room.

1. You give your car (credentials) to the valet (Google).
2. The valet gives you a ticket (authorization code).
3. You give the ticket to the hotel reception (your Express backend).
4. The reception verifies the ticket with the valet and gives you a room key (session cookie/JWT).
5. You use the room key to access your room (protected routes). Your app never directly handled your car keys (passwords).

## Insight Penting

- **Security over Convenience:** Never expose your `clientSecret` to the frontend. The exchange of the authorization code for an access token must happen securely on your Express backend.
- **State Parameter:** Use the `state` parameter during the authorization request to prevent Cross-Site Request Forgery (CSRF) attacks.
- **Stateless APIs:** If you are building a purely RESTful API (e.g., for a mobile app or SPA), using sessions might not be ideal. In such cases, you can use Passport to handle the OAuth2 flow and then issue a JWT in the callback route instead of relying on `express-session`.

## Ringkasan Akhir

- OAuth2 delegates authentication to trusted third-party providers, improving security and user experience.
- Passport.js simplifies OAuth2 integration in Express using specific strategies (e.g., `passport-google-oauth20`).
- The process involves defining the strategy, managing serialization/deserialization, and setting up login and callback routes.
- Always handle the exchange of tokens on the backend to keep secrets safe.

## Langkah Belajar Berikutnya

- [Implementing Role-Based Access Control in Express JS](Implementing%20Role-Based%20Access%20Control%20in%20Express%20JS.md)
- [Express JS Security Best Practices](Express%20JS%20Security%20Best%20Practices.md)

## Metadata

- Level: Intermediate
- Topik utama: Express.js, Backend Development, Authentication
- Topik terkait: OAuth2, Passport.js, Security, Session Management
- Kata kunci: express oauth2, passport js, google login, social login, authentication
- Estimasi waktu baca: 10 - 15 minutes
