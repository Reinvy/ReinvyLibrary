---
title: "Tutorial Sinkronisasi Offline React Native"
description: "Bangun lapisan data offline-first di React Native yang menyimpan setiap mutasi secara lokal, memutar ulang antrean saat koneksi kembali, dan menyelesaikan konflik secara deterministik antar perangkat."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Tutorial Sinkronisasi Offline React Native

## Ringkasan

Tutorial ini membangun lapisan data offline-first untuk React Native: setiap penulisan masuk lebih dulu ke outbox lokal yang persisten, UI langsung mengonfirmasi, dan mesin sinkronisasi memutar ulang antrean ketika jaringan kembali. Di akhir Anda memiliki modul yang bertahan setelah aplikasi ditutup paksa, tidak membuat data ganda saat retry, dan menyelesaikan konflik alih-alih membuang salah satu versi secara diam-diam.

## Target Audiens

- Pengembang React Native dan Expo yang layarnya sudah memakai API REST atau GraphQL.
- Pengembang tingkat menengah hingga mahir yang nyaman dengan TypeScript, `async`/`await`, dan satu basis data lokal.

## Prasyarat

- Node.js 20+, proyek React Native 0.74+ atau Expo SDK 51+, dan TypeScript sudah dikonfigurasi.
- `@react-native-community/netinfo` untuk status koneksi dan `expo-sqlite` (atau `op-sqlite`) untuk penyimpanan.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Memodelkan state lokal agar penulisan tidak pernah hilang antara ketukan tombol dan konfirmasi server.
- Membangun antrean mutasi append-only dengan identitas stabil buatan klien.
- Memutar ulang mutasi secara aman memakai kunci idempotensi dan backoff eksponensial berjitter.
- Menerapkan kebijakan konflik yang eksplisit, bukan last-write-wins yang terjadi tanpa sengaja.

## Konteks dan Motivasi

Seorang kurir menekan "Konfirmasi pengiriman" di basement tanpa sinyal. Versi naif memanggil `fetch`, menerima galat jaringan, lalu menampilkan toast merah: pekerjaannya hilang. Di tautan yang buruk pengguna menekan lagi dan server mencatat dua pengiriman. Lalu aplikasi masuk latar belakang, JavaScript berhenti, dan antrean tidak pernah terkuras. Offline-first bukan fitur yang ditempelkan belakangan; ia adalah sifat dari cara Anda menyimpan dan mengirim penulisan. Pola di bawah adalah versi terkecil yang benar-benar tepat: write-ahead log di perangkat, kontrak server yang idempoten, dan loop yang memperlakukan status koneksi sebagai petunjuk, bukan sumber kebenaran.

## Konten Inti

### Persistensi dan Outbox Append-Only

State yang hanya hidup di React state atau Zustand mati bersama prosesnya, dan Android mematikan proses latar belakang dengan agresif, sehingga mutasi tertunda harus sampai ke SQLite sebelum UI mengonfirmasi. AsyncStorage cukup untuk cache kecil tetapi tidak cocok di sini: Anda butuh kueri berindeks (`WHERE next_attempt_at <= ?`) dan baris yang bertahan setelah crash. Modelkan setiap mutasi sebagai satu baris — UUID klien, jenis operasi, payload JSON, dan metadata penjadwalan (`attempts`, `next_attempt_at`) — yang disisipkan, dicoba ulang, lalu dihapus setelah server mengakui. Jangan pernah mengubah payload lama untuk "memperbaiki" sesuatu; sisipkan operasi baru agar log tetap terbaca.

### Koneksi Hanya Petunjuk, Bukan Gerbang

NetInfo melaporkan status tautan, bukan keterjangkauan: captive portal tampil `connected`, dan VPN yang putus bisa meninggalkan soket yang tampak hidup. Perlakukan `connected` sebagai "coba sekarang" dan galat jaringan sebagai "mundur sebentar", tidak pernah sebaliknya. Timer saat aplikasi di depan menutup kasus ketika event koneksi tidak pernah terpicu.

### Putar Ulang dengan Idempotensi dan Backoff

Kirim `Idempotency-Key: <row.id>` pada setiap percobaan. Server menyimpan kunci itu bersama responsnya dan mengembalikan respons tersimpan untuk duplikat, sehingga percobaan yang timeout setelah penulisan berhasil mengembalikan `200` alih-alih membuat record kedua. Kegagalan menaikkan `attempts` dan menjadwalkan ulang pada `min(2^attempts * 1000, 300000)` ms plus jitter, agar perangkat yang kembali online bersamaan tidak membentuk thundering herd.

### Resolusi Konflik Butuh Kebijakan yang Dideklarasikan

Ketika dua perangkat menyunting record yang sama, satu akan kalah kecuali aturan merge didefinisikan. Tiga kebijakan cukup untuk sebagian besar aplikasi: server-wins untuk konfigurasi dan data referensi, merge per field ketika suntingan menyentuh kolom berbeda, dan last-write-wins berbasis jam server untuk teks bebas. Apa pun pilihannya, tampilkan hasilnya — banner "versi Anda diganti" jauh lebih baik daripada perubahan yang hilang tanpa kabar.

## Contoh Kode

Modul outbox menulis sebelum kembali, sehingga pemanggil bisa menampilkan "tersimpan" begitu `enqueue` selesai. Indeks pada `next_attempt_at` menjaga pemutaran ulang tetap murah saat tabel membesar.

```typescript
// src/sync/outbox.ts
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export type MutationKind = 'create_order' | 'update_delivery' | 'delete_note';
export type OutboxRow = { id: string; kind: MutationKind; payload: string; attempts: number };

const db = SQLite.openDatabaseSync('app.db');

export async function initOutbox(): Promise<void> {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL,
            payload TEXT NOT NULL, created_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
            next_attempt_at INTEGER NOT NULL DEFAULT 0);
        CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox (next_attempt_at);
    `);
}

export async function enqueue(kind: MutationKind, payload: unknown): Promise<string> {
    const id = Crypto.randomUUID();
    await db.runAsync(
        'INSERT INTO outbox (id, kind, payload, created_at) VALUES (?, ?, ?, ?)',
        [id, kind, JSON.stringify(payload), Date.now()],
    );
    return id;
}

export async function takeReady(limit = 20): Promise<OutboxRow[]> {
    return db.getAllAsync<OutboxRow>(
        'SELECT id, kind, payload, attempts FROM outbox WHERE next_attempt_at <= ? ORDER BY created_at ASC LIMIT ?',
        [Date.now(), limit],
    );
}
```

Mesin menguras antrean secara serial — pemutaran paralel mengacaukan urutan mutasi yang saling bergantung:

```typescript
// src/sync/engine.ts
import { takeReady, type OutboxRow } from './outbox';
import { db } from './db';
import { postMutation } from '../api/client';

let draining = false;
const backoffMs = (n: number) => Math.min(2 ** n * 1000, 300_000) + Math.floor(Math.random() * 1000);

export async function drainQueue(): Promise<void> {
    if (draining) return;
    draining = true;
    try {
        for (const row of await takeReady()) {
            if ((await replay(row)) !== 'retry') {
                await db.runAsync('DELETE FROM outbox WHERE id = ?', [row.id]);
                continue;
            }
            await db.runAsync(
                'UPDATE outbox SET attempts = attempts + 1, next_attempt_at = ? WHERE id = ?',
                [Date.now() + backoffMs(row.attempts + 1), row.id],
            );
        }
    } finally {
        draining = false;
    }
}

async function replay(row: OutboxRow): Promise<'done' | 'retry' | 'drop'> {
    try {
        await postMutation(row.kind, JSON.parse(row.payload), { idempotencyKey: row.id });
        return 'done';
    } catch (error) {
        const status = (error as { status?: number }).status;
        const permanent = status !== undefined && status >= 400 && status < 500;
        // Galat 4xx tidak akan pernah berhasil jika diulang; 409 dan 429 adalah pengecualian.
        return permanent && status !== 409 && status !== 429 ? 'drop' : 'retry';
    }
}
```

Picu pengurasan dari tiga tempat: langganan NetInfo, `AppState` kembali ke `active`, dan timer saat aplikasi di depan yang menutup event yang tidak pernah dikirim OS. Di iOS dan Android, daftarkan `drainQueue` yang sama dengan `expo-background-task` (atau `react-native-background-fetch`) agar antrean yang melewati sesi tetap terkuras; lindungi dengan flag `draining` seperti di atas karena callback latar belakang bisa tumpang tindih dengan pengurasan di depan.

```typescript
// src/sync/scheduler.ts
import NetInfo from '@react-native-community/netinfo';
import { drainQueue } from './engine';

export const startSyncScheduler = (): (() => void) =>
    NetInfo.addEventListener((state) => {
        if (state.isConnected && state.isInternetReachable !== false) void drainQueue();
    });
```

## Insight Penting

- Tulis dulu, konfirmasi kemudian: satu-satunya pengakuan yang andal adalah baris di SQLite, bukan promise yang selesai di memori.
- UUID buatan klien membuat retry idempoten tanpa biaya tambahan; ID dari server memaksa langkah rekonsiliasi yang tidak Anda perlukan.
- Batasi dan beri jitter pada backoff — retry yang tersinkron membebani backend yang baru saja pulih.
- Perlakukan `409` sebagai pemicu merge: ambil record server, terapkan kebijakan Anda, sisipkan hasil resolusinya.
- Hapus baris hanya setelah ack terkonfirmasi; penghapusan optimistis adalah cara antrean offline kehilangan data tanpa suara.

## Langkah Berikutnya

- Tambahkan delta sync di sisi server (`/changes?since=`) agar perangkat menarik suntingan yang bukan berasal darinya.
- Pelajari CRDT (Yjs, Automerge) ketika merge per field tidak cukup untuk teks kolaboratif.

## Kesimpulan

Anda kini memiliki jalur penulisan offline yang benar: outbox persisten, pemutaran ulang idempoten, backoff berjitter, dan kebijakan konflik yang dipilih dengan sadar. Sisanya adalah permukaan produk — indikator tertunda, banner konflik, tampilan debug — tetapi lapisan data tidak lagi kehilangan pekerjaan pengguna saat sinyal menghilang.
