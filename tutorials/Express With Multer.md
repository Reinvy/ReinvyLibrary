# Langkah Integrasi Multer dengan Express.js

## 1. Install Multer

Pasang **Multer** sebagai dependensi proyek:

```bash
npm install multer
```

## 2. Buat Konfigurasi Multer

Buat file baru (opsional) atau tambahkan konfigurasi di file rute Anda. Contoh konfigurasi untuk mengunggah file di folder `uploads/`:

```javascript
const multer = require("multer");

// Konfigurasi penyimpanan
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Folder tujuan
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // Nama file unik
  },
});

// Filter tipe file (opsional)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("File harus berupa JPEG atau PNG"), false);
  }
};

// Middleware Multer
const upload = multer({ storage, fileFilter });

module.exports = upload;
```

## 3. Gunakan Multer di Rute Express

Contoh penggunaan Multer di file `routes/index.js`:

```javascript
const express = require("express");
const router = express.Router();
const upload = require("../multer"); // Import konfigurasi multer

// Endpoint untuk mengunggah file tunggal
router.post("/upload", upload.single("file"), (req, res) => {
  try {
    res.json({
      message: "File berhasil diunggah!",
      file: req.file,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint untuk mengunggah banyak file
router.post("/uploads", upload.array("files", 5), (req, res) => {
  try {
    res.json({
      message: "File berhasil diunggah!",
      files: req.files,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
```

## 4. Buat Folder untuk Penyimpanan File

Buat folder `uploads/` di direktori utama proyek Anda agar file dapat disimpan.

```bash
mkdir uploads
```

## 5. Middleware untuk File Statis (Opsional)

Agar file yang diunggah dapat diakses secara publik, tambahkan middleware untuk menyajikan file statis di `app.js`:

```javascript
const path = require("path");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
```

## 6. Uji Endpoint

Gunakan Postman atau alat serupa untuk menguji endpoint.

### Endpoint untuk unggah file tunggal:

- **URL**: `POST /upload`
- **Body**: Form-Data dengan key `file` dan pilih file untuk diunggah.

### Endpoint untuk unggah banyak file:

- **URL**: `POST /uploads`
- **Body**: Form-Data dengan key `files` (multiple files).

## 7. Hasil Respons

Jika unggahan berhasil, respons akan berupa data file yang diunggah. Contoh:

```json
{
  "message": "File berhasil diunggah!",
  "file": {
    "fieldname": "file",
    "originalname": "gambar.jpg",
    "encoding": "7bit",
    "mimetype": "image/jpeg",
    "destination": "uploads/",
    "filename": "1698574878324-gambar.jpg",
    "path": "uploads/1698574878324-gambar.jpg",
    "size": 1024
  }
}
```
