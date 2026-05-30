# Implementasi Server-Sent Events (SSE) di Express JS

## Ringkasan Singkat

Server-Sent Events (SSE) adalah protokol ringan yang memungkinkan server mendorong (*push*) pembaruan *real-time* ke klien web melalui satu koneksi HTTP. Tutorial ini menjelaskan cara mengimplementasikan SSE di aplikasi Express.js, memungkinkan Anda membangun fitur *real-time* seperti *live feed*, notifikasi, dan *dashboard* tanpa kerumitan menggunakan WebSockets.

## Untuk Siapa Materi Ini

Materi ini dirancang untuk pengembang *backend* tingkat menengah hingga lanjut yang sudah familier dengan Express.js dan ingin mempelajari metode yang lugas untuk melakukan *streaming* data dari server ke klien.

## Prasyarat

- Pemahaman dasar tentang *routing* dan *middleware* di Express.js.
- Keakraban dengan *header* HTTP dan arsitektur *client-server*.
- Pemahaman tentang pemrograman asinkronus di Node.js.

## Tujuan Belajar

- Memahami apa itu Server-Sent Events dan kapan harus menggunakannya dibandingkan WebSockets atau *long polling*.
- Mempelajari cara mengonfigurasi *route* Express.js untuk mengirimkan SSE.
- Memahami *header* HTTP yang diperlukan untuk SSE (`Content-Type: text/event-stream`).
- Mempelajari cara memformat dan mendorong kejadian (*events*) data ke klien.
- Mengetahui cara menangani pemutusan klien dengan anggun untuk menghindari kebocoran memori (*memory leaks*).

## Konteks dan Motivasi

Dalam aplikasi web modern, data *real-time* sangat penting untuk fitur seperti skor olahraga langsung, *ticker* pasar saham, atau *dashboard* status sistem. Meskipun WebSockets menyediakan komunikasi *full duplex* (dua arah), hal tersebut bisa jadi berlebihan (*overkill*) jika klien hanya perlu *menerima* pembaruan dari server. Server-Sent Events (SSE) menawarkan standar bawaan peramban (*browser*) yang lebih sederhana untuk komunikasi *real-time* satu arah (server-ke-klien) menggunakan standar HTTP. SSE lebih mudah disiapkan, bekerja dengan baik melalui HTTP/2 standar, dan secara otomatis menangani penyambungan ulang (*reconnection*) di peramban.

## Materi Inti

### Memahami Server-Sent Events

SSE bekerja dengan cara klien membuka koneksi HTTP, lalu server menjaga koneksi tersebut tetap terbuka, mengirimkan kembali aliran data tekstual yang diformat dengan cara tertentu.

### Langkah 1: Menyiapkan Route Express

Untuk mengaktifkan SSE, server harus merespons dengan *header* tertentu agar memberi tahu klien bahwa mereka harus mengharapkan aliran kejadian (*event stream*) alih-alih respons JSON standar yang hanya sekali jalan.

*Header* yang esensial adalah:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

### Langkah 2: Memformat Data

Data yang dikirim melalui SSE harus mengikuti format yang ketat. Setiap kejadian harus diawali dengan `data:`, diikuti oleh *payload*, dan diakhiri dengan dua karakter baris baru (`\n\n`). Jika Anda mengirimkan JSON, Anda harus mengubahnya menjadi *string* (`stringify`).

### Langkah 3: Menangani Pemutusan

Karena koneksi dibiarkan terbuka terus-menerus, sangat penting untuk mendengarkan kejadian `close` pada objek permintaan (`req`) klien. Saat klien terputus (misalnya, menutup *tab* peramban), server harus berhenti mencoba mengirim data dan membersihkan sumber daya apa pun (seperti *interval* atau *event listener*) untuk mencegah kebocoran memori.

## Contoh / Ilustrasi

Berikut adalah contoh lengkap dan minimalis dari server Express.js yang mengimplementasikan sebuah *endpoint* SSE untuk mengirimkan stempel waktu (*timestamp*) ke klien setiap 2 detik.

```javascript
const express = require('express');
const app = express();

app.get('/events', (req, res) => {
  // 1. Tetapkan header yang diperlukan untuk SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Opsional: Kirim event awal untuk memberi tahu klien bahwa koneksi telah dibuat
  res.write('data: {"message": "Terhubung ke stream SSE"}\n\n');

  // 2. Siapkan interval untuk mendorong data ke klien secara berkala
  const intervalId = setInterval(() => {
    const data = {
      time: new Date().toISOString(),
      status: 'active'
    };

    // 3. Tulis data mengikuti format SSE yang spesifik
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 2000);

  // 4. Tangani pemutusan klien
  req.on('close', () => {
    console.log('Klien terputus, menghentikan stream.');
    clearInterval(intervalId);
    res.end();
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
```

Untuk mengujinya di sisi klien, sebuah berkas HTML sederhana dapat menggunakan API `EventSource` bawaan:

```html
<!DOCTYPE html>
<html>
<body>
  <h2>Contoh Server-Sent Events</h2>
  <div id="result"></div>

  <script>
    if(typeof(EventSource) !== "undefined") {
      const source = new EventSource("http://localhost:3000/events");

      source.onmessage = function(event) {
        document.getElementById("result").innerHTML += event.data + "<br>";
      };
    } else {
      document.getElementById("result").innerHTML = "Maaf, peramban Anda tidak mendukung server-sent events...";
    }
  </script>
</body>
</html>
```

## Insight Penting

- **Komunikasi Satu Arah:** SSE secara ketat adalah server-ke-klien. Jika Anda memerlukan klien untuk terus mengirim pembaruan cepat ke server (seperti dalam gim *multiplayer* atau aplikasi obrolan), gunakan WebSockets.
- **Batas Koneksi:** Pada peramban lama (HTTP/1.1), ada batasan ketat pada jumlah koneksi konkuren yang terbuka ke domain yang sama (biasanya 6). Jika pengguna membuka banyak *tab*, mereka mungkin akan menghabiskan batas ini. Multiplexing HTTP/2 memecahkan masalah ini, memungkinkan banyak *stream* SSE melalui satu koneksi.
- **Penyambungan Ulang Otomatis:** API `EventSource` peramban secara otomatis mencoba menyambung kembali jika koneksi terputus. Anda dapat mengontrol waktu tunggu penyambungan ulang dengan mengirimkan kejadian `retry: <milliseconds>\n\n` dari server.
- **Hanya Teks:** SSE hanya mendukung data teks UTF-8. Data biner harus dienkode base64.
- **Manajemen State:** Karena koneksinya berumur panjang, menskalakan SSE di beberapa instans server biasanya memerlukan mekanisme Pub/Sub (seperti Redis) sehingga kejadian yang dihasilkan di satu server dapat disiarkan ke klien yang terhubung ke server lain.

## Ringkasan Akhir

- Server-Sent Events (SSE) menyediakan mekanisme berbasis HTTP yang sederhana untuk mendorong pembaruan *real-time* dari server Express.js ke klien.
- SSE mengharuskan pengaturan *header*: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, dan `Connection: keep-alive`.
- Data harus diformat dengan benar, diawali dengan `data:` dan diakhiri dengan `\n\n`.
- Selalu tangani kejadian `req.on('close')` untuk membersihkan *interval* dan *listener* saat klien terputus, memastikan server Anda tetap berkinerja dan bebas dari kebocoran memori.

## Langkah Belajar Berikutnya

- "Real-Time Communication in Express with Socket.IO" (untuk membandingkan SSE dengan komunikasi dua arah WebSocket).
- "Handling Background Jobs in Express JS with BullMQ and Redis" (untuk mempelajari cara memberi tahu klien melalui SSE saat tugas latar belakang selesai).
- "Scaling Node.js Applications with Redis Pub/Sub" (untuk mengelola koneksi SSE di beberapa instans server).

## Metadata

- Level: Menengah
- Topik utama: Real-Time Communication
- Topik terkait: Express.js, HTTP, Performance
- Kata kunci: sse, server-sent events, real-time, express, eventsource, http streaming
- Estimasi waktu baca: 10 menit
