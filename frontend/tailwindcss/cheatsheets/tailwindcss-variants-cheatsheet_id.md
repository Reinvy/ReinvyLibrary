---
title: "Cheat Sheet Varian dan Styling Kondisional Tailwind CSS"
description: "Referensi cepat untuk sistem varian Tailwind CSS: varian pseudo-kelas dan pseudo-elemen, modifier group dan peer, varian atribut data dan ARIA, selektor nth-child, penumpukan varian, varian arbitrer, serta varian kustom CSS-first di v4."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Varian dan Styling Kondisional Tailwind CSS

## Tabel Referensi Cepat

| Keluarga varian | Contoh | Kegunaan |
|-----------------|--------|----------|
| Pseudo-kelas | `hover:bg-indigo-600` | Menerapkan gaya saat kursor mouse di atas elemen |
| Fokus keyboard | `focus-visible:ring-2` | Menerapkan gaya hanya saat fokus keyboard |
| Pseudo-elemen | `before:content-['']` | Menata kotak hasil `::before` |
| Group | `group-hover:opacity-100` | Menata anak elemen saat ancestor `.group` cocok |
| Peer | `peer-checked:block` | Menata saudara (sibling) setelah input yang cocok |
| Atribut data | `data-[state=open]:block` | Menata saat atribut kustom cocok |
| State ARIA | `aria-expanded:rotate-180` | Menata berdasarkan state atribut ARIA |
| Breakpoint | `md:grid-cols-3` | Menerapkan pada lebar viewport minimum |
| Gerakan | `motion-reduce:transition-none` | Menghormati preferensi reduced-motion |
| Orientasi | `portrait:flex-col` | Menerapkan berdasarkan orientasi viewport |
| Arah | `rtl:mr-0` | Menerapkan pada konteks kanan-ke-kiri |
| Cetak | `print:hidden` | Menerapkan hanya untuk media cetak |
| nth-child | `odd:bg-gray-50` | Menata elemen anak berselang-seling |
| Selektor anak | `*:my-2` | Menata setiap anak langsung |
| Varian arbitrer | `[&:nth-child(3)]:block` | Menggunakan selektor mentah apa pun |

## Perintah Umum

### Varian State Pseudo-kelas

```text
hover:bg-blue-600                  /* &:hover                       */
focus:ring-2                       /* &:focus                       */
focus-visible:ring-2               /* &:focus-visible (keyboard)    */
focus-within:shadow-md             /* &:focus-within (anak fokus)   */
active:scale-95                    /* &:active (saat ditekan)       */
visited:text-purple-600            /* &:visited                     */
target:border-indigo-500           /* &:target (target anchor)      */
```

```text
disabled:opacity-50                /* &:disabled                    */
enabled:shadow-md                  /* &:enabled                     */
checked:bg-indigo-600              /* &:checked                     */
indeterminate:bg-gray-300          /* &:indeterminate               */
required:border-red-400            /* &:required                    */
valid:border-green-500             /* &:valid                       */
invalid:border-red-500             /* &:invalid                     */
placeholder-shown:border-gray-200  /* &:placeholder-shown           */
autofill:shadow-[inset_0_0_0_100px_#fff]  /* &:autofill             */
read-only:bg-gray-100              /* &:read-only                   */
open:rotate-180                    /* &:open (details, dialog)      */
default:ring-2                     /* &:default (opsi bawaan)       */
```

### Varian Pseudo-elemen

```text
before:content-['']                /* &::before (perlu content)     */
after:content-['']                 /* &::after (perlu content)      */
first-letter:text-4xl              /* &::first-letter               */
first-line:uppercase               /* &::first-line                 */
marker:text-emerald-500            /* &::marker (bullet daftar)     */
selection:bg-amber-200             /* &::selection                  */
file:mr-4                          /* &::file-selector-button       */
placeholder:text-gray-400          /* &::placeholder                */
backdrop:bg-black/50               /* &::backdrop (lapisan dialog)  */
```

### Menumpuk dan Menggabungkan Varian

```text
dark:hover:bg-gray-800             /* hover hanya di dalam mode gelap */
md:focus:ring-2                    /* focus hanya pada md ke atas    */
group-hover:opacity-100            /* group plus pseudo-kelas        */
sm:hover:active:scale-95           /* tumpukan tiga lapis            */
has-[input:checked]:bg-indigo-50   /* induk dari input yang checked  */
```

Varian tersusun dari luar ke dalam — varian paling kiri menghasilkan selektor paling luar. Contohnya, `md:hover:` dikompilasi menjadi blok `@media (min-width: 48rem)` yang berisi aturan `&:hover`, dan `dark:hover:` hanya menerapkan hover saat penanda mode gelap ada.

### Varian Group dan Peer

```text
group                              /* menandai elemen induk         */
group-hover:text-white             /* gaya anak saat group di-hover */
group-focus-within:border-blue-500 /* state fokus group             */
group-active:scale-100             /* state group ditekan           */
group-aria-expanded:block          /* group plus state ARIA         */
group-data-[state=open]:block      /* group plus atribut data       */

group/name                         /* group bernama pada induk      */
group-hover/name:opacity-100       /* menargetkan group bernama itu */

peer                               /* menandai sibling sebelumnya   */
peer-checked:block                 /* menata sibling setelahnya     */
peer-focus-visible:ring-4          /* fokus keyboard pada peer      */
peer-invalid:text-red-500          /* state validasi pada peer      */

peer/rating                        /* peer bernama                  */
peer-checked/rating:opacity-100    /* menata peer yang cocok        */
```

Group dan peer bernama (`group/name`, `peer/name`) memungkinkan Anda menumpuk beberapa relasi group atau peer pada satu elemen tanpa ambigu — prefiks modifier harus menyertakan nama yang sama (`group-hover/name:`).

### Varian Atribut Data dan ARIA

```text
data-[state=open]:block            /* atribut kustom apa pun        */
data-[size=lg]:p-6                 /* pencocokan nilai tepat        */
group-data-[open]:visible          /* atribut data pada group       */
aria-checked:bg-indigo-600         /* aria-checked="true"           */
aria-expanded:rotate-180           /* aria-expanded="true"          */
aria-hidden:hidden                 /* aria-hidden="true"            */
aria-invalid:border-red-500        /* aria-invalid="true"           */
aria-pressed:bg-gray-900           /* aria-pressed="true"           */
aria-selected:font-semibold        /* aria-selected="true"          */
aria-[sort=ascending]:bg-gray-100  /* nilai ARIA arbitrer           */
supports-[display:grid]:grid       /* feature query (@supports)     */
```

Varian `aria-*` bawaan memetakan atribut ke nilai persis `"true"`. Untuk nilai lain, atau atribut tanpa varian bawaan, gunakan bentuk arbitrer `data-[...]:` dan `aria-[...]:`.

### Varian nth-child dan Elemen Turunan

```text
first:rounded-t-lg                 /* :first-child                  */
last:rounded-b-lg                  /* :last-child                   */
only:flex                          /* :only-child                   */
odd:bg-gray-50                     /* :nth-child(odd)               */
even:bg-white                      /* :nth-child(even)              */
first-of-type:mt-0                 /* :first-of-type                */
last-of-type:mb-0                  /* :last-of-type                 */
empty:hidden                       /* :empty                        */
*:my-2                             /* setiap anak langsung (& > *)   */
[&>svg]:size-4                     /* anak langsung arbitrer        */
[&_p]:text-gray-600                /* turunan arbitrer              */
```

### Varian Breakpoint dan Media

```text
sm:...     min-width: 40rem (640px)    md:...     48rem (768px)
lg:...     64rem (1024px)              xl:...     80rem (1280px)
2xl:...    96rem (1536px)              3xl:...    120rem (1920px, v4)
max-sm:... max-width pada breakpoint 640px (v3.2+)
min-[700px]:...  minimum arbitrer      max-[700px]:...  maksimum arbitrer
dark:...   prefers-color-scheme: dark (atau penanda dark)
light:...  prefers-color-scheme: light (v4)
portrait:...  orientation: portrait    landscape:...  landscape
motion-safe:...  reduced-motion: no-preference
motion-reduce:...  reduced-motion: reduce
contrast-more:...  contrast: more      contrast-less:...  contrast: less
print:...  media cetak                 rtl:...  direction: rtl
ltr:...    direction: ltr              forced-colors:...  forced colors
```

### Varian Arbitrer

```text
[&:nth-child(3)]:block           /* pseudo-kelas mentah             */
[&[data-state="open"]]:block     /* atribut plus state              */
[&>*]:mt-4                       /* anak langsung arbitrer          */
[&_.tooltip]:absolute            /* selektor turunan                */
[@media(any-hover:hover)]:block  /* media query mentah              */
[&:is(.active, [data-open])]:visible  /* selektor kompleks          */
```

Dalam varian arbitrer, `&` adalah placeholder untuk elemen itu sendiri, dan semua yang ada di dalam kurung siku disisipkan ke selektor hasil apa adanya. Gunakan garis bawah untuk spasi, sama seperti utilitas arbitrer.

### Mendefinisikan Varian Kustom (CSS-first v4)

```css
/* File CSS utama */
@import "tailwindcss";

/* Varian multi-selektor */
@variant hocus (&:hover, &:focus);

/* Singkatan untuk satu selektor */
@custom-variant dark (&:where(.dark, .dark *));

/* Melewati jarak pada setiap anak setelah anak pertama */
@custom-variant not-first (&:not(:first-child));
```

Varian baru tersebut kemudian berfungsi seperti varian bawaan — `hocus:bg-indigo-100`, `not-first:mt-4` — termasuk dukungan penumpukan dan `@apply`.

Padanan v3 berada di konfigurasi JavaScript:

```javascript
// tailwind.config.js (v3)
const plugin = require('tailwindcss/plugin')

module.exports = {
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant('hocus', ['&:hover', '&:focus'])
    }),
  ],
}
```

## Potongan Kode

### Pola State Kontrol Formulir

```html
<button
  class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white
    hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2
    focus-visible:ring-indigo-400 focus-visible:ring-offset-2
    active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
  disabled
>
  Kirim
</button>
```

```html
<input
  type="email"
  class="w-full rounded-lg border-2 border-gray-300 px-3 py-2
    focus:border-indigo-500 focus:outline-none
    invalid:border-red-500 invalid:focus:border-red-500"
  required
/>
```

### Kartu dengan Group-Hover

```html
<div class="group relative rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-lg">
  <h3 class="text-gray-900 transition group-hover:text-indigo-600">
    Varian Tailwind CSS
  </h3>
  <p class="mt-2 translate-y-1 text-sm text-gray-500 opacity-0 transition
    group-hover:translate-y-0 group-hover:opacity-100">
    Keterangan ini muncul saat kartu di-hover.
  </p>
</div>
```

### Kotak Centang Kustom Berbasis Peer

```html
<div class="flex items-center gap-3">
  <input id="remember" type="checkbox" class="peer sr-only" />
  <label
    for="remember"
    class="h-5 w-5 cursor-pointer rounded border-2 border-gray-300
      transition peer-checked:border-indigo-600 peer-checked:bg-indigo-600
      peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-200"
  ></label>
  <label for="remember" class="select-none text-sm text-gray-700">
    Ingat saya
  </label>
</div>
```

### Tab Berbasis Atribut Data

```html
<nav class="flex gap-1 rounded-xl bg-gray-100 p-1">
  <a
    href="#general"
    class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600
      data-[state=active]:bg-white data-[state=active]:text-gray-900
      data-[state=active]:shadow-sm"
    data-state="active"
  >
    Umum
  </a>
  <a
    href="#billing"
    class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600
      data-[state=active]:bg-white data-[state=active]:text-gray-900
      data-[state=active]:shadow-sm"
  >
    Penagihan
  </a>
</nav>
```

### Tabel Bergaris dengan nth-child

```html
<table class="w-full text-sm">
  <tbody>
    <tr class="odd:bg-gray-50 hover:bg-indigo-50">
      <td class="px-4 py-2">Akuntansi</td>
      <td class="px-4 py-2">24 mnt</td>
    </tr>
    <tr class="odd:bg-gray-50 hover:bg-indigo-50">
      <td class="px-4 py-2">Tinjauan desain</td>
      <td class="px-4 py-2">48 mnt</td>
    </tr>
  </tbody>
</table>
```

### Varian Kustom di CSS dan Konfigurasi

```css
/* Pintasan fokus plus hover yang dapat dipakai ulang (v4) */
@variant hocus (&:hover, &:focus);
```

```html
<button class="hocus:bg-indigo-100 hocus:text-indigo-700">Edit</button>
```
