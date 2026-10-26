---
title: "Panduan Observabilitas dan Logging NestJS"
description: "Merangkai log Pino terstruktur, correlation ID per request, health probe, metrik Prometheus, dan trace OpenTelemetry di layanan NestJS agar insiden bisa didiagnosis dalam hitungan menit."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Observabilitas dan Logging NestJS

## Pendahuluan

Observabilitas menjawab tiga pertanyaan berbeda, dan masing-masing butuh sinyalnya sendiri. Log memberi tahu apa yang terjadi di dalam satu request; metrik memberi tahu apakah layanan sehat sekarang dan seberapa cepat ia gagal; trace memberi tahu ke mana waktu pergi antar layanan. Dengan ketiganya Anda bisa memberi alert pada gejala, menemukan dependensi lambat di dashboard, lalu membaca sepuluh baris log yang menjelaskannya.

NestJS membuat perangkaiannya mudah salah secara halus. `Logger` bawaan menulis baris tanpa struktur dan tanpa identitas request, sehingga request bersamaan saling berselang-seling dan tidak ada yang mengaitkan satu baris dengan user, rute, atau trace di hulu. Menambah panggilan `console.log` hanya membuat output lebih berisik. Panduan ini membahas setup produksi untuk NestJS 10 di Node 20: `nestjs-pino` untuk log JSON, `AsyncLocalStorage` untuk konteks request, correlation ID dari tepi, probe `@nestjs/terminus`, metrik Prometheus lewat `prom-client`, dan trace OpenTelemetry yang memakai konteks yang sama.

## Praktik Terbaik

- **JSON di produksi, pretty-print hanya lokal.** Aggregator mem-parsing field, bukan kalimat; aktifkan `pino-pretty` berdasarkan `NODE_ENV` agar manusia tetap mendapat output terbaca saat pengembangan.
- **Satu correlation ID, dibuat di tepi.** Terima `x-request-id` dari gateway, buat UUID bila tidak ada, kembalikan di header respons, dan tempelkan ke setiap baris log. Tanpa itu, debugging lintas layanan hanya menebak.
- **Pakai `AsyncLocalStorage`, bukan request scope.** Provider request-scoped membangun ulang seluruh rantai injeksi tiap request; `AsyncLocalStorage` memberi semua lapisan ID tanpa menyentuh constructor.
- **Catat event berupa field, jangan pernah catat rahasia.** `event`, `userId`, `route`, `durationMs`, `outcome` bisa di-query; field `authorization`, `cookie`, dan password wajib di-redact di logger agar tidak ada handler yang membocorkannya.
- **Pisahkan liveness dari readiness.** Liveness hanya membuktikan proses hidup — database yang gagal tidak boleh me-restart pod sehat berulang kali. Readiness memeriksa dependensi dan itulah yang di-poll load balancer.
- **Beri label metrik dengan template rute, bukan URL.** `http_request_duration_seconds{method, route, status}` mendukung SLO latensi; URL mentah menciptakan kardinalitas tak terbatas dan akan menjatuhkan Prometheus.

## Langkah Implementasi

### Langkah 1: Instalasi stack

```bash
npm install nestjs-pino pino-http pino-pretty prom-client @nestjs/terminus
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

### Langkah 2: Ganti logger bawaan dengan Pino

Redaksi, ID request, dan endpoint probe yang senyap semuanya ada di konfigurasi modul:

```typescript
// src/app.module.ts
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req, res) => {
          const id = (req.headers['x-request-id'] as string) ?? randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
        autoLogging: { ignore: (req) => ['/health/live', '/health/ready', '/metrics'].includes(req.url ?? '') },
        transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
      },
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
```

Gunakan `NestFactory.create(AppModule, { bufferLogs: true })` lalu `app.useLogger(app.get(Logger))` agar kegagalan saat bootstrap juga tercatat terstruktur.

### Langkah 3: Bawa ID request ke seluruh lapisan

`AsyncLocalStorage` menyimpan state per request tanpa biaya request scope:

```typescript
// src/common/request-context.ts
export interface RequestStore {
  requestId: string;
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

// src/common/request-context.middleware.ts
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, _res: Response, next: NextFunction): void {
    requestContext.run({ requestId: req.id ?? 'unknown' }, () => next());
  }
}
```

Interceptor berikut memperkaya store setelah guard auth menentukan pemanggil, sehingga log selanjutnya membawa `userId`:

```typescript
intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
  const user = context.switchToHttp().getRequest().user;
  const store = requestContext.getStore();
  if (store && user) store.userId = user.id;
  return next.handle();
}
```

### Langkah 4: Sediakan endpoint health dan metrik

Liveness bebas dependensi; readiness gagal ketika database tidak terjangkau:

```typescript
// src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService, private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.pingCheck('database', this.prisma, { timeout: 1500 })]);
  }
}

// src/metrics/metrics.controller.ts
export const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durasi request HTTP dalam detik',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 1, 3],
});

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', register.contentType)
  metrics(): Promise<string> {
    return register.metrics();
  }
}
```

Catat histogram saat respons selesai, memakai `req.route.path` dan bukan `req.url`.

### Langkah 5: Mulai tracing sebelum modul lain diimpor

```typescript
// src/tracing.ts — impor pertama di main.ts, sebelum NestFactory
const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'nestjs-api',
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_ENDPOINT }),
  instrumentations: [getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } })],
});

sdk.start();
process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

### Langkah 6: Verifikasi sinyal dari ujung ke ujung

```bash
curl -s localhost:3000/health/ready | jq
curl -s -H 'x-request-id: demo-123' localhost:3000/api/v1/tasks | jq '.items | length'
docker logs api 2>&1 | jq 'select(.reqId == "demo-123") | {level, msg, userId}'
```

Bila perintah terakhir tidak mengembalikan apa pun, middleware tidak masuk ke rantai: pastikan `forRoutes('*')` ada di `AppModule.configure` dan `RequestContextMiddleware` terdaftar di modul tersebut.
