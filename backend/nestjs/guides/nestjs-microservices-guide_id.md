---
title: "Panduan Mikroservis NestJS"
description: "Panduan lengkap untuk membangun dan mengorkestrasi mikroservis dengan NestJS menggunakan paket mikroservis bawaan, mencakup transport TCP, Redis, RabbitMQ, dan Kafka, pola pesan, serta arsitektur sistem terdistribusi."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Mikroservis NestJS

## Pendahuluan

Arsitektur mikroservis telah menjadi pendekatan standar untuk membangun sistem backend yang skalabel dan mudah dipelihara. Alih-alih aplikasi monolitik, sistem dipecah menjadi layanan-layanan kecil yang dapat di-deploy secara independen dan berkomunikasi melalui jaringan. NestJS menyediakan paket mikroservis kelas satu (`@nestjs/microservices`) yang memudahkan pembangunan layanan menggunakan berbagai lapisan transport — TCP, Redis, RabbitMQ, Kafka, NATS, MQTT, dan gRPC — tanpa mengubah arsitektur aplikasi Anda.

Panduan ini mencakup pola arsitektur, praktik terbaik, dan langkah implementasi untuk membangun mikroservis production-ready dengan NestJS. Anda akan mempelajari cara merancang batas layanan, memilih lapisan transport yang tepat, mengimplementasikan komunikasi antar-layanan dengan pola pengiriman pesan dan berbasis event, menangani masalah sistem terdistribusi seperti retry dan idempotensi, serta men-deploy layanan Anda di lingkungan kontainer.

## Praktik Terbaik

### Perancangan Batas Layanan

Tentukan batas layanan berdasarkan domain bisnis, bukan lapisan teknis. Setiap layanan harus memiliki data, logika bisnis, dan kontrak API-nya sendiri. Gunakan prinsip **bounded context** dari Domain-Driven Design untuk menentukan di mana satu layanan berakhir dan layanan lain dimulai. Indikator batas yang terdefinisi dengan baik meliputi kemampuan deploy secara independen, kepemilikan tim yang otonom, dan domain data yang jelas yang tidak memerlukan akses real-time ke basis data privat layanan lain.

Hindari menciptakan arsitektur mikroservis yang sebenarnya hanyalah monolit terdistribusi — di mana layanan dipisah berdasarkan lapisan teknis (controllers, services, repositories) daripada berdasarkan kapabilitas bisnis. Setiap mikroservis NestJS harus menjadi aplikasi yang lengkap dan mandiri dengan struktur modulnya sendiri.

### Pemilihan Lapisan Transport

Pilih lapisan transport berdasarkan pola komunikasi dan infrastruktur Anda:

- **TCP** (default): Terbaik untuk pola request-response sederhana dalam jaringan tepercaya. Latensi rendah, tanpa ketergantungan broker eksternal. Ideal untuk komunikasi internal antar-layanan di mana persistensi pesan dan pub/sub tidak diperlukan.
- **Redis** (pub/sub): Gunakan untuk penyiaran event dan notifikasi real-time. Redis bertindak sebagai broker pesan ringan. Cocok untuk skenario di mana layanan perlu bereaksi terhadap event tetapi tidak memerlukan persistensi pesan atau pengiriman terjamin.
- **RabbitMQ**: Pilih untuk sistem produksi yang memerlukan pengiriman pesan yang andal, fleksibilitas routing, dan persistensi pesan. Mendukung routing kompleks dengan exchange dan queue. Terbaik untuk pemrosesan perintah, antrian tugas, dan alur kerja yang memerlukan semantik pengiriman setidaknya-sekali.
- **Kafka**: Ideal untuk streaming event throughput tinggi, agregasi log, dan event sourcing. Model log terpartisi Kafka unggul dalam memutar ulang event historis dan menangani volume data besar. Pilih Kafka ketika Anda perlu menyimpan dan memutar ulang pesan, atau saat membangun sistem berbasis event dengan banyak konsumen.

Sebagai aturan praktis: mulai dengan TCP untuk request-response sinkron, tambahkan RabbitMQ untuk pemrosesan perintah dan tugas, dan adopsi Kafka ketika Anda memerlukan streaming event dan pemutaran ulang pesan.

### Pola Komunikasi

**Komunikasi hibrida**: Sebagian besar sistem produksi membutuhkan komunikasi sinkron dan asinkron. Gunakan komunikasi sinkron (request-response melalui TCP atau HTTP) untuk kueri dan perintah yang memerlukan konfirmasi segera. Gunakan komunikasi asinkron (event dan pesan melalui RabbitMQ atau Kafka) untuk operasi yang dapat ditunda, memerlukan fan-out ke beberapa konsumen, atau memerlukan pengiriman yang andal.

**Client-server untuk kueri**: Ketika Layanan A membutuhkan data dari Layanan B untuk memenuhi permintaan, gunakan komunikasi TCP sinkron. NestJS membuat pola ini mudah dengan dekorator `@Client()` dan `@MessagePattern()`.

**Berbasis event untuk perubahan status**: Ketika Layanan A menyelesaikan operasi yang mungkin relevan bagi layanan lain (misalnya, "pesanan dibuat"), kirim event melalui event bus. Layanan lain berlangganan ke event yang relevan dan bereaksi sesuai. Ini memisahkan produsen dari konsumen dan memungkinkan layanan baru berlangganan tanpa mengubah kode yang sudah ada.

**Pola Saga untuk transaksi terdistribusi**: Gunakan pola Saga (koreografi atau orkestrasi) untuk mengelola alur kerja multi-layanan. Arsitektur berbasis event NestJS cocok secara alami dengan saga berbasis koreografi, di mana setiap layanan mengirimkan event dan mendengarkan event yang memicu langkah berikutnya.

### Penanganan Error dan Ketahanan

Sistem terdistribusi gagal dengan cara yang kompleks. Implementasikan pola ketahanan berikut:

- **Retry dengan backoff eksponensial**: Kegagalan sementara (timeout jaringan, ketidaktersediaan broker sementara) harus dicoba ulang dengan penundaan yang meningkat. `@nestjs/microservices` tidak menyertakan retry bawaan — bungkus client proxy Anda dengan interceptor retry.
- **Circuit breaker**: Cegah kegagalan berantai dengan gagal-cepat ketika layanan hilir tidak tersedia. Implementasikan circuit breaker menggunakan pustaka seperti `@nestjs/bull` untuk pemrosesan berbasis antrian atau interceptor kustom.
- **Dead letter queues (DLQ)**: Pesan yang tidak dapat diproses setelah beberapa kali percobaan ulang harus dipindahkan ke DLQ untuk pemeriksaan manual. Baik RabbitMQ maupun Kafka mendukung DLQ secara native.
- **Idempotensi**: Rancang handler pesan agar idempoten — memproses pesan yang sama dua kali harus menghasilkan hasil yang sama. Gunakan kunci idempotensi (misalnya, ID pesan unik yang disimpan di basis data dengan constraint unik) untuk mendeteksi dan melewati pesan duplikat.

### Observabilitas

Mikroservis yang tersebar di beberapa proses memerlukan observabilitas terpusat:

- **Correlation ID**: Berikan correlation ID unik melintasi batas layanan untuk melacak permintaan tunggal melalui beberapa layanan. Interceptor NestJS dapat menyuntikkan dan menyebarkan correlation ID secara otomatis.
- **Logging terstruktur**: Gunakan Logger `@nestjs/common` atau logger terstruktur seperti Pino. Setiap entri log harus menyertakan nama layanan, correlation ID, dan konteks terstruktur.
- **Distributed tracing**: Integrasikan dengan OpenTelemetry untuk melacak permintaan melintasi batas layanan. NestJS memiliki dukungan native untuk OpenTelemetry melalui paket `@nestjs/opentelemetry`.
- **Health checks**: Setiap layanan harus mengekspos endpoint health check. NestJS menyediakan `@nestjs/terminus` untuk health check komprehensif termasuk koneksi basis data, konektivitas broker pesan, dan ketergantungan layanan eksternal.

## Langkah Implementasi

### Langkah 1: Siapkan Aplikasi Mikroservis

Buat aplikasi NestJS dan instal paket yang diperlukan. Paket mikroservis sudah termasuk dalam NestJS secara default — tidak diperlukan instalasi tambahan. Namun, Anda akan memerlukan paket khusus transport tergantung pada transport yang dipilih.

```bash
nest new order-service --package-manager npm
cd order-service
```

Untuk transport Redis, instal klien Redis:

```bash
npm install redis
```

Untuk RabbitMQ, gunakan paket `amqplib`:

```bash
npm install amqplib amqp-connection-manager
```

Untuk Kafka, instal klien KafkaJS:

```bash
npm install kafkajs
```

Konfigurasikan aplikasi utama untuk menggunakan mode mikroservis alih-alih listener HTTP default. Di `main.ts` Anda, buat aplikasi hibrida yang mendukung HTTP (untuk health check dan endpoint admin) dan transport mikroservis:

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Konfigurasi mikroservis TCP
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001,
    },
  });

  // Konfigurasi mikroservis RabbitMQ (untuk pemrosesan pesan asinkron)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'orders_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000); // Server HTTP untuk health check dan admin
}
bootstrap();
```

### Langkah 2: Definisikan Kontrak Pesan

Buat antarmuka atau kelas bersama yang mendefinisikan pesan yang mengalir antar layanan. Kontrak ini harus berada di pustaka atau paket bersama yang diimpor oleh layanan produsen dan konsumen. Ini memastikan keamanan tipe dan mendokumentasikan API layanan.

```typescript
// shared/order.contracts.ts
export class CreateOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly items: OrderItem[],
    public readonly totalAmount: number,
  ) {}
}

export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly totalAmount: number,
  ) {}
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}
```

### Langkah 3: Implementasikan Handler Pesan

Di layanan penerima, gunakan `@MessagePattern()` untuk menangani pesan perintah (request-response) dan `@EventPattern()` untuk menangani pesan event (fire-and-forget). String pola bertindak sebagai kunci routing pesan.

```typescript
// order.service.ts
import { Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateOrderCommand, OrderCreatedEvent } from './shared/order.contracts';

@Injectable()
export class OrderService {
  @MessagePattern('order.create')
  async createOrder(@Payload() command: CreateOrderCommand) {
    // Validasi pesanan, periksa inventaris, simpan ke basis data
    const order = await this.ordersRepository.create({
      id: command.orderId,
      userId: command.userId,
      items: command.items,
      totalAmount: command.totalAmount,
      status: 'created',
    });

    // Respons dikirim kembali ke layanan yang meminta
    return { success: true, orderId: order.id };
  }

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() event: OrderCreatedEvent) {
    // Bereaksi terhadap pembuatan pesanan (misalnya, kirim email konfirmasi)
    await this.notificationService.sendConfirmation(event.userId, event.orderId);
  }
}
```

### Langkah 4: Siapkan Client Proxy

Di layanan yang perlu berkomunikasi dengan mikroservis, injeksi client proxy. NestJS menyediakan `ClientProxyFactory` dan `@Client()` untuk membuat klien yang terhubung ke mikroservis.

```typescript
// api-gateway.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { CreateOrderCommand, OrderCreatedEvent } from './shared/order.contracts';

@Injectable()
export class ApiGatewayService implements OnModuleInit {
  private orderClient: ClientProxy;

  onModuleInit() {
    this.orderClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 3001 },
    });
  }

  async placeOrder(userId: string, items: OrderItem[]) {
    const command = new CreateOrderCommand(
      crypto.randomUUID(),
      userId,
      items,
      this.calculateTotal(items),
    );

    // Kirim perintah dan tunggu respons
    const result = await this.orderClient
      .send<{ success: boolean; orderId: string }>('order.create', command)
      .toPromise();

    // Setelah pembuatan berhasil, kirim event
    this.orderClient.emit('order.created', new OrderCreatedEvent(
      command.orderId,
      userId,
      command.totalAmount,
    ));

    return result;
  }
}
```

### Langkah 5: Implementasikan Pola Saga untuk Alur Kerja Terdistribusi

Ketika satu operasi pengguna melibatkan beberapa layanan (misalnya, melakukan pemesanan melibatkan reservasi inventaris, pemrosesan pembayaran, dan penjadwalan pengiriman), gunakan pola Saga. Dalam saga berbasis koreografi, setiap layanan mengirimkan event dan mendengarkan event kompensasi.

```typescript
// inventory.service.ts — bagian dari saga pesanan
@Injectable()
export class InventoryService {
  @MessagePattern('inventory.reserve')
  async reserveInventory(@Payload() command: ReserveInventoryCommand) {
    try {
      const reserved = await this.inventoryRepository.reserve(
        command.items,
      );
      return { success: true, reservationId: reserved.id };
    } catch (error) {
      // Jika inventaris tidak mencukupi, kirim event kompensasi
      this.client.emit('order.compensation.needed', {
        orderId: command.orderId,
        reason: 'insufficient_inventory',
      });
      return { success: false, error: 'Insufficient inventory' };
    }
  }

  @EventPattern('payment.failed')
  async handlePaymentFailure(@Payload() event: PaymentFailedEvent) {
    // Tindakan kompensasi: lepaskan inventaris yang sudah direservasi
    await this.inventoryRepository.release(event.reservationId);
  }
}
```

### Langkah 6: Tambahkan Logika Retry dan Ketahanan

Bungkus panggilan client proxy Anda dengan logika retry menggunakan operator RxJS. `ClientProxy.send()` NestJS mengembalikan Observable, yang memungkinkan Anda merantai operator retry secara langsung:

```typescript
import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { retry, catchError, timeout, TimeoutError } from 'rxjs/operators';
import { lastValueFrom, throwError } from 'rxjs';

@Injectable()
export class ResilientApiGatewayService {
  private orderClient: ClientProxy;

  async placeOrderWithRetry(command: CreateOrderCommand) {
    const result$ = this.orderClient.send('order.create', command).pipe(
      timeout(5000), // Gagal cepat jika tidak ada respons dalam 5 detik
      retry({
        count: 3,
        delay: (error, retryCount) => {
          // Exponential backoff: 1d, 2d, 4d
          const delayMs = 1000 * Math.pow(2, retryCount - 1);
          console.warn(
            `Percobaan ulang ${retryCount}/3 setelah ${delayMs}ms karena: ${error.message}`,
          );
          return new Promise(resolve => setTimeout(resolve, delayMs));
        },
      }),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          return throwError(() => new Error('Layanan pesanan timeout'));
        }
        return throwError(() => error);
      }),
    );

    return lastValueFrom(result$);
  }
}
```

### Langkah 7: Tambahkan Propagasi Correlation ID

Buat middleware atau interceptor yang menghasilkan dan menyebarkan correlation ID melintasi batas layanan:

```typescript
// correlation-id.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationIdStorage = new AsyncLocalStorage<string>();

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToRpc().getData();
    const correlationId = request?.correlationId || uuidv4();

    return correlationIdStorage.run(correlationId, () => {
      // Suntikkan correlation ID ke dalam respons
      return next.handle().pipe(
        tap((response) => {
          if (response && typeof response === 'object') {
            response.correlationId = correlationId;
          }
        }),
      );
    });
  }
}
```

Di sisi klien, injeksi correlation ID saat ini dari `AsyncLocalStorage` ke setiap pesan keluar:

```typescript
// correlation-aware.client-proxy.ts
import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { correlationIdStorage } from './correlation-id.interceptor';

@Injectable()
export class CorrelationAwareClientProxy {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 3001 },
    });
  }

  send<TResult = any, TInput = any>(pattern: string, data: TInput) {
    const correlationId = correlationIdStorage.getStore();
    return this.client.send<TResult>(pattern, {
      ...(data as any),
      correlationId,
    });
  }
}
```

### Langkah 8: Kontainerisasi dan Orkestrasi

Kemas setiap mikroservis NestJS sebagai kontainer Docker. Gunakan Docker Compose untuk pengembangan lokal dan Kubernetes untuk produksi.

```dockerfile
# Dockerfile (ditempatkan di root setiap layanan)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

```yaml
# docker-compose.yml (pengembangan)
version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  order-service:
    build: ./order-service
    ports:
      - "3001:3000"
    environment:
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - REDIS_URL=redis://redis:6379
    depends_on:
      - rabbitmq
      - redis

  inventory-service:
    build: ./inventory-service
    ports:
      - "3002:3000"
    environment:
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - REDIS_URL=redis://redis:6379
    depends_on:
      - rabbitmq
      - redis
```

### Langkah 9: Implementasikan Health Check dan Observabilitas

Tambahkan health check ke setiap layanan menggunakan `@nestjs/terminus`:

```bash
npm install @nestjs/terminus
```

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Transport } from '@nestjs/microservices';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private microservice: MicroserviceHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () =>
        this.microservice.pingCheck('rabbitmq', {
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL],
            queue: 'health_check',
          },
        }),
    ]);
  }
}
```

Tambahkan logging terstruktur dengan dukungan correlation ID:

```typescript
// structured-logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import { correlationIdStorage } from './correlation-id.interceptor';

@Injectable()
export class StructuredLogger implements LoggerService {
  private formatMessage(message: string, context?: string) {
    const correlationId = correlationIdStorage.getStore();
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'unknown',
      correlationId,
      message,
      context,
    });
  }

  log(message: string, context?: string) {
    console.log(this.formatMessage(message, context));
  }

  error(message: string, trace?: string, context?: string) {
    console.error(this.formatMessage(message, context), trace || '');
  }

  warn(message: string, context?: string) {
    console.warn(this.formatMessage(message, context));
  }
}
```

### Langkah 10: Validasi dan Amankan Komunikasi Antar-Layanan

Amankan endpoint mikroservis Anda dengan mengimplementasikan otentikasi antar layanan. Dalam produksi, layanan harus memverifikasi bahwa permintaan masuk berasal dari peer tepercaya:

```typescript
// rpc-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class RpcAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToRpc().getData();
    const signature = request?.signature;
    const timestamp = request?.timestamp;

    if (!signature || !timestamp) {
      throw new UnauthorizedException('Otentikasi tidak ditemukan');
    }

    // Verifikasi bahwa timestamp dalam 30 detik (cegah serangan replay)
    const now = Date.now();
    if (now - parseInt(timestamp, 10) > 30000) {
      throw new UnauthorizedException('Permintaan kedaluwarsa');
    }

    // Verifikasi tanda tangan HMAC menggunakan secret bersama
    const payload = `${timestamp}.${JSON.stringify(request.body)}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.SERVICE_SECRET!)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Tanda tangan tidak valid');
    }

    return true;
  }
}
```

Terapkan guard ke handler pesan yang hanya boleh menerima permintaan dari layanan internal tepercaya:

```typescript
@MessagePattern('order.create')
@UseGuards(RpcAuthGuard)
async createOrder(@Payload() command: CreateOrderCommand) {
  // Handler ini hanya akan memproses permintaan yang terotentikasi
}
```

Pola otentikasi ini memastikan bahwa bahkan jika layanan yang tidak berwenang mendapatkan akses jaringan ke broker pesan Anda, mereka tidak dapat menjalankan operasi sensitif tanpa secret bersama yang benar.
