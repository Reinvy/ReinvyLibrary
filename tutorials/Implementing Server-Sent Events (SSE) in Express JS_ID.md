# Implementasi Server-Sent Events (SSE) di Express JS

## Ringkasan Singkat

Materi ini membahas Server-Sent Events (SSE), sebuah teknologi untuk membangun koneksi *real-time* satu arah dari *server* ke *client*. Anda akan belajar cara membuat *endpoint* SSE di Express.js, mengirimkan pembaruan data secara *streaming* ke *client*, dan memahami kapan harus menggunakan SSE dibandingkan dengan WebSockets.

---

## Untuk Siapa Materi Ini

- **Target pembaca:** *Backend developer* dan *full-stack developer*.
- **Level pembaca:** Menengah (*Intermediate*).

---

## Prasyarat

- Pemahaman dasar tentang *routing* di Express.js.
- Pengetahuan tentang siklus *request/response* pada HTTP.
- Familiar dengan konsep dasar komunikasi *real-time*.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

- Konsep dan cara kerja Server-Sent Events.
- Cara mengimplementasikan *endpoint* SSE pada aplikasi Express.js.
- Cara menangani koneksi dan diskoneksi *client* dengan benar untuk mencegah kebocoran memori.
- Perbandingan antara SSE dan WebSockets untuk menentukan arsitektur yang tepat.

---

## Konteks dan Motivasi

Dalam aplikasi modern, pengguna sering mengharapkan pembaruan data secara *real-time*—seperti skor olahraga langsung, *ticker* harga saham, atau notifikasi. Meskipun WebSockets menyediakan komunikasi dua arah (*full-duplex*), teknologi tersebut bisa menjadi berlebihan untuk skenario di mana *server* hanya perlu mendorong (*push*) data ke *client*. Server-Sent Events (SSE) menawarkan solusi yang lebih sederhana, ringan, dan berbasis HTTP *native* untuk komunikasi *real-time* satu arah. Memahami SSE memungkinkan *developer* untuk membangun fitur *real-time* yang efisien tanpa *overhead* dari WebSockets.

---

## Materi Inti

### Apa itu Server-Sent Events (SSE)?

Server-Sent Events (SSE) adalah standar *web* yang memungkinkan *browser* menerima pembaruan otomatis dari *server* melalui koneksi HTTP. Berbeda dengan *polling*, di mana *client* berulang kali meminta data, SSE menjaga satu koneksi HTTP tetap terbuka, dan *server* mendorong data baru kapan pun data tersebut tersedia.

### Bagaimana SSE Bekerja dalam HTTP

SSE bekerja di atas protokol HTTP standar. *Server* merespons dengan `Content-Type` spesifik yaitu `text/event-stream`. Kemudian, *server* menjaga koneksi tetap terbuka menggunakan `Connection: keep-alive` dan mengirimkan data teks secara *streaming* dengan format tertentu (`data: ... \n\n`).

### Mengelola Koneksi di Express.js

Untuk mengimplementasikan SSE di Express.js, Anda perlu:

1. Mengatur *header* HTTP yang tepat pada objek *response*.
2. Menulis data ke *stream response* tanpa menutupnya (`res.write()`).
3. Menangani *event* `close` pada objek *request* untuk membersihkan sumber daya (*resources*) ketika *client* terputus.

---

## Contoh / Ilustrasi

### Implementasi Dasar SSE di Express.js

Berikut adalah contoh sederhana cara mengimplementasikan *endpoint* SSE di Express.js yang mengirimkan *timestamp* setiap detik.

```javascript
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/events', (req, res) => {
  // 1. Atur header yang diperlukan untuk SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Flush headers segera jika menggunakan middleware kompresi (opsional)
  if (res.flushHeaders) {
    res.flushHeaders();
  }

  // 2. Kirim pesan awal
  res.write('data: Terhubung ke stream SSE\n\n');

  // 3. Buat interval untuk mengirim data secara berkala
  const intervalId = setInterval(() => {
    const time = new Date().toLocaleTimeString();
    res.write(`data: ${JSON.stringify({ time })}\n\n`);
  }, 1000);

  // 4. Tangani saat client terputus (disconnect)
  req.on('close', () => {
    console.log('Client terputus dari SSE');
    clearInterval(intervalId);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`Server SSE berjalan di http://localhost:${PORT}`);
});
```

### Mengonsumsi SSE di Sisi Client

Pada sisi *frontend*, Anda dapat menggunakan API bawaan `EventSource` untuk mendengarkan *stream* SSE.

```javascript
// Jalankan ini di console browser atau script sisi client
const eventSource = new EventSource('http://localhost:3000/events');

eventSource.onmessage = function(event) {
  console.log('Pesan baru dari server:', event.data);
};

eventSource.onerror = function(error) {
  console.error('Error SSE:', error);
  eventSource.close(); // Hentikan percobaan ulang (retry) saat terjadi error
};
```

---

## Insight Penting

### SSE vs WebSockets

- **Arah Komunikasi:** SSE bersifat satu arah (*Server* ke *Client*). WebSockets bersifat dua arah.
- **Protokol:** SSE menggunakan HTTP/1.1 atau HTTP/2 standar, yang berarti dapat bekerja dengan lancar bersama *load balancer* dan *firewall* korporat yang sudah ada. WebSockets menggunakan protokol kustom (ws:// atau wss://) yang diawali dengan HTTP Upgrade.
- **Fitur Bawaan:** API `EventSource` di *browser* secara otomatis menangani koneksi ulang (*automatic reconnection*). WebSockets membutuhkan implementasi logika koneksi ulang secara manual.
- **Batas Koneksi:** Pada HTTP/1.1, *browser* biasanya membatasi jumlah koneksi SSE terbuka ke satu *domain* (biasanya maksimal 6). Batasan ini hilang saat menggunakan HTTP/2, di mana koneksi dapat di-*multiplex*.

### Menangani Diskoneksi dan Kebocoran Memori

Sangat penting untuk mendengarkan *event* `req.on('close')` pada *route* Express.js Anda. Jika Anda tidak membersihkan *interval* atau menghapus *event listener* saat *client* terputus, *server* Anda akan terus mengeksekusi kode untuk koneksi "hantu", yang dengan cepat akan menyebabkan kebocoran memori (*memory leak*) dan kehabisan daya CPU.

---

## Ringkasan Akhir

- Server-Sent Events (SSE) menyediakan metode berbasis HTTP yang sederhana untuk komunikasi *real-time* satu arah dari *server* ke *client*.
- Di Express.js, SSE diimplementasikan dengan mengatur *header* `text/event-stream` dan menjaga koneksi *response* tetap terbuka menggunakan `res.write()`.
- SSE seringkali lebih disukai daripada WebSockets untuk fitur seperti notifikasi langsung atau *feed* media sosial, di mana data hanya mengalir keluar dari *server*.
- Pembersihan sumber daya yang tepat pada *event* `close` adalah wajib untuk mencegah kebocoran memori.

---

## Langkah Belajar Berikutnya

- Pelajari "Real-Time Communication in Express with Socket.IO" untuk mempelajari komunikasi dua arah.
- Pelajari cara mengimplementasikan *message queue* (seperti Redis Pub/Sub) untuk men-*scale* SSE ke berbagai *instance server*.
- Telusuri HTTP/2 dan bagaimana kemampuan *multiplexing*-nya meningkatkan performa SSE.

---

## Metadata

- **Level:** Menengah
- **Topik utama:** Express.js, Real-Time Communication
- **Topik terkait:** SSE, WebSockets, HTTP, EventSource
- **Kata kunci:** server-sent events, sse, express real-time, komunikasi satu arah
- **Estimasi waktu baca:** 10 menit
