# Standar Konten - ReinvyLibrary

Dokumen ini menetapkan struktur resmi, pemformatan, dan panduan kualitas untuk semua materi edukasi di **ReinvyLibrary**. Standar ini memastikan bahwa konten sangat bernilai bagi pengembang manusia dan mudah diurai/dibuat oleh **Agentic AI**.

---

## 1. Persyaratan Umum

### 1.1 Keseimbangan Bahasa (Parity)
Setiap topik harus tersedia dalam bahasa Inggris dan bahasa Indonesia:
- File dasar bahasa Inggris harus diakhiri dengan `.md` (misalnya, `routing-basics.md`).
- Terjemahan bahasa Indonesia harus diakhiri dengan `_id.md` (misalnya, `routing-basics_id.md`).
- Nama file (kebab-case) harus sama persis antara versi bahasa Inggris dan bahasa Indonesia.

### 1.2 Larangan Duplikasi Metadata
Semua metadata wajib didefinisikan **hanya** di dalam YAML frontmatter di bagian atas file.
- **Aturan**: Jangan menambahkan bagian `## Metadata` atau tabel serupa di bagian bawah dokumen. Hal ini mencegah duplikasi data dan ketidakkonsistenan pemformatan.

### 1.3 Konsistensi Bahasa yang Ketat
- File bahasa Inggris (`locale: "en"`) wajib menggunakan bahasa Inggris untuk semua judul, teks, dan komentar kode.
- File bahasa Indonesia (`locale: "id"`) wajib menggunakan bahasa Indonesia untuk semua judul, teks, dan komentar kode.
- Jangan mencampuradukkan bahasa dalam judul (misalnya, tidak boleh ada `## Insight Penting` di dalam file bahasa Inggris).

### 1.4 Kualitas Kode
- Semua blok kode harus menggunakan pengidentifikasi sintaks bahasa yang benar (misalnya `javascript`, `bash`, `prisma`).
- Contoh kode harus lengkap, realistis, dan dapat dijalankan (bukan sekadar template umum).
- Selalu sertakan penanganan kesalahan (error handling) dalam contoh kode.

---

## 2. Standar Tata Letak Dokumen

### 2.1 Tutorial (`type: "tutorial"`)
Tutorial menyediakan panduan langkah demi langkah. Wajib menyertakan judul H2 berikut sesuai urutan:

#### Judul File Bahasa Inggris (Tutorial)
- `# Title of Tutorial` (H1)
- `## Summary`: Ringkasan 2-3 kalimat dari tutorial dan hasil akhir.
- `## Target Audience`: Siapa target pembaca dan level pengembang yang diharapkan.
- `## Prerequisites`: Pengetahuan awal, perkakas, dan instalasi yang diperlukan.
- `## Learning Objectives`: Apa yang akan dipelajari pembaca (poin-poin).
- `## Context and Motivation`: Mengapa topik ini penting dan masalah dunia nyata yang dipecahkannya.
- `## Core Content`: Panduan langkah demi langkah konseptual.
- `## Code Examples`: Blok kode lengkap yang dapat dijalankan beserta penjelasannya.
- `## Key Insights`: Praktik terbaik, jebakan (gotchas), catatan arsitektur, pertimbangan performa.
- `## Next Steps`: Topik yang disarankan untuk dipelajari selanjutnya.
- `## Conclusion`: Ringkasan pencapaian.

#### Judul File Bahasa Indonesia (Tutorial)
- `# Judul Tutorial` (H1)
- `## Ringkasan`: Ringkasan 2-3 kalimat mengenai tutorial dan hasil akhirnya.
- `## Target Audiens`: Siapa yang cocok mempelajari materi ini dan level pengembang.
- `## Prasyarat`: Pengetahuan, perkakas, dan instalasi yang diperlukan.
- `## Tujuan Pembelajaran`: Apa yang akan dipelajari pembaca (poin-poin).
- `## Konteks dan Motivasi`: Mengapa topik ini penting dan masalah nyata yang diselesaikan.
- `## Konten Inti`: Panduan konseptual langkah demi langkah.
- `## Contoh Kode`: Blok kode lengkap yang dapat dijalankan beserta penjelasannya.
- `## Insight Penting`: Praktik terbaik, jebakan, catatan arsitektur, pertimbangan performa.
- `## Langkah Berikutnya`: Topik yang disarankan untuk dipelajari selanjutnya.
- `## Kesimpulan`: Ringkasan pencapaian.

---

### 2.2 Silabus (`type: "syllabus"`)
Silabus menguraikan kursus terstruktur. Wajib menyertakan:

#### Judul File Bahasa Inggris (Silabus)
- `# Course Title` (H1)
- `## Overview`: Ruang lingkup kursus keseluruhan dan alasan struktur kurikulum.
- `## Curriculum`: Rincian minggu demi minggu atau modul demi modul secara mendalam.
- `## Final Project`: Deskripsi proyek praktis yang akan dibangun siswa.
- `## Assessment Criteria`: Rincian evaluasi (tugas, kuis, kriteria proyek).
- `## References`: Tautan ke dokumentasi resmi, video, dan buku.

#### Judul File Bahasa Indonesia (Silabus)
- `# Judul Silabus` (H1)
- `## Ringkasan`: Lingkup keseluruhan kursus dan alasan struktur kurikulum.
- `## Kurikulum`: Rincian modul demi modul atau minggu demi minggu secara mendalam.
- `## Proyek Akhir`: Deskripsi proyek praktis yang akan dibangun siswa.
- `## Kriteria Penilaian`: Rincian evaluasi (tugas, kuis, kriteria proyek).
- `## Referensi`: Tautan ke dokumentasi resmi, video, dan buku referensi.

---

### 2.3 Cheat Sheet (`type: "cheatsheet"`)
Cheat Sheet menyediakan tabel referensi perintah dan sintaksis yang cepat:

#### Judul File Bahasa Inggris (Cheat Sheets)
- `# Technology Cheat Sheet` (H1)
- `## Quick Reference Table`: Tabel markdown yang memetakan Aksi ke Kode dan Deskripsi.
- `## Common Commands`: Referensi antarmuka baris perintah (CLI).
- `## Code Snippets`: Pintasan sintaksis kode.

#### Judul File Bahasa Indonesia (Cheat Sheets)
- `# Cheat Sheet Teknologi` (H1)
- `## Tabel Referensi Cepat`: Tabel markdown yang memetakan Aksi ke Kode dan Deskripsi.
- `## Perintah Umum`: Referensi antarmuka baris perintah (CLI).
- `## Potongan Kode`: Pintasan sintaksis kode.

---

### 2.4 Panduan (`type: "guide"`)
Panduan memperkenalkan praktik terbaik atau desain arsitektural:

#### Judul File Bahasa Inggris (Guides)
- `# Guide Title` (H1)
- `## Introduction`: Pengantar pola desain atau pedoman.
- `## Best Practices`: Aturan yang disorot dengan alasan rasional yang rinci.
- `## Implementation Steps`: Langkah arsitektural untuk menerapkan panduan.

#### Judul File Bahasa Indonesia (Guides)
- `# Judul Panduan` (H1)
- `## Pendahuluan`: Pengantar pola desain atau pedoman.
- `## Praktik Terbaik`: Aturan-aturan utama beserta alasan rasionalnya.
- `## Langkah Implementasi`: Langkah arsitektural untuk menerapkan panduan ini.
