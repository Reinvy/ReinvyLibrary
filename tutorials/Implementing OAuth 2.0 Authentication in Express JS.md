# Implementing OAuth 2.0 Authentication in Express JS

## Ringkasan Singkat

This material covers how to integrate OAuth 2.0 authentication into an Express.js application. We will focus on using Passport.js with the Google OAuth 2.0 strategy to allow users to securely log in using their Google accounts without the need to manage standalone passwords.

## Untuk Siapa Materi Ini

- **Target Audience:** Intermediate backend developers who want to implement social login or third-party authentication.
- **Level:** Intermediate.

## Prasyarat

- Solid understanding of Express.js routing and middleware.
- Familiarity with the concepts of authentication and session management in Express.js.
- Basic understanding of how HTTP redirects and callbacks work.

## Tujuan Belajar

After completing this material, you will be able to:

- Understand the basic flow of OAuth 2.0 for web applications.
- Configure an application in the Google Developer Console to obtain client credentials.
- Implement Passport.js with `passport-google-oauth20` in an Express.js app.
- Secure routes so that only authenticated users can access them.
- Handle the OAuth callback and manage user sessions effectively.

## Konteks dan Motivasi

In modern web applications, forcing users to create and remember a new password for every service creates friction and can lead to poor security practices (like password reuse). OAuth 2.0 solves this by allowing users to authenticate via trusted providers (like Google, GitHub, or Facebook). For developers, it delegates the complexity of credential management and identity verification to the provider, making applications more secure and improving the user onboarding experience.

## Materi Inti

### 1. The OAuth 2.0 Web Application Flow

OAuth 2.0 is an authorization framework that enables applications to obtain limited access to user accounts on an HTTP service. The common flow for web applications includes:

1. **Redirection:** The user clicks "Login with Google" and is redirected to Google's consent screen.
2. **Consent:** The user grants the application permission to access their basic profile information.
3. **Callback:** Google redirects the user back to your application with an authorization code.
4. **Token Exchange:** Your server exchanges the authorization code for an access token (and possibly a refresh token).
5. **Profile Fetch:** Your server uses the access token to fetch the user's profile data and logs them in.

### 2. Setting Up Google Cloud Console

Before writing code, you must register your application with Google:

- Go to the [Google Cloud Console](https://console.cloud.google.com/).
- Create a new project and navigate to **APIs & Services > Credentials**.
- Configure the **OAuth consent screen**.
- Create **OAuth client ID** credentials (Web application).
- Add an Authorized redirect URI (e.g., `http://localhost:3000/auth/google/callback`).
- Save your **Client ID** and **Client Secret**.

### 3. Integrating Passport.js

Passport is an authentication middleware for Node.js. It provides a modular approach using "strategies". For Google OAuth 2.0, we use the `passport-google-oauth20` package. You also need `express-session` to maintain login sessions.

## Contoh / Ilustrasi

Below is a complete example of setting up Google OAuth 2.0 in an Express.js application.

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// 1. Configure Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'super_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// 2. Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// 3. Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // In a real application, you would find or create a user in your database here
    // e.g., User.findOrCreate({ googleId: profile.id }, function (err, user) { return done(err, user); });

    // For this example, we'll just pass the profile object as the user
    return done(null, profile);
  }
));

// 4. Serialize and Deserialize User
// Serialization determines which data of the user object should be stored in the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialization fetches the user based on the data stored in the session
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// 5. Define Routes
app.get('/', (req, res) => {
  res.send('<h1>Home</h1><a href="/auth/google">Login with Google</a>');
});

// Route to initiate Google authentication
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback route
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to profile.
    res.redirect('/profile');
  }
);

// Route protection middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// Protected route
app.get('/profile', ensureAuthenticated, (req, res) => {
  res.send(`<h1>Profile</h1><p>Welcome, ${req.user.displayName}!</p><a href="/logout">Logout</a>`);
});

// Logout route
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## Insight Penting

- **Session Management:** OAuth 2.0 strategies in Passport heavily rely on sessions. Ensure your session configuration is secure, particularly in production, by using strong secrets, secure cookies, and a persistent session store like Redis.
- **Data Privacy:** Always request the minimum scope necessary (e.g., `['profile', 'email']`). Requesting broad scopes can deter users from completing the login process.
- **Handling Duplicates:** When a user logs in via Google, they might already have an account created with the same email using a traditional password. Decide on an account-linking strategy (e.g., linking the Google ID to the existing email account) to avoid creating duplicate users.
- **Security Context:** Never expose your `Client Secret` on the frontend or commit it to version control. Always use environment variables (`.env`).

## Ringkasan Akhir

- OAuth 2.0 delegates authentication to a trusted provider, improving security and user experience.
- Passport.js with the `passport-google-oauth20` strategy provides a clean, modular way to implement Google login in Express.js.
- The process involves redirecting the user to Google for consent, handling the callback with an authorization code, and exchanging it for user profile information.
- Using `express-session`, you can maintain the authenticated state across requests using session cookies.

## Langkah Belajar Berikutnya

- Implement account linking to handle users who log in using both social providers and traditional credentials.
- Explore stateless OAuth 2.0 implementations using JWTs instead of session cookies.
- Add additional OAuth providers like GitHub or Facebook using their respective Passport strategies.

## Metadata

- Level: Intermediate
- Topik utama: Authentication, Express JS
- Topik terkait: Passport.js, OAuth 2.0, Security
- Kata kunci: Express, OAuth, Google Login, Passport, Authentication
- Estimasi waktu baca: 12 menit
