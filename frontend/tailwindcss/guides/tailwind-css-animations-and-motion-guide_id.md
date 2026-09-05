---
title: "Panduan Animasi dan Motion dengan Tailwind CSS"
description: "Panduan komprehensif untuk membangun sistem animasi dan motion kelas produksi dengan Tailwind CSS — mencakup design token motion, keyframes kustom, reveal berbasis scroll, entrance bertahap (stagger), integrasi Framer Motion, aksesibilitas reduced-motion, dan optimasi performa."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Animasi dan Motion dengan Tailwind CSS

## Pendahuluan

Motion adalah bagian yang tak terpisahkan dari desain antarmuka modern. Transisi masuk (entrance), mikro-interaksi, reveal saat scroll, dan status loading berperan menyampaikan hierarki, mengarahkan perhatian, serta membuat aplikasi terasa responsif dan rapi. Tailwind CSS menyediakan seperangkat kecil utilitas transisi dan animasi, tetapi membangun sistem motion kelas produksi membutuhkan lebih dari sekadar menaburkan `animate-pulse` ke elemen. Diperlukan design token yang disengaja, disiplin performa, kesadaran aksesibilitas, dan arsitektur yang jelas agar dapat berkembang melintasi komponen dan tim.

Panduan ini membahas persis hal-hal tersebut: cara mendefinisikan token motion (durasi, easing, delay) pada konfigurasi Tailwind, cara menyusun keyframes kustom dan utilitas animasi yang dapat digunakan ulang, cara menambahkan reveal berbasis scroll dan entrance bertahap dengan JavaScript yang minimal, cara mengintegrasikan Tailwind dengan pustaka animasi seperti Framer Motion ketika Anda membutuhkan orkestrasi atau motion berbasis gestur, serta cara menghormati preferensi pengguna melalui varian `motion-safe` dan `motion-reduce`. Panduan ini ditujukan bagi pengembang yang sudah memakai Tailwind CSS setiap hari dan ingin melompat dari "elemennya bergerak" menuju "motion-nya terasa dirancang dengan baik."

Kedua generasi framework dibahas pada bagian yang sintaksnya berbeda: Tailwind CSS v3 dengan berkas JavaScript `tailwind.config.js`, dan Tailwind CSS v4 dengan konfigurasi CSS-first `@theme`. Prinsip desainnya identik untuk keduanya; hanya sintaks pendefinisian token yang berbeda.

## Praktik Terbaik

### 1. Definikan Design Token Motion

Sama seperti Anda tidak akan menuliskan kode warna hex secara hard-code di seluruh markup, Anda juga tidak boleh menuliskan durasi, easing, atau delay animasi secara hard-code. Sentralkan semuanya sebagai token pada konfigurasi Tailwind agar setiap utilitas `duration-*`, `ease-*`, dan `delay-*` merujuk pada nilai bernama yang dapat ditinjau, bukan angka sembarangan. Skala motion yang kecil mencegah penyimpangan umum di mana satu pengembang memakai `duration-300`, pengembang lain memakai `duration-500`, dan pengembang ketiga menulis `style="transition: all 0.35s"` secara inline.

Pada v3, perluas bagian `transitionDuration`, `transitionTimingFunction`, dan `transitionDelay` pada `tailwind.config.js`. Pada v4, utilitas tersebut digerakkan oleh variabel CSS seperti `--transition-duration-*` dan `--ease-*` di dalam blok `@theme`. Jaga skalanya tetap kecil — tiga atau empat durasi dan dua atau tiga easing biasanya sudah cukup:

```javascript
// tailwind.config.js (v3)
export default {
  theme: {
    extend: {
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "400ms",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDelay: {
        none: "0ms",
        short: "60ms",
      },
    },
  },
};
```

```css
/* app.css (v4) */
@theme {
  --transition-duration-fast: 120ms;
  --transition-duration-base: 200ms;
  --transition-duration-slow: 400ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

Kurva `cubic-bezier(0.22, 1, 0.36, 1)` adalah kurva bergaya "ease-out-expo": bergerak cepat di awal lalu melambat dengan mulus, sehingga terasa responsif tanpa terkesan mekanis. Hindari `ease` bawaan untuk motion UI yang halus — kurva ease-in-out yang simetris membuat transisi kecil terasa lamban.

### 2. Animasi Hanya Transform dan Opacity

Aturan performa paling berdampak untuk animasi web adalah hanya menganimasikan `transform` dan `opacity`. Kedua properti ini dapat ditangani sepenuhnya di thread kompositor GPU pada peramban modern, tanpa memicu layout atau paint di thread utama. Menganimasikan `width`, `height`, `top`, `left`, `margin`, atau `padding` memaksa peramban menghitung ulang layout setiap frame, yang menyebabkan jank pada perangkat kelas bawah dan stutter saat scroll di perangkat mana pun.

Terjemahkan aturan ini ke istilah Tailwind: perluas dan ciutkan panel dengan `scale-*` atau `opacity-*` plus utilitas `transform`, posisikan dengan `translate-*` alih-alih `top`/`left`, dan ganti progress bar berbasis lebar dengan `scale-x-*`. Untuk animasi ciutkan tinggi, ukur tinggi konten dengan JavaScript, jepit nilainya, lalu animasikan transform — atau terima perubahan layout singkat di awal dan akhir transisi daripada menganimasikan properti layout frame demi frame.

```html
<!-- Pilih ini: hanya transform + opacity -->
<div class="transition duration-base ease-out data-[open]:scale-100 data-[open]:opacity-100 scale-95 opacity-0">
  ...
</div>

<!-- Hindari ini: menganimasikan properti layout -->
<div class="transition-all duration-base h-0 overflow-hidden data-[open]:h-48">
  ...
</div>
```

### 3. Hormati Skala Durasi dan Easing

Performa yang dirasakan adalah fungsi dari pengaturan waktu, bukan sekadar kecepatan. Jaga mikro-interaksi — hover, focus ring, tekanan tombol, toggle checkbox — antara 100 ms dan 200 ms agar terasa instan. Cadangkan ujung skala yang lebih panjang (300-500 ms) untuk transisi yang lebih besar seperti entrance modal, transisi halaman, atau geser drawer yang perlu waktu bagi mata untuk mengikuti.

Sesuaikan easing dengan jenis motion. Elemen yang memasuki viewport paling baik dengan kurva deselerasi (`ease-out`): mulai cepat lalu mendarat. Elemen yang keluar paling baik dengan kurva akselerasi (`ease-in`): pergi cepat lalu memudar. Elemen yang bergerak di antara dua keadaan terlihat menggunakan kurva simetris. Utilitas `ease-out`, `ease-in`, `ease-in-out`, dan `linear` bawaan Tailwind mencakup dasar-dasarnya, dan token `--ease-*` kustom Anda mencakup sisanya.

### 4. Gunakan Varian motion-safe dan motion-reduce

Tailwind menyediakan dua varian yang langsung memetakan ke media query `prefers-reduced-motion`: `motion-safe:` menerapkan gaya ketika pengguna TIDAK meminta reduced motion, dan `motion-reduce:` menerapkan gaya ketika pengguna MEMINTA-nya. Gunakan `motion-safe:` untuk mengikutsertakan animasi secara default dan `motion-reduce:` untuk menyediakan fallback yang diam.

Pola terbersih adalah membangun keadaan diam (resting state) sebagai default yang dapat diakses, lalu melapisi motion di atasnya dengan `motion-safe:`. Pada contoh di bawah, elemen terlihat secara default dan hanya beranimasi (memudar dan bergeser) bagi pengguna yang mengizinkan motion — pengalaman reduced-motion tidak kehilangan apa pun kecuali hiasan:

```html
<div class="motion-safe:animate-fade-in-up">
  Banner pengumuman
</div>
```

Ini kebalikan dari pendekatan yang umum namun rawan salah: menerapkan animasi tanpa syarat lalu mencoba membatalkannya dengan `motion-reduce:animate-none`. Ketika `animate-none` diterapkan, elemen tetap melompat dari keadaan sebelum animasi ke keadaan akhir — ia tidak menunggu di keyframe "tersembunyi". Merancang keadaan diam sebagai keadaan akhir terlebih dahulu menghindari kedipan itu sepenuhnya.

### 5. Ingat Kompositor

Ketika animasi hanya berisi transform dan opacity, peramban dapat menyerahkan lapisan yang dianimasikan ke kompositor. Agar serah terima itu berhasil, hindari properti yang memaksa lapisan di-raster ulang: box shadow, border, gradient, dan rendering teks semuanya dapat memicu paint ketika berubah. Jika Anda harus menganimasikan shadow, anggap shadow sebagai elemen statis dan animasikan overlay opacity — pudarkan elemen shadow yang sudah di-render alih-alih menganimasikan nilai `shadow-*`.

Hindari juga menganimasikan properti pada leluhur yang memaksa repaint pada turunan. Jaga elemen yang dianimasikan tetap dangkal di pohon DOM jika memungkinkan, dan untuk permukaan animasi yang besar atau saling tumpang tindih, kelompokkan sehingga peramban mengomposit sekali, bukan per elemen.

### 6. Gunakan will-change Sebagai Opsi Terakhir

Properti `will-change` adalah petunjuk yang memberi tahu peramban untuk menyiapkan lapisan bagi animasi di masa depan. Ini bukan peningkatan performa gratis: setiap lapisan `will-change` mengonsumsi memori GPU, dan terlalu banyak lapisan justru menurunkan performa yang ingin Anda tingkatkan. Terapkan hanya pada elemen yang akan segera beranimasi, hapus ketika animasi selesai, dan jangan pernah menerapkannya ke lebih dari segelintir elemen sekaligus.

Di Tailwind, `will-change-transform` dan `will-change-opacity` tersedia sebagai utilitas. Pola pragmatisnya: tambahkan utilitas saat interaksi dimulai (misalnya ketika dialog hendak dibuka) dan hapus setelah transisi berakhir. Untuk sebagian besar animasi berskala UI, heuristik bawaan peramban sudah memadai — gunakan `will-change` hanya ketika profiling menunjukkan adanya kegagalan komposit.

### 7. Pilih Alat yang Tepat: CSS vs. Pustaka JavaScript

Utilitas CSS Tailwind mencakup porsi besar motion produksi: mikro-interaksi hover dan focus, entrance sederhana, loop keyframes, bahkan reveal saat scroll dengan beberapa baris JavaScript. Sebelum menambahkan dependensi, tanyakan apakah motion membutuhkan orkestrasi (sekuens, stagger, timeline terkoordinasi), pelacakan gestur (drag, swipe), atau animasi yang sadar layout (transisi elemen bersama). Jika jawabannya tidak, CSS adalah alat yang lebih baik: lebih murah, lebih tangguh, dan tidak pernah menghambat hydrasi.

Ketika Anda benar-benar membutuhkan orkestrasi — misalnya Framer Motion, pilihan paling umum di proyek React — aturan arsitektur utamanya adalah menggunakan Tailwind untuk semua yang statis (layout, spasi, tipografi, dan keadaan non-animasi) dan membiarkan pustaka motion hanya memiliki nilai yang dianimasikan. Ini menjaga design system Anda di satu tempat sekaligus memberi pustaka kendali penuh atas timeline animasi:

```tsx
import { motion } from "framer-motion";

export function Toast({ message }: { message: string }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      {message}
    </motion.div>
  );
}
```

Desain visual tetap berada di daftar kelas; hanya nilai motion yang hidup di props. Ini adalah pemisahan tanggung jawab yang paling bersih dan menjadi pola yang dibangun panduan ini selanjutnya.

### 8. Jadikan Motion Aksesibel dan Terdegradasi dengan Mulus

Motion tidak boleh menjadi satu-satunya sinyal bahwa sesuatu berubah. Jika sebuah elemen muncul, elemen itu harus muncul bahkan ketika animasi dimatikan; jika keadaan error meluncur masuk, gaya error harus hadir pada keadaan diam. Hal yang sama berlaku untuk konten yang dibacakan oleh screen reader — jangan pernah hanya mengandalkan `animate-ping` atau titik berkedip untuk menyampaikan "memuat."

Hormati `prefers-reduced-motion` secara global, yang mudah dilakukan dengan varian `motion-reduce:` milik Tailwind. Untuk motion esensial yang menyampaikan keadaan nyata (spinner selama permintaan jaringan), pertahankan tetapi buat halus; untuk motion dekoratif (parallax, confetti, entrance hero besar), nonaktifkan sepenuhnya. Uji dengan pengaturan reduced-motion sistem operasi aktif dan pastikan halaman tetap dapat digunakan sepenuhnya tanpa animasi.

### 9. Ukur Performa di Peramban

Perlakukan performa animasi sebagai properti yang dapat diukur, bukan sekadar kesan. Buka DevTools Performance, rekam beberapa detik interaksi yang dianimasikan pada profil perangkat kelas menengah, dan perhatikan task thread utama yang panjang, kerja layout dan paint selama frame animasi, serta frame yang jatuh pada FPS meter. Opsi "Paint flashing" pada tab Rendering memperlihatkan batas repaint, dan inspector Animations memungkinkan Anda menelusuri serta men-debug animasi CSS secara interaktif.

Anggaran yang praktis: animasi UI harus berjalan pada 60 fps tanpa frame jatuh dengan CPU yang dibatasi (pelambatan 4x), dan total durasi tidak boleh menghalangi interaksi — pengguna harus tetap bisa mengklik tombol sementara transisi masih berlangsung. Jika sebatang pohon elemen beranimasi bersama, periksa biaya frame per elemen; stagger yang terlihat baik dengan sepuluh item bisa membuat ponsel kelas bawah tersendat dengan lima puluh item.

## Langkah Implementasi

### Langkah 1: Definikan Token Motion pada Konfigurasi

Mulailah dengan mendefinisikan skala motion pada konfigurasi Tailwind agar setiap animasi di basis kode berbagi durasi dan easing yang sama. Pada v3, tambahkan token di bawah `theme.extend`; pada v4, tambahkan ke blok `@theme` seperti yang ditunjukkan pada Praktik Terbaik 1. Sertakan keyframes dan nama animasi yang akan Anda rujuk dari utilitas:

```javascript
// tailwind.config.js (v3)
export default {
  theme: {
    extend: {
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "400ms",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 400ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
};
```

```css
/* app.css (v4) */
@theme {
  --animate-fade-in-up: fade-in-up 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
  --animate-shimmer: shimmer 1.5s infinite;

  @keyframes fade-in-up {
    0% { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }
}
```

Perhatikan fill mode `both` pada animasi entrance: ia menerapkan keyframe `0%` selama fase delay (jika ada) dan menahan keyframe `100%` setelah animasi berakhir, sehingga elemen tidak berkedip sebelum animasi dimulai atau menyentak kembali setelahnya. Satu kata kunci ini mencegah sebagian besar bug "elemen berkedip."

### Langkah 2: Susun Utilitas Animasi yang Dapat Digunakan Ulang

Setelah animasi didefinisikan, beri nama semantik dan gunakan kembali sebagai utilitas. Tailwind memungkinkan Anda mendaftarkan utilitas kustom dengan `@utility` (v4) atau `@layer utilities` (v3). Mengelompokkan animasi terkait ke dalam sekumpulan kecil utilitas bernama menjaga markup tetap mudah dibaca dan memudahkan perubahan seluruh bahasa motion di satu tempat:

```css
/* app.css (v4) — utilitas motion yang dapat digunakan ulang */
@utility animate-enter {
  animation: fade-in-up 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@utility animate-shimmer-sweep {
  position: relative;
  overflow: hidden;
}

@utility animate-shimmer-sweep::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.4), transparent);
  animation: shimmer 1.5s infinite;
}
```

```html
<div class="animate-enter">Kartu hero</div>
<div class="animate-shimmer-sweep">Skeleton pemuatan</div>
```

Jaga jumlah utilitas kustom tetap kecil — maksimal sekitar selusin. Jika sebuah utilitas mulai menerima opsi konfigurasi, itu adalah sinyal bahwa motion tersebut membutuhkan komponen (lihat Langkah 3) alih-alih modifier.

### Langkah 3: Bangun Komponen Reveal yang Dapat Digunakan Ulang dengan IntersectionObserver

Untuk reveal berbasis scroll, pendekatan standarnya adalah `IntersectionObserver` yang menambahkan atribut data "visible" ketika elemen memasuki viewport, dikombinasikan dengan varian Tailwind yang bertransisi dari keadaan tersembunyi ke keadaan terlihat. Ini menjaga animasi tetap di CSS dan pemicunya di beberapa baris JavaScript.

```tsx
// Reveal.tsx — pembungkus reveal berbasis scroll yang dapat digunakan ulang
import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.dataset.visible = "true";
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className="opacity-0 translate-y-4 transition duration-base ease-out motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none data-[visible=true]:opacity-100 data-[visible=true]:translate-y-0"
    >
      {children}
    </div>
  );
}
```

```tsx
// Penggunaan
<Reveal delay={50}><FeatureCard title="Cepat" /></Reveal>
```

Keadaan diamnya sepenuhnya terlihat (`opacity-100`) di bawah `motion-reduce:`, sehingga pengguna reduced-motion mendapatkan konten tanpa animasi dan tanpa kedipan. Ambang batas dan root margin negatif membuat reveal terpicu sedikit sebelum elemen sepenuhnya berada di layar, yang terasa lebih alami daripada menunggu visibilitas penuh.

### Langkah 4: Tambahkan Entrance Bertahap dan Transisi Daftar

Stagger memberi daftar dan grid rasa koreografi. Simpan stagger di lapisan komponen: setiap item membaca indeksnya dari prop `delay` (dikalikan interval dasar) dan menerapkannya sebagai `transition-delay`. Karena delay diterapkan dengan gaya inline, item tetap beranimasi dalam satu urutan mulus bahkan ketika panjang daftar berubah.

```tsx
// StaggerGroup.tsx
import { Reveal } from "./Reveal";

export function StaggerGroup({ items }: { items: string[] }) {
  const BASE_INTERVAL_MS = 80; // langkah stagger, dibatasi untuk daftar panjang
  const step = Math.min(BASE_INTERVAL_MS, 400 / Math.max(items.length, 1));

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <li key={item}>
          <Reveal delay={index * step}>
            <div className="rounded-xl border border-slate-200 p-4">{item}</div>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
```

Membatasi total stagger hingga sekitar 400 ms menjaga urutannya tetap terasa disengaja tanpa membuat item terakhir menunggu terlalu lama. Untuk daftar yang sering dipasang dan dilepas (tumpukan toast, baki notifikasi), lebih baik gunakan fitur `layout` dan `AnimatePresence` dari pustaka motion, yang menangani koreografi masuk/keluar dan reflow dengan lebih tangguh daripada CSS buatan tangan (lihat Langkah 5).

### Langkah 5: Integrasikan Framer Motion untuk Sekuens yang Terorkestrasi

Ketika motion membutuhkan orkestrasi — sekuens di mana satu elemen bergerak, menunggu, lalu elemen lain menyusul, atau transisi masuk/keluar dengan pergerakan elemen bersama — CSS buatan tangan mencapai batasnya. Framer Motion (atau padanan yang sesuai framework) menyediakan timeline, propagasi variants, gestur drag, dan `AnimatePresence` untuk animasi keluar.

Gunakan pembagian tanggung jawab dari Praktik Terbaik 7: Tailwind memiliki desain statis, pustaka memiliki motion. Prop `variants` memungkinkan orkestrasi melalui stagger children tanpa timer imperatif:

```tsx
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export function ResultsGrid({ results }: { results: string[] }) {
  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2"
    >
      {results.map((result) => (
        <motion.li
          key={result}
          variants={item}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          {result}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

Karena siklus hidup masuk/keluar (`AnimatePresence`) dikelola oleh pustaka, menghapus item dari daftar memainkan animasi keluar sebelum node DOM dihapus — sesuatu yang tidak dapat diungkapkan oleh utilitas CSS murni tanpa mesin state tambahan.

### Langkah 6: Terapkan Fallback Reduced-Motion

Terapkan strategi reduced-motion di tingkat global dan audit setiap komponen yang beranimasi. Aturan stylesheet global dapat menetralkan motion dekoratif di satu tempat:

```css
/* app.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Aturan tumpul ini adalah jaring pengaman yang sangat baik: ia memampatkan semua animasi dan transisi CSS menjadi hampir instan, persis seperti kontrak reduced-motion. Audit pengecualian dengan sengaja — spinner fungsional dapat ikut kembali dengan override bergaya `motion-reduce:animate-spin` — dan verifikasi di DevTools dengan mengemulasi `prefers-reduced-motion: reduce` bahwa setiap konten tetap hadir dan terbaca dengan animasi mati.

### Langkah 7: Profil dan Optimalkan

Akhiri dengan mengukur. Buka DevTools Performance pada CPU yang dibatasi, rekam skenario utama — pemuatan halaman awal, scroll melewati bagian yang sarat reveal, membuka dan menutup modal, serta daftar yang sarat stagger — dan periksa frame yang jatuh serta thrashing layout. Dua pemeriksaan terarah menangkap regresi yang paling umum:

- Gunakan "Paint flashing" pada tab Rendering untuk memastikan elemen yang dianimasikan tidak me-repaint seluruh subpohonnya setiap frame.
- Gunakan inspector Animations untuk menelusuri setiap animasi dan mengonfirmasi easing serta durasi sesuai token Anda (tidak ada `linear` liar pada entrance, tidak ada hover 800 ms).

Jika profiling menunjukkan jank, perbaikan yang biasa dilakukan secara berurutan adalah: ubah animasi yang bermasalah menjadi transform/opacity (Praktik Terbaik 2), kurangi jumlah lapisan yang beranimasi bersamaan (Praktik Terbaik 5), batasi total stagger (Langkah 4), dan baru kemudian pertimbangkan petunjuk `will-change` (Praktik Terbaik 6). Profil ulang setelah setiap perubahan; sistem motion hanya sebaik anggaran frame yang terukur.
