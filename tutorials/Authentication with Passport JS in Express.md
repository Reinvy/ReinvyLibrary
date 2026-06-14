# Authentication with Passport JS in Express

## Ringkasan Singkat

This material covers how to implement authentication in Express.js using Passport.js, a popular and flexible authentication middleware for Node.js. It explains how to set up local authentication (username and password) and touches upon its modular strategy-based architecture.

---

## Untuk Siapa Materi Ini

- Target audience: Intermediate web developers.
- Level: Intermediate.

---

## Prasyarat

A brief list of things that should ideally be understood:

- Basic Express.js routing and middleware.
- Understanding of Cookies and Session Management in Express JS.
- Familiarity with basic database operations (e.g., MongoDB with Mongoose or similar).
- General knowledge of authentication concepts.

---

## Tujuan Belajar

After reading this material, readers will understand:

- How Passport.js works and its strategy-based architecture.
- How to implement local authentication using `passport-local`.
- How to serialize and deserialize users to maintain login sessions.
- Best practices for structuring authentication routes and middleware.

---

## Konteks dan Motivasi

Authentication is a core requirement for most web applications. Building an authentication system from scratch can be complex and error-prone, involving secure password hashing, session management, and robust error handling. Passport.js solves this by providing a comprehensive, secure, and extensible authentication framework. By using Passport, developers can implement various authentication methods (local, OAuth, OpenID) consistently, saving time and reducing security risks. It's an industry standard in the Node.js ecosystem.

---

## Materi Inti

### 1. What is Passport.js?

Passport is authentication middleware for Node.js. Its sole purpose is to authenticate requests, which it does through an extensible set of plugins known as **strategies**. Passport does not mount routes or assume any particular database schema, making it highly flexible.

### 2. Strategy-Based Architecture

Passport uses the concept of **Strategies** to authenticate requests. There are over 500 strategies available, ranging from local authentication (username and password) to delegated authentication (e.g., Google, Facebook, Twitter via OAuth).

To use Passport, you configure the specific strategies your application needs. In this tutorial, we focus on `passport-local`, which uses a username and password.

### 3. Core Components of Passport

Implementing Passport involves three main components:

- **Authentication Strategy:** The logic that defines how to verify a user's credentials.
- **Application Middleware:** Initializing Passport and connecting it to the session.
- **Sessions (Serialization/Deserialization):** Storing user information in the session so they remain authenticated across requests.

### 4. Setting up Passport Local Strategy

To authenticate using a username and password, you must configure the `LocalStrategy`. This strategy requires a callback function that verifies the provided credentials against your database.

If the credentials are valid, the callback returns the user object. If invalid, it returns `false`, often with an error message.

### 5. Managing Sessions

In typical web applications, credentials are only transmitted during the initial login. Subsequent requests are authenticated via a session. Passport requires you to define how a user is serialized into the session and deserialized from the session.

- **Serialization:** Determines which data of the user object should be stored in the session (usually the user ID).
- **Deserialization:** Retrieves the whole user object based on the stored ID from the database on subsequent requests.

---

## Contoh / Ilustrasi

Here is a comprehensive example of setting up Passport with a local strategy in an Express app.

### Step 1: Install Dependencies

```bash
npm install express express-session passport passport-local
```

### Step 2: Configure Passport and Strategy

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const app = express();
app.use(express.urlencoded({ extended: false }));

// Dummy user database
const users = [{ id: 1, username: 'testuser', password: 'password123' }];

// 1. Configure Local Strategy
passport.use(new LocalStrategy(
  (username, password, done) => {
    // Find user in database
    const user = users.find(u => u.username === username);

    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    if (user.password !== password) {
      return done(null, false, { message: 'Incorrect password.' });
    }

    // Authentication successful
    return done(null, user);
  }
));

// 2. Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// 3. Deserialize user from session
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

// Initialize session and Passport
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Login Route
app.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login-failed'
}));

// Protected Route Middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.send(`Welcome to your dashboard, ${req.user.username}!`);
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Explanation of the Code

- We configure a `LocalStrategy` that checks if the username and password match our dummy database.
- `passport.serializeUser` saves the `user.id` into the session.
- `passport.deserializeUser` uses the `id` from the session to fetch the full user object, which is then attached to `req.user`.
- The `/login` route uses `passport.authenticate`, which automatically handles the login process.
- The `isAuthenticated` middleware uses `req.isAuthenticated()` (provided by Passport) to protect the `/dashboard` route.

---

## Insight Penting

- **Separation of Concerns:** Keep your authentication logic (strategy configuration) in a separate file (e.g., `config/passport.js`) to maintain clean routing files.
- **Security:** Never store plain text passwords in production. Always hash passwords using libraries like `bcrypt` before storing them and use `bcrypt.compare` inside your `LocalStrategy`.
- **Stateless APIs:** If you are building a RESTful API (e.g., for a mobile app or React frontend), you might not use sessions. Instead, you can use Passport with the `passport-jwt` strategy to authenticate requests using JSON Web Tokens.
- **Error Handling:** Use custom callbacks with `passport.authenticate` if you need granular control over the response instead of automated redirects.

---

## Ringkasan Akhir

- Passport.js is a versatile authentication middleware for Express using a strategy-based architecture.
- `passport-local` is used for traditional username and password authentication.
- Authentication state is maintained using sessions via `serializeUser` and `deserializeUser`.
- Passport attaches the authenticated user to the request object (`req.user`) and provides helper methods like `req.isAuthenticated()`.

---

## Langkah Belajar Berikutnya

- Explore hashing passwords with `bcrypt` alongside Passport.
- Learn about Authentication and Authorization with JWT in Express for stateless APIs.
- Implement social logins using OAuth strategies (e.g., `passport-google-oauth20`).
- Understand Implementing Role-Based Access Control in Express JS to manage user permissions.

---

## Metadata

- Level: Intermediate
- Topik utama: Express JS, Authentication
- Topik terkait: Middleware, Security, Session Management
- Kata kunci: express js, passport js, authentication, local strategy, login
- Estimasi waktu baca: 15 minutes
