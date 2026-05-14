# Pengujian API Express dengan Jest dan Supertest

## Ringkasan Singkat

Tutorial ini memperkenalkan pengujian API di Express.js menggunakan Jest dan Supertest. Anda akan mempelajari cara menulis tes otomatis untuk endpoint Anda, memastikan aplikasi berperilaku seperti yang diharapkan, dan menangkap bug sejak dini sebelum masuk ke tahap produksi.

---

## Untuk Siapa Materi Ini

* **Target pembaca:** Backend Developer, QA Engineer, dan Full-Stack Developer.
* **Level pembaca:** Menengah (Intermediate).

---

## Prasyarat

* Pemahaman dasar tentang JavaScript dan Node.js.
* Terbiasa dengan routing dan middleware di Express.js.
* Pengetahuan dasar tentang metode HTTP dan kode status.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Pentingnya pengujian otomatis untuk API.
* Cara mengatur Jest dan Supertest di proyek Express.js.
* Cara menulis unit test dan integration test untuk rute Express.
* Cara melakukan mocking data dan menangani operasi asinkron dalam pengujian.

---

## Konteks dan Motivasi

Pengujian adalah bagian penting dari pengembangan perangkat lunak. Seiring berkembangnya aplikasi Express.js Anda, menguji setiap endpoint secara manual menjadi memakan waktu dan rawan kesalahan. Pengujian otomatis memastikan bahwa fitur baru tidak merusak fungsionalitas yang sudah ada (regresi) dan bertindak sebagai dokumentasi hidup untuk API Anda. Jest menyediakan kerangka kerja pengujian yang kuat dengan kemampuan asersi dan mocking bawaan, sementara Supertest memungkinkan Anda mensimulasikan permintaan HTTP tanpa benar-benar menjalankan server, membuat pengujian Anda cepat dan andal.

---

## Materi Inti

### 1. Apa itu Jest dan Supertest?

* **Jest:** Kerangka Kerja Pengujian JavaScript yang menyenangkan dengan fokus pada kesederhanaan. Ini menyediakan lingkungan untuk menjalankan pengujian, menegaskan hasil yang diharapkan, dan melakukan mocking dependensi.
* **Supertest:** Pustaka berbasis super-agent untuk menguji server HTTP Node.js. Ini memungkinkan Anda mengirim permintaan ke aplikasi Express Anda dan menegaskan responsnya dengan mudah.

### 2. Mengatur Lingkungan Pengujian

Pertama, instal dependensi yang diperlukan sebagai dev dependencies:

```bash
npm install --save-dev jest supertest
```

Konfigurasikan Jest dengan menambahkan skrip pengujian di `package.json` Anda:

```json
"scripts": {
  "test": "jest"
}
```

### 3. Menyusun Aplikasi Anda untuk Pengujian

Untuk menggunakan Supertest secara efektif, Anda harus mengekspor instance aplikasi Express Anda tanpa memanggil `app.listen()`. Ini memungkinkan Supertest untuk mengikat aplikasi ke port acak selama pengujian.

**`app.js` (Aplikasi Express Anda)**

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/users', (req, res) => {
  res.status(200).json([{ id: 1, name: 'John Doe' }]);
});

app.post('/api/users', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  res.status(201).json({ id: 2, name });
});

module.exports = app;
```

**`server.js` (Titik Masuk/Entry Point)**

```javascript
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Contoh / Ilustrasi

### Menulis Pengujian Pertama Anda

Buat file bernama `app.test.js`. Jest secara otomatis menemukan file yang berakhiran `.test.js` atau `.spec.js`.

```javascript
const request = require('supertest');
const app = require('./app');

describe('User API Endpoints', () => {

  // Menguji rute GET
  it('should return a list of users', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toHaveProperty('name', 'John Doe');
  });

  // Menguji rute POST - Kasus Berhasil
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Jane Doe' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Jane Doe');
  });

  // Menguji rute POST - Kasus Error
  it('should return 400 if name is missing', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Name is required');
  });

});
```

Jalankan pengujian menggunakan perintah:

```bash
npm test
```

---

## Insight Penting

* **Kemandirian Pengujian:** Setiap pengujian harus independen. Jangan mengandalkan status yang diubah oleh pengujian sebelumnya. Gunakan hook `beforeEach` dan `afterEach` untuk mengatur ulang database atau data mock.
* **Mocking Layanan Eksternal:** Jangan menekan API pihak ketiga yang sebenarnya atau database produksi dalam pengujian Anda. Gunakan kemampuan mocking Jest (`jest.mock()`) untuk mensimulasikan respons dari dependensi eksternal.
* **Cakupan vs Kuantitas:** Fokuslah pada penulisan pengujian bermakna yang mencakup kasus batas (edge cases), penanganan kesalahan, dan logika bisnis, daripada sekadar mencapai cakupan kode (code coverage) 100%.
* **Pisahkan Server dari App:** Selalu pisahkan panggilan `app.listen()` dari pengaturan aplikasi Express Anda. Ini sangat penting agar Supertest bekerja dengan benar tanpa menyebabkan konflik port.

---

## Ringkasan Akhir

* Pengujian API otomatis memastikan keandalan kode dan mencegah regresi.
* Jest adalah kerangka kerja pengujian yang kuat untuk menjalankan tes dan membuat asersi.
* Supertest memungkinkan simulasi permintaan HTTP ke endpoint Express dengan mudah.
* Memisahkan definisi `app` Express dari startup `server` adalah best practice untuk pengujian.
* Pengujian harus mencakup operasi yang berhasil maupun status kesalahan yang diharapkan.

---

## Langkah Belajar Berikutnya

* Jelajahi mocking database dengan Prisma atau Mongoose di Jest.
* Pelajari tentang Continuous Integration (CI) untuk menjalankan tes secara otomatis di GitHub Actions.
* Selami lebih dalam fitur lanjutan Jest seperti snapshot testing dan custom matchers.

---

## Metadata

* **Level:** Menengah
* **Topik utama:** Testing, Express.js
* **Topik terkait:** Jest, Supertest, API Development
* **Kata kunci:** express testing, jest, supertest, api tests, nodejs testing
* **Estimasi waktu baca:** 10 menit
