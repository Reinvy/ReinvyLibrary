# Working with Cookies and Sessions in Express JS

## Ringkasan Singkat

This tutorial explains how to manage user state in Express.js using cookies and sessions. It covers the basics of HTTP being stateless, how cookies store small pieces of data on the client side, and how sessions provide a secure way to store user data on the server side across multiple requests.

## Untuk Siapa Materi Ini

This material is for beginner to intermediate Node.js developers who want to understand how to implement basic state management, user tracking, and simple authentication in Express applications before diving into advanced topics like JWTs.

## Prasyarat

- Basic understanding of JavaScript and Node.js.
- Familiarity with basic routing and middleware in Express.js.
- Understanding of how HTTP requests and responses work.

## Tujuan Belajar

- Understand the stateless nature of HTTP and why state management is needed.
- Learn how to parse, set, and clear cookies in Express.js using `cookie-parser`.
- Learn how to implement server-side sessions using `express-session`.
- Understand the differences between cookies and sessions, and when to use each.
- Grasp best practices for securing cookies and sessions.

## Konteks dan Motivasi

HTTP is a stateless protocol, meaning each request is independent and the server doesn't remember previous requests. However, modern web applications need to remember users—whether they are logged in, what items are in their shopping cart, or their theme preferences. Cookies and sessions are the fundamental mechanisms to bridge this gap, enabling persistent state across requests.

## Materi Inti

### 1. The Stateless Problem

When a user visits your app, their browser sends an HTTP request. By default, when they navigate to another page and send a second request, the server has no idea it's the same user. To track users, the server must give the client a "tag" (a cookie) that the client sends back with every subsequent request.

### 2. Working with Cookies

Cookies are small text strings stored on the client's browser. They are sent with every HTTP request to the domain that created them.
In Express, you can set a cookie using `res.cookie()` and read cookies using the `cookie-parser` middleware.

- **Setting a Cookie:** `res.cookie('name', 'value', options)`
- **Reading a Cookie:** `req.cookies.name` (requires `cookie-parser`)
- **Clearing a Cookie:** `res.clearCookie('name')`

### 3. Working with Sessions

While cookies store data on the client side, sessions store data on the server side. The server generates a unique Session ID, stores it in a cookie on the client's browser, and keeps the actual session data (like user ID or cart items) in the server's memory or a database.
The `express-session` middleware is the standard way to handle sessions in Express.

- **Setting Session Data:** `req.session.userId = 123`
- **Reading Session Data:** `const userId = req.session.userId`
- **Destroying a Session:** `req.session.destroy()`

### 4. Cookies vs. Sessions

- **Cookies:** Stored on the client. Limited in size (typically 4KB). Can be modified by the user if not signed/encrypted. Good for non-sensitive data like preferences.
- **Sessions:** Stored on the server. Unlimited size. Secure because the client only holds the Session ID. Good for sensitive data like authentication status.

## Contoh / Ilustrasi

### Example 1: Basic Cookie Implementation

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

// Middleware to parse cookies
app.use(cookieParser());

// Route to set a cookie
app.get('/set-cookie', (req, res) => {
  res.cookie('theme', 'dark', { maxAge: 900000, httpOnly: true });
  res.send('Cookie has been set!');
});

// Route to read the cookie
app.get('/get-cookie', (req, res) => {
  const theme = req.cookies.theme;
  res.send(`Current theme is: ${theme || 'default'}`);
});
```

### Example 2: Basic Session Implementation

```javascript
const express = require('express');
const session = require('express-session');
const app = express();

// Middleware to set up sessions
app.use(session({
  secret: 'my_super_secret_key', // Used to sign the session ID cookie
  resave: false,                 // Don't save session if unmodified
  saveUninitialized: false,      // Don't create session until something stored
  cookie: { secure: false }      // Set to true if using HTTPS
}));

// Route to log in and set session data
app.get('/login', (req, res) => {
  req.session.user = { id: 1, username: 'john_doe' };
  res.send('Logged in and session created!');
});

// Route to access session data
app.get('/profile', (req, res) => {
  if (req.session.user) {
    res.send(`Welcome back, ${req.session.user.username}`);
  } else {
    res.status(401).send('Please log in first.');
  }
});

// Route to log out and destroy session
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.send('Logged out successfully.');
  });
});
```

## Insight Penting

- **Security Matters:** Always use `httpOnly: true` for cookies containing sensitive information (like session IDs) to prevent client-side JavaScript from accessing them, mitigating XSS attacks.
- **Secure Flag:** In production with HTTPS, always set `secure: true` on your cookies so they are only sent over encrypted connections.
- **Session Storage:** By default, `express-session` stores session data in memory. This is fine for development, but it will leak memory and reset upon server restart. For production, always use a dedicated session store like Redis or a database.
- **Scaling Issues:** Stateful sessions can make horizontal scaling difficult because a user's session data is tied to a specific server. This is why stateless authentication like JWT is often preferred for distributed APIs.

## Ringkasan Akhir

- HTTP is stateless, but web apps need state.
- Cookies store small amounts of data on the client side.
- Sessions store data on the server side and use a cookie to track the Session ID.
- `cookie-parser` is used for managing plain cookies, while `express-session` is used for managing server-side sessions.
- Always implement security best practices (`httpOnly`, `secure` flags) when working with cookies and sessions.

## Langkah Belajar Berikutnya

- Authentication and Authorization with JWT in Express
- Caching in Express JS APIs with Redis
- Express JS Security Best Practices

## Metadata

- Level: Beginner / Intermediate
- Topik utama: Express.js
- Topik terkait: State Management, Authentication
- Kata kunci: Express, Cookies, Sessions, express-session, cookie-parser, State
- Estimasi waktu baca: 8 menit
