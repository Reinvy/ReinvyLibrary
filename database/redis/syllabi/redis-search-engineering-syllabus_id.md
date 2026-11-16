---
title: "Silabus Rekayasa Pencarian Redis"
description: "Kurikulum lanjutan 12 minggu tentang membangun pencarian produksi di atas Redis, mencakup internal inverted index, desain skema dan analyzer, DSL kueri full-text, penyetelan relevansi, autocomplete, agregasi dan facet, pencarian geo serta hybrid vektor, rekayasa memori dan performa indeks, operasional pada skala klaster, hingga reindex tanpa downtime."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Pencarian Redis

## Ringkasan

Silabus lanjutan 12 minggu ini ditujukan bagi backend engineer dan search engineer yang sudah mengenal Redis sebagai cache dan kini membutuhkannya untuk menjawab kueri: katalog produk, portal dokumentasi, daftar marketplace, eksplorasi log, serta lapisan retrieval di balik fitur AI. Sebagian besar materi Redis memperlakukan Query Engine sebagai catatan kaki — satu contoh `FT.CREATE` di samping JSON dan TimeSeries — sehingga engineer tidak siap menghadapi bagian yang benar-benar menentukan apakah pencarian berjalan di produksi: bagaimana indeks menyimpan term, mengapa sebuah kueri lambat, mengapa skor relevansi terasa salah, dan bagaimana membangun ulang indeks tanpa jendela maintenance.

Kurikulum ini disusun dari arah sebaliknya. Setiap modul dimulai dari indeks itu sendiri — bagaimana dokumen ditokenisasi, disimpan, dan diberi skor — dan baru setelah itu berpindah ke permukaan API. Peserta menulis kueri secara manual melalui `redis-cli` sebelum menyentuh library klien, membaca keluaran `FT.EXPLAIN` dan `FT.PROFILE` sampai rencana eksekusinya jelas, dan mengukur memori indeks alih-alih menebaknya. Urutannya disengaja: skema dan analyzer lebih dulu (karena keputusan ini sulit dibatalkan), lalu kueri dan relevansi, lalu fitur yang membuat pencarian terasa selesai — autocomplete, facet, geo — kemudian hybrid retrieval dengan vektor, dan terakhir kerja operasional menjalankan pencarian pada skala besar tanpa downtime.

Paruh kedua adalah titik tempat sebagian besar kursus berhenti dan sebagian besar insiden dimulai. Peserta merancang migrasi indeks yang bertukar secara atomik melalui alias, menjaga indeks tetap konsisten dengan sumber kebenaran relasional melalui outbox, merencanakan memori untuk indeks multi-tenant berisi jutaan dokumen, dan menetapkan SLO latensi kueri di bawah beban tulis. Proyek akhirnya adalah layanan pencarian marketplace multi-tenant yang benar-benar berjalan — bukan notebook, melainkan layanan dengan dashboard, runbook reindex, dan load test yang harus dilewatinya.

## Kurikulum

### Modul 1: Arsitektur Pencarian dan Fondasi Indeks (Minggu 1)

- **Apa Itu Redis Query Engine**
  - Redis Query Engine (RediSearch) sebagai modul: inverted index in-memory yang berada dalam proses yang sama dengan data
  - Penyajian kueri versus penyimpanan dokumen: mengapa Redis menyimpan keduanya dalam satu proses dan apa manfaatnya
  - Ruang keputusan: Redis Query Engine, Elasticsearch/OpenSearch, Meilisearch, full-text Postgres — latensi, beban operasional, biaya, dan kesesuaian fitur
  - Wilayah di mana pencarian Redis benar-benar unggul: lookup di bawah 10ms, retrieval berfilter, hybrid vektor+teks, dan pencarian atas data yang sudah ada di Redis
  - Wilayah yang tidak cocok: korpus sangat besar dengan analitik berat, pipeline relevansi kompleks, dan tim tanpa pengalaman operasional Redis
- **Internal Inverted Index**
  - Kamus term, posting list, dan document table: tiga struktur yang disentuh setiap kueri
  - Bagaimana dokumen berubah menjadi term: ekstraksi field, tokenisasi, normalisasi, stemming
  - Field numerik dan tag sebagai indeks terpisah dengan encoding masing-masing
  - Document table: document ID, internal ID, flag, dan alasan penghapusan bersifat lazy
  - Garbage collection dokumen terhapus (`FT.CONFIG GET`/`SET` pada `GCSCANSIZE`, `MINPREFIX`)
- **Siklus Hidup Indeks**
  - Anatomi `FT.CREATE`: `ON HASH` versus `ON JSON`, `PREFIX`, `FILTER`, `LANGUAGE`, `SCORE`, `STOPWORDS`, `TEMPORARY`
  - `FT.INFO` sebagai sumber kebenaran: `num_docs`, `hash_indexing_failures`, `indexing`, `percent_indexed`, `gc_stats`
  - `FT.DROPINDEX` dengan dan tanpa `DD` — apa yang dihancurkan masing-masing opsi
  - Alias (`FT.ALIASADD`, `FT.ALIASUPDATE`) sebagai lapisan indireksi yang dipakai di seluruh modul berikutnya
- **Lingkungan Lab**
  - Menjalankan Redis Stack dengan Docker Compose dan memuat `redis-stack-server`
  - Bantuan `redis-cli --search` dan disiplin perintah mentah
  - Mengisi 50.000 dokumen produk hasil generate ke dalam hash dengan skrip Lua atau Node
- **Lab Praktik**: Bangun indeks produk pertama di atas hash, isi 50.000 dokumen, lalu gunakan `FT.INFO` untuk membuktikan seluruh dokumen terindeks dan menjelaskan ke mana memori pergi

### Modul 2: Desain Skema dan Tipe Field (Minggu 2)

- **Pemilihan Tipe Field**
  - `TEXT`: ditokenisasi, di-stem, diberi skor — satu-satunya tipe yang memengaruhi relevansi
  - `TAG`: himpunan exact-match untuk enumerasi, array, dan ID; sensitivitas huruf dan kontrol separator
  - `NUMERIC`: rentang, pengurutan, dan filter numerik
  - `GEO`: titik geospasial serta predikat radius/box
  - `VECTOR`: dideklarasikan bersama skema teks untuk hybrid retrieval (dibahas mendalam di Modul 8)
- **Atribut yang Mengubah Segalanya**
  - `SORTABLE`: mengaktifkan `SORTBY` dan predikat rentang dengan biaya salinan duplikat yang tidak terkompresi
  - `NOINDEX` dan `NOSAVE`: field simpan-saja versus field indeks-saja, serta trade-off tulis/cari yang ditimbulkan
  - `UNF`: menonaktifkan normalisasi untuk field yang menuntut pencocokan byte persis
  - `WEIGHT`: pengali relevansi per field dan kapan ia menggantikan boosting di sisi kueri
  - `SEPARATOR`: separator tag untuk nilai yang tidak bisa memakai koma default
- **Hash versus JSON**
  - Tata letak field hash untuk dokumen datar: satu field per atribut, tanpa nesting
  - Dokumen JSON dengan ekspresi JSONPath sebagai definisi field
  - Mengindeks array tag dan array objek dari JSON
  - Path bersarang dan dinamis, serta field yang gagal terindeks tanpa pesan jelas
  - Memilih di antara keduanya untuk record produk yang sama, disertai pengukuran
- **Multi-Tenancy dan Pembatasan Indeks**
  - `PREFIX` untuk membatasi indeks pada satu keluarga key
  - `FILTER` untuk predikat numerik dan tag yang diterapkan saat indeks dibangun
  - Satu indeks per tenant versus satu indeks bersama dengan tag tenant — trade-off kardinalitas dan isolasi
  - Penamaan key sebagai batas tenancy: arti kebocoran prefix di klaster bersama
- **Lab Praktik**: Modelkan satu listing marketplace dengan tiga cara (hash datar, JSON dengan atribut bersarang, JSON dengan tag tenant bersama), lalu ukur memori indeks, latensi kueri, dan selektivitas filter untuk masing-masing

### Modul 3: DSL Kueri Secara Mendalam (Minggu 3)

- **Dasar Sintaks Kueri**
  - `FT.SEARCH index "query"` — apa yang sebenarnya diparse, dan persoalan dialect (semantik `DIALECT 2`)
  - Penargetan field dengan `@field:value` serta multi-field dengan `@field1|field2:value`
  - Menggabungkan term: AND implisit, `AND` eksplisit, `OR`, negasi dengan `-`, pengelompokan dengan tanda kurung
  - Frasa persis dengan string bertanda kutip dan mengapa ia berinteraksi buruk dengan stemming
- **Mode Pencocokan**
  - Pencocokan prefix dengan `term*` dan kueri parsial berbasis `PREFIX`
  - Pencocokan fuzzy dengan `%term%` dan parameter jarak — kurva biaya seiring naiknya tingkat fuzziness
  - Wildcard dengan `w'pattern'` termasuk `*` dan `?`
  - Pencocokan fonetik dengan `$term` dan atribut field `PHONETIC`
  - `VERBATIM` untuk menonaktifkan stemming dan pembuangan stopword saat kueri
- **Predikat Numerik, Tag, dan Geo**
  - Rentang numerik `@price:[10 100]`, batas eksklusif `((10`, serta `+inf`/`-inf`
  - Kueri tag dengan `{red | blue}`, negasi `{-red}`, dan aturan escape untuk karakter khusus
  - Predikat geo `@location:[lon lat radius unit]` di dalam `FT.SEARCH`
  - Menggabungkan ketiganya dalam satu kueri tanpa menenggelamkan term teks
- **Opsi Pembentuk Kueri**
  - `LIMIT offset count`, `SORTBY field ASC|DESC`, dan pengurutan multi-key dengan `SORTBY 2`
  - `RETURN` untuk memproyeksikan field dan memangkas payload jaringan, `NOCONTENT` untuk pemindaian ID saja
  - `INKEYS` dan `INFIELDS` untuk eksplorasi dan debugging yang terbatas
  - `WITHSCORES`, `WITHSORTKEYS`, `EXPLAINSCORE`, `WITHPAYLOADS`, dan `PARAMS` untuk kueri terparameterisasi
- **Lab Praktik**: Tulis empat puluh kueri secara manual terhadap korpus yang sudah diisi — setiap mode pencocokan, setiap tipe predikat — lalu tulis ulang lima kueri terlambat memakai `INKEYS`, `RETURN`, dan `NOCONTENT` dan ukur selisihnya

### Modul 4: Analyzer, Tokenisasi, dan Relevansi (Minggu 4)

- **Pipeline Analisis Teks**
  - Normalisasi karakter, batas tokenisasi, dan case folding
  - Stemming melalui Snowball untuk `LANGUAGE` yang dideklarasikan: apa yang digabungkan dan apa yang dirusak
  - Penanganan stopword dan argumen `STOPWORDS` untuk noise khas domain
  - Tokenisasi kustom untuk bahasa tanpa batas spasi, serta batas dukungan bawaan
  - Kapan sebaiknya memakai `UNF` plus field pra-normalisasi alih-alih melawan analyzer
- **Model Penilaian**
  - Scorer TF-IDF dan BM25 melalui `SCORER`: `TFIDF`, `TFIDF.DOCNORM`, `BM25STD`, `DISMAX`, `DOCSCORE`
  - Term frequency, inverse document frequency, dan normalisasi panjang field dalam praktik
  - `WEIGHT` per field versus boosting di sisi kueri (`term => { $weight: 3 }`)
  - Skor dokumen kustom yang ditulis ke field `SCORE` saat indeks dibangun
  - `EXPLAINSCORE` untuk melihat persis mengapa sebuah dokumen berada di peringkat tersebut
- **Sinonim dan Kamus**
  - Grup sinonim dengan `FT.SYNUPDATE` dan ekspansi term saat kueri
  - Spellcheck dengan `FT.SPELLCHECK` — jarak, penyertaan term, dan kamus kustom
  - Kamus kustom yang dimuat dari file term untuk kosakata domain
- **Evaluasi Relevansi**
  - Menyusun judgment set kecil: kueri, dokumen yang diharapkan, dan relevansi bergradasi
  - Mengukur precision at k dan mean reciprocal rank tanpa framework
  - Membandingkan dua scorer secara A/B pada judgment set yang sama
  - Mengenali kapan masalah relevansi sebenarnya masalah skema, bukan masalah penilaian
- **Lab Praktik**: Susun judgment set 30 kueri untuk korpus marketplace, lalu setel bobot, sinonim, dan pilihan scorer hingga mean reciprocal rank membaik — catat setiap perubahan dan efek terukurnya

### Modul 5: Autocomplete dan Search-as-You-Type (Minggu 5)

- **Struktur Data Saran**
  - `FT.SUGADD key "phrase" score` dengan `INCR`, `PAYLOAD`, dan biaya memori payload
  - `FT.SUGGET key prefix` dengan `FUZZY`, `MAX`, `WITHSCORES`, `WITHPAYLOADS`
  - `FT.SUGDEL` dan `FT.SUGLEN` untuk pengelolaan siklus hidup
  - Mengapa saran adalah struktur terpisah dari indeks pencarian, dan apa artinya bagi konsistensi
- **Alternatif Pencarian Prefix**
  - `term*` pada field `TEXT` versus kamus saran — latensi dan kualitas hasil
  - Field `TAG` dengan pencocokan prefix berlingkup `PREFIX` untuk penyelesaian terstruktur (SKU, kategori)
  - Penyelesaian numerik dan tanggal yang seharusnya bukan saran sama sekali
  - Pendekatan hibrida: saran untuk frasa, kueri indeks untuk penyaringan
- **Desain API untuk Search-as-You-Type**
  - Debounce dan pembatalan: pola tanpa `CLIENT PAUSE` di sisi server serta penggabungan permintaan
  - Anggaran permintaan: jumlah saran maksimum, panjang kueri maksimum, dan timeout keras per penekanan tombol
  - Memeringkat saran berdasarkan skor popularitas, kebaruan, dan lingkup tenant
  - Meng-cache prefix panas dengan TTL pendek versus menghitungnya per permintaan
- **Lab Praktik**: Implementasikan layanan saran atas 20.000 frasa kueri nyata dengan saran berbobot, fallback fuzzy, target navigasi berbasis payload, dan anggaran p99 sebesar 5ms pada 2.000 permintaan per detik

### Modul 6: Agregasi, Facet, dan Analitik (Minggu 6)

- **Pipeline `FT.AGGREGATE`**
  - Model mental pipeline: `LOAD`/`APPLY`/`FILTER`/`GROUPBY`/`REDUCE`/`SORTBY`/`LIMIT`
  - Sintaks ekspresi: aritmetika, fungsi string, fungsi tanggal, dan logika kondisional dalam `APPLY`
  - Fungsi `REDUCE`: `COUNT`, `COUNT_DISTINCT`, `SUM`, `AVG`, `MIN`, `MAX`, `STDDEV`, `QUANTILE`, `TOLIST`, `FIRST_VALUE`
  - `FILTER` versus penyaringan di sisi kueri: predikat pasca-agregasi dan biayanya
- **Navigasi Berfacet**
  - Penghitungan facet dengan `GROUPBY` atas field `TAG` dan `NUMERIC`, termasuk `COUNT_DISTINCT`
  - Facet multi-pilih: menginterseksikan pilihan tanpa kehilangan hitungan untuk facet lain
  - Facet rentang per bucket dan per batas eksplisit
  - Konstruksi histogram harga dan ringkasan statistik per facet
  - Jebakan klasik: facet dihitung atas seluruh korpus, bukan atas hasil yang sudah terfilter
- **Paging Cursor dan Hasil Berukuran Besar**
  - `WITHCURSOR` dengan `COUNT` dan `MAXIDLE` untuk agregasi streaming
  - Siklus hidup `FT.CURSOR READ` dan `FT.CURSOR DEL`, serta memori sisi server yang ditahan tiap cursor
  - Kapan memakai paging `LIMIT` (offset terbatas) dan kapan cursor wajib dipakai
  - Menghindari jebakan deep-offset pada paginasi yang dilihat pengguna
- **Lab Praktik**: Bangun panel facet untuk marketplace — kategori, merek, bucket harga, rentang rating, dan ketersediaan — dengan semantik multi-pilih, hitungan yang benar di bawah filter aktif, dan ekspor seluruh hasil ke CSV berbasis cursor

### Modul 7: Pencarian Geo dan Kueri Berbasis JSON (Minggu 7)

- **Pengindeksan Geo**
  - Field `GEO` dan representasi internal berbasis geohash
  - Predikat radius dan box, penanganan satuan, serta hasil terurut jarak dengan `SORTBY location`
  - `GEOSEARCH` pada sorted set versus field `GEO` di Query Engine: kapan masing-masing jadi alat yang tepat
  - Menggabungkan geo dengan teks dan tag: "kopi di sekitar saya, buka sekarang, rating di atas 4"
- **Pola Berbasis JSON**
  - JSONPath sebagai skema: `$.attributes.color AS color TAG`
  - Mengindeks array primitif sebagai tag dan array objek sebagai field yang diratakan
  - Pembaruan dokumen bersarang dengan `JSON.SET` dan pengaruhnya terhadap pemeliharaan indeks
  - `JSON.ARRAPPEND`, `JSON.NUMINCRBY`, dan biaya pembaruan parsial di bawah pengindeksan berat
  - Field yang gagal terindeks tanpa pesan, serta cara menangkapnya lewat penghitung error `FT.INFO`
- **Lab Praktik**: Tambahkan penemuan geo ke marketplace — pencarian radius terurut jarak, digabung dengan tag kategori dan predikat "buka sekarang", plus varian indeks berbasis JSON untuk perbandingan

### Modul 8: Hybrid Retrieval — Teks plus Vektor (Minggu 8)

- **Penyegaran Pengindeksan Vektor**
  - Deklarasi field `VECTOR`: `FLAT` versus `HNSW`, `TYPE FLOAT32`, `DIM`, `DISTANCE_METRIC`
  - Parameter HNSW `M`, `EF_CONSTRUCTION`, `EF_RUNTIME` serta trade-off memori/latensi/recall-nya
  - Kueri KNN (klausa `KNN`) versus rentang (`RANGE` dengan `epsilon`)
  - Perhitungan memori: jumlah dimensi dikali jumlah dokumen, ditambah overhead tautan HNSW
- **Pola Kueri Hibrida**
  - Pra-filter dengan tag dan numerik sebelum pencarian vektor — urutan yang kritis bagi performa
  - Pasca-filter dan mengapa ia diam-diam mengembalikan hasil kurang dari `k`
  - Menggabungkan skor kata kunci dan jarak vektor: fusi di sisi aplikasi dengan reciprocal rank fusion
  - Reranking cross-encoder atas 50 kandidat teratas sebagai peningkatan kualitas yang murah
  - Kebutuhan `DIALECT 2` dan perilaku parser yang menjebak pada kueri hibrida
- **Memilih Mode Retrieval**
  - Kapan pencarian leksikal menang: identifier persis, term langka, lookup SKU, kueri kepatuhan
  - Kapan vektor menang: parafrase, lintas bahasa, dan maksud yang kabur
  - Kapan keduanya tidak cukup dan jawabannya adalah reranker atau strategi chunking yang lebih baik
  - Kendali biaya: embedding saat tulis versus saat baca, caching embedding, dan biaya rebuild indeks
- **Lab Praktik**: Tambahkan embedding ke korpus marketplace, jalankan retrieval leksikal, vektor, dan hibrida atas judgment set yang sama dari Modul 4, lalu laporkan precision at k dan latensi p99 untuk ketiganya

### Modul 9: Performa Indeks dan Rekayasa Memori (Minggu 9)

- **Membaca Rencana Eksekusi**
  - `FT.EXPLAIN` untuk melihat pohon kueri hasil parse dan strategi union/intersection indeks
  - `FT.PROFILE` untuk pengukuran per tahap: kueri, pencarian, dan pipeline agregasi
  - `FT.PROFILE AGGREGATE` untuk menemukan reduce yang mahal dan group-by tanpa batas
  - Mengorelasikan kueri lambat dengan entri `SLOWLOG` dan trace sisi klien
- **Akuntansi Memori**
  - Memori per field: posting list teks, salinan sortable, indeks tag, pohon numerik, vektor
  - Penghitung memori `FT.INFO` dan rekonsiliasinya dengan `MEMORY USAGE` pada dokumen
  - Biaya `SORTABLE` pada field teks berkardinalitas tinggi — sering menjadi penghematan terbesar
  - `NOINDEX`/`NOSAVE` sebagai tuas, dan field yang seharusnya tidak pernah diindeks
  - Overhead document table per dokumen dan pengaruhnya pada indeks berisi dokumen kecil
- **Throughput Pengindeksan**
  - Parameter pengindeksan `FT.CONFIG SET`: batching, `PAUSE_ON_SUCCESS`, dan `PAUSE_BEFORE_RETRY`
  - Write amplification: mengapa indeks panas memperlambat seluruh instance
  - Strategi backfill massal versus pengindeksan kondisi mantap
  - `hash_indexing_failures` sebagai metrik pertama yang perlu diberi alert, dan penyebab umumnya
- **Lab Praktik**: Turunkan indeks marketplace dari sekitar 400 MB menjadi di bawah 250 MB tanpa kehilangan kemampuan kueri, lalu dokumentasikan setiap perubahan beserta delta memori dan latensi terukurnya

### Modul 10: Pencarian dan Operasional pada Skala Klaster (Minggu 10)

- **Pencarian di Redis Cluster**
  - Metadata indeks dan sharding dokumen: node mana yang memiliki apa
  - Eksekusi kueri terdistribusi dan penggabungan hasil antar shard
  - `FT.AGGREGATE` di bawah sharding: di mana reduce berjalan dan berapa biayanya
  - Hash tag key, ko-lokasi slot, dan kueri yang berubah menjadi fan-out
  - Perilaku coordinator dan mode kegagalan ketika satu shard tidak tersedia
- **Ketersediaan Tinggi dan Persistensi**
  - Indeks dalam snapshot RDB dan AOF: apa yang bertahan setelah restart dan apa yang harus dibangun ulang
  - Failover dengan replika: ketersediaan indeks selama promosi
  - Pencarian pada replika: penskalaan baca, staleness, dan kontrak konsistensinya
  - Jalur upgrade antar versi Redis dan versi modul, termasuk indeks yang perlu dibangun ulang
- **Observabilitas dan SLO**
  - Metrik `INFO search`: jumlah kueri, histogram latensi, kegagalan pengindeksan, statistik GC
  - Alert pada lag pengindeksan, pertumbuhan memori, dan regresi p99 kueri
  - Dashboard yang memisahkan masalah pencarian dari masalah inti Redis
  - Mendefinisikan SLO untuk latensi kueri, kesegaran pengindeksan, dan tingkat error
- **Lab Praktik**: Siapkan klaster tiga shard dengan satu replika masing-masing, jalankan beban kerja marketplace di atasnya, lalu simulasikan kegagalan satu shard dan ukur tingkat error kueri, latensi, serta waktu pemulihannya

### Modul 11: Migrasi Indeks, Konsistensi, dan Keamanan (Minggu 11)

- **Reindex Tanpa Downtime**
  - Pola tukar alias: bangun indeks baru, backfill, verifikasi, `FT.ALIASUPDATE`, hapus yang lama
  - Jendela dual-write dan cara menjaga kedua indeks tetap mutakhir selama backfill
  - Verifikasi sebelum penukaran: jumlah dokumen, kueri spot-check, dan eksekusi judgment set
  - Rollback: menjaga indeks sebelumnya tetap hidup cukup lama agar berguna
- **Menjaga Konsistensi Indeks**
  - Sumber kebenaran versus indeks: pola transactional outbox dan himpunan dirty-key
  - Mendeteksi drift dengan rekonsiliasi hitungan dan perbandingan dokumen tersampel
  - Job perbaikan yang mengindeks ulang dari penyimpanan relasional tanpa rebuild penuh
  - Penghapusan, kedaluwarsa TTL, dan dokumen yang tertinggal di indeks setelah key-nya hilang
- **Keamanan dan Privasi**
  - ACL per indeks dan per keluarga perintah (`FT.SEARCH`, `FT.AGGREGATE`, `FT.CREATE`)
  - TLS saat transit dan saat disimpan; namespace key sebagai batas tenancy
  - PII di dalam indeks: field `NOSAVE`, identifier ter-hash, dan field yang tidak boleh dapat dicari
  - Biaya kueri sebagai permukaan serangan: wildcard tanpa batas, `LIMIT` raksasa, dan cursor yang dihabiskan
  - Mengaudit akses pencarian dan menyimpan log kueri secara bertanggung jawab
- **Lab Praktik**: Lakukan perubahan skema secara live pada marketplace yang sedang berjalan — tambahkan satu field, bangun ulang, tukar via alias, dan rollback sekali — sementara generator beban terus berjalan dan tingkat error tetap nol

### Modul 12: Proyek Akhir — Marketplace Multi-Tenant (Minggu 12)

- **Tinjauan Kebutuhan dan Desain**
  - Kebutuhan fungsional: pencarian kata kunci, filter, facet, autocomplete, geo, hybrid retrieval
  - Kebutuhan non-fungsional: latensi kueri p99 di bawah 20ms, kesegaran pengindeksan di bawah 2 detik, ketersediaan 99,9%
  - Model tenancy, topologi indeks, dan rencana sharding
  - Mode kegagalan dan runbook yang dibutuhkan masing-masing
- **Membangun dan Memperkuat**
  - Skema indeks dan keputusan analyzer, dijustifikasi terhadap judgment set
  - Lapisan kueri dengan kueri terparameterisasi, himpunan hasil terbatas, dan penanganan error terstruktur
  - Layanan facet dan autocomplete dengan anggaran latensi masing-masing
  - Pipeline reindex dengan tukar alias, verifikasi, dan rollback
  - Dashboard, alert, dan dokumentasi SLO
- **Presentasi dan Pembelaan**
  - Hasil load test terhadap SLO yang dinyatakan, termasuk sesi injeksi kegagalan
  - Evaluasi relevansi yang membandingkan konfigurasi akhir dengan baseline Modul 4
  - Anggaran memori, lintasan pertumbuhannya, dan rencana kapasitas pada 10x dokumen
  - Runbook satu halaman yang bisa diikuti engineer lain saat insiden

## Proyek Akhir

Peserta membangun dan mengoperasikan **MarketSearch**, layanan pencarian marketplace multi-tenant yang sepenuhnya ditopang Redis Query Engine. Layanan ini mengekspos lima endpoint: `/search` (kata kunci, filter, pengurutan, paginasi), `/suggest` (search-as-you-type berbobot), `/facets` (hitungan facet multi-pilih di bawah filter aktif), `/nearby` (radius geo yang digabung dengan predikat teks dan tag), dan `/semantic` (retrieval hibrida leksikal plus vektor dengan fusi di sisi aplikasi dan reranking cross-encoder).

Keluarannya adalah layanan yang berjalan, bukan kumpulan skrip di repositori. Ia harus disertai: skema indeks terdokumentasi beserta alasan setiap atribut field; judgment set minimal 30 kueri dengan relevansi bergradasi dan precision at k terukur sebelum dan sesudah penyetelan; pipeline reindex yang melakukan rebuild penuh dan tukar alias tanpa satu pun permintaan gagal di bawah beban berkelanjutan; dashboard yang menampilkan p99 kueri, lag pengindeksan, memori indeks, dan `hash_indexing_failures`; serta load test 2.000 permintaan per detik yang ditahan sepuluh menit dalam SLO latensi yang dinyatakan.

Tenancy harus nyata: minimal dua tenant simulasi dengan data terisolasi, akses berlingkup ACL, dan jawaban terdokumentasi atas pertanyaan "apa yang terjadi bila kueri sebuah tenant mencoba keluar dari prefix-nya?" Proyek dinilai sama berat pada artefak operasional maupun kualitas pencarian — pencarian cepat yang tidak dapat di-reindex atau di-rollback tidak dinyatakan lulus.

## Kriteria Penilaian

- **Lab Mingguan (40%)**: Dua belas lab praktik, masing-masing dinilai berdasarkan apakah pengukuran yang diminta benar-benar dihasilkan. Lab yang melaporkan "pencarian cepat" tanpa pengukuran `FT.PROFILE`, angka memori indeks, atau perbandingan sebelum/sesudah tidak memperoleh nilai. Lab 4, 9, dan 11 (penyetelan relevansi, penurunan memori, migrasi tanpa downtime) berbobot ganda karena keterampilan itulah yang membedakan search engineer dari seseorang yang bisa menulis kueri.
- **Tinjauan Desain Skema dan Relevansi (15%)**: Pembelaan tertulis atas skema indeks akhir — tipe field, atribut, analyzer, dan model tenancy — dengan setiap keputusan dijustifikasi melalui pengukuran atau trade-off eksplisit. Peninjau akan menguji keputusan yang diambil karena default, bukan karena pilihan; "saya memakai `SORTABLE` di semua field" dinyatakan tidak lulus.
- **Kesiapan Operasional (20%)**: Kebenaran pipeline reindex di bawah beban, tukar alias dan rollback yang didemonstrasikan langsung, cakupan alert untuk lag pengindeksan dan pertumbuhan memori, serta runbook yang dapat diikuti peninjau tanpa bertanya. Dinilai dari demonstrasi, bukan dokumentasi semata.
- **Proyek Akhir (20%)**: Kelengkapan fungsional kelima endpoint, precision at k terukur terhadap judgment set, latensi p99 pada beban yang dinyatakan, isolasi tenancy yang terverifikasi melalui upaya pelanggaran, serta kemampuan bertahan dari kegagalan shard yang diinjeksi dengan degradasi terdokumentasi alih-alih pemadaman.
- **Kualitas Kode dan Kueri (5%)**: Kueri terparameterisasi (tanpa penyambungan string masukan pengguna ke dalam DSL kueri), himpunan hasil terbatas, tanpa wildcard tanpa batas pada jalur yang dilihat pengguna, dan pemisahan jelas antara lapisan pencarian dan lapisan data.

## Referensi

- Dokumentasi Redis — Query Engine: <https://redis.io/docs/latest/develop/interact/search-and-query/>
- Dokumentasi Redis — Perintah pengindeksan dan kueri: `FT.CREATE`, `FT.SEARCH`, `FT.AGGREGATE`, `FT.PROFILE`, `FT.EXPLAIN`
- Dokumentasi Redis — vector set dan pencarian kemiripan vektor
- Sumber RediSearch dan catatan rilis modul (internal indeks, GC, thread pengindeksan)
- Manning, *Relevant Search* — Doug Turnbull dan John Berryman: metodologi penyetelan dan evaluasi relevansi
- *Introduction to Information Retrieval* — Manning, Raghavan, Schütze: inverted index, TF-IDF, BM25
- Dokumentasi Elasticsearch dan OpenSearch, sebagai pembanding semantik DSL kueri dan model agregasi
- Redis University — materi kursus RU301 (Redis Streams) dan RU203 (Query Engine)
- Blog Redis — studi kasus pencarian produksi dan panduan memori indeks
