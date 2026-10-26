---
title: "Silabus Testing Vue.js"
description: "Kurikulum 6 modul yang membawa pengembang Vue.js 3 dari unit test pertama hingga quality gate di CI, mencakup component testing, alur end-to-end, strategi mocking, dan kebijakan coverage."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Testing Vue.js

## Ringkasan

Sebagian besar tim Vue.js tidak gagal karena tidak punya test, melainkan karena test yang dimiliki lambat, rapuh, atau memeriksa hal yang salah. Silabus ini mengajarkan testing sebagai disiplin desain, bukan pekerjaan tambahan di akhir: setiap modul menambah satu lapis keyakinan sekaligus satu lapis biaya, sehingga peserta belajar di mana sebuah test seharusnya berada dan apa yang wajib dibuktikannya.

Kursus berjalan enam modul dalam enam minggu, dirancang untuk pengembang yang tetap bekerja dengan beban lima sampai tujuh jam per minggu. Materi mengasumsikan Vue 3 dengan Composition API dan Vite, dan sengaja membatasi jumlah perkakas: Vitest dan Vue Test Utils untuk unit serta component test, Playwright untuk alur end-to-end, MSW untuk batas jaringan, dan GitHub Actions untuk pipeline. Setiap modul ditutup dengan lab praktik pada satu aplikasi yang sama yang tumbuh sepanjang kursus, sehingga minggu-minggu akhir mewarisi test nyata, bukan latihan sekali pakai.

## Kurikulum

### Modul 1: Fondasi Unit Testing

- Mengapa testing pyramid masih relevan di frontend: biaya per test, kecepatan umpan balik, dan kemudahan diagnosa
- Penyiapan proyek: Vitest lewat plugin Vite, `environment: "jsdom"`, dan skrip di `package.json`
- Anatomi test: Arrange-Act-Assert, nama berbasis perilaku, satu alasan gagal per test
- Gaya assertion: matcher `expect` yang penting (`toEqual`, `toStrictEqual`, `toThrow`, `toMatchObject`)
- Mulai dari logika murni: formatter, validator, reducer, pembangun URL — test termurah yang akan Anda tulis
- Struktur dan penemuan test: file `*.spec.ts` berdampingan, penyarangan `describe`, setup bersama lewat `beforeEach`
- Disiplin mode watch: `vitest --watch` saat mengembangkan, seluruh suite di hook pre-push
- **Lab**: Ekstrak tiga modul utilitas dari aplikasi kursus dan tutup semuanya, termasuk jalur error

### Modul 2: Component Testing dengan Vue Test Utils

- `mount` versus `shallowMount`: manfaat isolasi dibandingkan ketahanan terhadap refactor
- Menggerakkan komponen lewat permukaan publiknya: props masuk, `emitted()` keluar, slot ter-render
- Perilaku asinkron: `flushPromises`, `nextTick`, dan menunggu pengambilan data di `onMounted` tanpa `sleep`
- Strategi query: pencarian berbasis role dan label dari Testing Library, `data-testid` sebagai pilihan terakhir
- Stub komponen anak, global, dan plugin: `global.stubs`, `global.mocks`, router serta Pinia di dalam test
- Menguji state, bukan internal: tampilan loading, kosong, error, dan berisi data
- Disiplin snapshot: inline snapshot untuk output kecil dan stabil, tanpa snapshot untuk pohon DOM besar
- **Lab**: Uji tuntas komponen tabel data dan form multi-langkah, termasuk validasi dan jalur submit

### Modul 3: End-to-End Testing dengan Playwright

- Hal yang hanya bisa dibuktikan e2e: routing, API browser nyata, dan integrasi dengan kontrak backend
- Penyiapan Playwright untuk aplikasi Vite: `webServer`, `baseURL`, trace saat retry pertama, screenshot saat gagal
- Page Object Model: merangkum selector dan alur agar spec terbaca seperti cerita pengguna
- Strategi data uji: factory, seeding API per test, isolasi antar worker paralel
- Alur terautentikasi: pemakaian ulang storage state alih-alih login lewat UI di setiap test
- Menelusuri kegagalan: trace viewer, mode `--ui`, dan assertion pada respons jaringan saat DOM menyesatkan
- Kendali biaya CI: beri tag pada spec lambat, smoke set tiap push, suite penuh tiap malam
- **Lab**: Tulis alur pembelian — jelajah, keranjang, checkout, konfirmasi — pada dua ukuran viewport

### Modul 4: Strategi Mocking dan Batas Test

- Tangga mocking: implementasi nyata, fake, stub, spy, dan module mock — serta kapan masing-masing jujur
- Module mocking Vitest dengan `vi.mock` dan aturan hoisting, plus `vi.importActual` untuk mock parsial
- Spy dan assertion pemanggilan: `vi.spyOn`, `mockResolvedValue`, pemulihan state antar test
- Batas jaringan dengan MSW: handler per endpoint, override `server.use` per test, kegagalan request tak tertangani
- Memalsukan waktu dan nilai acak: `vi.useFakeTimers`, `vi.setSystemTime`, ID deterministik
- Kebersihan mock: mengapa mocking berlebihan menyembunyikan bug, cara menjaga fake selaras kontrak nyata
- Risiko kontrak melenceng: ekspor handler MSW agar stub e2e dan component test memakai satu sumber fixture
- **Lab**: Ganti stub fetch ad-hoc dengan handler MSW dan hapus tiga mock yang rapuh

### Modul 5: Strategi Coverage dan Ekonomi Test

- Provider coverage (`v8`, `istanbul`) serta apa yang sebenarnya diukur tiap metrik
- Membaca laporan coverage secara kritis: cabang yang belum tercakup lebih penting daripada baris
- Desain kebijakan: ambang global, ambang per direktori, dan diff coverage pada pull request
- Kapan 100% layak dikejar (perhitungan uang, penjaga autentikasi, parser) dan kapan hanya formalitas
- Mendeteksi suite lemah dengan mutation testing pada satu modul kritis
- Performa suite: worker paralel, kompromi `isolate: false`, pemisahan jalankan unit dan e2e
- Anggaran waktu: di bawah 90 detik untuk unit test, di bawah 10 menit untuk e2e suite
- **Lab**: Tetapkan kebijakan coverage untuk aplikasi kursus dan dokumentasikan dua pengecualian beralasan

### Modul 6: Integrasi Berkelanjutan dan Quality Gate

- Topologi pipeline: apa yang jalan di pull request, di main, dan tiap malam
- Workflow GitHub Actions: cache pnpm/npm, sharding matrix untuk Vitest, instalasi browser Playwright
- Artefak dan pelaporan: JUnit XML, laporan HTML, trace dan video saat gagal, anotasi pada PR
- Gagal cepat tanpa sering gagal: required check, branch protection, dan kebijakan skip
- Rahasia dan kesetaraan environment untuk e2e terhadap deployment preview
- Dasbor kualitas: tren coverage, tingkat flake, mean time to green
- Strategi penerapan: jalankan gate baru dalam mode bayangan dua minggu sebelum diwajibkan
- **Lab**: Rilis pipeline lengkap dan buka PR yang sengaja dirusak untuk membuktikan gate memblokirnya

## Proyek Akhir

Peserta menyerahkan aplikasi Vue.js 3 yang teruji (aplikasi kursus, ditambah satu fitur pilihan sendiri) beserta pipeline yang menjaganya. Deliverable wajib: unit suite untuk seluruh logika bisnis, component test yang mencakup setiap state interaktif, e2e suite untuk minimal tiga alur kritis dengan page object, mocking jaringan berbasis MSW yang dipakai bersama oleh unit dan component test, kebijakan coverage yang ditegakkan termasuk diff coverage, dan workflow GitHub Actions yang menjalankan semuanya pada pull request serta menerbitkan laporan. Sebuah memo strategi testing singkat harus membenarkan setiap lapis, menyebut apa yang sengaja tidak diuji, dan menyatakan biaya perawatan yang diterima tim.

## Kriteria Penilaian

- **Tugas**: Lab mingguan dinilai dari kualitas test, bukan jumlahnya. Test yang tetap lulus terhadap implementasi yang dirusak mendapat nilai nol. Penilai mencari assertion berbasis perilaku, penanganan asinkron deterministik, mocking minimal, dan penamaan yang mudah dibaca.
- **Kuis**: Kuis singkat tiap modul menguji penalaran trade-off — penempatan di pyramid, batas mock, kebijakan ambang, dan desain gate.
- **Tinjauan sejawat**: Setiap peserta meninjau satu pull request rekannya memakai daftar periksa kualitas test.
- **Proyek Akhir**: Dievaluasi dengan daftar periksa: semua lapis hijau, kebijakan coverage ditegakkan di CI, e2e suite stabil pada tiga kali jalankan berturut-turut, tidak ada pemanggilan `sleep` di spec, laporan diterbitkan sebagai artefak, dan memo strategi konsisten dengan kode yang benar-benar dikirim. Nilai tambah diberikan bila peserta menghapus satu test flaky yang ada beserta akar masalahnya.
- **Ambang lulus**: 70% secara keseluruhan dengan proyek akhir lulus; proyek akhir tidak dapat ditutupi oleh nilai kuis.

## Referensi

- [Panduan testing Vue.js](https://vuejs.org/guide/scaling-up/testing.html)
- [Dokumentasi Vitest](https://vitest.dev/guide/) — runner, mocking, timer, coverage
- [Vue Test Utils](https://test-utils.vuejs.org/) — mounting, event, stub, slot
- [Vue Testing Library](https://testing-library.com/docs/vue-testing-library/intro/)
- [Dokumentasi Playwright](https://playwright.dev/docs/intro)
- [MSW — Mock Service Worker](https://mswjs.io/docs/)
- [Cookbook testing Pinia](https://pinia.vuejs.org/cookbook/testing.html)
- [Mutation testing dengan StrykerJS](https://stryker-mutator.io/docs/)
- [GitHub Actions — sintaks workflow](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Kent C. Dodds — Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Testing komponen Vue dengan Vitest (Vue School)](https://vueschool.io/articles/vuejs-tutorials/testing-vue-components-with-vitest/)
