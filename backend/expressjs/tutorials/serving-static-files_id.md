---
title: "Menyajikan File Statis (Static Files) di Express.js"
description: "Tutorial ini membahas cara menyajikan file statis (seperti gambar, file CSS, dan skrip JavaScript) menggunakan middleware bawaan express.static di Express.js. A"
category: "backend"
technology: "expressjs"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Menyajikan File Statis (Static Files) di Express.js

## Ringkasan Singkat

Tutorial ini membahas cara menyajikan file statis (seperti gambar, file CSS, dan skrip JavaScript) menggunakan middleware bawaan `express.static` di Express.js. Anda akan mempelajari cara mengonfigurasi direktori statis, mengatur prefiks path virtual, dan menangani path file secara benar dan aman.

## Untuk Siapa Materi Ini

- **Target Audience:** Developer backend pemula atau developer frontend yang sedang mempelajari Node.js.
- **Level:** Pemula.

## Prasyarat

- Pemahaman dasar tentang JavaScript dan Node.js.
- Pengetahuan tentang konsep dasar Express.js (misalnya, membuat aplikasi, routing).
- Familiar dengan konsep middleware di Express.js.

## Tujuan Belajar

Setelah menyelesaikan materi ini, Anda akan dapat:

- Memahami apa itu file statis dan mengapa mereka perlu disajikan.
- Menggunakan middleware `express.static()` untuk menyajikan file dari suatu direktori.
- Mengonfigurasi prefiks path virtual untuk aset statis.
- Menggunakan path absolut secara aman untuk direktori statis guna menghindari error resolusi path.

## Konteks dan Motivasi

Saat membangun aplikasi web, Anda sering kali perlu mengirimkan file secara langsung ke browser klien tanpa memodifikasinya di server. File-file ini termasuk *stylesheet* (CSS), skrip sisi-klien (JavaScript), gambar, font, dan file HTML.

Secara default, aplikasi Express tidak menyajikan file apa pun. Jika Anda mencoba mengakses file di direktori proyek Anda melalui browser web, Express akan mengembalikan error `404 Not Found` karena tidak ada rute yang menangani permintaan spesifik tersebut. Menulis rute satu per satu untuk mengirimkan setiap file akan sangat melelahkan dan tidak efisien. Untuk mengatasi ini, Express menyediakan middleware bawaan yang disebut `express.static` yang secara efisien menyajikan file dari direktori yang ditentukan.

## Materi Inti

### 1. Apa itu `express.static`?

`express.static` adalah satu-satunya fungsi middleware bawaan di Express. Ini didasarkan pada `serve-static` dan bertanggung jawab untuk menyajikan aset statis. Anda cukup memberikan nama direktori yang berisi aset statis Anda ke fungsi ini, dan Express akan menangani sisanya.

### 2. Penggunaan Dasar

Untuk menyajikan file, gunakan `app.use()` bersama dengan `express.static()`.

```javascript
const express = require('express');
const app = express();

// Menyajikan file dari direktori 'public'
app.use(express.static('public'));

app.listen(3000, () => {
  console.log('Server berjalan di port 3000');
});
```

Jika Anda memiliki file yang terletak di `public/images/logo.png`, Anda sekarang dapat mengaksesnya di browser Anda melalui:
`http://localhost:3000/images/logo.png`

*Catatan:* Express mencari file relatif terhadap direktori statis, sehingga nama direktori statis (`public`) tidak menjadi bagian dari URL.

### 3. Menggunakan Prefiks Path Virtual

Terkadang, Anda ingin mengelompokkan file statis Anda di bawah path URL tertentu, seperti `/static` atau `/assets`. Anda dapat memberikan prefiks path sebagai argumen pertama ke `app.use()`.

```javascript
// Menyajikan file dari direktori 'public' dengan prefiks '/assets'
app.use('/assets', express.static('public'));
```

Sekarang, file `public/images/logo.png` akan dapat diakses di:
`http://localhost:3000/assets/images/logo.png`

### 4. Path Absolut yang Aman

Path yang Anda berikan ke `express.static` adalah relatif terhadap direktori dari mana Anda menjalankan proses Node.js (perintah `node`). Jika Anda menjalankan aplikasi dari direktori lain, Express mungkin gagal menemukan direktori statis.

Untuk memastikan aplikasi Anda selalu menemukan folder terlepas dari mana ia dijalankan, gunakan path absolut menggunakan modul `path` bawaan Node.

```javascript
const express = require('express');
const path = require('path');
const app = express();

// Gunakan path absolut untuk direktori 'public'
app.use('/static', express.static(path.join(__dirname, 'public')));
```

`__dirname` memberikan path absolut dari direktori yang berisi file yang sedang dieksekusi.

### 5. Beberapa Direktori Statis

Anda dapat memanggil `express.static` berkali-kali untuk menyajikan aset dari beberapa direktori. Express akan mencari file sesuai urutan Anda mendefinisikan middleware.

```javascript
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'files')));
```

## Contoh / Ilustrasi

Bayangkan server Anda sebagai seorang **Pustakawan**.

- **Tanpa `express.static`:** Jika seorang siswa meminta brosur publik tertentu, pustakawan tidak tahu di mana letaknya karena mereka hanya tahu cara menjawab pertanyaan spesifik (rute yang ditentukan).
- **Dengan `express.static`:** Anda menempatkan rak brosur besar di lobi dan memberi tahu pustakawan, "Jika seseorang meminta brosur, suruh mereka memeriksa rak di lobi."
- **Path Absolut:** Daripada mengatakan "rak di sebelah sana," Anda mengatakan "rak di koordinat GPS tepat X, Y," sehingga tidak ada kebingungan bahkan jika pustakawan pindah meja.

## Insight Penting

- **Peringatan Keamanan:** Jangan pernah mengekspos direktori root Anda (`/`) atau folder apa pun yang berisi kode sumber, data sensitif (seperti file `.env`), atau `node_modules` melalui `express.static`. Selalu letakkan aset statis di folder khusus (misalnya, `public` atau `assets`).
- **Performa:** Meskipun `express.static` sangat baik untuk penggunaan dasar dan aplikasi kecil, di lingkungan produksi dengan lalu lintas tinggi, sangat disarankan untuk menggunakan reverse proxy seperti **Nginx** atau Content Delivery Network (**CDN**) untuk menyajikan file statis. Mereka secara signifikan lebih cepat dan mengurangi beban pada server Node.js Anda.
- **File Index:** Secara default, `express.static` akan mencari file `index.html` di root direktori statis jika pengguna meminta path direktori (misalnya, `/`).

## Ringkasan Akhir

- `express.static` adalah middleware bawaan untuk menyajikan file seperti gambar, CSS, dan JS.
- Anda tidak menyertakan nama direktori di URL saat mengakses file.
- Path virtual memungkinkan Anda menambahkan prefiks pada URL untuk aset statis.
- Selalu gunakan `path.join(__dirname, 'nama_folder')` untuk menghindari error resolusi path.
- Simpan file statis Anda di folder terpisah dan khusus untuk keamanan.

## Langkah Belajar Berikutnya

Setelah menguasai penyajian file statis, Anda dapat melanjutkan untuk mempelajari:

- [Understanding the Express JS Request Lifecycle_ID](Understanding%20the%20Express%20JS%20Request%20Lifecycle_ID.md) untuk memahami bagaimana file statis masuk ke dalam alur permintaan.
- [Handling File Uploads in Express JS with Multer_ID](Handling%20File%20Uploads%20in%20Express%20JS%20with%20Multer_ID.md) untuk mempelajari cara menerima file dari pengguna dan menyimpannya secara dinamis.

## Metadata

- **Level:** Pemula
- **Topik utama:** Express.js, Backend Development
- **Topik terkait:** Aset Statis, Middleware, Node.js Path
- **Kata kunci:** express static, menyajikan file, aset, folder public
- **Estimasi waktu baca:** 5 - 7 menit
