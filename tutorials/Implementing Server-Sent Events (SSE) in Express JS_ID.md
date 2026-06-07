# Implementasi Server-Sent Events (SSE) di Express JS

## Ringkasan Singkat

Server-Sent Events (SSE) adalah protokol ringan yang memungkinkan server web untuk mendorong (*push*) pembaruan secara *real-time* ke klien melalui satu koneksi HTTP. Tutorial ini menjelaskan cara mengimplementasikan SSE dalam aplikasi Express.js, memungkinkan Anda untuk melakukan *streaming* data seperti notifikasi, *live feed*, atau status *background job* langsung ke peramban (*browser*) tanpa kompleksitas WebSockets.

## Untuk Siapa Materi Ini

Developer Node.js dan Express.js tingkat menengah yang membutuhkan solusi *streaming* data *real-time* satu arah yang sederhana untuk aplikasi web mereka dan ingin memahami perbandingan SSE dengan teknologi *real-time* lain seperti WebSockets.

## Prasyarat

- Pemahaman kuat tentang dasar-dasar Node.js dan Express.js.
- Pengetahuan dasar tentang protokol dan *header* HTTP.
- Keakraban dengan JavaScript sisi klien, khususnya API `EventSource`.

## Tujuan Belajar

- Memahami apa itu Server-Sent Events (SSE) dan perbedaannya dengan WebSockets.
- Mempelajari cara mengonfigurasi *route* Express.js untuk mengirim aliran (*stream*) SSE.
- Mempelajari cara mengelola koneksi klien yang aktif untuk melakukan *broadcast* event.
- Mengimplementasikan skrip sisi klien dasar menggunakan API `EventSource` untuk mengonsumsi data SSE.
- Menangani diskoneksi klien secara rapi (*graceful*) di Express.js.

## Konteks dan Motivasi

Meskipun WebSockets sering menjadi solusi utama untuk aplikasi *real-time*, mereka menyediakan saluran komunikasi dua arah penuh yang bisa jadi berlebihan untuk banyak kasus penggunaan. Jika aplikasi Anda hanya perlu mendorong pembaruan dari server ke klien (seperti *ticker* harga saham, skor olahraga langsung, atau sistem notifikasi sederhana), SSE adalah alternatif yang jauh lebih sederhana dan ringan. SSE beroperasi di atas HTTP standar, membuatnya lebih mudah untuk di-*polyfill*, di-*proxy*, dan di-*load-balance* dibandingkan dengan WebSockets.

## Materi Inti

### Memahami Server-Sent Events (SSE)

Server-Sent Events (SSE) adalah standar yang mendeskripsikan bagaimana server dapat memulai transmisi data ke klien setelah koneksi klien awal dibuat. Ia menggunakan koneksi HTTP standar, menjaganya tetap terbuka tanpa batas waktu untuk mendorong aliran data tekstual.

Tidak seperti WebSockets, yang menggunakan protokol kustom (`ws://`), SSE menggunakan protokol `http://` atau `https://` tradisional. Ini berarti ia bekerja secara mulus dengan infrastruktur yang ada seperti *load balancer* dan *firewall*.

### Menyiapkan Endpoint SSE di Express

Untuk membuat *endpoint* SSE di Express, Anda perlu mengatur *header* HTTP spesifik untuk menjaga koneksi tetap hidup (*keep-alive*) dan menunjukkan bahwa respons akan berupa aliran *event* (*event stream*).

Header yang diperlukan adalah:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

Setelah *header* dikirim, Anda dapat menulis data ke objek respons kapan saja. Data harus diformat dengan cara tertentu, biasanya dimulai dengan `data:` dan diakhiri dengan dua karakter baris baru (`newline`) `\n\n`.

### Mengelola Koneksi Klien

Karena koneksi SSE berumur panjang, server perlu melacak koneksi yang aktif jika ingin melakukan *broadcast* pesan ke beberapa klien secara bersamaan. Anda juga perlu mendengarkan *event* `close` pada objek *request* untuk membersihkan memori dan *resource* saat klien terputus.

## Contoh / Ilustrasi

### 1. Setup Server Express.js

Berikut adalah contoh server Express yang mengimplementasikan *endpoint* SSE:

```javascript
const express = require('express');
const app = express();

// Menyimpan daftar klien yang terhubung
let clients = [];

// Middleware untuk endpoint SSE
app.get('/events', (req, res) => {
  // 1. Set header yang dibutuhkan
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 2. Kirim pesan koneksi awal
  res.write('data: {"message": "Terhubung ke stream SSE"}\n\n');

  // 3. Tambahkan objek respons klien ke array pelacakan
  clients.push(res);

  // 4. Tangani saat klien terputus
  req.on('close', () => {
    console.log('Klien terputus');
    clients = clients.filter(client => client !== res);
  });
});

// Endpoint untuk memicu broadcast ke semua klien
app.post('/broadcast', (req, res) => {
  const timestamp = new Date().toISOString();
  const eventData = JSON.stringify({ event: 'Update', time: timestamp });

  // Iterasi semua klien yang terhubung dan kirim data
  clients.forEach(client => {
    client.write(`data: ${eventData}\n\n`);
  });

  res.status(200).json({ success: true, message: 'Broadcast terkirim' });
});

app.listen(3000, () => {
  console.log('Server SSE berjalan di http://localhost:3000');
});
```

### 2. JavaScript Sisi Klien

Di sisi *frontend*, mengonsumsi SSE sangatlah mudah menggunakan API bawaan `EventSource`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Klien SSE</title>
</head>
<body>
  <h1>Demo Server-Sent Events</h1>
  <div id="messages"></div>

  <script>
    // Terhubung ke endpoint SSE
    const eventSource = new EventSource('/events');

    // Dengarkan pesan yang masuk
    eventSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      const messageDiv = document.getElementById('messages');
      const newElement = document.createElement('p');
      newElement.textContent = JSON.stringify(data);
      messageDiv.appendChild(newElement);
    };

    // Tangani error koneksi
    eventSource.onerror = function(error) {
      console.error('Error SSE:', error);
      // Browser secara otomatis mencoba untuk terhubung kembali!
    };
  </script>
</body>
</html>
```

## Insight Penting

- **Komunikasi Satu Arah:** SSE secara ketat dari server ke klien. Jika Anda membutuhkan komunikasi *real-time* dua arah (misalnya, aplikasi *chat* di mana klien juga sering mengirim pesan kecil), WebSockets adalah pilihan yang lebih baik.
- **Batasan Koneksi:** Browser secara tradisional membatasi jumlah koneksi SSE bersamaan ke domain yang sama (biasanya 6). Ini adalah pertimbangan penting untuk aplikasi kompleks. HTTP/2 sangat memitigasi batasan ini melalui *multiplexing*.
- **Koneksi Ulang Otomatis:** Salah satu keuntungan terbesar API `EventSource` dibandingkan WebSockets mentah adalah browser menangani koneksi ulang secara otomatis jika koneksi terputus.
- **Format Berbasis Teks:** SSE dirancang untuk data teks (UTF-8). Jika Anda perlu mengirim data biner, Anda perlu mengenkodenya (misalnya, Base64), yang menambah beban memori. WebSockets mendukung *frame* biner secara bawaan (*native*).

## Ringkasan Akhir

- Server-Sent Events (SSE) menyediakan cara standar yang sederhana untuk melakukan *streaming* pembaruan *real-time* dari server Express ke klien web melalui HTTP standar.
- Menyiapkan SSE di Express melibatkan pengaturan *header* HTTP spesifik (`text/event-stream`, `keep-alive`) dan menulis *string* data yang diformat ke objek respons seiring berjalannya waktu.
- API `EventSource` di sisi klien membuat proses konsumsi aliran data ini menjadi mudah dan menyertakan logika koneksi ulang otomatis bawaan.
- SSE ideal untuk aliran data satu arah seperti notifikasi atau dasbor langsung, berfungsi sebagai alternatif ringan untuk WebSockets.

## Langkah Belajar Berikutnya

- Pelajari implementasi WebSockets dengan `Socket.io` di Express untuk memahami perbedaan antara SSE dan komunikasi *real-time* dua arah.
- Pelajari cara mengintegrasikan SSE dengan *message broker* seperti Redis untuk menskalakan koneksi SSE Anda melintasi beberapa instans server Express.
- Baca tentang HTTP/2 di Node.js, karena *multiplexing* HTTP/2 secara signifikan meningkatkan performa dan skalabilitas SSE.

## Metadata

- Level: Menengah
- Topik utama: Komunikasi Real-Time
- Topik terkait: WebSockets, Protokol HTTP, Background Jobs
- Kata kunci: Server-Sent Events, SSE, EventSource, Express JS, Real-Time, Streaming
- Estimasi waktu baca: 15 menit
