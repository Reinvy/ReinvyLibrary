---
title: "Panduan Background Jobs dan Queue NestJS"
description: "Panduan komprehensif untuk membangun pipeline background job yang andal dengan NestJS dan BullMQ — mencakup arsitektur queue, producer dan worker, retry dan backoff, penjadwalan, monitoring, serta operasional produksi."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Background Jobs dan Queue NestJS

## Pendahuluan

Permintaan HTTP seharusnya selesai dengan cepat. Pekerjaan apa pun yang membutuhkan waktu lebih dari beberapa ratus milidetik — mengirim email, membuat laporan PDF, mengubah ukuran gambar, memanggil API pihak ketiga, memproses pembayaran, atau menyinkronkan data dengan sistem eksternal — sebaiknya dipindahkan ke latar belakang. Menjalankannya secara sebaris di dalam request handler akan memperlambat pengalaman pengguna, menghabiskan koneksi database, dan membuat seluruh API rapuh saat dibebani.

**Job queue** menyelesaikan masalah ini dengan memisahkan produksi pekerjaan dari eksekusinya. Seorang producer menambahkan deskripsi pekerjaan ke antrean, dan satu atau lebih worker mengambil pekerjaan tersebut, mengeksekusinya, lalu melaporkan hasilnya. Jika worker crash di tengah pekerjaan, pekerjaan akan dicoba ulang. Jika antrean bertambah panjang, Anda menambah worker. API tetap responsif, dan pekerjaan latar belakang menjadi dapat diamati, dapat dilanjutkan, serta dapat diskalakan secara mandiri.

Panduan ini membahas tumpukan standar produksi untuk pemrosesan latar belakang di NestJS: **BullMQ** di atas **Redis**. Anda akan mempelajari arsitektur queue, cara memodelkan job, cara membangun producer dan worker, cara membuat eksekusi job tangguh, cara menjadwalkan pekerjaan berulang, serta cara memantau dan mengoperasikan queue di produksi.

## Praktik Terbaik

### 1. Arahkan semua pekerjaan latar belakang melalui queue, jangan pernah lewat timer mentah

`setTimeout`, `setInterval`, dan paket cron dalam proses berjalan di dalam proses aplikasi Anda. Saat proses dimulai ulang, berhenti di tengah tugas, atau diskalakan secara horizontal, pekerjaan itu akan hilang atau terduplikasi secara diam-diam. Queue menyimpan job di Redis — sistem eksternal yang tahan lama — sehingga pekerjaan bertahan dari restart proses, dan instance worker mana pun dapat mengambilnya.

### 2. Modelkan job sebagai unit kerja kecil yang idempoten

Sebuah job harus mewakili satu tugas tak-terbagi ("kirim email reset password untuk user 42"), bukan sebuah pipeline ("onboard pengguna baru" — yang mungkin terdiri dari sepuluh langkah). Pisahkan langkah-langkahnya agar masing-masing dapat dicoba ulang secara mandiri. Jika memungkinkan, buat eksekusi job **idempoten**: jika job yang sama dijalankan dua kali, hasilnya harus identik. Idempotensi inilah yang membuat retry aman.

### 3. Beri versi pada payload job

Job tersimpan di Redis dan mungkin diproses oleh versi kode yang lebih baru setelah deploy. Jangan pernah mengubah bentuk payload job tanpa rencana. Tambahkan kolom `version` secara eksplisit (atau gunakan diskriminator tipe job) dan tulis processor yang dapat menangani setidaknya versi sebelumnya. Perlakukan payload sebagai kontrak yang persisten, bukan argumen fungsi yang sementara.

### 4. Jaga worker tetap tanpa state dan biarkan BullMQ mengelola siklus hidup

Seorang worker seharusnya hanya mengambil job, mengeksekusinya, dan melaporkan sukses atau gagal. Tidak ada state sampingan di memori, tidak ada loop retry sendiri, tidak ada `setTimeout` manual sebelum mengakui pekerjaan. BullMQ menangani percobaan, backoff, deteksi job macet, dan status job; processor Anda cukup melempar error saat gagal dan mengembalikan nilai saat sukses.

### 5. Pilih kebijakan retry dan backoff yang eksplisit untuk setiap tipe job

Perilaku retry bawaan jarang cocok untuk semua kasus. Panggilan jaringan yang bersifat sementara mungkin layak mendapat 5 percobaan dengan backoff eksponensial; job yang gagal validasi sebaiknya tidak dicoba ulang sama sekali. Atur `attempts`, `backoff`, dan `removeOnFail` per tipe job, dan arahkan job yang gagal permanen ke dead-letter queue atau alert monitoring agar terlihat, bukan dicoba ulang selamanya.

### 6. Batasi konkurensi worker dan sesuaikan dengan metrik

`concurrency` pada processor mengontrol berapa banyak job yang dijalankan paralel oleh satu worker. Terlalu rendah membuat throughput turun; terlalu tinggi membuat koneksi Redis, pool database, atau memori habis. Mulai dengan angka moderat (4–8 per worker), amati latensi queue dan CPU worker, lalu skala konkurensi atau jumlah worker berdasarkan bukti.

### 7. Pisahkan queue berdasarkan domain dan prioritas, bukan ukuran

Satu queue "semua jadi" mengikat beban kerja yang tidak saling berhubungan: job rendering PDF yang lambat dapat menunda job email yang sensitif terhadap waktu. Gunakan queue terpisah per domain (email, laporan, media, pembayaran) dan gunakan dukungan prioritas BullMQ untuk pengurutan di dalam queue. Queue yang independen juga memungkinkan Anda menskalakan pool worker per beban kerja.

### 8. Jadikan status queue dapat diamati sejak hari pertama

Anda tidak dapat mengoperasikan apa yang tidak dapat Anda lihat. Ekspos queue melalui Bull Board untuk inspeksi manusia, lacak metrik queue (jumlah waiting, active, delayed, failed) di sistem monitoring Anda, dan buat alert untuk job gagal, job macet, serta pertumbuhan kedalaman queue. Biaya menambahkan ini di kemudian hari jauh lebih besar daripada membangunnya sejak awal.

### 9. Rencanakan graceful shutdown dan penyelesaian job

Saat deploy atau scale-in, worker mungkin sedang memegang job aktif. Dengarkan sinyal shutdown, berhenti menerima job baru, dan beri worker waktu untuk menyelesaikan job aktif sebelum proses keluar, sehingga job `active` tidak tertinggal menunggu detektor job macet mengambilnya.

### 10. Amankan dan persist Redis seperti database produksi yang sesungguhnya

Keandalan queue hanya sebaik Redis-nya. Jalankan Redis dengan persistensi aktif (AOF) untuk daya tahan minimal, lindungi dengan password dan isolasi jaringan, dan jangan pernah menggunakan Redis development lokal untuk queue produksi.

## Langkah Implementasi

### Langkah 1: Pasang dependensi dan jalankan Redis

BullMQ membutuhkan server Redis (versi 6.2 atau lebih tinggi disarankan). Pasang Redis secara lokal atau gunakan instance terkelola, lalu pasang paket NestJS:

```bash
npm install @nestjs/bullmq bullmq ioredis
```

```bash
# Mulai server Redis lokal (Linux/macOS dengan Homebrew)
redis-server --daemonize yes
redis-cli ping
```

Jika ingin dashboard web opsional di kemudian hari, pasang juga:

```bash
npm install @bull-board/express @bull-board/api
```

### Langkah 2: Konfigurasi koneksi root untuk queue

Daftarkan BullMQ secara global di `AppModule` dengan `BullModule.forRoot()`, menunjuk ke instance Redis Anda. Opsi koneksi mengikuti konvensi ioredis dan dipakai ulang oleh setiap queue:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
        // Menjaga data job tetap aman saat terjadi gangguan jaringan singkat
        maxRetriesPerRequest: null,
      },
    }),
  ],
})
export class AppModule {}
```

`maxRetriesPerRequest: null` itu penting: BullMQ mengeluarkan perintah blocking (tunggu gaya BRPOPLPUSH) yang gagal saat ioredis membatasi retry per permintaan, jadi biarkan dinonaktifkan.

### Langkah 3: Daftarkan queue dan injeksi producer

Daftarkan setiap queue dengan `BullModule.registerQueue()`. Nama queue adalah kontrak yang digunakan bersama producer dan worker — harus sama persis di kedua sisi:

```typescript
// notifications.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
```

Dengan `BullModule.registerQueue`, queue diinjeksi melalui token yang diturunkan dari nama queue (`getQueueToken('notifications')`), di-resolve dengan dekorator `@InjectQueue()`:

```typescript
// notification.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType } from './notification.types';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async sendWelcomeEmail(userId: string, email: string): Promise<void> {
    await this.notificationsQueue.add('send-email', {
      userId,
      email,
      template: 'welcome',
      version: 1,
    });
  }
}
```

Nama job (`'send-email'`) memungkinkan satu queue menampung beberapa jenis job, masing-masing ditangani oleh metode processor miliknya sendiri.

### Langkah 4: Atur opsi per job secara sengaja

Argumen kedua `queue.add()` adalah payload; argumen ketiga adalah objek `JobOptions`. Di sinilah kebijakan retry, delay, prioritas, dan perilaku siklus hidup dinyatakan per job — bukan per queue:

```typescript
await this.notificationsQueue.add(
  'send-email',
  { userId, email, template: 'welcome', version: 1 },
  {
    attempts: 5,                    // coba ulang hingga 5 kali
    backoff: {
      type: 'exponential',          // 2s, 4s, 8s, 16s antar percobaan
      delay: 2000,
    },
    removeOnComplete: { age: 3600, count: 1000 }, // simpan hasil terbaru untuk monitoring
    removeOnFail: { age: 24 * 3600 },             // simpan kegagalan selama sehari
  },
);
```

Opsi yang umum digunakan:

- `delay: number` — tahan job di set tertunda selama setidaknya milidetik sebanyak ini (berguna untuk "kirim pengingat dalam 24 jam").
- `priority: number` — angka lebih kecil dijalankan lebih dulu (1 = prioritas tertinggi).
- `jobId: string` — ID kustom yang stabil; BullMQ menolak `jobId` duplikat, sehingga deduplikasi job menjadi sepele.
- `attempts: number` — total percobaan eksekusi termasuk percobaan pertama.
- `backoff: { type: 'fixed' | 'exponential', delay: number }` — jeda antar percobaan.

### Langkah 5: Bangun worker dengan processor

Worker dibuat dengan dekorator `@Processor()`; setiap metode `@Process()` menangani satu nama job. Processor berjalan di luar siklus hidup request HTTP, sehingga tidak boleh bergantung pada provider ber-scope request:

```typescript
// notification.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';

@Processor('notifications', { concurrency: 5 })
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-email':
        return this.sendEmail(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async sendEmail(job: Job): Promise<void> {
    const { userId, email, template } = job.data;

    const start = Date.now();
    await this.mailService.send(email, template);
    await job.updateProgress(100);

    // Catat hasil untuk observabilitas
    console.log(`Email sent to ${email} in ${Date.now() - start}ms (attempt ${job.attemptsMade + 1})`);
  }
}
```

`WorkerHost` + `process()` adalah pola yang direkomendasikan karena satu kelas worker dapat merutekan nama job apa pun. Lempar error untuk menandai job gagal (akan dicoba ulang sesuai `attempts`/`backoff` job), kembalikan nilai untuk menandainya selesai.

### Langkah 6: Laporkan progres dan tangani pekerjaan berdurasi panjang

Untuk job yang memakan waktu menit-menit, perbarui progres agar operator dapat melihat aktivitas, dan dukung pembatalan di loop panjang:

```typescript
import { Job } from 'bullmq';

export async function renderReport(job: Job): Promise<string> {
  const total = job.data.rows.length;
  const chunks: string[] = [];

  for (let i = 0; i < total; i += 100) {
    // Periksa apakah job dibatalkan atau dihapus saat kita bekerja
    if (await job.isWaiting() === false && job.isActive() === false) {
      throw new Error('Job no longer active — aborting');
    }

    const chunk = await renderChunk(job.data.rows.slice(i, i + 100));
    chunks.push(chunk);
    await job.updateProgress(Math.round((i / total) * 100));
  }

  return chunks.join('\n');
}
```

Panggil `job.updateProgress(0–100)` secukupnya — setiap panggilan menulis ke Redis, jadi perbarui pada interval kasar, bukan per baris.

### Langkah 7: Jadwalkan pekerjaan berulang

BullMQ mendukung repeatable job dengan ekspresi cron atau interval tetap. Daftarkan sekali saat aplikasi dimulai (konfigurasi repeat tetap bertahan dari restart worker karena tersimpan di Redis):

```typescript
// cleanup.module.ts — menjadwalkan job malam hari saat aplikasi bootstrap
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CleanupScheduler implements OnApplicationBootstrap {
  constructor(@InjectQueue('maintenance') private readonly maintenanceQueue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.maintenanceQueue.add(
      'purge-expired-sessions',
      { olderThanDays: 30, version: 1 },
      {
        repeat: { pattern: '0 3 * * *' }, // setiap hari pukul 03:00 waktu server
        jobId: 'purge-expired-sessions-daily', // id tetap mencegah duplikasi
        removeOnComplete: true,
      },
    );
  }
}
```

Selalu beri repeatable job `jobId` yang stabil; jika tidak, setiap deploy dan setiap restart scheduler dapat menambahkan entri repeat duplikat. Mengubah jadwal nanti memerlukan `queue.removeRepeatable()` dengan pola lama.

### Langkah 8: Tangani kegagalan, job macet, dan dead letter

Job gagal saat processor melempar error. BullMQ kemudian menerapkan `attempts` dan `backoff` job. Setelah percobaan habis, job berpindah ke status `failed` dan tetap di sana sampai `removeOnFail` membersihkannya.

Dengarkan event queue untuk bereaksi terhadap kegagalan — catat log-nya, buat alert, atau pindahkan ke dead-letter queue (queue terpisah yang hanya menyimpan kegagalan terminal untuk inspeksi dan pemutaran ulang):

```typescript
// queue-events.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('notifications', { concurrency: 5 })
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job): Promise<void> {
    // ... eksekusi job ...
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    if (job) {
      this.logger.error(`Job ${job.id} (${job.name}) failed: ${error.message}`, error.stack);
      // Integrasi alerting (mis. Sentry, PagerDuty, Slack) diletakkan di sini
    }
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`Job ${jobId} stalled — kemungkinan worker crash; akan dicoba ulang`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} completed in ${job.finishedOn ? Date.now() - job.finishedOn : 'n/a'}ms`);
  }
}
```

Job menjadi **stalled** saat worker crash di tengah eksekusi dan tidak memperbarui kuncinya; BullMQ secara otomatis memindahkan job yang macet kembali ke `waiting` untuk dicoba ulang. Jumlah stalled di atas nol biasanya berarti worker mati — selidiki penyebab crash daripada menganggap retry memperbaiki semuanya.

### Langkah 9: Koordinasikan alur multi-langkah dengan job induk-anak

BullMQ mendukung **flow** — job induk dengan job anak yang diproses oleh worker berbeda. Ini adalah alternatif native-queue untuk saga pada alur fan-out (misalnya, "buat laporan" → ["ambil data", "render grafik", "susun PDF"]). Gunakan `QueueEvents` dan kelas `FlowProducer`:

```typescript
// report.flow.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { FlowProducer, Queue } from 'bullmq';

@Injectable()
export class ReportFlowService {
  private readonly flow = new FlowProducer({
    connection: { host: 'localhost', port: 6379 },
  });

  constructor(@InjectQueue('reports') private readonly reportsQueue: Queue) {}

  async enqueueReport(reportId: string): Promise<void> {
    await this.flow.add({
      name: 'compile-report',
      queueName: 'reports',
      data: { reportId, version: 1 },
      children: [
        { name: 'fetch-report-data', queueName: 'reports-data', data: { reportId } },
        { name: 'render-charts', queueName: 'reports-charts', data: { reportId } },
      ],
    });
  }
}
```

Job induk baru mulai setelah semua anak selesai, dan hasilnya dilampirkan ke data job induk (`job.data.childrenValues` di processor induk). Jaga flow tetap dangkal — pohon induk-anak yang dalam sulit dipahami dan lebih sulit di-debug.

### Langkah 10: Pantau, buat alert, dan operasikan di produksi

Tambahkan dashboard Bull Board untuk memeriksa queue dari browser, menggunakan `@bull-board/express` dengan adapter NestJS:

```typescript
// bull-board.module.ts
import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'notifications',
      adapter: BullMQAdapter,
    }),
  ],
})
export class QueueDashboardModule {}
```

```text
Daftar periksa monitoring queue produksi
| Metrik           | Tempat memantau          | Buat alert saat                       |
|------------------|--------------------------|---------------------------------------|
| jumlah waiting   | Bull Board / statistik   | tumbuh bermenit-menit tanpa worker    |
| jumlah active    | Bull Board / statistik   | melebihi konkurensi worker beberapa saat |
| jumlah failed    | Bull Board / daftar gagal | ada job yang gagal permanen           |
| jumlah stalled   | Bull Board / event       | lebih dari nol selama beberapa menit  |
| latensi job      | event timing kustom      | waktu selesai p95 melebihi SLO        |
| memori Redis     | Redis INFO / UI penyedia | mendekati maxmemory                   |
```

Daftar periksa operasional:

- Ekspor penghitung `QUEUE_NAME`, `ACTIVE`, `WAITING`, `FAILED`, dan `STALLED` ke Prometheus/DataDog dan buat alert pada baris yang relevan dengan SLO Anda.
- Deploy kode processor baru **sebelum** menghapus kode lama — job yang sedang berjalan atau tertunda mungkin masih membawa bentuk payload lama. Deploy bergulir yang mempertahankan versi sebelumnya selama satu masa hidup job menghindari kegagalan deserialisasi.
- Saat worker dimatikan, panggil `worker.close()` di `onModuleDestroy` (NestJS melakukannya secara otomatis untuk processor yang dibuat oleh `@nestjs/bullmq`), dan berhenti menerima job baru sebelum menguras job yang aktif.
- Jika menskalakan ke throughput tinggi, gunakan instance Redis khusus untuk queue alih-alih berbagi dengan cache Anda — pola beban queue (perintah blocking, payload besar) dapat melaparkan lalu lintas cache.

### Langkah 11: Uji queue dengan Redis sungguhan

Pengujian queue adalah pengujian integrasi: Anda membutuhkan Redis yang hidup (gunakan database sekali-pakai via `SELECT`, atau Redis dalam Docker per percobaan). Jangan pernah me-mock queue dalam pengujian yang menjalankan pemrosesan job — pengujian integrasi penuh yang menambahkan job, menjalankan worker, dan menegaskan efek sampingnya adalah satu-satunya pemeriksaan yang dapat dipercaya:

```typescript
// notification.processor.spec.ts
import { Test } from '@nestjs/testing';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationProcessor } from './notification.processor';
import { MailService } from './mail.service';

describe('NotificationProcessor', () => {
  let queue: Queue;
  let mailService: { send: jest.Mock };

  beforeEach(async () => {
    mailService = { send: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({ connection: { host: 'localhost', port: 6379, db: 15 } }),
        BullModule.registerQueue({ name: 'notifications' }),
      ],
      providers: [
        NotificationProcessor,
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    queue = moduleRef.get(getQueueToken('notifications'));
    await queue.obliterate({ force: true }); // bersihkan sebelum tiap pengujian
  });

  afterAll(async () => {
    await queue.close();
  });

  it('sends the email when a send-email job is processed', async () => {
    await queue.add('send-email', { userId: 'u1', email: 'a@b.co', template: 'welcome', version: 1 });
    await new Promise((resolve) => setTimeout(resolve, 300)); // biarkan worker berjalan

    expect(mailService.send).toHaveBeenCalledWith('a@b.co', 'welcome');
  });
});
```

Gunakan nomor database Redis khusus (`db: 15` di atas) untuk pengujian dan `await queue.obliterate({ force: true })` di `beforeEach` agar pengujian tidak saling mengganggu atau mengganggu data development.

## Jaga pipeline tetap membosankan

Pemrosesan latar belakang menghargai sistem yang membosankan dan dapat diprediksi: kontrak job yang eksplisit, konkurensi yang konservatif, metrik yang terlihat, dan kebijakan retry yang gagal dengan keras alih-alih berputar diam-diam. Mulai dengan satu queue, satu processor, dan satu dashboard; tambahkan flow, prioritas, dan queue per domain hanya ketika metrik memberi tahu Anda bahwa itu diperlukan.
