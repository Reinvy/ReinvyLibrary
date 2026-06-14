---
title: "Implementasi Webhooks di Express JS"
description: "Materi ini membahas konsep dan implementasi praktis Webhooks di Express.js. Anda akan mempelajari cara menerima event asinkron dari layanan eksternal (seperti p"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Implementasi Webhooks di Express JS

## Ringkasan Singkat

Materi ini membahas konsep dan implementasi praktis Webhooks di Express.js. Anda akan mempelajari cara menerima event asinkron dari layanan eksternal (seperti payment gateway atau GitHub) secara aman, memverifikasi keasliannya menggunakan *signature*, dan memprosesnya secara efisien tanpa memblokir antrean utama (*main event loop*).

---

## Untuk Siapa Materi Ini

* **Target Audience:** Developer backend tingkat menengah yang perlu mengintegrasikan aplikasi Express mereka dengan API dan layanan eksternal.
* **Level:** Menengah (Intermediate).

---

## Prasyarat

* Pemahaman kuat tentang pembuatan REST API dengan Express.js.
* Familiar dengan HTTP POST *requests* dan *payload* JSON.
* Pengetahuan tentang konsep keamanan dasar seperti *hashing* dan HMAC (Hash-based Message Authentication Code).
* Pernah mempelajari materi [Basic Routing and Middleware in Express](Basic%20Routing%20and%20Middleware%20in%20Express_ID.md).

---

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

* Memahami apa itu webhook dan mengapa metode ini lebih baik daripada *polling* untuk pembaruan *real-time*.
* Membuat rute khusus di Express untuk menerima dan membaca *payload* webhook.
* Mengimplementasikan keamanan yang kuat dengan memverifikasi *signature* webhook untuk mencegah serangan pemalsuan.
* Menangani pemrosesan webhook secara asinkron untuk memastikan waktu respons yang cepat ke penyedia layanan.
* Menerapkan *best practices* untuk *logging* dan penanganan error pada *endpoint* webhook.

---

## Konteks dan Motivasi

Dalam pengembangan web modern, aplikasi Anda jarang bekerja sendirian. Anda sering kali perlu tahu kapan suatu kejadian (*event*) terjadi di sistem eksternal: pembayaran berhasil di Stripe, *pull request* di-merge di GitHub, atau pesan diterima di Twilio.

Anda bisa saja terus-menerus bertanya ke layanan eksternal, "Apakah ada kejadian baru?" (teknik yang disebut *polling*), tetapi cara ini membuang-buang sumber daya server dan lambat. **Webhooks** menyelesaikan masalah ini dengan membalik arah alirannya: layanan eksternal lah yang mengirimkan HTTP POST *request* *ke server Anda* tepat saat kejadian itu terjadi.

Memahami cara mengimplementasikan webhook dengan aman adalah keterampilan yang sangat penting. Jika dilakukan dengan salah, peretas dapat mengirimkan webhook palsu ke server Anda, mengelabuinya sehingga menandai pesanan yang belum dibayar menjadi lunas.

---

## Materi Inti

### 1. Apa itu Webhook?

Secara sederhana, webhook adalah HTTP *callback* yang ditentukan oleh pengguna. Ini adalah cara bagi sebuah aplikasi untuk memberikan informasi *real-time* kepada aplikasi lain. Saat event tertentu terjadi di sistem sumber, sistem tersebut akan melakukan HTTP POST *request* ke URL yang telah Anda berikan, mengirimkan data tentang kejadian tersebut (biasanya dalam format JSON).

### 2. Alur Kerja Webhook

1. **Pendaftaran:** Anda memberi tahu layanan eksternal (misal: Stripe) URL dari *endpoint* webhook Anda (misal: `https://api.domainanda.com/webhooks/stripe`).
2. **Event Terjadi:** Seorang pengguna melakukan pembayaran.
3. **Pengiriman:** Stripe mengirimkan permintaan POST berisi detail pembayaran ke URL Anda.
4. **Verifikasi:** Aplikasi Express Anda memverifikasi bahwa permintaan tersebut benar-benar berasal dari Stripe.
5. **Konfirmasi (Acknowledgment):** Aplikasi Anda langsung merespons dengan `200 OK` untuk memberi tahu Stripe bahwa pesan telah diterima.
6. **Pemrosesan:** Aplikasi Anda memperbarui database (misalnya, menandai pesanan sebagai lunas).

### 3. Membuat Endpoint

Penerima webhook dasar hanyalah sebuah rute POST di Express.

```javascript
const express = require('express');
const app = express();

// Parsing JSON body (seperti yang dikirim oleh client API)
app.use(express.json());

app.post('/webhook', (req, res) => {
  const event = req.body;

  // Log event yang diterima
  console.log(`Menerima event: ${event.type}`);

  // SEGERA konfirmasi penerimaan!
  res.status(200).send('Webhook diterima');

  // Proses event secara asinkron (jangan ditunggu/await sebelum merespons)
  processWebhookEvent(event).catch(err => {
    console.error('Error saat memproses webhook:', err);
  });
});
```

### 4. Mengamankan Webhooks dengan Signatures (Sangat Penting)

Siapa pun bisa mengirim permintaan POST ke URL `/webhook` Anda. Untuk membuktikan bahwa permintaan itu sah, penyedia layanan menyertakan tanda tangan kriptografi (*cryptographic signature*) di *header* HTTP (contoh: `x-hub-signature` untuk GitHub, `Stripe-Signature` untuk Stripe).

Mereka membuat *signature* ini dengan melakukan *hashing* pada *payload* request menggunakan **kunci rahasia (secret key)** yang hanya diketahui oleh mereka dan Anda. Anda harus menghitung ulang *hash* tersebut di server Anda dan membandingkannya.

**Penting:** Untuk memverifikasi *signature*, Anda membutuhkan *body* request mentah (*raw unparsed body*) persis seperti aslinya, sebelum `express.json()` mengubahnya.

---

## Contoh / Ilustrasi

Mari kita implementasikan *endpoint* webhook aman yang memverifikasi *signature* HMAC SHA-256, mensimulasikan integrasi webhook GitHub.

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

// Rahasia yang dibagikan antara Anda dan penyedia webhook
const WEBHOOK_SECRET = 'kunci_rahasia_super_saya';

// 1. Kita butuh raw body untuk memverifikasi signature.
// Kita gunakan express.raw({ type: 'application/json' }) alih-alih express.json() khusus untuk rute ini.
app.post('/api/webhooks/github', express.raw({ type: 'application/json' }), (req, res) => {

  // 2. Ambil signature yang diberikan oleh pengirim dari header
  const signatureHeader = req.headers['x-hub-signature-256'];

  if (!signatureHeader) {
    return res.status(401).send('Signature tidak ditemukan');
  }

  // 3. Hitung ulang signature menggunakan secret kita dan RAW request body
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  // req.body berbentuk Buffer di sini karena menggunakan express.raw()
  const digest = 'sha256=' + hmac.update(req.body).digest('hex');

  // 4. Bandingkan signature secara aman untuk mencegah timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader))) {
    console.error('[KEAMANAN] Signature webhook tidak cocok!');
    return res.status(401).send('Signature tidak valid');
  }

  // 5. Jika signature cocok, parse JSON dengan aman
  let eventData;
  try {
    eventData = JSON.parse(req.body.toString());
  } catch (err) {
    return res.status(400).send('JSON tidak valid');
  }

  // 6. Langsung konfirmasi penerimaan
  res.status(200).send('Sukses');

  // 7. Proses logika bisnis secara asinkron
  console.log(`Memproses event: ${eventData.action} pada ${eventData.repository.name}`);
});

app.listen(3000, () => console.log('Server Webhook berjalan di port 3000'));
```

---

## Insight Penting

* **Merespons Cepat (Status 200):** Penyedia webhook mengharapkan respons yang cepat (biasanya dalam 3-5 detik). Jika Anda melakukan query database yang berat *sebelum* mengirimkan `res.status(200)`, penyedia mungkin mengira permintaan gagal (*timeout*), dan mencoba mengirimkannya lagi (*retries*), yang menyebabkan pemrosesan ganda. Selalu konfirmasi dahulu, baru proses kemudian.
* **Idempotensi adalah Kunci:** Karena masalah jaringan, penyedia layanan mungkin mengirimkan webhook yang sama persis dua kali. Kode Anda harus bersifat *idempotent*. Jika Anda menerima event "pembayaran berhasil" dua kali, Anda tidak boleh menambahkan saldo ke akun pengguna dua kali. Selalu periksa apakah ID event sudah pernah diproses di database Anda.
* **Gunakan `express.raw()` dengan hati-hati:** Jika Anda mengaplikasikan `express.raw()` secara global menggunakan `app.use()`, hal itu akan merusak *parsing* JSON biasa untuk rute API Anda yang lain. Aplikasikan hanya pada rute webhook spesifik, atau gunakan opsi `verify` di dalam `express.json()` untuk menyimpan salinan dari *raw body*.
* **Testing Lokal:** Anda tidak bisa menerima webhook langsung di `localhost` karena penyedia butuh URL publik. Gunakan *tools* seperti **Ngrok** atau **Localtunnel** untuk mengekspos server Express lokal Anda ke internet selama masa pengembangan (*development*).

---

## Ringkasan Akhir

* Webhooks memungkinkan layanan eksternal mendorong notifikasi event *real-time* ke server Express Anda.
* Selalu respons dengan kode status HTTP 2xx secepat mungkin untuk mencegah *timeout* dan pengulangan pengiriman (*retries*) yang tidak perlu.
* Jangan pernah langsung mempercayai webhook yang masuk; selalu verifikasi *signature* kriptografinya menggunakan *secret key* yang dibagikan dan *raw request body*.
* Rancang *handler* webhook Anda agar bersifat *idempotent* untuk menangani pengiriman ganda dengan aman.

---

## Langkah Belajar Berikutnya

* [Rate Limiting and API Throttling in Express JS](Rate%20Limiting%20and%20API%20Throttling%20in%20Express%20JS_ID.md) (Untuk melindungi *endpoint* webhook Anda dari banjir *request*).
* [Data Validation and Error Handling in Express](Data%20Validation%20and%20Error%20Handling%20in%20Express_ID.md) (Untuk menangani *payload* webhook yang formatnya salah dengan kuat).

---

## Metadata

* **Level:** Menengah (Intermediate)
* **Topik utama:** Express.js, Backend Development
* **Topik terkait:** Webhooks, API Integration, Security, Asynchronous Processing
* **Kata kunci:** express webhook, stripe webhook, github webhook, verifikasi signature hmac, express raw body, idempotency
* **Estimasi waktu baca:** 10 - 15 menit
