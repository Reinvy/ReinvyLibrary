---
title: "Silabus Keamanan dan Kepatuhan MongoDB"
description: "Kurikulum lanjutan 12 minggu untuk DBA, platform engineer, dan arsitek keamanan yang mencakup keamanan serta kepatuhan regulasi MongoDB — pemodelan ancaman, internal autentikasi dan otorisasi, pengerasan transport dan jaringan, enkripsi at rest dan in use dengan CSFLE serta Queryable Encryption, audit dan telemetri keamanan, manajemen kunci, tata kelola data menurut GDPR, HIPAA, PCI DSS dan SOC 2, isolasi multi-tenant, respons insiden, dan otomasi bukti kepatuhan."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Keamanan dan Kepatuhan MongoDB

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk database administrator, platform engineer, arsitek keamanan, dan pemilik kepatuhan yang sudah mengoperasikan MongoDB di produksi dan kini harus mempertahankannya sekaligus membuktikan pertahanan itu kepada auditor. Jika silabus MongoDB lanjutan umum hanya menyediakan satu modul tentang arsitektur keamanan, kursus ini memperlakukan keamanan dan kepatuhan sebagai keseluruhan disiplin: bagaimana MongoDB benar-benar menegakkan identitas, bagaimana keputusan otorisasi dievaluasi pada tingkat privilege, bagaimana data dilindungi saat transit dan saat disimpan, bagaimana kunci enkripsi dikelola, bagaimana peristiwa keamanan berubah menjadi bukti yang dapat diaudit, dan bagaimana platform basis data dipetakan ke kerangka regulasi yang wajib dipenuhi organisasi.

Kurikulum ini dibangun di atas kenyataan bahwa kegagalan keamanan MongoDB jarang berupa eksploitasi eksotis. Penyebabnya adalah deployment yang mengaktifkan autentikasi secara asal, user aplikasi dengan privilege berlebih, kredensial bersama di variabel environment, backup tanpa enkripsi, akses administratif tanpa audit, dan koleksi berisi data pribadi yang tidak pernah diklasifikasikan. Setiap modul memadukan mekanisme — SCRAM, x.509, LDAP, Kerberos, RBAC, TLS, KMIP, CSFLE, Queryable Encryption, filter audit — dengan tujuan kontrol yang dipenuhinya dan bukti yang diharapkan auditor. Laboratorium dijalankan pada deployment nyata: replica set dengan autentikasi internal, proyek Atlas dengan database user dan network peering, sesi `mongosh` yang menguji batas privilege, serta pipeline logging yang mengubah entri audit menjadi telemetri yang dapat di-query.

Kepatuhan diperlakukan sebagai keluaran rekayasa, bukan sebagai lampiran. Peserta mengerjakan hak subjek data GDPR pada koleksi nyata, penentuan cakupan data pemegang kartu PCI DSS, persyaratan kontrol akses dan audit HIPAA, serta pengumpulan bukti kontrol SOC 2, lalu mengotomasi pengumpulan bukti tersebut agar tetap bertahan pada rilis berikutnya. Kursus ditutup dengan proyek akhir di mana peserta mengeraskan deployment MongoDB yang sengaja dibuat lemah secara menyeluruh, mendokumentasikan setiap kontrol beserta pemetaan ke kerangka regulasi, dan mempertahankan desainnya dalam sesi review yang mensimulasikan audit eksternal.

Pada akhir kursus, peserta mampu memodelkan ancaman terhadap deployment MongoDB, merancang strategi autentikasi lintas penyedia identitas internal dan eksternal, membangun hierarki role dengan privilege minimum hingga tingkat koleksi dan field, mengeraskan transport serta paparan jaringan, menerapkan enkripsi at rest dan enkripsi tingkat field dengan kunci yang dikelola secara tepat, mengoperasikan pipeline audit yang menghasilkan bukti yang dapat dipertahankan, memetakan kontrol MongoDB ke kerangka regulasi umum, mengisolasi tenant secara aman pada cluster bersama, menjalankan respons insiden keamanan basis data, dan mengotomasi verifikasi kepatuhan berkelanjutan.

## Kurikulum

### Modul 1: Fondasi Keamanan dan Pemodelan Ancaman MongoDB (Minggu 1)

- **Permukaan serangan MongoDB**
  - Deployment default dan kegagalan akses tanpa autentikasi
  - Port terbuka, konfigurasi bind IP, dan instance yang dapat dijangkau internet
  - Risiko injeksi tingkat aplikasi: injeksi operator melalui objek query tak tepercaya
  - Paparan rantai pasok: driver, konektor BI, dan agen Ops Manager

- **Pemodelan ancaman pada lapisan data**
  - STRIDE diterapkan pada basis data dokumen: spoofing, tampering, repudiation, disclosure, denial of service, elevation
  - Diagram aliran data yang mencakup anggota replica set, arbiter, dan target backup
  - Batas kepercayaan: aplikasi ke driver, driver ke mongod, mongod ke server kunci
  - Memprioritaskan ancaman berdasarkan klasifikasi data, bukan berdasarkan kebaruan

- **Klasifikasi data sebagai prasyarat**
  - Mengidentifikasi PII, PHI, dan data pemegang kartu di dalam dokumen yang fleksibel
  - Inventaris tingkat field: dokumen bersarang, array of record, riwayat tertanam
  - Memberi tag pada koleksi dan field untuk penegakan kebijakan berikutnya
  - Pergeseran klasifikasi saat skema berkembang tanpa tata kelola

- **Baseline keamanan dan checklist pengerasan**
  - Otorisasi aktif, tanpa localhost exception di produksi
  - Autentikasi internal antar anggota replica set dan shard
  - Jalur akses administratif dibatasi dan tercatat
  - Kemutakhiran versi: rilis tanpa dukungan sebagai kegagalan kontrol

### Modul 2: Arsitektur Autentikasi (Minggu 2)

- **SCRAM dan autentikasi internal**
  - Penyimpanan kredensial SCRAM-SHA-256 dan salt per user
  - Autentikasi keyfile untuk anggota cluster beserta batas operasionalnya
  - Autentikasi internal x.509 dengan CA cluster khusus
  - Rotasi kredensial internal tanpa downtime cluster

- **Integrasi identitas eksternal**
  - Autentikasi dan otorisasi LDAP: `userToDNMapping`, resolusi grup
  - Integrasi Kerberos dan Active Directory untuk lingkungan enterprise
  - Pola OIDC dan workload identity untuk Atlas dan stack platform modern
  - Memilih antara identitas eksternal dan user native basis data

- **Autentikasi sertifikat klien**
  - Sertifikat klien x.509 dan pemetaan subjek ke user
  - Siklus hidup sertifikat: penerbitan, perpanjangan, pencabutan, dan perilaku CRL
  - Mutual TLS sebagai kontrol autentikasi sekaligus transport
  - Kesalahan umum: `allowConnectionsWithoutCertificates` di produksi

- **Manajemen siklus hidup kredensial**
  - User per aplikasi alih-alih akun administratif bersama
  - Otomasi rotasi password dan propagasi connection string
  - Menghilangkan kredensial dari source control, image, dan log
  - Akun break-glass: keberadaan, kustodi, dan review penggunaannya

### Modul 3: Otorisasi dan Privilege Minimum (Minggu 3)

- **Cara MongoDB mengevaluasi privilege**
  - Action dan resource: dua bagian dari setiap privilege
  - Cakupan database dan koleksi, termasuk risiko `anyResource`
  - Gabungan privilege dari role yang diwarisi, dan mengapa gabungan itulah grant sebenarnya
  - Semantik deny dan tidak adanya aturan deny eksplisit

- **Role bawaan dan bahayanya**
  - `readWriteAnyDatabase`, `dbAdminAnyDatabase`, `root`, dan `clusterAdmin`
  - Kapan `read` cukup dan kapan `readWrite` menjadi temuan kepatuhan
  - `clusterMonitor` versus `clusterManager` versus `hostManager`
  - Mengaudit pemberian role: menemukan role yang tidak lagi diingat siapa pun

- **Role kustom dan kontrol tingkat field**
  - Komposisi role bawaan dan kustom per layanan
  - Membatasi penulisan ke field tertentu dengan dokumen resource bergaya projection
  - Memberi `find` pada koleksi sambil menahan field tertentu
  - Menguji pembatasan tingkat field dari sisi klien, bukan dari mongosh sebagai admin

- **Tata kelola otorisasi**
  - Pola role per layanan dan radius dampak kredensial yang disusupi
  - Review akses berkala: ekspor grant dan rekonsiliasi dengan pemiliknya
  - Pemisahan tugas antara identitas deploy, operasional, dan audit
  - Deteksi pertumbuhan privilege setelah hotfix yang dipicu insiden

### Modul 4: Pengerasan Jaringan dan Transport (Minggu 4)

- **Konfigurasi dan penegakan TLS**
  - Mengaktifkan TLS dengan CA privat dan verifikasi hostname yang benar
  - Memaksa TLS serta menonaktifkan versi protokol dan cipher suite yang lemah
  - Mutual TLS untuk koneksi klien dan biaya operasionalnya
  - Rotasi sertifikat tanpa memutus lalu lintas replikasi

- **Kontrol paparan jaringan**
  - `bindIp`, pemilihan port, dan mengapa security through obscurity bukan kontrol
  - Jaringan privat: VPC peering, PrivateLink, dan endpoint cluster khusus
  - Daftar akses IP dan batasnya sebagai mekanisme autentikasi
  - Pola bastion dan jump host untuk akses administratif

- **Segmentasi dan zero trust**
  - Menempatkan anggota replica set pada subnet terbatas
  - Jalur jaringan terpisah untuk aplikasi, replikasi, dan lalu lintas backup
  - Kontrol egress untuk replikasi lintas region
  - Aturan firewall sebagai kode dengan deteksi drift

- **Ketahanan terhadap denial of service dan penyalahgunaan**
  - Serangan bentuk query: regex tak terbatas, nesting dalam, agregasi mahal
  - Batas resource dan operation timeout sebagai kontrol protektif
  - Penanganan badai koneksi dan penentuan ukuran pool
  - Pembatasan laju di batas aplikasi, bukan di basis data

### Modul 5: Enkripsi At Rest dan Manajemen Kunci (Minggu 5)

- **Enkripsi tingkat penyimpanan**
  - Enkripsi at rest WiredTiger dan model penyedia kunci KMIP
  - Master key versus data key dan perbedaan semantik rotasinya
  - Mengenkripsi backup, snapshot, dan dump hasil ekspor
  - Enkripsi volume penyedia cloud sebagai pelengkap, bukan pengganti

- **Arsitektur manajemen kunci**
  - Server KMIP, KMS cloud, dan trade-off keyfile lokal
  - Kustodi kunci: siapa yang dapat mendekripsi, dalam kondisi apa, dengan logging apa
  - Runbook rotasi kunci dan verifikasi bahwa kunci lama benar-benar dihentikan
  - Pemulihan bencana saat server kunci tidak tersedia

- **Rasional enkripsi tingkat field**
  - Mengapa enkripsi penyimpanan tidak melindungi dari user aplikasi berprivilege berlebih
  - Memilih antara client-side field level encryption dan Queryable Encryption
  - Enkripsi deterministik versus acak dan konsekuensinya pada query
  - Pengindeksan field terenkripsi: tipe query yang didukung dan batasannya

- **Tata kelola enkripsi**
  - Mendokumentasikan hierarki data key untuk auditor
  - Membuktikan enkripsi ditegakkan, bukan hanya dikonfigurasi
  - Menguji bahwa plaintext tidak pernah mencapai log, backup, atau telemetri
  - Kelincahan kriptografis: merencanakan migrasi algoritma dan penyedia

### Modul 6: Client-Side Field Level Encryption dan Queryable Encryption (Minggu 6)

- **Implementasi CSFLE**
  - Enkripsi eksplisit dengan driver: jalur encrypt, decrypt, dan bypass
  - Enkripsi otomatis dengan skema JSON dan encrypted fields map
  - Koleksi key vault, pembuatan data key, dan key alt name
  - Mendukung query kesetaraan pada field terenkripsi deterministik

- **Queryable Encryption**
  - Encrypted index dan tipe query yang didukungnya
  - Enkripsi indeks di sisi klien bersama field dokumen
  - Koleksi metadata dan kebutuhan kontrol aksesnya
  - Jalur migrasi antara CSFLE dan Queryable Encryption

- **Integrasi aplikasi**
  - Konfigurasi driver, kredensial penyedia kunci, dan cakupan IAM
  - Menangani enkripsi pada background job, ETL, dan ekspor analitik
  - Perilaku pencarian dan agregasi pada field terenkripsi
  - Mode kegagalan: kunci hilang, ketidakcocokan skema, enkripsi parsial

- **Verifikasi dan audit**
  - Membuktikan dokumen berbentuk ciphertext saat disimpan melalui inspeksi penyimpanan langsung
  - Menguji batas privilege agar administrator tidak dapat membaca plaintext
  - Logging akses kunci sebagai bukti kepatuhan
  - Pengukuran performa operasi pada field terenkripsi

### Modul 7: Audit dan Telemetri Keamanan (Minggu 7)

- **Subsistem audit MongoDB**
  - Mengaktifkan audit saat startup dan kebutuhan akan sifat tidak dapat diubah
  - Filter audit: membatasi pada autentikasi, DDL, dan aksi berprivilege
  - Opsi tujuan log dan karakteristik ketahanan terhadap manipulasi
  - Biaya performa dan penyimpanan dari audit yang menyeluruh

- **Apa yang harus diaudit dan mengapa**
  - Keberhasilan dan kegagalan autentikasi, termasuk alamat sumber
  - Manajemen role dan user: `createUser`, `grantRolesToUser`, `dropUser`
  - Perubahan skema dan indeks sebagai bukti drift konfigurasi
  - Operasi ekspor data dan pembacaan massal sebagai sinyal eksfiltrasi

- **Mengubah log audit menjadi telemetri**
  - Mengirim keluaran audit ke SIEM atau platform log tanpa kehilangan data
  - Mengurai dan menormalisasi dokumen audit menjadi field yang dapat dicari
  - Aturan alert untuk login impossible travel dan eskalasi privilege
  - Jendela retensi yang selaras dengan minimum regulasi

- **Rekayasa deteksi**
  - Membuat baseline bentuk query dan mendeteksi akses koleksi yang anomali
  - Mendeteksi eksfiltrasi slow-and-low melalui pembacaan berhalaman
  - Menghubungkan identitas aplikasi dengan peristiwa deployment
  - Pengelolaan false positive dan pengendalian kelelahan alert

### Modul 8: Tata Kelola Data dan Kerangka Regulasi (Minggu 8)

- **Memetakan kontrol MongoDB ke kerangka regulasi**
  - GDPR: dasar hukum, minimisasi data, pembatasan penyimpanan, hak subjek data
  - HIPAA: kontrol akses, kontrol audit, integritas, keamanan transmisi
  - PCI DSS: penentuan cakupan lingkungan data pemegang kartu dan persyaratan manajemen kunci
  - SOC 2: bukti kriteria keamanan, ketersediaan, dan kerahasiaan

- **Menerapkan hak subjek data pada koleksi nyata**
  - Penemuan: menemukan seluruh dokumen yang merujuk satu subjek data
  - Penghapusan dengan integritas referensial dan jejak audit yang tetap utuh
  - Ekspor dalam format portabel tanpa membocorkan tenant lain
  - Penegakan retensi melalui indeks TTL dan lapisan arsip

- **Residensi data dan transfer lintas negara**
  - Cluster yang dipin ke region dan batasan topologi replikasi
  - Lokasi backup sebagai permukaan residensi yang sering terlewat
  - Salinan analitik dan paparan yurisdiksinya
  - Mendokumentasikan mekanisme transfer untuk auditor

- **Kebijakan sebagai kode**
  - Menyatakan aturan retensi, klasifikasi, dan residensi dalam version control
  - Pemeriksaan otomatis yang menggagalkan rilis saat terjadi pelanggaran kebijakan
  - Kontrol perubahan untuk modifikasi skema dan indeks pada data teregulasi
  - Metrik tata kelola yang dilaporkan bersama metrik rekayasa

### Modul 9: Multi-Tenancy dan Isolasi (Minggu 9)

- **Model tenancy di MongoDB**
  - Database per tenant, koleksi per tenant, dan koleksi bersama dengan tenant key
  - Biaya, kompleksitas operasional, dan kekuatan isolasi tiap model
  - Risiko noisy neighbour pada koleksi bersama dan cara membatasinya
  - Memilih model berdasarkan persyaratan kepatuhan, bukan preferensi

- **Menegakkan batas tenant**
  - Filter tenant pada tingkat query dan biaya dari satu predikat yang terlewat
  - Kontrol akses tingkat field dan view per tenant
  - Mencegah kebocoran lintas tenant pada pipeline agregasi dan `$lookup`
  - Menguji isolasi secara adversarial, bukan hanya fungsional

- **Isolasi administratif**
  - Siapa yang dapat membaca lintas tenant, dan apakah itu dapat diterima regulator
  - Enkripsi per tenant dengan data key yang berbeda
  - Jejak audit yang mengaitkan aksi ke tenant sekaligus ke user
  - Offboarding tenant secara tuntas: data, kunci, backup, dan log

- **Manajemen risiko cluster bersama**
  - Kuota resource dan anggaran koneksi per tenant
  - Proliferasi indeks dan dampak performa lintas tenant
  - Evolusi skema pada koleksi bersama tanpa merusak tenant lain
  - Penanganan insiden saat satu tenant disusupi

### Modul 10: Operasi Aman dan Respons Insiden (Minggu 10)

- **Higiene keamanan operasional**
  - Kadensi patch dan upgrade MongoDB beserta driver-nya
  - Manajemen perubahan untuk konfigurasi yang relevan secara keamanan
  - Enkripsi backup, pengujian restore, dan akses terhadap kemampuan restore
  - Identitas CI/CD berprivilege minimum yang men-deploy tanpa mengelola cluster

- **Deteksi dan triase**
  - Menyusun runbook keamanan basis data dengan definisi severity
  - Preservasi bukti: snapshot, ekstrak audit, dan integritas log
  - Membedakan bug aplikasi dari intrusi saat triase
  - Jalur komunikasi antara tim basis data, keamanan, dan legal

- **Kontainmen dan pemulihan**
  - Pencabutan kredensial dan penghentian sesi di bawah tekanan
  - Mengisolasi anggota replica set yang disusupi tanpa kehilangan data
  - Restore dari backup terenkripsi sambil menjaga kesinambungan audit
  - Rotasi kunci pasca-insiden saat paparan tidak dapat dikesampingkan

- **Rekayasa pasca-insiden**
  - Analisis akar masalah yang berfokus pada kontrol yang gagal
  - Mengubah temuan menjadi pemeriksaan regresi otomatis
  - Tenggat notifikasi regulasi dan bukti yang dibutuhkannya
  - Latihan tabletop terhadap skenario serangan MongoDB yang realistis

### Modul 11: Otomasi Kepatuhan Berkelanjutan (Minggu 11)

- **Infrastruktur dan konfigurasi sebagai kode**
  - Menyatakan pengaturan keamanan dalam Terraform, Atlas API, atau operator Kubernetes
  - Mencegah drift dengan rekonsiliasi dan audit berkala
  - Persyaratan peer review untuk perubahan yang relevan secara keamanan
  - Kesetaraan environment: dev tidak boleh menjadi satu-satunya environment yang dikeraskan

- **Verifikasi kontrol secara otomatis**
  - Pemeriksaan berskrip untuk status otorisasi, TLS, audit, dan enkripsi
  - Asersi berkelanjutan bahwa tidak ada user memegang `root` di luar break-glass
  - Verifikasi enkripsi backup secara terjadwal
  - Mengubah setiap kontrol menjadi tes yang gagal dengan berisik

- **Pipeline pengumpulan bukti**
  - Ekspor terjadwal inventaris role, ringkasan audit, dan catatan rotasi kunci
  - Penyimpanan bukti audit yang bertanda waktu dan tidak dapat diubah
  - Memetakan artefak bukti ke identifier kontrol dalam kerangka regulasi
  - Paket siap-auditor yang dihasilkan atas permintaan, bukan dirakit saat terdesak

- **Metrik dan pelaporan**
  - Dashboard postur keamanan: cakupan kontrol, temuan terbuka, mean time to remediate
  - Usia privilege dan kredensial sebagai indikator awal
  - Pelaporan yang dapat ditindaklanjuti tim rekayasa
  - Kadensi review bersama pemangku kepentingan kepatuhan dan risiko

### Modul 12: Proyek Akhir — Pengerasan dan Audit Platform MongoDB (Minggu 12)

- **Cakupan proyek**
  - Mengambil deployment MongoDB yang sengaja dibuat lemah dan membawanya ke baseline yang dapat diaudit
  - Memilih domain: layanan rekam medis, platform pembayaran, atau SaaS multi-tenant
  - Luaran: deployment terkeraskan, matriks kontrol, pipeline bukti, dan pertahanan audit

- **Luaran wajib**
  - Model ancaman dengan klasifikasi data dan risiko yang diprioritaskan
  - Desain autentikasi yang mencakup auth internal dan satu penyedia identitas eksternal
  - Set role privilege minimum per layanan, diverifikasi dari sisi klien
  - Penegakan TLS dan dokumentasi paparan jaringan
  - Enkripsi at rest plus enkripsi tingkat field untuk field terklasifikasi
  - Konfigurasi audit dengan filter, pengiriman log, dan minimal tiga aturan deteksi
  - Matriks kontrol yang memetakan setiap kontrol ke GDPR, HIPAA, PCI DSS, atau SOC 2
  - Pengumpulan bukti otomatis yang meregenerasi paket audit atas permintaan

- **Fokus evaluasi**
  - Apakah batas privilege bertahan terhadap pengujian adversarial oleh rekan sejawat
  - Ketepatan pemetaan kontrol ke kerangka regulasi beserta buktinya
  - Realisme operasional: rotasi, pemulihan, dan runbook insiden yang benar-benar berjalan
  - Tidak adanya kebocoran plaintext ke log, backup, dan telemetri
  - Kualitas pertahanan audit saat diuji dengan pertanyaan

## Proyek Akhir

Proyek akhir berupa pengerasan keamanan dan kepatuhan menyeluruh pada platform MongoDB, dikerjakan pada tiga minggu terakhir kursus. Peserta menerima deployment lemah — autentikasi nonaktif, kredensial administratif bersama, backup tanpa enkripsi, tanpa audit, dan data pribadi yang tidak terbedakan dari log aplikasi — dan harus membawanya ke baseline yang dapat dipertahankan tanpa mematahkan aplikasi yang bergantung padanya. Pekerjaan mencakup model ancaman dan klasifikasi data tertulis, redesain autentikasi dan otorisasi dengan role privilege minimum per layanan, pengerasan transport dan jaringan, enkripsi at rest dengan kunci terkelola plus enkripsi tingkat field untuk field terklasifikasi, pipeline audit dengan aturan deteksi, serta matriks kontrol yang memetakan setiap langkah ke kerangka regulasi beserta bukti yang akan diminta auditor. Peserta kemudian mempertahankan desain dalam sesi review di mana rekan sejawat berperan sebagai auditor, dan harus menunjukkan bahwa pipeline bukti mereka meregenerasi paket audit lengkap dari awal.

## Kriteria Penilaian

- **Tugas**: Sebelas laboratorium praktik (Minggu 1-11) dinilai berdasarkan ketepatan, verifikasi adversarial atas kontrol, dan apakah kontrol tersebut otomatis alih-alih hanya terdokumentasi. Kuis mingguan mencakup evaluasi privilege, semantik enkripsi, dan pemetaan kerangka regulasi.
- **Proyek Akhir**: Dinilai berdasarkan kelengkapan matriks kontrol, ketahanan batas privilege terhadap serangan rekan sejawat, ketepatan enkripsi dan tata kelola kunci, kualitas bukti audit, dan kejelasan pertahanan audit.
- **Partisipasi**: Review adversarial atas deployment terkeraskan milik satu peserta lain, dengan temuan diklasifikasikan menurut severity dan dipetakan ke kontrol yang gagal.

## Referensi

- MongoDB Documentation: Security — https://www.mongodb.com/docs/manual/security/
- MongoDB Documentation: Authentication — https://www.mongodb.com/docs/manual/core/authentication/
- MongoDB Documentation: Role-Based Access Control — https://www.mongodb.com/docs/manual/core/authorization/
- MongoDB Documentation: TLS/SSL Configuration — https://www.mongodb.com/docs/manual/tutorial/configure-ssl/
- MongoDB Documentation: Encryption at Rest — https://www.mongodb.com/docs/manual/core/security-encryption-at-rest/
- MongoDB Documentation: Client-Side Field Level Encryption — https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB Documentation: Queryable Encryption — https://www.mongodb.com/docs/manual/core/queryable-encryption/
- MongoDB Documentation: Auditing — https://www.mongodb.com/docs/manual/core/auditing/
- MongoDB Documentation: Multi-Tenancy Best Practices — https://www.mongodb.com/docs/atlas/build-multi-tenant-application/
- OWASP: NoSQL Security and Injection Prevention — https://cheatsheetseries.owasp.org/cheatsheets/NoSQL_Security_Cheat_Sheet.html
- NIST SP 800-53 Security and Privacy Controls — https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- MongoDB University: Security Courses — https://learn.mongodb.com/
