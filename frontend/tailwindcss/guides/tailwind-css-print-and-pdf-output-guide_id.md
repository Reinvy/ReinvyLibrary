---
title: "Panduan Print Styles dan Output Dokumen PDF Tailwind CSS"
description: "Panduan lanjutan untuk membuat antarmuka Tailwind CSS siap cetak: geometri kertas dengan @page, varian print, kontrol paginasi, warna dan tipografi aman cetak, serta rendering PDF deterministik melalui headless Chrome."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Print Styles dan Output Dokumen PDF Tailwind CSS

## Pendahuluan

Mencetak bukan berarti "halaman yang sama dalam skala abu-abu". Saat browser beralih ke media print, ia membuang state hover, menyelesaikan viewport yang berbeda, memaginasi konten ke dalam kotak kertas berukuran tetap, dan berhenti menjalankan heuristik lazy loading. Layout yang dirancang rapi untuk shell aplikasi — header sticky, permukaan gelap, kontainer scroll, sidebar tetap — menghasilkan dokumen yang sama sekali berbeda: navigasi tercetak di setiap halaman, latar gelap yang menghabiskan toner, kartu terpotong di batas halaman, dan gambar yang tampil sebagai kotak kosong karena tidak pernah masuk viewport.

Tailwind menyediakan tiga primitif untuk target output ini: varian `print:` untuk kondisi per komponen, utilitas paginasi `break-*`, dan CSS biasa untuk hal yang tidak bisa diungkapkan utilitas (geometri halaman dengan `@page`, header tabel yang berulang, anotasi tautan). Bagian keempat berada di luar stylesheet: renderer. Sebagian besar produk yang "ekspor ke PDF" sebenarnya menjalankan headless Chrome, sehingga print stylesheet bukan sekadar pelengkap aksesibilitas — ia adalah renderer produksi sesungguhnya untuk faktur, kuitansi, laporan rekening, statement, dan sertifikat.

Panduan ini membahas disiplin rekayasa di balik target tersebut: lapisan print yang tidak mengotori stylesheet layar, paginasi eksplisit, warna dan tipografi aman cetak, perataan UI interaktif, pembuatan PDF deterministik, dan pemeriksaan CI yang menangkap faktur rusak sebelum sampai ke pelanggan.

## Praktik Terbaik

- **Perlakukan print sebagai target output kelas satu.** Jika sebuah dokumen pernah diekspor ke PDF, CSS print adalah kode produksi dengan kontrak: jumlah halaman, pemisah halaman, dan kelengkapan konten adalah output yang dapat diuji, bukan preferensi kosmetik.
- **Biarkan `@page` yang mengatur geometri kertas.** Margin adalah milik kotak halaman (`@page { margin: 18mm }`), bukan milik elemen ber-padding di dalam dokumen. Margin berbasis padding akan rusak begitu ukuran kertas berubah dari A4 ke Letter.
- **Utamakan varian `print:` untuk aturan tingkat komponen, `@media print` untuk aturan struktural.** Komponen seharusnya tahu bagaimana ia tercetak (`print:hidden`, `print:break-inside-avoid`). Aturan yang menyentuh root dokumen, kotak halaman, atau tipografi global berada di satu blok print khusus agar mudah dicari dengan grep.
- **Tentukan paginasi, jangan menemukannya.** `break-before-page` eksplisit pada bab dan `break-inside-avoid` pada unit atomik (satu baris item faktur, blok tanda tangan) mengubah output yang tak terprediksi menjadi layout yang Anda tentukan sendiri.
- **Ratakan UI interaktif sebelum stylesheet print bekerja.** Sembunyikan navigasi, floating action button, toast, dan banner cookie; buka `details`, accordion, serta panel tab yang tidak aktif — konten yang tersembunyi akan hilang diam-diam dari PDF, dan tiket dukungan menyusul.
- **Cetak dengan tinta, bukan dengan RGB.** Permukaan terang dengan teks gelap adalah default; bagian `bg-slate-900` yang berat sebaiknya runtuh menjadi putih dengan border. Sisakan `print-color-adjust: exact` hanya untuk brand mark dan visualisasi data yang kehilangan makna tanpa warna.
- **Tampilkan apa yang dihilangkan oleh medium.** Tautan tercetak tidak punya kursor, jadi tambahkan tujuannya lewat aturan `::after`; chart kehilangan interaksi legendanya, jadi pertahankan legenda tetap terlihat di frame statis.
- **Render PDF dengan mesin yang sama dengan yang dipakai pengguna untuk mencetak.** Headless Chrome dan browser pengguna berbagi implementasi print, itulah sebabnya stylesheet yang sama menghasilkan jumlah halaman yang sama. Perlakukan toolchain PDF lain sebagai target output terpisah dengan stylesheet sendiri.
- **Uji jumlah halaman, bukan screenshot.** Snapshot visual halaman pertama tidak memberi tahu apa pun tentang faktur yang membengkak menjadi empat halaman dan kehilangan blok totalnya. Pastikan kelengkapan dokumen dan jumlah halaman di CI.

## Langkah Implementasi

### Langkah 1: Bangun Lapisan Print

Buat satu blok print di entry stylesheet Tailwind, setelah import. Semua hal struktural berada di sini — geometri halaman, penyesuaian tipe global, dan sekumpulan kecil aturan elemen yang tidak dapat dijangkau utilitas.

```css
@import "tailwindcss";

@page {
  size: A4;
  margin: 18mm 16mm 20mm;

  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-size: 9pt;
    color: #6b7280;
  }
}

@media print {
  html {
    font-size: 10.5pt;
  }

  body {
    background: #fff;
    color: #111827;
  }

  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 8.5pt;
    color: #6b7280;
    word-break: break-all;
  }
}
```

Ada dua detail penting di sini. Margin box `@page` didukung Chrome untuk header dan footer, sehingga tidak perlu lagi trik header fixed. Dan `font-size` pada `html` di media print menimpa skala layar, sehingga setiap utilitas `text-sm` dan `text-2xl` mewarisi baseline yang sesuai kertas alih-alih proporsi layar 16px.

### Langkah 2: Pisahkan Shell dari Dokumen

Shell aplikasi dan dokumen yang dapat dicetak adalah dua pohon berbeda. Sembunyikan shell saat print dan tandai root dokumen secara eksplisit, agar refactor layout di masa depan tidak tanpa sengaja mencetak sidebar.

```html
<body class="bg-slate-100">
  <nav class="print:hidden">...</nav>

  <aside class="hidden lg:block print:hidden">...</aside>

  <main class="print:block">
    <article class="mx-auto max-w-3xl bg-white p-8 print:max-w-none print:p-0">
      <header class="hidden print:flex print:items-baseline print:justify-between">
        <h1 class="text-xl font-semibold">Faktur INV-2041</h1>
        <span class="text-sm text-slate-600">2026-11-25</span>
      </header>
      <!-- isi dokumen -->
    </article>
  </main>

  <div class="fixed bottom-4 right-4 print:hidden">...</div>

  <div role="status" class="print:hidden">...</div>
</body>
```

Arah sebaliknya sama pentingnya: elemen yang redundan di layar sering justru membawa identitas dokumen di atas kertas. `hidden print:flex` pada header print adalah pola standar — layar menampilkan informasi yang sama di chrome aplikasi, sementara versi kertas mendapat header yang mandiri.

### Langkah 3: Kontrol Paginasi Secara Eksplisit

Dokumen panjang adalah tempat CSS print naif gagal. Paginasi dikendalikan pada tiga tingkat: bab (paksa pemisah), unit atomik (jangan pernah dipotong), dan konten mengalir (orphans serta widows).

```css
@media print {
  .doc-section + .doc-section {
    break-before: page;
  }

  .doc-atomic,
  .doc-figure,
  .doc-signature {
    break-inside: avoid;
  }

  p,
  li {
    orphans: 3;
    widows: 3;
  }

  h2,
  h3 {
    break-after: avoid;
  }
}
```

Terapkan class atomik pada apa pun yang kehilangan makna saat terpotong: baris item faktur, chart beserta caption-nya, pasangan tanda tangan dan tanggal, kotak callout. `break-after: avoid` pada heading adalah perbaikan termurah untuk cacat klasik "judul bab di dasar halaman, isinya di halaman berikutnya".

Ketika sebuah bagian harus memulai halaman baru terlepas dari ruang yang tersedia, gunakan utilitasnya langsung di markup alih-alih selector CSS:

```html
<section class="doc-section print:break-before-page">
  <h2>Syarat pembayaran</h2>
</section>
```

### Langkah 4: Buka Konten yang Terlipat Sebelum Mencetak

Elemen `details`, accordion, dan panel tab mencetak state tersembunyinya — pembaca mendapat dokumen dengan bagian yang hilang. Perbaiki pada dua tingkat: paksa state terbuka di CSS, dan selesaikan state JS untuk komponen yang menyimpan flag terbuka di DOM.

```css
@media print {
  details > *:not(summary) {
    display: block;
  }

  details > summary {
    list-style: none;
    font-weight: 600;
  }

  [data-print-expand="true"] {
    display: block;
  }

  [role="tabpanel"][hidden] {
    display: block;
  }
}
```

CSS saja tidak cukup, karena sebagian library komponen menyembunyikan kembali konten pada tick render berikutnya. Pasangkan dengan langkah penyelesaian yang berjalan pada event print, agar DOM setuju dengan stylesheet:

```typescript
const expandForPrint = () => {
    document.querySelectorAll<HTMLDetailsElement>("details").forEach((el) => {
        el.dataset.printState = String(el.open);
        el.open = true;
    });

    document.querySelectorAll<HTMLElement>('[role="tabpanel"]').forEach((panel) => {
        panel.dataset.printState = String(panel.hidden);
        panel.hidden = false;
    });
};

const restoreAfterPrint = () => {
    document.querySelectorAll<HTMLElement>("[data-print-state]").forEach((el) => {
        if (el instanceof HTMLDetailsElement) {
            el.open = el.dataset.printState === "true";
        } else {
            el.hidden = el.dataset.printState === "true";
        }
        delete el.dataset.printState;
    });
};

window.addEventListener("beforeprint", expandForPrint);
window.addEventListener("afterprint", restoreAfterPrint);
```

Renderer PDF headless harus memanggil `expandForPrint()` secara eksplisit — `beforeprint` terpicu untuk pencetakan yang dimulai pengguna, bukan selalu untuk pembuatan PDF secara programatik.

### Langkah 5: Bangun Skala Warna dan Tipografi Aman Cetak

Palet layar disetel untuk display yang memancarkan cahaya. Di media cetak, hero `bg-slate-900` menjadi bidang hitam pekat, body copy `text-slate-400` menjadi tak terlihat, dan lapisan transparan memipih tak terprediksi. Definisikan token print sekali dan terapkan sebagai override tingkat komponen.

```css
@theme {
  --color-print-ink: #111827;
  --color-print-muted: #4b5563;
  --color-print-rule: #d1d5db;
  --color-print-accent: #1d4ed8;
}

@media print {
  .print-surface {
    background: #fff;
    color: var(--color-print-ink);
  }

  .print-muted {
    color: var(--color-print-muted);
  }

  .print-rule {
    border-color: var(--color-print-rule);
  }
}
```

Lalu terapkan di tempat yang styling layarnya salah saat dicetak:

```html
<div class="bg-slate-900 p-6 text-slate-100 print-surface print:border print-rule">
  <p class="text-slate-300 print-muted">Total tagihan</p>
  <p class="text-3xl font-bold print:text-2xl">Rp 4.250.000</p>
</div>
```

Gunakan `print-color-adjust: exact` secara sempit. Properti ini memaksa browser mempertahankan warna latar, yang benar untuk brand mark, badge status yang maknanya dibawa oleh warna, atau seri chart — dan salah di semua tempat lain, karena ia juga mempertahankan bidang gelap yang menghabiskan toner dan kabur di printer murah.

```css
@media print {
  .print-exact {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
```

### Langkah 6: Buat Tabel dan Data Grid Dapat Dicetak

Tabel adalah struktur cetak paling umum di aplikasi bisnis sekaligus sumber output rusak paling umum: header yang hanya muncul di halaman pertama, baris terpotong antar halaman, dan kolom yang terhimpit menjadi irisan tak terbaca.

```css
@media print {
  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }

  table.doc-table thead {
    display: table-header-group;
  }

  table.doc-table tfoot {
    display: table-footer-group;
  }

  table.doc-table tr {
    break-inside: avoid;
  }

  table.doc-table th,
  table.doc-table td {
    border-bottom: 1px solid var(--color-print-rule);
    padding: 4pt 6pt;
    text-align: left;
  }
}
```

`display: table-header-group` pada `thead` adalah yang membuat Chrome mengulang header kolom di setiap halaman — aturan paling bernilai di bagian ini. Pasangkan dengan `tfoot` untuk baris total yang harus muncul di halaman terakhir, dan hindari pembungkus scroll horizontal saat print: kontainer `overflow-x-auto` memotong kolom alih-alih menyusutkannya, jadi berikan lebar print eksplisit pada tabel.

```html
<div class="overflow-x-auto print:overflow-visible">
  <table class="doc-table w-full">
    <thead>
      <tr>
        <th class="w-1/2">Deskripsi</th>
        <th class="w-1/6 text-right">Qty</th>
        <th class="w-1/3 text-right">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      <tr class="print:break-inside-avoid">
        <td>Langganan platform tahunan</td>
        <td class="text-right">1</td>
        <td class="text-right">Rp 4.250.000</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Langkah 7: Tangani Gambar, Chart, dan Lazy Loading

Gambar lazy-loaded adalah penyebab paling sering kotak kosong di PDF hasil ekspor: gambar tidak pernah masuk viewport, browser tidak pernah mengambilnya, dan renderer PDF merasterisasi placeholder. Paksa eager loading pada apa pun di dalam dokumen yang dapat dicetak.

```html
<img
  src="/receipts/stamp.svg"
  alt="Stempel pembayaran terverifikasi"
  width="96"
  height="96"
  loading="eager"
  decoding="sync"
  class="print:max-w-[24mm]"
/>
```

Untuk chart, utamakan inline SVG alih-alih canvas. SVG berskala lossless pada resolusi kertas berapa pun dan mewarisi warna CSS, sementara elemen canvas dirasterisasi pada ukuran piksel layarnya dan tercetak kabur. Ketika chart harus tetap berbasis canvas, setel backing store berskala device pixel ratio sebelum render dan pertahankan legenda di dalam frame chart — pembaca versi cetak tidak bisa hover untuk memunculkan nama seri.

```css
@media print {
  .doc-figure img,
  .doc-figure svg {
    max-width: 100%;
    height: auto;
    break-inside: avoid;
  }

  .doc-figure figcaption {
    font-size: 9pt;
    color: var(--color-print-muted);
  }
}
```

### Langkah 8: Render PDF Secara Deterministik

Pembuatan dan styling adalah satu pipeline. Jalankan headless Chrome dengan dokumen yang sama, media print yang independen dari viewport, dan pengaturan eksplisit agar faktur yang dirender hari ini identik dengan yang dirender kuartal lalu.

```typescript
import puppeteer from "puppeteer";

const renderDocument = async (url: string, output: string) => {
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    await page.evaluate(() => {
        document.querySelectorAll<HTMLDetailsElement>("details").forEach((el) => {
            el.open = true;
        });
    });

    await page.pdf({
        path: output,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
        displayHeaderFooter: false,
    });

    await browser.close();
};
```

Tiga pengaturan mencegah ketidakcocokan paling umum. `printBackground: true` wajib, jika tidak setiap warna latar hilang diam-diam. `preferCSSPageSize: true` membuat `@page` menjadi otoritatif alih-alih opsi `format`, sehingga ukuran kertas berada di satu tempat. Margin nol eksplisit mencegah header dan footer bawaan Chrome menimpa konten yang Anda posisikan di margin box `@page`.

### Langkah 9: Otomatiskan Pemeriksaan Regresi Print di CI

Print stylesheet tanpa pengujian akan melenceng. Pastikan properti yang benar-benar rusak: jumlah halaman, keberadaan blok total, dan tidak adanya kolom tabel terpotong.

```bash
npx playwright install --with-deps chromium

node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('http://localhost:3000/invoices/INV-2041');await p.emulateMedia({media:'print'});await p.pdf({path:'/tmp/invoice.pdf',format:'A4',printBackground:true});await b.close();})()"

pdfinfo /tmp/invoice.pdf | grep -E "Pages|Page size"
pdftotext /tmp/invoice.pdf - | grep -c "Total tagihan"
```

Gerbangi berdasarkan output: gagal ketika jumlah halaman melebihi anggaran yang didokumentasikan untuk template tersebut, dan gagal ketika `pdftotext` tidak menemukan label total. Itu menangkap dua kegagalan yang benar-benar dilaporkan pelanggan — bagian yang hilang dan dokumen yang membengkak ke halaman tak terduga.

### Langkah 10: Verifikasi pada Berbagai Ukuran Kertas dan Locale

Stylesheet yang sama harus bertahan pada kertas Letter, locale dengan label lebih panjang (label faktur bahasa Jerman jauh lebih panjang daripada bahasa Inggris), dan pengaturan zoom browser. Periksa kedua ukuran kertas sebelum merilis.

```bash
node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('http://localhost:3000/invoices/INV-2041');await p.emulateMedia({media:'print'});await p.pdf({path:'/tmp/letter.pdf',format:'Letter',printBackground:true});await b.close();})()"

pdfinfo /tmp/letter.pdf | grep "Pages"
```

Jika Letter mengubah jumlah halaman, layout bergantung pada metrik tetap yang seharusnya relatif — biasanya kontainer `w-[210mm]` yang di-hard-code, atau `min-h` pada bagian yang disetel untuk tinggi konten A4. Ganti dengan sizing yang digerakkan konten dan biarkan `@page` menentukan kotak halaman.
