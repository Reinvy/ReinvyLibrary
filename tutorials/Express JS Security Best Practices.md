# Express.js Security Best Practices

## Ringkasan Singkat
This material covers fundamental security practices in Express.js. You will learn how to protect your application from common vulnerabilities, manage HTTP headers securely, handle errors without leaking sensitive information, and apply rate limiting to prevent abuse.

## Untuk Siapa Materi Ini
- **Target Audience:** Intermediate web developers building production-ready applications.
- **Level:** Intermediate.

## Prasyarat
- Solid understanding of Express.js routing and middleware.
- Familiarity with HTTP methods and status codes.
- Have read [Basic Routing and Middleware in Express](Basic%20Routing%20and%20Middleware%20in%20Express.md).
- Understanding of JSON Web Tokens (JWT) for authentication is a plus.

## Tujuan Belajar
After completing this material, you will be able to:
- Identify common security risks in web applications.
- Implement secure HTTP headers using Helmet.
- Prevent Information Exposure by handling internal errors safely.
- Protect your API from brute-force attacks using rate limiting.
- Validate and sanitize incoming data effectively.

## Konteks dan Motivasi
Building functional APIs is only half the battle. Once your application is deployed to production, it becomes a potential target for malicious actors. Without proper security measures, attackers can exploit vulnerabilities to steal sensitive data, crash your server, or abuse your resources.

Securing an Express.js application doesn't require a complete rewrite; it involves applying a series of best practices and specialized middleware to add layers of defense. Understanding these practices is essential for any developer moving from development to production environments.

## Materi Inti

### 1. Secure HTTP Headers with Helmet
By default, Express sends certain HTTP headers that can reveal information about your tech stack (like `X-Powered-By: Express`). Attackers use this information to target known vulnerabilities.

Helmet is a collection of middleware functions that set secure HTTP headers.
```javascript
const express = require('express');
const helmet = require('helmet');
const app = express();

// Use helmet early in your middleware stack
app.use(helmet());
```
This single line protects your app from well-known web vulnerabilities by setting headers like `Content-Security-Policy`, `X-DNS-Prefetch-Control`, and `X-Frame-Options`.

### 2. Preventing Information Exposure in Error Logging
A common mistake is returning raw error details (such as database connection strings or internal file paths) directly to the client. This is known as Information Exposure and provides attackers with a map of your system.

**Best Practice:** To prevent Information Exposure, Express.js routes should log detailed errors internally using `console.error(error)` and return a generic error message like 'Internal Server Error' to the client.

```javascript
app.get('/users/:id', async (req, res) => {
  try {
    const user = await database.findUser(req.params.id);
    res.json(user);
  } catch (error) {
    // 1. Log the detailed error internally for developers
    console.error('[DATABASE ERROR]', error);

    // 2. Return a generic error message to the client
    res.status(500).send('Internal Server Error. Please try again later.');
  }
});
```

### 3. Rate Limiting to Prevent Brute Force
If your API endpoints are public, attackers might bombard them with thousands of requests per second to guess passwords or overload your server (DDoS). Rate limiting restricts the number of requests a single IP can make within a specific timeframe.

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply the rate limiting middleware to API routes
app.use('/api/', apiLimiter);
```

### 4. Validating and Sanitizing Input
Never trust data sent by the client. Malicious input can lead to NoSQL injection, Cross-Site Scripting (XSS), or SQL injection. Always validate and sanitize `req.body`, `req.query`, and `req.params`.

## Contoh / Ilustrasi
Imagine your Express server is a bank vault.
- **Helmet (Secure Headers):** Blanking out the manufacturer's logo on the vault door so robbers don't know exactly what tools to use.
- **Rate Limiting:** Ensuring a person can only try the passcode 3 times before they are locked out for an hour, preventing them from guessing thousands of combinations.
- **Generic Error Messages:** When someone enters the wrong code, the screen just says "Access Denied." It does *not* say "Access Denied: The 3rd digit was correct but the 4th digit failed due to wire short on panel B" (which would help the robber).

## Insight Penting
- **Information Exposure is a Critical Flaw:** Always remember that users do not need to know *why* the server failed, only that it *did* fail. Detailed error logs belong in your server console or monitoring tools (like Sentry or Datadog), never in the HTTP response.
- **Security is Layered:** No single middleware makes your application 100% secure. Helmet, rate limiting, input validation, and proper error handling work together to create a defense-in-depth strategy.
- **Keep Dependencies Updated:** Many security breaches happen through outdated third-party packages. Regularly run `npm audit` to check for known vulnerabilities in your dependencies.

## Ringkasan Akhir
- Use `helmet` to hide your tech stack and set secure HTTP headers.
- Implement rate limiting using `express-rate-limit` to prevent brute-force and DoS attacks.
- Never return system errors to the client; log them internally and send a generic status 500 message.
- Always validate and sanitize user input before processing it.

## Langkah Belajar Berikutnya
- [Data Validation and Error Handling in Express](Data%20Validation%20and%20Error%20Handling%20in%20Express.md)
- [Authentication and Authorization with JWT in Express](Authentication%20and%20Authorization%20with%20JWT%20in%20Express.md)

## Metadata
- Level: Intermediate
- Topik utama: Express.js, Backend Development, Security
- Topik terkait: Middleware, Error Handling, API Protection
- Kata kunci: express security, helmet, rate limiting, information exposure, error logging
- Estimasi waktu baca: 8 - 12 minutes
