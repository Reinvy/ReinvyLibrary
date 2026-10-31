---
title: "Membangun Aplikasi Real-Time dengan WebSocket Next.js"
description: "Tutorial praktik menambahkan fitur real-time pada aplikasi Next.js App Router: memilih antara custom server dan layanan WebSocket terpisah, integrasi Socket.IO, autentikasi handshake, pembatasan siaran dengan room, serta skalabilitas lintas instance."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Real-Time dengan WebSocket Next.js

## Ringkasan

Route handler tidak dapat mempertahankan koneksi berumur panjang, sehingga fitur real-time membutuhkan proses WebSocket di luar siklus request/response. Anda akan membangun layanan Socket.IO terpisah, mengautentikasi setiap koneksi memakai sesi Next.js yang sudah ada, membatasi pesan dengan room yang terotorisasi, dan menskalakannya dengan adapter Redis. Server Component merender riwayat awal; hook klien yang tipis menjaganya tetap segar.

## Target Audiens

- Developer full-stack yang nyaman dengan App Router, Server Component, dan route handler.
- Frontend engineer yang membutuhkan presence, live cursor, atau chat tanpa menulis ulang aplikasi menjadi SPA terpisah.
- Ekspektasi tingkat kemampuan pembaca: Mahir. Anda harus mampu menalar batas antarproses dan konfigurasi TypeScript.

## Prasyarat

- Node.js 20+ dengan npm, pnpm, atau yarn.
- Proyek Next.js 14/15 yang memakai App Router dan Auth.js v5.
- Redis 7 berjalan lokal (`docker run -p 6379:6379 redis:7-alpine`).
- Pemahaman dasar penandatanganan JWT.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan mengapa route handler tidak bisa upgrade ke WebSocket dan memilih model hosting yang tepat.
- Menjalankan server Socket.IO dengan adapter Redis dan endpoint health.
- Menerbitkan token berumur pendek di Next.js dan memverifikasinya saat handshake.
- Mengotorisasi join room per pengguna, serta mengonfigurasi reconnection agar deploy tidak menghilangkan pesan.

## Konteks dan Motivasi

Runtime serverless dan edge menagih per request serta memutus koneksi menganggur, sehingga buruk untuk socket yang harus terbuka bermenit-menit. Tim biasanya baru menyadari hal ini setelah merilis route handler yang "berfungsi" di `next dev` lalu gagal di produksi. Solusinya adalah keputusan eksplisit: ambil alih server HTTP dengan custom server Next.js, atau jalankan proses realtime khusus di samping aplikasi.

Masalah kedua adalah identitas. Handshake WebSocket hanyalah request HTTP biasa, jadi cookie hanya terkirim bila klien dan server berbagi domain, dan tidak ada lapisan autentikasi per pesan. Bila keanggotaan room ditentukan payload klien, siapa pun bisa berlangganan data tenant lain. Memperlakukan handshake sebagai login dan setiap join sebagai pemeriksaan otorisasi adalah disiplin yang sama seperti pada route handler.

## Konten Inti

### Langkah 1: Pilih model hosting

| Model | Cara kerja | Konsekuensi |
| --- | --- | --- |
| Route handler | `app/api/ws/route.ts` | Tidak bisa upgrade. Hanya jalan di balik custom Node server. Jangan dipakai. |
| Custom server | `server.ts` membungkus `next()` dalam `http.createServer` | Satu proses dan unit deploy; mematikan sebagian optimasi Next.js; tidak didukung di Vercel. |
| Layanan eksternal | Proses Node terpisah; Next.js hanya melayani HTTP/RSC | Skala independen, selamat dari deploy aplikasi, batas kegagalan jelas. Direkomendasikan. |
| Penyedia terkelola | Pusher, Ably, Supabase Realtime | Tanpa beban operasional, tetapi biaya per pesan dan lock-in. |

### Langkah 2: Autentikasi handshake, lalu otorisasi setiap join

Terbitkan token dari route handler setelah `auth()` memastikan sesi. Jaga masa berlaku tetap pendek (hitungan menit) dan verifikasi ulang hak akses pada setiap join room, karena socket hidup lebih lama daripada token. Room adalah kumpulan socket id di sisi server: bergabunglah hanya setelah memastikan pengguna boleh melihat room tersebut, dan turunkan room id dari data server (order id, tenant id) alih-alih input bebas dari klien.

### Langkah 3: Skalakan secara horizontal

Setiap instance hanya mengetahui socket miliknya sendiri; adapter Redis meneruskan `io.to(room).emit()` antar instance melalui pub/sub. Bila fallback HTTP polling tetap dipakai, tambahkan sticky session di load balancer (nginx `ip_hash` atau routing cookie), karena upgrade dan polling harus mendarat di instance yang sama.

## Contoh Kode

### Server realtime

```typescript
// realtime/server.ts
import { createServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";
import { canAccessRoom, verifyRealtimeToken } from "./auth";

const httpServer = createServer((req, res) => res.end("ok")); // probe /health
const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: (process.env.APP_ORIGIN ?? "").split(","), credentials: true },
    connectionStateRecovery: { maxDisconnectionDuration: 120_000 },
});
const pub = createClient({ url: process.env.REDIS_URL });
const sub = pub.duplicate();

io.use(async (socket, next) => {
    try {
        const claims = await verifyRealtimeToken(socket.handshake.auth?.token ?? "");
        Object.assign(socket.data, { userId: claims.sub, tenantId: claims.tenant });
        next();
    } catch {
        next(new Error("unauthorized")); // token hilang, kedaluwarsa, atau palsu
    }
});
io.on("connection", (socket) => {
    socket.on("room:join", async (roomId: string, ack) => {
        const allowed = await canAccessRoom(socket.data.userId, socket.data.tenantId, roomId);
        if (!allowed) return ack({ ok: false, error: "forbidden" });
        await socket.join(roomId);
        ack({ ok: true });
    });
});
async function main() {
    await Promise.all([pub.connect(), sub.connect()]);
    io.adapter(createAdapter(pub, sub));
    httpServer.listen(Number(process.env.PORT ?? 4001), () => console.log("realtime siap"));
}
main().catch((error) => {
    console.error("bootstrap realtime gagal", error);
    process.exit(1);
});
```

### Menerbitkan token

```typescript
// app/api/realtime-token/route.ts
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });
    const token = await new SignJWT({ tenant: session.user.tenantId })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(session.user.id)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(new TextEncoder().encode(process.env.REALTIME_JWT_SECRET));
    return Response.json({ token }, { headers: { "cache-control": "no-store" } });
}
```

### Hook klien

```typescript
// hooks/use-room-socket.ts
"use client";

export function useRoomSocket(roomId: string, onMessage: (message: Message) => void) {
    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL!, { path: "/socket.io", autoConnect: false });
        socket.on("message:new", onMessage);
        socket.on("connect_error", (error) => console.error("autentikasi realtime gagal", error.message));
        fetch("/api/realtime-token", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`token ${res.status}`))))
            .then(({ token }: { token: string }) => {
                socket.auth = { token };
                socket.connect();
                socket.on("connect", () => socket.emit("room:join", roomId));
            })
            .catch((error) => console.error("join realtime gagal", error));
        return () => socket.disconnect();
    }, [roomId, onMessage]);
}
```

## Insight Penting

- **Perlakukan handshake sebagai login, bukan formalitas.** Verifikasi tanda tangan, periksa masa berlaku, dan simpan `userId` pada `socket.data`. Jangan pernah menerima field `userId` dari klien.
- **Otorisasi ulang aksi istimewa.** Token 5 menit tidak melindungi koneksi yang terbuka satu jam; `canAccessRoom` harus dijalankan saat join dan saat mengirim.
- **`transports: ["websocket"]` melewati fallback polling** dan kebutuhan sticky session, dengan risiko gagal di balik proxy yang memblokir upgrade.
- **Adapter Redis bukan penyimpanan.** Ia hanya menyebarkan pesan live; apa pun yang terlewat klien yang reconnect harus diambil lewat HTTP dengan kursor.
- **Validasi payload dan batch event berfrekuensi tinggi.** Tab lama mengirim bentuk event sebelumnya setelah deploy, dan kursor atau indikator mengetik sebaiknya dibatasi sekitar 10 per detik serta tidak pernah disimpan.

## Langkah Berikutnya

- Tambahkan presence memakai himpunan Redis dan bersihkan saat `disconnect`.
- Ganti token manual dengan cookie sesi bertanda tangan bila kedua layanan berbagi domain.
- Bangun API kursor (`GET /api/rooms/:id/messages?after=`) dan ambil ulang saat reconnect; load test dengan `k6` lebih dulu.

## Kesimpulan

Anda telah memisahkan realtime dari siklus request Next.js, mengautentikasi setiap socket dengan token berumur pendek yang diterbitkan di route handler terautentikasi, membatasi pengiriman melalui room yang terotorisasi, dan membuat layanan dapat diskalakan horizontal dengan adapter Redis serta perutean sticky. Sisi Next.js tetap aplikasi App Router biasa: Server Component merender riwayat, dan hook hanya menambahkan apa yang tidak bisa didorong server.
