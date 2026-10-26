---
title: "Cheat Sheet Form dan Actions SvelteKit"
description: "Referensi cepat untuk form action SvelteKit, progressive enhancement dengan use:enhance, penanganan error validasi, unggah file, dan redirect."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Form dan Actions SvelteKit

## Tabel Referensi Cepat

| Aksi | Kode / Konvensi | Deskripsi |
|------|-----------------|-----------|
| Action default | `export const actions = { default: async ({ request }) => {} }` | Menangani `POST` pada rute halaman |
| Action bernama | `export const actions = { create: async (event) => {} }` | Dipanggil lewat `action="?/create"` |
| Baca field | `const data = await request.formData()` | `FormData` dari form yang dikirim |
| Kembalikan error | `return { success: false, errors: { email: 'Wajib diisi' } }` | Tersedia sebagai prop `form` di halaman |
| Gagal dengan status | `return fail(400, { email, missing: true })` | Menetapkan status HTTP dan mengembalikan nilai terkirim |
| Redirect setelah post | `throw redirect(303, '/posts/1')` | Pola POST-redirect-GET; harus di-throw |
| Progressive enhancement | `use:enhance` dari `$app/forms` | Mencegat submit, memperbarui `form`, tanpa reload |
| Callback kustom | `use:enhance(() => async ({ result }) => {})` | Mengatur status pending, reset, toast |
| Unggah file | `<form method="POST" enctype="multipart/form-data">` | Wajib agar file terbaca di `request.formData()` |

## Perintah Umum

```bash
# Membuat proyek TypeScript, membuat tipe rute, lalu memeriksanya
npx sv create aplikasi-saya --template minimal --types ts
npx svelte-kit sync && npm run check

# Memeriksa respons action yang diserialisasi tanpa browser
curl -i -X POST http://localhost:5173/kontak \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "email=tes@contoh.com&pesan=halo"
```

## Potongan Kode

### Action bernama dengan validasi

```javascript
// src/routes/kontak/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';

const skema = z.object({
    email: z.string().email('Masukkan alamat email yang valid'),
    pesan: z.string().min(10, 'Pesan minimal 10 karakter')
});

export const actions = {
    default: async ({ request, locals }) => {
        const data = await request.formData();
        const nilai = Object.fromEntries(data);   // { email, pesan }
        const hasil = skema.safeParse(nilai);
        if (!hasil.success) {
            // fail() mempertahankan status HTTP dan mengembalikan nilai ke halaman
            return fail(400, { nilai, errors: hasil.error.flatten().fieldErrors });
        }
        if (!locals.user) {
            throw redirect(303, '/login?next=/kontak');
        }
        await db.pesan.create({ data: { ...hasil.data, userId: locals.user.id } });
        throw redirect(303, '/kontak/terima-kasih');   // harus di-throw, bukan dikembalikan
    }
};
```

### Komponen halaman

```svelte
<!-- src/routes/kontak/+page.svelte -->
<script>
    import { enhance } from '$app/forms';
    export let form;      // undefined pada render pertama — selalu lindungi aksesnya
</script>

<form method="POST" use:enhance>
    <input name="email" type="email" value={form?.nilai?.email ?? ''} />
    {#if form?.errors?.email}<span class="error">{form.errors.email[0]}</span>{/if}

    <textarea name="pesan" rows="5">{form?.nilai?.pesan ?? ''}</textarea>
    <button type="submit">Kirim</button>
</form>
```

### Progressive enhancement dengan callback

```svelte
<script>
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    let menyimpan = false;
</script>

<form method="POST" action="?/create" use:enhance={() => {
    menyimpan = true;
    return async ({ result, update }) => {
        menyimpan = false;
        if (result.type === 'success') {
            await update({ reset: true });   // kosongkan input dan prop `form`
            await invalidateAll();           // ambil ulang data load
        } else {
            await update();                  // pertahankan nilai, tampilkan error
        }
    };
}}>
    <input name="judul" required />
    <button disabled={menyimpan}>{menyimpan ? 'Menyimpan…' : 'Simpan'}</button>
</form>
```

### Unggah file

```javascript
// src/routes/unggah/+page.server.js
import { fail } from '@sveltejs/kit';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAKS_BYTE = 5 * 1024 * 1024;
const DIIZINKAN = new Set(['image/png', 'image/jpeg']);
export const actions = {
    upload: async ({ request }) => {
        const form = await request.formData();
        const file = form.get('avatar');
        if (!(file instanceof File) || file.size === 0) {
            return fail(400, { error: 'Pilih file yang akan diunggah' });
        }
        if (file.size > MAKS_BYTE) {
            return fail(413, { error: 'Ukuran file harus di bawah 5 MB' });
        }
        if (!DIIZINKAN.has(file.type)) {
            return fail(415, { error: 'Hanya PNG dan JPEG yang diperbolehkan' });
        }
        const nama = `${crypto.randomUUID()}${path.extname(file.name)}`;
        await writeFile(`static/uploads/${nama}`, Buffer.from(await file.arrayBuffer()));
        return { success: true, url: `/uploads/${nama}` };
    }
};
```

### Redirect dan action antar-rute

```javascript
// src/routes/logout/+page.server.js
import { redirect } from '@sveltejs/kit';
export const actions = {
    default: async ({ cookies, locals }) => {
        cookies.delete('session', { path: '/' });
        locals.user = null;
        throw redirect(303, '/');    // redirect yang dikembalikan akan diabaikan
    }
};
```

### Jebakan umum

```text
- Action hanya berjalan pada POST; GET ke halaman tidak pernah memicunya.
- Unggah file butuh enctype="multipart/form-data", jika tidak nilai File kosong.
- use:enhance tanpa callback mereset form saat sukses; dengan callback Anda memilih
  lewat update({ reset: true }) dan invalidateAll().
- Redirect di dalam submit yang di-enhance datang sebagai result.type === 'redirect' —
  panggil applyAction(result) dari $app/forms untuk mengikutinya.
- Baca nilai checkbox sekali dengan formData.get('nama'); gunakan getAll untuk grup.
```
