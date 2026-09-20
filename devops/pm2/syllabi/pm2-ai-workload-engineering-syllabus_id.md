---
title: "Silabus Rekayasa Beban Kerja AI dengan PM2"
description: "Kurikulum lanjutan 12 minggu yang komprehensif untuk para insinyur yang menjalankan beban kerja aplikasi AI di atas PM2: gateway dan proxy LLM, worker embedding dan ingest vektor, layanan pipeline RAG, endpoint streaming token, pekerjaan inferensi batch, orkestrasi fleet GPU, observabilitas dan pelacakan biaya khusus AI, manajemen secret, serta deployment model canary."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Beban Kerja AI dengan PM2

## Ringkasan

Silabus lanjutan 12 minggu ini mengajarkan para insinyur cara merancang, mengoperasikan, dan menskalakan beban kerja aplikasi AI sepenuhnya dengan PM2. Backend AI memiliki profil operasional yang khas: gateway tanpa status yang berumur panjang dan memproksi ke penyedia model eksternal, worker berbasis antrean yang membuat embedding dan menyerap vektor, endpoint streaming yang menahan koneksi tetap terbuka selama token mengalir, pekerjaan batch yang memproses ulang korpus di malam hari, serta tugas terjadwal yang melatih ulang atau mengindeks ulang. Beban kerja semacam ini gagal dengan cara yang berbeda dari aplikasi web biasa — lonjakan memori akibat payload besar, timeout upstream dari penyedia model, penulisan parsial ke penyimpan vektor, dan pergantian koneksi pada endpoint streaming — dan model supervisi proses PM2 adalah alat yang sebenarnya digunakan sebagian besar tumpukan produksi AI untuk menjaga layanan tetap hidup.

Jika kurikulum PM2 tingkat pengantar mengajarkan manajemen proses secara umum dan silabus lanjutan membedah internals PM2, kursus ini disusun di sekitar beban kerja AI itu sendiri. Minggu 1–4 membangun layanan inti: gateway model, worker embedding, dan tahapan pipeline RAG. Minggu 5–8 menjadikannya siap produksi: beban kerja streaming, rekayasa memori dan sumber daya, pekerjaan AI batch dan terjadwal, serta fleet GPU multi-host. Minggu 9–12 menambahkan disiplin operasional yang unik bagi AI: metrik kustom untuk token, latensi, dan kedalaman antrean; penanganan secret untuk penyedia model; deployment model canary dan shadow; serta proyek puncak yang merakit semuanya menjadi platform AI yang dapat menyembuhkan diri sendiri.

Setiap modul memadukan konsep operasional dengan lab praktik yang menjalankan layanan sungguhan: memproksi lalu lintas penyedia model yang nyata, membebani worker embedding dengan korpus besar, streaming respons melalui reload cluster, dan menjalankan latihan kegagalan terhadap gateway yang hidup. Pada akhir kursus ini, peserta akan mampu merancang backend AI sebagai kumpulan layanan yang dikelola PM2, menjaga ketergantungan pada penyedia model tidak merobohkan platform, melacak biaya dan latensi khusus AI secara real-time, serta mengirim versi model baru tanpa downtime yang terlihat oleh pengguna.

## Kurikulum

### Modul 1: Lanskap Beban Kerja Aplikasi AI (Minggu 1)

- **Apa yang membuat backend AI berbeda**
  - Ketergantungan eksternal pada penyedia model: latensi, batas laju, dan gangguan yang tidak Anda kendalikan
  - Variasi payload yang tinggi: prompt, dokumen, dan gambar yang membuat memori tidak terduga
  - Koneksi streaming berumur panjang versus siklus request/response pendek
  - Semantik idempotensi dan kegagalan parsial yang unik pada pipeline embedding dan generasi
- **Taksonomi layanan AI**
  - Gateway dan proxy LLM: lapisan tipis, tanpa status, dan selalu aktif di depan penyedia model
  - Worker embedding dan ingest vektor: konsumen antrean yang memproses batch dan menulis ke penyimpan vektor
  - Layanan pipeline RAG: intake dokumen, chunking, embedding, dan pengindeksan multi-tahap
  - Inferensi batch dan pekerjaan terjadwal: pemrosesan ulang, pengindeksan ulang, dan pelatihan ulang di malam hari
- **Di mana PM2 cocok dalam tumpukan AI**
  - Mengapa Kubernetes sering berlebihan untuk fleet gateway, dan mengapa PM2 tetap menjadi standar untuk layanan AI satu host
  - PM2 sebagai supervisor antara aplikasi dan init system: restart, penangkapan log, dan pelacakan status
  - Melengkapi runtime container dengan `pm2-runtime` di dalam container layanan AI
- **Tumpukan poliglot dengan opsi interpreter**
  - Menjalankan gateway Node.js dan worker Python di bawah satu daemon: `pm2 start worker.py --interpreter python3`
  - Mengunci versi interpreter dan venv per proses
  - Kapan tumpukan AI bahasa campuran lebih sederhana daripada pemisahan microservice
- **Lab Praktik**: Terapkan gateway LLM minimal plus worker embedding sebagai dua proses PM2, verifikasi keduanya restart secara independen, dan telusuri log keduanya melalui satu aliran `pm2 logs`

### Modul 2: Menjalankan Gateway dan Proxy LLM di Bawah PM2 (Minggu 2)

- **Arsitektur gateway**
  - Pola proxy yang kompatibel dengan OpenAI: satu endpoint internal, banyak penyedia upstream
  - Pemilihan penyedia berbasis lingkungan: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, dan penyedia kustom
  - Penyetelan connection pooling dan keep-alive untuk proses gateway throughput tinggi
- **Ketahanan terhadap kegagalan penyedia**
  - Retry dengan exponential backoff untuk respons upstream 429 dan 5xx
  - Failover penyedia dan routing fallback ketika model utama menurun
  - Circuit breaking: gagal cepat alih-alih mengantrekan permintaan terhadap upstream yang mati
- **Pembatasan laju dan isolasi tenant**
  - Pembatasan laju token bucket per kunci API atau per tenant
  - Kontrol kedalaman antrean: antrean permintaan terbatas agar lonjakan tidak menghabiskan memori
  - Header kompatibel OpenAI untuk streaming, pemakaian, dan ID permintaan
- **Shutdown yang anggun untuk permintaan yang sedang berjalan**
  - Menguras permintaan generasi yang aktif sebelum proses keluar saat restart
  - `kill_timeout` yang disetel untuk generasi panjang dan respons streaming
  - `wait_ready` dan readiness probe agar reload tidak pernah memutus permintaan di tengah streaming
- **Lab Praktik**: Jalankan gateway di bawah PM2, gagalkan penyedia utama secara artifisial, verifikasi failover otomatis, dan pastikan `pm2 reload` bergulir selesai tanpa menjatuhkan satu pun permintaan yang sedang berjalan

### Modul 3: Worker Embedding dan Ingest Vektor (Minggu 3)

- **Ingest berbasis antrean**
  - Antrean Redis (BullMQ/Bull) dan bagaimana PM2 mengawasi worker konsumen
  - Fan-out: satu antrean ingest, banyak worker, pemrosesan terdistribusi
  - Backpressure: batas konkurensi worker yang sesuai dengan batas laju API embedding
- **Batch untuk biaya dan latensi**
  - Batching permintaan embedding (OpenAI embeddings, Cohere, model ONNX lokal)
  - Penanganan retry dan dead-letter untuk chunk yang gagal
  - Penyesuaian laju yang sadar batas agar worker tidak pernah melampaui batas upstream
- **Pola penulisan penyimpan vektor**
  - Batching upsert ke pgvector, Qdrant, atau Pinecone
  - Jaminan urutan: embedding harus ditulis setelah chunk-nya
  - Pemantauan kesehatan indeks: jumlah vektor versus jumlah dokumen sumber
- **Worker singleton dan leader election**
  - Ingest tepat-satu-kali dengan satu instance worker
  - Distributed locking agar dua host tidak pernah memproses shard antrean yang sama
- **Lab Praktik**: Bangun worker embedding yang menguras antrean Redis, membuat batch embedding chunk, melakukan upsert ke penyimpan vektor, dan pulih dengan bersih ketika worker dibunuh di tengah batch

### Modul 4: Layanan Pipeline RAG dan Orkestrasi Retrieval (Minggu 4)

- **Pipeline RAG sebagai graf proses**
  - Tahap 1: intake dokumen dan normalisasi format
  - Tahap 2: chunking dengan overlap dan pelestarian metadata
  - Tahap 3: embedding dan upsert vektor
  - Tahap 4: penyegaran indeks dan validasi retrieval
- **Menjalankan tahapan pipeline sebagai layanan PM2**
  - Satu file ecosystem, empat layanan, urutan ketergantungan yang eksplisit
  - Health-check wait loop di antara tahapan
  - Kebijakan restart per tahap: retry terbatas untuk intake, restart agresif untuk konsumen
- **Checkpointing dan pemrosesan ulang idempoten**
  - Menyimpan status pemrosesan per dokumen agar crash tidak meng-embed ulang semuanya
  - Upsert idempoten: menjalankan ulang tahap tidak mengubah apa pun
  - `pm2 startOrReload` untuk otomasi pipeline yang idempoten
- **Semantik dead-letter dan retry**
  - Poison chunk: dokumen yang gagal embedding secara permanen
  - Antrean dead-letter dan alerting ketika sebuah tahap kurang berproduksi
- **Lab Praktik**: Dirikan pipeline RAG empat tahap, bunuh tahap embedding di tengah proses, nyalakan ulang, dan verifikasi bahwa hanya batch chunk yang ditinggalkan yang diproses ulang — bukan seluruh korpus

### Modul 5: Beban Kerja AI Streaming (Minggu 5)

- **Streaming token SSE dan WebSocket**
  - Bagaimana endpoint streaming menahan respons tetap terbuka selama token datang
  - Penerusan sinyal PM2 dan apa yang dilakukan restart terhadap aliran yang terbuka
  - Penanganan pemutusan klien: batalkan generasi upstream untuk menghemat biaya
- **Cluster mode untuk endpoint streaming tanpa status**
  - Menskalakan gateway streaming dengan cluster mode dan jumlah instance eksplisit
  - Sticky sessions: menjaga respons streaming tetap pada satu worker
  - Semantik reload untuk koneksi berumur panjang: kuras sebelum restart
- **Menyetel timeout untuk streaming**
  - `kill_timeout` di atas durasi generasi terpanjang yang diharapkan
  - `listen_timeout` dan `wait_ready` untuk gateway yang butuh waktu menghidrasi cache
  - Pembersihan koneksi idle untuk mencegah kebocoran socket
- **Backpressure ujung ke ujung**
  - Klien lambat: membatasi emisi token tanpa memblokir upstream
  - Batas buffer agar konsumen lambat tidak menggelembungkan memori
- **Lab Praktik**: Streaming token melalui gateway ber-cluster, lakukan reload bergulir di tengah streaming, dan buktikan bahwa aliran yang aktif tetap bertahan sementara lalu lintas baru mendarat di worker baru

### Modul 6: Rekayasa Memori dan Sumber Daya untuk Layanan Model (Minggu 6)

- **Profil memori beban kerja AI**
  - Payload prompt dan dokumen besar yang mendorong pertumbuhan heap V8
  - Memori puncak pada worker embedding versus memori kondisi tunak pada gateway
  - Buffer token dan buffer stream: memori yang bertambah seiring panjang percakapan
- **Batas memori dan auto-restart**
  - `max_memory_restart` sebagai mekanisme penyembuhan diri untuk worker yang bocor
  - Batas `NODE_OPTIONS=--max-old-space-size` untuk V8
  - Batas memori worker Python dengan `PYTHONMALLOC` dan batas RSS
- **Profiling dan diagnosis**
  - Heap snapshot dan kurva memori `pm2 monit`
  - Mengidentifikasi kebocoran: retensi per permintaan versus cache global
  - Kapan restart secara proaktif: daur ulang terjadwal untuk worker yang berjalan lama
- **Kontrol CPU dan konkurensi**
  - Ukuran thread pool worker versus instance cluster
  - Interaksi `instances` dan `max_memory_restart` dalam cluster mode
  - Mencegah satu worker yang rakus membuat gateway kelaparan
- **Lab Praktik**: Uji beban worker embedding dengan korpus besar, setel `max_memory_restart` yang realistis, dan amati PM2 mendaur ulang worker yang memori-nya menggelembung sementara antrean tetap mengalir

### Modul 7: Inferensi Batch dan Pekerjaan AI Terjadwal (Minggu 7)

- **Pekerjaan terjadwal dengan cron PM2**
  - `cron_restart` untuk pengindeksan ulang, pelatihan ulang, dan pekerjaan evaluasi di malam hari
  - Pekerjaan sekali jalan dengan `--no-autorestart` dan `stop_exit_codes`
  - Cron versus penjadwal dalam aplikasi: mengapa penjadwalan tingkat PM2 bertahan dari crash aplikasi
- **Pola inferensi batch**
  - Pemrosesan batch terpotong dengan checkpoint/resume
  - Kontrol biaya: batas ukuran batch, pemilihan tier model untuk pekerjaan massal
  - Pelaporan kemajuan dari pekerjaan batch ke tumpukan metrik
- **Semantik retry untuk pekerjaan batch**
  - Konsumen batch idempoten: memproses shard yang sama dua kali tidak berbahaya
  - `min_uptime` dan `max_restarts` untuk menahan pekerjaan batch yang crash-looping
  - Distributed locking agar cron yang tumpang tindih tidak pernah memproses dua kali
- **Interupsi yang anggun untuk pekerjaan batch**
  - Penanganan SIGTERM: selesaikan chunk saat ini, buat checkpoint, keluar
  - Melanjutkan dari checkpoint terakhir pada penjadwalan berikutnya
- **Lab Praktik**: Jadwalkan pembangunan ulang cache embedding setiap malam dengan `cron_restart`, bunuh di tengah proses, dan verifikasi bahwa proses berikutnya melanjutkan dari checkpoint alih-alih mengulangi seluruh korpus

### Modul 8: Orkestrasi Fleet Multi-Host dan GPU (Minggu 8)

- **Manajemen proses tingkat fleet**
  - Mendorong file ecosystem ke banyak host dengan `pm2 deploy`
  - Varian layanan per host: gateway di mana-mana, worker ingest di host data
  - Restart yang dijaga kesehatan: hanya restart layanan sebuah host ketika host tersebut sehat
- **Penjadwalan yang sadar GPU**
  - Isolasi `CUDA_VISIBLE_DEVICES` pada mesin multi-GPU
  - Layanan model lokal di host GPU yang diawasi PM2
  - Menyamakan jumlah instance dengan memori GPU: satu proses LLM per GPU
- **Perencanaan kapasitas untuk fleet AI**
  - Kebutuhan CPU gateway versus kebutuhan GPU embedding
  - Matematika throughput: token per detik per instance, instance per host
  - Ruang cadangan untuk failover ketika satu host menguras modelnya
- **Model lokal dan cloud hibrida**
  - Routing: model lokal untuk pekerjaan berlatensi rendah, penyedia cloud untuk kelebihan beban
  - Konsistensi: antarmuka yang sama, upstream berbeda, satu fleet yang dikelola PM2
- **Lab Praktik**: Definisikan fleet dua tingkat (host gateway + host ingest GPU) dalam satu konfigurasi deploy, kuras sebuah host GPU, dan verifikasi fleet menyeimbangkan ulang sementara PM2 menjaga setiap layanan yang bertahan tetap online

### Modul 9: Observabilitas untuk Beban Kerja AI (Minggu 9)

- **Metrik khusus AI dengan @pm2/io**
  - Metrik kustom: token per detik, permintaan yang sedang berjalan, persentil latensi penyedia
  - Kedalaman antrean dan backlog embedding sebagai gauge kelas satu
  - Pelacakan biaya per permintaan: model, token, dan harga dalam satu metrik
- **Logging terstruktur untuk layanan AI**
  - Bentuk log: ID permintaan, model, penyedia, token masuk/keluar, durasi, biaya
  - Mengisi log dengan metadata prompt tanpa membocorkan konten sensitif
  - Agregasi terpusat: streaming `pm2 logs` ke pipeline log
- **Integrasi Prometheus dan Grafana**
  - Mengekspos metrik @pm2/io ke Prometheus
  - Dashboard: kesehatan gateway, tingkat error penyedia, throughput token, kedalaman antrean
  - Alerting pada kegagalan penyedia, ledakan memori, dan pertumbuhan backlog
- **Tracing panggilan AI ujung ke ujung**
  - Span OpenTelemetry melintasi gateway → worker → penyimpan vektor
  - Mengorelasikan pertanyaan pengguna dengan jejak retrieval dan generasinya
- **Lab Praktik**: Instrumentasi gateway dan worker embedding dengan metrik kustom @pm2/io, alirkan ke Prometheus, dan bangun panel Grafana yang menampilkan token per detik, tingkat error penyedia, dan kedalaman antrean dalam satu layar

### Modul 10: Keamanan dan Secret untuk Layanan AI (Minggu 10)

- **Manajemen secret untuk penyedia model**
  - Menjauhkan `OPENAI_API_KEY` dan sejenisnya dari file ecosystem dan daftar proses
  - Injeksi lingkungan dari file secret 0600 dan lingkungan deploy
  - Rotasi kunci penyedia tanpa restart fleet: reload setelah pertukaran secret
- **Memperkuat batas gateway**
  - Kunci per-tenant dengan batas pemakaian untuk menahan penyalahgunaan
  - Validasi permintaan sebelum token apa pun dihabiskan: ukuran prompt, skema, dan allowlist
  - Penjaga injeksi prompt di gateway: isolasi system prompt dan pemeriksaan keluaran
- **Operasi daemon dengan hak istimewa paling rendah**
  - Akun layanan khusus untuk daemon PM2 dan proses AI-nya
  - Isolasi jaringan: host gateway hanya berbicara ke penyedia dan penyimpan vektor
  - Melindungi socket IPC dari pengguna lain di host
- **Audit dan kepatuhan**
  - Mencatat siapa yang memanggil model apa dengan ukuran payload dan biaya berapa
  - Residensi data: merutekan permintaan tenant ke penyedia yang dibatasi wilayah
  - Retensi dan redaksi konten prompt sensitif dalam log
- **Lab Praktik**: Perkuat penanganan secret sebuah gateway, jalankan simulasi penyalahgunaan dengan kunci tenant curian, dan verifikasi bahwa pembatasan laju per tenant menahan blast radius sementara audit mencatat setiap panggilan

### Modul 11: Versioning Model dan Strategi Deployment (Minggu 11)

- **Deployment model canary**
  - Merutekan persentase kecil lalu lintas ke versi model baru
  - Membandingkan kualitas dan latensi sebelum peluncuran penuh
  - Kereta rilis `pm2 deploy` dengan file ecosystem yang diberi tag versi model
- **Shadow traffic dan evaluasi A/B**
  - Mode shadow: menduplikasi permintaan ke model kandidat tanpa menyajikan keluarannya
  - Pekerjaan evaluasi offline yang dinilai oleh tumpukan metrik
  - Pemicu rollback: regresi kualitas, regresi latensi, ledakan biaya
- **Pertukaran model tanpa downtime**
  - Reload gateway yang konfigurasinya menunjuk ke model baru
  - Invalidasi cache pada perubahan model: cache prompt tidak boleh mencampur versi
  - Pertukaran terkoordinasi: gateway, model embedding, dan indeks vektor bergerak bersama
- **Feature flag untuk pemilihan model**
  - Routing per tenant, per fitur, atau per kategori prompt
  - Mematikan model buruk seketika melalui flip flag alih-alih redeploy
- **Lab Praktik**: Canary versi LLM baru di belakang gateway, rutekan 10 persen lalu lintas ke versi tersebut, evaluasi kualitas pada dashboard metrik, dan rollback dalam waktu kurang dari satu menit ketika canary mengalami regresi

### Modul 12: Proyek Puncak — Platform AI yang Menyembuhkan Diri Sendiri (Minggu 12)

- **Desain platform**
  - Tier gateway: proxy LLM ber-cluster, dibatasi laju, dengan failover penyedia
  - Tier ingest: worker embedding berbasis antrean dengan penanganan dead-letter
  - Tier RAG: pipeline empat tahap dengan checkpointing dan pemrosesan ulang idempoten
  - Tier batch: pekerjaan pengindeksan ulang dan evaluasi setiap malam pada cron
- **Rekayasa keandalan**
  - Latihan chaos: bunuh gateway, buat worker kelaparan, gagalkan penyedia utama
  - Runbook: setiap mode kegagalan dengan langkah deteksi, respons, dan verifikasi
  - Uji beban: throughput token berkelanjutan dengan SLO memori dan latensi
- **Observabilitas dan pusat biaya**
  - Satu dashboard Grafana: token, latensi, kedalaman antrean, error penyedia, pengeluaran
  - Pelacakan biaya per tenant dan per model
  - Alerting dengan tingkat keparahan yang jelas
- **Persyaratan pengiriman**
  - Semuanya dikelola PM2: satu file ecosystem, satu skrip deploy
  - Reload tanpa downtime dibuktikan selama presentasi
  - Runbook yang dapat diikuti insinyur shift malam tanpa konteks
- **Lab Praktik**: Jalankan latihan kegagalan penuh — gangguan penyedia, crash worker, kebocoran memori — dan tunjukkan platform menyembuhkan diri dalam SLO, dengan setiap pemulihan terlihat di metrik

## Proyek Akhir

Peserta merancang, membangun, dan mengoperasikan platform aplikasi AI yang dapat menyembuhkan diri sendiri yang dikelola sepenuhnya oleh PM2. Platform harus mencakup: gateway LLM dengan failover penyedia dan pembatasan laju per tenant; pipeline ingest embedding dan vektor berbasis antrean dengan penanganan dead-letter; pipeline RAG empat tahap yang melanjutkan dari checkpoint setelah crash; pekerjaan pengindeksan ulang terjadwal setiap malam; metrik kustom @pm2/io untuk token, latensi, kedalaman antrean, dan biaya; tumpukan dashboard dan alerting Prometheus/Grafana; serta deployment model canary dengan rollback yang terukur. Tim mempresentasikan latihan kegagalan langsung — gangguan penyedia, crash worker, dan kebocoran memori — yang menunjukkan platform pulih dalam SLO tertulisnya, dan menyerahkan runbook yang dapat diikuti operator baru.

## Kriteria Penilaian

- **Lab Mingguan**: Setiap modul diakhiri dengan lab praktik yang dinilai berdasarkan konfigurasi proses yang benar, ketahanan di bawah kegagalan yang disuntikkan, dan keluaran observabilitas yang bersih (log dan metrik) — 40% dari nilai akhir.
- **Tinjauan Desain Pipeline**: Tinjauan tengah kursus terhadap arsitektur pipeline RAG, dievaluasi pada pemisahan tahap, checkpointing, idempotensi, dan penanganan dead-letter — 20%.
- **Dashboard Metrik dan Biaya**: Dashboard Grafana harus menampilkan token per detik, tingkat error penyedia, kedalaman antrean, dan pengeluaran, dengan alert yang terhubung ke kondisi kegagalan nyata — 15%.
- **Proyek Akhir**: Demonstrasi puncak langsung hanya lulus jika platform menyembuhkan diri dari ketiga kegagalan yang disuntikkan dalam SLO yang dinyatakan, rollback canary selesai dalam waktu kurang dari satu menit, dan runbook memungkinkan operator baru memulihkan gangguan yang disimulasikan tanpa bantuan — 25%.

## Referensi

- [Dokumentasi Proses Manager PM2](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Referensi File Ecosystem PM2](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [Dokumentasi Deployment PM2](https://pm2.keymetrics.io/docs/usage/deployment/)
- [Dokumentasi API Programatik PM2](https://pm2.keymetrics.io/docs/usage/pm2-api/)
- [Dokumentasi Metrik Kustom @pm2/io](https://github.com/keymetrics/pm2-io-apm)
- [BullMQ — Antrean Redis untuk Node.js](https://docs.bullmq.io/)
- [Dokumentasi Platform OpenAI](https://platform.openai.com/docs)
- [Dokumentasi API Anthropic](https://docs.anthropic.com/)
- [Dokumentasi OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [Dokumentasi Prometheus](https://prometheus.io/docs/)
