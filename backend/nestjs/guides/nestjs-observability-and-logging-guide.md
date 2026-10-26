---
title: "NestJS Observability and Logging Guide"
description: "Wire structured Pino logs, request-scoped correlation IDs, health probes, Prometheus metrics, and OpenTelemetry traces into a NestJS service so incidents are diagnosable in minutes."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# NestJS Observability and Logging Guide

## Introduction

Observability answers three different questions, and each needs its own signal. Logs say what happened inside one request; metrics say whether the service is healthy right now and how fast it is failing; traces say where time went across services. With all three you can alert on a symptom, find the slow dependency on a dashboard, then read the ten log lines that explain it.

NestJS makes the wiring easy to get subtly wrong. The default `Logger` writes unstructured lines with no request identity, so concurrent requests interleave and nothing ties a line to a user, a route, or an upstream trace. More `console.log` calls only make output noisier. This guide covers the production setup for NestJS 10 on Node 20: `nestjs-pino` for JSON logs, `AsyncLocalStorage` for request context, correlation IDs from the edge, `@nestjs/terminus` probes, Prometheus metrics with `prom-client`, and OpenTelemetry traces that reuse the same context.

## Best Practices

- **Log JSON in production, pretty-print locally.** Aggregators parse fields, not sentences; toggle `pino-pretty` on `NODE_ENV` so humans keep readable output in development.
- **One correlation ID, generated at the edge.** Accept `x-request-id` from the gateway, generate a UUID when absent, echo it back, and attach it to every line. Without it, cross-service debugging is guesswork.
- **Use `AsyncLocalStorage`, not request scope.** Request-scoped providers rebuild the whole injection chain per request; `AsyncLocalStorage` gives every layer the ID without touching constructors.
- **Log events with fields, never secrets.** `event`, `userId`, `route`, `durationMs`, `outcome` are queryable; `authorization`, `cookie`, and password fields must be redacted at the logger so no handler can leak them.
- **Separate liveness from readiness.** Liveness proves the process is alive — a failing database must not restart a healthy pod in a loop. Readiness checks dependencies and is what the load balancer polls.
- **Label metrics by route template, not URL.** `http_request_duration_seconds{method, route, status}` supports latency SLOs; raw URLs create unbounded cardinality and will take Prometheus down.

## Implementation Steps

### Step 1: Install the stack

```bash
npm install nestjs-pino pino-http pino-pretty prom-client @nestjs/terminus
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

### Step 2: Replace the default logger with Pino

Redaction, request IDs, and quiet probe endpoints belong in the module config:

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

Use `NestFactory.create(AppModule, { bufferLogs: true })` plus `app.useLogger(app.get(Logger))` so bootstrap failures are structured too.

### Step 3: Carry the request ID through every layer

`AsyncLocalStorage` holds per-request state without paying for request scope:

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

An interceptor enriches the store after the auth guard resolves the caller, so later logs carry `userId`:

```typescript
intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
  const user = context.switchToHttp().getRequest().user;
  const store = requestContext.getStore();
  if (store && user) store.userId = user.id;
  return next.handle();
}
```

### Step 4: Expose health and metrics endpoints

Liveness stays dependency-free; readiness fails when the database is unreachable:

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
  help: 'HTTP request duration in seconds',
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

Record the histogram when the response finishes, using `req.route.path` rather than `req.url`.

### Step 5: Start tracing before anything else is imported

```typescript
// src/tracing.ts — first import in main.ts, before NestFactory
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

### Step 6: Verify the signals end to end

```bash
curl -s localhost:3000/health/ready | jq
curl -s -H 'x-request-id: demo-123' localhost:3000/api/v1/tasks | jq '.items | length'
docker logs api 2>&1 | jq 'select(.reqId == "demo-123") | {level, msg, userId}'
```

If the last command returns nothing, the middleware is not in the chain: confirm `forRoutes('*')` in `AppModule.configure` and that `RequestContextMiddleware` is provided there.
