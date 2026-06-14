---
title: "Password Hashing and Salting in Express JS with Bcrypt"
description: "This material covers how to securely store user passwords in your Express.js applications using Bcrypt. You will learn the critical differences between hashing,"
category: "backend"
technology: "express-js"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Password Hashing and Salting in Express JS with Bcrypt

## Summary

This material covers how to securely store user passwords in your Express.js applications using Bcrypt. You will learn the critical differences between hashing, salting, and encryption, and why storing plain-text passwords is a severe security vulnerability.

---

## Target Audience

- Target audience: Backend Developers, Fullstack Developers
- Reader level: Beginner to Intermediate

---

## Prerequisites

You should have a basic understanding of:

- Express.js fundamentals (Routes and Middleware)
- Basic REST API concepts (Handling POST requests)
- JSON and how to extract data from `req.body`

---

## Learning Objectives

After reading this material, you will understand:

- Why plain-text passwords must never be stored in a database
- The difference between encryption, hashing, and salting
- How to use the `bcrypt` library to securely hash passwords before saving them
- How to verify user login credentials against hashed passwords

---

## Context and Motivation

Security is a foundational aspect of backend development. One of the most common and disastrous mistakes a developer can make is storing user passwords as plain text in a database. If the database is ever compromised (data breach), attackers immediately gain access to every user's password. Because people often reuse passwords across different services, a breach in your application could compromise their accounts elsewhere.

To mitigate this, industry standards require developers to "hash" and "salt" passwords. This ensures that even if a hacker steals the database, they cannot easily read or reverse-engineer the original passwords. Learning how to properly secure passwords is an essential skill for any backend developer handling user authentication.

---

## Core Content

### 1. The Danger of Plain-Text Passwords

If you store passwords as they are (e.g., `"password123"`), anyone with database access (including malicious hackers or even rogue database administrators) can see them. This violates basic data privacy and security principles.

### 2. Encryption vs. Hashing

- **Encryption:** Is a two-way function. You encrypt data into a secret format, but you (or anyone with the decryption key) can reverse it back to the original data. This is good for storing credit card numbers, but **bad** for passwords, because if the key is stolen, all passwords can be recovered.
- **Hashing:** Is a one-way mathematical function. It takes an input (password) and transforms it into a fixed-length string of characters. You cannot reverse a hash to get the original password. When a user logs in, you simply hash their input again and compare it to the stored hash.

### 3. What is Salting?

If two users have the same password (`"123456"`), their hashes will be identical. Hackers use pre-calculated lists of hashes (called Rainbow Tables) to quickly crack common passwords.

**Salting** solves this by adding a random string of characters (the salt) to the password *before* hashing it. This means even if two users have the same password, their final hashes will be completely different because their "salts" are different.

### 4. Using Bcrypt in Express

`bcrypt` is an industry-standard library that handles both hashing and salting securely. It is intentionally slow (by design) to make "brute-force" guessing attacks unfeasible. The number of "salt rounds" determines how slow and secure the hashing process will be (typically 10 or 12 rounds is recommended).

---

## Code Examples

### Package Installation

First, install the library:

```bash
npm install bcrypt
```

*(Note: There is also `bcryptjs`, a pure JavaScript implementation, which is easier to install on some operating systems if the native `bcrypt` fails, but native `bcrypt` is generally faster.)*

### 1. Hashing a Password During Registration

```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.json());

// Simulated Database
const usersDB = [];

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Define the number of salt rounds
    const saltRounds = 10;

    // 2. Hash the password with the salt
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Store the user in the database with the hashed password
    const newUser = {
      id: usersDB.length + 1,
      username: username,
      password: hashedPassword // NEVER store the plain 'password'
    };

    usersDB.push(newUser);

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 2. Verifying a Password During Login

```javascript
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Find the user in the database
    const user = usersDB.find(u => u.username === username);
    if (!user) {
      // Use generic error messages for security
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 2. Compare the input password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      res.json({ message: 'Login successful!' });
    } else {
      // Again, generic error message
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## Insight Penting

- **Generic Error Messages:** Notice that during login, whether the user is not found or the password doesn't match, we return the same `"Invalid username or password"` message. This prevents attackers from discovering which usernames actually exist in your system (User Enumeration Attack).
- **Asynchronous Execution:** Hashing is a CPU-intensive operation. Always use the asynchronous versions (`bcrypt.hash` and `bcrypt.compare`) with `async/await` rather than their synchronous counterparts (`bcrypt.hashSync`). Synchronous methods will block the Node.js event loop, freezing your entire server while it processes the hash.
- **Cost Factor (Salt Rounds):** Increasing the salt rounds (e.g., from 10 to 12) exponentially increases the time it takes to hash. While this makes it more secure against brute-force attacks, it also puts more load on your server. Balance security with server performance.

---

## Ringkasan Akhir

- Never store passwords as plain text.
- Passwords should be hashed (one-way), not encrypted (two-way).
- Salting adds random data to the password before hashing, protecting against Rainbow Table attacks.
- The `bcrypt` library automatically handles generating the salt, combining it, and hashing the password.
- Use `bcrypt.hash()` to secure a password during registration, and `bcrypt.compare()` to verify it during login.

---

## Langkah Belajar Berikutnya

- [Authentication and Authorization with JWT in Express](Authentication%20and%20Authorization%20with%20JWT%20in%20Express.md) (Learn how to issue tokens after a successful login).
- Explore integrating this logic with a real database using an ORM like Prisma or Mongoose.

---

## Metadata

- Level: Beginner to Intermediate
- Topik utama: Express.js, Security
- Topik terkait: Authentication, Bcrypt, Hashing, Passwords
- Kata kunci: bcrypt, hash, salt, password security, express authentication
- Estimasi waktu baca: 8 minutes
