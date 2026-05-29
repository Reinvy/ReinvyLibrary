# API Versioning Strategies in Express JS

## Ringkasan Singkat

This material explains how to implement API versioning in Express.js applications. You will learn the importance of versioning for maintaining backward compatibility, and explore practical strategies such as URI path versioning and custom request headers to gracefully manage changes in your API lifecycle.

## Untuk Siapa Materi Ini

- Target audience: Backend Developers, API Designers, and Fullstack Developers.
- Reader level: Intermediate.

## Prasyarat

- Solid understanding of Express.js basics (Routing and Middleware).
- Familiarity with RESTful API design principles.
- Basic knowledge of HTTP methods and headers.

## Tujuan Belajar

- Understand what API versioning is and why it is critical for long-term API maintenance.
- Learn when to introduce a new version and when to avoid it.
- Implement URI path versioning in Express.js using routers.
- Implement HTTP header-based versioning using custom middleware.
- Recognize trade-offs between different versioning strategies to choose the best fit for your project.

## Konteks dan Motivasi

When you build an API, clients (mobile apps, web apps, or third-party services) start depending on its specific structure, endpoints, and data formats. Over time, your application will evolve. You may need to change database schemas, modify response payloads, or remove outdated features. If you make these breaking changes directly to your existing API, you risk breaking all client applications that rely on the old structure.

This is where API versioning comes in. Versioning allows you to deploy new features and breaking changes under a new version, while keeping the old version intact for existing clients. It provides a transition period, ensuring a smooth and uninterrupted experience for users. However, versioning introduces maintenance overhead, so knowing *how* and *when* to version is a fundamental skill for designing robust, scalable backend systems.

## Materi Inti

### What is API Versioning?

API versioning is the practice of transparently managing changes to your API by providing distinct variations of it at the same time. Instead of overwriting existing endpoints, you expose parallel access points for different versions.

### When to Use Versioning

You should introduce a new API version when you make a **breaking change**. Examples of breaking changes include:

- Removing an endpoint or an HTTP method.
- Removing or renaming fields in a JSON response.
- Changing the data type of a field (e.g., from an integer to a string).
- Adding new mandatory request parameters or validation rules.

### When to Avoid Versioning

Do not create a new version for **non-breaking changes**. You can safely update your current API version if you are:

- Adding a new endpoint.
- Adding new optional fields to a response.
- Adding optional parameters to a request.
- Fixing internal bugs that do not change the expected output structure.

### Versioning Strategies

There are several ways to implement versioning. The two most common in Express.js are:

1. **URI Path Versioning:** The version is explicitly stated in the URL (e.g., `/api/v1/users`). This is the most common and visible approach.
2. **Header Versioning:** The URL remains the same (e.g., `/api/users`), but the client specifies the requested version via an HTTP header (e.g., `Accept-Version: v2`).

## Contoh / Ilustrasi

### 1. Implementing URI Path Versioning

This approach uses Express routers to separate versions. It is simple to implement and easy to test directly in a browser.

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Controller for Version 1
const getUsersV1 = (req, res) => {
  try {
    // Old response format
    res.json({ users: ['Alice', 'Bob'] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Controller for Version 2 (Breaking change: objects instead of strings)
const getUsersV2 = (req, res) => {
  try {
    // New response format
    res.json({ data: [{ name: 'Alice' }, { name: 'Bob' }] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create routers
const routerV1 = express.Router();
const routerV2 = express.Router();

routerV1.get('/users', getUsersV1);
routerV2.get('/users', getUsersV2);

// Mount routers to specific URI paths
app.use('/api/v1', routerV1);
app.use('/api/v2', routerV2);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

### 2. Implementing Header Versioning

In this approach, the endpoint remains `/api/users`. We use middleware to inspect custom headers and route the request to the appropriate logic.

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Handlers
const handleGetUsersV1 = (req, res) => {
  try {
    res.json({ users: ['Alice', 'Bob'] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const handleGetUsersV2 = (req, res) => {
  try {
    res.json({ data: [{ name: 'Alice' }, { name: 'Bob' }] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Versioning Middleware
const versioningMiddleware = (req, res, next) => {
  // Extract version from custom header, default to 'v1'
  const version = req.headers['x-api-version'] || 'v1';
  req.apiVersion = version;
  next();
};

app.use(versioningMiddleware);

// Single endpoint with internal branching
app.get('/api/users', (req, res) => {
  if (req.apiVersion === 'v2') {
    return handleGetUsersV2(req, res);
  }
  // Fallback to V1
  return handleGetUsersV1(req, res);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

## Insight Penting

### Trade-offs Between Strategies

- **URI Path Versioning:** Highly visible, easy to cache, and simple to debug. However, it tightly couples the client to specific URIs and can clutter your routing logic as versions grow.
- **Header Versioning:** Keeps URIs clean and semantically correct (a URL should represent a resource, not a version). However, it is harder to test quickly via browser and requires clients to manage custom HTTP headers.

### Maintenance and Sunset Periods

Do not keep old versions alive forever. Every version multiplies your testing and maintenance efforts. When releasing `v2`, announce a clear "deprecation timeline" for `v1`. Once the sunset period ends, monitor the logs. If traffic on `v1` is minimal, you can safely remove it from the codebase.

### Security First

Always wrap your route logic in try-catch blocks (or use async error handlers). If an error occurs, log the detailed error internally (`console.error(error)`) and return a generic `500 Internal Server Error` message. This prevents exposing stack traces or sensitive database structures to end users, regardless of which API version they use.

## Ringkasan Akhir

- API versioning ensures that clients relying on older structures are not broken when you introduce major changes.
- Only version for breaking changes; additive changes do not require a new version.
- URI Path Versioning uses routers (`/api/v1/...`) and is widely adopted for its simplicity.
- Header Versioning uses custom middleware (`x-api-version`) to keep URLs clean but requires more client-side configuration.
- Plan sunset periods to eventually retire older API versions to avoid infinite maintenance burden.

## Langkah Belajar Berikutnya

- Learn how to structure controllers and services into separate folders to keep versioned routing clean (MVC pattern).
- Explore API documentation tools like Swagger (OpenAPI) to document multiple API versions simultaneously.
- Study Semantic Versioning (SemVer) principles to better understand how to classify major, minor, and patch updates.

## Metadata

- Level: Intermediate
- Topik utama: Express.js, API Design
- Topik terkait: Routing, Middleware, RESTful API
- Kata kunci: api versioning, express js routing, backward compatibility, rest api, header versioning
- Estimasi waktu baca: 8 menit
