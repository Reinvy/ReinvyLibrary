---
title: "Panduan Deployment dan Observabilitas Elysia.js"
description: "Panduan praktis menjalankan layanan Elysia.js di Bun: build produksi, graceful shutdown, log terstruktur dengan request id, metrik Prometheus, health probe, dan tracing."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Deployment dan Observabilitas Elysia.js

## Pendahuluan

Aplikasi Elysia yang lulus `bun test` belum tentu layanan yang bisa dioperasikan. Di antara keduanya ada keputusan yang menentukan apakah sebuah insiden selesai dalam lima menit atau menjadi tebakan dua jam: bagaimana artefak dibangun, apakah request yang sedang berjalan selamat saat deploy, apa isi sebenarnya dari satu baris log, dan apakah readiness probe mengatakan hal yang benar kepada load balancer.

Panduan ini membahas sisi operasional layanan Elysia di Bun, dengan asumsi rute, plugin, dan penanganan error sudah ada. Setiap potongan kode dapat ditempel ke `src/index.ts` atau folder `src/observability/` lalu diperketat sesuai kebutuhan.

## Praktik Terbaik

### Bangun satu artefak lalu jalankan apa adanya

Kompilasi dengan `bun build` di CI dan deploy hasilnya. Menjalankan `bun --watch src/index.ts` di produksi berarti TypeScript ditranspilasi setiap start dan image ikut membawa source, test, serta dependensi development.

### Catat peristiwa terstruktur, bukan kalimat

Keluarkan JSON dengan set field tetap — `level`, `msg`, `requestId`, `method`, `path`, `status`, `durationMs`. Teks bebas tidak bisa difilter saat insiden tengah malam. Buat id di lapisan terluar dan kembalikan lewat `x-request-id` agar tiket dukungan bisa dilacak ke baris log tertentu.

### Tiriskan koneksi sebelum keluar

Saat `SIGTERM`: berhenti menerima koneksi, selesaikan request yang berjalan, flush log, lalu keluar. Tanpa ini setiap deploy bergulir kehilangan sebagian request. Jaga batas waktu drain di bawah kill timeout orkestrator agar exit code tetap informatif.

## Langkah Implementasi

### Langkah 1: Hasilkan build produksi

```bash
# Mengompilasi biner mandiri untuk platform target
bun build --compile --target=bun-linux-x64-modern src/index.ts --outfile dist/api

# Menguji artefak tanpa keberadaan source tree
./dist/api & curl -sf http://localhost:3000/healthz && echo "boot ok"
```

Biner tersebut sudah membawa runtime Bun, sehingga image hanya perlu biner dan CA bundle. Bangun per arsitektur (`bun-linux-arm64`) bila node Anda beragam.

### Langkah 2: Pasang graceful shutdown

```typescript
// src/lifecycle.ts
import type { Elysia } from 'elysia'

export function registerShutdown(app: Elysia, drainMs = 10_000) {
  let closing = false
  const shutdown = async (signal: string) => {
    if (closing) return
    closing = true
    const timer = setTimeout(() => process.exit(1), drainMs)
    try {
      await app.stop() // berhenti menerima koneksi, tunggu handler yang berjalan
      clearTimeout(timer)
      console.log(JSON.stringify({ level: 'info', msg: 'shutdown:done', signal }))
      process.exit(0)
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', msg: 'shutdown:failed', error: String(error) }))
      process.exit(1)
    }
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}
```

### Langkah 3: Catat setiap request dengan correlation id

```typescript
// src/observability/logger.ts
import { Elysia } from 'elysia'
import pino from 'pino'

export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

export const requestLogger = new Elysia({ name: 'request-logger' })
  .derive({ as: 'global' }, ({ request, set }) => {
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
    set.headers['x-request-id'] = requestId
    return { requestId, log: logger.child({ requestId }) }
  })
  .onAfterResponse({ as: 'global' }, ({ request, set, requestId, log }) =>
    log.info({ method: request.method, path: new URL(request.url).pathname, status: set.status ?? 200 }, 'request')
  )
  .as('global')
```

Karena `derive` berjalan sebelum handler, plugin lain menerima `requestId` dan `log` bertipe pada context. Mencatat di `onAfterResponse` memastikan status code sudah final.

### Langkah 4: Sediakan metrik Prometheus

```typescript
// src/observability/metrics.ts
import { Elysia } from 'elysia'
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client'

const registry = new Registry()
collectDefaultMetrics({ register: registry })
const labels = ['method', 'route', 'status']

export const httpRequests = new Counter({
  name: 'http_requests_total', help: 'Total HTTP requests', labelNames: labels, registers: [registry]
})
export const httpDuration = new Histogram({
  name: 'http_request_duration_seconds', help: 'Request duration', labelNames: labels,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5], registers: [registry]
})

export const metricsPlugin = new Elysia({ name: 'metrics' }).get('/metrics', ({ set }) => {
  set.headers['content-type'] = registry.contentType
  return registry.metrics()
})
```

Batas bucket sebaiknya mengikuti SLO Anda; set di atas cocok untuk target p95 sekitar 250 ms. Tempatkan `/metrics` pada listener internal atau di balik network policy.

### Langkah 5: Pisahkan endpoint health

```typescript
// src/observability/health.ts
import { Elysia } from 'elysia'

const within = (ms: number) => new Promise<boolean>((r) => setTimeout(() => r(false), ms))

export const healthPlugin = new Elysia({ name: 'health' })
  .get('/healthz', () => ({ status: 'ok' })) // liveness: tanpa pengecekan dependensi
  .get('/readyz', async ({ db, cache, status }) => {
    const [dbOk, cacheOk] = await Promise.all([
      Promise.race([db.query('select 1').then(() => true), within(750)]),
      Promise.race([cache.ping().then(() => true), within(750)])
    ])
    if (!dbOk || !cacheOk) return status(503, { status: 'degraded', db: dbOk, cache: cacheOk })
    return { status: 'ok', db: true, cache: true }
  })
```

Pasang keduanya sebelum guard autentikasi mana pun dan sembunyikan dari spec publik dengan `detail: { hide: true }`. Endpoint readiness yang menunggu tanpa batas lebih buruk daripada tidak ada — selalu balapkan dengan timeout.

### Langkah 6: Trace antar layanan

Karena berjalan di Bun, mulai `NodeSDK` dari `@opentelemetry/sdk-node` dengan `OTLPTraceExporter` yang mengarah ke collector sebelum aplikasi dibuat, lalu matikan di dalam `registerShutdown` agar span terakhir tidak hilang. Cakupan auto-instrumentation di Bun belum merata: bila span HTTP tidak pernah muncul, bungkus handler secara manual dengan `tracer.startActiveSpan` dari `@opentelemetry/api` daripada menelusuri lapisan instrumentasi.

### Langkah 7: Kemas artefak

```dockerfile
FROM oven/bun:1-debian AS build
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build --compile --target=bun-linux-x64-modern src/index.ts --outfile dist/api

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl && useradd --system --uid 10001 app
COPY --from=build /app/dist/api /usr/local/bin/api
USER app
HEALTHCHECK --interval=10s --timeout=2s CMD curl -fsS http://localhost:3000/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/api"]
```

Setelah itu verifikasi hal yang sama dengan platform Anda: boot dengan `DATABASE_URL` yang salah dan pastikan keluar non-nol dengan pesan jelas, lalu kirim `SIGTERM` saat beban berjalan untuk memastikan tidak ada request gagal dan baris `shutdown:done` tercatat.
