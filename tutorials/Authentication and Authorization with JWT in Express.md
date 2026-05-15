# Authentication and Authorization Using JWT in Express.js

## Short Summary

This material covers how to secure your Express.js applications using JSON Web Tokens (JWT). You will learn how to authenticate users during login and authorize access to protected routes.

---

## Who is this for

* Target audience: Backend Developers, Fullstack Developers
* Reader level: Intermediate

---

## Prerequisites

You should have a good understanding of:

* Express.js basics (Routing and Middleware)
* Basic REST API concepts
* Basic understanding of databases and user data retrieval (e.g., Prisma or other ORMs)

---

## Learning Objectives

After reading this material, you will understand:

* The difference between Authentication and Authorization
* The basic concept of JSON Web Tokens (JWT) and its structure
* How to create (sign) and verify JWTs in Express.js
* How to create an authorization middleware to protect API routes

---

## Context and Motivation

In modern web application development, security is a crucial aspect. When building REST APIs with Express.js, the server runs *statelessly*. This means the server does not store user login status (sessions) by default. To overcome this, JSON Web Tokens (JWT) have become the industry standard as a secure and efficient way to verify user identity and ensure they have access rights to specific resources without burdening the server with session storage. Understanding JWT is a fundamental skill every backend developer must possess.

---

## Core Material

### 1. Authentication vs Authorization

Many people often confuse these two terms:

* **Authentication:** Answers the question *"Who are you?"*. This is the process of verifying a user's identity (e.g., checking if the email and password match).
* **Authorization:** Answers the question *"What are you allowed to do?"*. This is the process of checking whether an authenticated user has permission to access specific routes or resources (e.g., checking if the user's role is Admin).

### 2. What is a JSON Web Token (JWT)?

JWT is an open standard (RFC 7519) that defines a compact and self-contained way for securely transmitting information between parties as a JSON object. This information can be verified and trusted because it is digitally signed.

A JWT consists of three parts, separated by dots (`.`):

1. **Header:** Contains the token type and the signing algorithm used (e.g., HMAC SHA256 or RSA).
2. **Payload:** Contains the claims or information about the user entity (e.g., user ID, email, role). Avoid putting sensitive information like passwords here.
3. **Signature:** Used to verify that the sender of the token is who it says it is and to ensure that the message wasn't changed along the way. It is created by combining the Header, Payload, and a *Secret Key*.

### 3. JWT Workflow in Express

1. **Login:** The user sends credentials (email and password).
2. **Validation:** The server validates the credentials against the database.
3. **Token Creation:** If valid, the server creates (signs) a JWT containing user identity and returns it to the client.
4. **Storage:** The client stores this token (usually in LocalStorage, SessionStorage, or an HTTP-only Cookie).
5. **Subsequent Requests:** Every time the client requests a protected route, it includes this JWT in the `Authorization` header (with the format `Bearer <token>`).
6. **Verification:** The server inspects the JWT through a middleware. If valid, access is granted.

---

## Examples / Illustrations

### Package Installation

We need to install `jsonwebtoken` to manage the tokens.

```bash
npm install jsonwebtoken
```

### 1. Creating a Login Endpoint (Authentication)

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

const SECRET_KEY = 'your_super_secure_secret'; // In a real app, use process.env.JWT_SECRET

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Database check simulation (Assuming login is successful)
  if (username === 'admin' && password === 'password123') {
    // 1. Prepare payload
    const payload = {
      id: 1,
      username: 'admin',
      role: 'admin'
    };

    // 2. Create token with a 1-hour expiration
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

    // 3. Send token to the user
    return res.json({
      message: 'Login successful',
      token
    });
  }

  // On failure, log error to console (internal) and return generic message (security)
  console.error('Login failed: Invalid username or password');
  res.status(401).json({ message: 'Invalid credentials' });
});
```

### 2. Creating an Authorization Middleware

```javascript
// Middleware to verify the token
const authenticateToken = (req, res, next) => {
  // Get the Authorization header
  const authHeader = req.headers['authorization'];

  // Token format is usually "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error('Access denied: Token not provided');
    return res.status(401).json({ message: 'Access denied, token missing' });
  }

  // Verify the token
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.error('Invalid or expired token', err);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // If valid, save the user payload into req for subsequent routes
    req.user = user;
    next();
  });
};
```

### 3. Protecting Routes with Middleware

```javascript
// This route can only be accessed if a valid token is present
app.get('/api/profile', authenticateToken, (req, res) => {
  // req.user contains data from the JWT Payload (id, username, role)
  res.json({
    message: 'Welcome to your profile',
    user: req.user
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## Important Insights

* **Keep the Secret Key Secret:** Never hardcode your *Secret Key* inside the source code, especially not uploading it to a public repository. Always use Environment Variables like `process.env.JWT_SECRET`.
* **Public Payload:** Information in the Payload section of a JWT is only *encoded* (Base64), not encrypted. Anyone who has your token can decode and read its contents. Therefore, never store sensitive data like passwords, credit card numbers, or other secrets inside a JWT Payload.
* **Token Expiration:** Always define an expiration time (`expiresIn`) when creating a token. Tokens that live forever are extremely dangerous if stolen (Token Hijacking). The best practice is to give a short token lifespan and use a *Refresh Token* mechanism.
* **Error Handling:** According to security standards, when a token verification error occurs, log the raw details using `console.error(err)` and return a generic response (`401` or `403`) to avoid exposing information to attackers (Information Exposure).

---

## Final Summary

* Authentication is identity verification, authorization is access right verification.
* JWT (JSON Web Token) is used to securely transmit identity between entities in the form of a token that is encrypted (in the signature part).
* `jwt.sign()` is used to generate a token after the user successfully logs in.
* The token is sent in the HTTP header, usually under `Authorization: Bearer <token>`.
* Express.js middlewares adopt `jwt.verify()` to intercept incoming requests, verify token validity, and decide if the route is permitted to be accessed.

---

## Next Learning Steps

* Implement the *Refresh Token* concept to securely extend JWT sessions.
* Integrate JWT authentication process with ORMs like Prisma to verify real data from a database.
* Learn how to hash passwords with bcrypt before validating them for authentication.

---

## Metadata

* Level: Intermediate
* Main topic: Express.js, Authentication, Security
* Related topics: Middleware, JWT, Authorization
* Keywords: jwt, json web token, login, express, middleware, api security
* Estimated reading time: 10 minutes
