---
title: "Validasi Data dengan Zod di Express JS"
description: "Materi ini membahas cara efektif memvalidasi data client yang masuk di aplikasi Express.js menggunakan Zod, sebuah library deklarasi dan validasi skema modern y"
category: "backend"
technology: "zod"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Validasi Data dengan Zod di Express JS

## Ringkasan Singkat

Materi ini membahas cara efektif memvalidasi data *client* yang masuk di aplikasi Express.js menggunakan Zod, sebuah *library* deklarasi dan validasi skema modern yang mengutamakan TypeScript (*TypeScript-first*). Anda akan belajar membuat *middleware* validasi tangguh yang mencegah data buruk mencapai logika inti Anda sambil memastikan keamanan tipe (*type safety*) dan pesan *error* yang jelas.

---

## Untuk Siapa Materi Ini

* **Target Pembaca:** *Backend developer* yang membangun *API* dengan Express.js.
* **Level:** Menengah (*Intermediate*).

---

## Prasyarat

* Pemahaman kuat tentang *routing* dan *middleware* di Express.js.
* Terbiasa dengan konsep dasar validasi data (seperti yang dibahas di tutorial sebelumnya).
* Pengetahuan dasar tentang JavaScript ES6+ (dan opsional TypeScript).

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Mengapa Zod lebih disukai daripada validasi manual atau *library* lama seperti Joi.
* Cara mendefinisikan skema Zod untuk berbagai bagian dari HTTP *request* (*body*, *query*, *params*).
* Cara membuat *middleware* validasi Express yang dapat digunakan kembali menggunakan Zod.
* Cara menangani dan memformat *error* validasi Zod dengan baik untuk mengirimkan respons yang bermakna ke *client*.

---

## Konteks dan Motivasi

Dalam membangun *API*, "Jangan pernah memercayai input pengguna" (*Never trust user input*) adalah aturan fundamental. Meskipun validasi manual menggunakan pernyataan `if-else` berfungsi untuk kasus sederhana, hal ini dengan cepat menjadi sulit dikelola (*unmaintainable*) seiring berkembangnya aplikasi Anda.

Zod menawarkan cara deklaratif untuk mendefinisikan seperti apa bentuk data Anda seharusnya. Zod memungkinkan Anda mendefinisikan skema kompleks dengan aturan bawaan (misalnya format *email*, panjang minimum *string*, angka positif) dan secara otomatis menyimpulkan tipe TypeScript darinya. Dengan mengintegrasikan Zod ke dalam *middleware* Express Anda, Anda dapat memisahkan logika validasi dari logika bisnis dengan bersih, memastikan bahwa *route handler* Anda hanya menerima data yang dijamin benar.

---

## Materi Inti

### 1. Pengenalan Zod

Zod adalah *library* deklarasi dan validasi skema. Zod dirancang agar ramah *developer*, menggunakan metode berantai (*chaining methods*) untuk membangun aturan validasi kompleks secara intuitif.

Untuk menggunakan Zod, Anda pertama-tama mendefinisikan sebuah skema. Jika data cocok dengan skema, maka akan lolos; jika tidak, Zod melempar (*throws*) *error* terperinci yang menjelaskan dengan tepat apa yang salah.

### 2. Mendefinisikan Skema Zod

Mari kita lihat cara mendefinisikan skema untuk *payload* pendaftaran pengguna.

```javascript
const { z } = require('zod');

// Mendefinisikan skema untuk pendaftaran pengguna
const registerSchema = z.object({
  username: z.string().min(3, "Username minimal harus 3 karakter").max(20),
  email: z.string().email("Format email tidak valid"),
  age: z.number().int().positive().min(18, "Minimal harus berusia 18 tahun").optional(),
});
```

### 3. Membuat Middleware Validasi Reusable

Untuk menjaga *route handler* kita tetap bersih, kita tidak boleh melakukan validasi langsung di dalamnya. Alih-alih, kita membuat pabrik *middleware* (*middleware factory*) generik yang menerima skema Zod dan memvalidasi data *request* terhadap skema tersebut.

```javascript
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Metode parse dari Zod melempar error jika validasi gagal
      // Kita sering memvalidasi req.body, tetapi Anda dapat mengadaptasi ini untuk req.query atau req.params
      schema.parse(req.body);

      // Jika validasi berhasil, pindah ke middleware atau route handler berikutnya
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Memetakan error Zod ke format yang lebih ramah client
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          status: 'error',
          message: 'Validasi gagal',
          errors: formattedErrors,
        });
      }

      // Teruskan error non-Zod ke centralized error handler
      next(error);
    }
  };
};
```

### 4. Mengintegrasikan Middleware ke dalam Routes

Sekarang, kita dapat menerapkan *middleware* `validate` kita ke *route* Express mana pun.

```javascript
const express = require('express');
const app = express();
app.use(express.json()); // Penting untuk parsing body JSON

// Terapkan middleware validasi sebelum route handler
app.post('/api/users/register', validate(registerSchema), (req, res) => {
  // Jika kita mencapai titik ini, req.body dijamin valid sesuai dengan registerSchema
  const { username, email, age } = req.body;

  // Lanjutkan dengan logika bisnis (misal: menyimpan ke database)
  res.status(201).json({
    status: 'success',
    message: `Pengguna ${username} berhasil didaftarkan!`,
  });
});
```

---

## Contoh / Ilustrasi

Bayangkan sebuah **Penjaga Klub yang Ketat (*Validation Middleware*)** berdiri di pintu sebuah klub eksklusif (logika aplikasi inti Anda).

Penjaga memegang **Lembar Aturan Daftar Tamu (*Zod Schema*)** yang menyatakan:

* Harus memiliki tanda pengenal nama (*string*, min 3 karakter).
* Harus memiliki kartu identitas yang valid (format *email*).
* Harus berusia di atas 18 tahun jika umur disebutkan.

Ketika seorang tamu (HTTP *Request*) tiba, penjaga memeriksa mereka terhadap lembar aturan.

* Jika tamu tidak memiliki tanda pengenal nama, penjaga langsung menolak mereka dengan alasan spesifik: "Anda harus memakai tanda pengenal nama." (*Validation Error Response*). Manajer klub di dalam (*Route Handler*) tidak pernah diganggu.
* Jika tamu memenuhi semua aturan, mereka diizinkan masuk, dan manajer dapat melayani mereka dengan percaya diri, karena tahu mereka telah diverifikasi.

---

## Insight Penting

* **Gagal Lebih Awal, Gagal dengan Keras (*Fail Early, Fail Loudly*):** Dengan memvalidasi data di tepi aplikasi Anda (di *middleware*), Anda mencegah data cacat menyebabkan *error* yang lebih dalam dan kabur di tingkat *database* atau logika bisnis Anda.
* `.parse()` vs `.safeParse()`: Dalam contoh *middleware*, kita menggunakan `.parse()`, yang melempar pengecualian (*exception*) saat gagal. Zod juga menyediakan `.safeParse()`, yang mengembalikan objek berisi `{ success: true/false, data, error }` daripada melempar. `.safeParse()` berguna jika Anda lebih suka menghindari blok `try-catch`.
* **Inferensi Tipe (*Type Inference*):** Jika Anda menggunakan TypeScript, kekuatan super terbesar Zod adalah `z.infer<typeof mySchema>`. Ini secara otomatis menghasilkan tipe TypeScript dari skema *runtime* Anda, memastikan tipe dan aturan validasi Anda selalu tersinkronisasi dengan sempurna.

---

## Ringkasan Akhir

* Zod adalah *library* validasi skema deklaratif dan kuat yang berpasangan sangat baik dengan Express.js.
* Membuat *middleware* validasi generik menjaga *route handler* tetap bersih dan hanya berfokus pada logika bisnis.
* Memformat *error* Zod dengan benar memastikan *client* menerima umpan balik yang jelas dan dapat ditindaklanjuti tentang apa yang perlu mereka perbaiki dalam *request* mereka.

---

## Langkah Belajar Berikutnya

* Jelajahi fitur Zod yang lebih lanjut, seperti *refinements* (`.refine()`) untuk logika validasi kustom (misalnya, memeriksa apakah kata sandi cocok).
* Pelajari cara memvalidasi bagian lain dari *request*, seperti `req.query` untuk parameter pencarian dan `req.params` untuk segmen *route* dinamis.
* Integrasikan validasi Zod dengan ORM seperti Prisma untuk keamanan tipe ujung-ke-ujung (*end-to-end type safety*).

---

## Metadata

* **Level:** Menengah (*Intermediate*)
* **Topik utama:** Express JS, Validation
* **Topik terkait:** Zod, Middleware, Error Handling
* **Kata kunci:** express zod, validasi skema, express middleware, validasi typescript
* **Estimasi waktu baca:** 8 - 12 menit
