---
title: "Menjalankan Worker Job Latar Belakang dengan PM2"
description: "Tutorial praktis mengawasi consumer queue dan job terjadwal dengan PM2: memisahkan app API dan worker, mengatur konkurensi, menuntaskan job yang sedang berjalan saat reload, dan men-scale worker secara independen."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Menjalankan Worker Job Latar Belakang dengan PM2

## Ringkasan

Sebagian besar tutorial PM2 berhenti pada "jalankan API Anda di bawah PM2". Di produksi, masalah yang lebih sulit justru pekerjaan yang terjadi di luar request: mengirim email, membuat laporan, transcoding video, rekonsiliasi ledger. Tutorial ini membangun tier worker berbasis queue yang diawasi PM2, dengan app terpisah untuk API yang melayani request, consumer berjalan lama, dan scheduler periodik — lalu menyetel konkurensi, perilaku drain, kebijakan restart, dan scaling independen sehingga deploy tidak pernah menghilangkan job atau memprosesnya dua kali.

## Target Audiens

- Engineer backend dan platform yang menjalankan layanan Node.js di bawah PM2 di produksi.
- Engineer DevOps yang bertanggung jawab atas armada worker, cron job, dan keamanan deploy.
- Developer tingkat menengah hingga lanjutan yang nyaman dengan CLI PM2 dan file ecosystem.

## Prasyarat

- Node.js 18 atau lebih baru terpasang, dengan instalasi PM2 yang berfungsi (`npm install -g pm2`).
- Instance Redis yang dapat dijangkau dari host Anda (container Docker lokal sudah cukup) sebagai backend queue.
- Pemahaman tentang file ecosystem PM2, `pm2 reload`, dan status proses.
- Familiaritas dengan BullMQ atau library queue berbasis Redis lain sangat membantu tetapi tidak wajib.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan mampu:

- Memodelkan API, worker, dan scheduler sebagai tiga app PM2 terpisah dalam satu file ecosystem.
- Menentukan konkurensi worker dengan benar dengan memisahkan jumlah instance dari konkurensi job per proses.
- Menulis worker yang menuntaskan atau mengembalikan job yang sedang berjalan sebelum PM2 menggantikannya.
- Mencegah pemrosesan ganda selama rolling reload dan deploy.
- Menahan penumpukan queue dengan scaling worker independen dan sinyal kesehatan berbasis lag.

## Konteks dan Motivasi

Daftar proses PM2 biasanya dimulai sebagai satu app: API. Lalu seseorang menambahkan generator laporan, lalu pengirim email, lalu job rekonsiliasi malam, dan tiba-tiba daftar proses yang sama menampung scheduler yang harus berjalan tepat sekali per malam, consumer yang harus berjalan di setiap core, dan API yang tidak boleh di-restart di tengah request.

Ketiga beban kerja ini memiliki lifecycle yang saling bertentangan. API melakukan scale mengikuti core dan sering di-reload. Scheduler harus singleton — dua salinan berarti dua laporan malam. Consumer melakukan scale mengikuti kedalaman queue, bukan CPU, dan harus menjaga job sampai selesai. Mengawasi ketiganya dengan satu `pm2 start app.js` yang seragam dan kebijakan restart default menghasilkan rangkaian kegagalan klasik: cron job terduplikasi, job terbunuh di tengah jalan saat reload, dan badai restart yang menghantam database selama insiden.

PM2 memiliki konfigurasi per app yang cukup untuk menyatakan setiap lifecycle secara terpisah. Pekerjaannya adalah memilih batas-batasnya dan menghormatinya di dalam kode aplikasi.

## Konten Inti

### Mengapa Worker Harus Menjadi App PM2 Terpisah

App PM2 adalah unit kebijakan proses: jumlah instance, batas restart, batas memori, penanganan exit code, dan routing log semuanya berlaku per app. Jika Anda menaruh API dan consumer dalam satu proses, Anda mewarisi gabungan kedua kebijakan tersebut — biasanya kebijakan API, dan itu salah untuk pekerjaan queue.

Pertimbangkan apa yang sebenarnya dibutuhkan setiap beban kerja.

- API menginginkan cluster mode di semua core, reload yang sering dengan gerbang kesehatan, dan timeout drain yang pendek.
- Consumer menginginkan jumlah instance yang stabil sesuai throughput queue, timeout drain lebih panjang agar job yang berjalan dapat selesai, dan kebijakan restart yang toleran terhadap dependensi lambat yang baru pulih.
- Scheduler menginginkan tepat satu instance, `autorestart: false`, dan exit code 0 dianggap sukses.

Memisahkan mereka menjadi tiga app berarti masing-masing dapat di-reload, di-scale, dihentikan, dan dipantau tanpa mengganggu yang lain. `pm2 reload api` tidak lagi menginterupsi transcode video selama 40 detik. `pm2 scale worker 8` tidak lagi melipatgandakan memori API.

### Arsitektur: API, Worker, dan Scheduler sebagai App Berbeda

Bentuknya adalah tiga app, satu file ecosystem, satu daemon.

```text
pm2 daemon
├── api        cluster, N = core, melayani HTTP
├── worker     fork,    N = throughput queue, mengonsumsi job
└── scheduler  fork,    1 instance, menghasilkan job berkala, exit 0
```

API memasukkan pekerjaan ke queue; ia tidak pernah mengeksekusinya. Worker mengonsumsi job dan tidak memiliki listener HTTP. Scheduler tidak menyimpan state berjalan sama sekali — ia memasukkan pekerjaan berulang ke queue lalu keluar, membiarkan PM2 me-restart-nya pada tick cron berikutnya.

Menjaga scheduler tetap stateless dan one-shot adalah keputusan terpenting di sini. Scheduler `setInterval` dalam proses terlihat lebih sederhana tetapi rusak parah di bawah clustering: setiap instance worker menembakkan interval-nya sendiri, sehingga cluster lima instance mengirim lima salinan setiap laporan malam. Job one-shot di bawah app satu instance memiliki tepat satu emitter secara konstruksi.

### Konkurensi: Instance versus Konkurensi Job per Proses

Dua tombol independen mengendalikan throughput worker, dan mencampuradukkannya adalah kesalahan sizing yang paling umum.

- **Jumlah instance** (`instances` di file ecosystem) mencetak proses OS terpisah. Masing-masing mendapat event loop dan ruang memori sendiri.
- **Konkurensi job per proses** (opsi `concurrency` library queue) menjalankan beberapa job bersamaan di dalam satu event loop proses.

Untuk job yang terikat I/O — panggilan HTTP, penulisan database, pengiriman email — konkurensi per proses jauh lebih murah daripada menambah proses. Sepuluh job berjalan di dalam satu proses memakan satu event loop dan satu footprint memori; sepuluh proses memakan sepuluh. Untuk job yang terikat CPU — resize gambar, render PDF, hashing — konkurensi di dalam satu proses tidak memberi apa pun, karena event loop menyerialkan pekerjaannya. Itu membutuhkan lebih banyak instance, dan PM2-lah yang memberi Anda instance tambahan.

Aturan praktis: mulai dengan dua instance worker dan `concurrency: 10` per instance, lalu naikkan konkurensi sampai lag event loop terlihat, kemudian tambahkan instance. Pantau kolom CPU di `pm2 monit` saat backlog: jika mendekati 100% dengan konkurensi moderat, job Anda terikat CPU dan Anda butuh instance. Jika CPU rendah tetapi backlog bertahan, bottleneck-nya adalah I/O hilir dan Anda butuh konkurensi.

### Menulis Worker yang Graceful: Job Selesai Sebelum Keluar

`pm2 reload` mengirim SIGINT, menunggu budget drain yang dikonfigurasi, lalu melakukan eskalasi. Jika worker mengabaikan sinyal, PM2 melakukan eskalasi ke SIGKILL dan job yang sedang berjalan mati bersama prosesnya — meninggalkan job entah hilang (jika queue menghapusnya saat dequeue) atau terduplikasi (jika visibility timeout nanti mengirimkannya ulang).

Karena itu worker memerlukan tiga perilaku, dengan urutan berikut.

1. Berhenti menerima job baru.
2. Tunggu job yang sedang berjalan selesai, dibatasi oleh timeout.
3. Keluar dengan exit code 0 agar PM2 mencatatnya sebagai stop bersih, bukan crash.

BullMQ menyediakan ini secara langsung: `worker.close()` berhenti mengambil job baru dan resolve ketika job yang ada selesai. Satu-satunya pekerjaan tambahan adalah batas waktu keras, karena `kill_timeout` PM2 akan mengirim SIGKILL ke proses itu juga — dan lebih baik keluar dengan sengaja, membuang log, dan meninggalkan jejak yang jelas daripada dibunuh di tengah penulisan.

Setel `kill_timeout` (per app, dalam milidetik) sedikit lebih tinggi daripada batas drain internal worker. Jika `kill_timeout` 10 detik dan batas internal worker 25 detik, PM2 membunuhnya di detik ke-10 — batas internal itu tidak pernah berarti. Balik angkanya dan PM2 akan menunggu dengan sabar sampai worker keluar sendiri secara bersih.

### Mencegah Pemrosesan Ganda Saat Deploy

Queue menjamin pengiriman at-least-once, jadi worker yang mati di tengah job berarti job itu berjalan lagi. Itu hanya aman jika job bersifat idempoten atau Anda memakai lock per job. Dua mekanisme menutup hampir semua kasus.

- **Idempotency key**: turunkan kunci alami dari payload job (order ID, nomor invoice) dan buat penulisan bersyarat pada kunci tersebut. Job yang diputar ulang menjadi no-op alih-alih efek samping ganda.
- **Lock per job**: perpanjangan lock milik library queue menjaga sebuah job dimiliki tepat satu worker selama pemrosesan. BullMQ melakukan ini secara default; job yang lock-nya kedaluwarsa dapat diambil worker lain, dan itulah sebabnya job panjang perlu menaikkan `lockDuration` atau memanggil `job.extendLock()` secara berkala.

Selama rolling reload, `pm2 reload worker` menggantikan instance satu per satu. Dengan `instance_var` dan drain bertahap ini aman: setiap worker lama menuntaskan job-nya, keluar dengan 0, dan baru setelah itu instance berikutnya diganti. Verifikasi penahapannya pada deploy nyata daripada mempercayainya begitu saja — drain yang terlalu cepat bisa terlihat seperti restart serentak seluruh instance.

### Menjadwalkan Pekerjaan Berkala dengan cron_restart

PM2 mendukung restart berbasis cron per app melalui `cron_restart`, yang memakai sintaks cron lima field standar. Dikombinasikan dengan `autorestart: false`, ini memberi Anda job runner alih-alih service.

Polanya: skrip scheduler memasukkan job berulangnya ke queue lalu keluar dengan 0. PM2 melihat exit bersih, tidak me-restart-nya, dan menjalankannya lagi pada tick cron berikutnya. Karena app-nya satu instance, tidak ada enqueue ganda — properti yang tidak bisa Anda dapatkan dari timer dalam proses di bawah cluster mode.

Satu detail yang sering menjebak: `cron_restart` me-restart app yang masih berjalan. Jika skrip scheduler menggantung, tick berikutnya me-restart-nya di tengah eksekusi. Jaga skrip scheduler tetap singkat dan terbatas, dan beri `kill_timeout` sendiri agar tick yang menggantung dibersihkan alih-alih tumpang tindih dengan tick berikutnya.

### Job One-Shot dan stop_exit_codes

`stop_exit_codes: [0]` membuat PM2 memperlakukan exit code 0 sebagai penghentian yang disengaja. Tanpa itu, PM2 me-restart proses apa pun yang keluar, sehingga scheduler yang berhasil menyelesaikan tugas langsung melahirkan dirinya lagi, menghabiskan `max_restarts`, dan berakhir di `errored` — yang terlihat seperti kegagalan di monitoring padahal job-nya sukses.

Kebalikannya juga penting. Exit code apa pun yang tidak ada di `stop_exit_codes` dihitung sebagai crash dan memicu restart, jadi scheduler yang keluar dengan 1 karena kegagalan dependensi sementara akan dicoba ulang PM2 sesuai kebijakan backoff. Itu biasanya diinginkan untuk operasi enqueue; tidak diinginkan untuk job yang sudah idempoten di lapisan queue, di mana mengulang enqueue adalah tugas queue, bukan tugas PM2.

### Lag Queue dan Sinyal Kesehatan Worker

Worker berstatus "online" sepanjang waktu ia tidak membuat kemajuan apa pun. `pm2 list` yang hijau memberitahu Anda prosesnya ada, bukan bahwa backlog sedang terkuras. Kesehatan tier worker adalah lag queue — usia job tertua yang menunggu — bukan status proses.

Dua sinyal murah menutup sebagian besar insiden: lag melewati ambang selama beberapa menit, dan jumlah restart worker yang terus naik meskipun tetap online. Yang kedua menangkap slow crash loop yang tidak pernah mencapai status `errored`. Keduanya tersedia dari queue itu sendiri dan dari `pm2 jlist`, dan keduanya layak masuk dashboard sebelum backlog menjadi keterlambatan yang terlihat pelanggan.

Batas memori perlu catatan di sini: `max_memory_restart` adalah penjaga kasar tetapi efektif untuk worker yang mengakumulasi buffer (payload besar, transformasi streaming). Setel per app worker, bukan per app API, karena profil memori worker sangat berbeda dari profil yang melayani request.

### Men-scale Worker Secara Independen dengan `--only`

Scaling bersifat per app. `pm2 scale worker 12` hanya menyentuh tier worker; API dan scheduler mempertahankan jumlah instance-nya. Inilah hasil operasional dari pemisahan tiga app — reaksi terhadap backlog adalah satu perintah yang tidak mengganggu pelayanan request.

Dua peringatan. Pertama, scale secara bertahap dan pantau lag di antara langkah; menambah worker lebih cepat daripada kemampuan database hilir menyerap koneksi mengubah backlog menjadi outage. Kedua, ingat bahwa jumlah instance tidak tersimpan di file ecosystem kecuali Anda juga mengeditnya — `pm2 reload` setelah scaling manual dapat mengembalikan jumlahnya, jadi catat scaling yang disengaja di file ecosystem untuk apa pun yang berumur panjang.

## Contoh Kode

### File ecosystem

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/api.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      kill_timeout: 8000,
      min_uptime: '5s',
      max_restarts: 10,
      env: { NODE_ENV: 'production', PORT: 3000 },
    },
    {
      name: 'worker',
      script: './dist/worker.js',
      instances: 2,             // tombol terpisah dari konkurensi per job
      exec_mode: 'fork',
      max_memory_restart: '768M',
      kill_timeout: 30000,      // lebih lama dari batas drain internal worker
      exp_backoff_restart_delay: 200,
      min_uptime: '10s',
      max_restarts: 20,
      env: {
        NODE_ENV: 'production',
        JOB_CONCURRENCY: 10,    // job berjalan per proses
      },
    },
    {
      name: 'scheduler',
      script: './dist/scheduler.js',
      instances: 1,             // singleton: tepat satu emitter
      exec_mode: 'fork',
      autorestart: false,
      stop_exit_codes: [0],
      cron_restart: '*/5 * * * *',
      kill_timeout: 15000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

### Worker yang menuntaskan job dengan bersih

```javascript
// src/worker.js
const { Worker } = require('bullmq');

const connection = { host: process.env.REDIS_HOST, port: 6379 };
const DRAIN_DEADLINE_MS = 25000; // harus di bawah kill_timeout PM2

const worker = new Worker(
  'jobs',
  async (job) => {
    switch (job.name) {
      case 'send-email':
        // idempoten: dikunci pada message id, jadi pemutaran ulang adalah no-op
        await sendEmail(job.data.messageId, job.data.payload);
        return;
      case 'render-report':
        await extendLockIfSlow(job); // job panjang: jaga kepemilikan tetap hidup
        await renderReport(job.data.reportId);
        return;
      default:
        throw new Error(`Job tidak dikenal: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: Number(process.env.JOB_CONCURRENCY || 10),
    lockDuration: 60000,
  }
);

async function extendLockIfSlow(job) {
  // perpanjang lock job untuk pekerjaan yang mungkin melewati jendela lock default
  const timer = setInterval(() => job.extendLock(job.token, 60000), 30000);
  job.on('completed', () => clearInterval(timer));
  job.on('failed', () => clearInterval(timer));
}

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker ${process.env.NODE_APP_INSTANCE}] menerima ${signal}, draining`);

  const deadline = new Promise((resolve) => setTimeout(resolve, DRAIN_DEADLINE_MS));
  try {
    // berhenti mengambil job baru, resolve saat job yang berjalan selesai
    await Promise.race([worker.close(), deadline]);
    console.log('[worker] drained dengan bersih');
    process.exit(0);
  } catch (err) {
    console.error('[worker] drain gagal', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

### Scheduler stateless yang keluar dengan 0

```javascript
// src/scheduler.js
const { Queue } = require('bullmq');

const queue = new Queue('jobs', {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
});

async function main() {
  await queue.add(
    'render-report',
    { reportId: 'daily-rollup' },
    {
      jobId: `daily-rollup-${new Date().toISOString().slice(0, 10)}`, // kunci dedupe
      removeOnComplete: 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
  console.log('[scheduler] daily-rollup dimasukkan ke queue');
}

main()
  .then(async () => {
    await queue.close();
    process.exit(0); // exit bersih: PM2 membiarkan app berhenti sampai tick berikutnya
  })
  .catch(async (err) => {
    console.error('[scheduler] enqueue gagal', err);
    await queue.close();
    process.exit(1); // non-zero: PM2 mencoba ulang sesuai kebijakan backoff
  });
```

### Mengoperasikan tier worker

```bash
# Jalankan seluruh tier dari file ecosystem
pm2 start ecosystem.config.js

# Scale hanya tier worker sebagai respons terhadap backlog
pm2 scale worker 8

# Pastikan ketiga app dan jumlah restart-nya
pm2 list

# Streaming log hanya dari worker selama deploy
pm2 logs worker --lines 100

# Penggantian consumer bergulir; job yang berjalan dituntaskan lebih dulu
pm2 reload worker

# State yang dapat dibaca mesin untuk exporter lag/kesehatan
pm2 jlist > /tmp/pm2-state.json
```

## Insight Penting

- **Satu app, satu kebijakan.** Jumlah instance, batas restart, timeout drain, dan penanganan exit code bersifat per app. Memisahkan API, worker, dan scheduler memungkinkan masing-masing membawa kebijakan yang sesuai beban kerjanya alih-alih mewarisi kebijakan API.
- **Jumlah instance dan konkurensi job adalah dua tombol berbeda.** Konkurensi murah untuk pekerjaan terikat I/O dan tidak berguna untuk pekerjaan terikat CPU; hanya instance PM2 yang menambah event loop paralel.
- **`kill_timeout` harus lebih besar dari batas drain aplikasi Anda.** Jika tidak, PM2 mengirim SIGKILL di tengah job dan kode graceful shutdown tidak pernah berjalan.
- **Queue memberi pengiriman at-least-once, jadi asumsikan pemutaran ulang.** Idempotency key atau lock per job itulah yang membuat crash di tengah deploy dapat ditanggung.
- **Singleton membutuhkan `instances: 1`.** `setInterval` dalam proses di bawah cluster mode menyala sekali per worker dan menduplikasi pekerjaan terjadwal secara diam-diam.
- **Status hijau bukan berarti sehat.** Lag queue dan jumlah restart adalah sinyal kesehatan worker yang sebenarnya; `pm2 list` hanya memastikan prosesnya ada.
- **Profil memori worker berbeda dari profil API.** Setel `max_memory_restart` per app, bukan per host.

## Langkah Berikutnya

- Baca guide PM2 Process Lifecycle untuk state machine, semantik sinyal, dan penyetelan jendela restart yang menjadi dasar tutorial ini.
- Pelajari guide PM2 Cluster Scaling sebelum men-scale app yang melayani request, di mana shared state dan sticky session mendominasi desain.
- Tambahkan exporter lag yang membaca metrik queue plus `pm2 jlist` dan mengirimkannya ke Prometheus, sehingga backlog dapat dijadikan alert sebelum terlihat pengguna.
- Lanjut ke PM2 Programmatic API untuk otomasi control plane: men-scale worker dari controller berdasarkan lag terukur alih-alih penilaian operator.

## Kesimpulan

Mengawasi tier worker dengan PM2 sebagian besar adalah masalah batas. Begitu API, consumer, dan scheduler menjadi tiga app dengan tiga kebijakan eksplisit, kegagalan operasional yang biasa menghantui daftar proses campuran — cron job terduplikasi, job terbunuh di tengah jalan, badai restart saat insiden — berhenti menjadi kejutan dan berubah menjadi pilihan konfigurasi.

Bagian yang penting di produksi adalah yang disembunyikan jalur bahagia: batas drain yang lebih pendek dari `kill_timeout`, handler job idempoten yang toleran terhadap pemutaran ulang, scheduler singleton yang keluar bersih dengan 0, dan kesehatan yang diukur dengan lag queue alih-alih status proses. Benahi keempatnya dan scaling worker menjadi satu perintah, bukan sebuah insiden.
