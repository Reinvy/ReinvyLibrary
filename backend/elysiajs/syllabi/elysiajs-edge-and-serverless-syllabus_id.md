---
title: "Silabus Elysia.js Edge dan Serverless"
description: "Kurikulum lanjutan 12 minggu tentang menjalankan Elysia.js di luar server berumur panjang — batas portabilitas WinterTC, pemilihan adapter dan kontrak fetch, Cloudflare Workers dan Durable Objects, penyimpanan edge, Deno Deploy dan platform edge terkelola, pengemasan Lambda, autentikasi yang aman di edge, caching dan penggabungan permintaan, kontrak lintas runtime, observabilitas pada proses efemeral, matriks pengujian multi-runtime, serta pemilihan runtime yang didukung model biaya."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Elysia.js Edge dan Serverless

## Ringkasan

Elysia.js dibangun di atas `Request` dan `Response` standar web, sehingga objek aplikasi yang sama dapat dilayani oleh Bun, Node.js, Deno, Cloudflare Worker, atau satu invokasi Lambda. Sifat itu mudah ditunjukkan dengan route hello-world, tetapi jauh lebih sulit dipertahankan begitu aplikasi memiliki autentikasi, basis data, pekerjaan latar belakang, unggahan berkas, dan strategi caching. Portabilitas patah secara diam-diam: satu impor `node:fs` yang terkubur di dalam plugin, skema yang membuat bundel Worker melewati batas ukuran, connection pool yang dibuka pada setiap invokasi, atau baris log yang hanya ada di dasbor platform.

Silabus lanjutan 12 minggu ini memperlakukan target deployment sebagai keputusan arsitektur, bukan detail hosting. Kurikulum dimulai dari batasan yang dimiliki semua runtime non-server — tidak ada proses berumur panjang, tidak ada heap bersama, waktu CPU yang dibatasi, cold start yang dibayar per permintaan — lalu bergerak keluar: bagaimana kontrak fetch menjaga satu basis kode tetap dapat dideploy ke beberapa runtime, bagaimana adapter dan bundler mengubah batas itu, jaminan apa yang sebenarnya diberikan primitif penyimpanan dan state pada setiap target, dan di mana asumsi konsistensi gagal secara diam-diam ketika handler berjalan di isolate yang menghilang setelahnya.

Urutannya disengaja. Modul 1 dan 2 membangun model portabilitas dan pipeline build, karena semua modul berikutnya bergantung pada kemampuan menjawab "apakah kode ini berjalan di sini, dan apakah masih muat di dalam bundel". Modul 3 sampai 6 mensurvei target konkret — Cloudflare Workers, penyimpanan edge, Deno Deploy dan platform edge terkelola lain, lalu AWS Lambda dan container — masing-masing dinilai dengan pertanyaan yang sama: state, batas, dan mode kegagalan. Modul 7 sampai 10 membahas hal-hal yang paling berubah bentuk ketika proses bersifat efemeral: autentikasi dan secret, caching dan anggaran permintaan, kontrak dan type safety, serta observabilitas. Modul 11 mengubah hasilnya menjadi pipeline pengiriman dengan matriks pengujian nyata, dan Modul 12 ditutup dengan pemilihan runtime serta model biaya, karena di edge tagihan adalah batasan desain.

Peserta meninggalkan kursus dengan kemampuan mempertahankan pilihan deployment dalam code review: mengapa beban kerja ini layak ditempatkan di edge atau tidak, jaminan konsistensi apa yang diandalkan cache, apa yang terjadi pada pekerjaan yang sedang berjalan ketika isolate dievakuasi, dan berapa biaya satu permintaan pada volume trafik yang diharapkan produk.

## Kurikulum

### Modul 1: Batasan Runtime dan Masalah Portabilitas (Minggu 1)

- **Apa yang Sebenarnya Berubah di "Edge"**
  - Tidak ada proses berumur panjang: setiap asumsi tentang state level modul, timer latar belakang, atau cache di memori harus diperiksa ulang
  - Batas waktu CPU per permintaan, bukan kelonggaran wall-clock — dan bagaimana satu loop sinkron yang panas berubah menjadi kegagalan keras, bukan respons yang lambat
  - Cold start sebagai pajak per permintaan yang bervariasi menurut runtime, ukuran bundel, dan apakah isolate dipakai ulang atau didaur ulang
  - Batas memori per isolate, tidak ada heap bersama antar permintaan bersamaan, dan akibatnya larangan memakai penghitung di memori untuk apa pun yang harus benar
  - Batas egress dan subrequest: handler yang memanggil enam layanan bisa menabrak kuota platform sebelum menabrak timeout
- **Baseline WinterTC**
  - Yang dijamin tersedia: `Request`, `Response`, `Headers`, `fetch`, `ReadableStream`, `URL`, `AbortSignal`, `TextEncoder`, WebCrypto, `crypto.randomUUID`
  - Yang hilang atau menurun: `node:fs`, `node:net`, `node:child_process`, addon native, crypto sinkron, dan sebagian besar permukaan API `node:crypto`
  - Deteksi fitur, bukan deteksi runtime: memeriksa `process.versions.bun` alih-alih menguji kapabilitas adalah cara kode rusak diam-diam pada runtime berikutnya
  - Shim kompatibilitas (`nodejs_compat` di Workers, specifier npm di Deno) serta perbedaan antara "impor berhasil diselesaikan" dan "perilakunya benar"
- **Membaca Model Portabilitas Elysia dengan Tepat**
  - `app.fetch` sebagai satu-satunya batas yang dibutuhkan framework — handler standar web yang dapat dipanggil runtime mana pun
  - Pemilihan adapter: `listen` bawaan Bun, adapter `@elysia/node` untuk Node.js, dan jalur standar web untuk runtime tanpa adapter sama sekali
  - Realitas Bun-first: sebagian plugin, helper berkas, dan asumsi bundler bersifat khusus Bun, sehingga "berjalan di Elysia" bukan klaim yang sama dengan "berjalan di mana pun Elysia berjalan"
  - Di mana fitur framework memetakan ke fitur runtime (WebSocket, streaming, penanganan berkas) dan di mana fitur itu diam-diam memakai jalur cadangan
- **Audit Portabilitas**
  - Pemindaian graf dependensi untuk impor `node:`, modul native, dan paket yang menjalankan proses atau menyentuh filesystem saat impor
  - Mengklasifikasikan setiap dependensi sebagai murni, aman untuk edge, atau bermusuhan dengan edge, beserta alasannya — alasan itulah yang bertahan saat dependensi diperbarui
  - Perhitungan ukuran bundel sebelum deployment pertama: pustaka skema, kompiler validasi, dan SDK adalah tersangka utamanya
- **Lab Praktik**: Audit layanan Elysia.js yang sudah ada untuk kelayakan edge. Hasilkan tabel setiap dependensi runtime beserta klasifikasinya, estimasi ukuran bundel, dan daftar singkat perubahan yang diperlukan agar layanan dapat berjalan pada runtime standar web.

### Modul 2: Satu Basis Kode, Banyak Runtime — Kontrak Fetch (Minggu 2)

- **Titik Masuk Universal**
  - Mengekspor handler sekali dan membiarkan bootstrap setiap runtime memanggilnya: sintaks modul Workers, `Bun.serve`, `Deno.serve`
  - Menjaga berkas bootstrap tetap tipis — parsing environment, pemilihan adapter, dan tidak ada hal lain yang kemudian diandalkan secara implisit oleh handler
  - Paritas pengembangan lokal: `bun dev` untuk iterasi, `wrangler dev` untuk runtime target yang sebenarnya, dan penyimpangan yang muncul ketika hanya salah satunya dipakai
- **Handler yang Dapat Berpindah**
  - Modul aplikasi bersama tidak boleh mengimpor API server khusus runtime; entrypoint yang melakukannya, bukan aplikasi
  - Akses environment melalui satu objek konfigurasi yang diinjeksi, bukan pembacaan `process.env` yang tersebar
  - Degradasi yang jelas: fitur yang tidak mungkin berjalan pada target (unggahan filesystem, WebSocket berumur panjang) harus gagal dengan pesan jelas saat startup, bukan stack trace di tengah permintaan

```typescript
// src/app.ts — aplikasi portabel, tanpa impor runtime
import { Elysia, t } from 'elysia'

export const app = new Elysia({ prefix: '/api' })
  .get('/health', () => ({ status: 'ok' }))
  .post('/echo', ({ body }) => body, {
    body: t.Object({ message: t.String({ minLength: 1 }) })
  })

// src/bun.ts — bootstrap Bun
// Bun.serve({ fetch: app.fetch, port: 3000 })

// src/worker.ts — bootstrap Cloudflare Worker
// export default { fetch: app.fetch }

// src/deno.ts — bootstrap Deno
// Deno.serve(app.fetch)
```

- **Target Build dan Bundling**
  - Memilih target per artefak: Bun untuk container, keluaran standar web untuk Workers, target Node untuk container Lambda
  - Keluaran ESM satu berkas, tree-shaking, dan mengapa `--minify` lebih mengubah waktu startup daripada throughput
  - Substitusi environment saat build versus konfigurasi runtime, serta jebakan menyematkan secret ke dalam bundel
  - Source map yang disimpan untuk pelaporan error — stack trace hasil bundling tanpa map tidak terbaca justru saat paling dibutuhkan
- **Matriks Pemilihan Adapter**
  - Dukungan runtime bawaan, adapter resmi, dan opsi jembatan event: mana yang membawa jaminan apa
  - Runtime tanpa handler HTTP sama sekali (Lambda, Cloud Functions) membutuhkan lapisan penerjemah event ke `Request`; di lapisan itulah bug kebenaran bersembunyi
  - Memverifikasi target baru dengan rangkaian smoke test konformansi sebelum mempercayainya — status code, header, streaming, cookie, dan parsing body
- **Portabilitas Konfigurasi**
  - Satu skema untuk environment, divalidasi saat startup, dengan exit code gagal alih-alih `undefined` saat permintaan berjalan
  - Memetakan penyimpanan secret antar platform (secret repositori, secret Worker, parameter SSM) tanpa mengubah kode aplikasi
- **Lab Praktik**: Refaktor layanan sehingga satu `src/app.ts` dilayani oleh Bun secara lokal dan oleh Worker di lingkungan terdeploy, dengan rangkaian smoke test konformansi yang berjalan pada keduanya dan memastikan respons identik untuk permintaan yang sama.

### Modul 3: Cloudflare Workers Secara Mendalam (Minggu 3)

- **Sintaks Modul dan Pengembangan Lokal**
  - `export default { fetch: app.fetch }` ditambah handler `scheduled` dan `queue`; Worker tidak pernah memanggil `listen`
  - Konfigurasi `wrangler`: entry point, bagian environment, route, dan binding per environment
  - `wrangler dev` dalam mode lokal dengan binding tersimulasi versus mode remote terhadap sumber daya nyata
  - Pinning `compatibility_date` dan apa yang berubah di bawah permukaan ketika sebuah flag kompatibilitas diaktifkan
- **Aritmatika Bundel dan Batas**
  - Batas ukuran terkompresi per paket dan apa yang benar-benar dihitung: skema TypeBox, pembuatan OpenAPI, dan ORM yang dibundel mendominasi
  - Memecah aplikasi besar: route publik panas di satu Worker, route admin dan pelaporan di Worker lain di belakang service binding
  - Biaya startup versus biaya permintaan: inisialisasi berat di level modul dibebankan pada permintaan pertama setiap isolate
- **Binding, Bukan Klien**
  - Memperlakukan binding sebagai dependensi terinjeksi: `KV`, `D1`, `R2`, `Hyperdrive`, `Queue`, `AI`, dan service binding, semuanya diteruskan melalui objek konfigurasi aplikasi
  - Mengapa koneksi per permintaan fatal di sini dan apa penggantinya (Hyperdrive, driver HTTP, atau layanan origin)
  - Mengetik binding agar aplikasi dikompilasi terhadap sebuah antarmuka, bukan terhadap platform
- **Streaming dan Body Permintaan**
  - Body permintaan adalah stream: membaca dua kali tidak mungkin, dan penanganan multipart memerlukan parser streaming
  - Streaming respons untuk server-sent events dan ekspor besar, termasuk perilaku flush melalui CDN
  - Sinyal abort saat klien terputus dan pembatalan pekerjaan hilir alih-alih membiarkannya selesai tanpa diamati
- **Lab Praktik**: Deploy API Elysia.js ke Workers dengan KV untuk pembacaan ter-cache dan service binding ke Worker kedua. Ukur latensi cold-start dan p95 hangat, lalu kecilkan ukuran bundel dan ukur kembali.

### Modul 4: Penyimpanan dan State di Edge (Minggu 4)

- **KV: Baca Cepat, Tulis Eventual**
  - Latensi baca global dengan propagasi tulis yang tidak seketika — rancang fitur yang tahan terhadap pembacaan basi
  - Tidak ada increment atomik, tidak ada compare-and-swap: penghitung dan kuota memerlukan primitif lain
  - Metadata, kedaluwarsa, dan pembacaan massal; strategi pemanasan cache setelah deploy
- **D1: Semantik SQLite di Edge**
  - Perilaku single-writer, replikasi baca, dan di mana transaksi berhenti menjadi seperti yang diharapkan pengembang Postgres
  - Statement batch, penggunaan ulang prepared statement, dan biaya banyak perjalanan pulang-pergi kecil dari satu handler
  - Migrasi skema melalui tooling platform, dan menjaga state migrasi konsisten antar environment
- **R2: Object Storage untuk Unggahan dan Ekspor**
  - Semantik kompatibel S3 tanpa biaya egress; presigned URL dibuat oleh Worker sehingga byte tidak melewatinya
  - Unggahan multipart untuk berkas besar, dan di mana sebaiknya streaming body respons langsung dari objek
- **Durable Objects: Koordinasi yang Benar-Benar Tepat**
  - Jaminan single-writer, penyimpanan di dalam objek, dan objek berbasis SQLite untuk state terstruktur
  - Rate limiter, idempotency key, penghitung, dan ruang kolaborasi WebSocket sebagai kasus penggunaan kanonis
  - Hibernasi WebSocket dan alarm sebagai pengganti timer latar belakang yang tidak ada di sini
  - Bentuk biaya: durasi dan permintaan per objek, serta mengapa objek per pengguna lebih mahal daripada per tenant
- **Memilih Primitif**
  - Satu lintasan keputusan atas keempatnya: konsistensi yang ditawarkan, biaya per operasi, dan mode kegagalan yang diperkenalkan masing-masing
- **Lab Praktik**: Implementasikan endpoint tulis idempoten berbasis Durable Object dan jalur baca ter-cache berbasis KV. Tunjukkan perilaku yang benar pada permintaan duplikat dan pembacaan KV yang basi.

### Modul 5: Deno Deploy dan Platform Edge Terkelola (Minggu 5)

- **Deno sebagai Target**
  - `Deno.serve(app.fetch)` dan model izin; specifier npm untuk paket yang hanya terbit di npm
  - API khas Deno yang layak dipakai (KV, cron, queue) dan biaya portabilitas karena mengadopsinya
- **Perilaku Platform yang Berbeda**
  - Cakupan region dan perutean permintaan: di mana kode berjalan adalah bagian dari anggaran latensi yang dijanjikan
  - Pipeline build-on-push versus build lokal, dan mana yang dapat direproduksi saat insiden
  - Deployment preview per branch dan bagaimana secret dibatasi per environment
- **Vercel dan Runtime Edge Terkelola Lain**
  - Subset API web, batas ukuran modul, dan flag kompatibilitas Node — batasan yang sama dengan nama berbeda
  - Fungsi edge versus fungsi regional: kapan "dekat pengguna" kalah dari "dekat basis data"
  - Fastly Compute dan platform berbasis WASM serupa: langkah build berbeda, kontrak fetch tetap sama
- **Membandingkan Target Secara Setara**
  - Harga per juta permintaan, penagihan waktu CPU, egress, dan profil cold start yang diukur pada beban kerja sendiri, bukan benchmark vendor
  - Primitif platform mana yang menanggung beban desain, dan karena itu berapa biaya migrasinya
- **Lab Praktik**: Port aplikasi Modul 3 ke platform edge terkelola kedua dan hasilkan perbandingan latensi p95, waktu cold start, dan biaya bulanan pada tingkat trafik yang dinyatakan.

### Modul 6: AWS Lambda dan Container Serverless (Minggu 6)

- **Masalah Jembatan Event**
  - Lambda menerima event API Gateway, bukan `Request`: lapisan penerjemah adalah tempat status code, header, cookie, dan body biner hilang
  - Opsi adapter — lapisan web adapter di depan handler, atau shim eksplisit kecil yang Anda miliki dan uji sendiri
  - Mode response streaming dan batasannya; respons ter-buffer dan plafon ukurannya
- **Mengemas Aplikasi Elysia.js**
  - Bundling ke target Node dan mengirim satu artefak, atau mengirim Bun di dalam image container
  - `arm64` untuk price-performance, disiplin ukuran image, dan caching layer di CI
  - Dependensi native: satu-satunya kelas paket yang memaksa jalur container
- **Cold Start dan Konkurensi**
  - Pekerjaan fase init: membuka klien, memanaskan cache, dan mem-parsing konfigurasi tepat sekali per container
  - Provisioned concurrency sebagai pembelian latensi, dan pola trafik yang membenarkannya
  - Batas konkurensi versus batas koneksi hilir: Lambda melakukan scale lebih cepat daripada kemampuan basis data menerima koneksi
- **Basis Data dan Trigger Non-HTTP**
  - RDS Proxy atau data API berbasis HTTP alih-alih pool mentah per container
  - Handler SQS, S3, dan EventBridge yang berbagi kode aplikasi yang sama melalui entry point terpisah
  - Idempotensi untuk pengiriman at-least-once, dan di mana rekaman deduplikasi disimpan
- **Lab Praktik**: Deploy aplikasi Elysia.js yang sama sebagai container Lambda di belakang HTTP API, ukur latensi cold-start dan p95 hangat, lalu tambahkan provisioned concurrency dan kuantifikasi selisihnya.

### Modul 7: Autentikasi dan Secret di Runtime Efemeral (Minggu 7)

- **Memverifikasi Token dengan WebCrypto**
  - Mengapa pustaka JWT yang biasa gagal di sini: crypto Node sinkron, buffer, dan binding native
  - Verifikasi berbasis WebCrypto dengan JWKS, termasuk rotasi kunci dan caching set kunci yang diambil per isolate
  - Pinning algoritma, validasi `aud`/`iss`, penanganan clock skew, dan penolakan `none`
- **Sesi yang Bertahan dari Eviction**
  - Cookie tertandatangani stateless versus sesi berbasis KV atau Durable Object: pencabutan, ukuran, dan trade-off biaya baca
  - Rotasi refresh dan deteksi penyalahgunaan ulang, termasuk balapan antara dua refresh bersamaan
  - Atribut cookie di belakang CDN: `Secure`, `SameSite`, prefiks `__Host-`, dan kesalahan cakupan domain yang membocorkan antar subdomain
- **Secret dan Rotasi**
  - Penyimpanan secret platform sebagai satu-satunya sumber; tidak ada di bundel, tidak ada di konfigurasi yang ter-commit
  - Cakupan per environment, hak akses minimum per binding, dan prosedur rotasi yang tidak memerlukan perubahan kode
  - Kontrol rate limit dan penyalahgunaan: penghitung Durable Object, aturan WAF, dan mengapa KV adalah penyimpanan yang salah untuk batas ketat
- **Persoalan Autentikasi Sisi Browser**
  - CORS dengan kredensial, strategi CSRF untuk sesi cookie, dan perilaku preflight melalui CDN
  - Verifikasi passkey dan WebAuthn di edge, serta bagian yang masih memerlukan layanan origin
- **Lab Praktik**: Tambahkan autentikasi berbasis JWKS dan rate limiting Durable Object ke Worker Modul 3. Sertakan latihan rotasi: rotasi kunci penandatangan tanpa satu pun permintaan gagal.

### Modul 8: Caching, Penggabungan Permintaan, dan Anggaran Permintaan (Minggu 8)

- **Cache API dan Semantik CDN**
  - Penulisan cache eksplisit dari Worker, desain cache key (method, path, query yang dinormalisasi, header terpilih), dan strategi purge
  - Kebenaran `Vary`: dua dimensi biasanya sudah satu terlalu banyak di edge
- **HTTP Caching yang Benar**
  - `Cache-Control`, `s-maxage`, `stale-while-revalidate`, dan permintaan kondisional berbasis `ETag` yang ditangani framework
  - Respons terpersonalisasi yang tidak boleh pernah di-cache, dan disiplin header yang mencegahnya
- **Penggabungan dan Kendali Stampede**
  - Single-flight dengan Durable Objects untuk meruntuhkan permintaan; thundering herd yang muncul tepat saat key populer kedaluwarsa
  - Timeout lock dan respons terdegradasi alih-alih mengantre sampai batas CPU mematikan permintaan
- **Hidup di Dalam Anggaran Permintaan**
  - Waktu CPU per permintaan, batas subrequest, dan pola fan-out yang tetap di bawah keduanya
  - Memindahkan pekerjaan mahal dari jalur panas: queue untuk penulisan, handler terjadwal untuk agregasi
  - Mengukur cache hit rate sebelum dan sesudah, dan menolak menyebut cache efektif tanpa angka
- **Lab Praktik**: Tambahkan endpoint baca ter-cache dengan perlindungan single-flight. Jalankan burst permintaan bersamaan terhadap key dingin dan buktikan origin hanya menerima satu panggilan, bukan seratus.

### Modul 9: Kontrak dan Type Safety Lintas Runtime (Minggu 9)

- **TypeBox sebagai Sumber Kebenaran Tunggal**
  - Satu paket skema yang dipakai bersama oleh handler, klien, dan OpenAPI yang dihasilkan, sehingga kontrak tidak dapat melenceng antar deployment
  - Komposisi skema, discriminated union, dan biaya validasi yang ditambahkan komposisi tersebut pada setiap permintaan
- **Eden Treaty dengan Server Portabel**
  - Menjaga inferensi tipe tetap utuh ketika server dibundel untuk target non-Bun, dan dari mana tipenya sebenarnya berasal
  - Klien bertipe di browser, di Worker lain, dan di pekerjaan terjadwal — satu klien, beberapa konsumen
- **Versioning dan Kompatibilitas**
  - Versioning melalui URL versus negosiasi header, dan mana yang realistis ketika CDN berada di depan
  - Jendela deprekasi, perubahan aditif saja, dan contract test berbasis konsumen yang gagal sebelum klien gagal
- **Validasi yang Sadar Biaya**
  - Mengukur validasi skema terhadap anggaran CPU; memangkas pohon `t.Object` yang dalam pada route terpanas
  - Batas ukuran permintaan yang ditegakkan di edge, sebelum body diparsing
- **Lab Praktik**: Ekstrak skema ke paket bersama yang dikonsumsi dua deployment dan satu klien. Tambahkan contract test yang menggagalkan build ketika bentuk respons berubah secara tidak kompatibel.

### Modul 10: Observabilitas Tanpa Proses Berumur Panjang (Minggu 10)

- **Log sebagai Rekaman Utama**
  - JSON terstruktur dengan kumpulan field tetap: level, message, request id, route, status, durasi, deployment id
  - Request id dibuat di edge dan diteruskan ke hilir sehingga tiket dukungan memetakan ke satu baris log
  - Log drain, tail handler, dan sampling yang menjaga jalur error tetap lengkap sambil menipiskan trafik sukses
- **Tracing Melintasi Batas Edge**
  - Meneruskan konteks trace dari CDN melalui Worker ke origin, dan titik-titik tempat konteks itu hilang
  - Keputusan sampling head-based diambil sekali di titik masuk, bukan secara independen di setiap layanan
  - Penamaan span yang mencerminkan route, bukan nama fungsi, agar latensi dapat diagregasi per endpoint
- **Error yang Dapat Didiagnosis Nanti**
  - Menangkap konteks invokasi — deployment id, region, petunjuk penggunaan ulang isolate, binding yang dipakai — pada saat kegagalan
  - Source map yang diunggah per deployment, dan rollback yang tetap menyimpan map untuk versi yang dituju
  - Membedakan kegagalan platform (eviction, batas terlampaui, kegagalan subrequest) dari error aplikasi
- **Metrik yang Bertahan dari Efemeralitas**
  - Menurunkan penghitung dari log alih-alih dari memori; analitik platform untuk jumlah permintaan dan waktu CPU
  - Pemeriksaan sintetis dari beberapa region, karena "hidup di satu colo" adalah mode kegagalan nyata
  - Alert pada gejala yang dialami pengguna: latensi p95, error rate, runtuhnya cache hit rate
- **Lab Praktik**: Instrumentasikan layanan terdeploy secara menyeluruh — log terstruktur, propagasi trace ke origin, dan dasbor yang dibangun dari metrik turunan log. Reproduksi kegagalan yang disengaja dan diagnosis hanya dari telemetri.

### Modul 11: Matriks Pengujian Multi-Runtime dan Pengiriman (Minggu 11)

- **Menguji pada Tingkat yang Tepat**
  - Unit test dengan `bun:test` terhadap modul aplikasi portabel; tidak perlu server yang mendengarkan port
  - Integration test terhadap runtime target secara lokal — `wrangler dev`, `workerd`, Miniflare — sehingga perilaku binding benar-benar diuji, bukan dimock
  - Rangkaian konformansi yang menjalankan permintaan yang sama pada setiap target dan membandingkan responsnya
- **CI sebagai Pipeline Build-Sekali, Deploy-Banyak**
  - Satu langkah build yang menghasilkan artefak per target; job matriks yang men-deploy masing-masing dan menjalankan smoke test-nya
  - Secret per environment, token deployment dengan cakupan minimum, dan tidak ada kredensial produksi pada build dari fork
- **Pengiriman Progresif**
  - Lingkungan preview per pull request; canary atau rollout bertahap; rollback instan dan metrik yang memicunya
  - Migrasi saat deploy: expand-and-contract agar jalur rollback benar-benar ada
- **Infrastruktur di Dalam Repositori**
  - Konfigurasi wrangler dan platform di-commit, di-review, dan di-diff seperti kode
  - Promosi antar environment berdasarkan artefak, bukan dengan build ulang — build ulang menghasilkan artefak yang berbeda
- **Lab Praktik**: Bangun pipeline-nya: satu commit, tiga target, rangkaian konformansi per target, dan deploy canary dengan rollback otomatis saat error rate memburuk.

### Modul 12: Pemilihan Runtime dan Pemodelan Biaya (Minggu 12)

- **Kerangka Keputusan, Bukan Preferensi**
  - Anggaran latensi, lokalitas data, kebutuhan konsistensi, selera operasional, dan keakraban tim — dinilai sebelum platform dipilih
  - Beban kerja yang benar-benar diuntungkan (pemeriksaan auth, personalisasi, pembacaan ter-cache, pembentukan permintaan) dan yang tidak (transaksi panjang, pembuatan laporan berat, apa pun yang memerlukan filesystem)
- **Membangun Model Biaya**
  - Jumlah permintaan, milidetik CPU, egress, unit baca/tulis KV dan D1, durasi Durable Object, dan volume log sebagai baris terpisah
  - Titik break-even antara edge dan container, dihitung untuk profil trafik yang dinyatakan, bukan dikutip dari halaman harga
  - Biaya tersembunyi: deployment preview, penyerapan observabilitas, dan waktu operasional untuk memelihara runtime kedua
- **Topologi Hibrida**
  - Pembacaan di edge dengan origin regional untuk penulisan, backend-for-frontend yang membentuk respons dekat pengguna
  - Migrasi strangler: rutekan per path, ukur, lalu pindahkan path berikutnya — jangan pernah cutover sekaligus
- **Strategi Keluar**
  - Primitif khusus platform mana yang menanggung beban, berapa biaya port dalam minggu engineering, dan lapisan sambungan yang menjaganya tetap mungkin
  - Daftar risiko tertulis: perubahan kuota, perubahan harga, deprekasi, dan rencana cadangan untuk masing-masing
- **Lab Praktik**: Hasilkan lembar total biaya kepemilikan untuk satu beban kerja pada tiga target deployment, dengan asumsi yang dinyatakan, dan rekomendasi satu halaman yang dipertahankan terhadap lembar tersebut.

## Proyek Akhir

Bangun **Portable Elysia.js Edge Service**, satu aplikasi yang dideploy ke dua target produksi dengan satu basis kode:

- API publik berat baca dengan endpoint ter-cache yang dilindungi single-flight serta endpoint tulis terautentikasi
- Penyimpanan yang sesuai dengan jaminan setiap target: pembacaan berbasis KV atau D1, Durable Object untuk idempotensi dan rate limiting, R2 untuk unggahan jika beban kerja mencakup berkas
- Autentikasi berbasis JWKS dengan rotasi kunci, sesi berbasis cookie atau token tertandatangani, dan jalur pencabutan yang terdokumentasi
- Paket skema TypeBox bersama, dokumen OpenAPI yang dihasilkan darinya, dan klien bertipe yang dikonsumsi front end kecil atau pekerjaan terjadwal
- Log terstruktur, propagasi trace ke layanan origin, dan satu dasbor yang dibangun dari metrik turunan log
- Pipeline pengiriman: build sekali, deploy per target, jalankan rangkaian konformansi pada masing-masing, canary dengan rollback otomatis
- Architecture decision record tertulis yang mencakup pilihan runtime, trade-off konsistensi, biaya pada trafik yang diharapkan, dan rencana keluar

Tujuan tambahan: consumer queue atau handler agregasi terjadwal yang berbagi kode aplikasi yang sama; deployment Lambda dari handler yang sama di belakang jembatan event; load test pada sepuluh kali trafik yang diharapkan beserta selisih biayanya.

## Kriteria Penilaian

- **Lab mingguan (40%)**: setiap lab dinilai berdasarkan apakah pengukurannya benar-benar dilakukan. Lab yang mengklaim peningkatan latensi tanpa angka sebelum/sesudah, atau cache tanpa hit rate, memperoleh paling banyak setengah nilai.
- **Architecture decision record (20%)**: menyatakan batasan yang mendorong pilihan, alternatif yang ditolak, mode kegagalan yang diterima, dan biaya pada volume trafik yang dinyatakan. Klaim harus dapat ditelusuri ke pengukuran dari kursus.
- **Proyek akhir (30%)**: kedua target lulus rangkaian konformansi; jalur tulis idempoten pada pengiriman duplikat; perilaku cache dan rate limit ditunjukkan di bawah konkurensi; rollback dijalankan minimal sekali; telemetri cukup untuk mendiagnosis kegagalan yang disuntikkan secara sengaja.
- **Partisipasi code review (10%)**: review mengidentifikasi bahaya portabilitas (impor khusus runtime, fan-out tanpa batas, state yang disimpan di memori) dengan konsekuensi konkret, bukan preferensi gaya.

Rentang penilaian: proyek yang lulus berjalan pada kedua target dan terdegradasi secara terprediksi pada batasnya; proyek yang kuat juga mengkuantifikasi di mana setiap target menang dan mendokumentasikan kondisi yang akan mengubah rekomendasi.

## Referensi

- Dokumentasi Elysia.js — integrasi Node.js dan adapter runtime: <https://elysiajs.com/integrations/node>
- Dokumentasi Elysia.js — integrasi Deno dan handler fetch standar web: <https://elysiajs.com/integrations/deno>
- Elysia.js quick start dan catatan kompatibilitas WinterTC: <https://elysiajs.com/quick-start>
- WinterTC (Web-interoperable Runtimes Community Group) API umum minimum: <https://wintertc.org/>
- Dokumentasi Cloudflare Workers — API runtime, batas, dan flag kompatibilitas: <https://developers.cloudflare.com/workers/>
- Cloudflare Durable Objects dan D1: <https://developers.cloudflare.com/durable-objects/> dan <https://developers.cloudflare.com/d1/>
- Cloudflare Hyperdrive untuk pooling basis data origin: <https://developers.cloudflare.com/hyperdrive/>
- Dokumentasi Deno Deploy: <https://docs.deno.com/deploy/>
- Dokumentasi AWS Lambda — image container, response streaming, dan provisioned concurrency: <https://docs.aws.amazon.com/lambda/>
- OpenTelemetry JavaScript SDK dan konvensi semantik: <https://opentelemetry.io/docs/languages/js/>
- MDN Web APIs — Fetch, Streams, dan Web Crypto: <https://developer.mozilla.org/en-US/docs/Web/API>
