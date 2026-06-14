# Implementing OAuth 2.0 Social Login in Express JS

## Ringkasan Singkat

This tutorial explains how to integrate OAuth 2.0 social login (such as Google and GitHub) into an Express.js application using the widely-adopted Passport.js library. You will learn the OAuth flow, how to configure strategies, and how to issue JWTs or use sessions after a successful social login.

---

## Untuk Siapa Materi Ini

* Backend developers who want to allow users to log in with their Google or GitHub accounts.
* Developers familiar with basic Express.js and looking to implement OAuth 2.0.
* Anyone interested in understanding how delegated authentication works in practice.

---

## Prasyarat

* Basic understanding of Node.js and Express.js.
* Familiarity with the concepts of Authentication and Authorization.
* Basic knowledge of JWTs or Sessions (see "Understanding Cookies and Session Management in Express JS" or "Authentication and Authorization with JWT in Express").

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* The core concepts and flow of the OAuth 2.0 protocol.
* How to use Passport.js and its strategies to handle social logins.
* How to set up Google and GitHub OAuth applications to get Client IDs and Secrets.
* How to integrate the user data from an OAuth provider into your application's database.
* How to transition from a successful OAuth login to an authenticated session or JWT.

---

## Konteks dan Motivasi

In modern web applications, forcing users to create yet another username and password creates friction and reduces signup rates. Implementing "Log in with Google" or "Log in with GitHub" provides a seamless user experience, offloads password security to tech giants, and ensures you get verified email addresses. OAuth 2.0 is the industry standard protocol for this delegated authorization. While the OAuth flow can be complex to implement from scratch, libraries like Passport.js simplify the process significantly for Express developers.

---

## Materi Inti

### 1. Understanding the OAuth 2.0 Flow

OAuth 2.0 is fundamentally about delegating access. In the context of social login, you are asking a provider (like Google) to authenticate the user and give you some of their profile information (like email and name).

The typical flow looks like this:

1. **User clicks "Login with Google".**
2. **Redirect to Provider:** Your server redirects the user to Google's consent screen.
3. **User Authenticates & Consents:** The user logs in to Google and agrees to share their profile data with your app.
4. **Callback with Authorization Code:** Google redirects the user back to your server with a temporary "Authorization Code".
5. **Exchange Code for Access Token:** Your server sends this Code (along with your Client ID and Client Secret) directly to Google to exchange it for an Access Token.
6. **Fetch User Profile:** Your server uses the Access Token to fetch the user's profile data from Google's API.
7. **Login/Register User:** Your server finds or creates the user in your database and logs them in (via session or JWT).

Passport.js handles steps 4, 5, and 6 for you automatically.

### 2. Setting Up the Project and Providers

First, install the necessary packages. You will need `passport`, and specific strategies for the providers you want to use.

```bash
npm install express passport passport-google-oauth20 jsonwebtoken dotenv
```

Before writing code, you need to register your application with the OAuth providers:

* **Google:** Go to the Google Cloud Console, create a project, configure the OAuth consent screen, and create OAuth client ID credentials. Set the authorized redirect URI (e.g., `http://localhost:3000/auth/google/callback`).
* **GitHub:** Go to your GitHub Developer Settings, create a new OAuth App, and set the authorization callback URL.

Store the obtained credentials in your `.env` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_super_secret_jwt_key
PORT=3000
```

### 3. Configuring Passport and the Google Strategy

Configure Passport to use the `passport-google-oauth20` strategy. This involves providing your credentials and a `verify` callback function that runs after Passport successfully fetches the user's profile.

```javascript
// passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Simulated database
const users = [];

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // This function runs after Google authenticates the user
    // and sends back the 'profile' object.

    try {
      // 1. Check if user already exists in your database
      let user = users.find(u => u.googleId === profile.id);

      if (!user) {
        // 2. If not, create a new user based on the Google profile
        user = {
          id: users.length + 1,
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value
        };
        users.push(user);
        console.log("New user created:", user.name);
      } else {
        console.log("Existing user logged in:", user.name);
      }

      // 3. Call 'done' to pass the user to the next step
      // The first argument is for errors, the second is the user object
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

module.exports = passport;
```

### 4. Creating the OAuth Routes

Now, integrate Passport into your Express routes. You need two routes for each provider: one to start the process, and one to handle the callback.

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const passport = require('./passport'); // Import your configured passport
const jwt = require('jsonwebtoken');

const app = express();

// Initialize passport middleware
app.use(passport.initialize());

// Route 1: Trigger the Google OAuth flow
// We request 'profile' and 'email' scopes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Route 2: Handle the callback from Google
// If successful, we generate a JWT and send it to the client
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // If we reach this point, authentication was successful.
    // Passport attaches the user object to 'req.user' (from the verify callback).

    const user = req.user;

    // Generate a JWT for our application
    const token = jwt.sign(
      { userId: user.id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In a real frontend application, you might redirect to the frontend URL
    // and pass the token via a query parameter or set it in a secure cookie.
    // For this API example, we just return it as JSON.
    res.json({
        message: 'Login successful',
        token: token,
        user: user
    });
  }
);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
```

Notice `session: false`. Passport traditionally uses server-side sessions. If you are building a modern API and want to issue JWTs instead, you must explicitly disable sessions so Passport doesn't try to serialize the user into an Express session.

---

## Contoh / Ilustrasi

Imagine an OAuth flow like entering a VIP club (your app).

1. You go to the bouncer, but you don't have an ID for this club.
2. The bouncer says, "Go get a pass from the local government office (Google)."
3. You go to the office, show them your driver's license, and they give you a temporary stamped paper (Authorization Code).
4. You bring the stamped paper back to the bouncer.
5. The bouncer takes the paper, goes to a secure phone, calls the office, and verifies the stamp is real (exchanging Code for Access Token).
6. The office confirms your identity over the phone (Profile Data).
7. The bouncer finally lets you in and gives you a VIP wristband (JWT) so you don't have to repeat the process all night.

---

## Insight Penting

* **Security Constraints:** OAuth providers almost always require `HTTPS` for redirect URIs in production. During local development, they usually make an exception for `http://localhost`.
* **State Parameter:** For enhanced security against CSRF attacks, the OAuth flow uses a `state` parameter. Passport handles this automatically in most strategies, ensuring the response matches the request.
* **Email Uniqueness:** When merging accounts (e.g., a user logs in with Google, then later with GitHub), be careful. Check if the email from GitHub already exists in your database. If it does, you might want to link the GitHub ID to the existing account rather than creating a duplicate.
* **Handling the Token on the Frontend:** A common challenge is how to get the JWT from the backend API back to a separate SPA frontend (like React or Vue) after the redirect. Common solutions include:
    1. Redirecting back to the frontend URL with the token in the query string (e.g., `http://frontend.com/login/success?token=ey...`). The frontend reads the URL, saves the token, and removes it from the URL.
    2. Having the backend set an `HttpOnly` cookie containing the token before redirecting to the frontend.

---

## Ringkasan Akhir

* OAuth 2.0 allows users to log in using third-party providers, improving user experience and security.
* Passport.js is the standard library for handling OAuth in Node.js, abstracting away the complex token exchange processes.
* The flow involves redirecting to the provider, handling a callback with a code, and exchanging that code for user data.
* You need to register your app with the provider to get a Client ID and Secret.
* After a successful OAuth login, your application must issue its own form of authentication (like a JWT or a Session cookie) to maintain the user's logged-in state.

---

## Langkah Belajar Berikutnya

* Try adding a second provider, such as GitHub or Facebook, using `passport-github2` or `passport-facebook`.
* Implement account linking, allowing a user to connect multiple social accounts to a single profile in your database.
* Explore "Authentication and Authorization with JWT in Express" to deepen your understanding of how to protect your routes using the token you just generated.

---

## Metadata

* Level: Intermediate
* Topik utama: Express.js, Authentication, OAuth 2.0
* Topik terkait: Security, Passport.js, JWT, Single Sign-On (SSO)
* Kata kunci: express oauth, passport js, social login, google login, github login, sso
* Estimasi waktu baca: 15 menit
