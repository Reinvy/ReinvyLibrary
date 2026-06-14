# Implementing OAuth2 Social Login in Express JS with Passport

## Ringkasan Singkat

This tutorial covers how to implement OAuth2 authentication in Express.js using the Passport.js library, specifically focusing on Google Social Login. You will learn how to configure authentication strategies, handle user sessions, and seamlessly integrate third-party login providers into your application.

---

## Untuk Siapa Materi Ini

- **Target Pembaca:** Backend developers who want to add social login features to their Express applications.
- **Level:** Intermediate.

---

## Prasyarat

- Basic understanding of Express.js routing and middleware.
- Familiarity with session management and cookies (e.g., using `express-session`).
- Basic knowledge of how HTTP requests and callbacks work.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

- The fundamental concepts of OAuth2 and how social logins operate.
- How to set up and configure Passport.js with Express.
- How to implement the `passport-google-oauth20` strategy for Google Login.
- How to manage user serialization and deserialization in sessions.

---

## Konteks dan Motivasi

In modern web applications, forcing users to create yet another username and password creates friction. Implementing "Login with Google" (or other providers) via OAuth2 simplifies the onboarding process, improves conversion rates, and delegates the burden of securely managing passwords to trusted identity providers. Passport.js is the most popular, modular authentication middleware for Node.js, making it the industry standard for integrating these strategies.

---

## Materi Inti

### Understanding OAuth2 and Passport.js

OAuth2 is an authorization framework that enables an application to obtain limited access to user accounts on an HTTP service (like Google, Facebook, or GitHub). Instead of handling user passwords, your application receives an "access token" from the provider.

**Passport.js** acts as an intermediary middleware in Express. It abstracts the complexity of authentication by using "strategies". A strategy is simply a package designed to authenticate requests using a specific method (e.g., Local, OAuth, JWT).

### Core Components

1. **Strategy Configuration:** Setting up the third-party client credentials (Client ID, Client Secret) and the callback URL.
2. **Session Serialization:** Passport needs to know what data (usually the user ID) to store in the session cookie to identify the user in subsequent requests.
3. **Session Deserialization:** Passport extracts the ID from the session cookie and uses it to retrieve the full user object from your database.
4. **Authentication Routes:** One route to redirect the user to the provider, and another route (the callback) to handle the provider's response.

---

## Contoh / Ilustrasi

### 1. Installation

First, install the necessary packages. You will need Express, express-session (to keep the user logged in), and the Passport packages.

```bash
npm install express express-session passport passport-google-oauth20
```

### 2. Basic Setup and Strategy Configuration

Below is a complete, minimal example of setting up Google OAuth2.

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// 1. Configure Session Middleware
app.use(session({
  secret: 'your_super_secret_key',
  resave: false,
  saveUninitialized: false
}));

// 2. Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// 3. Configure the Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // Here, you would typically find or create a user in your database
    // For this example, we simply pass the profile forward
    return done(null, profile);
  }
));

// 4. Serialize User: Determine what data from the user object should be stored in the session
passport.serializeUser((user, done) => {
  done(null, user.id); // Storing only the Google ID
});

// 5. Deserialize User: Retrieve the user based on the stored ID
passport.deserializeUser((id, done) => {
  // Typically: User.findById(id, (err, user) => done(err, user));
  // Simulating retrieval:
  done(null, { id: id, name: "Google User" });
});

// --- Routes ---

// Route to initiate Google login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback route handled by Google after successful login
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  }
);

// A protected route
app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Welcome, ${req.user.name}!`);
  } else {
    res.redirect('/auth/google');
  }
});

// Logout route
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
```

*(Note: In a real application, replace `process.env.GOOGLE_CLIENT_ID` and `process.env.GOOGLE_CLIENT_SECRET` with the credentials obtained from the Google Developer Console).*

---

## Insight Penting

- **State Management:** Social login with Passport heavily relies on sessions. Ensure your `express-session` is configured securely, especially in production (e.g., using a reliable store like Redis, setting `secure: true` for cookies over HTTPS).
- **Security:** Never hardcode your Client ID and Client Secret. Always use environment variables.
- **Error Handling:** Pay attention to the `failureRedirect` option in the callback route. Users may deny authorization or network errors might occur; your app should handle these gracefully.
- **The `done` Callback:** In Passport, the `done` function signals the completion of a step. Passing `null` as the first argument means no error occurred; the second argument is the user object (or ID).
- **Stateless OAuth (APIs):** If you are building an API without sessions, you won't use `passport.session()`. Instead, in the callback, you would generate a JWT (JSON Web Token) and return it to the client.

---

## Ringkasan Akhir

- OAuth2 delegates authentication to a third-party provider like Google.
- Passport.js simplifies OAuth2 integration in Express via its "Strategy" pattern.
- The workflow involves configuring the strategy, setting up session serialization/deserialization, and creating the login and callback routes.
- Security best practices, such as securing session cookies and using environment variables for credentials, are crucial.

---

## Langkah Belajar Berikutnya

- Learn how to integrate a database (like MongoDB/Mongoose or PostgreSQL/Prisma) inside the Strategy callback to persist user accounts.
- Explore stateless authentication using Passport.js combined with JSON Web Tokens (JWT) for SPAs or mobile clients.
- Add additional social login providers like GitHub, Facebook, or Twitter using their respective Passport strategies.

---

## Metadata

- Level: Intermediate
- Topik utama: Authentication, Express.js
- Topik terkait: OAuth2, Passport.js, Social Login
- Kata kunci: express, passport, oauth2, google login, authentication
- Estimasi waktu baca: 10 menit
