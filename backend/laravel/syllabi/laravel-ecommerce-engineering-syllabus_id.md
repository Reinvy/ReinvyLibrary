---
title: "Silabus Teknik E-Commerce Laravel"
description: "Kurikulum lanjutan 12 minggu yang komprehensif bagi pengembang Laravel yang ingin berspesialisasi dalam membangun platform e-commerce kelas produksi, mencakup pemodelan katalog, state machine keranjang dan checkout, integrasi payment gateway, pemenuhan pesanan, pengendalian stok, penetapan harga dan promosi, API commerce headless, langganan, kepatuhan fraud dan PCI-DSS, serta performa skala commerce."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Teknik E-Commerce Laravel

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang bagi pengembang Laravel yang sudah percaya diri membangun aplikasi web dan ingin berspesialisasi pada domain yang paling banyak menggunakan Laravel di produksi: e-commerce. E-commerce bukan sekadar "CRUD dengan keranjang belanja" — ini adalah rekayasa sistem terdistribusi yang menyamar sebagai toko daring. State machine pesanan harus bertahan dari kegagalan jaringan, webhook pembayaran harus idempoten, reservasi stok harus bebas dari race condition saat checkout bersamaan, dan satu bug pada kode promo saja dapat membocorkan pendapatan.

Kurikulum ini memperlakukan commerce sebagai kumpulan subsistem yang disiplin, bukan sekadar daftar plugin. Anda akan memodelkan katalog produk dengan skema yang mendukung varian, merancang state machine keranjang dan checkout, mengintegrasikan payment gateway sungguhan (termasuk penyedia Indonesia seperti Midtrans dan Xendit di samping Stripe), membangun pipeline pesanan dan pemenuhan, mengimplementasikan buku besar stok yang aman dari race condition, merancang mesin promosi dan harga, membuka API storefront headless, menambahkan penagihan langganan, dan memperkuat seluruh platform terhadap fraud, penyalahgunaan, dan cakupan PCI-DSS. Setiap modul memadukan teori arsitektur dengan lab langsung yang membangun satu platform commerce berkelanjutan, yang berpuncak pada proyek akhir marketplace.

Di akhir kursus ini, peserta akan mampu bernalar tentang sistem yang menggerakkan uang dengan ketelitian yang sama seperti bernalar tentang kode: batas transaksional, kunci idempotensi, rekonsiliasi, dan pemulihan kegagalan akan menjadi kebiasaan, dan mereka akan mampu mempertahankan keputusan arsitektur commerce dengan analisis trade-off yang konkret.

## Kurikulum

### Modul 1: Pemodelan Domain E-Commerce (Minggu 1)

- **Fondasi katalog**
  - Produk, varian, dan SKU — model tiga tingkat yang kanonik
  - Kapan sebuah produk menjadi banyak SKU (ukuran, warna, kapasitas) dan cara memberi harga pada varian
  - Kategori, taksonomi, dan set atribut tanpa bayang-bayang anti-pattern EAV
- **Desain skema di Eloquent**
  - `products`, `product_variants`, `skus`, `categories`, dan relasi pivot
  - Atribut JSON vs tabel khusus vs EAV yang dibatasi untuk bidang yang dapat diperluas
  - Soft delete, status terbit/tidak terbit, dan data produk yang berversi
- **Uang sebagai nilai kelas satu**
  - Menyimpan jumlah sebagai bilangan bulat (unit minor) alih-alih float — jebakan mata uang
  - Pemodelan multi-mata uang dan penanganan nilai tukar
- **Lab Praktik**: Bangun skema katalog toko fesyen dengan varian dan kategori bertingkat; tulis migrasi, seeder, dan definisi factory

### Modul 2: State Machine Keranjang dan Checkout (Minggu 2)

- **Siklus hidup keranjang**
  - Keranjang tamu vs terautentikasi dan masalah penggabungan saat login
  - Kedaluwarsa keranjang, persistensi, dan corong keranjang yang ditinggalkan
  - Item keranjang, kuantitas, dan validasi terhadap harga serta stok terkini
- **Checkout sebagai state machine**
  - Status: `pending`, `collecting_address`, `payment_selected`, `processing`, `authorized`, `captured`, `failed`, `cancelled`
  - Transisi yang dijaga dan aturan tanggung jawab tunggal untuk setiap transisi
  - Idempotensi — mencegah submit ganda dan charge ganda dengan kunci idempotensi
- **Pesanan dan batas transaksional**
  - Kapan baris pesanan dibuat? Langkah atomik "reservasi + simpan pesanan"
  - Menyalin data produk ke dalam baris pesanan (harga, opsi, penjual) agar riwayat tidak pernah berubah
- **Lab Praktik**: Implementasikan state machine checkout sebagai model Eloquent dengan metode transisi eksplisit, plus endpoint `POST /checkout` yang idempoten

### Modul 3: Integrasi Payment Gateway (Minggu 3)

- **Abstraksi gateway**
  - Antarmuka `PaymentGateway` dengan penyedia di belakangnya — pola adapter dari silabus lanjutan yang diterapkan pada commerce
  - Midtrans (Snap, VA, QRIS, e-wallet), Xendit (invoice, VA, kartu), dan Stripe (Payment Intents, Checkout) sebagai adapter konkret
  - Operasi umum: buat pembayaran, capture, refund, void, cek status
- **Webhook dan settlement**
  - Webhook bertanda tangan, perlindungan replay, dan aturan "webhook adalah petunjuk, rekonsiliasi adalah kebenaran"
  - Memperbarui status pesanan dari event pembayaran dengan state machine dari Modul 2
  - Pencocokan settlement akhir hari: laporan gateway vs transaksi lokal
- **Refund dan partial capture**
  - State machine refund dan pergerakan uang di kedua arah
  - Menangani dispute/chargeback dengan pengumpulan bukti
- **Lab Praktik**: Integrasikan Midtrans Snap untuk checkout; implementasikan penanganan webhook bertanda tangan, alur refund, dan skrip rekonsiliasi harian

### Modul 4: Manajemen Pesanan dan Pemenuhan (Minggu 4)

- **Siklus hidup pesanan setelah pembayaran**
  - Status: `paid`, `packed`, `shipped`, `delivered`, `return_requested`, `returned`, `completed`
  - Memecah satu pesanan menjadi beberapa pengiriman (multi-gudang, ketersediaan parsial)
  - Integrasi pengiriman dan nomor pelacakan dengan penyedia logistik
- **Alur kerja pemenuhan**
  - Pipeline pemenuhan berbasis queue (queue Laravel dari tutorial yang diterapkan pada picking, packing, pelabelan)
  - Manifest pick/pack, label pengiriman, dan nomor AWB — konteks logistik Indonesia (JNE, J&T, SiCepat, Pos Indonesia)
  - Konfirmasi pengiriman dan jalur pembayaran COD (cash on delivery)
- **Retur dan RMA**
  - Alur kerja return merchandise authorization dan restocking
  - Refund-atas-retur dan keterkaitannya dengan state machine refund pembayaran
- **Lab Praktik**: Bangun pemecahan pengiriman, pipeline pemenuhan berbasis queue, dan alur retur/RMA dengan refund otomatis

### Modul 5: Inventaris dan Pengendalian Stok (Minggu 5)

- **Inventaris sebagai buku besar**
  - Stok reservasi vs komitmen vs tersedia — tiga penghitung, bukan satu
  - Pergerakan stok sebagai entri buku besar yang tidak dapat diubah (`in`, `out`, `reserve`, `release`, `adjust`)
  - Aturan pembukuan berpasangan: setiap pergerakan memiliki lawan, dan buku besar tidak pernah menulis ulang riwayat
- **Reservasi bebas race condition**
  - Pengurangan atomik dengan update bersyarat untuk mencegah overselling saat konkurensi
  - Row locking vs optimistic locking vs penghitung atomik Redis — kapan masing-masing tepat
  - Trade-off "stok hilang di keranjang" (reservasi saat add-to-cart vs reservasi saat checkout)
- **Pengisian ulang dan sinkronisasi**
  - Peringatan stok menipis dan saran purchase order
  - Sinkronisasi dengan gudang/ERP eksternal dan jebakan eventual consistency
- **Lab Praktik**: Implementasikan buku besar stok dengan update bersyarat atomik, lalu uji beban checkout bersamaan terhadap satu SKU dengan stok terbatas

### Modul 6: Penetapan Harga, Promosi, dan Kupon (Minggu 6)

- **Mesin harga**
  - Daftar harga, harga berjenjang/berdasarkan grup pelanggan, dan harga obral dengan jendela tanggal
  - Urutan penghitungan harga: harga dasar → diskon → kupon → pajak
- **Mesin promosi**
  - Aturan promosi sebagai data deklaratif (kondisi, aksi) alih-alih if-statements yang tersebar
  - Beli-X-dapat-Y, diskon persen/jumlah, gratis ongkir, ambang pesanan minimum
  - Kode kupon: sekali pakai, per-pelanggan, per-pesanan, kedaluwarsa, dan aturan stackability
- **Mencegah penyalahgunaan kupon**
  - Rate limiting percobaan penukaran kupon, deteksi anomali pada pola penggunaan
  - Kelas bug promo-stacking — memvalidasi bahwa total terhitung selalu cocok dengan aturan mesin
- **Lab Praktik**: Bangun mesin promosi deklaratif dengan kode kupon dan tulis tes bergaya property-based yang menghitung semua kombinasi penumpukan

### Modul 7: API Commerce Headless (Minggu 7)

- **Desain API storefront**
  - Endpoint daftar produk, pencarian, dan detail dengan cursor pagination (dari pola pagination di tutorial repo ini)
  - Strategi caching untuk pembacaan katalog — sisi baca-berat dari commerce
  - Versioning API dan kebijakan deprecation untuk storefront pihak ketiga
- **Pencarian melampaui WHERE**
  - Pencarian teks lengkap dengan Scout dan Meilisearch/OpenSearch untuk penemuan produk berfaset
  - Faset, filter, dan penyetelan relevansi; menjaga indeks pencarian tetap sinkron via queue
- **API admin dan permukaan internal**
  - Memisahkan permukaan API storefront, admin, dan partner dengan scope autentikasi berbeda
  - Rate limiting, API key, dan kuota per-tenant
- **Lab Praktik**: Buka API storefront publik dengan pembacaan produk ter-cache dan pencarian berfaset, plus API admin ber-scope untuk manajemen katalog

### Modul 8: Langganan dan Penagihan Berulang (Minggu 8)

- **Desain model langganan**
  - Paket, fitur, dan pemeriksaan entitlement — bergerak dari "apa yang pengguna bayar" ke "apa yang dapat dilakukan pengguna"
  - Periode uji coba, upgrade/downgrade, dan matematika prorasi
  - Tanggal penagihan, tanggal anchor, dan kasus tepi bulan 30/31 hari
- **Mekanika pembayaran berulang**
  - Langganan gateway vs mesin penagihan internal vs hibrida (sumber kebenaran internal + jadwal gateway)
  - Siklus dunning: jadwal percobaan ulang, email pembayaran gagal, dan masa tenggang
  - Pembuatan invoice dan invoice PDF
- **Pembatalan dan churn**
  - Semantik batalkan-di-akhir-periode vs pembatalan langsung
  - Kebijakan refund-atas-pembatalan dan state machine untuk setiap jalur
- **Lab Praktik**: Implementasikan paket dengan upgrade berprorasi dan siklus dunning yang mencoba ulang invoice gagal dengan urgensi meningkat

### Modul 9: Keamanan dan Kepatuhan Commerce (Minggu 9)

- **Pengurangan cakupan PCI-DSS**
  - Mengapa Anda tidak boleh menyentuh nomor kartu mentah: checkout yang dihosting gateway (Snap/Checkout), tokenisasi, dan SAQ-A
  - Menyimpan token, bukan PAN; daftar data terlarang
- **Deteksi fraud dan penyalahgunaan**
  - Velocity check, sinyal geolokasi/skor, dan antrean review manual
  - Pemalsuan webhook, penyalahgunaan promo, dan pertahanan account takeover pada endpoint checkout
  - Menerapkan OWASP Top 10 dari silabus lanjutan secara khusus pada endpoint yang menggerakkan uang
- **Perlindungan data**
  - Pertimbangan UU PDP Indonesia dan GDPR untuk data pelanggan
  - Anonimisasi riwayat pesanan saat penghapusan akun sambil mempertahankan catatan keuangan untuk pajak
- **Lab Praktik**: Buat checkout yang patuh SAQ-A dengan cakupan PCI-DSS minimal, lalu serang checkout Anda sendiri dengan rangkaian tes pemalsuan, replay, dan velocity

### Modul 10: Performa dan Skalabilitas untuk Commerce (Minggu 10)

- **Optimasi jalur baca**
  - Lapisan caching katalog (Redis dari silabus lanjutan) dan invalidasi cache saat produk diperbarui
  - Halaman storefront yang di-cache CDN dan trade-off harga basi
  - Optimasi query untuk daftar produk dengan filter — composite index dari modul performa Eloquent
- **Keandalan jalur tulis**
  - Pemrosesan pesanan berbasis queue dengan Horizon dan isolasi kegagalan per pipeline
  - Pola outbox untuk penerbitan event yang andal dari transisi status pesanan
  - Backpressure dan load shedding saat flash sale
- **Arsitektur flash sale**
  - Pre-warming cache, throttling permintaan, dan kontrol penerimaan berbasis queue
  - Menjaga stok tetap atomik di bawah lonjakan traffic 10x
- **Lab Praktik**: Uji beban jalur checkout flash sale, profil hambatan, dan terapkan perbaikan caching-plus-queue hingga throughput mencapai target

### Modul 11: Analitik, Personalisasi, dan Pelaporan (Minggu 11)

- **Pelacakan event**
  - Taksonomi event commerce: `product_viewed`, `added_to_cart`, `checkout_started`, `order_placed`
  - Pelacakan sisi server dengan queue dan tabel event-lake; atribusi UTM dan sesi
- **Personalisasi**
  - Rekomendasi produk: berbasis aturan (dibeli-bersamaan), collaborative filtering, dan pendekatan berbasis embedding (vector search)
  - A/B testing eksperimen checkout dan harga tanpa membocorkan pendapatan
- **Pelaporan merchant**
  - Dashboard penjualan, GMV, tingkat refund, dan konversi
  - Tabel pelaporan agregat (rollup terwujud) alih-alih query agregat langsung pada tabel pesanan
- **Lab Praktik**: Instrumentasi platform dengan pipeline event commerce, bangun modul rekomendasi, dan kirim laporan rollup penjualan harian

### Modul 12: Proyek Akhir — Marketplace Multi-Vendor (Minggu 12)

- **Spesifikasi proyek akhir**
  - Perluas platform kursus menjadi marketplace multi-vendor: onboarding vendor, katalog dan settlement per-vendor, serta aturan komisi platform
  - Mesin payout vendor dengan ambang saldo minimum dan penjadwalan disbursement
  - Review fraud tingkat marketplace dan resolusi sengketa antara pembeli dan vendor
- **Persyaratan integrasi**
  - Setiap subsistem dari Modul 1–11 harus muncul: katalog dengan varian, status checkout, integrasi gateway, pemenuhan, buku besar stok, promosi, API headless, langganan paket penjual, kontrol keamanan, kerja performa, dan analitik
- **Format penyerahan**
  - Proyek akhir berupa marketplace yang dideploy, diuji beban, dengan dokumentasi dan pembelaan arsitektur tertulis

## Proyek Akhir

Peserta membangun dan meluncurkan platform marketplace multi-vendor. Proyek harus menangani seluruh lingkaran commerce: vendor mengelola katalog ber-varian, pembeli berbelanja melalui API storefront headless, checkout bertahan melalui state machine yang dijaga, pembayaran mengalir melalui sandbox gateway sungguhan (mode uji Midtrans atau Stripe) dengan webhook bertanda tangan dan rekonsiliasi harian, reservasi stok tetap bebas race condition di bawah beban bersamaan, promosi dan kode kupon diterapkan melalui mesin deklaratif, paket langganan penjual ditagih melalui siklus dunning, dan dashboard merchant melaporkan penjualan serta refund dari tabel rollup.

Proyek harus dideploy ke lingkungan menyerupai produksi, diuji beban selama simulasi flash sale, dan disertai dokumen arsitektur tertulis yang mempertahankan setiap state machine, batas transaksional, dan keputusan idempotensi. Demonstrasi singkat yang direkam dan menelusuri pembelian lengkap — termasuk notifikasi pembayaran berbasis webhook dan refund — wajib disertakan.

## Kriteria Penilaian

- **Tugas**: Lab praktik mingguan dinilai berdasarkan disiplin skema (tanpa uang float, semantik buku besar yang benar), kebenaran state machine (transisi yang dijaga, endpoint idempoten), dan cakupan tes untuk jalur kegagalan (replay webhook, oversell, penumpukan kupon, submit ganda). Lab harus lolos rangkaian tes tersembunyi dari pengajar sebelum lanjut.
- **Proyek Akhir**: Dinilai berdasarkan kebenaran ujung-ke-ujung alur uang (pesanan → pembayaran → pemenuhan → settlement), keamanan race condition di bawah uji beban flash sale, minimalisasi cakupan PCI-DSS, kelengkapan rekonsiliasi, organisasi kode, dan kekuatan tulisan pembelaan arsitektur. Marketplace harus bertahan dari daftar periksa adversarial pengajar: webhook palsu, notifikasi yang di-replay, percobaan oversell bersamaan, dan penyalahgunaan kupon bertumpuk.
- **Tinjauan Sejawat**: Setiap peserta meninjau proyek akhir satu rekan terhadap daftar periksa adversarial yang sama dan mengajukan temuan terstruktur, yang dinilai akurasinya.

## Referensi

- [Dokumentasi resmi Laravel](https://laravel.com/docs) — referensi Eloquent, queue, cashier, dan validasi
- [Laravel Cashier (Stripe dan Paddle)](https://laravel.com/docs/cashier) — pola penagihan langganan
- [Dokumentasi Midtrans](https://docs.midtrans.com/) — Snap, VA, QRIS, dan penandatanganan webhook untuk pembayaran Indonesia
- [Dokumentasi Xendit](https://developers.xendit.co/) — invoice, kartu, dan kanal pembayaran
- [Stripe Payment Intents](https://docs.stripe.com/payments/payment-intents) — state machine pembayaran yang kanonik
- [PCI Security Standards Council](https://www.pcisecuritystandards.org/) — panduan SAQ-A dan pengurangan cakupan
- [Dokumentasi Scout](https://laravel.com/docs/scout) — pencarian produk teks lengkap dan berfaset
- [Laravel Horizon](https://laravel.com/docs/horizon) — pemantauan queue dan isolasi kegagalan
- [UU PDP (Undang-Undang Pelindungan Data Pribadi Indonesia)](https://pdp.go.id/) — persyaratan penanganan data pelanggan
