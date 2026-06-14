# Implementing Server-Sent Events (SSE) in Express JS

## Ringkasan Singkat

Materi ini menjelaskan cara mengimplementasikan Server-Sent Events (SSE) di Express JS untuk komunikasi real-time satu arah dari server ke klien. Anda akan mempelajari mekanisme SSE, cara mengatur header yang tepat, menangani pemutusan koneksi klien, dan memahami kapan harus memilih SSE dibandingkan WebSockets.

---

## Untuk Siapa Materi Ini

* **Target pembaca:** Developer backend dan full-stack yang bekerja dengan Node.js dan Express.
* **Level:** Menengah.

---

## Prasyarat

* Pemahaman kuat tentang JavaScript dan pemrograman asinkron.
* Pengetahuan dasar tentang membangun API dengan Express JS.
* Keakraban dengan konsep HTTP (header, koneksi persisten).

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Apa itu Server-Sent Events (SSE) dan bagaimana perbedaannya dengan WebSockets.
* Cara membuat koneksi SSE dalam route Express JS.
* Cara memformat dan mengirim stream data ke klien yang terhubung dengan benar.
* Cara menangani pemutusan koneksi klien untuk mencegah kebocoran memori.
* Praktik terbaik dan batasan penggunaan SSE di production.

---

## Konteks dan Motivasi

Dalam aplikasi web modern, pembaruan real-time sering kali diperlukan untuk fitur-fitur seperti notifikasi langsung, ticker harga saham, atau dashboard real-time. Meskipun WebSockets adalah pilihan populer untuk komunikasi real-time dua arah, penggunaannya bisa berlebihan untuk skenario di mana data hanya mengalir dari server ke klien.

Server-Sent Events (SSE) menyediakan alternatif berbasis HTTP asli yang lebih sederhana untuk aliran data real-time satu arah. SSE memanfaatkan koneksi HTTP standar, sehingga lebih mudah untuk di-deploy, diskalakan, dan diintegrasikan dengan infrastruktur yang ada (seperti load balancer dan API gateway) tanpa memerlukan pembaruan protokol terpisah. Memahami SSE menambah alat yang berharga dan ringan ke dalam toolkit developer Anda untuk fitur real-time.

---

## Materi Inti

### Apa itu Server-Sent Events (SSE)?

Server-Sent Events (SSE) adalah standar web yang memungkinkan browser menerima pembaruan otomatis dari server melalui koneksi HTTP. Setelah klien membuat koneksi, server membiarkannya terbuka dan mendorong (push) event ke klien setiap kali ada data baru yang tersedia.

### SSE vs WebSockets

Meskipun keduanya menyediakan kemampuan real-time, mereka melayani tujuan yang berbeda:

* **Arah:** WebSockets bersifat dua arah (klien dan server dapat mengirim dan menerima data kapan saja). SSE bersifat satu arah (server mengirim data ke klien).
* **Protokol:** WebSockets menggunakan protokol khusus (`ws://` atau `wss://`). SSE menggunakan HTTP standar (`http://` atau `https://`).
* **Kompleksitas:** SSE umumnya lebih mudah diimplementasikan baik di sisi server (hanya respons HTTP standar) maupun klien (menggunakan API `EventSource` bawaan browser).
* **Fitur:** SSE memiliki dukungan bawaan untuk penyambungan ulang (reconnection) otomatis dan ID event, yang tidak dimiliki WebSockets secara default.

### Membuat Koneksi SSE di Express

Untuk membuat endpoint SSE di Express, Anda harus mengatur header HTTP spesifik untuk memberi tahu klien bahwa respons akan berupa aliran event (event stream) dan menjaga koneksi tetap hidup:

* `Content-Type: text/event-stream`
* `Cache-Control: no-cache`
* `Connection: keep-alive`

### Memformat Data

SSE memerlukan format berbasis teks tertentu untuk mengirim pesan. Setiap pesan harus dimulai dengan `data:`, diikuti oleh payload data sebenarnya, dan diakhiri dengan newline ganda `\n\n`. Anda juga dapat menentukan nama dan ID event.

---

## Contoh / Ilustrasi

### 1. Implementasi Server SSE Dasar

Berikut adalah cara mengatur route Express sederhana yang mengirim stempel waktu (timestamp) server ke klien setiap detik menggunakan SSE.

```javascript
const express = require('express');
const app = express();

app.get('/api/stream', (req, res) => {
  // 1. Atur header SSE yang wajib
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // 2. Kirim pesan awal (opsional)
  res.write('data: {"message": "Koneksi berhasil dibuat"}\n\n');

  // 3. Siapkan interval untuk mendorong data secara berkala
  const intervalId = setInterval(() => {
    const data = {
      timestamp: new Date().toISOString(),
      status: 'aktif'
    };

    // Format pesan sesuai dengan spesifikasi SSE
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 1000);

  // 4. Tangani pemutusan koneksi klien
  req.on('close', () => {
    console.log('Klien terputus');
    clearInterval(intervalId);
    res.end();
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server mendengarkan pada port ${PORT}`);
});
```

### 2. Implementasi Sisi Klien (EventSource)

Untuk mengonsumsi stream ini di frontend, Anda menggunakan API `EventSource` bawaan yang ada di browser.

```javascript
// Hubungkan ke endpoint SSE
const eventSource = new EventSource('http://localhost:3000/api/stream');

// Dengarkan pesan
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Data diterima:', data.timestamp);
};

// Tangani error atau pemutusan koneksi
eventSource.onerror = (error) => {
  console.error('Error SSE:', error);
  // EventSource secara otomatis akan mencoba untuk menyambung kembali
};
```

---

## Insight Penting

* **Batasan Koneksi:** Browser menerapkan batasan ketat pada jumlah koneksi SSE yang berjalan bersamaan (concurrent) ke satu domain (secara historis 6 koneksi untuk HTTP/1.1). Jika aplikasi Anda memerlukan banyak stream, pertimbangkan untuk melakukan multiplexing atau melakukan upgrade ke HTTP/2, yang mendukung multiplexing melalui satu koneksi.
* **Menangani Pemutusan Koneksi (Memory Leaks):** Sangat penting untuk mendengarkan event `req.on('close')` di Express. Jika klien menavigasi pergi atau menutup browser, server harus membersihkan sumber daya (seperti `setInterval`, event listener, atau langganan database) yang terkait dengan koneksi tersebut untuk mencegah kebocoran memori (memory leak).
* **Firewall dan Proxy:** Beberapa firewall perusahaan, server proxy, atau load balancer mungkin mem-buffer respons HTTP atau secara agresif menutup koneksi yang berumur panjang. Anda mungkin perlu mengonfigurasi infrastruktur Anda (misalnya, Nginx) untuk menonaktifkan proxy buffering untuk endpoint SSE dan secara berkala mengirimkan komentar "ping" atau "heartbeat" (`: ping\n\n`) untuk menjaga koneksi tetap hidup.
* **Keterbatasan Format Data:** SSE hanya mendukung pengiriman data teks UTF-8. Jika Anda perlu mengirim data biner (seperti gambar atau file secara real-time), WebSockets mungkin merupakan pilihan yang lebih baik, atau Anda perlu mengenkode data biner ke Base64, yang akan menambah overhead.

---

## Ringkasan Akhir

* Server-Sent Events (SSE) menawarkan solusi HTTP asli yang sederhana untuk komunikasi real-time satu arah dari server ke klien.
* SSE sangat ideal untuk live dashboard, notifikasi, dan feed di mana klien tidak perlu mengirim data frekuensi tinggi kembali ke server.
* Implementasi Express memerlukan header khusus (`text/event-stream`) dan pemformatan pesan yang ketat (`data: ... \n\n`).
* Pembersihan sumber daya saat klien terputus (`req.on('close')`) wajib dilakukan untuk menjaga aplikasi tetap sehat dan dapat diskalakan.

---

## Langkah Belajar Berikutnya

* **Real-Time Communication in Express with Socket.IO:** Pelajari WebSockets untuk komunikasi dua arah.
* **Handling Background Jobs in Express JS with BullMQ and Redis:** Pelajari cara menggunakan SSE untuk memberi tahu klien tentang status tugas latar belakang yang berjalan lama.
* **Skalabilitas Aplikasi Real-Time:** Selidiki cara menskalakan SSE di beberapa instance server Express menggunakan Redis Pub/Sub.

---

## Metadata

* Level: Menengah
* Topik utama: Real-Time Communication
* Topik terkait: Event Stream, Express Routing, Performance
* Kata kunci: SSE, Server-Sent Events, EventSource, Express real-time, push notifications
* Estimasi waktu baca: 15 menit
