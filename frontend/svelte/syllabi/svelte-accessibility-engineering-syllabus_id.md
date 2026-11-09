---
title: "Silabus Rekayasa Aksesibilitas Svelte"
description: "Kurikulum lanjutan dua belas minggu untuk membangun aplikasi Svelte dan SvelteKit yang sesuai WCAG 2.2: template semantik, arsitektur fokus dan keyboard, state ARIA berbasis runes, pengujian dengan teknologi asistif, gerbang aksesibilitas di CI, dan design system yang inklusif."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Aksesibilitas Svelte

## Ringkasan

Sebagian besar materi aksesibilitas berhenti pada "gunakan HTML semantik dan tambahkan alt text". Silabus ini memperlakukan aksesibilitas sebagai disiplin rekayasa dengan arsitektur, strategi pengujian, dan biaya operasional — tingkat ketelitian yang dibutuhkan tim ketika kegagalan kesesuaian menghambat tinjauan pengadaan, kontrak sektor publik, atau rilis di app store.

Svelte adalah kendaraan belajar yang sangat baik untuk materi ini. Compiler-nya menghasilkan DOM biasa tanpa lapisan event sintetis, tanpa elemen pembungkus, dan tanpa diffing virtual DOM, sehingga apa yang ditulis di template hampir persis sama dengan apa yang dilihat accessibility tree. Transparansi itu membuat hubungan sebab-akibat mudah dibaca: heading level yang salah memang heading yang salah, `<button>` yang salah cakupan adalah elemen nyata, dan manajemen fokus adalah pekerjaan DOM biasa, bukan abstraksi framework. SvelteKit menambah permukaan masalahnya sendiri — navigasi sisi klien yang tidak pernah memicu pemuatan halaman, form action dengan progressive enhancement, serta transisi shell yang dirender di server dan bisa diam-diam merusak konteks pembaca layar.

Kursus ini dibangun di sekitar satu produk yang berjalan terus: alur pendaftaran konferensi yang harus lulus audit WCAG 2.2 AA pada Minggu 12. Setiap modul menambah fitur ke produk tersebut dan menjalankan ulang harness audit yang sama, sehingga peserta melihat skor kesesuaian bergerak sebagai konsekuensi dari keputusan mereka sendiri, bukan membaca teori aksesibilitas secara abstrak.

Tingkat kesulitan sengaja dibuat lanjutan. Peserta diharapkan sudah nyaman dengan runes Svelte 5, routing dan load function SvelteKit, serta TypeScript. Kursus ini tidak mengulang dasar framework; kursus mengasumsikan kemampuan tersebut dan memakai waktunya untuk bagian aksesibilitas yang menuntut keputusan arsitektural, proses lintas tim, dan pengujian dengan teknologi asistif.

## Kurikulum

### Modul 1: Aksesibilitas sebagai Disiplin Rekayasa (Minggu 1)

- **Kesesuaian, bukan teater kepatuhan**
  - Level A, AA, dan AAA pada WCAG 2.2; apa yang sebenarnya diperbolehkan oleh "sesuai secara substansial"
  - POUR sebagai model pengorganisasi: perceivable, operable, understandable, robust
  - Pendorong regulasi: European Accessibility Act, EN 301 549, ADA Title II/III, Section 508, dan bagaimana masing-masing dipetakan kembali ke success criteria WCAG
- **Lanskap teknologi asistif**
  - Pembaca layar (NVDA, JAWS, VoiceOver, TalkBack, Narrator), pembesar layar, switch access, kontrol suara, dan braille refreshable
  - Mengapa satu kali pengujian pembaca layar tidak pernah cukup, dan bagaimana memilih matriks pengujian yang dapat dipertahankan untuk produk serta audiens tertentu
- **Mengapa Svelte membuat mode kegagalan terlihat**
  - Compiler menghasilkan elemen nyata: tidak ada lapisan `<div>` pembungkus, tidak ada delegasi event sintetis yang harus dinalar
  - Navigasi sisi klien SvelteKit mengganti DOM tanpa memuat dokumen — sumber regresi aksesibilitas senyap terbesar di aplikasi Svelte
  - Peringatan aksesibilitas dari compiler dan linter sebagai garis pertahanan pertama, serta aturan untuk tidak pernah mematikannya tanpa alasan tertulis
- **Latihan**: Audit halaman marketing SvelteKit yang sudah ada hanya dengan keyboard, catat setiap cacat di register bersama, dan nilai halaman tersebut terhadap WCAG 2.2 AA secara manual

### Modul 2: Fondasi Semantik pada Template Svelte (Minggu 2)

- **Landmark dan struktur dokumen**
  - Header, nav, main, aside, footer, dan disiplin `aria-label` untuk landmark yang berulang
  - Satu `<main>` per halaman; komposisi layout SvelteKit sebagai tempat menegakkannya
  - Urutan heading sebagai kontrak kerangka dokumen, dan mengapa ukuran visual harus dilepaskan dari heading level
- **Semantik blok di dalam `{#if}`, `{#each}`, dan `{#snippet}`**
  - Semantik list yang tetap bertahan pada keyed each block dan kondisi kosong
  - Pengumuman kondisi kosong: perbedaan antara "tidak ada hasil" sebagai teks dan sebagai kesunyian
  - `<svelte:element>` untuk semantik yang harus berubah mengikuti data, dan biaya aksesibilitas dari output polimorfik
- **Tombol versus tautan**
  - Anchor untuk navigasi, button untuk aksi; mengapa `<a href="#">` yang diberi gaya membuat setiap pengguna keyboard kehilangan ekspektasi
  - Atribut `disabled` versus `aria-disabled`, dan menjaga elemen tetap dapat difokus saat diperlukan
- **Peringatan compiler yang perlu dipahami**
  - Peringatan `a11y_*`: alt hilang, label tidak terhubung, elemen non-interaktif dengan handler, role berlebih
  - Aturan aksesibilitas `eslint-plugin-svelte` dan bagaimana aturan itu menangkap hal yang tidak ditangkap compiler
- **Latihan**: Bangun ulang halaman landing pendaftaran dengan struktur landmark yang benar, pohon heading yang aman terhadap outline, dan tanpa peringatan `a11y_*` yang ditekan

```svelte
<script lang="ts">
  let sessions: Session[] = $props();
</script>

<main id="main">
  <h1>Daftar SvelteConf 2026</h1>

  {#if sessions.length === 0}
    <p role="status">Belum ada sesi yang dibuka untuk pendaftaran. Periksa kembali nanti.</p>
  {:else}
    <h2>Sesi yang tersedia</h2>
    <ul>
      {#each sessions as session (session.id)}
        <li>
          <h3>{session.title}</h3>
          <p>{session.abstract}</p>
          <a href="/sessions/{session.slug}">Detail sesi</a>
        </li>
      {/each}
    </ul>
  {/if}
</main>
```

### Modul 3: Manajemen Fokus dan Arsitektur Keyboard (Minggu 3)

- **Fokus sebagai state aplikasi**
  - Aturan satu target fokus untuk setiap transisi yang terlihat pengguna
  - Jangan pernah menghilangkan fokus tanpa menempatkannya di lokasi yang dapat diprediksi
  - Nilai `tabindex`: `0` untuk widget kustom, `-1` untuk target programatik, nilai positif tidak pernah
- **Perubahan rute pada aplikasi satu halaman**
  - `afterNavigate` di SvelteKit untuk memindahkan fokus ke `<h1>` atau kontainer main yang baru
  - Mengumumkan judul halaman baru melalui live region polite
  - Mempertahankan posisi scroll tanpa meninggalkan fokus di luar layar
- **Interaksi modal dan focus trap**
  - `<dialog>` native dengan `showModal()` dan mengapa ia lebih unggul dari overlay buatan sendiri
  - Penahanan fokus, pemilihan fokus awal, pemulihan fokus saat ditutup, dan penanganan Escape
  - `use:` action sebagai rumah yang dapat digunakan ulang untuk logika focus trap
- **Widget komposit dan roving tabindex**
  - Satu titik tab per widget, tombol panah di dalamnya: pola toolbar, tab list, dan menu
  - Melewati item nonaktif tanpa merusak model keyboard
- **Latihan**: Hubungkan pemulihan fokus ke wizard pendaftaran (transisi langkah, dialog konfirmasi, state error) dan verifikasi hanya dengan keyboard

```typescript
// src/lib/actions/focus-trap.ts
export function focusTrap(node: HTMLElement) {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(node.querySelectorAll<HTMLElement>(selector));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  node.addEventListener('keydown', handleKeydown);
  return {
    destroy() {
      node.removeEventListener('keydown', handleKeydown);
    }
  };
}
```

### Modul 4: Runes, Live Region, dan State yang Diumumkan (Minggu 4)

- **Live region yang tidak membanjiri pengguna**
  - `aria-live="polite"` versus `assertive`, dan mengapa assertive hampir selalu salah untuk validasi
  - Mengumumkan pesan tepat sekali: antrean yang digerakkan `$state` dengan kunci pesan yang selalu bertambah
  - Bug klasik live region yang dipasang ketika isinya sudah ada di dalamnya
- **Runes dan penurunan state yang aksesibel**
  - `$state` untuk state widget yang dicerminkan atribut ARIA, `$derived` untuk nilai `aria-*` terhitung
  - Batas `$effect`: jangan pernah memakai effect untuk mencerminkan state yang seharusnya diturunkan
  - Menyinkronkan `aria-expanded`, `aria-selected`, dan `aria-current` tanpa pergeseran nilai
- **Status dan penanda pemuatan**
  - `aria-busy`, placeholder skeleton, dan menyembunyikan spinner dekoratif dari accessibility tree
  - Mengumumkan operasi panjang sekali di awal dan sekali saat selesai
- **Preferensi gerak**
  - `prefers-reduced-motion` sebagai percabangan kelas satu, bukan saklar CSS global
  - Transisi Svelte dengan kesadaran `reducedMotion` dan biaya jika diabaikan
- **Latihan**: Tambahkan live region status penyimpanan dan pengumum validasi ke wizard, lalu buktikan dengan pembaca layar bahwa setiap pesan diucapkan tepat satu kali

### Modul 5: Formulir, Validasi, dan Pemulihan dari Error (Minggu 5)

- **Progressive enhancement sebagai fitur aksesibilitas**
  - Form action SvelteKit yang berfungsi saat JavaScript dimatikan dan membaik ketika aktif
  - `use:enhance` sebagai lapisan peningkatan, bukan keharusan
- **Pelabelan dan instruksi**
  - Label yang terlihat, asosiasi programatik, dan anti-pola placeholder
  - `aria-describedby` untuk petunjuk, `aria-invalid` untuk state, `aria-required` versus atribut `required`
  - Pengelompokan dengan `fieldset` dan `legend` untuk kumpulan radio dan checkbox
- **Arsitektur error**
  - Ringkasan error di bagian atas formulir dengan tautan ke setiap field, ditambah pesan inline
  - Memindahkan fokus ke ringkasan saat pengiriman gagal, lalu ke field tidak valid pertama
  - Kata-kata identik di ringkasan dan di field: perbedaan redaksi adalah kegagalan WCAG 3.3.1 dalam praktik
- **Tujuan input dan memori pengguna**
  - Token autocomplete untuk WCAG 1.3.5 Identify Input Purpose
  - Redundant entry (3.3.7): jangan meminta data yang sama dua kali dalam alur multi-langkah
  - Accessible authentication (3.3.8): tanpa tes fungsi kognitif, tempel diizinkan pada field kata sandi
- **Latihan**: Bangun ulang formulir pendaftaran dengan skema Zod bersama, ringkasan error, token autocomplete yang benar, dan siklus validasi yang sepenuhnya dapat dioperasikan dengan keyboard

### Modul 6: Arsitektur Komponen untuk Design System yang Aksesibel (Minggu 6)

- **Kontrak komponen yang aksesibel**
  - Setiap komponen mendokumentasikan interaksi keyboard, role yang diumumkan, dan label yang diwajibkan
  - Desain prop yang membuat jalur tidak aksesibel sulit diambil: prop `label` wajib, bukan opsional
  - `$props()` dengan spread `...rest` agar atribut native dan ARIA diteruskan tanpa perubahan
- **Pola komposisi**
  - Komponen majemuk dengan `setContext` dan `getContext`, serta disiplin tipe yang menjaga state tetap jujur
  - Snippet untuk konten fleksibel sambil mempertahankan semantik komponen pemiliknya
  - Primitif headless versus komponen berpendapat: kapan masing-masing layak dipakai
- **Nama aksesibel**
  - Urutan komputasi nama aksesibel dan kapan `aria-labelledby` mengalahkan `aria-label`
  - Tombol hanya-ikon: nama wajib, tooltip bukan nama
- **Menguji kontrak**
  - Tes komponen yang memeriksa role dan nama, bukan nama class
  - Membuat snapshot accessibility tree alih-alih DOM
- **Latihan**: Ekstrak input wizard, dialog, dan indikator langkah menjadi pustaka komponen terdokumentasi dengan kontrak keyboard per komponen

### Modul 7: Widget Kompleks dan Disiplin ARIA (Minggu 7)

- **Aturan pertama ARIA**
  - Tanpa ARIA lebih baik daripada ARIA yang salah; elemen native selalu didahulukan
  - Tiga alasan sah untuk memakai role, dan utang pemeliharaan yang diciptakan masing-masing
- **Pola WAI-ARIA Authoring Practices**
  - Combobox, listbox, menu button, disclosure, tabs, dan dialog: role, state, dan penanganan tombol yang diwajibkan
  - Pola combobox secara khusus, ketika implementasi setengah jadi lebih buruk daripada select biasa
  - Grid versus table: kapan tabel data benar-benar merupakan grid
- **Sinkronisasi state di Svelte**
  - Menurunkan setiap atribut `aria-*` dari satu sumber state sehingga widget tidak dapat berbohong
  - Menangani typeahead, home/end, dan page-up/page-down secara konsisten
- **Kapan memilih solusi membosankan**
  - `<select>`, `<details>`, dan `<dialog>` native versus widget kustom
  - Mengukur biaya nyata combobox kustom terhadap manfaat desainnya
- **Latihan**: Bangun satu combobox kustom dan satu menu button sesuai spesifikasi, lalu ganti combobox dengan kontrol native dan dokumentasikan trade-off-nya

### Modul 8: Media, Gerak, dan Aksesibilitas Visual (Minggu 8)

- **Gambar dan SVG**
  - Pohon keputusan alt text: informatif, dekoratif, fungsional, kompleks
  - SVG inline: `role="img"` dengan `title`, atau `aria-hidden` plus teks di sebelahnya — jangan setengah-setengah
  - Grafik dan diagram: nama singkat plus jalur deskripsi panjang
- **Media berbasis waktu**
  - Caption, transkrip, dan audio description; `<track kind="captions">`
  - Media yang diputar otomatis, kontrol jeda, dan WCAG 1.4.2
- **Persyaratan visual yang menjadi tanggung jawab engineer**
  - Kontras untuk teks dan UI non-teks (1.4.3, 1.4.11), dan mengapa design token adalah solusi yang tepat
  - Tampilan fokus (2.4.11, 2.4.13): indikator harus terlihat, bukan hanya ada
  - Ukuran target (2.5.8), reflow pada 320 piksel CSS (1.4.10), text spacing (1.4.12)
- **Gerak**
  - Parallax, carousel otomatis, dan animasi berulang menurut 2.2.2
  - Menerapkan `prefers-reduced-motion` di dalam transisi Svelte dan lapisan CSS secara bersamaan
- **Latihan**: Bawa jadwal konferensi ke kesesuaian kontras, reflow, dan ukuran target, lalu tambahkan carousel yang aman terhadap gerak

### Modul 9: Internasionalisasi, RTL, dan Aksesibilitas Kognitif (Minggu 9)

- **Bahasa dan arah**
  - `lang` pada dokumen dan pada span bahasa asing inline; parameter rute SvelteKit yang menggerakkannya
  - `dir="rtl"` dengan properti CSS logis, ikon yang dicerminkan, dan bagian yang tidak boleh dicerminkan
  - Pemformatan angka, tanggal, dan mata uang yang diucapkan benar oleh pembaca layar
- **Teks aksesibilitas yang terlokalisasi**
  - Menerjemahkan label, pesan error, dan pengumuman live region sebagai bagian dari katalog pesan
  - Pluralisasi dan gender dalam pengumuman; mengapa penggabungan string merusaknya
  - Jebakan menerjemahkan label ARIA tetapi tidak teks terlihat yang diduplikasinya
- **Beban kognitif**
  - Bahasa sederhana, navigasi dan identifikasi konsisten (3.2.3, 3.2.4), bantuan konsisten (3.2.6)
  - Pencegahan error untuk pengiriman data legal dan finansial (3.3.4)
  - Timeout, perpanjangan sesi, dan mempertahankan data yang sudah diisi (2.2.1)
- **Latihan**: Rilis locale kanan-ke-kiri untuk alur pendaftaran dengan atribut bahasa yang benar dan pengumuman yang diterjemahkan

### Modul 10: Pengujian, Audit, dan Pencegahan Regresi (Minggu 10)

- **Cakupan otomatis dan batasnya**
  - `axe-core` melalui `vitest-axe` dan Playwright: apa yang ditangkap, dan sebagian besar masalah yang tidak ditangkapnya
  - Aturan aksesibilitas `eslint-plugin-svelte` di editor dan di CI
  - Pa11y CI dan Lighthouse sebagai smoke test, tidak pernah sebagai vonis kesesuaian
- **Pengujian manual yang menemukan cacat nyata**
  - Uji keyboard-saja dengan skrip tertulis per alur
  - Uji pembaca layar pada NVDA (mode browse versus mode fokus), VoiceOver di macOS dan iOS, serta TalkBack
  - Zoom hingga 400 persen, mode forced colors, dan reduced motion
- **Audit terskrip dan dapat diulang**
  - Menulis skrip uji yang dapat dijalankan orang lain: prasyarat, langkah, pengumuman yang diharapkan
  - Triase false positive dan mendokumentasikan risiko yang diterima beserta pemilik dan tanggal kedaluwarsanya
- **Suite regresi**
  - Menyisipkan assertion aksesibilitas ke suite komponen dan E2E
  - Melacak jumlah pelanggaran sebagai anggaran agar utang baru terlihat saat review
- **Latihan**: Susun laporan audit lengkap untuk alur pendaftaran dengan langkah reproduksi dan tingkat keparahan, lalu ubah lima temuan teratas menjadi tes otomatis

### Modul 11: Gerbang CI, Tata Kelola, dan Praktik Tim (Minggu 11)

- **Gerbang yang memblokir tanpa menghambat kecepatan**
  - Menggagalkan build pada pelanggaran baru sambil mengampuni baseline yang terukur
  - Di mana menjalankan pemeriksaan: pre-commit, pull request, pemindaian mendalam malam hari
  - Menjaga durasi audit di bawah beberapa menit agar tidak ada yang mencari jalan memutar
- **Kewajiban dokumentasi**
  - Pernyataan aksesibilitas, tanggapan VPAT dan ACR, serta bukti yang dibutuhkan masing-masing
  - Menulis catatan keputusan internal untuk setiap risiko aksesibilitas yang diterima
- **Proses desain dan review**
  - Kriteria penerimaan aksesibilitas di tiket, ditulis sebelum implementasi
  - Checklist review untuk keyboard, fokus, dan perilaku pengumuman
  - Design review yang menangkap masalah kontras dan ukuran target sebelum kode dibuat
- **Budaya dan kapasitas**
  - Pelatihan yang bertahan saat staf berganti; sesi pembaca layar berpasangan dengan desainer
  - Melibatkan pengguna teknologi asistif, dan membayar mereka
  - Respons insiden untuk cacat aksesibilitas yang sampai ke produksi
- **Latihan**: Tambahkan gerbang aksesibilitas pada pull request dengan baseline pelanggaran, dan tulis pernyataan aksesibilitas untuk situs konferensi

### Modul 12: Migrasi, Utang Warisan, dan Capstone (Minggu 12)

- **Audit basis kode Svelte warisan**
  - Inventaris per rute dan risiko: alur autentikasi, pembayaran, dan entri data lebih dahulu
  - Membedakan cacat tingkat framework dari cacat tingkat desain
- **Remediasi bertahap**
  - Memperbaiki semantik lebih dahulu karena itu pekerjaan berdampak tinggi termurah
  - Perbaikan tingkat komponen yang menyebar, versus tambalan tingkat halaman yang tidak
  - Mengapa widget overlay aksesibilitas gagal, dan apa yang harus dikatakan kepada pemangku kepentingan yang memintanya
- **Prioritisasi**
  - Tingkat keparahan berdasarkan dampak dan frekuensi pengguna: date picker yang rusak lebih penting daripada `aria-current` yang hilang
  - Mengurutkan remediasi terhadap pekerjaan fitur tanpa menghentikan keduanya
- **Review capstone**
  - Mempresentasikan selisih audit, utang yang tersisa, dan rencana operasional agar utang tidak tumbuh kembali
- **Latihan**: Remediasi kumpulan halaman Svelte 4 warisan yang sengaja dibuat cacat dan hasilkan diff kesesuaian sebelum-sesudah

## Proyek Akhir

Bangun, audit, dan pertahankan **AccessPass**, aplikasi pendaftaran konferensi dengan SvelteKit yang sesuai WCAG 2.2 Level AA:

- Wizard pendaftaran multi-langkah (pemilihan sesi, detail peserta, ringkasan pembayaran, konfirmasi) dengan penempatan fokus dan pengumuman yang benar pada setiap transisi langkah
- Lapisan formulir yang memakai validasi Zod bersama, ringkasan error dengan manajemen fokus, error tingkat field yang dihubungkan melalui `aria-describedby`, serta token autocomplete yang benar
- Satu widget komposit kustom yang dibangun sesuai spesifikasi WAI-ARIA Authoring Practices, plus justifikasi tertulis mengapa kontrol native tidak dipakai
- Pustaka komponen aksesibel di mana setiap komponen mendokumentasikan kontrak keyboard, role, dan nama aksesibel yang diwajibkan
- Alur terlokalisasi dalam bahasa Inggris dan Arab kanan-ke-kiri, dengan pengumuman yang diterjemahkan serta penanganan `lang` dan `dir` yang benar
- Laporan audit lengkap: hasil otomatis dari axe dan Pa11y, skrip uji keyboard, matriks uji pembaca layar pada minimal dua teknologi asistif, dan temuan berurut keparahan
- Gerbang pull request yang gagal pada pelanggaran baru terhadap baseline yang di-commit, serta pernyataan aksesibilitas yang menjelaskan tingkat kesesuaian dan batasan yang diketahui

Proyek ini sengaja berupa alur pendaftaran, bukan dashboard, karena alur tersebut memusatkan masalah tersulit — state multi-langkah, validasi, pembayaran, timeout, dan lokalisasi — ke dalam alur yang harus diselesaikan setiap pengguna.

## Kriteria Penilaian

- **Tugas**: Setiap latihan mingguan dinilai dari kesesuaian (success criteria yang disebut di brief terpenuhi), bukti (peserta dapat mendemonstrasikan perbaikan dengan rekaman keyboard atau pembaca layar), dan daya tahan (perbaikan bersifat arsitektural, bukan tambalan sekali pakai). Menekan peringatan aksesibilitas compiler atau linter tanpa justifikasi tertulis berarti gagal otomatis pada latihan tersebut.
- **Laporan audit**: Dinilai dari apakah temuan dapat direproduksi orang lain, dipetakan dengan benar ke success criteria WCAG, dan diurutkan berdasarkan dampak pengguna, bukan kemudahan perbaikan.
- **Proyek Akhir**: Bobot 40 persen kesesuaian fungsional, 25 persen kualitas pengujian dan audit, 20 persen arsitektur serta dokumentasi kontrak komponen, dan 15 persen rencana operasional — gerbang CI, pernyataan aksesibilitas, serta backlog remediasi beserta pemiliknya.
- **Pertahanan capstone**: Peserta harus menjelaskan mengapa setiap batasan yang masih diketahui diterima, kelompok pengguna mana yang terdampak, dan kapan batasan itu akan ditangani.

## Referensi

- [Spesifikasi WCAG 2.2](https://www.w3.org/TR/WCAG22/) — success criteria normatif beserta dokumen pemahamannya
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) — interaksi keyboard dan pola role untuk widget komposit
- [Dokumentasi Aksesibilitas Svelte](https://svelte.dev/docs/svelte/compiler-warnings) — peringatan aksesibilitas compiler dan cara memperbaikinya
- [Dokumentasi SvelteKit](https://svelte.dev/docs/kit) — routing, form action, hooks, dan `afterNavigate`
- [eslint-plugin-svelte](https://sveltejs.github.io/eslint-plugin-svelte/) — aturan lint aksesibilitas untuk template Svelte
- [axe-core](https://github.com/dequelabs/axe-core) dan [Pa11y](https://pa11y.org/) — mesin pengujian aksesibilitas otomatis
- [Survei Pengguna Pembaca Layar WebAIM](https://webaim.org/projects/screenreadersurvey/) — data penggunaan teknologi asistif untuk menyusun matriks pengujian
- [Inclusive Components](https://inclusive-components.design/) — pola praktis untuk widget aksesibel
