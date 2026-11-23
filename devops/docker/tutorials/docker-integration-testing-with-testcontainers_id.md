---
title: "Pengujian Integrasi Berbasis Docker dengan Testcontainers"
description: "Bangun pengujian integrasi yang cepat dan deterministik dengan menjalankan container Postgres, Redis, dan Kafka sungguhan di dalam test suite menggunakan Testcontainers — pilihan lifecycle, wait strategy, berbagi network, reuse, dan penyetelan CI."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Pengujian Integrasi Berbasis Docker dengan Testcontainers

## Ringkasan

Tutorial ini menunjukkan cara memakai Docker sebagai infrastruktur pengujian: test suite Anda menjalankan container dependensi sungguhan (PostgreSQL, Redis, Kafka) sesuai kebutuhan, terhubung melalui port yang dipetakan, lalu membersihkannya secara otomatis. Anda akan membangun pustaka fixture yang dapat dipakai ulang, mengganti `sleep` tetap dengan pemeriksaan kesiapan nyata, dan menyetel suite agar tetap cepat di CI alih-alih menjadi hambatan sepuluh menit.

## Target Audiens

- Backend dan platform engineer yang sudah mengontainerisasi aplikasinya dan kini ingin pengujian integrasi yang dapat dipercaya.
- Developer tingkat menengah hingga mahir yang nyaman dengan image Docker, pemetaan port, dan test runner seperti Vitest, Jest, atau Pytest.
- DevOps engineer yang bertanggung jawab menjaga test suite berbasis container tetap cepat dan tidak flaky di CI.

## Prasyarat

- Docker Engine 24+ atau Docker Desktop, dengan daemon dapat dijangkau dari shell (`docker info` berhasil).
- Node.js 20+ dan sebuah test runner (contoh memakai Vitest, tetapi polanya berlaku langsung untuk Jest atau Pytest).
- Pemahaman yang cukup tentang image vs container, pemetaan port, dan network Docker.
- Familiar dengan migrasi SQL atau ORM seperti Prisma, Knex, atau Drizzle.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan bagaimana klien Testcontainers mengendalikan Docker daemon dan mengapa pendekatan ini menghindari test double untuk data store.
- Memilih antara lifecycle container per-test, per-file, per-suite, dan reuse berdasarkan biaya serta kebutuhan isolasi.
- Mengganti sleep arbitrer dengan wait strategy yang gagal cepat dan akurat.
- Menghubungkan container aplikasi dan container dependensi pada Docker network bersama dengan alias DNS.
- Mengisi dan mereset state database secara cepat memakai migrasi dan template database.
- Mendiagnosis container yang bocor dan memangkas waktu suite dengan pre-pull image, reuse, dan direktori data tmpfs.

## Konteks dan Motivasi

Sebagian besar "integration test" di lapangan sebenarnya adalah integration test terhadap mock. Hasilnya lolos secara konsisten, dan berbohong secara konsisten. Substitusi Postgres in-memory menerima query yang ditolak oleh `CHECK` constraint sungguhan, tiruan Redis mengabaikan semantik offset `SETRANGE`, dan producer Kafka yang di-mock tidak pernah menguji rebalance consumer group yang menjadi dasar kode Anda. Kegagalan yang paling perlu Anda tangkap — pelanggaran constraint, isolasi transaksi, operator JSONB, perilaku `ON CONFLICT`, kedaluwarsa TTL — justru merupakan perilaku yang tidak dapat direproduksi oleh double.

Memakai satu database staging bersama adalah jalan pintas lain, dan gagal dengan cara berbeda: test saling mengganggu lewat baris yang dibagi, urutan menjadi penting, dan migrasi yang setengah jadi merusak setiap run berikutnya. Testcontainers mengambil jalur ketiga. Docker sudah memberi Anda salinan layanan yang terisolasi, murah, dan reprodusibel; pustaka ini cukup menjalankan salinan tersebut saat suite membutuhkannya, memberi tahu port yang dipetakan, lalu menghapusnya ketika run selesai. Hasilnya adalah database sungguhan dengan ergonomi sebuah unit test.

## Konten Inti

### Mengapa test double gagal untuk data store

Test double adalah implementasi kedua dengan bugnya sendiri. Setiap perilaku yang berbeda antara double dan layanan sungguhan adalah hasil hijau palsu di pipeline Anda. Tiga kategori menyumbang sebagian besar insiden produksi yang lolos dari pengujian ber-mock:

- **Semantik constraint dan tipe.** Postgres menolak luapan `varchar(12)`, menegakkan foreign key, dan meng-cast `'42'` ke `integer` pada konteks di mana SQLite akan menyimpannya sebagai teks.
- **Semantik konkurensi.** `SELECT ... FOR UPDATE NOWAIT`, retry `SERIALIZABLE`, dan konflik unique index di antara penulis paralel hanya ada di engine sungguhan.
- **Semantik operasional.** Eviksi key Redis di bawah `maxmemory`, timing rebalance consumer Kafka, dan collation `utf8mb4` MySQL semuanya mengubah perilaku kode aplikasi.

Testcontainers bukan framework mocking. Ia adalah pengelola lifecycle yang membuat layanan sungguhan sedapat mungkin dibuang seperti mock. Perlakukan sebagai default yang benar untuk apa pun yang melintasi batas jaringan menuju datastore atau broker.

### Bagaimana Testcontainers berbicara dengan Docker daemon

Pustaka klien tidak pernah memanggil `docker run` lewat shell. Ia berbicara dengan Docker Engine API melalui socket yang sama dengan CLI, diambil dari `DOCKER_HOST`, lalu jatuh ke `/var/run/docker.sock` di Linux dan named pipe di Windows. Memahami urutannya menjelaskan hampir semua error yang akan Anda temui:

1. Klien memastikan daemon dapat dijangkau, gagal cepat dengan pesan jelas alih-alih timeout.
2. Ia menarik image bila belum ada, kecuali `withImagePullPolicy` atau pre-pull menyatakan lain.
3. Ia membuat container dengan nama acak, mempublikasikan port internal yang diminta ke port host ephemeral, lalu menjalankannya.
4. Ia menjalankan wait strategy sampai container benar-benar siap atau startup timeout terlampaui.
5. Ia mengembalikan detail koneksi, terutama `getMappedPort(5432)` dan `getHost()`.
6. Saat shutdown, container sidecar bernama Ryuk membersihkan semua yang berlabel `org.testcontainers=true`, termasuk container yang terabaikan karena proses test crash.

Poin terakhir penting di CI. Ketika run test dibunuh karena timeout, Ryuk tetap membersihkan. Ketika Anda menjalankan dengan `TESTCONTAINERS_RYUK_DISABLED=true` demi kecepatan, cleanup menjadi tanggung jawab Anda — dan `docker ps --filter label=org.testcontainers=true` menjadi alat diagnosis pagi berikutnya.

### Lifecycle: per-test, per-file, per-suite, dan reuse

Pilihan lifecycle adalah tuas terbesar terhadap waktu suite. Biaya startup mendominasi: container Postgres biasanya butuh 1,5–3 detik untuk menerima koneksi, container Kafka 6–15 detik.

| Lifecycle | Isolasi | Biaya | Dipakai saat |
|-----------|---------|-------|--------------|
| Per test | Total | Tertinggi | Test merusak state global yang tidak bisa dipulihkan reset |
| Per file / class | Tinggi, dengan truncation antar test | Menengah | Default untuk sebagian besar suite |
| Per suite (singleton) | Menengah; butuh disiplin cleanup | Rendah | Fixture read-mostly, test khusus skema |
| Reuse antar run | Rendah; state bertahan | Terendah | Iterasi pengembangan lokal saja |

Default praktisnya adalah **per file**, dengan `beforeEach` yang melakukan truncate pada tabel yang bisa berubah. Sisakan container per-test untuk kasus langka di mana test merusak database dengan cara yang tidak bisa diperbaiki truncation, misalnya menghapus tabel atau menghabiskan sequence. Jangan pernah mengaktifkan reuse antar run di CI: state dari run kemarin diam-diam mengubah hasil hari ini, dan perubahan skema bisa meninggalkan container dengan struktur lama tetap berjalan tanpa disadari.

### Wait strategy menentukan flakiness

`await new Promise((r) => setTimeout(r, 5000))` adalah akar sebagian besar test container yang flaky. Ia terlalu lambat di mesin cepat dan terlalu pendek di runner CI yang terbebani. Wait strategy menggantikan tebakan dengan sebuah kondisi:

- `Wait.forLogMessage(...)` untuk layanan yang mengumumkan kesiapan di log, dengan jumlah kemunculan yang diminta.
- `Wait.forListeningPort()` untuk layanan yang baru menerima koneksi setelah inisialisasi.
- `Wait.forHealthcheck()` ketika image mendefinisikan `HEALTHCHECK`, sinyal paling akurat yang tersedia.
- `Wait.forSuccessfulCommand(...)` untuk probe tingkat aplikasi seperti `pg_isready -U app -d app`.
- `Wait.forHttp(...)` untuk sidecar dependensi yang mengekspos endpoint HTTP.

Postgres mencetak banner kesiapannya dua kali selama inisialisasi: sekali untuk server sementara yang dipakai `initdb`, sekali untuk server sungguhan. Menunggu satu kemunculan saja akan menghubungkan Anda ke server yang sebentar lagi dimatikan. Inilah penyebab paling umum gejala "berhasil di lokal, gagal di CI" pada container Postgres.

### Berbagi network antara aplikasi dan dependensinya

Ada dua mode pengujian, dan keduanya tidak dapat dipertukarkan:

- **Mode host.** Proses test berjalan di host dan terhubung ke `localhost:<mappedPort>`. Sederhana, cepat, dan benar untuk hampir semua test tingkat aplikasi.
- **Mode network.** Aplikasi sendiri berjalan di container (karena Anda menguji image yang akan dikirim), sehingga tidak bisa melihat port host. Kedua container bergabung ke network buatan pengguna dan saling menyapa lewat alias.

Mode network-lah yang membuktikan image final Anda benar-benar bekerja: entrypoint, user non-root, migrasi yang sudah tertanam, resolusi DNS, dan penanganan environment variable. Test mode host bisa lolos sementara image rusak, karena pengkabelan image tidak pernah diuji.

### Reuse dan biaya startup di CI

Tiga teknik, diterapkan berurutan, menjaga suite container tetap di bawah beberapa menit:

1. **Pre-pull image** pada langkah CI khusus agar job test tidak pernah menanggung latensi jaringan pada cache dingin.
2. **Bagikan satu container per file** dan reset state dengan `TRUNCATE ... RESTART IDENTITY CASCADE` alih-alih membuat ulang container.
3. **Gunakan template database** untuk penyiapan skema: migrasikan sekali ke `app_template`, lalu buat setiap database test dengan `CREATE DATABASE test_n TEMPLATE app_template`, jauh lebih murah daripada memutar ulang migrasi.

Ekstra khusus lokal adalah container yang dapat dipakai ulang (`TESTCONTAINERS_REUSE_ENABLE=true` plus `~/.testcontainers.properties`) dan direktori data berbasis `tmpfs`, yang menurunkan startup Postgres menjadi sekitar satu detik karena inisialisasi tidak lagi menyentuh disk. Keduanya menukar daya tahan dengan kecepatan, jadi jauhkan dari konfigurasi CI.

### Cleanup, kebocoran, dan batas resource

Suite container adalah kebocoran resource yang menunggu terjadi bila Anda mengabaikan dua hal:

- **Teardown eksplisit.** Daftarkan `afterAll(() => container.stop())`, dan bungkus fixture agar assertion yang melempar error tetap menghentikan container.
- **Batas resource.** Query liar di container test dapat menghabiskan memori runner dan memicu OOM kill yang tampak seperti kegagalan tak terkait. Terapkan batas melalui `withCreateContainerCmdModifier` dan pastikan nilainya.

Batasi juga startup timeout dengan `withStartupTimeout(Duration.ofSeconds(60))` agar image rusak gagal dalam satu menit dengan potongan log, bukan menggantung sampai timeout global job. Pesan kegagalannya menyertakan 100 baris log terakhir, biasanya cukup untuk mengidentifikasi environment variable yang hilang tanpa menjalankan ulang apa pun.

### Mengisi data secara deterministik

Pembuatan skema dan pengisian data adalah dua hal berbeda dengan biaya berbeda. Jalankan migrasi sekali per container melalui `withCopyFilesToContainer` plus skrip init, atau dengan menjalankan CLI migrasi Anda ke port yang dipetakan sebelum test pertama. Setelah itu reset data dengan truncation.

Untuk fixture, utamakan insert eksplisit dengan primary key tetap dibanding data acak. Data acak menghasilkan test yang gagal sekali setiap beberapa ratus run ketika string yang dihasilkan bertabrakan dengan unique index — mode kegagalan terburuk, karena tidak dapat direproduksi sesuai permintaan. Bila keacakan tidak terhindarkan, seed generator-nya dengan konstanta.

## Contoh Kode

### Struktur proyek

```text
tests/
  integration/
    fixtures/
      postgres-fixture.ts
      redis-fixture.ts
      broker-fixture.ts
    users.repository.test.ts
    checkout.flow.test.ts
    image-smoke.test.ts
  global-setup.ts
vitest.config.ts
```

### Fixture PostgreSQL dengan probe kesiapan sungguhan

```typescript
// tests/integration/fixtures/postgres-fixture.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | null = null;

export async function startPostgres(): Promise<StartedPostgreSqlContainer> {
  if (container) return container;

  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('app')
    .withUsername('app')
    .withPassword('app')
    // Banner dicetak dua kali: sekali untuk initdb, sekali untuk server sungguhan.
    .withWaitStrategy(
      (await import('testcontainers')).Wait.forLogMessage(
        /database system is ready to accept connections/,
        2,
      ),
    )
    .withStartupTimeout(60_000)
    .withTmpfs({ '/var/lib/postgresql/data': 'rw,noexec,nosuid,size=512m' })
    .withCreateContainerCmdModifier((cmd) => {
      cmd.withMemory(512 * 1024 * 1024);
    })
    .start();

  return container;
}

export async function resetDatabase(): Promise<void> {
  const { Client } = await import('pg');
  const client = new Client({
    host: container!.getHost(),
    port: container!.getMappedPort(5432),
    user: 'app',
    password: 'app',
    database: 'app',
  });
  await client.connect();
  await client.query('TRUNCATE users, orders, order_items RESTART IDENTITY CASCADE');
  await client.end();
}

export async function stopPostgres(): Promise<void> {
  await container?.stop();
  container = null;
}
```

### Fixture bersama melalui berkas global setup

```typescript
// tests/global-setup.ts
import { execFileSync } from 'node:child_process';
import { startPostgres, stopPostgres } from './integration/fixtures/postgres-fixture';

export async function setup() {
  const pg = await startPostgres();

  // Terapkan migrasi sekali per container, ke port host yang dipetakan.
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: {
      ...process.env,
      DATABASE_URL: `postgresql://app:app@${pg.getHost()}:${pg.getMappedPort(5432)}/app`,
    },
    stdio: 'inherit',
  });

  process.env.TEST_DATABASE_URL = `postgresql://app:app@${pg.getHost()}:${pg.getMappedPort(5432)}/app`;
}

export async function teardown() {
  await stopPostgres();
}
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
```

### Container aplikasi dan dependensi pada network bersama

```typescript
// tests/integration/image-smoke.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer, Network, Wait, StartedNetwork } from 'testcontainers';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let network: StartedNetwork;
let pg: StartedPostgreSqlContainer;
let api: ReturnType<GenericContainer['start']> extends Promise<infer T> ? T : never;

beforeAll(async () => {
  network = await new Network().start();

  pg = await new PostgreSqlContainer('postgres:16-alpine')
    .withNetwork(network)
    .withNetworkAliases('db')          // dapat diakses sebagai db:5432 di dalam network
    .withDatabase('app')
    .withUsername('app')
    .withPassword('app')
    .withWaitStrategy(Wait.forSuccessfulCommand('pg_isready -U app -d app'))
    .start();

  // Jalankan image yang benar-benar Anda kirim, bukan salinan source yang di-bind mount.
  const apiContainer = await new GenericContainer('registry.example.com/shop-api:pr-482')
    .withNetwork(network)
    .withExposedPorts(8080)
    .withEnvironment({
      DATABASE_URL: 'postgresql://app:app@db:5432/app',   // alias DNS, bukan localhost
      NODE_ENV: 'production',
    })
    .withWaitStrategy(Wait.forHttp('/healthz', 8080).forStatusCode(200))
    .withStartupTimeout(90_000)
    .start();

  api = apiContainer as typeof api;
}, 180_000);

afterAll(async () => {
  await api?.stop();
  await pg?.stop();
  await network?.stop();
});

describe('image yang dikirim', () => {
  it('melayani endpoint kesehatan dengan database sungguhan di belakangnya', async () => {
    const port = api.getMappedPort(8080);
    const response = await fetch(`http://${api.getHost()}:${port}/healthz`);
    expect(response.status).toBe(200);
  });
});
```

### Referensi kesiapan untuk image umum

```text
Image                    Probe                                          Kemunculan
postgres:16-alpine       log: "database system is ready to accept"      2
redis:7-alpine           redis-cli ping mengembalikan PONG              1
redpanda:latest          log: "Successfully started Redpanda"           1
localstack/localstack    http: /_localstack/health status 200           1
mysql:8                  log: "ready for connections"                   2
```

### Workflow CI dengan image yang sudah di-pull

```yaml
name: integration-tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Pre-pull image pengujian
        run: |
          docker pull postgres:16-alpine &
          docker pull redis:7-alpine &
          wait

      - run: npm ci
      - name: Jalankan suite integrasi
        env:
          TESTCONTAINERS_RYUK_DISABLED: "false"
        run: npm run test:integration

      - name: Gagal bila ada container bocor
        if: always()
        run: |
          leaked=$(docker ps -aq --filter label=org.testcontainers=true | wc -l)
          echo "container bocor: $leaked"
          test "$leaked" -eq 0
```

### Override cepat khusus lokal

```bash
# Aktifkan reuse antar run untuk iterasi lokal yang cepat (jangan pernah di CI).
echo 'testcontainers.reuse.enable=true' >> ~/.testcontainers.properties

# Audit container yang ditinggalkan suite setelah run yang dibatalkan.
docker ps -a --filter label=org.testcontainers=true \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

# Hapus tanpa menyentuh workload lain.
docker ps -aq --filter label=org.testcontainers=true | xargs -r docker rm -f
```

## Insight Penting

- **Layanan sungguhan, lifecycle yang bisa dibuang.** Nilai Testcontainers ada pada pengelolaan lifecycle, bukan container itu sendiri. Apa pun yang tidak dapat direset dengan murah sebaiknya mendapat container khusus; yang bisa direset sebaiknya berbagi satu container.
- **Jangan pernah menulis port secara hardcode.** Hanya `getMappedPort(5432)` yang benar. `5432` tetap akan bertabrakan dengan Postgres lokal developer dan dengan job test paralel di runner yang sama.
- **Siap tidak sama dengan sedang mendengarkan.** Menunggu port berarti socket sudah terbuka; menunggu perintah, banner log, atau health check berarti layanan sudah dapat melayani. Banner ganda Postgres adalah jebakan klasik, dan MySQL juga memilikinya.
- **`localhost` salah di dalam network.** Begitu aplikasi berjalan di container, `localhost` menunjuk ke container itu. Gunakan alias network, dan pisahkan konfigurasi mode host dan mode network alih-alih memaksa satu URL melayani keduanya.
- **Uji image, bukan source tree.** Bind mount pada `/app` menyembunyikan langkah `COPY` yang rusak dan dependensi produksi yang hilang. Smoke test image yang dikirim adalah satu-satunya test yang memvalidasi artefak yang Anda deploy.
- **Reuse adalah kenyamanan lokal, bukan optimasi CI.** Reuse antar run mempertahankan state dan bisa menyajikan skema basi setelah perubahan migrasi, menghasilkan kegagalan yang hilang di mesin bersih.
- **Batasi setiap timeout.** `withStartupTimeout` membatasi kegagalan; timeout test global hanya memberi tahu ada yang menggantung, jauh setelah output log yang berguna tergulir hilang.
- **Paralelisme melipatgandakan container.** Empat worker paralel berarti empat instance Postgres. Hitung memori dan koneksi dengan tepat, atau jalankan test integrasi dengan satu worker dan test unit secara paralel.
- **Perhatikan tag image.** `postgres:16-alpine` aman; `postgres:latest` membuat test berubah perilaku tanpa perubahan kode. Pin digest bila rilis upstream yang mengejutkan akan mahal.

## Langkah Berikutnya

- Baca panduan process supervision dan graceful shutdown Docker agar image yang sama keluar dengan bersih ketika test menghentikannya.
- Pelajari panduan networking Docker Compose untuk memperdalam perilaku DNS dan alias yang dipakai pada mode network.
- Pindahkan penyiapan database ke template database untuk memangkas biaya reset per file setelah suite tumbuh melewati beberapa puluh test.
- Terapkan pola yang sama pada object storage dan message broker dengan container LocalStack dan Redpanda.
- Tinjau cheat sheet keamanan Docker sebelum menjalankan image test pihak ketiga di CI, terutama dengan port privileged atau host mount.

## Kesimpulan

Anda kini memiliki suite integrasi yang menjalankan infrastruktur sungguhan sesuai kebutuhan: fixture Postgres dengan probe kesiapan yang akurat, setup bersama yang memigrasikan sekali per run, smoke test mode network yang memvalidasi image yang Anda deploy, dan pengkabelan CI yang melakukan pre-pull image serta gagal bila ada container bocor. Suite ini menguji perilaku yang tidak dapat diwakili mock — constraint, isolasi, dan DNS — sambil tetap selesai dalam waktu yang masih ditoleransi developer sebelum melakukan push.
