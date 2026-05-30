# Implementasi Server-Sent Events (SSE) di Express JS

## Ringkasan Singkat

Materi ini membahas Server-Sent Events (SSE), sebuah teknologi standar untuk mengirimkan data secara *real-time* dan searah dari *server* ke *client*. Anda akan belajar bagaimana mengimplementasikan SSE di Express.js sebagai alternatif yang lebih ringan dibandingkan WebSockets ketika Anda hanya membutuhkan komunikasi *real-time* satu arah.

---

## Untuk Siapa Materi Ini

* *Backend developer* pemula hingga menengah.
* *Developer* yang ingin menambahkan fitur *real-time* seperti *live feeds*, notifikasi, atau pembaruan *ticker* tanpa kompleksitas WebSockets.

---

## Prasyarat

* Pemahaman dasar tentang *routing* dan *middleware* di Express.js.
* Pemahaman tentang *request* dan *response* HTTP standar.
* Terbiasa dengan JavaScript asinkron.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Apa itu Server-Sent Events (SSE) dan perbedaannya dengan WebSockets.
* Cara mengonfigurasi *endpoint* Express.js untuk mengirimkan SSE.
* Cara menjaga koneksi tetap terbuka dan mengalirkan (*streaming*) data ke *client* secara terus-menerus.
* Cara menangani pemutusan koneksi oleh *client* secara aman.

---

## Konteks dan Motivasi

Dalam aplikasi *web* modern, pengguna mengharapkan pembaruan informasi secara seketika (*real-time*). Baik itu skor olahraga *live*, sistem notifikasi, atau pergerakan saham, melakukan *polling* (bertanya ke *server* setiap beberapa detik) sangat tidak efisien dan membebani sumber daya.

Meskipun WebSockets adalah solusi populer untuk komunikasi *real-time*, mereka menyediakan komunikasi dua arah penuh (*full duplex*), yang bisa jadi berlebihan dan kompleks untuk diatur jika Anda hanya butuh *server* untuk mengirim *update* ke *client*. SSE dibangun di atas standar HTTP, membuatnya lebih sederhana diimplementasikan, lebih mudah melewati *firewall*/*proxy*, dan sempurna untuk skenario *streaming* satu arah (*server* ke *client*). Memahami SSE memungkinkan *developer* memilih alat yang paling efisien untuk kebutuhan *real-time* spesifik mereka.

---

## Materi Inti

### 1. Apa itu Server-Sent Events (SSE)?

Server-Sent Events (SSE) adalah standar *web* yang memungkinkan *browser* menerima pembaruan otomatis dari *server* melalui koneksi HTTP. Berbeda dengan *request* HTTP biasa di mana *server* menutup koneksi setelah mengirim *response*, dengan SSE, *server* menjaga koneksi tetap terbuka dan mendorong (*push*) pesan ke *client* kapan pun ada data baru.

SSE menggunakan *content type* `text/event-stream` dan bergantung pada format teks biasa yang spesifik untuk mengurai pesan.

### 2. SSE vs. WebSockets

* **Arah Komunikasi:** SSE bersifat searah (*Server* ke *Client*). WebSockets bersifat dua arah.
* **Protokol:** SSE menggunakan standar HTTP/HTTPS. WebSockets memerlukan peralihan protokol (ws/wss).
* **Koneksi Ulang:** *Browser* memiliki fitur koneksi ulang otomatis bawaan untuk SSE. WebSockets memerlukan implementasi manual untuk koneksi ulang.
* **Kasus Penggunaan:** SSE ideal untuk notifikasi, *feed*, dan pembaruan status. WebSockets lebih baik untuk aplikasi *chatting* dan *game multiplayer*.

### 3. Membuat Endpoint SSE di Express

Untuk membuat *endpoint* SSE di Express.js, Anda perlu mengatur *header* HTTP spesifik untuk memberi tahu *client* bahwa *response* berupa aliran *event* dan koneksi harus tetap hidup (*keep-alive*).

```javascript
app.get('/api/stream', (req, res) => {
  // 1. Set header SSE yang diwajibkan
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 2. Kirim pesan awal
  res.write(`data: {"message": "Terkoneksi dengan stream SSE"}\n\n`);

  // ... setup interval atau event listener untuk mengirim data lebih lanjut
});
```

*Catatan: Dalam SSE, setiap pesan harus diawali dengan `data:` dan diakhiri dengan dua karakter baris baru (`\n\n`).*

### 4. Mengirim Pembaruan Terus-Menerus

Setelah koneksi terjalin, Anda dapat menggunakan `res.write()` untuk terus mengirimkan data ke *client*.

```javascript
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Kirim pembaruan setiap 2 detik
  const intervalId = setInterval(() => {
    const data = JSON.stringify({ time: new Date().toISOString() });
    res.write(`data: ${data}\n\n`);
  }, 2000);

  // Tangani client yang terputus untuk mencegah kebocoran memori (memory leak)
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});
```

### 5. Penanganan Error yang Aman

Saat mengimplementasikan fitur *real-time*, *error* mungkin saja terjadi (misalnya, gagal mengambil data dari *database* sebelum dikirim). Seperti biasa, cegah *Information Exposure* dengan mencatat *error* asli secara internal dan gagal secara diam-diam (*silent fail*) atau mengirimkan event *error* generik SSE ke *client* jika diperlukan.

```javascript
try {
   // ... logika program
} catch (error) {
   console.error('[SSE Error]', error);
   res.write(`data: {"error": "Terjadi kesalahan pembaruan internal"}\n\n`);
}
```

---

## Contoh / Ilustrasi

Bayangkan Anda berada di bandara menunggu penerbangan Anda.

* **Polling:** Anda bolak-balik ke meja informasi setiap 5 menit bertanya, "Apakah penerbangan saya ditunda?" (Sangat tidak efisien).
* **WebSockets:** Anda memiliki *walkie-talkie* yang terhubung dengan petugas informasi. Anda bisa bertanya, dan mereka bisa menjawab. (Dua arah, namun kompleks).
* **SSE:** Anda melihat papan informasi penerbangan digital. Anda tidak berbicara dengan papan tersebut. *Server* bandara secara terus-menerus mendorong pembaruan informasi ke papan itu. Jika papan kehilangan daya sesaat (koneksi putus), ia akan otomatis menyala lagi dan mengejar ketertinggalan informasi (fitur koneksi ulang bawaan SSE).

**Implementasi Sisi Client (Vanilla JS):**

Untuk mengonsumsi *stream* SSE yang dibuat di atas pada *browser*, Anda menggunakan API bawaan `EventSource`:

```javascript
const eventSource = new EventSource('/api/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update diterima:', data);
  // Perbarui UI dengan data baru
};

eventSource.onerror = (error) => {
  console.error('EventSource gagal:', error);
  // Browser akan secara otomatis mencoba untuk terhubung kembali
};
```

---

## Insight Penting

* **Batasan Koneksi:** *Browser* umumnya membatasi jumlah koneksi SSE bersamaan ke *domain* yang sama (seringkali 6 koneksi untuk HTTP/1.1). Menggunakan *multiplexing* HTTP/2 sangat membantu mengatasi masalah ini.
* **Kebocoran Memori (Memory Leaks):** Selalu dengarkan *event* `req.on('close')` untuk membersihkan *interval*, *timeout*, atau menghapus *event listeners*. Jika gagal melakukannya, memori pada *server* akan bocor seiring menumpuknya koneksi "hantu".
* **Load Balancing & Proxy:** Karena SSE menggunakan koneksi HTTP yang berumur panjang, pastikan *load balancer*, *proxy* (seperti Nginx), dan penyedia *cloud* Anda dikonfigurasi untuk mendukung *timeout* panjang dan tidak menahan (*buffer*) *response* SSE.

---

## Ringkasan Akhir

* Server-Sent Events (SSE) menyediakan mekanisme berbasis HTTP standar yang sederhana untuk mengirim pembaruan *real-time* satu arah dari *server* ke *client*.
* SSE diimplementasikan di Express dengan mengatur *header* `Content-Type: text/event-stream` dan menjaga koneksi tetap terbuka.
* Data yang dikirim melalui SSE harus mengikuti format teks spesifik, dimulai dengan `data:` dan diakhiri dengan `\n\n`.
* Selalu tangani *event* `close` dari *client* untuk membersihkan sumber daya dan mencegah kebocoran memori.
* SSE adalah alternatif yang lebih ringan dan dapat di-*cache* dibandingkan WebSockets untuk aliran data searah.

---

## Langkah Belajar Berikutnya

* [Real-Time Communication in Express with Socket.IO](Real-Time%20Communication%20in%20Express%20with%20Socket.IO_ID.md) (Pelajari WebSockets untuk komunikasi dua arah).
* Eksplorasi integrasi SSE dengan *Event Emitter* atau Redis Pub/Sub untuk menyiarkan pembaruan di berbagai instans *server*.

---

## Metadata

* Level: Menengah
* Topik utama: Express.js, Backend Development
* Topik terkait: Real-time, SSE, Event Streaming, WebSockets
* Kata kunci: express sse, server sent events, pembaruan real time, event stream
* Estimasi waktu baca: 8 - 10 menit
