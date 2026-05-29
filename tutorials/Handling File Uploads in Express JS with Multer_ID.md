# Menangani Upload File di Express JS dengan Multer

## Ringkasan Singkat

Tutorial ini membahas cara menangani upload file dalam aplikasi Express.js menggunakan Multer. Materi ini menjelaskan konsep dasar, konfigurasi untuk unggahan file tunggal maupun ganda, serta praktik terbaik untuk keamanan dan penyimpanan.

---

## Untuk Siapa Materi Ini

* Backend Developer yang perlu memproses file yang diunggah oleh pengguna.
* Pembelajar Express.js yang ingin memahami penggunaan middleware untuk menangani `multipart/form-data`.
* Developer yang ingin mengamankan endpoint upload file mereka.

---

## Prasyarat

* Pemahaman dasar tentang routing di Node.js dan Express.js.
* Familiaritas dengan konsep RESTful API.
* Pemahaman tentang body request HTTP, khususnya `multipart/form-data`.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Pentingnya `multipart/form-data` untuk pengiriman file.
* Cara mengintegrasikan dan mengonfigurasi middleware Multer di Express.js.
* Teknik untuk menangani satu file, banyak file, dan input form yang spesifik.
* Praktik terbaik untuk validasi file (tipe dan ukuran) dan penyimpanan yang aman untuk mencegah kerentanan.

---

## Konteks dan Motivasi

Dalam aplikasi web modern, menangani upload file adalah kebutuhan yang sangat umum. Pengguna sering kali perlu mengunggah foto profil, dokumen, gambar, dan media lainnya. Pengiriman form standar (seperti `application/x-www-form-urlencoded` atau `application/json`) tidak efisien dan tidak cocok untuk mengirimkan data biner.

Untuk mengirim file melalui HTTP, klien menggunakan tipe encoding `multipart/form-data`. Express.js secara bawaan tidak mem-parsing tipe body request ini. Di sinilah **Multer** berperan. Multer adalah middleware Node.js populer yang dirancang khusus untuk mem-parsing `multipart/form-data`, membuatnya sangat mudah untuk mengekstrak teks maupun data file dari request yang masuk. Memahami Multer adalah hal wajib bagi backend developer yang membangun aplikasi Express.js yang berinteraksi dengan file dari pengguna.

---

## Materi Inti

### Mengapa Kita Membutuhkan Multer?

Ketika klien mengirimkan form yang berisi file, browser akan mengenkode request tersebut sebagai `multipart/form-data`. Format ini membagi body request menjadi "bagian-bagian" yang terpisah, masing-masing dibatasi oleh string batas (boundary). Setiap bagian berisi header (seperti `Content-Disposition` yang menunjukkan nama field atau nama file) diikuti oleh data aktualnya.

Parser bawaan Express (`express.json()` dan `express.urlencoded()`) akan mengabaikan request multipart ini. Multer mem-parsing bagian-bagian ini, menyimpan data file ke disk (atau menahannya di memori), dan menambahkan objek `req.file` atau `req.files` ke objek request Express, bersama dengan objek `req.body` yang berisi input teks apa pun dari form tersebut.

### Konfigurasi Dasar: Penyimpanan Disk

Cara paling umum menggunakan Multer adalah dengan menyimpan file yang diunggah langsung ke disk server.

```javascript
const multer = require('multer');

// Tentukan konfigurasi engine penyimpanan
const storage = multer.diskStorage({
  // Tentukan direktori tujuan
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Pastikan direktori ini sudah ada!
  },
  // Tentukan nama file di disk
  filename: function (req, file, cb) {
    // Praktik umum: tambahkan timestamp untuk mencegah penimpaan file dengan nama yang sama
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Buat instance middleware upload
const upload = multer({ storage: storage });
```

### Menangani Berbagai Skenario Upload

Multer menyediakan beberapa metode tergantung pada berapa banyak file yang Anda harapkan:

#### 1. File Tunggal (`upload.single()`)

Gunakan ini jika Anda mengharapkan tepat satu file yang terkait dengan nama field tertentu.

```javascript
// Menerima satu file dengan nama field 'profile_pic'
app.post('/upload-profile', upload.single('profile_pic'), (req, res) => {
  // req.file berisi informasi tentang file yang diunggah
  // req.body berisi input teks
  if (!req.file) {
    return res.status(400).send('Tidak ada file yang diunggah.');
  }
  res.send(`File berhasil diunggah: ${req.file.filename}`);
});
```

#### 2. Banyak File dari Satu Field (`upload.array()`)

Gunakan ini jika satu input form memungkinkan pemilihan banyak file.

```javascript
// Menerima array file dengan nama field 'gallery_images', maksimal 5 file
app.post('/upload-gallery', upload.array('gallery_images', 5), (req, res) => {
  // req.files adalah array dari objek informasi file
  if (!req.files || req.files.length === 0) {
    return res.status(400).send('Tidak ada file yang diunggah.');
  }
  res.send(`${req.files.length} file berhasil diunggah.`);
});
```

#### 3. Banyak File dari Field Berbeda (`upload.fields()`)

Gunakan ini jika form berisi beberapa input file yang berbeda.

```javascript
const cpUpload = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'gallery', maxCount: 8 }
]);

app.post('/upload-complex', cpUpload, (req, res) => {
  // req.files adalah objek di mana kuncinya adalah nama field dan nilainya adalah array objek file
  // Contoh: req.files['avatar'][0] dan req.files['gallery']
  res.send('Upload kompleks berhasil.');
});
```

### Keamanan dan Validasi

Menerima unggahan file adalah risiko keamanan yang signifikan. Anda harus selalu memvalidasi file sebelum menyimpannya secara permanen.

#### 1. Batas Ukuran File

Selalu batasi ukuran file yang diunggah untuk mencegah serangan Denial of Service (DoS) dengan menghabiskan ruang disk.

```javascript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // Batas 5 MB
  }
});
```

#### 2. Filter Tipe File (Validasi Tipe MIME)

Jangan pernah mempercayai ekstensi file yang diberikan pengguna (`file.originalname`). Selalu validasi `mimetype` untuk memastikan file tersebut benar-benar sesuai dengan yang diklaim.

```javascript
const fileFilter = (req, file, cb) => {
  // Hanya izinkan gambar JPEG dan PNG
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true); // Terima file
  } else {
    // Tolak file
    cb(new Error('Tipe file tidak didukung. Hanya JPEG dan PNG yang diizinkan.'), false);
  }
};

const secureUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});
```

---

## Contoh / Ilustrasi

Mari kita buat contoh lengkap endpoint aman untuk mengunggah avatar pengguna.

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Pastikan direktori uploads ada
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// 1. Konfigurasi Penyimpanan
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

// 2. Konfigurasi Filter File
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
  }
};

// 3. Instance Multer
const uploadAvatar = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter
}).single('avatar'); // Mengharapkan field bernama 'avatar'

// 4. Penanganan Route
app.post('/api/users/avatar', (req, res) => {
  uploadAvatar(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // Terjadi error Multer saat mengunggah (misal, file terlalu besar)
      if (err.code === 'LIMIT_FILE_SIZE') {
         return res.status(400).json({ error: 'Ukuran file melebihi batas 2MB.' });
      }
      return res.status(400).json({ error: `Error Multer: ${err.message}` });
    } else if (err) {
      // Terjadi error yang tidak diketahui (misal, dari filter file)
      return res.status(400).json({ error: err.message });
    }

    // Semuanya berjalan lancar
    if (!req.file) {
      return res.status(400).json({ error: 'Harap sertakan file gambar.' });
    }

    // Di sini Anda biasanya akan menyimpan path file (req.file.path) ke database Anda
    res.status(200).json({
      message: 'Avatar berhasil diunggah',
      filePath: req.file.path,
      filename: req.file.filename
    });
  });
});

app.listen(3000, () => console.log('Server berjalan pada port 3000'));
```

---

## Insight Penting

* **Penyimpanan Memori vs. Penyimpanan Disk:** Multer juga menawarkan `multer.memoryStorage()`, yang menahan data file sebagai Buffer di memori (`req.file.buffer`). Ini berguna jika Anda berniat untuk segera mengunggah file ke layanan penyimpanan cloud (seperti AWS S3 atau Cloudinary) tanpa menyimpannya secara lokal terlebih dahulu. Namun, gunakan penyimpanan memori dengan hati-hati untuk file berukuran besar, karena dapat dengan cepat menghabiskan RAM server Anda.
* **Jangan Pernah Percaya Input Pengguna:** Selalu validasi ukuran file dan tipe MIME. Jangan hanya mengandalkan ekstensi file, karena pengguna iseng bisa saja mengganti nama script yang dapat dieksekusi (`malware.exe`) menjadi gambar (`malware.jpg`) untuk melewati pengecekan sederhana.
* **Middleware Penanganan Error:** Alih-alih menangani error Multer di dalam controller route seperti yang ditunjukkan pada contoh di atas, Anda sering kali dapat menanganinya di middleware penanganan error terpusat untuk kode yang lebih bersih.
* **Menyajikan File yang Diunggah:** Jika Anda menyimpan file di disk dan perlu menyajikannya kembali ke klien, Anda dapat menggunakan middleware `express.static()`: `app.use('/uploads', express.static('uploads'))`.
* **Kerentanan Path Traversal:** Saat menghasilkan nama file, jangan membuatnya menggunakan nama file asli tanpa pembersihan (sanitization), karena ini dapat mengarah ke kerentanan path traversal jika nama file asli mengandung karakter seperti `../`. Menggunakan nama file yang unik dan di-generate (seperti UUID atau timestamp) adalah pendekatan yang paling aman.

---

## Ringkasan Akhir

* Multer adalah middleware standar untuk mem-parsing `multipart/form-data` di Express.js.
* Ini memfasilitasi penanganan upload file dari form HTML atau klien API.
* Anda dapat mengonfigurasi Multer untuk menyimpan file langsung di disk atau di memori.
* Multer mendukung berbagai skenario: file tunggal, banyak file dari satu field, atau banyak file dari field yang berbeda.
* Menerapkan validasi ketat untuk ukuran file (`limits`) dan tipe file (`fileFilter`) sangat penting untuk keamanan aplikasi.

---

## Langkah Belajar Berikutnya

* Pelajari cara mengintegrasikan Multer dengan solusi penyimpanan cloud seperti AWS S3 menggunakan `multer-s3`.
* Pelajari cara memproses gambar yang diunggah (misalnya, mengubah ukuran, memotong) menggunakan pustaka seperti Sharp sebelum menyimpannya.
* Pelajari praktik keamanan lanjutan untuk menangani unggahan pengguna, termasuk pemindaian malware.

---

## Metadata

* Level: Menengah
* Topik utama: Express.js, File Uploads
* Topik terkait: Middleware, Form Data, Keamanan
* Kata kunci: multer, express file upload, multipart/form-data, node.js upload
* Estimasi waktu baca: 10 menit
