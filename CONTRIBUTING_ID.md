# Panduan Kontribusi ReinvyLibrary

Pertama-tama, terima kasih telah mempertimbangkan untuk berkontribusi di **ReinvyLibrary**! Proyek ini adalah koleksi materi edukasi teknologi terkurasi yang dikembangkan bersama oleh komunitas.

Repositori ini dirancang agar sangat terstruktur dan ramah dibaca oleh mesin, sehingga memudahkan **pengembang manusia** maupun **Agentic AI** untuk membaca, membuat, dan memelihara konten.

---

## Kode Etik

Dengan berpartisipasi dalam proyek ini, Anda diharapkan untuk menjaga standar komunikasi yang sopan, kolaboratif, dan konstruktif.

---

## Alur Kontribusi

1. **Fork repositori** ke akun GitHub Anda.
2. **Buat branch baru** (`git checkout -b feature/konten-baru-anda`).
3. **Tambahkan berkas Anda** sesuai dengan standar direktori, penamaan, dan format di bawah.
4. **Validasi perubahan Anda** secara lokal:
   ```bash
   npm install
   npm run validate
   npm run lint
   ```
5. **Commit perubahan Anda** dengan deskripsi yang jelas (`git commit -m 'feat: tambah tutorial docker'`).
6. **Push ke branch** (`git push origin feature/konten-baru-anda`).
7. **Buka Pull Request (PR)** menggunakan templat PR yang disediakan.

---

## Taksonomi Repositori

Semua konten harus diatur menggunakan prinsip **Topic-First Organization** (Organisasi Berbasis Topik terlebih dahulu). Struktur direktori diatur sebagai berikut:

```plaintext
<kategori>/<teknologi>/<bentuk-konten-plural>/
```

### Whitelist Kategori dan Teknologi

Hanya nilai-nilai berikut yang diizinkan dalam penamaan direktori dan YAML frontmatter:

- **Kategori**: `backend`, `frontend`, `mobile`, `devops`, `database`
- **Teknologi**: `expressjs`, `elysiajs`, `nextjs`, `react-native`, `flutter`, `golang`, `laravel`, `docker`, `pm2`, `redis`, `mongodb`, `postgres`

### Bentuk Konten Plural
- `tutorials` (untuk panduan pengkodean langkah demi langkah)
- `syllabi` (untuk rancangan kurikulum atau silabus)
- `cheatsheets` (untuk referensi cepat perintah/sintaks)
- `guides` (untuk pedoman arsitektur dan praktik terbaik)

*Contoh Path Target*: `backend/expressjs/tutorials/api-versioning-strategies_id.md`

---

## Standar Penamaan File

Nama file harus mematuhi aturan berikut secara ketat:

1. Gunakan format **kebab-case** saja (huruf kecil, angka, dan tanda hubung; tanpa spasi).
2. File utama berbahasa Inggris diakhiri dengan `.md` (contoh: `rate-limiting-techniques.md`).
3. Terjemahan bahasa Indonesia diakhiri dengan `_id.md` (contoh: `rate-limiting-techniques_id.md`).
4. Pastikan nama file dasar konsisten antara versi bahasa Inggris dan terjemahan bahasa Indonesia.

---

## Spesifikasi YAML Frontmatter

Setiap file markdown konten wajib dimulai dengan blok YAML frontmatter yang berisi field-field berikut:

```yaml
---
title: "Judul Materi Edukasi"
description: "Deskripsi singkat 1-2 kalimat mengenai konten untuk tabel indeks"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---
```

### Penjelasan Field
- **title**: Judul materi pembelajaran (string).
- **description**: Ringkasan singkat (string, maksimal 160 karakter).
- **category**: Harus cocok dengan salah satu kategori yang diizinkan.
- **technology**: Harus cocok dengan salah satu teknologi yang diizinkan.
- **difficulty**: Harus berupa `beginner`, `intermediate`, atau `advanced`.
- **type**: Harus berupa `tutorial`, `syllabus`, `cheatsheet`, atau `guide`.
- **locale**: Harus berupa `en` untuk file berbahasa Inggris, atau `id` untuk file berbahasa Indonesia.

---

## Templat Konten

Anda dapat menggunakan templat yang tersedia di direktori `.github/templates/` sebagai cetak biru:

- [Templat Tutorial](.github/templates/tutorial-template.md) / [Templat Tutorial (ID)](.github/templates/tutorial-template_id.md)
- [Templat Silabus](.github/templates/syllabus-template.md) / [Templat Silabus (ID)](.github/templates/syllabus-template_id.md)
- [Templat Cheat Sheet](.github/templates/cheatsheet-template.md) / [Templat Cheat Sheet (ID)](.github/templates/cheatsheet-template_id.md)
- [Templat Panduan](.github/templates/guide-template.md) / [Templat Panduan (ID)](.github/templates/guide-template_id.md)

---

## Petunjuk untuk Agentic AI

Jika Anda adalah **Agentic AI** atau **asisten pemrograman** yang ditugaskan untuk membuat konten di repositori ini:

1. **Baca Skema**: Baca semua aturan di atas dan daftar whitelist kategori/teknologi.
2. **Ambil Templat**: Muat templat yang sesuai dari `.github/templates/` berdasarkan jenis file dan bahasa yang diminta.
3. **Format Frontmatter**: Masukkan YAML frontmatter yang benar dan lengkap di bagian paling atas berkas. Pastikan `locale` sesuai dengan akhiran file (`_id.md` -> `id`, `.md` -> `en`).
4. **Standardisasi Heading**: Pastikan bahasa heading di dalam file sesuai dengan locale (misalnya gunakan heading bahasa Inggris seperti `## Summary` untuk `en`, dan heading bahasa Indonesia seperti `## Ringkasan Singkat` untuk `id`).
5. **Jalankan Validasi**: Setelah membuat berkas baru, selalu jalankan `npm run validate` dan `npm run lint` di workspace Anda untuk mengaudit pekerjaan Anda dan memperbaiki semua pelanggaran aturan.
