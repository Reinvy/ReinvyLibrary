# Implementing OAuth 2.0 and Social Login in Express JS

## Ringkasan Singkat

This material provides a comprehensive guide on implementing OAuth 2.0 and social login (such as "Login with Google") in an Express.js application. You will learn the theoretical flow of OAuth and how to practically apply it using `Passport.js` to enable secure and seamless third-party authentication.

---

## Untuk Siapa Materi Ini

* **Target Audience:** Intermediate backend developers building Node.js applications.
* **Level:** Intermediate to Advanced.

---

## Prasyarat

* Solid understanding of Express.js routing and middleware.
* Familiarity with the concepts of authentication and session management in Express.js.
* Previous experience or knowledge of [Understanding Cookies and Session Management in Express JS](Understanding%20Cookies%20and%20Session%20Management%20in%20Express%20JS.md).

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* The core concepts and the flow of the OAuth 2.0 protocol.
* How to register an application with a third-party provider (e.g., Google Developer Console) to obtain a Client ID and Client Secret.
* How to configure and integrate `Passport.js` with the `passport-google-oauth20` strategy in an Express app.
* How to handle user sessions securely after a successful OAuth login.

---

## Konteks dan Motivasi

In modern web applications, forcing users to create and remember yet another set of credentials (username and password) often leads to friction and lower conversion rates. Social login allows users to authenticate using their existing accounts from providers like Google, GitHub, or Facebook.

OAuth 2.0 is the industry-standard protocol for authorization. It enables third-party applications to obtain limited access to a web service without exposing user credentials. Implementing OAuth securely is crucial to protecting user data while providing a seamless user experience. By utilizing `Passport.js`, developers can abstract the complex OAuth flow into a standardized, reusable middleware pattern.

---

## Materi Inti

### 1. What is OAuth 2.0?

OAuth 2.0 (Open Authorization) is a framework that allows an application to obtain limited access to user accounts on an HTTP service, such as Google, Facebook, or GitHub.

Instead of the user providing their password directly to your application, OAuth works by redirecting the user to the provider (e.g., Google) to log in and grant permissions. Upon success, the provider redirects back to your application with an *Authorization Code* or an *Access Token*.

### 2. The OAuth 2.0 Flow (Authorization Code Grant)

For server-side web applications like Express, the Authorization Code Grant is the standard flow:

1. **User Initiation:** The user clicks "Login with Google".
2. **Authorization Request:** Your app redirects the user to Google's consent screen, requesting specific permissions (scopes like `profile`, `email`).
3. **User Grants Permission:** The user logs in to Google and approves the access.
4. **Authorization Code:** Google redirects the user back to your app's callback URL, passing an authorization code in the URL query.
5. **Token Exchange:** Your app's server securely exchanges the authorization code for an *Access Token* (and optionally a Refresh Token) directly with Google's servers.
6. **Fetch User Data:** Your app uses the Access Token to request the user's profile information from Google.
7. **Session Creation:** Your app logs the user in (e.g., creating a session or issuing a JWT).

### 3. Setting Up the Provider (Google)

Before writing code, you must register your application with Google:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Navigate to **APIs & Services > Credentials**.
4. Configure the **OAuth consent screen**.
5. Create **OAuth client ID** credentials (Web application).
6. Add an Authorized redirect URI (e.g., `http://localhost:3000/auth/google/callback`).
7. Note down your **Client ID** and **Client Secret**. (Never commit these to version control!).

### 4. Implementing with Passport.js

`Passport.js` is authentication middleware for Node.js. It uses "strategies" to authenticate requests. We will use `passport-google-oauth20`.

#### Step 4.1: Installation

```bash
npm install express express-session passport passport-google-oauth20
```

#### Step 4.2: Basic Express Server and Session Setup

OAuth in Passport typically relies on sessions to keep the user logged in across requests.

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');

const app = express();

// Set up sessions
app.use(session({
    secret: 'YOUR_SUPER_SECRET_KEY',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());
```

#### Step 4.3: Configuring the Google Strategy

```javascript
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // This callback is executed after successful token exchange.
    // Here, you would typically find or create a user in your database.
    console.log("Google Profile:", profile);

    // In a real app:
    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });

    // For this example, we'll just pass the profile as the user object
    return cb(null, profile);
  }
));
```

#### Step 4.4: Serialization and Deserialization

Passport needs to know how to save the user into the session and how to retrieve them.

```javascript
// Serialize user to save in session
passport.serializeUser(function(user, cb) {
  cb(null, user); // In a real app, you might save user.id
});

// Deserialize user from session
passport.deserializeUser(function(obj, cb) {
  cb(null, obj); // In a real app, you might find the user by ID in the DB
});
```

#### Step 4.5: Creating the Routes

We need three main routes: the trigger, the callback, and a protected route.

```javascript
// 1. Trigger the OAuth flow
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. The callback where Google redirects after consent
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });

// 3. A protected route
app.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized. Please log in.');
    }
    res.send(`<h1>Welcome, ${req.user.displayName}</h1><a href="/logout">Logout</a>`);
});

// 4. Logout route
app.get('/logout', (req, res, next) => {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
});
```

---

## Contoh / Ilustrasi

Imagine you want to enter an exclusive club (your Express application).

1. Instead of giving the bouncer your ID card and password, you tell the bouncer: "Google can vouch for me."
2. The bouncer (Express app) sends you to a secure Google booth (`/auth/google`).
3. You log in at the Google booth and say, "Yes, I allow this club to know my name and email."
4. Google gives you a special, one-time ticket (Authorization Code) and sends you back to the club's backdoor (`/auth/google/callback`).
5. The club's server takes that ticket, secretly talks to Google to verify it, and exchanges it for a VIP pass (Access Token).
6. The club then writes your name on their guest list (Session) and lets you into the VIP lounge (`/profile`).

---

## Insight Penting

* **State Parameter for Security:** To prevent CSRF (Cross-Site Request Forgery) attacks during the OAuth flow, ensure the `state` parameter is utilized (Passport handles this automatically in newer versions, but it's vital to understand).
* **Never Expose Client Secrets:** The `clientSecret` must never be sent to the frontend or committed to source control. Always use environment variables (`process.env.GOOGLE_CLIENT_SECRET`).
* **Handle Existing Users:** If a user logs in with Google, but an account with their email already exists via standard password registration, you need logic to link the accounts gracefully rather than creating duplicates or throwing errors.
* **Separation of Concerns:** Keep your Passport configuration in a separate file (e.g., `config/passport.js`) rather than cluttering your main `app.js` file.

---

## Ringkasan Akhir

* OAuth 2.0 is an authorization protocol that allows users to grant third-party applications access to their data without sharing passwords.
* The Authorization Code Grant flow is the standard and most secure method for server-side applications.
* `Passport.js` simplifies the implementation of OAuth by providing strategies like `passport-google-oauth20`.
* The flow involves redirecting to the provider, handling the callback, exchanging tokens, and managing the resulting user session.
* Security best practices involve protecting client secrets and using sessions securely.

---

## Langkah Belajar Berikutnya

* [Implementing Role-Based Access Control in Express JS](Implementing%20Role-Based%20Access%20Control%20in%20Express%20JS.md) (To restrict specific routes to admins).
* Explore securing APIs with JWT instead of sessions for stateless OAuth integrations (often used in Single Page Applications).

---

## Metadata

* Level: Intermediate
* Topik utama: Express.js, Security, Authentication
* Topik terkait: OAuth 2.0, Passport.js, Social Login
* Kata kunci: express oauth, passport js, google login, node js oauth2
* Estimasi waktu baca: 12 - 15 minutes
