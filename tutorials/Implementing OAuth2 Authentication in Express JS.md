# Implementing OAuth2 Authentication in Express JS

## Ringkasan Singkat

This tutorial explains how to implement OAuth2 authentication in an Express JS application. You will learn how to integrate third-party social logins (such as Google or GitHub) using Passport.js, enabling secure and seamless user authentication without managing passwords locally.

## Untuk Siapa Materi Ini

Intermediate backend developers who already understand basic routing, middleware, and have experience with Express JS. Familiarity with session management or JWT is beneficial but not strictly required.

## Prasyarat

- Basic understanding of Node.js and Express JS.
- Knowledge of what middleware is and how it works in Express.
- Basic understanding of HTTP and RESTful APIs.
- Familiarity with session management or token-based authentication concepts.

## Tujuan Belajar

- Understand the OAuth2 authorization flow.
- Learn how to configure Passport.js with an OAuth2 strategy.
- Set up routes for initiating the OAuth2 flow and handling callbacks.
- Manage user sessions or tokens after successful authentication.
- Implement middleware to protect routes requiring authentication.

## Konteks dan Motivasi

In modern web applications, forcing users to create and remember a new password for every service creates friction and security risks. OAuth2 allows your application to delegate authentication to a trusted third-party provider (like Google, Facebook, or GitHub). This not only improves the user experience by offering "Sign in with..." buttons but also shifts the burden of password security and credential management to specialized providers. Understanding OAuth2 is crucial for building user-friendly and secure modern APIs and web apps.

## Materi Inti

### 1. Understanding the OAuth2 Flow

OAuth2 is an authorization framework, but it is commonly used for authentication (often via OpenID Connect). The typical "Authorization Code" flow involves:

1. **Client Request:** The user clicks "Login with Provider". Your app redirects them to the provider's authorization URL.
2. **User Consent:** The user logs into the provider and grants your app permission to access their profile.
3. **Authorization Code:** The provider redirects the user back to your app's callback URL with a temporary authorization code.
4. **Token Exchange:** Your backend server securely exchanges this code for an Access Token (and potentially a Refresh Token) from the provider.
5. **Data Access:** Your app uses the Access Token to fetch the user's profile information.

### 2. Setting Up Passport.js

Passport.js is the most popular authentication middleware for Express. It uses "strategies" to support different authentication mechanisms. For OAuth2, you would typically use specific strategies like `passport-google-oauth20` or `passport-github2`.

To use Passport, you need to initialize it and integrate it with your session management (if using sessions).

### 3. Configuring the Strategy

You must register your application with the OAuth provider to get a `clientID` and `clientSecret`. You provide these, along with a `callbackURL`, to configure the strategy. The strategy also requires a verify callback function, which is executed when the provider returns the user's profile. Here you typically find or create the user in your database.

### 4. Routing

You need two primary routes for the OAuth process:

- **Initiation Route:** Redirects the user to the provider.
- **Callback Route:** The URL the provider redirects to after the user grants consent. Here, Passport exchanges the code for a token and calls your verify callback.

## Contoh / Ilustrasi

Below is an example of implementing GitHub OAuth2 authentication using Passport.js.

### Step 1: Install Dependencies

You would typically install these packages:

```bash
npm install express passport passport-github2 express-session dotenv
```

### Step 2: Configure Application

```javascript
require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');

const app = express();

// Configure session middleware
app.use(session({
  secret: 'super_secret_session_key',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// Serialization: Determine what data from the user object should be stored in the session
passport.serializeUser((user, done) => {
  done(null, user.id); // Typically store just the user ID
});

// Deserialization: Retrieve the user object based on the stored ID
passport.deserializeUser((id, done) => {
  // In a real app, query your database for the user by ID
  const user = { id: id, username: 'example_user' };
  done(null, user);
});

// Configure the GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'dummy_client_id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy_client_secret',
    callbackURL: "http://localhost:3000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // In a real application, you would find or create a user in your database here.
    // For this example, we just pass the profile as the authenticated user.
    return done(null, profile);
  }
));

// Route to initiate the OAuth flow
app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }));

// Callback route handled by Passport
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });

// Protected route middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send('Unauthorized. Please log in.');
}

// Protected Profile Route
app.get('/profile', ensureAuthenticated, (req, res) => {
  res.send(`Hello, ${req.user.username || req.user.displayName}! This is your profile.`);
});

app.get('/login', (req, res) => {
  res.send('Login Failed or Please Login.');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## Insight Penting

- **Client Secret Security:** Never expose your `clientSecret` in frontend code or public repositories. It must be kept securely on your backend, typically using environment variables.
- **State Parameter:** Modern OAuth implementations use a `state` parameter to prevent Cross-Site Request Forgery (CSRF) attacks during the callback phase. Passport handles this automatically for most strategies.
- **Stateless APIs (JWT):** If you are building a stateless REST API, you might not want to use `express-session`. Instead, in the callback route, after Passport authenticates the user, you can generate a JWT and send it back to the client (e.g., via a secure, HttpOnly cookie or in the redirect URL fragment).
- **Multiple Providers:** You can easily add multiple strategies (Google, Facebook, etc.) to the same application using the same `passport.initialize()` setup, just configuring distinct initiation and callback routes for each.

## Ringkasan Akhir

- OAuth2 delegates authentication to third-party providers, improving user experience and security.
- The standard flow involves redirecting the user to the provider, receiving an authorization code, and exchanging it for an access token on the backend.
- Passport.js simplifies OAuth integration in Express through its strategy-based ecosystem.
- Securing your application involves properly managing the OAuth credentials (Client ID and Secret) and correctly establishing the user session or generating a token after a successful callback.

## Langkah Belajar Berikutnya

- Learn how to issue a JWT instead of using sessions after a successful OAuth login.
- Explore Role-Based Access Control (RBAC) to manage what authenticated users can do.
- Understand how to handle account linking (e.g., logging in with Google and GitHub to the same account).

## Metadata

- Level: Intermediate
- Topik utama: Authentication
- Topik terkait: Security, Middleware, Routing
- Kata kunci: OAuth2, Passport.js, Social Login, Authentication, Express
- Estimasi waktu baca: 15 menit
