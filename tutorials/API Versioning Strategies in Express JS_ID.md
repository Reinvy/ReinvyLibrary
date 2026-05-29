# Strategi Versioning API di Express JS

## Ringkasan Singkat

Materi ini menjelaskan cara mengimplementasikan versioning API pada aplikasi Express.js. Anda akan mempelajari pentingnya versioning untuk menjaga kompatibilitas versi lama (backward compatibility), serta mengeksplorasi strategi praktis seperti versioning menggunakan URI path dan header kustom untuk mengelola perubahan siklus hidup API secara halus.

## Untuk Siapa Materi Ini

- Target pembaca: Backend Developer, API Designer, dan Fullstack Developer.
- Level pembaca: Menengah.

## Prasyarat

- Pemahaman solid tentang dasar-dasar Express.js (Routing dan Middleware).
- Keakraban dengan prinsip desain RESTful API.
- Pengetahuan dasar tentang metode HTTP dan header.

## Tujuan Belajar

- Memahami apa itu versioning API dan mengapa hal ini krusial untuk pemeliharaan API jangka panjang.
- Mempelajari kapan harus memperkenalkan versi baru dan kapan harus menghindarinya.
- Mengimplementasikan versioning URI path di Express.js menggunakan router.
- Mengimplementasikan versioning berbasis HTTP header menggunakan middleware kustom.
- Mengenali kelebihan dan kekurangan (trade-off) antara berbagai strategi versioning untuk memilih yang paling sesuai untuk proyek Anda.

## Konteks dan Motivasi

Ketika Anda membangun sebuah API, berbagai klien (aplikasi mobile, aplikasi web, atau layanan pihak ketiga) akan mulai bergantung pada struktur, endpoint, dan format data spesifik tersebut. Seiring waktu, aplikasi Anda pasti akan berevolusi. Anda mungkin perlu mengubah skema database, memodifikasi payload respons, atau menghapus fitur yang sudah usang. Jika Anda membuat perubahan drastis (breaking changes) ini langsung pada API yang ada, Anda berisiko merusak semua aplikasi klien yang mengandalkan struktur lama.

Di sinilah peran versioning API. Versioning memungkinkan Anda untuk merilis fitur baru dan perubahan yang berpotensi merusak di bawah versi baru, sembari menjaga versi lama tetap utuh untuk klien yang sudah ada. Hal ini memberikan masa transisi, memastikan pengalaman pengguna yang lancar dan tanpa gangguan. Namun, versioning juga membawa beban pemeliharaan (maintenance overhead), sehingga mengetahui *bagaimana* dan *kapan* harus melakukan versioning adalah keahlian fundamental dalam merancang sistem backend yang tangguh dan dapat diskalakan.

## Materi Inti

### Apa itu Versioning API?

Versioning API adalah praktik mengelola perubahan pada API Anda secara transparan dengan menyediakan beberapa variasi berbeda secara bersamaan. Alih-alih menimpa endpoint yang ada, Anda mengekspos titik akses paralel untuk versi yang berbeda.

### Kapan Harus Menggunakan Versioning

Anda harus memperkenalkan versi API baru ketika Anda membuat **breaking change** (perubahan yang merusak kompatibilitas lama). Contoh breaking changes meliputi:

- Menghapus endpoint atau metode HTTP tertentu.
- Menghapus atau mengubah nama field pada respons JSON.
- Mengubah tipe data sebuah field (misalnya, dari integer menjadi string).
- Menambahkan parameter request wajib atau aturan validasi yang baru.

### Kapan Harus Menghindari Versioning

Jangan membuat versi baru untuk **non-breaking changes** (perubahan yang aman). Anda dapat dengan aman memperbarui versi API Anda saat ini jika Anda:

- Menambahkan endpoint baru.
- Menambahkan field opsional baru ke dalam respons.
- Menambahkan parameter opsional pada request.
- Memperbaiki bug internal yang tidak mengubah struktur output yang diharapkan.

### Strategi Versioning

Ada beberapa cara untuk mengimplementasikan versioning. Dua pendekatan yang paling umum di Express.js adalah:

1. **Versioning URI Path:** Versi API dituliskan secara eksplisit di dalam URL (contoh: `/api/v1/users`). Ini adalah pendekatan yang paling umum dan mudah dilihat.
2. **Versioning Header:** URL tetap sama (contoh: `/api/users`), tetapi klien menentukan versi yang diminta melalui HTTP header (contoh: `Accept-Version: v2`).

## Contoh / Ilustrasi

### 1. Implementasi Versioning URI Path

Pendekatan ini menggunakan Express router untuk memisahkan setiap versi. Cara ini sederhana untuk diimplementasikan dan mudah diuji langsung melalui browser.

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Controller untuk Versi 1
const getUsersV1 = (req, res) => {
  try {
    // Format respons lama
    res.json({ users: ['Alice', 'Bob'] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Controller untuk Versi 2 (Breaking change: dari array string menjadi array objek)
const getUsersV2 = (req, res) => {
  try {
    // Format respons baru
    res.json({ data: [{ name: 'Alice' }, { name: 'Bob' }] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Membuat router
const routerV1 = express.Router();
const routerV2 = express.Router();

routerV1.get('/users', getUsersV1);
routerV2.get('/users', getUsersV2);

// Menyambungkan router ke URI path yang spesifik
app.use('/api/v1', routerV1);
app.use('/api/v2', routerV2);

app.listen(3000, () => {
  console.log('Server berjalan di port 3000');
});
```

### 2. Implementasi Versioning Header

Pada pendekatan ini, endpoint tetap berada di `/api/users`. Kita menggunakan middleware untuk memeriksa custom header dan mengarahkan request ke logika versi yang sesuai.

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Handlers
const handleGetUsersV1 = (req, res) => {
  try {
    res.json({ users: ['Alice', 'Bob'] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const handleGetUsersV2 = (req, res) => {
  try {
    res.json({ data: [{ name: 'Alice' }, { name: 'Bob' }] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Middleware untuk Versioning
const versioningMiddleware = (req, res, next) => {
  // Ambil versi dari custom header, default ke 'v1'
  const version = req.headers['x-api-version'] || 'v1';
  req.apiVersion = version;
  next();
};

app.use(versioningMiddleware);

// Endpoint tunggal dengan percabangan internal
app.get('/api/users', (req, res) => {
  if (req.apiVersion === 'v2') {
    return handleGetUsersV2(req, res);
  }
  // Fallback ke V1 jika tidak ada versi v2
  return handleGetUsersV1(req, res);
});

app.listen(3000, () => {
  console.log('Server berjalan di port 3000');
});
```

## Insight Penting

### Trade-off Antar Strategi

- **Versioning URI Path:** Sangat transparan, mudah di-cache, dan mudah di-debug. Namun, pendekatan ini sangat mengikat klien dengan URI tertentu dan dapat membuat logika routing Anda berantakan seiring bertambahnya jumlah versi.
- **Versioning Header:** Menjaga URL tetap bersih dan benar secara semantik (URL seharusnya merepresentasikan "sumber daya/resource", bukan versi). Namun, ini lebih sulit diuji secara cepat via browser dan menuntut klien untuk mengatur HTTP header kustom dengan benar.

### Pemeliharaan dan Periode Sunset

Jangan biarkan versi lama hidup selamanya. Setiap versi akan melipatgandakan upaya pengujian dan pemeliharaan Anda. Saat merilis `v2`, umumkan "jadwal penghentian" (deprecation timeline) yang jelas untuk `v1`. Setelah periode sunset berakhir, pantau log aktivitas. Jika lalu lintas (traffic) di `v1` sudah sangat minim atau nol, Anda bisa menghapusnya dengan aman dari codebase.

### Mengutamakan Keamanan

Selalu bungkus logika route Anda di dalam blok try-catch (atau gunakan error handler asinkron). Jika terjadi kesalahan, catat detail log error secara internal (`console.error(error)`) dan kembalikan pesan `500 Internal Server Error` secara generik. Ini mencegah terungkapnya stack trace atau struktur database sensitif kepada pengguna akhir, tidak peduli versi API mana yang mereka gunakan.

## Ringkasan Akhir

- Versioning API memastikan klien yang bergantung pada struktur lama tidak akan rusak saat Anda memperkenalkan perubahan besar.
- Lakukan versioning hanya untuk breaking changes; penambahan fitur opsional (additive changes) tidak memerlukan versi baru.
- Versioning URI Path menggunakan router (`/api/v1/...`) dan sangat populer karena kesederhanaannya.
- Versioning Header menggunakan middleware kustom (`x-api-version`) untuk menjaga URL tetap bersih tetapi butuh konfigurasi ekstra di sisi klien.
- Rencanakan periode sunset untuk akhirnya mematikan versi API lama agar terhindar dari beban pemeliharaan yang tak ada habisnya.

## Langkah Belajar Berikutnya

- Pelajari cara merapikan struktur controller dan service ke dalam folder terpisah untuk menjaga routing versi tetap bersih (konsep MVC).
- Eksplorasi alat dokumentasi API seperti Swagger (OpenAPI) untuk mendokumentasikan beberapa versi API secara bersamaan.
- Pelajari prinsip Semantic Versioning (SemVer) untuk memahami cara mengklasifikasikan pembaruan major, minor, dan patch.

## Metadata

- Level: Menengah
- Topik utama: Express.js, API Design
- Topik terkait: Routing, Middleware, RESTful API
- Kata kunci: api versioning, express js routing, backward compatibility, rest api, header versioning
- Estimasi waktu baca: 8 menit
