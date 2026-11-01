---
title: "Silabus Rekayasa Rilis GitHub Actions"
description: "Kurikulum delapan modul untuk insinyur yang sudah melakukan deploy dengan GitHub Actions dan kini perlu memiliki proses rilis: artefak immutable yang dibangun sekali lalu dipromosikan, versioning dan changelog otomatis, environment dengan gate, progressive delivery dengan analisis otomatis, rollback yang dilatih, serta metrik rilis yang bisa dipertanggungjawabkan saat postmortem."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Rilis GitHub Actions

## Ringkasan

Sebagian besar tim sebenarnya tidak punya masalah deployment. Yang mereka punya adalah masalah rilis. Sebuah workflow bisa menaruh kode ke server dalam sembilan puluh detik, tetapi tidak ada yang bisa menjawab tiga pertanyaan dasar: artefak persis mana yang sedang berjalan di produksi, apa yang berubah sejak rilis terakhir yang diketahui baik, dan bagaimana membatalkannya pukul dua pagi tanpa harus membangun ulang dari branch yang sudah bergerak jauh.

Silabus ini memperlakukan rilis sebagai unit kerja rekayasa, bukan sebagai langkah deploy di ujung pipeline. Materi ini ditujukan untuk insinyur yang sudah menulis workflow GitHub Actions yang berjalan dan sekarang membutuhkan mesin di sekelilingnya: identitas artefak, versioning, kontrol perubahan, paparan bertahap, rollback, dan pengukuran. Semuanya diajarkan lewat GitHub Actions karena di situlah orkestrasinya berada, tetapi konsepnya berlaku untuk sistem CI apa pun.

Kursus berjalan dalam delapan modul yang mengikuti perjalanan sebuah rilis: mendefinisikan modelnya, memberi versi, memberi identitas pada artefak, memberi gate pada perpindahannya, mengeksposnya secara bertahap, belajar menariknya kembali, memisahkan pengiriman dari paparan, lalu mengukur apakah semua itu bekerja. Setiap modul memasangkan satu kuliah dengan satu lab, dan setiap lab meninggalkan komponen yang dipakai lagi di proyek akhir. Tidak ada latihan yang dibuang percuma.

Durasi sekitar delapan minggu dengan delapan sampai sepuluh jam per minggu, atau dua minggu intensif penuh waktu. Peserta diharapkan sudah nyaman dengan sintaks workflow, dependensi job, dan setidaknya satu container registry atau package feed sebelum mulai.

## Kurikulum

### Modul 1: Model Rilis dan Topologi Pipeline

- **Deploy bukan rilis**
  - Deploy sebagai peristiwa teknis, rilis sebagai keputusan untuk mengekspos pengguna pada sebuah perubahan
  - Mengapa mencampuradukkan keduanya memaksa kita memilih antara deploy yang lambat atau rilis tanpa penjagaan
  - Empat environment yang layak diberi nama: build, staging, produksi, dan preview yang bersifat sementara
- **Bangun sekali, promosikan ke mana-mana**
  - Artefak immutable sebagai prasyarat promosi yang bisa dipercaya
  - Mengapa membangun ulang per environment membuat rollback menjadi kebohongan
  - Promosi sebagai pemindahan pointer antar environment, bukan pembangunan ulang
- **Topologi pipeline**
  - Fan-out dari satu job build ke N job deployment
  - Job yang terikat environment, rantai `needs`, serta perbedaan run yang ditolak dan yang gagal
  - Concurrency group sebagai kunci rilis, bukan sekadar trik antrean
- **Lab**: Ubah pipeline yang membangun ulang per environment menjadi satu tahap build yang mengeluarkan satu artefak, dengan job staging dan produksi yang hanya mengonsumsinya. Catat digest artefak di setiap tahap.

### Modul 2: Versioning dan Otomatisasi Changelog

- **Semantic versioning dalam praktik**
  - Major, minor, patch sebagai janji kompatibilitas, bukan skema pemasaran
  - Deteksi breaking change dari metadata commit dan dari diff API publik
  - Identifier pra-rilis, build metadata, dan kanal seperti `next` serta `rc`
- **Menurunkan versi dari riwayat**
  - Conventional commit, pesan squash-merge, dan label PR sebagai sinyal masukan
  - `release-please`, semantic-release, dan penandaan tag manual: trade-off serta mode kegagalannya
  - Release PR sebagai permukaan review untuk kenaikan versi
- **Changelog yang tahan diperiksa**
  - Pengelompokan berdasarkan dampak bagi pengguna, bukan berdasarkan tipe commit
  - Menautkan entri ke issue, PR, dan penulis secara otomatis
  - Mengapa changelog harus dihasilkan saat build, bukan ditulis setelah kejadian
- **Lab**: Tambahkan penurunan versi otomatis pada repositori library sehingga merge ke branch utama membuka release PR dengan changelog terbarui, dan tag hanya dibuat ketika PR tersebut di-merge.

### Modul 3: Identitas Artefak dan Catatan Promosi

- **Primitif identitas**
  - Digest konten versus tag, dan mengapa tag yang bisa berubah adalah insiden yang menunggu tanggal
  - Digest image OCI, checksum paket, dan keluaran build sebagai objek yang bisa diverifikasi
  - Penandatanganan dan atestasi dengan Sigstore serta artifact attestation GitHub
- **Tata letak registry**
  - Satu repositori per service versus namespace per organisasi
  - Kebijakan retensi, pengaturan immutability, dan garbage collection yang tidak menghapus rilis hidup
  - Promosi berdasarkan digest ketika registry tersebar di beberapa akun
- **Catatan tentang apa yang dikirim**
  - Deployment record, URL environment, dan deployment API sebagai jejak audit
  - Menulis manifest rilis: rentang commit, digest artefak, versi migrasi, revisi konfigurasi
  - Mencocokkan service yang sedang berjalan kembali ke workflow run ketika registry menjadi satu-satunya sumber kebenaran
- **Lab**: Publikasikan container ke registry dengan tag immutable, tandatangani dengan atestasi, lalu hasilkan manifest rilis yang memetakan digest ke rentang commit dan workflow run. Setelah itu promosikan digest yang sama ke registry kedua hanya dengan referensi digest.

### Modul 4: Gate Deployment dan Kontrol Perubahan

- **Proteksi environment**
  - Required reviewer, wait timer, dan kebijakan branch deployment pada environment GitHub
  - Secret yang dibatasi per environment agar kredensial produksi tidak bocor ke run staging
  - Perbedaan antara required reviewer dan required status check, serta kapan masing-masing hanya menjadi formalitas
- **Kontrol perubahan yang tidak menjadi birokrasi**
  - Freeze window, kalender rilis, dan cara mengodekan keduanya sebagai kondisi workflow
  - Tingkatan perubahan: rutin, ditingkatkan, darurat, masing-masing dengan gate-nya sendiri
  - Pemeriksaan policy-as-code yang berjalan sebelum gate, bukan setelah persetujuan
- **Semantik kegagalan**
  - Deployment yang ditolak, dibatalkan, dan gagal, serta apa yang semestinya dipicu masing-masing
  - Timeout pada job ber-gate agar deployment tanpa persetujuan tidak menyandera runner
  - Re-entry idempoten ketika persetujuan baru datang berjam-jam kemudian
- **Lab**: Konfigurasikan environment produksi dengan required reviewer, secret khusus environment, dan kondisi freeze window. Buktikan bahwa deployment yang diminta selama masa freeze diblokir dengan pesan yang bisa ditindaklanjuti, bukan kegagalan generik.

### Modul 5: Progressive Delivery

- **Strategi paparan**
  - Canary, blue-green, dan weighted routing: apa yang dilindungi masing-masing
  - Shadow dan dark launch sebagai alternatif tanpa risiko dibanding peluncuran berbasis persentase
  - Memilih strategi berdasarkan mode kegagalan yang benar-benar ditakuti
- **Analisis otomatis**
  - Mendefinisikan sinyal keberhasilan sebelum rollout: error rate, persentil latensi, saturasi
  - Argo Rollouts dan Flagger yang dikendalikan dari Actions, dengan Actions sebagai orkestrator, bukan sebagai gate itu sendiri
  - Kejujuran statistik: berapa banyak request sebelum putusan canary berarti apa pun
- **Koreografi rollout**
  - Bobot langkah, jeda, dan kriteria promosi yang diekspresikan sebagai input reusable workflow
  - Mengoordinasikan migrasi skema dengan pergeseran trafik
  - Apa yang harus dilakukan ketika hasil canary tidak konklusif
- **Lab**: Kirim sebuah service di balik canary dengan analisis otomatis terhadap error rate dan latensi p95, lalu tunjukkan promosi yang berhasil sekaligus pembatalan otomatis saat kesalahan disuntikkan.

### Modul 6: Rekayasa Rollback dan Hotfix

- **Rollback sebagai operasi yang dilatih**
  - Mengembalikan pointer ke digest sebelumnya versus membalik commit lalu membangun ulang
  - Waktu menuju rollback sebagai kemampuan yang dilacak dan dilatih secara berkala
  - Kapan roll-forward benar-benar lebih aman dan cara memutuskannya di bawah tekanan
- **State dan skema**
  - Migrasi expand-contract yang menjaga dua versi tetap bisa berjalan
  - Perubahan yang tidak bisa dibalik dan runbook backup-and-restore yang dibutuhkannya
  - Konfigurasi dan feature flag sebagai bagian dari permukaan rollback
- **Perubahan darurat**
  - Jalur hotfix: membuat branch dari tag, cherry-pick, dan merilis tanpa kehilangan changelog
  - Persetujuan jalur cepat dengan review wajib setelah kejadian
  - Mendokumentasikan perubahan darurat agar insiden berikutnya tidak mengulanginya
- **Lab**: Jalankan latihan rollback pada service yang sudah menerapkan migrasi hidup. Ukur waktu pemulihan, lalu potong waktunya menjadi separuh dengan mengotomatiskan pengembalian digest dan penonaktifan flag.

### Modul 7: Memisahkan Deploy dari Rilis

- **Feature flag sebagai tuas rilis**
  - Rilis berbasis flag sehingga deploy menjadi membosankan dan mudah dibalik
  - Daur hidup flag: pembuatan, tahap rollout, utang pembersihan, dan kepemilikan
  - Evaluasi flag di edge versus di dalam aplikasi
- **Model irama rilis**
  - Trunk-based development dengan branch berumur pendek dan main yang selalu hijau
  - Release train untuk library, SDK, dan aplikasi mobile yang tidak bisa dikirim sesuai permintaan
  - Rilis multi-service yang terkoordinasi tanpa kemacetan di release manager
- **Ekor panjang artefak**
  - Publikasi ke package feed, app store, dan marketplace listing dari Actions
  - Dokumentasi berversi dan kompatibilitas kontrak API
  - Jendela deprecation sebagai bagian dari rilis, bukan renungan belakangan
- **Lab**: Ambil sebuah fitur yang saat ini dikirim dengan cara merge, ubah menjadi rilis ber-flag dengan rencana rollout bertahap, lalu hapus flag setelah paparan penuh dan buktikan tidak ada kode mati yang tersisa.

### Modul 8: Observabilitas Rilis dan Perbaikan Berkelanjutan

- **Metrik yang layak dilaporkan**
  - Frekuensi deployment, lead time perubahan, change failure rate, waktu pemulihan
  - Mengapa rata-rata per repositori menyembunyikan jalur rilis yang sebenarnya menyakitkan
  - Instrumentasi dari workflow run, deployment record, dan perkakas insiden
- **Kesiapan rilis**
  - Scorecard: test hijau, migrasi sudah dry-run, changelog dihasilkan, jalur rollback diketahui, pemilik ditetapkan
  - Mengotomatiskan scorecard sebagai required check yang berkomentar di PR
  - Job verifikasi pasca-deploy yang gagal dengan berisik dalam hitungan menit setelah rilis buruk
- **Menutup lingkaran**
  - Postmortem yang menautkan insiden ke digest, workflow run, dan perubahan tertentu
  - Memakai change failure rate untuk memperjuangkan investasi, bukan heroisme
  - Tinjauan gate setiap kuartal: mana yang benar-benar menangkap sesuatu, mana yang hanya menambah antrean
- **Lab**: Bangun dashboard rilis dari deployments API yang mencakup empat metrik ditambah scorecard kesiapan, lalu presentasikan satu gate yang akan dihapus dan satu gate yang akan ditambahkan, beserta datanya.

## Proyek Akhir

Bangun `release-control`, sebuah sistem rilis end-to-end untuk satu service di repositori Anda sendiri atau di organisasi sandbox.

Hasil yang harus dikumpulkan:

- Tahap build yang menghasilkan satu artefak immutable dan tertandatangani, serta manifest rilis yang memaku digest, rentang commit, versi migrasi, dan workflow run.
- Penurunan versi otomatis dengan changelog yang dihasilkan, dibuka sebagai release PR, bukan di-push langsung.
- Promosi ke staging dan produksi hanya berdasarkan digest, di balik environment terproteksi dengan setidaknya satu gate yang bermakna.
- Tahap canary dengan analisis otomatis pada dua sinyal yang didefinisikan, termasuk abort otomatis.
- Latihan rollback yang sudah dijalankan dengan waktu pemulihan terukur dan runbook terdokumentasi, plus migrasi expand-contract yang menunjukkan kompatibilitas dua versi.
- Dashboard rilis yang mencakup frekuensi deployment, lead time, change failure rate, dan waktu pemulihan, disuplai dari deployment record nyata.
- Kebijakan rilis satu halaman: irama, tingkatan gate, jalur darurat, dan siapa yang memiliki rilis gagal.

Proyek dinilai berdasarkan apakah insinyur yang tidak membangunnya bisa mengirim dan menarik kembali sebuah perubahan hanya dengan dokumentasinya.

## Kriteria Penilaian

| Komponen | Bobot | Yang dievaluasi |
| --- | --- | --- |
| Lab modul (8) | 30% | Pipeline dan artefak yang berjalan, dapat direproduksi dari checkout bersih |
| Integritas artefak dan promosi | 15% | Immutability, penandatanganan, promosi hanya digest, manifest lengkap |
| Latihan rollback | 15% | Waktu pemulihan terukur, kompatibilitas skema ditangani, runbook bisa dipakai |
| Lab progressive delivery | 10% | Definisi sinyal bisa dipertanggungjawabkan, jalur abort terbukti, bukan sekadar dikonfigurasi |
| Proyek akhir | 20% | Kelengkapan, kualitas dokumentasi, realisme operasional |
| Pertahanan desain | 10% | Kemampuan membenarkan setiap gate dan menyebut satu yang akan dihapus |

Pipeline yang hanya berhasil di branch penulis dianggap belum selesai, dan rollback yang hanya diceritakan tetapi tidak pernah dijalankan dianggap tidak ada. Lab dikumpulkan sebagai pull request agar proses review itu sendiri mendemonstrasikan workflow ber-gate. Pengumpulan terlambat diterima dalam satu minggu dengan penalti 10%; pertahanan desain dijadwalkan secara individual dan tidak dapat dijadwalkan ulang kecuali untuk keadaan darurat yang terdokumentasi.

## Referensi

- GitHub Docs, "Deploying with GitHub Actions": <https://docs.github.com/en/actions/deployment>
- GitHub Docs, "Using environments for deployment": <https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment>
- GitHub Docs, "Managing deployments": <https://docs.github.com/en/rest/deployments/deployments>
- GitHub Docs, "Artifact attestations": <https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds>
- GitHub Docs, "Releasing projects on GitHub": <https://docs.github.com/en/repositories/releasing-projects-on-github>
- `release-please`: <https://github.com/googleapis/release-please>
- `semantic-release`: <https://github.com/semantic-release/semantic-release>
- Argo Rollouts, untuk orkestrasi canary dan blue-green: <https://argoproj.github.io/rollouts/>
- Flagger, untuk progressive delivery dengan analisis otomatis: <https://flagger.app/>
- Sigstore, untuk penandatanganan dan transparansi: <https://www.sigstore.dev/>
- Martin Fowler, "Patterns for Managing Source Code Branches": <https://martinfowler.com/articles/branching-patterns.html>
- Nicole Forsgren, Jez Humble, Gene Kim, *Accelerate*, untuk metrik deployment yang dipakai di Modul 8
