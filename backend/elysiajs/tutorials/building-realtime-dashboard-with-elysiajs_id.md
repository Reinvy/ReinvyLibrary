---
title: "Membangun Dashboard Real-Time dengan Elysia.js"
description: "Bangun dashboard metrik langsung dengan Elysia.js memakai WebSocket native, room berbasis topik, handshake terautentikasi, dan klien yang reconnect dengan aman."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Dashboard Real-Time dengan Elysia.js

## Ringkasan

Tutorial ini membangun dashboard real-time dengan bentuk produksi: server Bun/Elysia yang memverifikasi handshake WebSocket, mengelompokkan koneksi ke room per tenant dan per dashboard, lalu mendorong snapshot metrik hanya saat nilainya berubah. Di akhir, Anda memiliki klien browser yang pulih dari koneksi terputus tanpa membocorkan socket atau menampilkan angka basi.

## Target Audiens

- Backend developer yang sudah mengirim API HTTP dengan Elysia.js atau framework TypeScript serupa.
- Full-stack engineer yang bertanggung jawab atas dashboard operasional atau analitik.
- Developer yang nyaman dengan generics TypeScript, async/await, dan API browser.

## Prasyarat

- Bun 1.1 atau lebih baru (`bun --version`).
- Pemahaman routing, plugin, dan skema TypeBox di Elysia.js.
- Familiar dengan protokol WebSocket (frame, close code, ping/pong).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan mampu:

- Mendaftarkan route WebSocket dengan skema payload yang type-safe.
- Mengautentikasi handshake sebelum ada data yang keluar dari server.
- Memodelkan room dengan topik pub/sub, bukan registry socket buatan sendiri.
- Mendorong pembaruan dari timer dan handler HTTP, lalu membuat klien dengan exponential backoff, jitter, serta teardown yang benar.

## Konteks dan Motivasi

Polling endpoint metrik tiap dua detik terlihat tidak berbahaya sampai seratus operator membuka dashboard: API menjawab 3.000 request per menit, sebagian besar mengembalikan angka yang tidak berubah. Kanal push membalik biaya itu — server hanya bicara saat ada yang perlu disampaikan. Elysia.js menjalankan WebSocket di server HTTP Bun, jadi tidak ada gateway kedua dan tidak ada masalah adapter; bagian sulitnya adalah autentikasi saat upgrade, routing room, dan reconnect yang tidak membanjiri server.

## Konten Inti

### Bentuk pipeline push

Empat bagian, satu tugas masing-masing: **collector** yang mengambil sampel sumber data secara berkala, **peta room** yang menentukan hak akses, **transport** yang melakukan subscribe dan validasi, serta **klien** yang merender dan mengulang koneksi. Jaga collector tetap bebas dari referensi socket — ia cukup publish ke topik lalu selesai.

### Room tanpa registry

Elysia memakai pub/sub native Bun: socket melakukan subscribe ke string topik, dan `server.publish(topic, payload)` menyebarkan pesan ke semua subscriber. Dua level biasanya cukup — `tenant:<id>` untuk semua data yang boleh dilihat satu organisasi, `dash:<id>` untuk satu dashboard tersimpan. Jangan menyimpan `Map<socket, room>` sendiri; Anda harus membersihkannya saat koneksi tertutup tidak normal dan kehilangan kemampuan publish dari luar handler.

### Autentikasi handshake

Browser tidak bisa menetapkan header pada `new WebSocket()`, sehingga token datang sebagai query parameter atau cookie httpOnly. Verifikasi di dalam `open` sebelum subscribe dan tutup dengan kode `4401` bila gagal: klien harus bisa membedakan "sesi kedaluwarsa" dari "jaringan berkedip". Token di query masuk ke access log, jadi utamakan cookie pada dashboard satu origin dan jaga masa berlaku token tetap pendek.

## Contoh Kode

### Route terautentikasi dengan room

```typescript
import { Elysia, t } from 'elysia'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? '')

async function tenantDari(token?: string) {
    if (!token) return null
    try {
        const { payload } = await jwtVerify(token, secret)
        return String(payload.tenant)
    } catch {
        return null
    }
}

export const realtime = new Elysia({ name: 'realtime' }).ws('/ws/metrics', {
    query: t.Object({ token: t.Optional(t.String()), dashboard: t.Optional(t.String()) }),
    open(ws) {
        void (async () => {
            const tenant = await tenantDari(ws.data.query.token)
            if (!tenant) return ws.close(4401, 'unauthorized')
            ws.subscribe(`tenant:${tenant}`)
            if (ws.data.query.dashboard) ws.subscribe(`dash:${ws.data.query.dashboard}`)
            ws.send(JSON.stringify({ type: 'ready' }))
        })()
    }
})
```

### Mengirim snapshot dari timer

```typescript
import type { Elysia } from 'elysia'

export function mulaiPompaMetrik(app: Elysia, tenants: string[], intervalMs = 2000) {
    const terakhir = new Map<string, string>()

    const timer = setInterval(async () => {
        for (const tenant of tenants) {
            try {
                const snapshot = await ambilSnapshot(tenant)
                const payload = JSON.stringify({ type: 'metrics', at: Date.now(), ...snapshot })
                if (terakhir.get(tenant) === payload) continue // tidak berubah, lewati tick
                terakhir.set(tenant, payload)
                app.server?.publish(`tenant:${tenant}`, payload)
            } catch (error) {
                console.error(`[metrics] snapshot tenant=${tenant} gagal`, error)
            }
        }
    }, intervalMs)

    return () => clearInterval(timer)
}
```

### Klien dengan backoff, jitter, dan teardown

```typescript
export function hubungkanDashboard(opts: { url: string; token: string; onMetrik: (d: any) => void }) {
    let socket: WebSocket | null = null
    let percobaan = 0
    let berhenti = false
    let timerUlang: ReturnType<typeof setTimeout> | undefined

    const buka = () => {
        socket = new WebSocket(`${opts.url}?token=${encodeURIComponent(opts.token)}`)
        socket.onopen = () => { percobaan = 0 }
        socket.onmessage = (event) => {
            try {
                const pesan = JSON.parse(event.data)
                if (pesan.type === 'metrics') opts.onMetrik(pesan)
            } catch (error) {
                console.warn('[ws] frame rusak diabaikan', error)
            }
        }
        socket.onerror = () => socket?.close()
        socket.onclose = (event) => {
            if (berhenti || event.code === 4401) return // sesi habis: arahkan ke login
            const jeda = Math.min(30_000, 500 * 2 ** percobaan++) + Math.random() * 250
            timerUlang = setTimeout(buka, jeda) // jitter mencegah thundering herd
        }
    }

    buka()

    return () => {
        berhenti = true
        if (timerUlang) clearTimeout(timerUlang)
        socket?.close(1000, 'halaman ditutup')
    }
}
```

## Insight Penting

- Autentikasi di `open`, bukan di `message`: subscribe sebelum verifikasi berarti membagikan data ke socket yang belum berhak.
- Topik lebih baik daripada registry — `server.publish` bisa dipanggil dari timer, consumer antrean, dan handler HTTP.
- Close code adalah kontrak: `4401` wajib menghentikan loop retry, putus jaringan tidak.
- Selalu pakai jitter, jika tidak server yang restart akan menerima reconnect semua klien dalam jendela 200 ms yang sama.
- Satu proses Bun hanya memegang socket yang terhubung ke dirinya. Bila ada beberapa replika, butuh broker (Redis pub/sub, NATS) atau sticky routing.

## Langkah Berikutnya

- Tambahkan subscribe per widget agar dashboard hanya menerima panel yang dirender.
- Pasang Redis pub/sub di belakang `publish` untuk scaling horizontal.
- Lanjutkan ke Silabus Microservices Elysia.js untuk menerapkan pola ini di dalam service mesh.

## Kesimpulan

Anda kini memiliki jalur lengkap dari collector sampai browser: handshake terverifikasi, room terbatas per tenant, push yang sadar perubahan, dan klien yang menurun dengan sopan. Sisanya bersifat operasional — menskalakan fan-out dan memantau jumlah koneksi seperti Anda memantau error rate.
