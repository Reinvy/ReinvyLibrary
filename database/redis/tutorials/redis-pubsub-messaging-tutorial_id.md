---
title: "Tutorial Messaging Pub/Sub dengan Redis"
description: "Tutorial praktis messaging Pub/Sub dengan Redis — PUBLISH dan SUBSCRIBE, pencocokan pola dengan PSUBSCRIBE, semantik fire-and-forget, kasus penggunaan chat dan notifikasi, serta contoh lengkap node-redis v4."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial Messaging Pub/Sub dengan Redis

## Ringkasan

Tutorial ini mengajarkan Anda membangun messaging real-time yang ringan dengan Redis Pub/Sub: perintah `PUBLISH`, `SUBSCRIBE`, dan `PSUBSCRIBE`, semantik pengiriman fire-and-forget beserta keterbatasannya, plus sistem chat dan notifikasi yang berfungsi dibangun dengan klien resmi `node-redis` v4.

## Target Audiens

- Pengembang backend dan full-stack yang membangun chat, notifikasi, live feed, atau backend websocket.
- Level yang diharapkan: Intermediate — nyaman dengan Node.js dan konsep dasar Redis.

## Prasyarat

- Pengetahuan sebelumnya: dasar JavaScript/TypeScript dan pemahaman bekerja tentang tipe data Redis dan `redis-cli`.
- Alat yang dibutuhkan: Node.js 18+, server Redis yang berjalan (lokal atau Docker), dan `npm`.

## Tujuan Pembelajaran

Di akhir tutorial ini, Anda akan mampu:

- Mempublikasikan pesan ke channel dengan `PUBLISH` dan menerimanya dengan `SUBSCRIBE`.
- Mencocokkan banyak channel sekaligus menggunakan glob pattern dengan `PSUBSCRIBE`.
- Menjelaskan mengapa Pub/Sub bersifat fire-and-forget dan apa artinya bagi keandalan.
- Membangun chat room real-time dan penyiar notifikasi dengan `node-redis` v4, termasuk penanganan error dan reconnection.
- Memilih antara Pub/Sub dan Redis Streams berdasarkan jaminan pengiriman.

## Konteks dan Motivasi

Fitur real-time — pesan chat, notifikasi, skor langsung — membutuhkan fan-out instan ke banyak konsumen. Polling database dengan timer adalah pemborosan, sedangkan message broker penuh seperti RabbitMQ atau Kafka terlalu berat jika yang dibutuhkan hanyalah siaran. Redis Pub/Sub mengisi celah ini dengan set perintah yang kecil pada latensi sangat rendah.

Namun keterbatasan utamanya adalah pesan bersifat fire-and-forget: jika tidak ada subscriber yang mendengarkan, pesan hilang selamanya — trade-off yang justru diatasi Redis Streams dengan messaging tahan lama yang dapat diputar ulang dan consumer groups.

## Konten Inti

### Cara Kerja Pub/Sub

Publisher mengirim pesan ke channel bernama dengan `PUBLISH channel message`; subscriber yang mendengarkan dengan `SUBSCRIBE channel` menerimanya secara real-time. Redis meneruskan pesan ke setiap subscriber yang terhubung pada channel tersebut lalu membuangnya — tidak ada yang disimpan. Pengiriman bersifat fire-and-forget: publisher tidak pernah menunggu acknowledgment, dan subscriber yang terputus atau lambat hanya akan melewatkan pesan. Ini menghasilkan throughput sangat tinggi dan latensi rendah, tetapi membuat Pub/Sub salah untuk antrean, job, atau apa pun yang tidak boleh kehilangan pesan.

### Pola Channel dengan PSUBSCRIBE

Channel hanyalah string seperti `chat:room:42` atau `notify:email`. Subscriber dapat mendengarkan banyak channel sekaligus dengan glob pattern: `PSUBSCRIBE chat:*` cocok dengan `chat:room:1`, `chat:room:42`, dan `chat:general`; `PSUBSCRIBE notify.*` cocok dengan channel apa pun yang diawali `notify.`. Pesan hasil pola menyertakan pola yang cocok dan channel konkret, sehingga handler Anda tahu persis apa yang aktif. Periksa aktivitas dengan `PUBSUB CHANNELS [pattern]` dan `PUBSUB NUMSUB channel`.

## Contoh Kode

Instal klien v4 berbasis promise:

```bash
npm install redis
```

### Subscriber dengan Subskripsi Channel dan Pola

```javascript
// subscriber.js — mendengarkan chat:general dan chat:room:* dengan reconnection
import { createClient } from 'redis';

const subscriber = createClient({
  url: 'redis://localhost:6379',
  socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 3000) }
});
subscriber.on('error', (err) => console.error('Error subscriber:', err.message));

async function main() {
  try {
    await subscriber.connect();
    await subscriber.subscribe('chat:general', (message, channel) => {
      console.log(`[${channel}] ${message}`);
    });
    await subscriber.pSubscribe('chat:room:*', (message, channel) => {
      console.log(`[pola] ${channel}: ${message}`);
    });
    console.log('Mendengarkan chat:general dan chat:room:* — tekan Ctrl+C untuk keluar.');
  } catch (err) {
    console.error('Koneksi gagal:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await subscriber.quit();
  process.exit(0);
});

main();
```

### Publisher

```javascript
// publisher.js — memublikasikan pesan dan melaporkan berapa klien yang menerimanya
import { createClient } from 'redis';

const publisher = createClient({ url: 'redis://localhost:6379' });
publisher.on('error', (err) => console.error('Error publisher:', err.message));

async function main() {
  try {
    await publisher.connect();
    const room = process.argv[2] || 'chat:general';
    const message = process.argv.slice(3).join(' ') || 'Halo dari node-redis!';
    const recipients = await publisher.publish(room, message);
    console.log(`Dipublikasikan ke "${room}" — ${recipients} subscriber menerimanya.`);
    await publisher.quit();
  } catch (err) {
    console.error('Publikasi gagal:', err.message);
    await publisher.quit();
    process.exit(1);
  }
}

main();
```

```bash
# Terminal 1 — jalankan dengan Redis aktif (lokal atau Docker)
node subscriber.js
# Terminal 2 — pesan tampil di Terminal 1; publisher mencetak jumlah penerima
node publisher.js chat:general "Halo dunia"
node publisher.js chat:room:42 "ada yang online?"
```

### Penyiar Notifikasi dengan Pencocokan Pola

Subskripsi pola sangat berguna saat targetnya dinamis — satu subscriber dapat melayani channel notifikasi setiap pengguna tanpa kode registry di sisi server:

```javascript
// notifications.js — mengirim payload JSON ke channel per pengguna
import { createClient } from 'redis';

const subscriber = createClient({ url: 'redis://localhost:6379' });
subscriber.on('error', (err) => console.error(err.message));

async function main() {
  try {
    await subscriber.connect();
    await subscriber.pSubscribe('notify:user:*', (payload, channel) => {
      const userId = channel.split(':').pop();
      // mis. channel "notify:user:12" -> kirim via SSE/websocket ke user 12
      console.log(`Kirim ke user ${userId}: ${payload}`);
    });
    console.log('Menyiarkan ke semua pengguna via notify:user:*');
  } catch (err) {
    console.error('Koneksi gagal:', err.message);
    process.exit(1);
  }
}

main();
```

```bash
redis-cli publish notify:user:12 '{"type":"like","from":"alice"}'
```

## Insight Penting

- **Fire-and-forget adalah trade-off inti**: pesan tidak pernah disimpan, jadi publikasikan hanya data sementara (live feed, presence, peringatan sesaat). Untuk pekerjaan tahan lama, gunakan Redis Streams (`XADD`/`XREAD`) atau antrean.
- **Shutdown yang rapi**: panggil `subscriber.quit()` saat keluar; selalu pasang listener `error` dan `reconnectStrategy` — node-redis v4 melempar error pada kegagalan koneksi yang tidak ditangani.
- **Satu koneksi untuk satu peran**: satu koneksi sepenuhnya dalam mode subscriber atau mode normal — gunakan klien terpisah (atau `duplicate()`) untuk publishing dan subscribing.
- **Scale-out sangat mudah**: berapa pun instance aplikasi dapat berlangganan ke channel yang sama dan semuanya menerima setiap pesan. Jika Anda ingin setiap pesan ditangani tepat satu worker, Anda memerlukan consumer groups Streams, bukan Pub/Sub.
- **Overhead pola**: `PSUBSCRIBE` memindai ruang pola untuk setiap pesan — jagalah pola tetap sedikit dan spesifik, bukan banyak pola yang tumpang tindih.

## Langkah Berikutnya

- Pelajari messaging tahan lama yang dapat diputar ulang pada tutorial Redis Streams, jalur peningkatan alaminya: `redis-streams-event-driven-architecture`.
- Pelajari [dokumentasi Pub/Sub node-redis](https://redis.js.org/) untuk `duplicate()`, `unsubscribe`/`pUnsubscribe`, dan buffer mode.

## Kesimpulan

Anda kini memahami model Redis Pub/Sub secara utuh: memublikasikan dan berlangganan channel, mencocokkannya dengan pola, semantik fire-and-forget yang membuatnya cepat namun tidak tahan kehilangan, serta cara membangun chat room dan fan-out notifikasi dengan `node-redis` v4 — plus kapan harus naik ke Redis Streams. Dengan skrip publisher dan subscriber yang berjalan di dua terminal, Anda memiliki fondasi messaging real-time yang berfungsi dan siap dikembangkan menjadi layanan produksi.
