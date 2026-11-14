---
title: "Tutorial Pipeline Migrasi Database dengan GitHub Actions"
description: "Membangun pipeline migrasi skema yang aman untuk produksi di GitHub Actions menggunakan pola expand-and-contract, eksekusi berseri, pengujian di database rehearsal, gerbang persetujuan, dan rencana rollback forward-only."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Tutorial Pipeline Migrasi Database dengan GitHub Actions

## Ringkasan

Deploy aplikasi mudah dikembalikan; perubahan skema biasanya tidak. Tutorial ini membangun pipeline migrasi yang menjalankan perubahan skema sebagai workflow tersendiri dengan gerbang persetujuan: DDL fase expand lebih dulu, backfill bertahap kedua, lalu langkah contract yang baru dirilis setelah versi aplikasi lama benar-benar hilang. Di akhir, Anda memiliki workflow yang menyerialkan percobaan migrasi bersamaan, membuktikan rencana migrasi pada database rehearsal, mewajibkan persetujuan manusia untuk pernyataan destruktif, dan meninggalkan catatan setiap migrasi yang dijalankan.

## Target Audiens

- Engineer DevOps dan platform yang sudah memiliki pipeline CI/CD dan kini perlu mengubah skema produksi melaluinya.
- Engineer backend yang bertanggung jawab atas evolusi skema pada database relasional tanpa downtime terencana.
- Tingkat mahir: Anda perlu nyaman membaca YAML workflow, menulis `psql` terhadap database sungguhan, dan memahami transaksi serta locking.

## Prasyarat

- Repositori GitHub dengan Actions aktif dan minimal satu service yang memakai database.
- Database PostgreSQL yang dapat diakses dari CI, ditambah database rehearsal atau staging terpisah yang bisa di-reset kapan saja.
- Secret repositori atau organisasi untuk connection string, misalnya `DATABASE_URL` dan `REHEARSAL_DATABASE_URL`.
- GitHub Environment bernama `production-db` dengan required reviewers sudah dikonfigurasi.
- Pemahaman dasar SQL DDL (`ALTER TABLE`, `CREATE INDEX`), transaksi, dan advisory lock.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyusun pipeline migrasi yang men-deploy skema dan kode aplikasi dalam urutan yang aman.
- Menerapkan pola expand-and-contract sehingga dua versi aplikasi dapat berjalan di atas satu skema.
- Menyerialkan migrasi menggunakan concurrency group workflow dan advisory lock database.
- Menguji migrasi pada database sekali pakai dan menaruh pernyataan destruktif di balik persetujuan.
- Merancang rencana rollback forward-only dengan batching, timeout, dan point-in-time recovery sebagai jaring pengaman sesungguhnya.

## Konteks dan Motivasi

Sebagian besar tim memulai dengan menjalankan migrasi sebagai langkah pertama job deploy. Cara itu berfungsi sampai tiba hari sebuah migrasi mengunci tabel selama empat puluh detik ketika trafik masih berdatangan, atau sampai rollback mengembalikan kode aplikasi lama tetapi tidak mengembalikan skema lama. Kegagalannya hampir tidak pernah pada SQL-nya sendiri; kegagalan ada pada urutan, locking, dan tidak adanya langkah rehearsal.

Pipeline migrasi khusus memperbaiki masalah struktural tersebut:

- Perubahan skema mendapat workflow sendiri, persetujuan sendiri, dan jejak audit sendiri, bukan tersembunyi di dalam log deploy.
- Perubahan aditif dikirim lebih dulu sebelum kode yang membutuhkannya, sehingga tidak ada request yang mengenai skema yang belum dipahaminya.
- Proses yang berjalan bersamaan tidak bisa saling mendahului, hal ini penting ketika dua merge masuk dalam selang satu menit.
- Pernyataan destruktif memerlukan keputusan manusia dan backup yang masih segar, bukan sekadar CI berwarna hijau.

Hasilnya adalah pipeline di mana bagian paling berisiko dari sebuah rilis direncanakan, diamati, dan dapat dikembalikan melalui pemulihan data, bukan melalui dugaan.

## Konten Inti

### Mengapa Perubahan Skema Merusak Deploy

Tiga sifat database relasional membuat migrasi berperilaku berbeda dari rilis aplikasi.

- DDL mengambil lock. Sebuah `ALTER TABLE` memerlukan lock `ACCESS EXCLUSIVE` di PostgreSQL, yang mengantre di belakang transaksi terbuka dan memblokir setiap query yang datang setelahnya. Migrasi yang menunggu lima detik untuk lock-nya berarti lima detik outage untuk tabel tersebut, meskipun DDL-nya sendiri instan.
- Deploy berlangsung bertahap. Selama rolling deploy, versi aplikasi lama dan baru melayani trafik bersamaan. Skema apa pun yang hanya dipahami kode baru akan merusak kode lama yang masih berjalan.
- Rollback bersifat asimetris. Men-deploy ulang image container sebelumnya memerlukan satu menit. Menghapus kolom yang masih dibaca image sebelumnya juga memerlukan satu menit, tetapi datanya sudah hilang.

Pipeline dalam tutorial ini menjawab ketiga sifat itu: migrasi yang sadar lock, urutan aditif lebih dulu, dan rencana rollback yang tidak pernah bergantung pada pembalikan DDL.

### Pola Expand and Contract

Setiap perubahan skema dipecah menjadi tiga fase yang dapat di-deploy terpisah.

- **Expand**: hanya DDL aditif. Kolom nullable baru, tabel baru, index baru yang dibuat secara concurrent. Versi aplikasi lama mengabaikannya dan tetap berjalan.
- **Migrate**: aplikasi mulai menulis ke struktur lama dan baru sekaligus, dan job backfill mengisi data historis secara bertahap.
- **Contract**: setelah tidak ada versi yang berjalan memakai struktur lama, rilis berikutnya menghapusnya, menambahkan constraint `NOT NULL`, dan mengganti nama bila perlu.

Invariannya sederhana: pada setiap titik waktu, skema adalah superset dari kebutuhan semua versi aplikasi yang sedang berjalan. Inilah yang membuat rolling deploy dan perubahan skema dapat hidup berdampingan.

```text
Rilis 1  app v1  +  expand      (tambah kolom, backfill dimulai)
Rilis 2  app v2  +  dual-write  (v2 menulis keduanya, masih membaca lama)
Rilis 3  app v3  +  switch      (pembacaan pindah ke kolom baru)
Rilis 4  app v3  +  contract    (hapus kolom lama, tambah NOT NULL)
```

Setiap baris dapat di-deploy dan dikembalikan secara mandiri, karena tidak ada yang dihapus sebelum tidak terpakai selama satu siklus rilis penuh.

### Memisahkan Workflow Migrasi dari Workflow Deploy

Migrasi tinggal di file workflow tersendiri yang dipicu oleh `workflow_dispatch` dan oleh push ke direktori migrasi. Workflow deploy memanggilnya lewat `workflow_call` dan menunggu keberhasilannya sebelum mengirim kode aplikasi.

Pemisahan ini memberi tiga sifat yang tidak dimiliki langkah migrasi inline: job migrasi dapat memakai environment yang lebih ketat dengan required reviewers, dapat dijalankan ulang tanpa membangun ulang image, dan log-nya berdiri sendiri sebagai rekaman apa yang berubah di produksi.

Dua aturan membuat urutannya aman:

- Workflow migrasi tidak pernah menjalankan dua fase dalam satu job. Expand dan contract adalah dispatch terpisah dengan satu rilis nyata di antaranya.
- Workflow deploy mengonsumsi hasil migrasi, bukan sebaliknya. Kode aplikasi yang membutuhkan kolom baru baru dapat di-deploy setelah migrasi expand berhasil.

### Menyerialkan Migrasi dengan Concurrency Group dan Advisory Lock

Concurrency group workflow menyerialkan eksekusi workflow yang sama, tetapi tidak melindungi dari migrasi yang dijalankan dari laptop atau dari file workflow kedua. Tambahkan lock di level database di dalam runner migrasi agar jaminan tersebut tetap berlaku terlepas dari siapa yang memulai prosesnya.

Dua mekanisme yang saling melapisi:

- `concurrency: group: db-migrations-production, cancel-in-progress: false` pada workflow, sehingga eksekusi yang mengantre menunggu, bukan saling membatalkan di tengah transaksi.
- `pg_advisory_lock(<key>)` di awal runner, sehingga proses kedua akan menunggu atau berhenti daripada menyisipkan DDL.

Membatalkan eksekusi di tengah migrasi adalah hasil terburuk yang mungkin terjadi: DDL bisa sudah commit sementara pencatatan ledger belum. `cancel-in-progress: false` mencegah workflow melakukan itu, dan advisory lock menutup celah dari luar workflow.

### Membuktikan Migrasi Aman Sebelum Menyentuh Produksi

Rehearsal bukan opsi untuk perubahan destruktif atau yang menulis ulang tabel. Job rehearsal memulihkan dump produksi terbaru ke database rehearsal, menjalankan migrasi yang tertunda, dan mengukur apa yang benar-benar terjadi.

Periksa empat hal sebelum job produksi diizinkan berjalan:

- **Drift dan ledger**: alat migrasi melaporkan set yang sudah diterapkan dan checksum yang sama dengan produksi, sehingga Anda tidak mengirim migrasi yang diedit setelah dijalankan.
- **Perilaku lock**: setiap pernyataan berjalan dengan `lock_timeout` dan `statement_timeout`, sehingga DDL yang terblokir akan gagal daripada membuat tabel menggantung.
- **Durasi**: waktu di rehearsal menentukan jendela maintenance. Backfill yang memerlukan empat puluh menit di rehearsal tidak bisa dipadatkan ke dalam job deploy dua menit.
- **Query plan**: untuk index baru dan query yang ditulis ulang, jalankan `EXPLAIN (ANALYZE, BUFFERS)` di database rehearsal untuk memastikan planner memakai index baru.

Produksi menjalankan pernyataan yang sama dengan timeout yang sama, sehingga kegagalan di rehearsal adalah kegagalan nyata, bukan artefak khusus rehearsal.

### Membuat Perubahan Destruktif Dapat Dikembalikan

Migrasi bersifat forward-only dalam pipeline ini. Pembalikan dilakukan melalui tiga mekanisme terpisah, sesuai urutan preferensi:

- **Feature flag**: mengembalikan perilaku aplikasi tanpa menyentuh skema. Ini rollback tercepat dan paling sering dipakai, serta tidak memerlukan operasi database sama sekali.
- **Kompensasi aditif**: mengirim migrasi forward baru yang memulihkan atau mengisi ulang apa yang dihapus, memakai tabel backup hasil langkah contract, bukan hasil restore dump.
- **Point-in-time recovery**: pilihan terakhir, dipakai ketika data benar-benar hancur dan tidak ada tabel backup. Inilah alasan pipeline mewajibkan backup terverifikasi sebelum migrasi contract berjalan.

Fase contract sengaja ditunda. Tidak ada yang dihapus pada rilis yang sama saat penulisan ke objek tersebut berhenti, sehingga rollback dalam satu siklus rilis tidak perlu membuat ulang objek skema.

## Contoh Kode

### Workflow Migrasi Lengkap

Workflow di bawah menjalankan fase expand, mengujinya di rehearsal, lalu menerapkannya ke produksi di balik environment `production-db`.

```yaml
# .github/workflows/db-migrate.yml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      phase:
        description: "expand | backfill | contract"
        required: true
        default: "expand"
        type: choice
        options: [expand, backfill, contract]
      migration_set:
        description: "Direktori migrasi tertunda yang akan diterapkan"
        required: true
        default: "migrations/pending"
  workflow_call:
    inputs:
      phase:
        required: true
        type: string
      migration_set:
        required: true
        type: string

concurrency:
  group: db-migrations-production
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  rehearsal:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4

      - name: Pulihkan dump produksi terbaru ke rehearsal
        env:
          REHEARSAL_DATABASE_URL: ${{ secrets.REHEARSAL_DATABASE_URL }}
        run: |
          set -euo pipefail
          ./scripts/db/restore-latest-dump.sh
          psql "$REHEARSAL_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select version();"

      - name: Periksa drift terhadap ledger migrasi
        env:
          DATABASE_URL: ${{ secrets.REHEARSAL_DATABASE_URL }}
        run: ./scripts/db/migrate.sh --check-drift --dir "${{ inputs.migration_set }}"

      - name: Terapkan migrasi ke rehearsal dan ukur waktunya
        env:
          DATABASE_URL: ${{ secrets.REHEARSAL_DATABASE_URL }}
          LOCK_TIMEOUT_MS: "3000"
          STATEMENT_TIMEOUT_MS: "600000"
        run: |
          set -euo pipefail
          /usr/bin/time -f "rehearsal_duration_seconds=%e" \
            ./scripts/db/migrate.sh --apply --dir "${{ inputs.migration_set }}"

      - name: Gagal jika ada regresi planner pada index baru
        env:
          DATABASE_URL: ${{ secrets.REHEARSAL_DATABASE_URL }}
        run: ./scripts/db/verify-plans.sh

  production:
    needs: rehearsal
    runs-on: ubuntu-latest
    timeout-minutes: 45
    environment: production-db
    steps:
      - uses: actions/checkout@v4

      - name: Wajibkan backup terverifikasi sebelum migrasi contract
        if: inputs.phase == 'contract'
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: ./scripts/db/require-fresh-backup.sh --max-age-minutes 180

      - name: Terapkan set migrasi
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          PHASE: ${{ inputs.phase }}
          LOCK_TIMEOUT_MS: "3000"
          STATEMENT_TIMEOUT_MS: "300000"
        run: ./scripts/db/migrate.sh --apply --dir "${{ inputs.migration_set }}"

      - name: Catat set yang diterapkan di ringkasan run
        if: always()
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: ./scripts/db/migrate.sh --status >> "$GITHUB_STEP_SUMMARY"
```

### Runner Migrasi yang Terkunci dan Berbatas Waktu

Runner mengambil advisory lock, menerapkan timeout, dan menulis ke ledger append-only sehingga set yang diterapkan sebagian tetap terlihat pada eksekusi berikutnya.

```javascript
// scripts/db/migrate.js — dipanggil oleh scripts/db/migrate.sh
const { Client } = require('pg');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const LOCK_KEY = 918273645; // stabil per database, bukan per migrasi
const dir = process.argv[2];
const apply = process.argv.includes('--apply');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Gagal cepat daripada mengantre di belakang DDL panjang pada tabel yang sama.
    await client.query(`SET lock_timeout = '${process.env.LOCK_TIMEOUT_MS || 3000}ms'`);
    await client.query(`SET statement_timeout = '${process.env.STATEMENT_TIMEOUT_MS || 300000}ms'`);

    const lock = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [LOCK_KEY]);
    if (!lock.rows[0].acquired) {
      console.error('Proses migrasi lain masih memegang advisory lock; berhenti.');
      process.exit(3);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_ledger (
        filename    text PRIMARY KEY,
        checksum    text NOT NULL,
        applied_at  timestamptz NOT NULL DEFAULT now(),
        duration_ms integer NOT NULL
      )
    `);

    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    const applied = new Map(
      (await client.query('SELECT filename, checksum FROM schema_ledger')).rows.map((r) => [
        r.filename,
        r.checksum,
      ]),
    );

    for (const file of files) {
      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');

      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          throw new Error(`${file} diubah setelah diterapkan — checksum tidak cocok`);
        }
        continue;
      }

      if (!apply) {
        console.log(`[dry-run] akan menerapkan ${file}`);
        continue;
      }

      const startedAt = Date.now();
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_ledger (filename, checksum, duration_ms) VALUES ($1, $2, $3)',
          [file, checksum, Date.now() - startedAt],
        );
        await client.query('COMMIT');
        console.log(`menerapkan ${file} dalam ${Date.now() - startedAt}ms`);
      } catch (error) {
        await client.query('ROLLBACK');
        // 55P03 = lock_not_available: DDL menunggu melewati lock_timeout.
        if (error.code === '55P03') {
          console.error(`${file} gagal mendapat lock tepat waktu; ulangi di jendela sepi.`);
        }
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock_all()').catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

### Migrasi Expand

Hanya aditif: kolom nullable, index yang dibangun tanpa memblokir penulisan, dan trigger yang menjaga kolom baru tetap terisi selama backfill berjalan.

```sql
-- migrations/pending/0001_expand_orders_add_currency_code.sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS currency_code char(3);

-- CONCURRENTLY tidak dapat berjalan di dalam transaksi; runner mendeteksinya
-- dan melakukan autocommit untuk pembuatan index, bukan membungkusnya dengan BEGIN/COMMIT.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_currency_code
  ON orders (currency_code)
  WHERE currency_code IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_orders_currency_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.currency_code IS NULL THEN
    NEW.currency_code := COALESCE(NEW.currency, 'USD');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_currency_code ON orders;
CREATE TRIGGER trg_orders_currency_code
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_orders_currency_code();
```

### Backfill Bertahap

Backfill dalam batch terbatas agar lag replikasi dan tekanan lock tetap terprediksi, dan berhenti dengan rapi ketika sisa baris sudah cukup kecil untuk diselesaikan sekali jalan.

```javascript
// scripts/db/backfill-currency-code.js
const { Client } = require('pg');

const BATCH_SIZE = 5000;
const SLEEP_MS = 200;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`SET statement_timeout = '120s'`);

    for (;;) {
      const { rowCount } = await client.query(
        `UPDATE orders
            SET currency_code = COALESCE(currency, 'USD')
          WHERE id IN (
            SELECT id FROM orders
             WHERE currency_code IS NULL
             ORDER BY id
             LIMIT $1
             FOR UPDATE SKIP LOCKED
          )`,
        [BATCH_SIZE],
      );

      console.log(`backfill ${rowCount} baris`);
      if (rowCount < BATCH_SIZE) break;
      await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

### Migrasi Contract Setelah Rilis

Eksekusi contract terjadi pada rilis berikutnya, setelah kode yang membaca `orders.currency` benar-benar hilang. Data lama disimpan di tabel backup, bukan dibuang.

```sql
-- migrations/pending/0100_contract_orders_currency.sql
CREATE TABLE IF NOT EXISTS orders_currency_archive AS
  SELECT id, currency FROM orders;

ALTER TABLE orders
  ALTER COLUMN currency_code SET DEFAULT 'USD';

ALTER TABLE orders
  ALTER COLUMN currency_code SET NOT NULL;

DROP TRIGGER IF EXISTS trg_orders_currency_code ON orders;
DROP FUNCTION IF EXISTS sync_orders_currency_code();
ALTER TABLE orders DROP COLUMN IF EXISTS currency;
```

Tabel arsip inilah yang membuat rollback dalam satu siklus menjadi murah: kompensasinya adalah satu migrasi forward yang mengisi ulang `currency` dari `orders_currency_archive`, bukan restore point-in-time.

## Insight Penting

- Urutan lebih penting daripada sintaks. Expand, deploy, pindahkan pembacaan, contract — masing-masing pada rilis terpisah, dan skema selalu menjadi superset dari kebutuhan versi yang sedang berjalan.
- Jangan pernah membatalkan migrasi di tengah jalan. `cancel-in-progress: false` ditambah advisory lock mencegah workflow yang dibatalkan meninggalkan DDL yang sudah diterapkan tanpa baris ledger.
- Tetapkan `lock_timeout` lebih kecil dari kesabaran Anda dan lebih besar dari waktu tunggu DDL normal. Tiga detik adalah titik awal yang baik; migrasi yang tidak mendapat lock dalam tiga detik adalah migrasi yang harus dijalankan di jendela sepi.
- `CREATE INDEX CONCURRENTLY` tidak dapat berjalan di dalam blok transaksi. Deteksi di runner dan lakukan autocommit, atau pisahkan pembuatan index ke file migrasi tersendiri.
- Lakukan rehearsal dengan volume data nyata. Pengukuran dari database uji kosong adalah fiksi; restore dump adalah satu-satunya rehearsal yang memprediksi jendela maintenance.
- Perlakukan ledger sebagai artefak audit. Checksum menangkap migrasi yang diedit setelah diterapkan, penyebab paling umum insiden produksi berlabel "di staging berhasil".
- Rollback melalui feature flag dan migrasi forward, bukan melalui pembalikan DDL. Simpan tabel backup hasil langkah contract minimal satu siklus rilis penuh.
- Backfill panjang bukan urusan job deploy. Skrip bertahap dengan jadwal menjaga lag replikasi tetap terkendali dan membuat deploy selesai dalam hitungan detik.

## Langkah Berikutnya

- Tambahkan pemeriksaan diff skema pada pull request agar reviewer melihat DDL sebelum masuk ke set migrasi.
- Perluas pipeline dengan deteksi drift terjadwal yang gagal secara eksplisit ketika produksi menyimpang dari ledger.
- Pelajari [silabus release engineering GitHub Actions](../syllabi/github-actions-release-engineering-syllabus_id.md) untuk proses rilis menyeluruh tempat pipeline ini terpasang.
- Baca [cheatsheet keamanan dan secret GitHub Actions](../cheatsheets/github-actions-security-secrets-cheatsheet_id.md) untuk memindahkan kredensial database ke akses berumur pendek berbasis OIDC.
- Coba [panduan biaya dan performa GitHub Actions](../guides/github-actions-cost-and-performance-guide_id.md) agar job rehearsal yang panjang tidak membengkakkan tagihan Anda.

## Kesimpulan

Anda telah membangun pipeline migrasi yang memperlakukan perubahan skema sebagai rilis tersendiri: rehearsal terhadap data nyata, runner dengan advisory lock, timeout, dan ledger checksum, job produksi di balik gerbang persetujuan, serta fase contract yang baru dikirim satu rilis setelah kode yang membuatnya aman. Deploy aplikasi kini bergantung pada migrasi alih-alih membawanya, dan itulah yang mengubah perubahan skema dari risiko outage menjadi langkah rutin yang dapat diaudit.
