---
title: "Express.js Cheatsheet"
description: "A quick reference guide for Express.js covering app setup, middleware, routing, request/response handling, template engines, error handling, security, database integration, file uploads, authentication, testing, debugging, and production deployment."
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Express.js Cheatsheet

## Quick Reference Table

| Action | Code / Pattern | Description |
|--------|---------------|-------------|
| Initialize project | `npm init -y && npm install express` | Create a new Node.js project and install Express |
| Skeleton generator | `npx express-generator myapp --view=ejs` | Scaffold a full Express app with template engine |
| Basic app setup | `const app = express(); app.listen(PORT);` | Create and start an Express server |
| GET route | `app.get('/path', handler)` | Handle GET requests at a given path |
| POST route | `app.post('/path', handler)` | Handle POST requests at a given path |
| PUT route | `app.put('/path/:id', handler)` | Handle PUT requests with a route parameter |
| DELETE route | `app.delete('/path/:id', handler)` | Handle DELETE requests with a route parameter |
| Route param | `req.params.id` | Access dynamic route segment (`/users/:id`) |
| Query string | `req.query.page` | Access URL query parameter (`?page=2`) |
| Request body | `req.body` | Access parsed JSON / form body (needs `express.json()`) |
| Send JSON | `res.json({ key: value })` | Send a JSON response |
| Send HTML | `res.send('<h1>Hello</h1>')` | Send an HTML string |
| Set status code | `res.status(201).json(data)` | Set HTTP status before sending response |
| Render template | `res.render('index', { title })` | Render a view template (EJS, Pug) |
| Serve static files | `app.use(express.static('public'))` | Serve files from a directory |
| Error-handling middleware | `app.use((err, req, res, next) => { ... })` | Catch and format errors with 4-arity handler |
| CORS | `npm install cors` + `app.use(cors())` | Enable cross-origin requests |
| Helmet | `npm install helmet` + `app.use(helmet())` | Set secure HTTP headers |
| Rate limit | `npm install express-rate-limit` + `app.use(limiter)` | Throttle repeated requests |
| Environment config | `process.env.PORT` or `dotenv` | Use environment variables for configuration |
| Debug mode | `DEBUG=express:* npm start` | Enable Express debug logging |
| Compression | `npm install compression` + `app.use(compression())` | Enable gzip/brotli response compression |

## Common Commands

### Project Setup

```bash
# Create a new Express project
mkdir my-api && cd my-api
npm init -y
npm install express

# Install common companion packages
npm install cors helmet express-rate-limit compression
npm install dotenv morgan
npm install --save-dev nodemon

# Development runner with auto-restart
npx nodemon app.js
```

### Express Generator CLI

```bash
# Install the generator globally
npm install -g express-generator

# Scaffold an app with EJS template engine
express --view=ejs myapp

# Scaffold with Pug template engine
express --view=pug myapp

# Scaffold without a view engine (API-only)
express --no-view myapp

# Install dependencies and start
cd myapp
npm install
npm start
```

### Debugging with DEBUG Env

```bash
# Show all Express internal logs
DEBUG=express:* node app.js

# Show only router and application logs
DEBUG=express:router,express:application node app.js

# Enable in package.json scripts
# "scripts": { "dev": "DEBUG=express:* nodemon app.js" }

# Usage in your own code
# const debug = require('debug')('myapp:server');
# debug('Server listening on port %d', port);
```

### Testing with Supertest

```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Run tests
npx jest --coverage

# Watch mode
npx jest --watch
```

### Production Deployment

```bash
# Start with cluster mode (using throng or pm2)
node app.js

# Use PM2 for process management
npm install -g pm2
pm2 start app.js -i max
pm2 save && pm2 startup

# Enable gzip compression in app
npm install compression
# app.use(require('compression')())

# Set NODE_ENV for production optimizations
NODE_ENV=production node app.js
```

## Code Snippets

### Express App Setup

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware stack ---
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- Routes ---
app.get('/', (req, res) => {
  res.json({ message: 'Express API running' });
});

// --- Error handler (must be last) ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Middleware Types

```javascript
// Application-level — applies to every request
app.use((req, res, next) => {
  req.requestTime = Date.now();
  next();
});

// Router-level — scoped to a specific router
const router = express.Router();
router.use((req, res, next) => {
  console.log('Router-specific middleware');
  next();
});

// Built-in — json, urlencoded, static
app.use(express.json());
app.use(express.static('public'));

// Error-handling — 4 parameters required
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

// Third-party — cors, helmet, morgan, compression
const morgan = require('morgan');
app.use(morgan('combined'));
```

### Routing Patterns

```javascript
// --- Route parameters ---
app.get('/users/:userId/books/:bookId', (req, res) => {
  res.json({ userId: req.params.userId, bookId: req.params.bookId });
});

// --- Query strings ---
app.get('/search', (req, res) => {
  // GET /search?q=express&page=2
  res.json({ query: req.query.q, page: req.query.page });
});

// --- Chained routes with app.route ---
app.route('/articles')
  .get((req, res) => { /* list articles */ })
  .post((req, res) => { /* create article */ })
  .put((req, res) => { /* update article */ });

// --- Express Router for modular routes ---
// users.js
const usersRouter = express.Router();
usersRouter.get('/', (req, res) => { /* GET /users */ });
usersRouter.get('/:id', (req, res) => { /* GET /users/:id */ });
usersRouter.post('/', (req, res) => { /* POST /users */ });
module.exports = usersRouter;

// app.js
const usersRouter = require('./routes/users');
app.use('/users', usersRouter);
```

### Request & Response Objects

```javascript
// --- Request (req) ---
req.params      // Route params: /users/:id → { id: '42' }
req.query       // Query string: ?sort=asc → { sort: 'asc' }
req.body        // Parsed request body (needs express.json())
req.headers     // HTTP headers object
req.method      // HTTP method string
req.path        // URL path string
req.ip          // Client IP address
req.get('Content-Type')  // Specific header value

// --- Response (res) ---
res.json(data)           // Send JSON (auto sets Content-Type)
res.send('text')         // Send any type (buffer, string, object)
res.status(204).end()    // Set status and end response
res.redirect('/other')   // Redirect client
res.render('view', data) // Render template engine view
res.sendFile('/path')    // Send a file
res.download('/path')    // Send file as download
res.set('X-Custom', 'val')  // Set response header
res.type('json')         // Set Content-Type shortcut
```

### Template Engines

```javascript
// --- EJS setup ---
// npm install ejs
app.set('view engine', 'ejs');
// views/index.ejs: <h1><%= title %></h1>
// res.render('index', { title: 'Home' });

// --- Pug setup ---
// npm install pug
app.set('view engine', 'pug');
// views/index.pug: h1= title
// res.render('index', { title: 'Home' });
```

### Error Handling Patterns

```javascript
// --- Async error wrapper ---
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/data', asyncHandler(async (req, res) => {
  const data = await db.findMany(); // throws on error
  res.json(data);
}));

// --- Custom error class ---
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.status = statusCode;
  }
}

app.get('/secure', (req, res, next) => {
  if (!req.headers.authorization) {
    throw new AppError('Unauthorized', 401);
  }
});

// --- Centralized error handler ---
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Something went wrong';
  
  if (process.env.NODE_ENV === 'production') {
    console.error(err);
    res.status(status).json({ error: 'Internal server error' });
  } else {
    res.status(status).json({ error: message, stack: err.stack });
  }
});
```

### CORS Configuration

```javascript
const cors = require('cors');

// Allow all origins (development only)
app.use(cors());

// Restrict to specific origins
app.use(cors({
  origin: ['https://myapp.com', 'https://admin.myapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Per-route CORS
app.get('/public', cors(), (req, res) => { /* ... */ });
```

### Security Middleware

```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// --- Helmet (secure HTTP headers) ---
app.use(helmet());                    // Default: all 15 middlewares
app.use(helmet.hidePoweredBy());      // Remove X-Powered-By
app.use(helmet.contentSecurityPolicy({
  directives: { defaultSrc: ["'self'"] }
}));

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // limit each IP to 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Strict limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                     // 5 attempts per hour
  message: { error: 'Too many login attempts' }
});
app.use('/api/auth', authLimiter);
```

### Database Integration Patterns

```javascript
// --- Mongoose (MongoDB) ---
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const User = mongoose.model('User', { name: String, email: String });
app.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// --- Prisma (PostgreSQL / MySQL) ---
// npx prisma init
// schema.prisma → model User { id Int @id @default(autoincrement()) name String email String }
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// --- Knex (SQL) ---
const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL
});
app.get('/users', async (req, res) => {
  const users = await knex('users').select('*');
  res.json(users);
});
```

### File Upload with Multer

```javascript
const multer = require('multer');
const path = require('path');

// --- Disk storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Single file
app.post('/upload', upload.single('avatar'), (req, res) => {
  res.json({ file: req.file.filename });
});

// Multiple files (max 5)
app.post('/uploads', upload.array('photos', 5), (req, res) => {
  res.json({ files: req.files.map(f => f.filename) });
});
```

### Authentication Patterns

```javascript
// --- JWT Authentication ---
const jwt = require('jsonwebtoken');

// Login — issue token
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // validate credentials...
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token });
});

// Auth middleware
const authenticateJWT = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Protected route
app.get('/profile', authenticateJWT, (req, res) => {
  res.json({ user: req.user });
});

// --- Session-based Authentication ---
const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));

app.post('/login-session', (req, res) => {
  // validate credentials...
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ message: 'Logged in' });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ userId: req.session.userId });
});
```

### Supertest Integration

```javascript
// app.js — export app without listening
const express = require('express');
const app = express();
app.use(express.json());
app.get('/ping', (req, res) => res.json({ ok: true }));
module.exports = app;

// app.test.js
const request = require('supertest');
const app = require('./app');

describe('GET /ping', () => {
  it('responds with JSON', async () => {
    const res = await request(app)
      .get('/ping')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('POST /users', () => {
  it('creates a user', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Alice', email: 'alice@test.com' })
      .set('Authorization', 'Bearer ' + token)
      .expect(201);
    expect(res.body).toHaveProperty('id');
  });
});
```

### Environment-Based Configuration

```javascript
// .env file
// PORT=3000
// NODE_ENV=development
// DB_URL=postgresql://localhost:5432/mydb
// JWT_SECRET=your-secret-key

// config.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  db: {
    url: process.env.DB_URL,
    pool: {
      min: process.env.NODE_ENV === 'production' ? 2 : 0,
      max: process.env.NODE_ENV === 'production' ? 10 : 5
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.NODE_ENV === 'production' ? '1h' : '7d'
  },
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://example.com']
      : '*'
  }
};
```

### Deployment Config

```javascript
// --- Enable gzip compression ---
const compression = require('compression');
app.use(compression({
  level: 6,           // 1-9, default 6
  threshold: 1024,    // only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// --- Cluster mode with throng ---
// npm install throng
const throng = require('throng');
const WORKERS = process.env.WEB_CONCURRENCY || require('os').cpus().length;

throng({
  workers: WORKERS,
  lifetime: Infinity,
  start: async (workerId) => {
    console.log(`Worker ${workerId} started`);
    const app = require('./app');
    app.listen(process.env.PORT || 3000);
  }
});
```
