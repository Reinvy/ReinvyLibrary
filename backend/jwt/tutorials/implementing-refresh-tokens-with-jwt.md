---
title: "Implementing Refresh Tokens with JWT in Express.js"
description: "This tutorial explains how to implement a secure Refresh Token mechanism in an Express.js application. You will learn the purpose of refresh tokens, the authent"
category: "backend"
technology: "jwt"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Implementing Refresh Tokens with JWT in Express.js

## Summary

This tutorial explains how to implement a secure Refresh Token mechanism in an Express.js application. You will learn the purpose of refresh tokens, the authentication flow, and how to write the code to manage short-lived access tokens alongside long-lived refresh tokens.

---

## Target Audience

* Backend Developers, Fullstack Developers
* Intermediate

---

## Prerequisites

* Basic understanding of Express.js routing and middleware.
* Familiarity with the concepts of Authentication and Authorization.
* Completion of the "Authentication and Authorization Using JWT in Express.js" tutorial.

---

## Learning Objectives

After reading this material, you will understand:

* Why Access Tokens should have a short lifespan.
* What Refresh Tokens are and why they are necessary.
* The complete flow of logging in, accessing protected routes, and refreshing tokens.
* How to implement the logic for issuing and verifying Refresh Tokens in Express.js.
* Best practices and security considerations for storing and handling tokens.

---

## Context and Motivation

In standard JWT-based authentication, an Access Token is issued to a user upon login. If this token has a long expiration time and is somehow intercepted by an attacker (e.g., via XSS), the attacker gains prolonged access to the user's account. This is a significant security risk.

To mitigate this, Access Tokens are given a very short lifespan (e.g., 15 minutes). However, forcing the user to log in again every 15 minutes provides a poor user experience. This is where Refresh Tokens come in. A Refresh Token is a long-lived token (e.g., 7 days) that can only be used to request a new Access Token when the old one expires. Understanding how to implement this dual-token strategy is essential for building secure, modern web applications.

---

## Core Content

### 1. The Core Concept

The standard flow involves two types of tokens:

* **Access Token:** Short lifespan (e.g., 15 minutes). Used to access protected API endpoints. Usually sent in the `Authorization` header.
* **Refresh Token:** Long lifespan (e.g., 7 days). Used *only* to obtain a new Access Token. It is often stored securely (e.g., in an `HttpOnly` cookie or a database) and sent to a specific `/refresh` endpoint.

### 2. The Authentication Flow

1. **Login:** The user submits credentials. If valid, the server generates both an Access Token and a Refresh Token. The Refresh Token is stored (often in an array in memory for simple apps, or in a database for production). Both tokens are sent to the client.
2. **Accessing Resources:** The client uses the Access Token to access protected routes.
3. **Token Expiration:** When the Access Token expires, the server responds with a `401 Unauthorized` (or `403 Forbidden`) status.
4. **Refreshing the Token:** The client intercepts this error and sends the Refresh Token to the `/refresh` endpoint.
5. **Validation:** The server verifies the Refresh Token. If valid and exists in the store, the server issues a *new* Access Token.
6. **Logout:** The client requests to logout, and the server removes the Refresh Token from its store, invalidating it.

### 3. Implementation Steps

We will use an in-memory array to store refresh tokens for simplicity, but in a real application, you should store them in a database.

First, ensure you have the necessary packages:

```bash
npm install express jsonwebtoken
```

---

## Code Examples

### 1. Setup and Login Route

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const ACCESS_TOKEN_SECRET = 'your_access_token_secret';
const REFRESH_TOKEN_SECRET = 'your_refresh_token_secret';

// In-memory store for refresh tokens (use a database in production!)
let refreshTokens = [];

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simulate user authentication
  if (username === 'admin' && password === 'password') {
    const user = { name: username };

    // 1. Generate Access Token (Short lifespan)
    const accessToken = jwt.sign(user, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

    // 2. Generate Refresh Token (Long lifespan)
    const refreshToken = jwt.sign(user, REFRESH_TOKEN_SECRET);

    // 3. Store the Refresh Token
    refreshTokens.push(refreshToken);

    // 4. Send both tokens to the client
    return res.json({ accessToken, refreshToken });
  }

  res.status(401).json({ message: 'Invalid credentials' });
});
```

### 2. Protected Route Middleware

This is similar to the basic JWT tutorial.

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired access token' });
    req.user = user;
    next();
  });
};

app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});
```

### 3. The Refresh Endpoint

This endpoint receives a refresh token and returns a new access token.

```javascript
app.post('/refresh', (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(401).json({ message: 'Refresh token required' });

  // Check if the refresh token exists in our store
  if (!refreshTokens.includes(token)) {
      return res.status(403).json({ message: 'Invalid refresh token' });
  }

  jwt.verify(token, REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid refresh token signature' });

    // Generate a new Access Token
    // We only need the username, so we extract it from the decoded user payload
    const accessToken = jwt.sign({ name: user.name }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

    res.json({ accessToken });
  });
});
```

### 4. The Logout Endpoint

Logout handles removing the refresh token from the server's store so it can no longer be used to generate new access tokens.

```javascript
app.post('/logout', (req, res) => {
  const { token } = req.body;

  // Remove the token from our in-memory store
  refreshTokens = refreshTokens.filter(t => t !== token);

  res.status(204).send(); // 204 No Content
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Insight Penting

* **Storage Strategy:** Storing Refresh Tokens in an `HttpOnly` cookie is often considered the most secure approach against XSS attacks, while the Access Token can be stored in memory on the client side.
* **Token Invalidation:** Because JWTs are stateless, you cannot invalidate a specific Access Token before it expires. The Refresh Token mechanism solves this: if a user is compromised or banned, you can delete their Refresh Token from the database. When their 15-minute Access Token expires, they will be unable to get a new one.
* **Refresh Token Rotation:** For enhanced security, you can implement Refresh Token Rotation. In this approach, every time a Refresh Token is used to get a new Access Token, the server also issues a *new* Refresh Token and invalidates the old one. If an attacker uses a stolen Refresh Token, the server will detect the reuse and can invalidate all tokens for that user.
* **Secrets Separation:** Always use different secret keys for your Access Tokens (`ACCESS_TOKEN_SECRET`) and Refresh Tokens (`REFRESH_TOKEN_SECRET`).

---

## Ringkasan Akhir

* Using long-lived Access Tokens is a security risk. They should have a short lifespan.
* Refresh Tokens are long-lived tokens used specifically to request new Access Tokens when the old ones expire.
* The server must keep track of valid Refresh Tokens (e.g., in a database) so it can revoke them if necessary (like during a logout or security breach).
* The `/refresh` endpoint verifies the given Refresh Token and, if valid, issues a fresh Access Token.

---

## Langkah Belajar Berikutnya

* Implement Refresh Token Storage using a real database (like PostgreSQL with Prisma) instead of an in-memory array.
* Learn how to store tokens securely on the frontend using `HttpOnly` cookies.
* Explore advanced security patterns like Refresh Token Rotation.

---

## Metadata

* Level: Intermediate
* Topik utama: Express.js, Authentication, Security
* Topik terkait: JWT, Refresh Token, Authorization
* Kata kunci: express, jwt, refresh token, access token, security, authentication
* Estimasi waktu baca: 15 minutes
