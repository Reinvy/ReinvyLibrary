# Implementing Webhooks in Express JS

## Ringkasan Singkat

This material covers the concept and practical implementation of Webhooks in Express.js. You will learn how to securely receive asynchronous events from external services (like payment gateways or GitHub), verify their authenticity using signatures, and process them efficiently without blocking the main event loop.

---

## Untuk Siapa Materi Ini

* **Target Audience:** Intermediate backend developers who need to integrate their Express applications with external APIs and services.
* **Level:** Intermediate.

---

## Prasyarat

* Solid understanding of building REST APIs with Express.js.
* Familiarity with HTTP POST requests and JSON payloads.
* Knowledge of basic security concepts like hashing and HMAC (Hash-based Message Authentication Code).
* Previous experience from [Understanding Basic Routing and Middleware in Express.js](Basic%20Routing%20and%20Middleware%20in%20Express.md).

---

## Tujuan Belajar

After completing this material, you will be able to:

* Understand what a webhook is and why it's preferred over polling for real-time updates.
* Create a dedicated Express route to receive and parse webhook payloads.
* Implement robust security by verifying webhook signatures to prevent spoofing attacks.
* Handle webhook processing asynchronously to ensure fast response times to the provider.
* Apply best practices for logging and error handling in webhook endpoints.

---

## Konteks dan Motivasi

In modern web development, your application rarely works in isolation. You often need to know when an event happens in an external system: a payment succeeds in Stripe, a pull request is merged in GitHub, or a message is received in Twilio.

You could constantly ask the external service, "Did anything happen?" (a technique called *polling*), but this wastes resources and is slow. **Webhooks** solve this by reversing the flow: the external service sends an HTTP POST request *to your server* the moment the event occurs.

Understanding how to implement webhooks securely is a critical skill. If done incorrectly, attackers could send fake webhooks to your server, tricking it into marking an unpaid order as paid.

---

## Materi Inti

### 1. What is a Webhook?

A webhook is essentially a user-defined HTTP callback. It's a way for an app to provide other applications with real-time information. When a specific event happens in the source system, it makes an HTTP POST request to the URL you provided, delivering data about the event (usually in JSON format).

### 2. The Webhook Flow

1. **Registration:** You tell the external service (e.g., Stripe) the URL of your webhook endpoint (e.g., `https://api.yourdomain.com/webhooks/stripe`).
2. **Event Occurs:** A user makes a payment.
3. **Delivery:** Stripe sends a POST request containing the payment details to your URL.
4. **Verification:** Your Express app verifies that the request actually came from Stripe.
5. **Acknowledgment:** Your app immediately responds with a `200 OK` to tell Stripe it received the message.
6. **Processing:** Your app updates the database (e.g., marks the order as paid).

### 3. Creating the Endpoint

A basic webhook receiver is just an Express POST route.

```javascript
const express = require('express');
const app = express();

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.post('/webhook', (req, res) => {
  const event = req.body;

  // Log the received event
  console.log(`Received event: ${event.type}`);

  // IMMEDIATELY acknowledge receipt!
  res.status(200).send('Webhook received');

  // Process the event asynchronously (don't await it before responding)
  processWebhookEvent(event).catch(err => {
    console.error('Error processing webhook:', err);
  });
});
```

### 4. Securing Webhooks with Signatures (Crucial)

Anyone can send a POST request to your `/webhook` URL. To prove the request is legitimate, providers include a cryptographic signature in the HTTP headers (e.g., `x-hub-signature` for GitHub, `Stripe-Signature` for Stripe).

They generate this signature by hashing the request payload using a **secret key** only known to them and you. You must recalculate the hash on your end and compare it.

**Important:** To verify the signature, you need the *raw, unparsed request body* exactly as it was sent, before `express.json()` modifies it.

---

## Contoh / Ilustrasi

Let's implement a secure webhook endpoint that verifies an HMAC SHA-256 signature, simulating a GitHub webhook integration.

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

// The secret shared between you and the webhook provider
const WEBHOOK_SECRET = 'my_super_secret_key';

// 1. We need the raw body to verify the signature.
// We use express.raw({ type: 'application/json' }) instead of express.json() for this specific route.
app.post('/api/webhooks/github', express.raw({ type: 'application/json' }), (req, res) => {

  // 2. Extract the signature provided by the sender
  const signatureHeader = req.headers['x-hub-signature-256'];

  if (!signatureHeader) {
    return res.status(401).send('Missing signature');
  }

  // 3. Re-calculate the signature using our secret and the RAW request body
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  // req.body is a Buffer here because of express.raw()
  const digest = 'sha256=' + hmac.update(req.body).digest('hex');

  // 4. Compare the signatures securely to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader))) {
    console.error('[SECURITY] Webhook signature mismatch!');
    return res.status(401).send('Invalid signature');
  }

  // 5. If signatures match, parse the JSON safely
  let eventData;
  try {
    eventData = JSON.parse(req.body.toString());
  } catch (err) {
    return res.status(400).send('Invalid JSON');
  }

  // 6. Acknowledge receipt immediately
  res.status(200).send('Success');

  // 7. Process the business logic asynchronously
  console.log(`Processing event: ${eventData.action} on ${eventData.repository.name}`);
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));
```

---

## Insight Penting

* **Respond Fast (Status 200):** Webhook providers expect a fast response (usually within 3-5 seconds). If you perform heavy database queries *before* sending `res.status(200)`, the provider might assume the request failed, timeout, and try sending it again (retries), causing duplicate processing. Always acknowledge first, process later.
* **Idempotency is Key:** Because of network glitches, providers might send the exact same webhook twice. Your code must be *idempotent*. If you receive the same "payment successful" event twice, you shouldn't credit the user's account twice. Always check if the event ID has already been processed in your database.
* **Use `express.raw()` carefully:** If you apply `express.raw()` globally using `app.use()`, it breaks normal JSON body parsing for your regular API routes. Apply it only to specific webhook routes, or use the `verify` option in `express.json()` to keep a copy of the raw body.
* **Local Testing:** You cannot receive webhooks on `localhost` directly because providers need a public URL. Use tools like **Ngrok** or **Localtunnel** to expose your local Express server to the internet during development.

---

## Ringkasan Akhir

* Webhooks allow external services to push real-time event notifications to your Express server.
* Always respond with a 2xx HTTP status code as quickly as possible to prevent timeouts and unnecessary retries.
* Never trust incoming webhooks blindly; always verify the cryptographic signature using the shared secret and the raw request body.
* Design your webhook handlers to be idempotent to safely handle duplicate deliveries.

---

## Langkah Belajar Berikutnya

* [Rate Limiting and API Throttling in Express JS](Rate%20Limiting%20and%20API%20Throttling%20in%20Express%20JS.md) (To protect your webhook endpoint from being flooded).
* [Data Validation and Error Handling in Express](Data%20Validation%20and%20Error%20Handling%20in%20Express.md) (To robustly handle malformed webhook payloads).

---

## Metadata

* **Level:** Intermediate
* **Topik utama:** Express.js, Backend Development
* **Topik terkait:** Webhooks, API Integration, Security, Asynchronous Processing
* **Kata kunci:** express webhook, stripe webhook, github webhook, verify signature hmac, express raw body, idempotency
* **Estimasi waktu baca:** 10 - 15 minutes
