---
title: "Cheat Sheet Keamanan Vue.js"
description: "Referensi cepat untuk mengamankan aplikasi Vue.js 3: pencegahan XSS, Content Security Policy, perlindungan CSRF, autentikasi yang aman, audit dependensi, dan penguatan produksi."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Keamanan Vue.js

## Tabel Referensi Cepat

| Ancaman | Pertahanan | Alat / Pola |
|---------|------------|-------------|
| XSS melalui `v-html` | Sanitasi sebelum binding; jangan pernah merender HTML pengguna yang tidak disanitasi | `v-html` + DOMPurify |
| Injeksi template | Simpan konten tidak tepercaya dalam interpolasi; jangan pernah mengompilasinya sebagai template | `{{ }}` escape otomatis |
| Injeksi URL `javascript:` | Validasi `:href` / `:src` dinamis terhadap daftar protokol yang diizinkan | Komposabel validator URL |
| Injeksi script melalui celah CSP | Terapkan Content Security Policy ketat tanpa `unsafe-inline` / `unsafe-eval` | Header respons CSP |
| CSRF pada request pengubah state | Cookie SameSite plus token CSRF double-submit | `SameSite=Lax` + `X-XSRF-TOKEN` |
| Pencurian token autentikasi via XSS | Simpan token dalam cookie HttpOnly + Secure, bukan penyimpanan yang bisa diakses JavaScript | Flag cookie |
| Clickjacking | Blokir aplikasi agar tidak bisa dibingkai (framed) | CSP `frame-ancestors` |
| Kompromi rantai pasokan (supply chain) | Kunci pohon dependensi dan audit di CI | `package-lock.json` + `npm audit` |
| Rahasia bocor ke browser | Simpan rahasia di sisi server; jangan pernah memaparkannya lewat env `VITE_` | `import.meta.env`, runtime config |
| Data sensitif di log | Redaksi token, kata sandi, dan PII sebelum dicatat | Helper redaksi |
| Perusakan script pihak ketiga | Kunci script CDN dengan Subresource Integrity | Atribut `integrity` + `crossorigin` |
| Kebocoran data SSR | Jangan pernah menyematkan rahasia dalam payload yang dirender server | Runtime config Nuxt |

## Perintah Umum

### Memasang Paket Keamanan

```bash
# Sanitizer HTML yang dipakai sebelum binding v-html apa pun
npm install dompurify

# Klien HTTP dengan dukungan token CSRF bawaan
npm install axios

# Aturan linting untuk Vue Single File Components
npm install --save-dev eslint eslint-plugin-vue
```

### Mengaudit Dependensi

```bash
# Daftar kerentanan yang diketahui di pohon dependensi
npm audit

# Terapkan otomatis perbaikan keamanan yang tidak merusak
npm audit fix

# Audit hanya permukaan dependensi produksi
npm audit --omit=dev

# Gerbang CI: gagalkan build saat ada isu tingkat tinggi
npm audit --audit-level=high
```

### Membuat Hash SRI untuk Script CDN

```bash
# Hitung nilai integritas SHA-384 untuk script pihak ketiga
curl -s https://cdn.example.com/lib.js \
  | openssl dgst -sha384 -binary \
  | openssl base64 -A
```

### Mengaktifkan HTTPS di Vite Dev Server

```bash
# HTTPS diperlukan untuk menguji cookie Secure di pengembangan
npm install --save-dev @vitejs/plugin-basic-ssl
```

## Potongan Kode

### Sanitasi HTML Sebelum v-html

```vue
<script setup lang="ts">
import DOMPurify from 'dompurify'

const props = defineProps<{ html: string }>()

// DOMPurify menghapus script, event handler, dan URL berbahaya
const safeHtml = DOMPurify.sanitize(props.html, {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'form', 'iframe'],
})
</script>

<template>
  <!-- Hanya ikat keluaran yang sudah disanitasi ke v-html -->
  <div v-html="safeHtml"></div>
</template>
```

### Memvalidasi URL Dinamis

```vue
<script setup lang="ts">
const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tel:'])

// new URL() menormalkan input; allowlist memblokir javascript: dan data:
function safeUrl(raw: string | null | undefined): string {
  if (!raw) return ''
  const url = new URL(raw, window.location.origin)
  return SAFE_PROTOCOLS.has(url.protocol) ? url.href : ''
}
</script>

<template>
  <a :href="safeUrl(userProvidedUrl)">Profil</a>
</template>
```

### Content Security Policy untuk Produksi

```text
# nginx — CSP ketat untuk SPA Vue (style-src membutuhkan 'unsafe-inline'
# hanya jika CSS disuntikkan saat runtime alih-alih diekstrak)
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Panggilan API Aman CSRF dengan axios

```javascript
// axios membaca cookie XSRF-TOKEN dan mengirimkannya sebagai header
// X-XSRF-TOKEN pada setiap request saat withCredentials aktif
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})
```

### Autentikasi Cookie HttpOnly

```javascript
// Token tidak pernah sampai ke JavaScript: server menyetel cookie HttpOnly
const response = await fetch('/api/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})

// Browser menyimpan cookie sesi secara otomatis; JS tidak bisa membacanya
if (response.ok) await router.push('/dashboard')
```

### Route Guard untuk Halaman Terproteksi

```typescript
// router/guards.ts — jauhkan pemeriksaan otorisasi dari kode komponen
import { useAuthStore } from '@/stores/auth'

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})
```

### Mengunci Script CDN dengan SRI

```html
<!-- index.html — hash integritas mengunci payload CDN secara tepat -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-ABC123...=="
  crossorigin="anonymous"
></script>
```

### Merendaksi Data Sensitif Sebelum Logging

```typescript
// Jangan pernah mencatat payload request yang berisi kredensial
function redact(input: unknown): unknown {
  if (input && typeof input === 'object') {
    const clone = { ...input } as Record<string, unknown>
    for (const key of Object.keys(clone)) {
      if (/(token|password|secret|authorization)/i.test(key)) {
        clone[key] = '[REDACTED]'
      }
    }
    return clone
  }
  return input
}

console.debug('Respons API', redact(response.data))
```

### Menjaga Rahasia Keluar dari Bundle Klien

```text
# .env — variabel apa pun dengan prefiks VITE_ di-inline ke dalam bundle
# dan terlihat oleh siapa pun yang membuka JavaScript hasil build
VITE_API_BASE_URL=https://api.example.com

# Kunci privat (kredensial database, secret penandatanganan) hanya milik
# server; muat lewat runtime configuration, jangan pernah lewat env VITE_.
```
