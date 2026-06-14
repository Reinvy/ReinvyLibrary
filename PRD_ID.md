# Dokumen Kebutuhan Produk (PRD) - ReinvyLibrary

## 1. Ringkasan Eksekutif

**ReinvyLibrary** adalah koleksi materi edukasi berbasis markdown terkurasi yang bersifat open-source, dibuat oleh Reinvy. Repositori ini melayani pengembang, pendidik, dan pembelajar mandiri dengan menyediakan tutorial, silabus, cheat sheet, dan panduan praktis berkualitas tinggi. Dokumen ini menguraikan arah strategis, kondisi saat ini, dan peta jalan (roadmap) masa depan repositori untuk memastikan pertumbuhan, kemudahan pemeliharaan, serta keterlibatan komunitas.

---

## 2. Visi dan Tujuan

### Visi

Menjadi pusat rujukan utama berbasis komunitas untuk sumber daya pemrograman dan teknologi yang mudah diakses, terstruktur dengan baik, berkualitas tinggi, tersedia dalam bahasa Inggris dan Indonesia, serta dioptimalkan untuk pengembang manusia maupun agen otomatis (AI).

### Tujuan

- **Aksesibilitas:** Memastikan konten mudah dibaca, dinavigasi, dan dipahami oleh pengguna dari semua tingkat keahlian.
- **Struktur:** Menyediakan silabus dan tutorial yang teratur secara logis untuk pembelajaran progresif.
- **Komunitas:** Membangun lingkungan kolaboratif di mana kontributor dapat dengan mudah menyarankan, mengedit, dan menambahkan konten berharga.
- **Dukungan Bilingual:** Menjaga keselarasan antara konten bahasa Inggris dan bahasa Indonesia untuk menjangkau audiens yang lebih luas.
- **Kemudahan Dibaca Mesin:** Menetapkan skema metadata (YAML frontmatter) dan skrip verifikasi struktural agar Agentic AI dapat secara mandiri mengonsumsi dan memproduksi konten yang valid.

---

## 3. Target Audiens

1. **Pengembang (Pemula hingga Mahir):** Mencari cheat sheet cepat, panduan praktis, atau bahasa/framework baru untuk dipelajari.
2. **Pendidik:** Mencari materi kursus dan silabus terstruktur untuk diintegrasikan ke dalam kurikulum pengajaran mereka.
3. **Pembelajar/Siswa:** Membutuhkan jalur yang jelas dan terstruktur dari konsep dasar hingga penerapan tingkat lanjut dalam teknologi.
4. **Agentic AI & Asisten Coding:** Asisten coding otonom yang membutuhkan cetak biru standar untuk menghasilkan materi edukasi yang kompatibel.

---

## 4. Fitur & Konten

### 4.1. Penawaran Konten Saat Ini

- **Tutorial:** Panduan langkah demi langkah tentang bahasa pemrograman dan alat pengembangan.
- **Silabus:** Garis besar kursus yang komprehensif.
- **Panduan:** Praktik terbaik dan implementasi praktis.
- **Cheat Sheet:** Referensi cepat untuk perintah dan sintaks.

### 4.2. Refaktoring Inti (Selesai)

Untuk meningkatkan repositori ini dan menyelaraskannya dengan tujuan utamanya, kami telah mengimplementasikan:
- **Topic-First Organization:** Mengorganisasikan kembali folder datar menjadi kategori terstruktur (misalnya, `backend/express-js/tutorials/`).
- **YAML Frontmatter Metadata:** Mewajibkan metadata terstruktur pada semua file markdown konten.
- **Templat Konten:** Menambahkan templat formal untuk ke-4 tipe konten di `.github/templates/`.
- **Skrip Validasi Otomatis (`validate-content.js`):** Memverifikasi penamaan file, lokasi folder, dan whitelist metadata.
- **Workflow GitHub Actions:** Memvalidasi format konten dan konsistensi metadata pada setiap Pull Request.
- **Indeks Dinamis:** Pembuatan daftar indeks secara dinamis di README untuk mencegah tautan yang rusak.

---

## 5. Metrik Kesuksesan

- **Pertumbuhan:** Peningkatan jumlah star, fork, dan clone repositori.
- **Keterlibatan:** Jumlah kontributor aktif (manusia dan AI) serta Pull Request yang digabungkan (merged).
- **Kualitas:** Penurunan laporan konten usang (melalui Issues) dan umpan balik positif dari komunitas.
- **Kepatuhan:** Tingkat kelulusan 100% pada verifikasi otomatis terhadap sintaks dan taksonomi.

---

## 6. Peta Jalan (Roadmap)

- **Fase 1 (Selesai):** Menetapkan PRD, README standar, dan struktur direktori. Reorganisasi dan migrasi seluruh materi yang ada ke struktur Topic-First yang baru.
- **Fase 2 (Selesai):** Menerapkan templat konten, skema YAML frontmatter, skrip validasi Node.js otomatis, dan workflow GitHub Actions PR.
- **Fase 3 (Jangka Pendek):** Menambahkan kategori baru (misalnya, Frontend, Database) dan melipatgandakan cakupan tutorial bilingual saat ini.
- **Fase 4 (Jangka Menengah):** Memperkenalkan file markdown interaktif/latihan yang berisi tantangan kode.
- **Fase 5 (Jangka Panjang):** Menyediakan renderer situs statis (seperti Docusaurus) untuk menyajikan file markdown ini sebagai situs web dokumentasi modern.

---

## 7. Pemeliharaan & Tata Kelola

- **Proses Tinjauan:** Semua Pull Request akan ditinjau oleh pemelihara repositori (Reinvy) untuk akurasi, pemformatan, dan relevansi. Pemeriksaan PR akan gagal secara otomatis jika skrip validasi atau linter gagal.
- **Standar Pemformatan:** Semua dokumen harus menggunakan Markdown standar, mematuhi taksonomi folder yang ditetapkan, berisi frontmatter yang valid, dan bebas dari error linting.
