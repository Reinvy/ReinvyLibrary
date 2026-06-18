---
title: "Panduan Praktik Terbaik Express.js"
description: "Panduan komprehensif untuk pola aplikasi Express.js kelas produksi yang mencakup struktur proyek, arsitektur middleware, keamanan, integrasi database, autentikasi, pengujian, pemantauan, dan strategi deployment."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Praktik Terbaik Express.js

## Pendahuluan

Express.js tetap menjadi framework web Node.js yang paling banyak diadopsi, mendukung segala sesuatu mulai dari mikrolayanan kecil hingga API tingkat perusahaan. Intinya yang minimal dan ekosistem middleware yang luas memberikan fleksibilitas yang luar biasa, tetapi fleksibilitas yang sama ini menuntut disiplin arsitektural yang disengaja. Tanpa serangkaian pola yang konsisten, aplikasi Express dengan cepat berubah menjadi "spaghetti callback" yang tidak dapat dipelihara di mana penanganan permintaan, logika bisnis, dan akses data saling tercampur secara tidak beraturan.

Panduan ini menyajikan serangkaian praktik terbaik arsitektural dan operasional yang telah teruji untuk membangun aplikasi Express.js yang dapat dipelihara, aman, berperforma tinggi, dan siap produksi. Pola-pola ini diambil dari deployment dunia nyata yang memproses jutaan permintaan per hari dan mencerminkan kearifan kolektif komunitas Node.js. Fokusnya adalah pada *mengapa* setiap praktik penting dan *bagaimana* pola-pola tersebut membentuk sistem yang koheren, bukan pada tutorial implementasi langkah demi langkah.

## Praktik Terbaik

### Struktur Proyek: Organisasi Hibrida MVC dan Berbasis Fitur

Struktur proyek yang terorganisir dengan baik adalah fondasi kemudahan pemeliharaan. Dua pola yang saling melengkapi mendominasi ekosistem Express: **MVC (Model-View-Controller)** dan **modularisasi berbasis fitur**. Pendekatan yang direkomendasikan adalah hibrida yang mengelompokkan file berdasarkan fitur bisnis di tingkat atas sambil mempertahankan pemisahan concern yang jelas dalam setiap fitur.

**Mengapa ini penting**: Struktur file datar tidak dapat diskalakan dengan baik melampaui 10–15 rute. Tanpa pengelompokan logis, pengembang membuang waktu menavigasi file yang tidak terkait, konflik merge meningkat, dan penambahan fitur baru memerlukan perubahan pada file yang tersebar di seluruh basis kode.

```text
src/
  config/            # Loader konfigurasi khusus lingkungan
    database.js
    redis.js
    env.js
  middleware/        # Middleware global dan yang dapat digunakan kembali
    auth.js
    errorHandler.js
    rateLimiter.js
    validator.js
  features/          # Modul fitur (satu per domain bisnis)
    users/
      users.controller.js
      users.service.js
      users.repository.js
      users.routes.js
      users.validation.js
      users.test.js
    orders/
      orders.controller.js
      orders.service.js
      orders.repository.js
      orders.routes.js
      orders.validation.js
  database/          # Koneksi database, migrasi, seed
    migrations/
    seeds/
    pool.js
  shared/            # Utilitas bersama, tipe, konstanta
    errors/
    logger.js
    response.js
  app.js             # Setup aplikasi Express dan rantai middleware
  server.js          # Titik masuk dengan graceful shutdown
```

**Aturan utama**:
- Setiap folder fitur adalah modul mandiri dengan rute, controller, service, repository, skema validasi, dan pengujiannya sendiri.
- Concern lintas sektor (logging, autentikasi, penanganan error) berada di `middleware/` atau `shared/`.
- Arah dependensi mengalir ke dalam: rute → controller → service → repository. Controller tidak pernah mengakses database secara langsung.
- Jaga folder fitur tetap kecil (di bawah 10 file). Jika sebuah folder melebihi batas ini, pisahkan menjadi sub-fitur.

### Arsitektur Middleware: Berlapis dan Dapat Dikomposisikan

Middleware Express adalah tulang punggung pemrosesan permintaan. Tiga kategori middleware harus diorganisir secara sengaja: **global** (diterapkan pada setiap permintaan), **tingkat rute** (diterapkan pada grup fitur tertentu), dan **penanganan error** (catch-all dengan empat parameter).

**Mengapa ini penting**: Urutan registrasi middleware menentukan pipeline pemrosesan permintaan. Middleware yang salah urut—seperti menempatkan penangan error sebelum penangan rute—adalah salah satu bug Express paling umum yang menyebabkan crash atau celah keamanan.

```javascript
// app.js — urutan rantai middleware global
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { rateLimiter } = require('./middleware/rateLimiter');
const { authMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Layer 1: Header keamanan — harus pertama
app.use(helmet());

// Layer 2: CORS — sebelum penangan rute mana pun
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));

// Layer 3: Parsing permintaan
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Layer 4: Kompresi
app.use(require('compression')());

// Layer 5: Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Layer 6: Pembatasan rate global
app.use(rateLimiter);

// Layer 7: Rute — modul fitur
app.use('/api/v1/users', require('./features/users/users.routes'));
app.use('/api/v1/orders', require('./features/orders/orders.routes'));

// Layer 8: Penangan 404 — harus setelah semua rute
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Layer 9: Penangan error global — harus terakhir
app.use(errorHandler);
```

**Pola komposisi untuk middleware tingkat rute**:

```javascript
// features/users/users.routes.js
const router = require('express').Router();
const { authMiddleware, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validator');
const { createUserSchema, updateUserSchema } = require('./users.validation');
const controller = require('./users.controller');

// Rute publik — tanpa autentikasi
router.post('/', validate(createUserSchema), controller.create);

// Rute terproteksi — autentikasi + otorisasi berbasis peran
router.use(authMiddleware); // Semua rute di bawah memerlukan autentikasi
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id', validate(updateUserSchema), controller.update);
router.delete('/:id', requireRole('admin'), controller.remove);

module.exports = router;
```

### Praktik Terbaik Keamanan

Aplikasi Express sering menjadi target serangan web. Strategi pertahanan berlapis menggabungkan beberapa lapisan middleware yang masing-masing menangani vektor serangan tertentu.

**Mengapa ini penting**: Keamanan bukanlah fitur tunggal melainkan komposit dari banyak perlindungan kecil. Kehilangan satu lapisan—seperti pembatasan rate atau penguatan header HTTP—dapat membuat seluruh aplikasi rentan. OWASP secara konsisten menempatkan serangan injeksi, autentikasi yang rusak, dan kesalahan konfigurasi keamanan di antara risiko aplikasi web teratas.

```javascript
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

// Penguatan header HTTP dengan Helmet
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
  }
}));

// CORS ketat — hindari origin wildcard di produksi
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 jam
};
app.use(cors(corsOptions));

// Pembatasan rate berlapis
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // batasi setiap IP ke 100 permintaan per jendela
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan, silakan coba lagi nanti.' }
});
app.use(globalLimiter);

// Batasan lebih ketat untuk endpoint auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 percobaan login per 15 menit
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Terlalu banyak percobaan login. Akun dikunci sementara.' }
});
app.use('/api/v1/auth/login', authLimiter);

// Validasi input dengan Zod — validasi di batas
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.validated = parsed;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    next(error);
  }
};
```

**Langkah keamanan tambahan**:
- Setel `trust proxy` saat berjalan di belakang reverse proxy (Nginx, Load Balancer) sehingga pembatasan rate menggunakan IP klien yang sebenarnya.
- Nonaktifkan header `x-powered-by` dengan `app.disable('x-powered-by')` untuk menyembunyikan versi framework.
- Gunakan `express-mongo-sanitize` atau `escape-html` untuk pencegahan injeksi NoSQL.
- Terapkan batas ukuran permintaan dengan `express.json({ limit: '10kb' })` untuk mencegah serangan body-parser exhaustion.

### Pola Integrasi Database

Akses database langsung dari penangan rute adalah anti-pola yang menggabungkan logika bisnis dengan penyimpanan data tertentu. **Pola Repository** mengabstraksi akses data di balik sebuah antarmuka, memungkinkan testabilitas dan fleksibilitas migrasi.

**Mengapa ini penting**: Ketika query database tersebar di controller dan service, mengubah penyimpanan data (misalnya, dari MongoDB ke PostgreSQL) memerlukan penulisan ulang seluruh aplikasi. Lapisan repository mengisolasi dampak ini ke satu titik dalam arsitektur. Connection pooling lebih lanjut mencegah kehabisan sumber daya di bawah beban.

```javascript
// database/pool.js — connection pooling dengan pg
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // ukuran pool maksimum
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Kesalahan pool database tak terduga:', err);
  process.exit(-1);
});

module.exports = pool;

// features/users/users.repository.js — pola repository
const pool = require('../../database/pool');

class UsersRepository {
  async findById(id) {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [data.name, data.email, data.passwordHash, data.role || 'user']
    );
    return result.rows[0];
  }

  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING id, name, email, role, updated_at`,
      values
    );
    return result.rows[0] || null;
  }

  async softDelete(id) {
    const result = await pool.query(
      `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = new UsersRepository();
```

**Panduan connection pooling**:
- Tetapkan ukuran `max` pool berdasarkan batas koneksi simultan database Anda (biasanya `max_connections - 10` untuk koneksi admin).
- Gunakan `pg-pool` atau `mysql2/promise` untuk database relasional; `mongoose` mengelola pool koneksinya sendiri secara internal.
- Pantau utilisasi pool dengan `pool.totalCount`, `pool.idleCount`, dan `pool.waitingCount`.
- Implementasikan pola circuit breaker menggunakan pustaka seperti `cockatiel` atau `opossum` untuk gagal cepat ketika database tidak dapat dijangkau.

### Strategi Autentikasi

Autentikasi di Express membentang spektrum dari auth berbasis cookie sesi sederhana untuk aplikasi server-rendered hingga JWT stateless untuk REST API dan OAuth yang didelegasikan untuk integrasi pihak ketiga. Pilihan tergantung pada arsitektur aplikasi dan persyaratan keamanan.

**Mengapa ini penting**: Autentikasi adalah batas keamanan paling umum dalam aplikasi web. Strategi yang dipilih atau diimplementasikan dengan buruk menyebabkan pembajakan sesi, pencurian token, atau pengambilalihan akun. Setiap strategi memiliki trade-off yang berbeda antara statelessness, kemampuan revokasi, dan kompleksitas.

```javascript
// middleware/auth.js — middleware autentikasi JWT
const jwt = require('jsonwebtoken');
const { AppError } = require('../shared/errors/AppError');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'my-app',
    });
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Token akses telah kedaluwarsa');
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Token akses tidak valid atau rusak');
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'Izin tidak mencukupi');
  }
  next();
};

// Strategi manajemen token
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'my-app' }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: '7d', issuer: 'my-app' }
  );
  return { accessToken, refreshToken };
};
```

**Perbandingan strategi**:

| Strategi | Kasus Penggunaan | Pro | Kontra |
|----------|----------------|-----|--------|
| JWT (access + refresh) | REST API, aplikasi mobile | Stateless, cross-domain, tanpa lookup DB per permintaan | Sulit direvokasi, keamanan penyimpanan token di klien |
| Session (cookie + store) | Aplikasi server-rendered | Revokasi mudah, dikontrol server | Stateful, memerlukan session store (Redis), tantangan CORS |
| OAuth 2.0 / OIDC | Login pihak ketiga, SSO | Autentikasi didelegasikan, tanpa penyimpanan password | Dependensi eksternal, alur kompleks, memerlukan redirect |

### Metodologi Pengujian

Aplikasi Express mendapat manfaat dari strategi pengujian tiga tingkat: **pengujian unit** untuk fungsi individu, **pengujian integrasi** untuk endpoint API, dan **pengujian end-to-end** untuk alur kerja pengguna yang lengkap. Piramida pengujian merekomendasikan banyak pengujian unit, lebih sedikit pengujian integrasi, dan pengujian E2E yang minimal.

**Mengapa ini penting**: Tanpa pendekatan pengujian yang terstruktur, bug regresi berlipat ganda seiring pertumbuhan basis kode. Pola komposisi middleware Express membuat pengujian unit untuk middleware dan handler menjadi mudah ketika dependensi diinjeksi dengan benar, sementara Supertest memungkinkan pengujian integrasi tingkat HTTP yang mulus tanpa men-deploy aplikasi.

```javascript
// Contoh pengujian unit — service layer dengan Jest
// features/users/users.service.test.js
const { UsersService } = require('./users.service');
const { UsersRepository } = require('./users.repository');

// Mock repository
jest.mock('./users.repository');

describe('UsersService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = new UsersRepository();
    service = new UsersService(mockRepository);
  });

  describe('createUser', () => {
    it('harus membuat user dengan password ter-hash', async () => {
      const input = { name: 'John', email: 'john@example.com', password: 'secret123' };
      const expected = {
        id: '1',
        name: 'John',
        email: 'john@example.com',
        role: 'user',
      };

      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(expected);

      const result = await service.createUser(input);
      expect(result).toMatchObject(expected);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John', email: 'john@example.com' })
      );
    });

    it('harus melempar error jika email sudah ada', async () => {
      mockRepository.findByEmail.mockResolvedValue({ id: 'existing' });
      await expect(service.createUser({
        name: 'John', email: 'existing@example.com', password: 'secret123'
      })).rejects.toThrow('Email sudah digunakan');
    });
  });
});

// Contoh pengujian integrasi — endpoint API dengan Supertest
// features/users/users.test.js
const request = require('supertest');
const { app } = require('../../app');

describe('POST /api/v1/users', () => {
  it('harus mengembalikan 201 dengan user yang dibuat', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
    });
    expect(response.body.data).not.toHaveProperty('password');
  });

  it('harus mengembalikan 400 untuk email tidak valid', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({ name: 'John', email: 'bukan-email', password: 'secret' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeDefined();
  });

  it('harus mengembalikan 401 tanpa token auth untuk rute terproteksi', async () => {
    await request(app)
      .get('/api/v1/users')
      .expect(401);
  });
});
```

**Panduan pengujian**:
- Gunakan `beforeEach` untuk mereset state database atau rollback transaksi untuk pengujian yang terisolasi.
- Mock panggilan HTTP eksternal dengan `nock` atau `msw` (Mock Service Worker) untuk menghindari dependensi jaringan.
- Jalankan pengujian integrasi terhadap database pengujian atau SQLite in-memory untuk memparalelkan eksekusi.
- Targetkan cakupan kode 80%+ pada lapisan service dan repository; kriteria penerimaan untuk fitur baru harus mencakup pengujian integrasi yang lulus.

### Logging dan Monitoring

Structured logging mengubah output aplikasi mentah menjadi data yang dapat di-query dan diurai mesin. Ketika dikombinasikan dengan agregasi log terpusat, ini menjadi alat utama untuk debugging masalah produksi, mendeteksi anomali, dan mengaudit perilaku sistem.

**Mengapa ini penting**: `console.log` tidak memadai untuk sistem produksi. Tanpa structured logging, debugging memerlukan pencarian teks log yang tidak terstruktur, mengkorelasikan timestamp secara manual, dan menerka konteks permintaan. Log terstruktur dengan ID korelasi memungkinkan penelusuran permintaan tunggal di beberapa layanan.

```javascript
// shared/logger.js — structured logging dengan Winston
const winston = require('winston');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json() // Format JSON yang dapat diurai mesin
  ),
  defaultMeta: { service: 'express-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

// Transport console dengan output berwarna untuk development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Middleware untuk melampirkan logger dan ID korelasi ke setiap permintaan
const attachLogger = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  res.setHeader('x-correlation-id', correlationId);

  req.log = logger.child({ correlationId, method: req.method, url: req.url });
  next();
};

// Logging permintaan HTTP dengan Morgan yang disalurkan melalui Winston
const morgan = require('morgan');
const httpLogger = morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
  skip: (req) => req.url === '/health', // Lewati noise health check
});

module.exports = { logger, attachLogger, httpLogger };
```

**Praktik terbaik monitoring**:
- Ekspos endpoint `/metrics` (misalnya, dengan `prom-client`) untuk scraping Prometheus. Lacak durasi permintaan HTTP, tingkat error, koneksi aktif, dan utilisasi pool database.
- Siapkan peringatan pada lonjakan tingkat error (>1% respons 5xx selama 5 menit), latensi tinggi (p99 > 1d), dan ketersediaan pool rendah (<10% koneksi idle).
- Gunakan ID korelasi di semua entri log, respons error, dan panggilan HTTP downstream untuk memungkinkan pelacakan terdistribusi.
- Implementasikan endpoint health check (`/health` untuk liveness, `/ready` untuk readiness) yang memvalidasi konektivitas database dan jangkauan layanan eksternal.

### Pola Penanganan Error

Penanganan error terpusat adalah pola arsitektural yang paling berdampak dalam aplikasi Express. Ini mencegah exception yang tidak tertangkap dari merusak proses, menstandarisasi respons error di semua endpoint, dan menggabungkan logging error di satu tempat.

**Mengapa ini penting**: Tanpa penangan error terpusat, setiap penangan rute harus menduplikasi logika pemformatan error. Ini mengarah ke respons error yang tidak konsisten, logging yang terlewat, dan promise rejection yang tidak tertangani yang merusak proses Node.js. Express tidak menangkap promise rejection secara default — setiap handler async harus secara eksplisit meneruskan error.

```javascript
// shared/errors/AppError.js — hierarki error yang diketik
class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Membedakan error yang diharapkan dari bug programmer
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} tidak ditemukan`);
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super(400, 'VALIDATION_ERROR', 'Validasi gagal', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Autentikasi diperlukan') {
    super(401, 'UNAUTHORIZED', message);
  }
}

// Async wrapper — menghilangkan duplikasi try/catch di penangan rute
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Penggunaan di controller
const getById = asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw new NotFoundError('User');
  res.json({ success: true, data: user });
});

// middleware/errorHandler.js — penangan error terpusat
const errorHandler = (err, req, res, _next) => {
  // Log error dengan konteks permintaan
  (req.log || console).error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    correlationId: req.headers['x-correlation-id'],
  });

  // Error operasional: kegagalan yang diketahui dan diharapkan
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Error pemrograman atau tidak diketahui: log stack penuh, kembalikan respons generik
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi error yang tidak terduga',
    },
  });
};

module.exports = { AppError, NotFoundError, ValidationError, UnauthorizedError, asyncHandler, errorHandler };
```

**Aturan penanganan error**:
- Setiap handler rute async HARUS dibungkus dengan `asyncHandler` atau menggunakan penangkapan error async tingkat framework (Express 5 memiliki dukungan bawaan). Promise rejection yang tidak tertangani akan merusak proses.
- Daftarkan `process.on('unhandledRejection', ...)` dan `process.on('uncaughtException', ...)` di titik masuk untuk mencatat dan mematikan secara gracefull pada error tak terduga.
- Bedakan antara error operasional (kegagalan yang diharapkan seperti validasi, tidak ditemukan) dan error programmer (bug, akses variabel tidak terdefinisi). Hanya yang pertama yang harus mengembalikan respons error yang ramah pengguna.
- Gunakan flag `isOperational` untuk memutuskan apakah akan memulai ulang proses (error programmer menunjukkan state yang tidak konsisten).

### Versioning API

Versioning API memastikan kompatibilitas mundur ketika mengembangkan antarmuka REST. Dua strategi dominan adalah **versioning berbasis URL** (`/api/v1/users`) dan **versioning berbasis header** (`Accept: application/vnd.api+json;version=1`). Versioning berbasis URL lebih sederhana untuk klien tetapi menciptakan duplikasi kode; versioning berbasis header lebih bersih tetapi memerlukan kecanggihan klien yang lebih tinggi.

**Mengapa ini penting**: Tanpa versioning eksplisit, perubahan yang merusak secara diam-diam merusak klien yang ada. Pengguna aplikasi mobile yang tidak dapat memperbarui segera akan mengalami error, dan integrasi pihak ketiga mungkin berhenti bekerja tanpa peringatan.

```javascript
// app.js — versioning berbasis URL dengan prefiks Express Router
const v1Router = require('./routes/v1');
const v2Router = require('./routes/v2');

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// routes/v1/index.js
const router = require('express').Router();
router.use('/users', require('../../features/users/users.routes.v1'));
router.use('/orders', require('../../features/orders/orders.routes.v1'));
module.exports = router;

// routes/v2/index.js
const router = require('express').Router();
router.use('/users', require('../../features/users/users.routes.v2'));
module.exports = router;
```

**Praktik terbaik versioning**:
- Pertahankan versi lama untuk jendela depresiasi yang didokumentasikan (misalnya, 6 bulan) dengan header sunset: `res.set('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT')`.
- Gunakan `res.set('Deprecation', 'true')` dan header `Link` yang menunjuk ke versi baru untuk discoverability.
- Utamakan perubahan aditif daripada perubahan yang merusak: tambahkan bidang alih-alih mengganti namanya, dan gunakan parameter query untuk perubahan perilaku opsional.
- Versioning secara internal (pola adapter) ketika API eksternal dan implementasi internal menyimpang. Adapter menerjemahkan antara kontrak publik dan model domain internal.

### Dokumentasi dengan Swagger/OpenAPI

Dokumentasi API harus dihasilkan dari kode, bukan dipelihara secara terpisah. Swagger (OpenAPI 3.0) yang diintegrasikan melalui `swagger-jsdoc` dan `swagger-ui-express` memastikan dokumentasi tetap sinkron dengan implementasi yang sebenarnya.

**Mengapa ini penting**: Dokumentasi yang dipelihara secara manual pasti akan menyimpang dari implementasi. Dokumentasi yang usang lebih buruk daripada tidak ada dokumentasi karena secara aktif menyesatkan konsumen. Dokumentasi code-first menghilangkan penyimpangan ini dengan memperlakukan spesifikasi OpenAPI sebagai artefak kompilasi.

```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express API',
      version: '1.0.0',
      description: 'Dokumentasi API untuk aplikasi Express.js',
    },
    servers: [
      { url: process.env.API_BASE_URL || 'http://localhost:3000' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./features/**/*.routes.js', './features/**/*.validation.js'],
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Dokumentasi Express API',
}));

// Di file rute, gunakan anotasi JSDoc untuk generasi OpenAPI
/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     summary: Mendaftar semua pengguna
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Daftar pengguna yang dipaginasi
 *       401:
 *         description: Tidak terotorisasi
 */
router.get('/', authMiddleware, controller.list);
```

### Optimasi Performa

Aplikasi Express menghadapi bottleneck performa di beberapa dimensi: I/O (query database, API eksternal), CPU (serialisasi JSON, operasi kripto), dan jaringan (ukuran payload, overhead koneksi). Setiap dimensi memerlukan strategi optimasi yang berbeda.

**Mengapa ini penting**: Masalah performa secara langsung berdampak pada pengalaman pengguna dan biaya operasional. Satu query database yang lambat dapat meningkatkan latensi p99 dengan urutan besarnya. Tanpa optimasi sistematis, penambahan fitur menurunkan performa secara linear, yang pada akhirnya memerlukan upgrade infrastruktur yang mahal.

```javascript
const compression = require('compression');
const mcache = require('memory-cache');
const cluster = require('cluster');
const os = require('os');

// Kompresi respons — mengurangi bandwidth hingga 60-80%
app.use(compression({
  level: 6, // Tingkat kompresi seimbang (1=cepat, 9=maks)
  threshold: 1024, // Hanya kompres respons yang lebih besar dari 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// Caching in-memory untuk operasi mahal
const cacheMiddleware = (duration) => (req, res, next) => {
  const key = `__cache__${req.originalUrl || req.url}`;
  const cachedBody = mcache.get(key);
  if (cachedBody) {
    return res.json(cachedBody);
  }
  res.sendResponse = res.json;
  res.json = (body) => {
    mcache.put(key, body, duration * 1000);
    res.sendResponse(body);
  };
  next();
};

app.get('/api/v1/products/popular', cacheMiddleware(300), controller.getPopular);

// Mode cluster — manfaatkan semua core CPU
if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`Proses master ${process.pid} membuat ${numCPUs} worker`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} mati. Memulai ulang...`);
    cluster.fork(); // Restart otomatis worker yang gagal
  });
} else {
  require('./server'); // Worker menjalankan server Express
}
```

**Panduan performa**:
- Aktifkan HTTP/2 melalui reverse proxy (Nginx, Caddy) untuk multiplexing dan kompresi header.
- Gunakan connection pooling untuk semua klien database dan cache. Membuka koneksi baru per permintaan adalah anti-pola performa terbesar.
- Implementasikan caching respons di beberapa tingkat: in-memory (lokal), terdistribusi (Redis), dan CDN edge caching untuk endpoint publik.
- Profil dengan `clinic.js` atau `0x` flamegraph sebelum mengoptimasi. Asumsi umum tentang bottleneck sering kali salah.

### Graceful Shutdown

Graceful shutdown memungkinkan server Express berhenti menerima koneksi baru, menyelesaikan permintaan yang sedang berlangsung, menutup koneksi database, dan flush log sebelum proses dihentikan. Ini mencegah kehilangan data dan memastikan deployment tanpa downtime di lingkungan container.

**Mengapa ini penting**: Mematikan proses Node.js secara paksa di tengah permintaan dapat meninggalkan transaksi database yang terbuka, merusak cache in-memory, dan menjatuhkan pekerjaan yang diantrekan. Di Kubernetes dan orchestrator lainnya, pod dihentikan dengan mengirim SIGTERM, kemudian menunggu grace period yang dapat dikonfigurasi sebelum mengirim SIGKILL. Aplikasi yang tidak menangani SIGTERM mengalami putusnya koneksi dan inkonsistensi data.

```javascript
// server.js — integrasi graceful shutdown
const http = require('http');
const app = require('./app');
const { logger } = require('./shared/logger');
const pool = require('./database/pool');
const redisClient = require('./database/redis');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Lacak koneksi aktif untuk shutdown paksa
const connections = new Set();
server.on('connection', (socket) => {
  connections.add(socket);
  socket.on('close', () => connections.delete(socket));
});

async function gracefulShutdown(signal) {
  logger.info(`Menerima ${signal}. Memulai graceful shutdown...`);

  // Berhenti menerima koneksi baru
  server.close(async () => {
    logger.info('Server HTTP ditutup. Tidak ada koneksi baru yang diterima.');

    try {
      // Tutup koneksi database
      await pool.end();
      logger.info('Pool database ditutup.');

      // Tutup koneksi cache
      await redisClient.quit();
      logger.info('Koneksi Redis ditutup.');

      logger.info('Graceful shutdown selesai.');
      process.exit(0);
    } catch (error) {
      logger.error('Error selama shutdown:', error);
      process.exit(1);
    }
  });

  // Shutdown paksa setelah timeout
  setTimeout(() => {
    logger.warn('Shutdown paksa: menutup koneksi yang tersisa');
    for (const socket of connections) {
      socket.destroy();
    }
    process.exit(1);
  }, 30000); // 30 detik sesuai dengan typical Kubernetes terminationGracePeriodSeconds

  // Picu server close setelah menguras koneksi keep-alive
  server.unref();
}

// Daftarkan penangan sinyal
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, () => {
  logger.info(`Server Express mendengarkan pada port ${PORT} (PID: ${process.pid})`);
});
```

### Konfigurasi Lingkungan

Konfigurasi harus dieksternalisasi dari kode dan diinjeksi melalui variabel lingkungan. Metodologi Twelve-Factor App mengkodifikasi prinsip ini: pemisahan ketat antara konfigurasi dan kode memungkinkan basis kode yang sama untuk di-deploy di lingkungan development, staging, dan produksi tanpa modifikasi.

**Mengapa ini penting**: Nilai konfigurasi yang di-hardcode — terutama rahasia seperti password database dan kunci API — adalah liability keamanan dan beban operasional. Kredensial yang di-commit di version control adalah salah satu vektor pelanggaran data yang paling umum. Konfigurasi yang dieksternalisasi juga menyederhanakan pipeline CI/CD di mana lingkungan yang berbeda memerlukan pengaturan yang berbeda.

```javascript
// config/env.js — konfigurasi lingkungan terpusat dengan validasi
require('dotenv').config(); // Muat file .env hanya di development
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  DATABASE_URL: z.string().url(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // API
  API_BASE_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().positive().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Konfigurasi lingkungan tidak valid:');
  parsed.error.errors.forEach((err) => {
    console.error(`  - ${err.path.join('.')}: ${err.message}`);
  });
  process.exit(1);
}

// Bekukan objek konfigurasi untuk mencegah modifikasi runtime
const config = Object.freeze({
  env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  db: {
    url: parsed.data.DATABASE_URL,
    poolMax: parsed.data.DB_POOL_MAX,
  },
  redis: {
    url: parsed.data.REDIS_URL,
  },
  jwt: {
    secret: parsed.data.JWT_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
    refreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  },
  api: {
    baseUrl: parsed.data.API_BASE_URL,
    corsOrigins: parsed.data.CORS_ORIGINS?.split(','),
    rateLimit: {
      windowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
      max: parsed.data.RATE_LIMIT_MAX,
    },
  },
  log: {
    level: parsed.data.LOG_LEVEL,
  },
});

module.exports = config;
```

**Aturan konfigurasi**:
- Validasi semua variabel lingkungan saat startup dengan skema Zod atau Joi. Gagal cepat dengan pesan error yang jelas yang mencantumkan variabel yang hilang atau salah format.
- Jangan pernah melakukan hardcode rahasia default. Gunakan file `.env.example` yang di-commit ke version control sebagai dokumentasi, simpan file `.env` asli di `.gitignore`.
- Gunakan `dotenv` hanya di development. Lingkungan produksi harus menginjeksi variabel lingkungan secara native (Kubernetes Secrets, Docker Compose, variabel pipeline CI/CD).
- Bekukan objek konfigurasi dengan `Object.freeze()` untuk mencegah mutasi yang tidak disengaja saat runtime.

## Langkah Implementasi

### Langkah 1: Mempersiapkan Fondasi Proyek

Inisialisasi proyek dengan struktur direktori berbasis fitur, instal dependensi inti, dan konfigurasikan pemuat lingkungan terpusat dengan validasi Zod. Buat modul konfigurasi `src/config/env.js` yang memvalidasi semua variabel lingkungan saat startup dan `src/app.js` sebagai komposer aplikasi Express yang menyusun rantai middleware dalam urutan yang benar.

Mulai dengan `npm init` dan instal paket inti: `express`, `helmet`, `cors`, `compression`, `morgan`, `winston`, `zod`, `jsonwebtoken`, `dotenv`, dan driver database pilihan (`pg` untuk PostgreSQL, `mysql2` untuk MySQL, atau `mongoose` untuk MongoDB). Instal devDependencies: `jest`, `supertest`, `nodemon`, `nock` atau `msw`.

### Langkah 2: Mengimplementasikan Arsitektur Middleware

Bangun rantai middleware berlapis di `src/app.js`. Mulai dengan middleware keamanan (helmet, CORS), kemudian parsing permintaan dan kompresi, diikuti logging, pembatasan rate, dan akhirnya pemasangan rute. Implementasikan penangan error terpusat sebagai middleware terakhir dalam rantai. Buat utilitas pembungkus `asyncHandler` dan hierarki `AppError` yang diketik di `src/shared/errors/`.

### Langkah 3: Membangun Modul Fitur

Buat setidaknya satu modul fitur (misalnya, `users`) mengikuti pola hibrida: `users.routes.js` mendefinisikan definisi rute dengan komposisi middleware, `users.controller.js` berisi penanganan permintaan dan pemformatan respons, `users.service.js` mengimplementasikan logika bisnis, `users.repository.js` mengabstraksi akses data, dan `users.validation.js` mendefinisikan skema Zod untuk validasi input. Hubungkan rute fitur ke `app.js` di bawah prefiks versi API.

### Langkah 4: Mengintegrasikan Database dan Lapisan Repository

Siapkan connection pooling di `src/database/pool.js` dan implementasikan pola repository untuk setiap fitur. Pastikan repository mengembalikan objek biasa, bukan baris khusus database. Tulis lapisan service untuk mengoordinasikan panggilan repository, menerapkan aturan bisnis, dan melempar instance `AppError` yang diketik pada kegagalan validasi.

### Langkah 5: Menambahkan Autentikasi dan Otorisasi

Implementasikan autentikasi berbasis JWT dengan alur token akses dan refresh. Buat middleware `authMiddleware` dan `requireRole` di `src/middleware/auth.js`. Tambahkan endpoint login dan refresh token ke modul fitur auth. Konfigurasikan pembatasan rate yang lebih ketat pada endpoint login.

### Langkah 6: Mengimplementasikan Logging, Monitoring, dan Penanganan Error

Konfigurasikan Winston untuk structured logging JSON dengan ID korelasi per permintaan. Integrasikan Morgan untuk log akses HTTP yang disalurkan melalui Winston. Implementasikan middleware `errorHandler` terpusat. Ekspos endpoint health check (`/health`, `/ready`) dan endpoint `/metrics` dengan `prom-client` untuk scraping Prometheus. Siapkan penangan graceful shutdown yang menguras koneksi dan menutup pool database.

### Langkah 7: Menulis Pengujian

Tulis pengujian unit untuk lapisan service (mocking repository), pengujian integrasi untuk endpoint API menggunakan Supertest, dan pengujian validasi untuk skema Zod. Konfigurasikan Jest dengan `testEnvironment: 'node'` dan `setupFilesAfterSetup` untuk inisialisasi database pengujian. Tambahkan skrip `npm test` dan `npm run test:coverage`.

### Langkah 8: Mendokumentasikan dan Melakukan Versioning API

Integrasikan `swagger-jsdoc` dengan `swagger-ui-express` untuk dokumentasi OpenAPI yang dibuat otomatis. Tambahkan anotasi JSDoc ke file rute. Konfigurasikan versioning berbasis URL (`/api/v1/...`, `/api/v2/...`) dengan header depresiasi. Hasilkan spesifikasi OpenAPI sebagai bagian dari langkah build.

### Langkah 9: Penyetelan Performa dan Kesiapan Produksi

Aktifkan kompresi, implementasikan middleware caching respons untuk endpoint yang banyak dibaca, dan konfigurasikan mode cluster untuk utilisasi multi-core. Daftarkan penangan graceful shutdown. Validasi konfigurasi produksi dengan `NODE_ENV=production` dan pastikan semua variabel lingkungan didokumentasikan di `.env.example`. Deploy di belakang reverse proxy (Nginx, Caddy) untuk terminasi SSL, HTTP/2, dan penyajian file statis.
