---
title: "Silabus Fullstack SvelteKit"
description: "Kurikulum tujuh modul yang membawa pengembang dari routing SvelteKit hingga aplikasi fullstack yang sudah ter-deploy, mencakup pemuatan data, form action, autentikasi, akses database, pengujian, dan deployment produksi."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Fullstack SvelteKit

## Ringkasan

Silabus tujuh modul ini ditujukan bagi pengembang yang sudah terbiasa menulis komponen dan ingin menguasai seluruh lapisan aplikasi: routing, data server, mutasi, sesi, database nyata, pengujian, dan pipeline deployment. SvelteKit berbeda dari kebanyakan framework frontend karena sisi server bukan pelengkap — `+page.server.ts`, form action, hooks, dan adapter adalah bagian dari kontrak inti framework. Karena itu SvelteKit menjadi kendaraan yang tepat untuk belajar kerja fullstack tanpa harus merangkai tiga perkakas terpisah.

Setiap modul mengikuti pola yang sama: pembekalan konsep, lab terpandu yang menambahkan satu irisan vertikal pada satu aplikasi, lalu daftar periksa review. Tidak ada materi yang dibuang — lab-lab tersebut menumpuk menjadi satu produk utuh (aplikasi pelacak tugas tim dengan proyek, anggota, dan komentar), sehingga pada Modul 7 Anda men-deploy kode yang benar-benar Anda bangun selama enam pekan.

Kursus ini sengaja mengajarkan batas-batas framework sebelum kemudahannya. Load function versus universal load, modul khusus server, form action versus endpoint API, serta perbedaan rute prerender, server-render, dan client-render dibahas lebih awal karena hampir semua bug produksi pada aplikasi SvelteKit berakar dari kesalahan memahami salah satunya.

## Kurikulum

### Modul 1: Routing dan Anatomi Proyek (Minggu 1)

- **Router berbasis filesystem**
  - `+page.svelte`, `+layout.svelte`, `+error.svelte`, dan cara penyarangan keduanya bekerja
  - Segmen dinamis (`[id]`), parameter sisa (`[...path]`), dan parameter opsional (`[[lang]]`)
  - Route group `(app)` untuk layout bersama tanpa segmen URL
- **Data layout dan invalidasi**
  - `+layout.ts` versus `+layout.server.ts`: apa yang berjalan di mana dan kapan
  - `depends()` dan `invalidate()` untuk menyegarkan cache secara tepat sasaran
- **Mode rendering**: SSR sebagai default, `prerender = true` untuk rute statis, `ssr = false` untuk pulau khusus klien
- **Lab**: Menyiapkan kerangka pelacak tugas dengan route group pemasaran, grup aplikasi terautentikasi, dan rute proyek bersarang

### Modul 2: Pemuatan Data di Server (Minggu 2)

- **Mekanisme load function**
  - Apa yang diterima `load` (`params`, `url`, `parent`, `fetch`, `locals`) dan apa yang boleh dikembalikan
  - Aturan serialisasi: hanya data yang aman untuk JSON yang menyeberangi batas server/klien
  - Promise streaming untuk data lambat yang tidak boleh memblokir render
- **Kode khusus server**
  - `$lib/server` dan modul `$env/static/private`; bagaimana SvelteKit menolak menge-bundle rahasia
  - Menyusun lapisan akses data agar rute tidak pernah menyentuh ORM secara langsung
- **`fetch` universal**
  - Mengapa `event.fetch` wajib dipakai di load function dan bagaimana ia meneruskan cookie
  - Menangani kegagalan layanan hulu tanpa merusak halaman: `error()` versus nilai kembalian
- **Lab**: Membangun load daftar dan detail proyek dengan paginasi, error boundary, dan satu widget streaming

### Modul 3: Form, Action, dan Validasi (Minggu 3)

- **Progressive enhancement lebih dulu**
  - `use:enhance` sebagai peningkatan, bukan syarat: form harus tetap bekerja saat JavaScript dimatikan
  - Beberapa action bernama pada satu rute dan routing `?/namaAction`
- **Arsitektur validasi**
  - Skema Zod yang dipakai bersama klien dan server; validasi server adalah satu-satunya otoritas
  - Mengembalikan `fail(400, { data, errors })` dan merender error per field
- **Mutasi yang menyentuh banyak tabel**
  - Transaksi di dalam action; rollback saat terjadi pelanggaran constraint
  - Redirect setelah sukses (`redirect(303, ...)`) dan masalah pengiriman ganda
- **Lab**: Mengimplementasikan action buat, ubah, dan hapus tugas dengan validasi Zod bersama serta UI optimistis

```typescript
// src/routes/projects/[id]/tasks/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';

const TaskInput = z.object({
    title: z.string().min(3).max(120),
    dueDate: z.coerce.date().optional()
});

export const actions = {
    create: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: 'Harus masuk terlebih dahulu' });

        const parsed = TaskInput.safeParse(Object.fromEntries(await request.formData()));
        if (!parsed.success) {
            return fail(400, { errors: parsed.error.flatten().fieldErrors });
        }

        try {
            await db.task.create({
                data: { ...parsed.data, projectId: params.id, ownerId: locals.user.id }
            });
        } catch (err) {
            console.error('task.create gagal', err);
            return fail(500, { message: 'Tugas gagal disimpan, silakan coba lagi' });
        }

        redirect(303, `/projects/${params.id}`);
    }
};
```

### Modul 4: Autentikasi dan Sesi (Minggu 4)

- **Pola sesi**
  - Sesi cookie dengan token opak versus JWT bertanda tangan; mengapa rotasi itu penting
  - Hashing dengan argon2 atau bcrypt, serta perbandingan yang aman terhadap timing attack
- **Hooks sebagai gerbang autentikasi**
  - Membaca cookie sesi di `handle`, mengisi `event.locals`, dan melakukan redirect lebih awal
  - Melindungi route group di satu tempat alih-alih memeriksa per halaman
- **Otorisasi, bukan sekadar autentikasi**
  - Pemeriksaan peran dan kepemilikan di dalam load function dan action
  - Mencegah IDOR: setiap query difilter berdasarkan pengguna aktif atau keanggotaan tim
- **Lab**: Menambahkan registrasi email/kata sandi, login, logout, kedaluwarsa sesi, dan pengaturan proyek berbasis peran

### Modul 5: Akses Database dan Pemodelan Data (Minggu 5)

- **Desain skema dengan Drizzle atau Prisma**
  - Relasi, foreign key, cascade delete, dan indeks yang sesuai dengan query nyata
  - Migrasi sebagai berkas berversi; jangan pernah memakai `db push` di produksi
- **Penanganan koneksi**: Pooling untuk serverless versus server Node berjalan lama
- **Kebersihan query**
  - Memilih kolom yang benar-benar diperlukan; menghindari N+1 pada tampilan daftar
  - Transaksi dan tingkat isolasi untuk penulisan multi-tabel
- **Lab**: Memodelkan proyek, keanggotaan, tugas, dan komentar; menambahkan migrasi serta query agregat dashboard

### Modul 6: Menguji Seluruh Lapisan (Minggu 6)

- **Unit dan component test**
  - Vitest untuk logika murni (perizinan, validasi, formatter)
  - `@testing-library/svelte` untuk perilaku komponen dengan event pengguna
- **Integration test kode server**
  - Memanggil action dan load function langsung dengan `RequestEvent` sintetis
  - Database uji sekali pakai yang dimigrasikan setiap kali dijalankan
- **End-to-end test**: Playwright terhadap `vite preview`, mencakup alur daftar → buat proyek → buat tugas
- **Lab**: Mencapai cakupan bermakna pada perizinan dan siklus hidup tugas, ditambah tiga alur E2E

### Modul 7: Deployment dan Operasional (Minggu 7)

- **Adapter**
  - `adapter-node`, `adapter-vercel`, `adapter-static`: apa yang berubah pada aplikasi Anda
  - Strategi variabel lingkungan per platform serta konfigurasi build-time versus runtime
- **Performa dan caching**: Header cache pada respons load; mode rendering yang ramah CDN per rute
- **Observabilitas**
  - `handleError` untuk pelaporan error server terstruktur; request ID di dalam log
  - Health check, graceful shutdown, dan degradasi layanan database secara terkendali
- **Lab**: Men-deploy ke host Node di balik reverse proxy, menyambungkan pelaporan error, dan menjalankan uji beban ringan

## Proyek Akhir

Bangun dan deploy **TeamFlow**, sebuah pelacak tugas multi-tenant, dengan SvelteKit:

- Registrasi, login, logout, dan kedaluwarsa sesi dengan cookie yang diverifikasi di server
- Proyek dengan peran keanggotaan (owner, editor, viewer) yang ditegakkan di setiap load dan action
- Tugas dengan tenggat waktu, penugasan, dan papan status yang berubah melalui form action
- Utas komentar dengan validasi sisi server dan rendering optimistis
- Database Postgres yang diakses lewat lapisan akses data dengan migrasi tersimpan di repositori
- Unit test Vitest untuk logika perizinan dan cakupan Playwright untuk empat alur kritis
- Deployment produksi dengan pelaporan error, log terstruktur, dan dokumentasi variabel lingkungan

## Kriteria Penilaian

- **Tugas**: Setiap lab modul direview dari sisi kebenaran (irisan fitur benar-benar berjalan end to end) dan disiplin batas — tidak ada rahasia di bundle klien, tidak ada pemeriksaan otorisasi yang hanya di klien, tidak ada validasi yang hanya di browser.
- **Proyek Akhir**: Dinilai dari kelengkapan fitur, postur keamanan (penanganan sesi, ketahanan terhadap IDOR, action yang aman dari CSRF), kualitas pengujian, reproducibility deployment, dan kejelasan catatan arsitektur tertulis yang menjelaskan alasan pemilihan setiap mode rendering.

## Referensi

- [Dokumentasi SvelteKit](https://svelte.dev/docs/kit) — routing, load, form action, hooks, dan adapter
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/what-are-runes) — `$state`, `$derived`, `$props`, dan `$effect`
- [SvelteKit Auth Helpers](https://authjs.dev/reference/sveltekit) — pola sesi dengan Auth.js
- [Dokumentasi Drizzle ORM](https://orm.drizzle.team/docs/overview) — skema, migrasi, dan query
- [Vitest](https://vitest.dev/guide/) dan [Playwright](https://playwright.dev/docs/intro) — pengujian unit dan end-to-end
