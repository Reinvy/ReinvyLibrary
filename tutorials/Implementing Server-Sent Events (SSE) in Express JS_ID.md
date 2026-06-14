# Implementasi Server-Sent Events (SSE) di Express JS

## Ringkasan Singkat

Server-Sent Events (SSE) adalah protokol ringan yang memungkinkan server untuk mendorong pembaruan data secara real-time ke klien melalui satu koneksi HTTP. Tutorial ini menjelaskan cara mengimplementasikan SSE dalam aplikasi Express.js, serta membahas keuntungannya dibandingkan WebSockets untuk aliran data searah (one-way data streams).

## Untuk Siapa Materi Ini

Developer Node.js dan Express.js tingkat menengah yang perlu mengalirkan data real-time dari server ke klien tanpa kompleksitas koneksi dua arah seperti yang dibutuhkan oleh WebSockets.

## Prasyarat

- Pemahaman dasar tentang routing dan penanganan request di Express.js.
- Keakraban dengan protokol HTTP, headers, dan arsitektur client-server.
- Pengetahuan dasar tentang pemrograman asinkron JavaScript.

## Tujuan Belajar

- Memahami apa itu Server-Sent Events (SSE) dan bagaimana perbedaannya dengan WebSockets.
- Mempelajari cara mengonfigurasi header Express.js untuk mendukung SSE.
- Mengimplementasikan contoh praktis untuk mendorong pembaruan langsung (live updates) dari server ke klien.
- Mengidentifikasi kasus penggunaan terbaik untuk SSE dan keterbatasannya.

## Konteks dan Motivasi

Dalam aplikasi web modern, fitur real-time seperti skor olahraga langsung, ticker saham, atau feed notifikasi sangatlah penting. Meskipun WebSockets sering menjadi solusi utama untuk komunikasi real-time, mereka bisa berlebihan (overkill) jika klien hanya perlu *menerima* data. Server-Sent Events (SSE) menyediakan standar berbasis HTTP yang lebih sederhana untuk aliran event searah (dari server ke klien), menawarkan fitur rekoneksi otomatis dan pelacakan ID event sebagai bawaan.

## Materi Inti

### Apa itu Server-Sent Events?

SSE adalah standar yang menjelaskan bagaimana server dapat memulai transmisi data ke arah klien setelah koneksi awal klien dibuat. Mereka umumnya digunakan untuk mengirim pembaruan pesan atau aliran data kontinu ke klien browser dan dirancang untuk meningkatkan streaming bawaan lintas browser.

### Mengapa menggunakan SSE daripada WebSockets?

- **Kesederhanaan:** Beroperasi di atas HTTP tradisional, yang berarti dengan mudah melewati firewall dan proxy tanpa konfigurasi khusus.
- **Searah (Unidirectional):** Ideal saat server menghasilkan data dan klien hanya mengonsumsinya.
- **Fitur Bawaan:** Browser secara otomatis mencoba menghubungkan kembali jika koneksi terputus, dan mendukung pelacakan ID event terakhir (last-event-IDs).
- **Overhead:** Memiliki overhead yang lebih kecil daripada WebSockets untuk skenario dorongan server (server-push) yang sederhana.

### Mengimplementasikan SSE di Express.js

Untuk membuat koneksi SSE, server harus merespons permintaan klien dengan header HTTP tertentu:

- `Content-Type: text/event-stream`: Memberi tahu klien untuk mengharapkan aliran event.
- `Cache-Control: no-cache`: Mencegah proxy perantara atau browser dari melakukan caching pada aliran.
- `Connection: keep-alive`: Menginstruksikan server dan klien untuk membiarkan koneksi tetap terbuka.

Setelah header diatur, server dapat mengirim data menggunakan metode `res.write()`. Data harus mengikuti format tertentu, biasanya dimulai dengan `data:`, diikuti oleh payload, dan diakhiri dengan dua karakter baris baru (`\n\n`).

### Mengelola Koneksi

Karena koneksi SSE berumur panjang (long-lived), sangat penting untuk menangani pemutusan klien dengan baik untuk menghindari kebocoran memori. Anda harus mendengarkan event `close` dari request dan membersihkan interval atau resource terkait.

## Contoh / Ilustrasi

Berikut adalah contoh lengkap menyiapkan endpoint SSE sederhana di Express.js yang mengirimkan waktu server saat ini setiap detik.

### Sisi Server (Express.js)

```javascript
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/events', (req, res) => {
  // 1. Atur header yang diperlukan untuk SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Opsional: Flush header segera (berguna untuk beberapa proxy)
  res.flushHeaders();

  // 2. Kirim pesan koneksi awal
  res.write('data: {"message": "Terkoneksi ke stream SSE"}\n\n');

  // 3. Siapkan interval untuk mengirim data secara berkala
  const intervalId = setInterval(() => {
    const timeString = new Date().toLocaleTimeString();
    // Data harus diformat sebagai 'data: <konten>\n\n'
    res.write(`data: {"time": "${timeString}"}\n\n`);
  }, 1000);

  // 4. Tangani pemutusan klien untuk mencegah kebocoran memori
  req.on('close', () => {
    console.log('Klien terputus');
    clearInterval(intervalId);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`Server mendengarkan di port ${PORT}`);
});
```

### Sisi Klien (HTML/JavaScript)

Untuk mengonsumsi stream ini di frontend, Anda menggunakan API `EventSource` bawaan.

```html
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Klien SSE</title>
</head>
<body>
    <h1>Waktu Server: <span id="time">Menunggu...</span></h1>

    <script>
        // Terhubung ke endpoint SSE
        const eventSource = new EventSource('/events');

        eventSource.onmessage = function(event) {
            // Parsing data JSON yang masuk
            const parsedData = JSON.parse(event.data);

            if (parsedData.time) {
                document.getElementById('time').innerText = parsedData.time;
            }
        };

        eventSource.onerror = function(error) {
            console.error("EventSource gagal:", error);
            // Browser akan secara otomatis mencoba menghubungkan kembali
        };
    </script>
</body>
</html>
```

## Insight Penting

- **Batas Koneksi:** Browser biasanya membatasi jumlah koneksi SSE bersamaan ke satu domain (seringkali 6). Untuk aplikasi yang membutuhkan banyak stream simultan, pertimbangkan untuk menggunakan multiplexing HTTP/2, yang mengurangi batas ini.
- **Format Data:** Selalu pastikan string payload Anda dimulai dengan `data:` dan diakhiri dengan `\n\n`. Anda juga dapat menentukan tipe event menggunakan `event: <tipe>\n` sebelum baris data.
- **Proxy dan Timeout:** Beberapa load balancer atau proxy (seperti Nginx) mungkin menyangga (buffer) respons atau menjatuhkan koneksi yang diam. Anda mungkin perlu mengonfigurasi proxy buffering (`proxy_buffering off;` di Nginx) atau mengimplementasikan ping "heartbeat" (komentar kosong seperti `:\n\n`) untuk menjaga koneksi tetap hidup.
- **Lalu Lintas Searah:** Ingat, jika klien perlu mengirim data kembali ke server, ia harus menggunakan permintaan AJAX/fetch standar di samping stream SSE.

## Ringkasan Akhir

- SSE menyediakan cara standar yang sederhana untuk mengalirkan data dari server ke klien melalui koneksi HTTP standar.
- Membutuhkan pengaturan header spesifik (`text/event-stream`, `keep-alive`, `no-cache`).
- Secara signifikan lebih sederhana untuk diimplementasikan daripada WebSockets untuk aliran data searah dan mencakup fitur browser bawaan seperti rekoneksi otomatis.
- Pembersihan yang tepat (mendengarkan event `close`) sangat vital untuk mencegah kebocoran memori di server.

## Langkah Belajar Berikutnya

- Real-Time Communication in Express with Socket.IO (Untuk memahami alternatif dua arah).
- Scaling Express JS Applications (Untuk mempelajari cara menangani banyak koneksi berumur panjang yang bersamaan).
- Rate Limiting and API Throttling in Express JS (Untuk melindungi endpoint SSE Anda).

## Metadata

- Level: Menengah
- Topik utama: Real-Time Communication
- Topik terkait: Express.js, Protokol HTTP, Event Streams
- Kata kunci: express js, sse, server sent events, real-time, event-stream
- Estimasi waktu baca: 10 menit
