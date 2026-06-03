# Implementing Server-Sent Events (SSE) in Express JS

## Ringkasan Singkat

Artikel ini menjelaskan cara mengimplementasikan Server-Sent Events (SSE) dalam aplikasi Express JS. Anda akan mempelajari mekanisme untuk mendorong pembaruan secara real-time dari server ke klien melalui koneksi HTTP tunggal, menjadikannya alternatif yang ringan dan sangat baik dibandingkan WebSockets untuk aliran data searah (unidirectional).

---

## Untuk Siapa Materi Ini

* **Target pembaca:** Backend developer dan full-stack engineer yang membutuhkan fitur real-time dalam aplikasi mereka.
* **Level pembaca:** Menengah (Intermediate).

---

## Prasyarat

Sebelum membaca materi ini, disarankan untuk memiliki pemahaman yang kuat tentang:

* Dasar Routing dan Middleware di Express (Basic Routing and Middleware in Express).
* Siklus Hidup Request di Express JS (Understanding the Express JS Request Lifecycle).
* Fundamental protokol HTTP (khususnya koneksi persisten).

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Perbedaan antara Server-Sent Events dengan WebSockets dan long-polling.
* Cara mengonfigurasi route Express untuk membuat dan mempertahankan koneksi SSE.
* Cara mengirim aliran kejadian (event streams) yang diformat ke klien.
* Kapan harus memilih SSE dibandingkan protokol komunikasi real-time lainnya.

---

## Konteks dan Motivasi

Dalam aplikasi web modern, klien sering membutuhkan pembaruan waktu nyata (real-time) dari server. Skenario umum termasuk feed berita langsung, ticker harga saham, indikator progres untuk pekerjaan latar belakang, dan sistem notifikasi. Meskipun WebSockets menyediakan komunikasi full-duplex (dua arah), hal itu bisa jadi berlebihan (overkill) untuk aplikasi di mana data hanya perlu mengalir dari server ke klien.

Server-Sent Events (SSE) menyediakan solusi berbasis HTTP standar yang lebih sederhana untuk komunikasi searah. Karena SSE berjalan di atas HTTP standar, ia terintegrasi secara mulus dengan infrastruktur yang ada, dengan mudah melewati firewall dan proxy, serta memanfaatkan multiplexing HTTP/2. Memahami SSE memberdayakan developer untuk membangun sistem real-time yang efisien tanpa overhead dan kompleksitas mengelola WebSockets ketika fitur dua arah tidak diperlukan.

---

## Materi Inti

### 1. Memahami Protokol SSE

SSE dibangun di atas HTTP standar. Ketika klien meminta endpoint SSE, server merespons dengan header tertentu yang memberi tahu klien untuk tetap membuka koneksi. Server kemudian melakukan streaming data teks dalam format tertentu (`text/event-stream`).

### 2. Mengatur Header HTTP yang Tepat

Untuk memulai koneksi SSE, route Express Anda harus mengatur header berikut:

* `Content-Type: text/event-stream`: Ini memberi tahu browser untuk mengharapkan aliran data (stream of events).
* `Cache-Control: no-cache`: Ini mencegah proxy dan browser dari caching aliran event.
* `Connection: keep-alive`: Ini memastikan koneksi TCP tetap terbuka.

### 3. Memformat Pesan SSE

Pesan yang dikirim melalui SSE harus mengikuti format berbasis teks yang ketat. Setiap pesan terdiri dari bidang (fields), diikuti oleh baris baru, dan seluruh pesan diakhiri dengan baris baru ganda (`\n\n`).
Bidang umum meliputi:

* `data`: Payload aktual (sering berupa string JSON).
* `event`: (Opsional) Jenis event. Jika diabaikan, secara default adalah "message".
* `id`: (Opsional) Pengenal unik untuk event, berguna untuk menghubungkan kembali.
* `retry`: (Opsional) Waktu koneksi ulang (dalam milidetik) yang harus digunakan klien jika koneksi terputus.

### 4. Menangani Pemutusan Klien (Client Disconnects)

Karena koneksi SSE persisten, sangat penting untuk menangani skenario di mana klien menutup koneksi (misalnya, menutup tab browser). Anda harus mendengarkan event `close` pada objek `req` untuk berhenti mengirim data dan membersihkan interval atau sumber daya apa pun, mencegah kebocoran memori (memory leaks).

---

## Contoh / Ilustrasi

Di bawah ini adalah contoh lengkap dari pengaturan endpoint SSE di Express dan mensimulasikan aliran data yang berkelanjutan (misalnya, detak waktu sederhana).

### Kode Server-Side (Express)

```javascript
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/events', (req, res) => {
  // 1. Mengatur header untuk SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // 2. Mengirim payload awal
  res.write('data: {"message": "Terhubung ke stream SSE"}\n\n');

  // 3. Mensimulasikan pembaruan data berkala
  const intervalId = setInterval(() => {
    const payload = JSON.stringify({ time: new Date().toISOString() });
    // Menulis data mengikuti persyaratan format SSE
    res.write(`data: ${payload}\n\n`);
  }, 2000); // Mengirim data setiap 2 detik

  // 4. Menangani pemutusan klien
  req.on('close', () => {
    console.log('Klien terputus dari SSE');
    clearInterval(intervalId); // Membersihkan interval untuk menghindari memory leaks
    res.end(); // Mengakhiri proses respons
  });
});

app.listen(PORT, () => {
  console.log(`Server mendengarkan di http://localhost:${PORT}`);
});
```

### Kode Client-Side (Browser)

Di sisi klien, Anda menggunakan API bawaan `EventSource` untuk mengonsumsi stream.

```javascript
// Menghubungkan ke endpoint SSE
const eventSource = new EventSource('http://localhost:3000/events');

// Mendengarkan pesan standar
eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Menerima pembaruan waktu:', data.time);
};

// Menangani kesalahan koneksi
eventSource.onerror = function(error) {
  console.error('Kesalahan SSE:', error);
  // EventSource secara otomatis mencoba untuk terhubung kembali!
};
```

---

## Insight Penting

* **Sifat Searah (Unidirectional):** SSE secara ketat adalah dari server ke klien. Jika aplikasi Anda membutuhkan komunikasi klien ke server dengan latensi rendah dan sering, WebSockets (`Real-Time Communication in Express with Socket.IO_ID.md`) adalah pilihan yang tepat.
* **Batas Koneksi:** Di HTTP/1.1, browser biasanya membatasi jumlah koneksi SSE aktif ke domain yang sama (biasanya 6). Batasan ini hampir dihilangkan jika Anda menggunakan HTTP/2.
* **Koneksi Ulang Otomatis:** Salah satu keuntungan terbesar dari API `EventSource` adalah secara otomatis menangani koneksi ulang (reconnection). Server juga dapat mendikte interval percobaan ulang dengan mengirimkan bidang `retry: <milidetik>`.
* **Kebocoran Sumber Daya (Resource Leaks):** Lupa mendengarkan `req.on('close')` dan gagal membersihkan interval atau menghapus event listener adalah sumber umum kebocoran memori pada aplikasi Express yang menggunakan SSE.
* **Konfigurasi Proxy:** Jika Anda menggunakan Nginx atau reverse proxy lainnya, Anda mungkin perlu mematikan buffering secara eksplisit untuk endpoint SSE Anda (misalnya, `proxy_buffering off;` di Nginx) sehingga pesan dikirim ke klien segera dan tidak tertahan di buffer.

---

## Ringkasan Akhir

* SSE adalah teknologi standar berbasis HTTP untuk mendorong pembaruan real-time dari server ke klien.
* Ini mengharuskan pengaturan header tertentu (`Content-Type: text/event-stream`, `Connection: keep-alive`).
* Pesan harus diformat sebagai teks biasa, diawali dengan `data:`, dan diakhiri dengan baris baru ganda (`\n\n`).
* Developer harus dengan teliti menangani event `req.on('close')` untuk melakukan pembersihan dan mencegah kebocoran memori.
* SSE ideal untuk aliran data searah, menghindari kompleksitas yang ada pada WebSockets.

---

## Langkah Belajar Berikutnya

* Jelajahi komunikasi dua arah real-time dalam **Real-Time Communication in Express with Socket.IO_ID.md**.
* Pelajari cara mengimplementasikan message queues untuk memicu pembaruan SSE dalam **Handling Background Jobs in Express JS with BullMQ and Redis_ID.md**.
* Pelajari topik lanjutan dalam **Deploying Express JS Applications to Production_ID.md** untuk memahami cara menangani koneksi persisten di belakang load balancer.

---

## Metadata

* **Level:** Menengah (Intermediate)
* **Topik utama:** Real-Time Communication
* **Topik terkait:** WebSockets, Protokol HTTP, Express Routing
* **Kata kunci:** Server-Sent Events, SSE, EventSource, Real-time, Express JS, Streaming
* **Estimasi waktu baca:** 10 menit
