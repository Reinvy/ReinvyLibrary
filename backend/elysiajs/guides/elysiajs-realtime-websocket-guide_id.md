---
title: "Panduan Aplikasi Real-Time dengan WebSocket dan SSE di Elysia.js"
description: "Panduan komprehensif untuk membangun fitur real-time dengan Elysia.js, mencakup pengaturan server WebSocket, pesan berbasis ruang, Server-Sent Events, manajemen siklus koneksi, autentikasi untuk koneksi WebSocket, dan pola deployment produksi."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Aplikasi Real-Time dengan WebSocket dan SSE di Elysia.js

## Pendahuluan

Fitur real-time telah menjadi ekspektasi inti dalam aplikasi web modern. Mulai dari obrolan langsung dan pengeditan kolaboratif hingga dashboard real-time dan notifikasi push, pengguna mengharapkan pembaruan instan tanpa perlu melakukan polling. Elysia.js, yang dibangun di atas runtime Bun, menyediakan dukungan kelas satu untuk koneksi WebSocket melalui integrasinya dengan API WebSocket native Bun, sehingga memudahkan pembangunan aplikasi real-time yang skalabel.

Panduan ini mencakup spektrum lengkap pola komunikasi real-time dengan Elysia.js. Anda akan mempelajari cara mengimplementasikan server WebSocket dengan pesan berbasis ruang, menggunakan Server-Sent Events (SSE) untuk pembaruan real-time satu arah, menangani siklus hidup koneksi (connect, disconnect, reconnection), mengautentikasi koneksi WebSocket, dan men-deploy aplikasi real-time ke produksi dengan penskalaan horizontal.

Tidak seperti framework Node.js tradisional yang memerlukan library terpisah (Socket.IO, ws) dan infrastruktur tambahan untuk dukungan WebSocket, Elysia.js memanfaatkan server WebSocket bawaan Bun — tanpa ketergantungan eksternal, performa native, dan API terpadu yang bekerja seamlessly dengan server HTTP.

## Praktik Terbaik

### Gunakan WebSocket Handler Native Bun

Elysia.js mendelegasikan penanganan WebSocket ke API WebSocket native `Bun.serve()`. Ketika Anda mengonfigurasi opsi `websocket` pada instance Elysia, Elysia akan membuat satu server WebSocket yang berbagi port yang sama dengan server HTTP Anda. Kolokasi ini menghilangkan kebutuhan akan proses WebSocket terpisah dan menyederhanakan deployment.

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .ws('/ws', {
    open(ws) {
      console.log('Klien terhubung:', ws.data?.userId)
      ws.subscribe('broadcast')
      ws.send(JSON.stringify({ type: 'connected', id: ws.data?.userId }))
    },
    message(ws, message) {
      const data = JSON.parse(message.toString())
      handleMessage(ws, data)
    },
    close(ws) {
      console.log('Klien terputus:', ws.data?.userId)
    },
  })
  .listen(3000)
```

Method `.ws(path, handlers)` mendaftarkan endpoint WebSocket di path yang diberikan. Handler menerima objek `ws` (sebuah `ServerWebSocket`) yang mendukung `send()`, `subscribe()`, `unsubscribe()`, `publish()`, dan `close()`.

### Implementasi Arsitektur Berbasis Ruang

Untuk aplikasi multi-pengguna seperti ruang obrolan atau dokumen kolaboratif, atur koneksi ke dalam ruang logis daripada menyiarkan ke semua klien. Ini mengurangi overhead pesan dan menegakkan batasan privasi.

```typescript
// Manajemen ruang menggunakan pub/sub native Bun
function joinRoom(ws: ServerWebSocket, roomId: string, userId: string) {
  ws.data = { ...ws.data, roomId, userId }
  ws.subscribe(`room:${roomId}`)
  // Beri tahu anggota ruang
  ws.publish(`room:${roomId}`, JSON.stringify({
    type: 'user:joined',
    userId,
  }))
}

function leaveRoom(ws: ServerWebSocket) {
  if (ws.data?.roomId) {
    ws.unsubscribe(`room:${ws.data.roomId}`)
    ws.publish(`room:${ws.data.roomId}`, JSON.stringify({
      type: 'user:left',
      userId: ws.data.userId,
    }))
  }
}

function sendToRoom(roomId: string, event: object) {
  // publish Bun mengirim ke semua subscriber topik ini
  app.server?.publish(`room:${roomId}`, JSON.stringify(event))
}
```

Gunakan `ws.subscribe(topic)` untuk bergabung dengan saluran pub/sub dan `ws.publish(topic, message)` untuk menyiarkan ke semua subscriber saluran tersebut. Nama topik harus mengikuti konvensi namespace seperti `room:{id}`, `user:{id}`, atau `global:{event}`.

### Struktur Pesan dengan Protokol Discriminated Union

Definisikan protokol pesan yang diketik menggunakan discriminated unions TypeScript. Ini memastikan setiap pesan memiliki field `type` yang dapat diprediksi yang menentukan struktur payload, membuat penanganan pesan menjadi type-safe dan mudah dipelihara.

```typescript
// Tipe protokol pesan
interface ChatMessage {
  type: 'message:send'
  payload: {
    roomId: string
    content: string
    replyTo?: string  // ID pesan untuk balasan bertingkat
  }
}

interface TypingIndicator {
  type: 'typing:start' | 'typing:stop'
  payload: {
    roomId: string
  }
}

interface PresenceUpdate {
  type: 'presence:update'
  payload: {
    status: 'online' | 'away' | 'busy'
  }
}

type WSMessage = ChatMessage | TypingIndicator | PresenceUpdate

// Dispatcher pesan yang type-safe
function handleMessage(ws: ServerWebSocket, message: WSMessage) {
  switch (message.type) {
    case 'message:send':
      return handleChatMessage(ws, message.payload)
    case 'typing:start':
    case 'typing:stop':
      return handleTyping(ws, message)
    case 'presence:update':
      return handlePresence(ws, message.payload)
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Tipe pesan tidak dikenal' }))
  }
}
```

Selalu sertakan respons error untuk tipe pesan yang tidak dikenal. Ini mencegah klien menggantung diam saat mengirim payload yang tidak valid.

### Kelola Siklus Hidup Koneksi

Setiap koneksi WebSocket melalui tiga fase siklus hidup: open, message, dan close. Implementasikan handler untuk ketiganya untuk mempertahankan status koneksi yang bersih.

```typescript
// Registry koneksi untuk klien aktif
const activeConnections = new Map<string, Set<ServerWebSocket>>()

const ws = app.ws('/ws', {
  open(ws) {
    // Lacak koneksi
    const userId = ws.data?.userId
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set())
    }
    activeConnections.get(userId)!.add(ws)

    // Kirim konfirmasi koneksi
    ws.send(JSON.stringify({
      type: 'connection:established',
      payload: { userId, timestamp: Date.now() },
    }))
  },

  message(ws, message) {
    try {
      const parsed = JSON.parse(message.toString())
      handleMessage(ws, parsed)
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'JSON tidak valid' }))
    }
  },

  close(ws) {
    // Bersihkan koneksi
    const userId = ws.data?.userId
    if (userId && activeConnections.has(userId)) {
      activeConnections.get(userId)!.delete(ws)
      if (activeConnections.get(userId)!.size === 0) {
        activeConnections.delete(userId)
      }
    }

    // Tinggalkan semua ruang yang di-subscribe
    if (ws.data?.roomId) {
      ws.publish(`room:${ws.data.roomId}`, JSON.stringify({
        type: 'user:disconnected',
        userId: ws.data.userId,
      }))
    }
  },
})
```

Simpan metadata per-koneksi di `ws.data` (properti yang diketik yang tersedia di `ServerWebSocket` Bun). Gunakan registry koneksi (`Map<userId, Set<ServerWebSocket>>`) untuk melacak banyak tab atau perangkat per pengguna.

### Autentikasi Koneksi WebSocket

Koneksi WebSocket memerlukan penanganan autentikasi khusus karena header permintaan HTTP standar hanya tersedia selama handshake upgrade awal. Elysia.js memungkinkan Anda memvalidasi autentikasi selama handler `open` atau, lebih aman, selama fase upgrade.

```typescript
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

const app = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'fallback-secret',
    })
  )
  .ws('/ws', {
    // Validasi selama upgrade — tolak sebelum WebSocket dibuat
    async upgrade(request) {
      const url = new URL(request.url)
      const token = url.searchParams.get('token')

      if (!token) {
        return false // Tolak upgrade
      }

      try {
        const payload = await app.jwt.verify(token)
        // Lampirkan info pengguna ke ws.data selama upgrade
        return { userId: payload.sub, roles: payload.roles }
      } catch {
        return false
      }
    },
    open(ws) {
      // ws.data sudah berisi { userId, roles } dari upgrade
      console.log('Pengguna terautentikasi:', ws.data.userId)
    },
    message(ws, message) {
      // Tangani pesan — autentikasi sudah diverifikasi
    },
  })
```

Handler `upgrade` berjalan sebelum koneksi WebSocket dibuat. Kembalikan `true` dengan metadata untuk mengizinkan koneksi, atau `false` untuk menolaknya. Ini mencegah klien yang tidak terautentikasi membuat koneksi WebSocket sama sekali, yang lebih efisien daripada memvalidasi di `open` dan langsung menutupnya.

### Gunakan Server-Sent Events untuk Pembaruan Satu Arah

Ketika Anda hanya perlu mendorong pembaruan dari server ke klien (skor langsung, ticker saham, log deployment), Server-Sent Events (SSE) adalah alternatif yang lebih sederhana daripada WebSocket. SSE menggunakan koneksi HTTP standar, bekerja melalui multipleksasi HTTP/2, dan memiliki perilaku koneksi ulang bawaan di browser.

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/events/notifications', ({ set }) => {
    set.headers['Content-Type'] = 'text/event-stream'
    set.headers['Cache-Control'] = 'no-cache'
    set.headers['Connection'] = 'keep-alive'

    const stream = new ReadableStream({
      start(controller) {
        // Kirim event koneksi awal
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`
        ))

        // Dorong notifikasi setiap 5 detik
        const interval = setInterval(() => {
          controller.enqueue(new TextEncoder().encode(
            `event: notification\ndata: ${JSON.stringify(generateNotification())}\n\n`
          ))
        }, 5000)

        // Bersihkan saat koneksi ditutup
        request.signal.addEventListener('abort', () => {
          clearInterval(interval)
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  })
```

Event SSE mengikuti format wire tertentu: setiap event dipisahkan oleh double newline (`\n\n`), dengan field `event:` opsional dan field `data:` yang wajib. API `EventSource` native browser menangani koneksi ulang secara otomatis ketika koneksi terputus.

### Tangani Backpressure dan Connection Draining

Dalam produksi, klien mungkin terputus secara tidak terduga atau tertinggal dalam pemrosesan pesan. Implementasikan penanganan backpressure dan graceful connection draining untuk mencegah kebocoran memori dan memastikan pengiriman yang andal.

```typescript
// Pengiriman pesan yang sadar backpressure
function safeSend(ws: ServerWebSocket, data: string): boolean {
  const buffered = ws.bufferedAmount
  if (buffered > 1024 * 64) {
    // Klien terlalu lambat — jatuhkan atau antre
    console.warn('Backpressure terdeteksi untuk klien:', ws.data?.userId)
    return false
  }
  ws.send(data)
  return true
}

// Graceful shutdown — kuras koneksi yang ada
async function shutdown(server: { stop: () => void }) {
  // Beri tahu semua klien yang terhubung
  for (const [userId, sockets] of activeConnections) {
    for (const ws of sockets) {
      try {
        ws.send(JSON.stringify({ type: 'server:shutdown', payload: { reconnect: true } }))
        ws.close()
      } catch {
        // Socket sudah ditutup
      }
    }
  }

  // Berhenti menerima koneksi baru
  server.stop()
}
```

Pantau `ws.bufferedAmount` untuk mendeteksi klien lambat dan terapkan strategi backpressure (jatuhkan pesan, antre dengan TTL, atau tutup koneksi). Selama shutdown, beri tahu klien yang terhubung agar mereka dapat terhubung kembali ke instance lain.

### Implementasi Indikator Mengetik Secara Efisien

Indikator mengetik adalah fitur real-time umum yang memerlukan desain hati-hati untuk menghindari membanjiri server dengan pesan. Gunakan debouncing dan throttle pembaruan daripada mengirim pesan pada setiap ketukan tombol.

```typescript
// Handler mengetik di sisi server dengan debounce
const typingTimers = new Map<string, NodeJS.Timeout>()

function handleTypingStart(ws: ServerWebSocket, roomId: string) {
  const key = `${roomId}:${ws.data.userId}`

  // Hapus timer yang ada
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key)!)
  }

  // Beri tahu ruang
  ws.publish(`room:${roomId}`, JSON.stringify({
    type: 'typing',
    userId: ws.data.userId,
    isTyping: true,
  }))

  // Hentikan mengetik otomatis setelah 3 detik tidak ada aktivitas
  typingTimers.set(key, setTimeout(() => {
    ws.publish(`room:${roomId}`, JSON.stringify({
      type: 'typing',
      userId: ws.data.userId,
      isTyping: false,
    }))
    typingTimers.delete(key)
  }, 3000))
}
```

Di sisi klien, kirim notifikasi mengetik hanya ketika pengguna mulai mengetik setelah jeda setidaknya 500ms, dan berhenti mengirim ketika jeda mengetik selama 3 detik. Server mempertahankan timer untuk membersihkan status mengetik yang basi secara otomatis.

### Uji Fitur Real-Time dengan Test Runner Bun

Pengujian endpoint WebSocket dan SSE memerlukan pengaturan khusus. Gunakan test runner bawaan Bun dengan koneksi klien `WebSocket` dalam pengujian.

```typescript
import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'

let app: Elysia
let server: { stop: () => void }

beforeAll(() => {
  app = new Elysia()
    .ws('/chat', {
      open(ws) {
        ws.subscribe('general')
        ws.send(JSON.stringify({ type: 'welcome', room: 'general' }))
      },
      message(ws, message) {
        const data = JSON.parse(message.toString())
        if (data.type === 'chat') {
          ws.publish('general', JSON.stringify({
            type: 'chat',
            user: ws.data?.userId,
            text: data.text,
          }))
          ws.send(JSON.stringify({ type: 'ack', id: data.id }))
        }
      },
    })
    .listen(0) // Port acak

  server = app.server!
})

afterAll(() => {
  server.stop()
})

it('harus terhubung dan menerima pesan selamat datang', async () => {
  const ws = new WebSocket(`ws://localhost:${server.port}/chat`)

  const message = await new Promise((resolve) => {
    ws.onmessage = (event) => {
      resolve(JSON.parse(event.data))
    }
  })

  expect(message).toMatchObject({ type: 'welcome', room: 'general' })
  ws.close()
})

it('harus menyiarkan pesan obrolan ke semua klien', async () => {
  const client1 = new WebSocket(`ws://localhost:${server.port}/chat`)
  const client2 = new WebSocket(`ws://localhost:${server.port}/chat`)

  // Tunggu keduanya terhubung
  await Promise.all([
    new Promise((r) => { client1.onopen = r }),
    new Promise((r) => { client2.onopen = r }),
  ])

  // Klien 1 mengirim pesan
  client1.send(JSON.stringify({ type: 'chat', text: 'Halo!', id: 'msg-1' }))

  // Klien 2 harus menerima siaran
  const received = await new Promise((resolve) => {
    client2.onmessage = (event) => resolve(JSON.parse(event.data))
  })

  expect(received).toMatchObject({ type: 'chat', text: 'Halo!' })

  client1.close()
  client2.close()
})
```

Gunakan `app.listen(0)` untuk mengikat ke port acak yang tersedia, menghindari konflik port dalam eksekusi pengujian paralel. Selalu bersihkan koneksi WebSocket di `afterAll` untuk mencegah proses yang menggantung.

## Langkah Implementasi

### Langkah 1: Rencanakan Arsitektur Real-Time

Sebelum menulis kode, desain arsitektur real-time Anda dengan menjawab pertanyaan-pertanyaan ini:

1. **Pola komunikasi**: Apakah Anda memerlukan komunikasi dua arah (WebSocket) atau satu arah (SSE)? Gunakan WebSocket untuk obrolan, pengeditan kolaboratif, dan kursor langsung. Gunakan SSE untuk notifikasi, pembaruan feed, dan streaming log.

2. **Topologi saluran**: Bagaimana pesan akan dirutekan? Berbasis ruang (ruang obrolan), berbasis pengguna (notifikasi pribadi), atau global (pengumuman seluruh sistem)? Desain konvensi penamaan topik seperti `room:{roomId}`, `user:{userId}`, `global:{eventType}`.

3. **Model autentikasi**: Apakah koneksi WebSocket akan diautentikasi melalui parameter query token, cookie, atau header khusus? Putuskan bagaimana validasi token bekerja selama handshake upgrade.

4. **Kebutuhan status**: Status per-koneksi apa yang harus disimpan? Identitas pengguna, ruang yang di-subscribe, metadata koneksi. Rencanakan bentuk `ws.data` dan apakah status perlu bertahan saat koneksi ulang.

5. **Strategi penskalaan**: Apakah Anda memerlukan beberapa instance server? Jika ya, rencanakan broker pub/sub (Redis) untuk menyampaikan pesan antar instance.

### Langkah 2: Buat Plugin WebSocket

Atur logika real-time ke dalam plugin Elysia khusus. Ini menjaga handler WebSocket tetap terisolasi dari handler rute HTTP dan membuat fitur dapat diuji secara independen.

```typescript
// src/plugins/realtime/realtime.plugin.ts
import { Elysia, t } from 'elysia'

interface ClientData {
  userId: string
  username: string
  roles: string[]
}

interface ChatPayload {
  roomId: string
  content: string
  replyTo?: string
}

const activeUsers = new Map<string, Set<ServerWebSocket>>()

export const realtimePlugin = (app: Elysia) =>
  app
    .ws('/ws', {
      async upgrade(request) {
        const url = new URL(request.url)
        const token = url.searchParams.get('token')

        if (!token) return false

        try {
          const payload = await verifyToken(token)
          return {
            userId: payload.sub,
            username: payload.username,
            roles: payload.roles || [],
          } satisfies ClientData
        } catch {
          return false
        }
      },

      open(ws) {
        // Lacak koneksi
        const { userId } = ws.data as ClientData
        if (!activeUsers.has(userId)) {
          activeUsers.set(userId, new Set())
        }
        activeUsers.get(userId)!.add(ws)

        // Gabung otomatis ke saluran pribadi pengguna
        ws.subscribe(`user:${userId}`)

        // Kirim status awal
        ws.send(JSON.stringify({
          type: 'connected',
          payload: { userId, activeUsers: activeUsers.size },
        }))
      },

      message(ws, raw) {
        const data = JSON.parse(raw.toString())
        const client = ws.data as ClientData

        switch (data.type) {
          case 'room:join':
            ws.subscribe(`room:${data.payload.roomId}`)
            ws.publish(`room:${data.payload.roomId}`, JSON.stringify({
              type: 'user:joined',
              payload: { userId: client.userId, username: client.username },
            }))
            break

          case 'room:leave':
            ws.unsubscribe(`room:${data.payload.roomId}`)
            break

          case 'message:send':
            ws.publish(`room:${data.payload.roomId}`, JSON.stringify({
              type: 'message',
              payload: {
                id: crypto.randomUUID(),
                userId: client.userId,
                username: client.username,
                content: data.payload.content,
                timestamp: Date.now(),
                replyTo: data.payload.replyTo,
              },
            }))
            break

          case 'typing':
            ws.publish(`room:${data.payload.roomId}`, JSON.stringify({
              type: 'typing',
              payload: {
                userId: client.userId,
                username: client.username,
                isTyping: data.payload.isTyping,
              },
            }))
            break

          default:
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: `Tipe pesan tidak dikenal: ${data.type}` },
            }))
        }
      },

      close(ws) {
        const client = ws.data as ClientData

        // Hapus dari pengguna aktif
        if (client?.userId && activeUsers.has(client.userId)) {
          activeUsers.get(client.userId)!.delete(ws)
          if (activeUsers.get(client.userId)!.size === 0) {
            activeUsers.delete(client.userId)
          }
        }

        // Umumkan pemutusan koneksi
        ws.publish('global', JSON.stringify({
          type: 'user:disconnected',
          payload: { userId: client?.userId },
        }))
      },
    })
```

Daftarkan plugin ini di file utama aplikasi Anda:

```typescript
// src/index.ts
import { Elysia } from 'elysia'
import { realtimePlugin } from './plugins/realtime/realtime.plugin'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
  .use(cors())
  .use(realtimePlugin)
  .get('/health', () => ({ status: 'ok' }))
  .listen(process.env.PORT || 3000)

console.log(`Server berjalan di http://localhost:${app.server?.port}`)
```

### Langkah 3: Tambahkan Server-Sent Events untuk Notifikasi

Implementasikan endpoint SSE untuk pembaruan real-time satu arah yang tidak memerlukan komunikasi dua arah. Ini ideal untuk feed notifikasi, log deployment, atau dashboard analitik langsung.

```typescript
// src/plugins/notifications/sse.plugin.ts
import { Elysia } from 'elysia'

interface SSEClient {
  id: string
  controller: ReadableStreamDefaultController
  userId?: string
}

const sseClients = new Map<string, SSEClient>()

export const ssePlugin = (app: Elysia) =>
  app.get('/events', ({ request, set }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    const clientId = crypto.randomUUID()

    const stream = new ReadableStream({
      start(controller) {
        sseClients.set(clientId, { id: clientId, controller, userId: userId || undefined })

        // Kirim event koneksi awal
        controller.enqueue(new TextEncoder().encode(
          `event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`
        ))

        // Keep-alive ping setiap 30 detik
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(':\n\n'))
          } catch {
            clearInterval(keepAlive)
          }
        }, 30000)

        // Bersihkan saat terputus
        request.signal.addEventListener('abort', () => {
          clearInterval(keepAlive)
          sseClients.delete(clientId)
        })
      },
    })

    set.headers['Content-Type'] = 'text/event-stream'
    set.headers['Cache-Control'] = 'no-cache'
    set.headers['Connection'] = 'keep-alive'

    return new Response(stream)
  })

// Helper untuk menyiarkan ke semua klien SSE
export function broadcastSSE(event: string, data: object, targetUserId?: string) {
  const encoder = new TextEncoder()
  const message = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  for (const client of sseClients.values()) {
    if (targetUserId && client.userId !== targetUserId) continue
    try {
      client.controller.enqueue(message)
    } catch {
      sseClients.delete(client.id)
    }
  }
}

// Helper untuk memberi tahu pengguna tertentu
export function notifyUser(userId: string, event: string, data: object) {
  broadcastSSE(event, data, userId)
}
```

Mekanisme keep-alive mengirimkan baris komentar kosong (`:\n\n`) setiap 30 detik untuk mencegah server proxy dan load balancer menutup koneksi idle. API `EventSource` di sisi browser menangani koneksi ulang otomatis — tidak perlu logika kustom di sisi klien.

### Langkah 4: Integrasikan WebSocket dan SSE dengan Rute HTTP

Aplikasi real-time seringkali memerlukan endpoint HTTP yang memicu event real-time. Misalnya, endpoint POST yang membuat resource dan kemudian memberi tahu klien yang terhubung.

```typescript
// src/plugins/notifications/notification.http.ts
import { Elysia, t } from 'elysia'
import { broadcastSSE, notifyUser } from './sse.plugin'

export const notificationHttpPlugin = (app: Elysia) =>
  app
    .post(
      '/notifications',
      ({ body }) => {
        // Siarkan ke semua klien SSE yang terhubung
        broadcastSSE('notification', {
          id: crypto.randomUUID(),
          type: body.type,
          title: body.title,
          message: body.message,
          timestamp: Date.now(),
        })

        return { success: true }
      },
      {
        body: t.Object({
          type: t.String(),
          title: t.String(),
          message: t.String(),
        }),
      }
    )
    .post(
      '/notifications/user/:userId',
      ({ params, body }) => {
        // Kirim ke pengguna tertentu saja
        notifyUser(params.userId, 'notification', {
          id: crypto.randomUUID(),
          type: body.type,
          title: body.title,
          message: body.message,
          timestamp: Date.now(),
        })

        return { success: true }
      },
      {
        body: t.Object({
          type: t.String(),
          title: t.String(),
          message: t.String(),
        }),
      }
    )
```

Pola ini berguna untuk penerima webhook yang memproses event eksternal dan mendorongnya ke klien yang terhubung, atau untuk panel admin yang memicu pengumuman di seluruh server.

### Langkah 5: Skalakan dengan Redis Pub/Sub

Ketika Anda men-deploy beberapa instance Elysia di belakang load balancer, koneksi WebSocket didistribusikan ke seluruh instance. Pesan WebSocket yang dikirim ke instance A tidak dapat mencapai klien yang terhubung ke instance B. Atasi ini dengan saluran Redis pub/sub bersama yang menyampaikan pesan antar instance.

```typescript
// src/lib/redis-pubsub.ts
import { Redis } from 'ioredis'

const publisher = new Redis(process.env.REDIS_URL!)
const subscriber = new Redis(process.env.REDIS_URL!)

type MessageHandler = (channel: string, message: string) => void

export class RedisPubSub {
  private handlers = new Map<string, Set<MessageHandler>>()

  constructor() {
    subscriber.on('message', (channel, message) => {
      const channelHandlers = this.handlers.get(channel)
      if (channelHandlers) {
        for (const handler of channelHandlers) {
          handler(channel, message)
        }
      }
    })
  }

  subscribe(channel: string, handler: MessageHandler) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
      subscriber.subscribe(channel)
    }
    this.handlers.get(channel)!.add(handler)
  }

  unsubscribe(channel: string, handler: MessageHandler) {
    const handlers = this.handlers.get(channel)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.handlers.delete(channel)
        subscriber.unsubscribe(channel)
      }
    }
  }

  publish(channel: string, message: string) {
    publisher.publish(channel, message)
  }

  quit() {
    publisher.quit()
    subscriber.quit()
  }
}
```

Integrasikan Redis pub/sub dengan plugin WebSocket Anda:

```typescript
// src/plugins/realtime/realtime.plugin.ts (dengan penskalaan Redis)
import { RedisPubSub } from '../../lib/redis-pubsub'

const pubsub = new RedisPubSub()

export const realtimePlugin = (app: Elysia) =>
  app
    .ws('/ws', {
      open(ws) {
        // Subscribe ke saluran relay Redis
        pubsub.subscribe(`relay:room:${roomId}`, (channel, message) => {
          // Teruskan pesan yang diterima dari instance lain ke klien lokal
          ws.send(message)
        })
      },
      message(ws, raw) {
        const data = JSON.parse(raw.toString())

        if (data.type === 'message:send') {
          // Publikasikan ke klien lokal
          ws.publish(`room:${data.payload.roomId}`, raw.toString())
          // Relay ke instance lain melalui Redis
          pubsub.publish(`relay:room:${data.payload.roomId}`, raw.toString())
        }
      },
      close(ws) {
        // Bersihkan subscription Redis
        pubsub.unsubscribe(`relay:room:${roomId}`, handler)
      },
    })
```

Pola ini memastikan bahwa pesan yang dipublikasikan di instance mana pun mencapai semua klien yang terhubung di semua instance. Gunakan instance Redis khusus atau fitur Redis pub/sub dari cache Redis yang sudah ada untuk meminimalkan infrastruktur.

### Langkah 6: Uji Fitur Real-Time Secara End-to-End

Tulis pengujian komprehensif yang mencakup siklus hidup koneksi, penyiaran pesan, indikator mengetik, penolakan autentikasi, dan pengiriman SSE.

```typescript
import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { realtimePlugin } from '../src/plugins/realtime/realtime.plugin'

let app: Elysia
let server: { stop: () => void; port: number }

beforeAll(() => {
  app = new Elysia().use(realtimePlugin).listen(0)
  server = app.server!
})

afterAll(() => {
  server.stop()
})

it('menolak koneksi yang tidak terautentikasi', () => {
  const ws = new WebSocket(`ws://localhost:${server.port}/ws`)
  expect(ws.readyState).toBe(WebSocket.CLOSED)
})

it('menyiarkan pesan ke anggota ruang', async () => {
  const token = await getTestToken()
  const ws1 = new WebSocket(`ws://localhost:${server.port}/ws?token=${token}`)
  const ws2 = new WebSocket(`ws://localhost:${server.port}/ws?token=${token}`)

  // Tunggu kedua koneksi terbuka
  await Promise.all([
    new Promise((r) => { ws1.onopen = r }),
    new Promise((r) => { ws2.onopen = r }),
  ])

  // Gabung ruang
  ws1.send(JSON.stringify({ type: 'room:join', payload: { roomId: 'test-room' } }))
  ws2.send(JSON.stringify({ type: 'room:join', payload: { roomId: 'test-room' } }))

  // Tunggu event room:joined selesai
  await Bun.sleep(100)

  // ws1 mengirim pesan
  ws1.send(JSON.stringify({
    type: 'message:send',
    payload: { roomId: 'test-room', content: 'Halo dari ws1!' },
  }))

  // ws2 harus menerimanya
  const received = await new Promise((resolve) => {
    ws2.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'message') resolve(data)
    }
  })

  expect(received).toMatchObject({
    type: 'message',
    payload: expect.objectContaining({
      content: 'Halo dari ws1!',
    }),
  })

  ws1.close()
  ws2.close()
})

it('mengirimkan notifikasi SSE', async () => {
  const response = await fetch(
    `http://localhost:${server.port}/events?userId=test-user`
  )

  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('text/event-stream')

  // Picu notifikasi melalui HTTP
  await fetch(`http://localhost:${server.port}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'info',
      title: 'Notifikasi Tes',
      message: 'Ini adalah tes',
    }),
  })

  // Baca stream SSE
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  const { value } = await reader.read()
  const text = decoder.decode(value)

  expect(text).toContain('event: notification')
  expect(text).toContain('Notifikasi Tes')

  reader.cancel()
})
```

Gunakan `Bun.sleep()` untuk jeda kecil antara operasi WebSocket asinkron. Uji dengan port acak (`app.listen(0)`) untuk memungkinkan eksekusi pengujian paralel.

### Langkah 7: Tangani Deployment Produksi

Konfigurasikan lingkungan deployment Anda untuk beban kerja real-time:

```typescript
// src/index.ts — konfigurasi produksi
import { Elysia } from 'elysia'
import { realtimePlugin } from './plugins/realtime/realtime.plugin'
import { ssePlugin } from './plugins/notifications/sse.plugin'
import { RedisPubSub } from './lib/redis-pubsub'

const app = new Elysia()

// Aktifkan Redis pub/sub ketika beberapa instance digunakan
if (process.env.REDIS_URL) {
  const pubsub = new RedisPubSub()
  // Konfigurasi plugin realtime dengan Redis
  app.state('pubsub', pubsub)
}

app
  .use(ssePlugin)
  .use(realtimePlugin)
  .listen(process.env.PORT || 3000)

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Mematikan server secara graceful...')
  app.server?.stop()
  process.exit(0)
})
```

Pertimbangan deployment untuk aplikasi real-time Elysia.js:

1. **Session affinity (sticky sessions)**: Konfigurasikan load balancer Anda untuk merutekan koneksi WebSocket ke instance yang sama berdasarkan handshake awal. Tanpa Redis pub/sub, ini memastikan klien dapat berkomunikasi secara langsung. Dengan Redis pub/sub, sticky sessions bersifat opsional tetapi mengurangi latensi relay Redis.

2. **Batas koneksi**: Server WebSocket Bun menangani ribuan koneksi bersamaan secara efisien. Pantau `ulimit -n` di server dan tetapkan batas file descriptor yang sesuai. Bun di Linux dapat menangani sekitar 100.000 koneksi bersamaan per instance dengan tuning yang tepat.

3. **Terminasi TLS**: Akhiri TLS di tingkat load balancer dan teruskan lalu lintas WebSocket biasa (ws://) ke instance Elysia Anda. Untuk TLS ujung-ke-ujung, gunakan dukungan TLS bawaan Bun dengan `bun.serve({ tls: { key, cert } })`.

4. **Health checks**: Ekspose endpoint health check yang memverifikasi bahwa server WebSocket menerima koneksi dan Redis pub/sub (jika dikonfigurasi) responsif.

5. **Pemantauan resource**: Lacak jumlah koneksi WebSocket aktif, throughput pesan per detik, dan penggunaan memori. Gunakan `process.memoryUsage()` di endpoint metrik atau integrasikan dengan stack observability Anda.

```typescript
// Endpoint metrik untuk pemantauan
app.get('/metrics', () => ({
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  activeConnections: activeUsers.size,
  sseClients: sseClients.size,
}))
```

## Kesimpulan

Membangun aplikasi real-time dengan Elysia.js memanfaatkan implementasi WebSocket native Bun untuk komunikasi dua arah berperforma tinggi tanpa ketergantungan eksternal. Panduan ini mencakup spektrum lengkap pola real-time:

- **Pengaturan server WebSocket** dengan pesan berbasis ruang dan protokol pesan yang diketik
- **Manajemen siklus hidup koneksi** dengan autentikasi selama handshake upgrade
- **Server-Sent Events** untuk pembaruan real-time satu arah yang efisien
- **Penskalaan horizontal** dengan Redis pub/sub untuk menyampaikan pesan antar instance
- **Strategi pengujian** untuk endpoint WebSocket dan SSE menggunakan test runner Bun
- **Pertimbangan deployment produksi** untuk sticky sessions, batas koneksi, dan graceful shutdown

Keputusan arsitektur utama — saluran pub/sub berbasis ruang, protokol pesan discriminated union, WebSocket untuk komunikasi dua arah versus SSE untuk pembaruan satu arah, dan relay Redis untuk penskalaan multi-instance — menyediakan fondasi yang berskala dari prototipe proses tunggal hingga deployment produksi multi-instance.

Untuk langkah selanjutnya, jelajahi integrasi fitur real-time Elysia.js dengan framework frontend (React, Vue, Svelte), implementasi enkripsi ujung-ke-ujung untuk aplikasi obrolan, atau bangun fitur pengeditan kolaboratif dengan struktur data berbasis CRDT di atas lapisan transport WebSocket yang telah ditetapkan dalam panduan ini.
