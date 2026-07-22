---
title: "Panduan Mode Gelap dan Tema untuk Tailwind CSS"
description: "Panduan komprehensif untuk mengimplementasikan mode gelap dan arsitektur multi-tema dengan Tailwind CSS — mencakup pemilihan strategi, pengorganisasian design token, deteksi preferensi pengguna, persistensi tema, dan pola CSS custom property tingkat lanjut."
category: "frontend"
technology: "tailwindcss"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Mode Gelap dan Tema untuk Tailwind CSS

## Pendahuluan

Mode gelap telah berevolusi dari fitur aksesibilitas khusus menjadi ekspektasi dasar pengguna dalam aplikasi web modern. Pengguna mengharapkan aplikasi untuk menghormati preferensi sistem mereka, menawarkan opsi manual, dan bertransisi dengan mulus antar tema tanpa kilatan konten yang tidak bergaya. Pada saat yang sama, platform SaaS multi-penyewa dan produk white-label membutuhkan tema dinamis yang jauh melampaui sakelar terang/gelap sederhana.

Tailwind CSS menyediakan primitif yang sangat baik untuk pembuatan tema — varian `dark:`, integrasi CSS custom property, dan `tailwind.config.js` yang sangat dapat dikonfigurasi — tetapi menyatukan potongan-potongan ini menjadi sistem tema kelas produksi membutuhkan arsitektur yang disengaja. Pendekatan naif yang menaburkan prefiks `dark:` di mana-mana berfungsi untuk proyek kecil tetapi menjadi tidak terkelola saat permukaan tema berkembang menjadi tiga, empat, atau lebih skema warna.

Panduan ini mencakup spektrum lengkap pembuatan tema dengan Tailwind CSS: dari memilih strategi mode gelap yang tepat untuk proyek Anda, melalui pengorganisasian design token sebagai CSS custom property, hingga membangun sistem multi-tema tingkat lanjut dengan persistensi, reaktivitas preferensi sistem, dan transisi yang mulus. Baik Anda menambahkan dukungan mode gelap ke situs pemasaran atau membangun platform white-label yang mendukung lusinan tema merek, pola-pola ini akan membantu Anda mempertahankan arsitektur tema yang bersih dan dapat diskalakan.

## Praktik Terbaik

### Pilih Strategi Mode Gelap yang Tepat

Tailwind CSS mendukung dua strategi mode gelap bawaan: `media` dan `class`. Pilihan Anda memiliki konsekuensi yang luas untuk arsitektur tema Anda.

**Gunakan `darkMode: 'class'` untuk sebagian besar proyek.** Strategi `media` (default) mengikuti media query `prefers-color-scheme` sistem operasi. Ini tidak memerlukan JavaScript dan merupakan opsi paling sederhana, tetapi tidak memberikan pengguna cara untuk mengesampingkan preferensi sistem mereka — pengalaman yang membuat frustrasi bagi pengguna yang menginginkan mode gelap di siang hari atau mode terang di malam hari. Strategi `class` mengaktifkan mode gelap dengan menambahkan kelas `dark` ke elemen induk (biasanya `<html>` atau `<body>`), memberi Anda kendali programatik penuh. Kecuali proyek Anda benar-benar tidak dapat memuat JavaScript, pilih strategi `class`.

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ... konfigurasi lainnya
};
```

**Hormati preferensi sistem sebagai default.** Saat menggunakan strategi `class`, query `prefers-color-scheme` pada muatan awal dan atur kelas `dark` sesuai. Ini memastikan pengguna melihat tema yang mereka harapkan pada kunjungan pertama mereka:

```javascript
// Terapkan kelas dark sebelum halaman dirender untuk mencegah flash
if (localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') &&
     window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
```

**Cegah flash tema yang salah dengan skrip inline.** Cuplikan di atas harus berjalan sinkron di dalam `<head>` sebelum CSS apa pun dimuat. Tempatkan dalam tag `<script>` inline untuk mencegah flash konten tidak bergaya (FOUC) yang terjadi saat halaman dirender dalam mode terang sebelum JavaScript beralih ke gelap:

```html
<!DOCTYPE html>
<html>
<head>
  <script>
    // Berjalan sebelum paint — tidak ada flash
    if (localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') &&
         window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  </script>
  <!-- Stylesheets -->
</head>
```

### Organisir Design Token sebagai CSS Custom Property

Menulis nilai warna secara langsung di kelas `dark:` menggabungkan setiap elemen UI ke nilai tema tertentu, membuatnya melelahkan untuk menambahkan tema ketiga atau menyesuaikan palet warna secara global. Sebaliknya, tetapkan token tema Anda sebagai CSS custom property pada selektor bertema dan referensikan variabel tersebut di konfigurasi Tailwind Anda.

Pendekatan ini, yang dikenal sebagai **pola tema CSS variable**, memisahkan markup komponen Anda dari nilai warna tertentu. Komponen menggunakan nama variabel semantik seperti `bg-primary` atau `text-body`, dan setiap tema mendefinisikan apa yang dihasilkan oleh variabel tersebut.

```css
/* styles/themes.css */
@layer base {
  :root {
    /* Tema terang (default) */
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f9fafb;
    --color-bg-tertiary: #f3f4f6;
    --color-text-primary: #111827;
    --color-text-secondary: #4b5563;
    --color-text-muted: #9ca3af;
    --color-border-default: #d1d5db;
    --color-border-hover: #9ca3af;
    --color-accent: #3b82f6;
    --color-accent-hover: #2563eb;
    --color-accent-text: #ffffff;
    --color-surface: #ffffff;
    --color-surface-hover: #f9fafb;
    --color-danger: #ef4444;
    --color-success: #22c55e;
    --color-warning: #f59e0b;
  }

  .dark {
    /* Tema gelap */
    --color-bg-primary: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-bg-tertiary: #334155;
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #64748b;
    --color-border-default: #475569;
    --color-border-hover: #64748b;
    --color-accent: #60a5fa;
    --color-accent-hover: #93c5fd;
    --color-accent-text: #0f172a;
    --color-surface: #1e293b;
    --color-surface-hover: #334155;
    --color-danger: #f87171;
    --color-success: #4ade80;
    --color-warning: #fbbf24;
  }
}
```

Kemudian perluas konfigurasi Tailwind Anda untuk menggunakan variabel-variabel ini:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      backgroundColor: {
        primary: 'var(--color-bg-primary)',
        secondary: 'var(--color-bg-secondary)',
        tertiary: 'var(--color-bg-tertiary)',
      },
      textColor: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
      },
      borderColor: {
        DEFAULT: 'var(--color-border-default)',
        hover: 'var(--color-border-hover)',
      },
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          text: 'var(--color-accent-text)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
        },
      },
    },
  },
};
```

Sekarang komponen Anda menggunakan kelas warna semantik yang secara otomatis beradaptasi dengan tema aktif:

```html
<div class="bg-primary text-primary border rounded-lg p-6">
  <h2 class="text-accent">Judul bertema</h2>
  <p class="text-secondary">Teks ini beradaptasi dengan tema terang dan gelap secara otomatis.</p>
</div>
```

**Manfaat dari pendekatan ini:**
- Menambahkan tema ketiga tidak memerlukan perubahan markup — cukup selektor CSS baru (misalnya, `.high-contrast`)
- Penyesuaian warna terpusat di satu file CSS, bukan tersebar di seluruh komponen
- Prefiks `dark:` jarang diperlukan dalam markup komponen karena variabel menangani peralihan
- CSS custom property mengalir secara alami, memungkinkan override tema bersarang

### Gunakan Nama Warna Semantik, Bukan Nama Visual

Kesalahan umum dalam sistem tema adalah menamai warna berdasarkan penampilan visualnya dalam satu tema — `bg-gray-100` dalam mode terang dipetakan ke `bg-gray-800` dalam mode gelap, membutuhkan override `dark:` eksplisit di mana-mana. Sebaliknya, beri nama warna berdasarkan **tujuan** dalam sistem desain Anda:

| Nama Visual (Hindari) | Nama Semantik (Disarankan) | Tujuan |
|---|---|---|
| `bg-white` / `dark:bg-gray-900` | `bg-primary` | Latar belakang halaman utama |
| `text-gray-900` / `dark:text-gray-100` | `text-primary` | Teks tubuh utama |
| `bg-gray-50` / `dark:bg-gray-800` | `bg-secondary` | Latar belakang kartu atau sidebar |
| `border-gray-200` / `dark:border-gray-700` | `border-default` | Batas standar |
| `text-blue-600` / `dark:text-blue-400` | `text-accent` | Tautan dan elemen interaktif |

Konvensi penamaan ini diskalakan secara alami ke tiga tema atau lebih karena setiap tema mendefinisikan pemetaannya sendiri dari nama semantik ke warna aktual, menghilangkan rantai varian `dark:`, `high-contrast:`, atau `sepia:` dalam kode komponen.

### Utamakan Pendekatan CSS Variable Dibandingkan Toggle Palet Warna Default Tailwind

Palet default Tailwind sudah menyertakan nuansa gelap untuk setiap warna — `gray-900`, `blue-800`, dll. Beberapa pengembang mencoba membuat tema dengan menukar seluruh palet warna dalam konfigurasi:

```javascript
// Hindari pola ini — tidak dapat diskalakan
module.exports = {
  theme: {
    colors: {
      gray: {
        100: 'var(--gray-100)',
        900: 'var(--gray-900)',
        // ...
      },
    },
  },
};
```

Pendekatan ini gagal karena tiga alasan. Pertama, ini membutuhkan pendefinisian ulang seluruh palet warna Tailwind untuk setiap tema, yang rapuh dan menduplikasi ratusan baris. Kedua, kelas utilitas seperti `bg-gray-100` kehilangan makna intuitifnya — dalam mode gelap, `bg-gray-100` mungkin menghasilkan abu-abu gelap, membingungkan pengembang yang membaca markup. Ketiga, pendekatan ini tidak dapat hidup berdampingan dengan palet warna default Tailwind, membuat pustaka komponen pihak ketiga yang menggunakan kelas Tailwind terlihat salah dalam mode gelap.

**Pendekatan CSS custom property (dijelaskan di atas) menghindari ketiga masalah tersebut.** Ini menjaga palet default tetap utuh untuk pustaka komponen dan prototipe sambil menambahkan lapisan semantik terpisah untuk komponen bertema. Gunakan `bg-gray-100` untuk kebutuhan utilitas yang tidak bertema dan `bg-primary` untuk komponen sistem desain bertema.

### Tangani Bagian Tema Bersarang

Tidak setiap bagian aplikasi Anda harus mewarisi tema global. Pertimbangkan skenario tema bersarang yang umum ini:

- Editor kode yang selalu menggunakan latar belakang gelap terlepas dari tema halaman
- Pratinjau panel pengaturan yang menunjukkan tampilan tema terang
- Bagian halaman pemasaran dengan skema warna terbalik

Untuk kasus ini, gunakan kelas tema terlingkup yang menimpa CSS custom property secara lokal:

```css
/* Bagian terbalik — selalu berlawanan dengan tema induk */
.theme-inverse {
  --color-bg-primary: var(--color-bg-primary-inverse);
  --color-text-primary: var(--color-text-primary-inverse);
  /* ... */
}

/* Bagian paksa-terang */
.theme-light {
  --color-bg-primary: #ffffff;
  --color-text-primary: #111827;
  /* ... timpa semua token ke nilai terang */
}
```

Karena CSS custom property mengalir, komponen di dalam `.dark .theme-light` mewarisi nilai variabel `.theme-light`, secara efektif memaksa mode terang:

```html
<body class="dark">
  <!-- Bagian ini mengikuti tema global gelap -->
  <header class="bg-primary text-primary">...</header>

  <!-- Pratinjau ini selalu menampilkan mode terang, bahkan dalam tema gelap -->
  <section class="theme-light bg-primary text-primary rounded-lg p-6">
    <p>Pratinjau ini menunjukkan tampilan halaman dalam mode terang.</p>
  </section>
</body>
```

### Kelola Preferensi Pengguna dengan Media Query `prefers-color-scheme`

API `matchMedia` menyediakan cara yang bersih untuk bereaksi terhadap perubahan tema tingkat sistem saat pengguna menjelajah:

```javascript
const themeToggle = document.getElementById('theme-toggle');
const userPreference = localStorage.getItem('theme');

// Atur tema awal berdasarkan preferensi atau sistem
if (userPreference === 'dark' ||
    (!userPreference && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

// Dengarkan perubahan tema tingkat OS saat pengguna berada di halaman
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  // Hanya alihkan otomatis jika pengguna belum menetapkan preferensi eksplisit
  if (!localStorage.getItem('theme')) {
    if (event.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
});

// Toggle manual dengan persistensi
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});
```

**Prinsip UX penting**: Preferensi pengguna eksplisit (disimpan di `localStorage`) harus selalu menimpa preferensi sistem. Hanya alihkan otomatis saat pengguna belum membuat pilihan eksplisit. Ini menghormati otonomi pengguna sambil memberikan default yang masuk akal.

### Terapkan Transisi Tema yang Halus

Peralihan tema yang mendadak terasa mengagetkan. Tambahkan transisi CSS pada properti bertema sehingga peralihan antara mode terang dan gelap bertransisi dengan mulus:

```css
/* styles/transitions.css */
html {
  transition: background-color 0.3s ease, color 0.3s ease;
}

*,
*::before,
*::after {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-duration: 0.3s;
  transition-timing-function: ease;
}
```

**Catatan kinerja**: Mentransisikan `background-color` dan `color` hanya memicu repaint, bukan layout, sehingga dampak kinerjanya dapat diabaikan. Hindari mentransisikan `box-shadow` atau `filter` pada elemen besar selama peralihan tema, karena properti ini lebih mahal secara komputasi.

**Hindari transisi saat muatan halaman**: Terapkan gaya transisi hanya setelah tema awal ditetapkan untuk mencegah transisi yang terlihat dari tema terang default pada muatan pertama:

```javascript
// Hapus kelas no-transitions setelah tema diterapkan
// Ini mencegah transisi menyala saat muatan halaman
document.documentElement.classList.remove('no-transitions');
```

```css
/* Cegah transisi saat muatan halaman */
html.no-transitions *,
html.no-transitions *::before,
html.no-transitions *::after {
  transition-duration: 0s !important;
}
```

```html
<script>
  // Tambahkan no-transitions sebelum tema ditetapkan
  document.documentElement.classList.add('no-transitions');
  // Atur tema...
  if (localStorage.getItem('theme') === 'dark' || ...) {
    document.documentElement.classList.add('dark');
  }
  // Hapus no-transitions setelah tema diterapkan
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('no-transitions');
  });
</script>
```

## Langkah Implementasi

### Langkah 1: Konfigurasi Strategi Mode Gelap

1. Atur `darkMode: 'class'` di `tailwind.config.js` Anda untuk mengaktifkan kendali programatik atas peralihan tema:

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
```

1. Verifikasi konfigurasi dengan menjalankan alat build Anda. Tailwind seharusnya tidak mengeluarkan kesalahan tentang opsi `darkMode`.

1. Tambahkan kelas uji di komponen Anda untuk mengonfirmasi bahwa varian `dark:` berfungsi:

```html
<div class="bg-white dark:bg-gray-800 p-4">
  <p class="text-gray-900 dark:text-gray-100">Uji toggle tema</p>
</div>
```

1. Tambahkan kelas `dark` secara manual ke `<html>` di DevTools browser Anda. Komponen uji harus segera beralih ke warna gelap.

### Langkah 2: Buat Lapisan CSS Tema

1. Buat file `styles/themes.css` yang mendefinisikan CSS custom property untuk tema terang dan gelap:

```css
/* styles/themes.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f9fafb;
    --color-text-primary: #111827;
    --color-text-secondary: #4b5563;
    --color-text-muted: #9ca3af;
    --color-border-default: #d1d5db;
    --color-accent: #3b82f6;
    --color-accent-hover: #2563eb;
    --color-surface: #ffffff;
  }

  .dark {
    --color-bg-primary: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #64748b;
    --color-border-default: #475569;
    --color-accent: #60a5fa;
    --color-accent-hover: #93c5fd;
    --color-surface: #1e293b;
  }
}
```

1. Impor `themes.css` di titik masuk CSS utama Anda, menggantikan impor directive Tailwind sebelumnya:

```css
/* styles/globals.css */
@import './themes.css';
```

1. Perluas konfigurasi Tailwind Anda untuk memetakan kelas utilitas ke CSS custom property:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundColor: {
        primary: 'var(--color-bg-primary)',
        secondary: 'var(--color-bg-secondary)',
      },
      textColor: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
      },
      borderColor: {
        DEFAULT: 'var(--color-border-default)',
      },
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
        },
      },
    },
  },
};
```

### Langkah 3: Implementasikan Toggle Tema dengan Persistensi

1. Buat komponen toggle tema yang membaca dan menulis `localStorage`:

```javascript
// components/ThemeToggle.js
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);

    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-secondary text-primary border hover:border-hover transition-colors"
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
```

1. Tambahkan skrip pencegahan flash inline ke `<head>` HTML Anda:

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <script>
    (function() {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>
  <!-- Elemen head lainnya -->
</head>
```

1. Untuk proyek Next.js, tempatkan skrip pencegahan flash di `next/script` dengan `strategy="beforeInteractive"` atau gunakan `_document.js` kustom:

```javascript
// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var theme = localStorage.getItem('theme');
                    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                      document.documentElement.classList.add('dark');
                    }
                  } catch(e) {}
                })();
              `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

### Langkah 4: Tambahkan Transisi Halus

1. Buat file `styles/transitions.css`:

```css
/* styles/transitions.css */
html.no-transitions *,
html.no-transitions *::before,
html.no-transitions *::after {
  transition-duration: 0s !important;
}

html {
  transition: background-color 0.3s ease;
}

*,
*::before,
*::after {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-duration: 0.3s;
  transition-timing-function: ease;
}
```

1. Perbarui skrip inline untuk mencegah transisi saat muatan halaman:

```html
<script>
  (function() {
    document.documentElement.classList.add('no-transitions');

    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }

    // Hapus no-transitions setelah frame berikutnya
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        document.documentElement.classList.remove('no-transitions');
      });
    });
  })();
</script>
```

1. Impor `transitions.css` setelah CSS tema Anda sehingga aturan transisi berlaku:

```css
/* styles/globals.css */
@import './themes.css';
@import './transitions.css';
```

### Langkah 5: Dengarkan Perubahan Preferensi Sistem

Tambahkan pendengar yang menghormati preferensi sistem pengguna saat tidak ada preferensi eksplisit yang disimpan:

```javascript
// lib/theme.js
export function initThemeListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (event) => {
    if (!localStorage.getItem('theme')) {
      if (event.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  mediaQuery.addEventListener('change', handleChange);

  return () => mediaQuery.removeEventListener('change', handleChange);
}
```

Panggil `initThemeListener()` di tata letak root atau komponen aplikasi Anda:

```javascript
// pages/_app.js atau app/layout.js
import { useEffect } from 'react';
import { initThemeListener } from '@/lib/theme';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const cleanup = initThemeListener();
    return cleanup;
  }, []);

  return <Component {...pageProps} />;
}
```

### Langkah 6: Perluas ke Arsitektur Multi-Tema (Opsional)

Jika aplikasi Anda membutuhkan lebih dari tema terang dan gelap (misalnya, kontras tinggi, sepia, atau tema khusus merek), perluas pola CSS variable:

1. Definisikan selektor tema tambahan di `themes.css`:

```css
@layer base {
  /* ... selektor :root dan .dark yang sudah ada ... */

  .theme-high-contrast {
    --color-bg-primary: #000000;
    --color-bg-secondary: #1a1a1a;
    --color-text-primary: #ffffff;
    --color-text-secondary: #e0e0e0;
    --color-text-muted: #a0a0a0;
    --color-border-default: #ffffff;
    --color-accent: #ffff00;
    --color-accent-hover: #ffcc00;
    --color-surface: #1a1a1a;
  }

  .theme-sepia {
    --color-bg-primary: #fbf1c7;
    --color-bg-secondary: #ebdbb2;
    --color-text-primary: #3c3836;
    --color-text-secondary: #665c54;
    --color-text-muted: #928374;
    --color-border-default: #d5c4a1;
    --color-accent: #d65d0e;
    --color-accent-hover: #cc5626;
    --color-surface: #fbf1c7;
  }
}
```

1. Buat pemilih tema yang mengelola atribut data di `<html>`:

```javascript
// lib/theme-multi.js
const themes = ['light', 'dark', 'high-contrast', 'sepia'];

export function setTheme(themeName) {
  if (!themes.includes(themeName)) return;

  document.documentElement.classList.remove('dark', 'theme-high-contrast', 'theme-sepia');

  if (themeName === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (themeName !== 'light') {
    document.documentElement.classList.add(`theme-${themeName}`);
  }

  localStorage.setItem('theme', themeName);
}

export function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  if (stored && themes.includes(stored)) return stored;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

1. Bangun UI pemilih tema yang memilih tema yang tersedia:

```jsx
// components/ThemeSelector.jsx
import { useState, useEffect } from 'react';
import { setTheme, getInitialTheme } from '@/lib/theme-multi';

const themeOptions = [
  { value: 'light', label: 'Terang', icon: '☀️' },
  { value: 'dark', label: 'Gelap', icon: '🌙' },
  { value: 'high-contrast', label: 'Kontras Tinggi', icon: '♿' },
  { value: 'sepia', label: 'Sepia', icon: '📜' },
];

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    setCurrentTheme(getInitialTheme());
  }, []);

  const handleChange = (event) => {
    const theme = event.target.value;
    setTheme(theme);
    setCurrentTheme(theme);
  };

  return (
    <select
      value={currentTheme}
      onChange={handleChange}
      className="px-3 py-2 rounded-lg bg-secondary text-primary border"
      aria-label="Pilih tema"
    >
      {themeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.icon} {option.label}
        </option>
      ))}
    </select>
  );
}
```

### Langkah 7: Uji Implementasi Tema Anda

1. **Uji preferensi sistem**: Atur OS Anda ke mode gelap dan kunjungi situs untuk pertama kalinya (hapus `localStorage`). Halaman harus dirender dalam mode gelap tanpa kilatan konten terang.

1. **Uji toggle manual**: Gunakan tombol toggle tema Anda untuk beralih antar tema. Verifikasi bahwa:
   - Kelas `dark` ditambahkan atau dihapus dari `<html>`
   - Semua elemen bertema diperbarui segera
   - Preferensi bertahan setelah penyegaran halaman

1. **Uji konteks tema campuran**: Buat bagian dengan `.theme-light` di dalam halaman gelap. Verifikasi bahwa bagian bersarang dirender dalam mode terang terlepas dari tema induk.

1. **Uji transisi**: Toggle tema dan verifikasi bahwa warna bertransisi dengan mulus selama sekitar 300ms, bukan berubah secara instan.

1. **Uji kinerja**: Gunakan tab Performance Chrome DevTools untuk merekam toggle tema. Verifikasi bahwa peralihan tema hanya memicu perhitungan ulang gaya dan repaint (tanpa layout thrashing). Total waktu frame harus tetap di bawah 50ms untuk transisi 60fps yang halus.
