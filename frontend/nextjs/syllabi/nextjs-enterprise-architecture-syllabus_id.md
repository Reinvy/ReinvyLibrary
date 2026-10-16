---
title: "Silabus Arsitektur Enterprise Next.js"
description: "Kurikulum delapan modul yang membawa pengembang React berpengalaman dari dasar App Router hingga platform Next.js produksi yang terobservasi."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Arsitektur Enterprise Next.js

## Ringkasan

Silabus ini adalah program dua belas minggu dengan delapan modul untuk tim yang sudah
mengirim aplikasi React dan kini membutuhkan basis kode Next.js yang mampu bertahan
melalui banyak squad produk, pembaruan dependensi triwulanan, dan audit keamanan. Materi
ini sengaja menghindari tutorial routing "hello world". Setiap modul diakhiri dengan
architecture decision record, karena bagian tersulit dari Next.js skala enterprise bukanlah
menulis halaman — melainkan mempertahankan batas antara rendering, data, dan deployment.

Struktur kurikulum bergerak dari satu batas rendering (App Router) menuju tepi organisasi
(monorepo, observabilitas, deploy). Setiap modul mengasumsikan modul sebelumnya sudah
dikuasai: Anda tidak bisa menginstrumentasi lapisan data yang belum punya kontrak, dan
Anda tidak bisa memecah monorepo sebelum import Anda eksplisit. Total beban sekitar 8–10
jam per modul, termasuk lab.

## Kurikulum

### Modul 1: Model Mental App Router
- **Batas rendering**
  - Server Component versus Client Component, dan kapan `"use client"` diperlukan
  - Streaming dengan `loading.tsx` serta boundary Suspense
  - Route group, parallel route, dan intercepting route untuk pola modal
- **Lab**: Migrasikan dashboard pages-router ke App Router tanpa menurunkan metadata SEO

### Modul 2: Lapisan Data dan Kontrak Cache
- **Strategi pengambilan data**
  - Tingkat cache `fetch` (`force-cache`, `no-store`, `revalidate`) dan invalidasi berbasis tag
  - Server Action versus Route Handler: pilih berdasarkan batas kepercayaan, bukan tren
  - Validasi di tepi sistem memakai skema Zod yang dipakai bersama klien dan server
- **Lab**: Rancang matriks invalidasi cache untuk katalog produk berisi 40 ribu SKU

### Modul 3: Autentikasi dan Otorisasi
- **Arsitektur sesi**
  - Sesi berbasis cookie versus access token JWT; rotasi dan pencabutan token
  - Middleware untuk penyaringan kasar, pemeriksaan di server untuk otorisasi resource
  - Cakupan multi-tenant: id tenant berasal dari sesi, tidak pernah dari body request
- **Lab**: Implementasikan pemeriksaan peran dan tenant dengan satu test gagal per upaya bypass

### Modul 4: Strategi Pengujian
- **Piramida pengujian untuk UI yang dirender server**
  - Unit test untuk logika murni dan validator skema
  - Integration test terhadap Route Handler memakai objek request sungguhan
  - Smoke test end-to-end dengan Playwright untuk alur autentikasi dan checkout
- **Lab**: Capai cakupan 70% pada logika bisnis tanpa satu pun snapshot test

### Modul 5: Anggaran Performa
- **Ukur dahulu, optimalkan kemudian**
  - Data lapangan Core Web Vitals versus data lab; pilih angka yang benar-benar dijanjikan
  - Analisis bundle, `next/dynamic`, dan biaya sebuah batas client component
  - Disiplin pada gambar, font, dan skrip pihak ketiga
- **Lab**: Tegakkan anggaran ukuran bundle di CI yang menggagalkan pull request saat regresi

### Modul 6: Monorepo dan Paket Bersama
- **Tata letak workspace**
  - Pemisahan `apps/` dan `packages/` dengan pipeline tugas Turborepo
  - Paket internal untuk design system, konfigurasi, dan klien API hasil generator
  - Batas dependensi: siapa boleh mengimpor apa, ditegakkan lewat aturan lint
- **Lab**: Ekstrak paket UI bersama yang dipakai dua aplikasi tanpa duplikasi konfigurasi Tailwind

### Modul 7: Observabilitas
- **Sinyal yang benar-benar penting**
  - Structured logging dengan id request dan trace yang merambat end to end
  - Span OpenTelemetry untuk Server Action dan panggilan API hulu
  - Taksonomi error: error validasi yang wajar versus insiden yang membangunkan manusia
- **Lab**: Lacak satu checkout gagal melintasi browser, server, dan penyedia pembayaran

### Modul 8: Deployment dan Rekayasa Rilis
- **Mengirim dengan aman**
  - Kesetaraan environment, manajemen secret, dan preview deployment per pull request
  - Konfigurasi build-time versus runtime; mengapa `NEXT_PUBLIC_` adalah kontrak publik
  - Canary rollout, pemanasan cache, dan latihan rollback
- **Lab**: Kirim fitur di balik flag, rollback dalam waktu kurang dari lima menit, dokumentasikan latihannya

## Proyek Akhir

Bangun **Atlas Console**, platform admin multi-tenant untuk perusahaan logistik fiktif.
Proyek wajib memuat: dashboard ber-cakupan tenant yang terautentikasi, katalog produk
ter-cache dengan invalidasi berbasis tag, satu Server Action dengan validasi dan audit log
lengkap, paket design system bersama yang dipakai aplikasi kedua yang lebih kecil, serta
trace end-to-end yang diekspor ke kolektor OpenTelemetry. Luaran berupa deployment yang
berjalan, satu architecture decision record per modul, dan rencana rollback tertulis yang
bisa dijalankan rekan tim tanpa kehadiran Anda.

## Kriteria Penilaian

- **Lab per modul (40%)**: Dinilai dari kebenaran solusi, kualitas decision record, dan
  apakah trade-off dinyatakan eksplisit, bukan tersirat.
- **Partisipasi code review (10%)**: Dua review terstruktur atas pull request rekan memakai
  checklist batas dari Modul 1 dan Modul 6.
- **Proyek akhir (40%)**: Kejelasan arsitektur, kebenaran cache saat invalidasi, test otorisasi
  yang benar-benar gagal ketika guard dihapus, dan cakupan observabilitas jalur checkout.
- **Latihan rollback (10%)**: Dilaksanakan langsung; dinilai dari waktu pemulihan dan kejelasan
  runbook tertulis.
- **Ambang kelulusan**: 75% keseluruhan, tanpa ada kategori di bawah 60%.

## Referensi

- Dokumentasi resmi Next.js — https://nextjs.org/docs
- RFC React Server Components — https://github.com/reactjs/rfcs/pull/188
- Buku panduan Turborepo — https://turborepo.com/docs
- Instrumentasi OpenTelemetry JavaScript — https://opentelemetry.io/docs/languages/js/
- Panduan Web Vitals — https://web.dev/articles/vitals
- Martin Kleppmann, *Designing Data-Intensive Applications* (bab replikasi dan konsistensi,
  untuk modul cache)
- Sam Newman, *Building Microservices* (edisi kedua), untuk modul batas sistem dan deployment
