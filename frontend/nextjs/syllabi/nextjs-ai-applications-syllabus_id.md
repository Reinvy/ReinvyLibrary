---
title: "Silabus Aplikasi AI dengan Next.js"
description: "Kurikulum lanjutan 12 minggu untuk membangun aplikasi bertenaga AI dengan Next.js, mencakup integrasi LLM dengan Vercel AI SDK, antarmuka pengguna streaming, retrieval-augmented generation dengan basis data vektor, tool calling dan agen, rate limiting dan pengendalian biaya, keamanan AI, evaluasi, observabilitas, serta deployment produksi."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Aplikasi AI dengan Next.js

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang bagi pengembang Next.js yang ingin berspesialisasi dalam membangun aplikasi bertenaga AI. Jika kursus Next.js umum memperlakukan fitur AI sebagai pelengkap dan kursus LLM generik mengabaikan lapisan framework, kurikulum ini mendalami seluruh tumpukan web AI: mengintegrasikan large language model melalui Vercel AI SDK, merancang antarmuka pengguna streaming yang terasa instan, serta menghubungkan pipeline RAG dengan basis data vektor untuk jawaban yang ter-grounding dan spesifik terhadap domain. Kursus ini juga mencakup realitas rekayasa yang memisahkan demo dari produk — output terstruktur, tool calling, loop agen, rate limiting per pengguna dan pengendalian biaya, pertahanan prompt injection, harness evaluasi, tracing, serta keputusan deployment yang menjaga fitur AI tetap cepat dan andal di produksi.

Setiap modul menggabungkan fondasi teoretis yang kuat dengan lab langsung yang dibangun di atas Next.js App Router, React Server Components, TypeScript, dan perangkat nyata seperti AI SDK, model OpenAI dan Anthropic, pgvector, Langfuse, serta Redis. Peserta membangun secara progresif: mulai dari satu chat streaming, kemudian retrieval augmentation, lalu agen dengan tools, kemudian pengerasan produksi seperti kuota dan eval, dan akhirnya platform asisten AI yang lengkap sebagai proyek akhir. Di akhir kursus ini, peserta akan mampu mengarsitektur, membangun, mengevaluasi, dan mengoperasikan fitur AI kelas produksi di Next.js — dari chat streaming dan copilot hingga knowledge base bertenaga RAG dan agen tugas yang otonom.

## Kurikulum

### Modul 1: Fondasi Aplikasi Web Bertenaga AI (Minggu 1)

- **Cara Kerja LLM, dari Perspektif Pengembang Web**
  - Token, context window, temperature, dan mengapa streaming mengubah persepsi latensi
  - Antarmuka completion versus chat: system prompt, giliran pengguna, dan pesan asisten
  - Penyedia model dan sifat saling menggantikan: OpenAI, Anthropic, Google, dan model open-weight
- **Bentuk Aplikasi Web AI**
  - Alur permintaan: input pengguna, panggilan model, token yang dialirkan, UI yang dirender
  - Di mana logika AI berada: panggilan model di sisi server versus sisi klien
  - Jenis fitur umum: asisten chat, copilot, perangkum, pencarian, dan agen
- **Dasar-Dasar Streaming**
  - Server-Sent Events (SSE): `text/event-stream`, `Content-Type`, dan respons berchunk
  - WebSocket versus SSE untuk beban kerja AI, dan kapan masing-masing menang
  - Membaca stream di peramban dengan `ReadableStream` dan `getReader()`
- **Pengaturan Lingkungan dan Peralatan**
  - Membuat proyek Next.js App Router dengan TypeScript dan Tailwind CSS
  - Mengelola API key dengan environment variable dan `.env.local`
  - Menginstal paket `ai` dan paket penyedia model (`@ai-sdk/openai`)
- **Lab Langsung**: Bangun route handler minimal yang mengalirkan respons model dan render respons tersebut di kotak chat dengan `fetch` biasa dan pembaca streaming

### Modul 2: Integrasi LLM dengan Vercel AI SDK (Minggu 2)

- **Lapisan Abstraksi AI SDK**
  - API `generateText` dan `streamText` yang seragam di semua penyedia model
  - Objek model, konfigurasi penyedia, dan pemilihan model per fitur
  - Bagaimana AI SDK menormalkan tool call, alasan berhenti, dan metadata penggunaan
- **Hook `useChat` dan `useCompletion`**
  - Menghubungkan `useChat` ke route handler: `POST` dengan pesan, protokol delta terstream
  - Mempertahankan status percakapan: daftar pesan, peran, dan bagian konten
  - Callback `onFinish`, `onError`, dan `onToolCall`
- **Generasi di Sisi Server**
  - Memanggil `streamText` di dalam Route Handler dan Server Action
  - Meneruskan definisi dan parameter tools dari server ke klien
  - Penanganan error: timeout penyedia, error rate limit, dan respons yang salah format
- **Strategi Multi-Penyedia**
  - Mengganti model per fitur dan per wilayah geografis
  - Rantai fallback ketika satu penyedia menurun
  - Profil biaya dan latensi: model kecil versus model besar
- **Lab Langsung**: Ubah chat Modul 1 menjadi AI SDK dengan `useChat`, tambahkan pemilihan model, dan render respons markdown dengan `react-markdown`

### Modul 3: Antarmuka Pengguna Streaming (Minggu 3)

- **Mendesain untuk Token, Bukan Halaman**
  - Rendering progresif: indikator berpikir, jawaban parsial, dan pembaruan bertahap
  - Pola UX respons terstream: penampakan token demi token versus kartu meluncur
  - Pembatalan, regenerasi, dan pengeditan di tengah stream
- **React Server Components dan AI**
  - Meneruskan konten terstream melewati batas RSC
  - `streamText` dengan `onChunk` yang memberi makan Server Components melalui mode RSC dari Paket AI
  - Kapan menggunakan streaming RSC versus `useChat` di sisi klien
- **SSE dan Kompatibilitas Edge**
  - Streaming dari Edge runtime: batasan dan pola yang didukung
  - Jebakan buffering di proxy, load balancer, dan CDN
  - Pengaturan kompresi dan pengiriman chunk
- **Pola Skeleton, Progress, dan Fallback**
  - Kerangka placeholder untuk kartu streaming dan blok kode
  - Kesehatan stream: timeout heartbeat, deteksi stream macet, dan UX ulang coba
  - Aksesibilitas: region `aria-live` dan pengumuman giliran asisten
- **Lab Langsung**: Bangun generator laporan streaming yang mengalirkan bagian markdown secara bertahap dengan skeleton per bagian dan tombol batal

### Modul 4: Fondasi Retrieval-Augmented Generation (Minggu 4)

- **Mengapa RAG: Pengetahuan, Halusinasi, dan Grounding**
  - Mode kegagalan memori parametrik murni dan di mana RAG membantu
  - Pipeline pengambilan: chunk, embed, indeks, ambil, sintesis
- **Embedding**
  - Apa itu embedding dan bagaimana cosine similarity menentukan relevansi
  - Membuat embedding dengan `embed` dan `embedMany` dari AI SDK
  - Model embedding, dimensi, dan pertimbangan multibahasa
- **Pilihan Penyimpanan Vektor**
  - pgvector dengan PostgreSQL: tabel, indeks, dan kueri SQL
  - Basis data vektor terkelola: Pinecone, Upstash Vector, dan Supabase
  - Menyimpan metadata di samping vektor untuk pemfilteran
- **Strategi Chunking**
  - Chunk berukuran tetap, tumpang tindih, semantik, dan sadar struktur
  - Ukuran chunk versus presisi pengambilan dan biaya token
  - Menangani dokumen berstruktur: judul, tabel, dan blok kode
- **Lab Langsung**: Ingesti sekumpulan dokumen markdown, buat chunk-nya, embed dengan `embedMany`, dan simpan di pgvector

### Modul 5: Membangun Pipeline RAG di Next.js (Minggu 5)

- **Ingesti dan Pengindeksan**
  - Pipeline Server Action atau pekerjaan latar: baca, parse, chunk, embed, upsert
  - Ingesti idempoten dengan ID dokumen dan deduplikasi vektor
  - Strategi pengindeksan ulang ketika dokumen berubah
- **Pengambilan**
  - Pencarian kemiripan dengan filter metadata: `WHERE` pada sumber, kategori, dan tanggal
  - Pemilihan Top-K dan ambang skor untuk relevansi
  - Pencarian hibrida: menggabungkan pengambilan kata kunci dan vektor
- **Sintesis dan Grounding**
  - Template prompt yang menyuntikkan konteks yang diambil dengan kutipan
  - Menginstruksikan model untuk menjawab hanya dari konteks dan berkata "saya tidak tahu"
  - Mengembalikan referensi sumber ke UI untuk verifikasi
- **Reranking**
  - Mengapa top-K berdasarkan jarak saja tidak cukup
  - Reranking cross-encoder dan relevansi yang dinilai model
  - Trade-off latensi dan biaya dari reranking
- **Lab Langsung**: Bangun fitur tanya-jawab bertenaga RAG dengan UI chat, jawaban ter-grounding, dan kutipan sumber yang dapat diklik

### Modul 6: Output Terstruktur, Tool Calling, dan Agen (Minggu 6)

- **Output Terstruktur dengan Zod**
  - `generateObject` dan `streamObject` untuk respons bertipe dan tervalidasi
  - Skema Zod sebagai kontrak antara model dan aplikasi
  - Memperbaiki output yang tidak valid: kebijakan ulang coba dan perbaikan skema
- **Tool Calling**
  - Mendefinisikan tools dengan input dan output bertipe
  - Bagian `toolCall` dan `toolResult` dalam percakapan terstream
  - Tools yang menjalankan kode server: kueri basis data, panggilan API, dan utilitas
- **Loop Agen**
  - Loop reason-act-observe: model memutuskan, tool mengeksekusi, hasil kembali
  - Pengaman max-steps, kondisi penghentian, dan anggaran loop
  - Agen sekuensial versus eksekusi tool paralel
- **Tugas Multi-Langkah**
  - Perencanaan: meminta model memecah tugas menjadi langkah-langkah sebelum bertindak
  - Verifikasi: model memeriksa outputnya sendiri terhadap kendala
  - Checkpoint manusia-dalam-loop untuk tindakan destruktif
- **Lab Langsung**: Bangun asisten yang mencari di basis data, membaca pusat bantuan, dan melakukan tindakan saat diminta, dengan pengaman max-steps

### Modul 7: Pola UX AI dan Polesan Produk (Minggu 7)

- **Desain Percakapan**
  - System prompt yang menetapkan perilaku, nada, dan kendala
  - Prompt saran, empty state, dan tindakan cepat
  - Saran lanjutan setelah setiap jawaban
- **Rendering Konten Kaya**
  - Markdown streaming, kode dengan penyorotan sintaks, dan tabel
  - Visualisasi tool call: menampilkan status "Mencari…" dan "Membaca file…"
  - Merender kartu terstruktur dari JSON `streamObject`
- **Umpan Balik Optimistis dan Instan**
  - Gema langsung input pengguna dan rendering streaming-pertama
  - Riwayat pesan lokal dengan `localStorage` dan data awal
  - Tindakan salin, bagikan, dan ekspor untuk respons AI
- **Pengaman dan Batasan di Sisi Klien**
  - Validasi input: batas panjang, pemeriksaan jenis konten, dan empty state
  - Menonaktifkan tindakan saat stream sedang berjalan
  - Degradasi yang anggun ketika model tidak tersedia
- **Lab Langsung**: Poles asisten RAG menjadi pengalaman chat siap produk dengan saran, visualisasi tool call, dan percakapan yang dapat dibagikan

### Modul 8: Autentikasi, Rate Limiting, dan Pengendalian Biaya (Minggu 8)

- **Mengautentikasi Fitur AI**
  - Sesi Auth.js dan proteksi rute untuk endpoint AI
  - Meneruskan pengguna yang terautentikasi ke dalam prompt dan filter pengambilan
  - Pengambilan per penyewa: mengisolasi knowledge base per pengguna atau tim
- **Rate Limiting dan Kuota**
  - Anggaran token per pengguna dengan pencacah Redis
  - Strategi sliding-window dan token-bucket untuk batas permintaan
  - Menegakkan batas di route handler sebelum panggilan model
- **Akuntansi Penggunaan**
  - Membaca penggunaan token dari respons AI SDK dan menyimpannya per pengguna
  - Estimasi biaya per model dan peringatan anggaran
  - Batas tier gratis dan prompt peningkatan
- **Penyimpanan Cache dan Pengurangan Biaya**
  - Menyimpan cache prompt dan completion yang identik dengan `unstable_cache`
  - Semantic caching: menggunakan ulang jawaban untuk pertanyaan serupa
  - Kompresi prompt dan model lebih kecil untuk tugas sederhana
- **Lab Langsung**: Tambahkan rate limit per pengguna dengan Redis, simpan catatan penggunaan, dan cache pertanyaan berulang untuk memangkas pengeluaran token

### Modul 9: Keamanan AI, Prompt Injection, dan Moderasi Konten (Minggu 9)

- **Pertahanan Prompt Injection**
  - Bagaimana instruksi yang disuntikkan menjalar melalui dokumen yang diambil dan input pengguna
  - Memisahkan instruksi dari data dalam system prompt
  - Verifikasi output: memeriksa anomali kepatuhan instruksi
- **Sanitasi Input dan PII**
  - Menyunting email, nomor telepon, dan API key sebelum panggilan model
  - Allow-list konten eksternal dalam pipeline pengambilan
  - Retensi data untuk prompt dan completion
- **Pemfilteran dan Moderasi Output**
  - Mengklasifikasikan output model dengan endpoint moderasi
  - Allow-list topik dan deteksi tindakan terlarang
  - Fallback: respons penolakan dan daftar blokir untuk pelanggaran kebijakan
- **Peralatan Aman dan Eskalasi**
  - Membatasi akses tool berdasarkan peran dan cakupan pengguna
  - Mengaudit tool call: log, persetujuan, dan jalur pengembalian
  - Menaikkan permintaan berisiko ke tinjauan manusia
- **Lab Langsung**: Keraskan asisten terhadap instruksi yang disuntikkan dalam dokumen, redaksi PII dari prompt, dan tambahkan pemeriksaan moderasi pada output

### Modul 10: Evaluasi dan Observabilitas (Minggu 10)

- **Mengapa Eval Penting untuk Produk AI**
  - Pengujian regresi untuk prompt, model, dan perubahan pengambilan
  - Dataset emas: input, output yang diharapkan, dan rubrik penilaian
  - Antrean tinjauan manual versus skor otomatis
- **Evaluasi Otomatis**
  - Eval yang dinilai model: skor kebenaran, kesetiaan, dan keamanan
  - Eval pengambilan: hit rate, mean reciprocal rank, dan presisi pada K
  - Menjalankan rangkaian eval di CI dengan seed deterministik
- **Tracing dan Observabilitas**
  - Span OpenTelemetry untuk panggilan model, pengambilan, dan tools
  - Langfuse dan LangSmith untuk analitik prompt, trace, dan biaya
  - Replay sesi dan rincian latensi untuk stream yang lambat
- **Pemantauan di Produksi**
  - Dasbor: token per hari, biaya per pengguna, tingkat error, dan latensi stream
  - Peringatan untuk error penyedia, kehabisan kuota, dan sinyal kualitas menurun
  - Memilih versi model secara sengaja dengan rollout canary
- **Lab Langsung**: Buat dataset emas, tambahkan skrip eval yang dinilai model, hubungkan tracing dengan Langfuse, dan bangun dasbor biaya dan latensi

### Modul 11: Deployment Produksi dan Skalabilitas (Minggu 11)

- **Pemilihan Runtime untuk Beban Kerja AI**
  - Runtime Edge versus Node.js untuk panggilan model dan fitur SDK
  - Stream berdurasi panjang, buffering, dan batas waktu platform
  - Hosting mandiri versus platform terkelola: Vercel, Fly.io, dan bare metal
- **Antrean dan Pemrosesan Latar**
  - Memindahkan ingesti dan generasi batch ke pekerja latar
  - Pekerjaan berbasis antrean dengan Redis dan model Background Functions Vercel
  - Menunda ulang coba dengan backoff untuk pemadaman penyedia
- **Streaming Melalui Tumpukan**
  - Perilaku CDN dan proxy untuk SSE: buffering, kompresi, dan batas waktu
  - Sinyal keep-alive dan penanganan koneksi idle
  - Uji beban stream dan merencanakan batas konkurensi
- **Pengerasan Keamanan dan Kepatuhan**
  - Manajemen rahasia untuk key penyedia
  - Log audit, kebijakan retensi, dan residensi data regional
  - Deteksi penyalahgunaan: pola penggunaan anomali dan pembatasan berbasis IP
- **Lab Langsung**: Deploy asisten ke produksi, pindahkan ingesti ke antrean, verifikasi aliran SSE melalui CDN, dan jalankan uji beban

### Modul 12: Pola Lanjutan dan Arah Masa Depan (Minggu 12)

- **Aplikasi Multimodal**
  - Input gambar dengan model vision dan unggahan file
  - Membuat gambar dan menangani transkrip audio
  - Streaming generasi teks panjang dengan pelacakan progres
- **RAG dalam Skala Besar**
  - RAG versus context window panjang: kapan masing-masing menang
  - Pengambilan multi-tahap: penulisan ulang kueri, ekspansi, dan routing
  - Cache-augmented generation dan caching embedding
- **Fine-Tuning Versus Prompting**
  - Kapan fine-tuning mengalahkan rekayasa prompt
  - Mengumpulkan data pelatihan dari trace produksi
  - Mengevaluasi model hasil fine-tuning terhadap baseline
- **Sistem Agen di Produksi**
  - Orkestrasi multi-agen dan delegasi tugas
  - Loop koreksi diri dengan batas ulang coba
  - Tata kelola: izin, anggaran, dan kill switch untuk agen otonom
- **Persiapan Proyek Akhir**
  - Meninjau seluruh tumpukan: streaming, RAG, tools, keamanan, eval, dan operasional
  - Memilih cakupan dan arsitektur proyek akhir
  - Milestone, checkpoint, dan panduan rubrik penilaian
- **Lab Langsung**: Tambahkan satu kemampuan lanjutan dari modul ini ke proyek akhir dan dokumentasikan hasil evaluasinya

## Proyek Akhir

Peserta membangun **platform asisten AI kelas produksi** di Next.js. Proyek akhir menggabungkan setiap modul: antarmuka chat streaming dengan AI SDK, knowledge base RAG di atas dokumen peserta sendiri dengan pgvector, tool calling dan loop agen untuk tindakan nyata, autentikasi per pengguna dengan kuota dan pelacakan penggunaan, pertahanan prompt injection dan moderasi, rangkaian evaluasi dengan dataset emas, tracing dan observabilitas biaya, serta deployment dengan ingesti berbasis antrean dan stream yang dipantau.

Contoh proyek akhir termasuk copilot dukungan pelanggan untuk produk SaaS, asisten pengetahuan tim dengan pengambilan per ruang kerja, atau asisten operasional yang menjawab pertanyaan dan mengeksekusi tindakan aman yang disetujui pengguna terhadap sistem internal. Proyek harus melayani respons streaming nyata dengan kutipan ter-grounding, menegakkan batas per pengguna, bertahan dari upaya prompt injection, dan menyertakan laporan evaluasi terdokumentasi yang menunjukkan metrik kualitas dan biaya.

## Kriteria Penilaian

- **Tugas**: Satu lab langsung per modul (total 12), masing-masing dinilai berdasarkan implementasi yang benar dan dapat dijalankan yang menunjukkan teknik inti modul — misalnya, chat streaming yang berfungsi pada Minggu 2 dan pipeline RAG tervalidasi pada Minggu 5.
- **Kuis Mingguan**: Kuis singkat yang mencakup protokol streaming, API AI SDK, mekanisme pengambilan, prinsip keamanan, dan konsep operasional untuk memastikan pemahaman konseptual.
- **Proyek Akhir**: Dinilai berdasarkan arsitektur (pemisahan bersih logika AI, pengambilan, dan UI), kualitas streaming dan polesan UX, kebenaran grounding dan kutipan, ketahanan terhadap injection dan penyalahgunaan, adanya eval otomatis dan tracing, kontrol biaya dan latensi, serta kesiapan produksi dari deployment. Nilai lulus juga mensyaratkan laporan evaluasi tertulis dengan metrik kualitas dan biaya yang terukur.

## Referensi

- [Dokumentasi Vercel AI SDK](https://ai-sdk.dev/) — generasi, streaming, tool calling, dan integrasi RSC
- [Dokumentasi Next.js — Data Fetching, Streaming, dan Server Components](https://nextjs.org/docs)
- [Dokumentasi OpenAI API](https://platform.openai.com/docs) dan [Dokumentasi Anthropic](https://docs.anthropic.com/) — kapabilitas model, API pesan, dan praktik terbaik
- [README pgvector](https://github.com/pgvector/pgvector) — penyimpanan vektor dan pencarian kemiripan di PostgreSQL
- [Dokumentasi Langfuse](https://langfuse.com/docs) — tracing dan evaluasi LLM
- [Dokumentasi Pinecone](https://docs.pinecone.io/) dan [Dokumentasi Upstash Vector](https://upstash.com/docs/vector) — basis data vektor terkelola
- [Dokumentasi Redis](https://redis.io/docs/) — primitif rate limiting dan caching
- [Memahami RAG: Panduan Retrieval-Augmented Generation](https://www.pinecone.io/learn/retrieval-augmented-generation/) — fondasi pipeline pengambilan
- [Prompt Injection: OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) — panduan keamanan AI
- [Dokumentasi OpenTelemetry](https://opentelemetry.io/docs/) — standar tracing dan observabilitas
