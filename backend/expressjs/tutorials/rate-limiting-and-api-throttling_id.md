---
title: "Rate Limiting dan API Throttling di Express JS"
description: "Tutorial ini membahas konsep rate limiting dan API throttling di Express.js. Anda akan belajar cara melindungi API dari penyalahgunaan, mengelola lonjakan trafi"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Rate Limiting dan API Throttling di Express JS

## Ringkasan

Tutorial ini membahas konsep *rate limiting* dan API *throttling* di Express.js. Anda akan belajar cara melindungi API dari penyalahgunaan, mengelola lonjakan trafik, dan memastikan keadilan penggunaan antar klien dengan menerapkan strategi pembatasan yang kuat menggunakan *tools* seperti `express-rate-limit` dan Redis.

---

## Target Audiens

* Backend Developer yang membangun API publik atau bertrafik tinggi.
* Developer Express.js yang ingin meningkatkan keamanan dan ketahanan aplikasi mereka.
* Developer Node.js tingkat menengah hingga mahir yang mencari pola arsitektur skalabel.

---

## Prasyarat

* Pemahaman dasar tentang *routing* dan *middleware* di Express.js.
* Familiar dengan kode status HTTP (khususnya `429 Too Many Requests`).
* Pengetahuan dasar tentang konsep RESTful API.
* (Opsional namun disarankan) Pemahaman tentang Redis dan mekanisme *caching*.

---

## Tujuan Pembelajaran

Setelah membaca materi ini, Anda akan memahami:

* Perbedaan antara *rate limiting* dan *throttling*.
* Mengapa *rate limiting* sangat penting untuk keamanan dan skalabilitas API.
* Cara menerapkan *rate limiting* dasar berbasis memori menggunakan `express-rate-limit`.
* Cara menerapkan *rate limiting* terdistribusi menggunakan Redis untuk deployment aplikasi berskala besar dengan banyak instans.
* Praktik terbaik (best practices) untuk menangani pengecualian limit dan mendefinisikan batas yang dinamis.

---

## Konteks dan Motivasi

Ketika Anda men-deploy API ke produksi, API tersebut menjadi rentan terhadap berbagai jenis penyalahgunaan, seperti serangan *Distributed Denial of Service* (DDoS), tebakan *password* secara *brute-force*, dan *scraping* agresif oleh *bot*. Bahkan klien yang sah sekalipun terkadang bisa tanpa sengaja membebani server Anda dengan mengirim terlalu banyak *request* dalam waktu singkat.

**Rate limiting** adalah praktik membatasi jumlah *request* yang bisa dilakukan oleh seorang klien (biasanya diidentifikasi dengan alamat IP, API key, atau token *user*) ke API Anda dalam rentang waktu tertentu. **Throttling** adalah konsep yang sangat terkait dan seringkali melibatkan proses melambatkan (*slowing down*) respons ketika batas tertentu mulai tercapai, alih-alih memblokirnya sepenuhnya.

Penerapan pola-pola ini memastikan:

1. **Keamanan (Security):** Mengurangi risiko serangan *brute-force* dan DDoS.
2. **Ketersediaan (Availability):** Mencegah satu klien menghabiskan seluruh sumber daya server yang akhirnya merugikan klien lain (masalah "noisy neighbor").
3. **Monetisasi:** Memungkinkan Anda menawarkan tingkat akses API berjenjang (contoh: *Tier Gratis*: 100 req/hari, *Tier Pro*: 10.000 req/hari).

---

## Konten Inti

### 1. Bagaimana Rate Limiting Bekerja

Pada intinya, *rate limiting* melacak permintaan dari waktu ke waktu menggunakan sebuah "jendela" atau *window* (contoh: 1 menit). Setiap kali ada *request* masuk, server mengecek sebuah *counter* yang diasosiasikan dengan klien tersebut.

* Jika *counter* di bawah batas maksimum, *request* diproses, dan *counter* akan bertambah.
* Jika *counter* melewati batas maksimum, server akan menolak *request* secara instan, biasanya dengan mengembalikan kode status HTTP `429 Too Many Requests`.

### 2. In-Memory vs. Distributed Rate Limiting

**In-Memory (Single Node):**
Status limit disimpan dalam memori proses Node.js. Cara ini sangat cepat dan mudah di-setup, tapi akan bermasalah di lingkungan dengan banyak server (*load-balanced*) karena setiap server menjaga penghitungnya (*counters*) sendiri secara terisolasi.

**Distributed (Multi-Node):**
Status limit disimpan secara terpusat pada penyimpan data berkinerja tinggi seperti Redis. Semua instans aplikasi Express Anda mengecek ke Redis yang sama, memastikan batas limit dihitung secara global secara akurat, tak peduli server mana yang melayani *request* tersebut.

### 3. Algoritma Umum

Meskipun *library* menyembunyikan kerumitannya, penting untuk mengetahui pola dasarnya:

* **Fixed Window:** Menghitung *request* sejak awal menit sampai akhir menit. (Rentan terhadap lonjakan tepat pada batas pergantian jendela waktu).
* **Sliding Window:** Melacak *request* secara halus di jendela waktu yang terus bergerak. Lebih mulus dan akurat.
* **Token Bucket:** "Token" ditambahkan ke dalam wadah (*bucket*) pada kecepatan konstan. Setiap *request* akan memakan satu token. Sangat cocok menangani lonjakan trafik mendadak (*bursts*).

---

## Contoh Kode

### 1. Basic In-Memory Rate Limiting

Kita bisa menggunakan *package* populer `express-rate-limit` untuk skenario sederhana.

**Instalasi:**

```bash
npm install express-rate-limit
```

**Implementasi di `app.js`:**

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();

// Membuat aturan rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Batasi setiap IP maksimal 100 request per `window` (di sini, per 15 menit)
  standardHeaders: true, // Kirim informasi rate limit di header `RateLimit-*`
  legacyHeaders: false, // Nonaktifkan header `X-RateLimit-*`
  message: {
    status: 429,
    error: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi setelah 15 menit.'
  }
});

// Terapkan middleware rate limiting hanya pada pemanggilan API
app.use('/api/', apiLimiter);

app.get('/api/data', (req, res) => {
  res.json({ message: 'Sukses! Anda belum melewati batas limit.' });
});

app.listen(3000, () => console.log('Server berjalan pada port 3000'));
```

### 2. Distributed Rate Limiting dengan Redis

Untuk lingkungan *production* yang menjalankan beberapa instans Express, gunakan penyimpanan (store) Redis.

**Instalasi:**

```bash
npm install express-rate-limit rate-limit-redis redis
```

**Implementasi:**

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');

const app = express();

// Buat dan hubungkan client Redis
const redisClient = createClient({
  url: 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

const redisLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 60, // Batasi setiap IP maksimal 60 request per menit
  // Gunakan Redis untuk menyimpan data rate limit
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  message: 'Terlalu banyak permintaan, silakan coba lagi nanti.'
});

app.use('/api/', redisLimiter);

app.get('/api/status', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(3000, () => console.log('Server berjalan'));
```

### 3. Dynamic Rate Limiting berdasarkan User Tier

Alih-alih membatasi berdasarkan alamat IP, Anda bisa membatasi berdasarkan ID user yang sudah terotentikasi dan memberikan batas berbeda sesuai dengan tingkat (*tier*) berlangganan mereka.

```javascript
const userTierLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  // Tentukan jumlah request maksimum secara dinamis
  max: (req, res) => {
    if (req.user && req.user.tier === 'premium') return 1000;
    if (req.user && req.user.tier === 'basic') return 100;
    return 10; // Default untuk yang belum login atau tier gratis
  },
  // Gunakan ID User sebagai 'key' alih-alih alamat IP
  keyGenerator: (req, res) => {
    if (!req.user) return req.ip; // Fallback ke IP jika belum login
    return req.user.id;
  },
  message: 'Batas limit terlampaui berdasarkan tier langganan Anda saat ini.'
});
```

---

## Insight Penting

* **Reverse Proxies:** Jika aplikasi Express Anda berada di balik *load balancer* atau *reverse proxy* (seperti Nginx, AWS ALB, atau Cloudflare), `req.ip` mungkin salah membaca IP menjadi IP milik *proxy* tersebut. Anda harus mengaktifkan `app.set('trust proxy', 1 /* jumlah proxy */)` di Express agar bisa mengidentifikasi IP klien asli secara akurat.
* **Header Rate Limit:** Merupakan praktik terbaik (*best practice*) untuk mengirim header `RateLimit-Limit`, `RateLimit-Remaining`, dan `RateLimit-Reset` dalam respons. Ini memungkinkan klien API untuk memperlambat *request* mereka secara halus sebelum menabrak *error* `429`.
* **Proteksi Granular:** Jangan menerapkan *rate limit* secara merata (pukul rata) ke seluruh aplikasi. Terapkan batas yang lebih ketat pada *endpoint* sensitif atau memakan banyak resource (seperti `/login`, `/reset-password`, `/search`) dan batas yang lebih longgar untuk aset statis atau request GET yang di-*cache*.
* **Pengenal Klien (Client Identifiers):** Walaupun pembatasan berbasis IP adalah standar, hal itu bisa secara tidak sengaja memblokir seluruh kantor atau konfigurasi NAT yang berbagi satu IP publik yang sama. Bila memungkinkan, lakukan pembatasan berdasarkan *API Key* atau token JWT yang terverifikasi.

---

## Kesimpulan

* *Rate limiting* membatasi berapa banyak *request* yang bisa dilakukan klien, melindungi API Anda dari serangan DDoS, upaya *brute force*, dan pengurasan sumber daya (*resource exhaustion*).
* `express-rate-limit` adalah *middleware* sederhana dan efektif untuk menerapkan pembatasan.
* *In-memory rate limiting* tidak cukup untuk aplikasi yang diskalakan secara horizontal (*horizontally scaled*); penyimpanan terdistribusi seperti Redis dibutuhkan untuk mensinkronkan status batas antar banyak server.
* Konfigurasi yang tepat membutuhkan pengaturan `trust proxy` yang benar, pengiriman header HTTP yang informatif, dan penerapan batas dinamis berdasarkan peran pengguna serta sensitivitas *endpoint*.

---

## Langkah Berikutnya

* **Express Security:** Pelajari *middleware* keamanan lainnya seperti `helmet` dan konfigurasi CORS.
* **Integrasi Redis:** Pelajari lebih lanjut tentang penggunaan Redis di Express untuk *caching* respons, bukan hanya *rate limiting*.
* **Monitoring:** Terapkan proses *logging* dan monitoring untuk melacak kapan batas limit terlewati, yang mana dapat membantu mengidentifikasi pihak jahat (*malicious actors*) atau klien yang membutuhkan *tier* API lebih tinggi.

---
