# Implementing OAuth 2.0 Authentication in Express JS

## Ringkasan Singkat

This tutorial covers the implementation of OAuth 2.0 authentication in an Express.js application using Passport.js and the Google OAuth 2.0 strategy. It provides a straightforward approach to enabling social logins, allowing users to authenticate securely without creating a new password.

## Untuk Siapa Materi Ini

* Target readers: Intermediate Backend Developers, Full-stack Developers
* Reader level: Intermediate

## Prasyarat

* Basic understanding of Express.js routing and middleware.
* Familiarity with `express-session` or session management concepts.
* A basic understanding of what OAuth is (though it will be briefly explained).
* Node.js installed in your environment.

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* How OAuth 2.0 works conceptually for authentication.
* How to configure Google Cloud Console to get OAuth credentials (Client ID and Secret).
* How to set up and configure Passport.js with `passport-google-oauth20` in Express.
* How to manage authenticated sessions after a successful OAuth login.

## Konteks dan Motivasi

Implementing authentication from scratch can be complex and risky. Users also prefer convenience over creating new accounts for every app. OAuth 2.0 solves both problems by allowing applications to securely delegate authentication to trusted providers like Google, GitHub, or Facebook. This not only improves the user onboarding experience (social login) but also shifts the burden of securely storing passwords to the identity provider, making your application inherently more secure.

## Materi Inti

### 1. Understanding OAuth 2.0 and Passport.js

OAuth 2.0 is an authorization framework, but it is heavily used for authentication (often via OpenID Connect). The flow generally involves:

1. The user clicks "Login with Google".
2. The application redirects the user to Google's consent screen.
3. The user grants permission.
4. Google redirects back to the application with an authorization code.
5. The application exchanges the code for an access token (and user profile).

**Passport.js** is the standard authentication middleware for Node.js. It simplifies this complex flow into a series of configuration steps and routes.

### 2. Setting Up Google Credentials

Before writing code, you need credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth client ID**.
5. Configure the Consent Screen if prompted.
6. Set the Application Type to "Web application".
7. Add an Authorized redirect URI (e.g., `http://localhost:3000/auth/google/callback`).
8. Save and note down your **Client ID** and **Client Secret**.

### 3. Required Packages

You will need a few packages to handle sessions and OAuth:

```bash
npm install express express-session passport passport-google-oauth20 dotenv
```

### 4. Implementing the Authentication Flow

We will use `express-session` to keep the user logged in, initialize `passport`, configure the `GoogleStrategy`, and set up the routes for logging in and handling the callback.

## Contoh / Ilustrasi

Here is a complete, minimal example of an Express application integrating Google OAuth 2.0.

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = 3000;

// 1. Configure Express Session
app.use(session({
  secret: 'my_super_secret_key', // In production, use a strong, random string from .env
  resave: false,
  saveUninitialized: false,
}));

// 2. Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// 3. Configure the Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // In a real application, you would find or create a user in your database here.
    // For this example, we simply return the profile object.
    return cb(null, profile);
  }
));

// 4. Serialize and Deserialize User
// Serialization dictates what gets saved in the session (e.g., user ID)
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

// Deserialization retrieves the user data based on the stored identifier
passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

// 5. Define Routes

// Homepage
app.get('/', (req, res) => {
  res.send('<h1>Home</h1><a href="/auth/google">Login with Google</a>');
});

// Initiate the Google OAuth flow
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback route
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home or to dashboard.
    res.redirect('/profile');
  }
);

// Protected Profile Route
app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.send(`<h1>Welcome, ${req.user.displayName}</h1><a href="/logout">Logout</a>`);
});

// Logout Route
app.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## Insight Penting

* **Security of Sessions:** Ensure you configure `express-session` correctly for production. Use secure cookies (`cookie: { secure: true }`) if you are using HTTPS, and utilize a proper session store (like Redis or MongoDB) instead of the default MemoryStore to prevent memory leaks.
* **Database Integration:** In the `GoogleStrategy` verify callback, do not just return the `profile`. You should query your database to see if a user with that Google ID exists. If they do not, create a new user record.
* **Separation of Concerns:** Keep your Passport configuration in a separate file (e.g., `config/passport.js`) rather than crowding your main `server.js` or `app.js`.
* **State Parameter:** For enhanced security, implement the `state` parameter in your OAuth flow to prevent Cross-Site Request Forgery (CSRF) attacks. `passport-google-oauth20` can handle this by passing `{ state: true }` in the authenticate options.

## Ringkasan Akhir

* OAuth 2.0 delegates authentication to third-party providers like Google, offering a seamless "Social Login" experience.
* Passport.js is a robust middleware that abstracts the complexity of the OAuth flow.
* Implementing Google OAuth requires setting up credentials in the Google Cloud Console.
* The flow consists of redirecting to Google, receiving an authorization code, and exchanging it for user profile details.
* Sessions are typically used to maintain the user's logged-in state across requests after successful authentication.

## Langkah Belajar Berikutnya

* Authentication and Authorization with JWT in Express
* Handling File Uploads in Express JS with Multer
* Understanding Cookies and Session Management in Express JS
* Implementing Role-Based Access Control in Express JS

## Metadata

* Level: Intermediate
* Topik utama: Authentication, Express.js
* Topik terkait: OAuth 2.0, Passport.js, Security
* Kata kunci: express, oauth, passport, google login, authentication
* Estimasi waktu baca: 10 minutes
