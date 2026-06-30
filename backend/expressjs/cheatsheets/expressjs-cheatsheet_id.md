---
title: "Cheat Sheet Express.js"
description: "Panduan referensi cepat untuk Express.js mencakup pengaturan aplikasi, middleware, routing, penanganan request/response, template engine, penanganan error, keamanan, integrasi database, unggah file, autentikasi, pengujian, debugging, dan deployment produksi."
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Express.js

## Tabel Referensi Cepat

| Aksi | Kode / Pola | Deskripsi |
|------|-------------|-----------|
| Inisialisasi proyek | `npm init -y && npm install express` | Membuat proyek Node.js baru dan menginstal Express |
| Generator skeleton | `npx express-generator myapp --view=ejs` | Membuat struktur aplikasi Express lengkap dengan template engine |
| Pengaturan dasar | `const app = express(); app.listen(PORT);` | Membuat dan menjalankan server Express |
| Route GET | `app.get('/path', handler)` | Menangani permintaan GET di jalur tertentu |
| Route POST | `app.post('/path', handler)` | Menangani permintaan POST di jalur tertentu |
| Route PUT | `app.put('/path/:id', handler)` | Menangani permintaan PUT dengan parameter route |
| Route DELETE | `app.delete('/path/:id', handler)` | Menangani permintaan DELETE dengan parameter route |
| Parameter route | `req.params.id` | Mengakses segmen route dinamis (`/users/:id`) |
| Query string | `req.query.page` | Mengakses parameter query URL (`?page=2`) |
| Body permintaan | `req.body` | Mengakses body JSON/form yang di-parse (butuh `express.json()`) |
| Kirim JSON | `res.json({ key: value })` | Mengirim respons JSON |
| Kirim HTML | `res.send('<h1>Hello</h1>')` | Mengirim string HTML |
| Atur kode status | `res.status(201).json(data)` | Mengatur status HTTP sebelum mengirim respons |
| Render template | `res.render('index', { title })` | Me-render view template (EJS, Pug) |
| Serve file statis | `app.use(express.static('public'))` | Menyajikan file dari direktori |
| Middleware error | `app.use((err, req, res, next) => { ... })` | Menangkap dan memformat error dengan handler 4 parameter |
| CORS | `npm install cors` + `app.use(cors())` | Mengaktifkan permintaan lintas asal |
| Helmet | `npm install helmet` + `app.use(helmet())` | Mengatur header HTTP yang aman |
| Rate limit | `npm install express-rate-limit` + `app.use(limiter)` | Membatasi permintaan berulang |
| Konfigurasi env | `process.env.PORT` atau `dotenv` | Menggunakan variabel lingkungan untuk konfigurasi |
| Mode debug | `DEBUG=express:* npm start` | Mengaktifkan log debugging Express |
| Kompresi | `npm install compression` + `app.use(compression())` | Mengaktifkan kompresi respons gzip/brotli |

## Perintah Umum

### Pengaturan Proyek

```bash
# Membuat proyek Express baru
mkdir my-api && cd my-api
npm init -y
npm install express

# Menginstal paket pendamping umum
npm install cors helmet express-rate-limit compression
npm install dotenv morgan
npm install --save-dev nodemon

# Menjalankan development dengan auto-restart
npx nodemon app.js
```

### CLI Express Generator

```bash
# Menginstal generator secara global
npm install -g express-generator

# Membuat struktur aplikasi dengan template engine EJS
express --view=ejs myapp

# Membuat struktur dengan template engine Pug
express --view=pug myapp

# Membuat struktur tanpa view engine (khusus API)
express --no-view myapp

# Menginstal dependensi dan menjalankan
cd myapp
npm install
npm start
```

### Debugging dengan DEBUG Env

```bash
# Menampilkan semua log internal Express
DEBUG=express:* node app.js

# Menampilkan hanya log router dan aplikasi
DEBUG=express:router,express:application node app.js

# Mengaktifkan di package.json scripts
# "scripts": { "dev": "DEBUG=express:* nodemon app.js" }

# Penggunaan dalam kode sendiri
# const debug = require('debug')('myapp:server');
# debug('Server listening on port %d', port);
```

### Pengujian dengan Supertest

```bash
# Menginstal dependensi pengujian
npm install --save-dev jest supertest

# Menjalankan pengujian
npx jest --coverage

# Mode watch
npx jest --watch
```

### Deployment Produksi

```bash
# Menjalankan dengan mode cluster (menggunakan throng atau pm2)
node app.js

# Menggunakan PM2 untuk manajemen proses
npm install -g pm2
pm2 start app.js -i max
pm2 save && pm2 startup

# Mengaktifkan kompresi gzip di aplikasi
npm install compression
# app.use(require('compression')())

# Mengatur NODE_ENV untuk optimasi produksi
NODE_ENV=production node app.js
```

## Potongan Kode

### Pengaturan Aplikasi Express

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Stack middleware ---
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- Route ---
app.get('/', (req, res) => {
  res.json({ message: 'Express API running' });
});

// --- Penanganan error (harus paling akhir) ---
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

### Tipe-tipe Middleware

```javascript
// Application-level — berlaku untuk setiap permintaan
app.use((req, res, next) => {
  req.requestTime = Date.now();
  next();
});

// Router-level — terbatas pada router tertentu
const router = express.Router();
router.use((req, res, next) => {
  console.log('Router-specific middleware');
  next();
});

// Built-in — json, urlencoded, static
app.use(express.json());
app.use(express.static('public'));

// Error-handling — 4 parameter wajib
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

// Pihak ketiga — cors, helmet, morgan, compression
const morgan = require('morgan');
app.use(morgan('combined'));
```

### Pola Routing

```javascript
// --- Parameter route ---
app.get('/users/:userId/books/:bookId', (req, res) => {
  res.json({ userId: req.params.userId, bookId: req.params.bookId });
});

// --- Query string ---
app.get('/search', (req, res) => {
  // GET /search?q=express&page=2
  res.json({ query: req.query.q, page: req.query.page });
});

// --- Route berantai dengan app.route ---
app.route('/articles')
  .get((req, res) => { /* daftar artikel */ })
  .post((req, res) => { /* buat artikel */ })
  .put((req, res) => { /* update artikel */ });

// --- Express Router untuk route modular ---
// routes/users.js
const usersRouter = express.Router();
usersRouter.get('/', (req, res) => { /* GET /users */ });
usersRouter.get('/:id', (req, res) => { /* GET /users/:id */ });
usersRouter.post('/', (req, res) => { /* POST /users */ });
module.exports = usersRouter;

// app.js
const usersRouter = require('./routes/users');
app.use('/users', usersRouter);
```

### Objek Request & Response

```javascript
// --- Request (req) ---
req.params      // Parameter route: /users/:id → { id: '42' }
req.query       // Query string: ?sort=asc → { sort: 'asc' }
req.body        // Body permintaan yang di-parse (butuh express.json())
req.headers     // Objek header HTTP
req.method      // String metode HTTP
req.path        // String jalur URL
req.ip          // Alamat IP klien
req.get('Content-Type')  // Nilai header spesifik

// --- Response (res) ---
res.json(data)           // Mengirim JSON (auto set Content-Type)
res.send('teks')         // Mengirim tipe apa pun (buffer, string, objek)
res.status(204).end()    // Mengatur status dan mengakhiri respons
res.redirect('/other')   // Mengarahkan klien
res.render('view', data) // Me-render view template engine
res.sendFile('/path')    // Mengirim file
res.download('/path')    // Mengirim file sebagai unduhan
res.set('X-Custom', 'val')  // Mengatur header respons
res.type('json')         // Pintasan untuk Content-Type
```

### Template Engine

```javascript
// --- Setup EJS ---
// npm install ejs
app.set('view engine', 'ejs');
// views/index.ejs: <h1><%= title %></h1>
// res.render('index', { title: 'Home' });

// --- Setup Pug ---
// npm install pug
app.set('view engine', 'pug');
// views/index.pug: h1= title
// res.render('index', { title: 'Home' });
```

### Pola Penanganan Error

```javascript
// --- Pembungkus async error ---
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/data', asyncHandler(async (req, res) => {
  const data = await db.findMany(); // throws on error
  res.json(data);
}));

// --- Kelas error kustom ---
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

// --- Penanganan error terpusat ---
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

### Konfigurasi CORS

```javascript
const cors = require('cors');

// Mengizinkan semua asal (hanya development)
app.use(cors());

// Membatasi ke asal spesifik
app.use(cors({
  origin: ['https://myapp.com', 'https://admin.myapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// CORS per-route
app.get('/public', cors(), (req, res) => { /* ... */ });
```

### Middleware Keamanan

```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// --- Helmet (header HTTP aman) ---
app.use(helmet());                    // Default: semua 15 middleware
app.use(helmet.hidePoweredBy());      // Hapus X-Powered-By
app.use(helmet.contentSecurityPolicy({
  directives: { defaultSrc: ["'self'"] }
}));

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 menit
  max: 100,                   // batasi setiap IP ke 100 permintaan
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Pembatas ketat untuk route auth
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 jam
  max: 5,                     // 5 percobaan per jam
  message: { error: 'Too many login attempts' }
});
app.use('/api/auth', authLimiter);
```

### Pola Integrasi Database

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

### Unggah File dengan Multer

```javascript
const multer = require('multer');
const path = require('path');

// --- Penyimpanan disk ---
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

// File tunggal
app.post('/upload', upload.single('avatar'), (req, res) => {
  res.json({ file: req.file.filename });
});

// Banyak file (maks 5)
app.post('/uploads', upload.array('photos', 5), (req, res) => {
  res.json({ files: req.files.map(f => f.filename) });
});
```

### Pola Autentikasi

```javascript
// --- Autentikasi JWT ---
const jwt = require('jsonwebtoken');

// Login — terbitkan token
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // validasi kredensial...
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token });
});

// Middleware auth
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

// Route yang dilindungi
app.get('/profile', authenticateJWT, (req, res) => {
  res.json({ user: req.user });
});

// --- Autentikasi Berbasis Session ---
const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));

app.post('/login-session', (req, res) => {
  // validasi kredensial...
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ message: 'Logged in' });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ userId: req.session.userId });
});
```

### Integrasi Supertest

```javascript
// app.js — ekspor app tanpa listen
const express = require('express');
const app = express();
app.use(express.json());
app.get('/ping', (req, res) => res.json({ ok: true }));
module.exports = app;

// app.test.js
const request = require('supertest');
const app = require('./app');

describe('GET /ping', () => {
  it('merespons dengan JSON', async () => {
    const res = await request(app)
      .get('/ping')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('POST /users', () => {
  it('membuat user baru', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Alice', email: 'alice@test.com' })
      .set('Authorization', 'Bearer ' + token)
      .expect(201);
    expect(res.body).toHaveProperty('id');
  });
});
```

### Konfigurasi Berbasis Lingkungan

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

### Konfigurasi Deployment

```javascript
// --- Mengaktifkan kompresi gzip ---
const compression = require('compression');
app.use(compression({
  level: 6,           // 1-9, default 6
  threshold: 1024,    // hanya kompres respons > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// --- Mode cluster dengan throng ---
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
