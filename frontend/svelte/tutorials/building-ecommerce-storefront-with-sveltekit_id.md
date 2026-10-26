---
title: "Membangun Storefront E-commerce dengan SvelteKit"
description: "Bangun storefront SvelteKit dengan halaman produk SSR, state keranjang reaktif, checkout yang divalidasi di server, metadata SEO, dan integrasi pembayaran Stripe."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Storefront E-commerce dengan SvelteKit

## Ringkasan

Tutorial ini membangun storefront siap produksi dengan SvelteKit: katalog yang dirender di server, keranjang yang bertahan saat navigasi, checkout yang menghitung ulang harga di server, dan konfirmasi Stripe melalui webhook. Anda juga akan menambahkan metadata agar halaman produk mudah diindeks.

## Target Audiens

- Pengembang frontend yang paham dasar Svelte dan ingin proyek SvelteKit yang realistis.
- Pengembang yang memindahkan storefront client-rendered ke server-side rendering (level intermediate).

## Prasyarat

- Node.js 20+ dan npm sudah terpasang.
- Memahami runes Svelte 5 (`$state`, `$derived`, `$props`).
- Akun Stripe dengan test API key, serta dasar SQL (contoh memakai SQLite lewat `better-sqlite3`).

## Tujuan Pembelajaran

- Memuat data produk dengan fungsi `load` di server yang bertipe.
- Membagikan state keranjang antar rute tanpa bocor antar pengunjung.
- Memvalidasi harga dan stok di server sebelum membuat pembayaran.
- Mengonfirmasi pesanan lewat webhook Stripe yang terverifikasi.

## Konteks dan Motivasi

First paint yang lambat mengurangi konversi, dan harga yang dipercaya dari browser menggerus margin. SvelteKit menangani keduanya dalam satu proyek: rute yang sama merender HTML untuk crawler dan menghidrasi keranjang reaktif untuk manusia. Prinsip utamanya adalah memisahkan apa yang boleh diputuskan browser (produk mana, berapa jumlah) dari yang hanya boleh diputuskan server (harga, stok, status pembayaran).

## Konten Inti

### Render katalog di server

Halaman produk jarang berubah dan banyak dibaca. Fungsi `load` di `+page.server.ts` mengambil data dari basis data dan mengembalikan data yang bisa diserialisasi, sehingga SvelteKit mengirim HTML lengkap pada byte pertama — nama, harga, dan deskripsi terlihat oleh crawler.

### Simpan state keranjang per pengunjung

State keranjang tidak boleh berada di variabel modul server. Simpan di modul `.svelte.ts` yang dipersistenkan ke `localStorage` dan perlakukan sebagai usulan: checkout membaca ulang baris produk dan menghitung total, lalu menolak keranjang yang mengklaim laptop seharga satu sen.

### Jadikan checkout sebagai transaksi server

Action checkout menerima ID produk dan jumlah, memuat harga otoritatif, memeriksa stok, menulis pesanan `pending`, lalu membuat Checkout Session dengan nominal dari server. Browser dialihkan ke Stripe; tidak ada data sensitif yang bolak-balik lewat klien.

### Konfirmasi pembayaran lewat webhook, lalu jelaskan halaman ke crawler

Verifikasi tanda tangan Stripe terhadap body mentah, lalu tandai pesanan `paid` dalam transaksi yang sama dengan pengurangan stok. Kembalikan 200 secepat mungkin dan buat handler idempoten karena Stripe mengulang pengiriman. Rute produk juga perlu judul unik, tautan kanonik, tag Open Graph, dan JSON-LD `Product` yang dirender dari data hasil `load` di `<svelte:head>`.

## Contoh Kode

```typescript
// src/routes/products/[slug]/+page.server.ts
export const load: PageServerLoad = async ({ params, setHeaders }) => {
    const product = db.prepare('SELECT id, slug, name, price_cents, stock FROM products WHERE slug = ?')
        .get(params.slug) as Product | undefined;
    if (!product) throw error(404, 'Produk tidak ditemukan');
    setHeaders({ 'cache-control': 'public, max-age=60, stale-while-revalidate=300' });
    return { product, available: product.stock > 0 };
};
```

```typescript
// src/lib/cart.svelte.ts
const STORAGE_KEY = 'storefront-cart';

function readStorage(): CartItem[] {
    if (!browser) return [];
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CartItem[];
    } catch (err) {
        console.error('Payload keranjang rusak, mengatur ulang', err);
        return [];
    }
}

class Cart {
    items = $state<CartItem[]>(readStorage());
    totalCents = $derived(this.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0));
    add(item: CartItem, quantity = 1): void {
        const existing = this.items.find((i) => i.productId === item.productId);
        if (existing) existing.quantity += quantity;
        else this.items.push({ ...item, quantity });
        if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    }
}
export const cart = new Cart();
```

```typescript
// src/routes/checkout/+page.server.ts
export const actions: Actions = {
    default: async ({ request, url }) => {
        const raw = String((await request.formData()).get('items') ?? '[]');
        let entries: Array<{ productId: string; quantity: number }>;
        try {
            entries = JSON.parse(raw);
        } catch {
            return fail(400, { message: 'Payload keranjang bukan JSON yang valid' });
        }
        if (!Array.isArray(entries) || entries.length === 0) {
            return fail(400, { message: 'Keranjang Anda kosong' });
        }
        const lineItems = [];
        for (const { productId, quantity } of entries) {
            const row = db.prepare('SELECT name, price_cents, stock FROM products WHERE id = ?')
                .get(productId) as Product | undefined;
            if (!row) return fail(400, { message: 'Ada produk yang sudah tidak tersedia' });
            if (quantity < 1 || quantity > row.stock) {
                return fail(409, { message: `Stok ${row.name} tidak mencukupi` });
            }
            const price_data = { currency: 'usd', unit_amount: row.price_cents, product_data: { name: row.name } };
            lineItems.push({ quantity, price_data });
        }
        const order = createOrder(lineItems);
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: lineItems,
            client_reference_id: order.id,
            success_url: `${url.origin}/orders/${order.id}?status=success`,
            cancel_url: `${url.origin}/cart`
        });
        throw redirect(303, session.url ?? '/cart');
    }
};
```

```typescript
// src/routes/api/stripe/webhook/+server.ts
export const POST: RequestHandler = async ({ request }) => {
    const signature = request.headers.get('stripe-signature');
    if (!signature) return json({ error: 'Tanda tangan tidak ada' }, { status: 400 });
    try {
        const event = stripe.webhooks.constructEvent(
            await request.text(), signature, env.STRIPE_WEBHOOK_SECRET ?? ''
        );
        if (event.type === 'checkout.session.completed') {
            const s = event.data.object as Stripe.Checkout.Session;
            markOrderPaid(s.client_reference_id ?? '', String(s.payment_intent));
        }
        return json({ received: true });
    } catch (err) {
        console.error('Verifikasi webhook gagal', err);
        return json({ error: 'Tanda tangan tidak valid' }, { status: 400 });
    }
};
```

## Insight Penting

- **Jangan pernah percaya harga dari klien.** Baca ulang nominal dari basis data di dalam action; aturan ini mencegah sebagian besar kecurangan storefront.
- **State keranjang adalah state klien.** Modul `.svelte.ts` plus `localStorage` membuatnya per pengunjung, bukan bocor antar request.
- **Webhook butuh body mentah dan idempotensi.** Parsing JSON sebelum `constructEvent` merusak verifikasi, dan Stripe mengulang pengiriman, jadi `markOrderPaid` harus aman dipanggil berkali-kali.

## Langkah Berikutnya

- Tambahkan reservasi stok dengan masa berlaku agar checkout terbengkalai melepas stok.
- Tambahkan varian (ukuran, warna) dan susun line item berdasarkan SKU.
- Baca panduan optimasi performa SvelteKit untuk menyetel SSR dan bundle.

## Kesimpulan

Setiap bagian kini punya satu tugas: server merender HTML untuk crawler, klien memiliki state keranjang sementara, dan uang hanya berpindah setelah webhook bertanda tangan valid. Batas itulah bagian yang bisa Anda pakai ulang di proyek berikutnya.
