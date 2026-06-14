---
title: "Understanding CORS in Express JS"
description: "This tutorial explains Cross-Origin Resource Sharing (CORS), why browsers enforce it, and how to easily and securely configure it within your Express.js applica"
category: "backend"
technology: "express-js"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Understanding CORS in Express JS

## Summary

This tutorial explains Cross-Origin Resource Sharing (CORS), why browsers enforce it, and how to easily and securely configure it within your Express.js applications. You will learn how to allow frontend applications on different domains to communicate with your backend API.

---

## Target Audience

* **Target pembaca:** Frontend developers learning backend, and backend developers building APIs consumed by modern single-page applications (SPAs).
* **Level pembaca:** Beginner to Intermediate.

---

## Prerequisites

Before starting this tutorial, you should understand:

* JavaScript basics.
* How to create a simple Express server (refer to "Basic Routing and Middleware in Express").
* What HTTP methods and headers are.

---

## Learning Objectives

Setelah membaca materi ini, pembaca akan memahami:

* The concept of the Same-Origin Policy (SOP) and why it exists.
* What CORS is and how it solves the cross-origin communication problem.
* How to install and configure the `cors` middleware in Express.js.
* The difference between simple requests and preflight requests (`OPTIONS`).
* Best practices for configuring CORS securely in production environments.

---

## Context and Motivation

In modern web development, it is extremely common to separate the frontend and backend. For example, your React application might be hosted on `https://my-frontend.com` while your Express.js API lives on `https://api.my-backend.com`.

When your frontend tries to fetch data from your API, the browser steps in and blocks the request by default. This is due to a security mechanism called the **Same-Origin Policy (SOP)**.

CORS is the standardized mechanism that tells the browser, "It's okay, this backend explicitly allows requests from this frontend." Understanding CORS is a mandatory rite of passage for every full-stack or backend developer, as "CORS errors" are among the most common hurdles when connecting applications.

---

## Core Content

### 1. The Same-Origin Policy (SOP)

The Same-Origin Policy is a fundamental security concept implemented by web browsers. It dictates that a web page can only request resources from the **same origin** that served the page.

An "origin" is defined by the combination of three things:

1. **Protocol** (e.g., `http://`, `https://`)
2. **Domain** (e.g., `localhost`, `example.com`)
3. **Port** (e.g., `:3000`, `:8080`)

If any of these three differ between the frontend and the backend, it is considered a **Cross-Origin** request.

### 2. What is CORS?

Cross-Origin Resource Sharing (CORS) is an HTTP-header-based mechanism that allows a server to indicate any origins (domain, scheme, or port) other than its own from which a browser should permit loading resources.

When a cross-origin request is made, the browser expects the server to respond with specific CORS headers (like `Access-Control-Allow-Origin`). If these headers are missing or do not match the frontend's origin, the browser throws a CORS error and hides the response from the frontend code.

### 3. Simple vs. Preflight Requests

Browsers handle cross-origin requests in two main ways:

* **Simple Requests:** Standard `GET` or `POST` requests with basic headers. The browser sends the request, and if the server responds with the correct CORS headers, the browser allows the frontend to read the response.
* **Preflight Requests:** For complex requests (e.g., using `PUT`, `DELETE`, or sending `application/json` data), the browser first sends an `OPTIONS` request to the server. This is a "preflight" check asking the server, "Are you okay with this specific request?". If the server approves, the browser then sends the actual request.

### 4. Handling CORS in Express.js

While you could manually set CORS headers using `res.setHeader()`, Express provides a dedicated, highly configurable middleware called `cors` that makes this process effortless.

---

## Code Examples

### Step 1: Installation

First, install the `cors` package via npm:

```bash
npm install cors
```

### Step 2: Basic Configuration (Allowing All Origins)

The simplest way to use CORS is to allow requests from *any* origin. **Warning: This is only recommended for public APIs or local development.**

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all routes and all origins
app.use(cors());

app.get('/api/data', (req, res) => {
    res.json({ message: 'This data can be accessed from any domain!' });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

### Step 3: Secure Configuration (Allowing Specific Origins)

In production, you should restrict CORS to only allow requests from your trusted frontend applications.

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Define a list of trusted origins
const whitelist = ['https://my-frontend.com', 'http://localhost:5173'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    // Optional: Allow cookies to be sent cross-origin
    credentials: true,
    // Optional: Specify which HTTP methods are allowed
    methods: ['GET', 'POST', 'PUT', 'DELETE']
};

// Apply the restricted CORS configuration
app.use(cors(corsOptions));

app.get('/api/secure-data', (req, res) => {
    res.json({ message: 'Only trusted origins can see this.' });
});

app.listen(3000, () => console.log('Secure server running'));
```

---

## Insight Penting

* **CORS protects the Browser, not the Server:** A common misconception is that CORS secures your API. It does not. Tools like Postman or `curl` do not enforce CORS; they will always be able to hit your API. CORS purely prevents *malicious websites in a user's browser* from making unauthorized requests to your server on the user's behalf.
* **The `*` Wildcard Danger:** Never use `Access-Control-Allow-Origin: *` if your application requires cookies or authentication credentials (using `credentials: true`). Browsers will explicitly block this combination for security reasons.
* **Handling Preflight Errors:** If you see an `OPTIONS` request failing in your network tab, it means your server is not correctly configured to handle the preflight request for the specific route or method. The `cors` middleware usually handles this automatically when applied globally via `app.use()`.

---

## Ringkasan Akhir

* SOP (Same-Origin Policy) blocks frontend applications from calling backend APIs on different domains by default.
* CORS is the standard way to relax this policy securely.
* Browsers use Preflight (`OPTIONS`) requests to check permissions before sending complex requests.
* The `cors` middleware in Express simplifies header management.
* Always whitelist specific origins in production rather than allowing all origins (`*`).

---

## Langkah Belajar Berikutnya

Now that your API can safely communicate with frontend applications, you are ready to learn about:

* **Deploying Express JS Applications to Production:** Learn how to host your API and frontend securely.
* **Express JS Security Best Practices:** Dive deeper into protecting your server with tools like Helmet and Rate Limiting.

---

## Metadata

* Level: Beginner
* Topik utama: Express JS
* Topik terkait: Security, Middleware, Web Browsers
* Kata kunci: express, cors, api, cross-origin, security
* Estimasi waktu baca: 10 menit
