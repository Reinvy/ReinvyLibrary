# Implementing OAuth 2.0 Authentication in Express JS with Passport

## Ringkasan Singkat

This tutorial covers how to implement OAuth 2.0 authentication in an Express.js application using the Passport.js library. We will explore how to integrate social login (specifically Google OAuth), manage user sessions, and securely handle the authentication flow.

---

## Untuk Siapa Materi Ini

* Target audience: Backend Developers, Fullstack Developers
* Reader level: Intermediate

---

## Prasyarat

To fully understand this tutorial, you should be familiar with:

* Basic Express.js routing and middleware.
* Understanding of general authentication concepts.
* Familiarity with working with Cookies and Sessions in Express.js.

---

## Tujuan Belajar

After reading this material, readers will understand:

* The core concepts of the OAuth 2.0 flow.
* How to configure Passport.js for OAuth 2.0 authentication in Express.js.
* How to register and use a Passport strategy (e.g., Google OAuth20).
* How to serialize and deserialize users for session management.

---

## Konteks dan Motivasi

In modern web applications, forcing users to create yet another username and password can lead to drop-offs during registration. OAuth 2.0 allows users to log in using their existing accounts from providers like Google, GitHub, or Facebook.

Passport.js is the most popular authentication middleware for Node.js. It simplifies the complex OAuth 2.0 handshake, making it easy to integrate multiple authentication strategies into an Express application without reinventing the wheel. Understanding Passport and OAuth is essential for building user-friendly and secure applications.

---

## Materi Inti

### What is OAuth 2.0?

OAuth 2.0 is an authorization framework that enables applications to obtain limited access to user accounts on an HTTP service (like Google or Facebook) without exposing the user's password. It works by delegating user authentication to the service that hosts the user account and authorizing third-party applications to access the user account.

### Why Passport.js?

Passport is authentication middleware for Node.js. It is extremely flexible and modular, allowing you to choose from over 500 "strategies" (authentication mechanisms). Instead of writing custom logic for every provider's OAuth flow, Passport abstracts the repetitive parts (like redirecting to the provider, handling the callback, and exchanging the code for a token).

### The OAuth 2.0 Flow with Passport

1. **Client Request:** The user clicks "Login with Google".
2. **Redirection:** The Express server (via Passport) redirects the user to Google's consent screen.
3. **User Consent:** The user logs into Google and grants permission to your app.
4. **Callback:** Google redirects the user back to your Express server's callback URL with an authorization code.
5. **Token Exchange:** Passport automatically exchanges this code for an Access Token and fetches the user's profile.
6. **Session Creation:** Your application processes the profile (e.g., saving it to a database) and Passport serializes the user into the session.

---

## Contoh / Ilustrasi

Below is a practical implementation of Google OAuth 2.0 using `passport` and `passport-google-oauth20`.

### 1. Installation

First, install the necessary packages:

```bash
npm install express express-session passport passport-google-oauth20 dotenv
```

### 2. Setting Up Passport Strategy

Create a file `passport.js` to configure your strategy. You will need to obtain a `CLIENT_ID` and `CLIENT_SECRET` from the Google Cloud Console.

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// Configure the Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // In a real app, you would find or create a user in your database here
    const user = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value
    };

    // Pass the user object to the next stage (serialization)
    return done(null, user);
  }
));

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id); // Save only the user ID in the session
});

// Deserialize user from the session
passport.deserializeUser((id, done) => {
  // In a real app, you would fetch the full user from the database using the ID
  const mockUser = { id: id, name: 'John Doe' };
  done(null, mockUser);
});

module.exports = passport;
```

### 3. Integrating with Express

Now, wire everything together in your `app.js`:

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('./passport'); // Import configured passport
const app = express();

// 1. Session Middleware MUST be initialized before Passport
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
}));

// 2. Initialize Passport and its session support
app.use(passport.initialize());
app.use(passport.session());

// 3. Define Routes

// Route to initiate Google authentication
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback route where Google redirects after authentication
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    res.redirect('/profile');
  }
);

// Protected route middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { // Added by Passport
    return next();
  }
  res.redirect('/login');
}

// Protected Profile Route
app.get('/profile', isAuthenticated, (req, res) => {
  res.send(`Welcome ${req.user.name}!`); // req.user is populated by deserializeUser
});

app.get('/logout', (req, res, next) => {
  req.logout((err) => { // Added by Passport
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

---

## Insight Penting

* **Session Dependency:** Passport's standard OAuth implementation relies heavily on `express-session`. Always ensure your session middleware is correctly configured and placed *before* `passport.initialize()` and `passport.session()`.
* **Stateless APIs (JWT vs Sessions):** If you are building a purely stateless API (e.g., for a mobile app), using sessions might not be ideal. Passport can be configured to use JWTs instead, or you can issue a JWT inside the OAuth callback route instead of relying on `passport.session()`.
* **Security:** Never commit your `CLIENT_ID` or `CLIENT_SECRET` to source control. Always use environment variables (`dotenv`).
* **Serialization/Deserialization:** `serializeUser` determines what data from the user object is stored in the session cookie (usually just the ID to keep the cookie small). `deserializeUser` uses that ID to fetch the full user profile on subsequent requests.

---

## Ringkasan Akhir

* OAuth 2.0 delegates authentication to third-party providers, improving user experience.
* Passport.js abstracts the complex OAuth handshake into a few simple middleware functions.
* The Google Strategy requires a Client ID, Client Secret, and a verified Callback URL.
* Passport uses `serializeUser` and `deserializeUser` to manage the authentication state across HTTP requests via sessions.

---

## Langkah Belajar Berikutnya

* Explore integrating Passport with a database like MongoDB (using Mongoose) or PostgreSQL (using Prisma) to persistently store user profiles.
* Learn how to combine OAuth 2.0 login with JWTs for stateless authentication in Single Page Applications (SPAs).
* Implement multiple authentication strategies simultaneously (e.g., Google, GitHub, and Local Email/Password).

---

## Metadata

* Level: Intermediate
* Topik utama: Authentication
* Topik terkait: Express.js, Security, OAuth 2.0, Sessions
* Kata kunci: passport.js, oauth2, google login, express authentication
* Estimasi waktu baca: 15 menit
