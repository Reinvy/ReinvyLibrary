---
title: "NestJS Microservices Guide"
description: "A comprehensive guide to building and orchestrating microservices with NestJS using its built-in microservices package, covering TCP, Redis, RabbitMQ, and Kafka transports, message patterns, and distributed system architecture."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# NestJS Microservices Guide

## Introduction

Microservices architecture has become the standard approach for building scalable, maintainable backend systems. Instead of a monolithic application, the system is decomposed into smaller, independently deployable services that communicate over a network. NestJS provides a first-class microservices package (`@nestjs/microservices`) that makes it straightforward to build services using various transport layers — TCP, Redis, RabbitMQ, Kafka, NATS, MQTT, and gRPC — without changing your application architecture.

This guide covers the architectural patterns, best practices, and implementation steps for building production-ready microservices with NestJS. You will learn how to design service boundaries, choose appropriate transport layers, implement inter-service communication with both message-passing and event-driven patterns, handle distributed system concerns like retries and idempotency, and deploy your services in a containerized environment.

## Best Practices

### Service Boundary Design

Define service boundaries around business domains, not technical layers. A service should own its data, business logic, and API contract. Use the **bounded context** principle from Domain-Driven Design to determine where one service ends and another begins. Indicators of a well-defined boundary include independent deployability, autonomous team ownership, and a clear data domain that does not require real-time access to another service's private database.

Avoid creating a microservices architecture that is merely a distributed monolith — where services are split by technical layer (controllers, services, repositories) rather than by business capability. Each NestJS microservice should be a complete, self-contained application with its own module structure, not a slice of a larger application.

### Transport Layer Selection

Choose the transport layer based on your communication patterns and infrastructure:

- **TCP** (default): Best for simple request-response patterns within a trusted network. Low latency, no external broker dependency. Ideal for internal service-to-service communication where message persistence and pub/sub are not required.
- **Redis** (pub/sub): Use for event broadcasting and real-time notifications. Redis acts as a lightweight message broker. Good for scenarios where services need to react to events but do not require message persistence or guaranteed delivery.
- **RabbitMQ**: Choose for production systems that need reliable message delivery, routing flexibility, and message persistence. Supports complex routing with exchanges and queues. Best for command processing, task queues, and workflows that require at-least-once delivery semantics.
- **Kafka**: Ideal for high-throughput event streaming, log aggregation, and event sourcing. Kafka's partitioned log model excels at replaying historical events and handling large volumes of data. Choose Kafka when you need to retain and replay messages, or when building event-driven systems with multiple consumers.

As a rule of thumb: start with TCP for synchronous request-response, add RabbitMQ for command and task processing, and adopt Kafka when you need event streaming and message replay.

### Communication Patterns

**Hybrid communication**: Most production systems need both synchronous and asynchronous communication. Use synchronous (request-response over TCP or HTTP) for queries and commands that need immediate confirmation. Use asynchronous (events and messages over RabbitMQ or Kafka) for operations that can be deferred, need fan-out to multiple consumers, or require reliable delivery.

**Client-server for queries**: When Service A needs data from Service B to fulfill a request, use synchronous TCP communication. NestJS makes this pattern trivial with `@Client()` and `@MessagePattern()` decorators.

**Event-driven for state changes**: When Service A completes an operation that other services might care about (e.g., "order created"), emit an event via the event bus. Other services subscribe to relevant events and react accordingly. This decouples producers from consumers and allows new services to subscribe without modifying existing code.

**Saga pattern for distributed transactions**: Use the Saga pattern (choreography or orchestration) to manage multi-service workflows. NestJS's event-driven architecture pairs naturally with choreography-based sagas, where each service emits events and listens for events that trigger the next step.

### Error Handling and Resilience

Distributed systems fail in complex ways. Implement these resilience patterns:

- **Retry with exponential backoff**: Transient failures (network timeouts, temporary broker unavailability) should be retried with increasing delays. NestJS's `@nestjs/microservices` does not include built-in retry — wrap your client proxies with a retry interceptor.
- **Circuit breaker**: Prevent cascading failures by failing fast when a downstream service is unavailable. Implement circuit breakers using libraries like `@nestjs/bull` for queue-based processing or custom interceptors.
- **Dead letter queues (DLQ)**: Messages that cannot be processed after multiple retries should be moved to a DLQ for manual inspection. Both RabbitMQ and Kafka support DLQ natively.
- **Idempotency**: Design message handlers to be idempotent — processing the same message twice should produce the same result. Use idempotency keys (e.g., a unique message ID stored in a database with a unique constraint) to detect and skip duplicate messages.

### Observability

Microservices distributed across multiple processes require centralized observability:

- **Correlation IDs**: Pass a unique correlation ID across service boundaries to trace a single request through multiple services. NestJS interceptors can inject and propagate correlation IDs automatically.
- **Structured logging**: Use `@nestjs/common` Logger or a structured logger like Pino. Each log entry should include the service name, correlation ID, and structured context.
- **Distributed tracing**: Integrate with OpenTelemetry to trace requests across service boundaries. NestJS has native support for OpenTelemetry through the `@nestjs/opentelemetry` package.
- **Health checks**: Each service should expose a health check endpoint. NestJS provides `@nestjs/terminus` for comprehensive health checks including database connections, message broker connectivity, and external service dependencies.

## Implementation Steps

### Step 1: Set Up the Microservice Application

Create a NestJS application and install the microservices package. The microservices package is included with NestJS by default — no additional installation is required. However, you will need transport-specific packages depending on your chosen transport.

```bash
nest new order-service --package-manager npm
cd order-service
```

For Redis transport, install the Redis client:

```bash
npm install redis
```

For RabbitMQ, use the `amqplib` package:

```bash
npm install amqplib amqp-connection-manager
```

For Kafka, install the KafkaJS client:

```bash
npm install kafkajs
```

Configure the main application to use the microservice mode instead of the default HTTP listener. In your `main.ts`, create a hybrid application that supports both HTTP (for health checks and admin endpoints) and the microservice transport:

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure TCP microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001,
    },
  });

  // Configure RabbitMQ microservice (for async message processing)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'orders_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000); // HTTP server for health checks and admin
}
bootstrap();
```

### Step 2: Define Message Contracts

Create shared interfaces or classes that define the messages flowing between services. These contracts should live in a shared library or package that both the producer and consumer services import. This ensures type safety and documents the service API.

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

### Step 3: Implement Message Handlers

In the receiving service, use `@MessagePattern()` to handle command messages (request-response) and `@EventPattern()` to handle event messages (fire-and-forget). The pattern string acts as the message routing key.

```typescript
// order.service.ts
import { Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateOrderCommand, OrderCreatedEvent } from './shared/order.contracts';

@Injectable()
export class OrderService {
  @MessagePattern('order.create')
  async createOrder(@Payload() command: CreateOrderCommand) {
    // Validate order, check inventory, persist to database
    const order = await this.ordersRepository.create({
      id: command.orderId,
      userId: command.userId,
      items: command.items,
      totalAmount: command.totalAmount,
      status: 'created',
    });

    // The response is sent back to the requesting service
    return { success: true, orderId: order.id };
  }

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() event: OrderCreatedEvent) {
    // React to order creation (e.g., send confirmation email)
    await this.notificationService.sendConfirmation(event.userId, event.orderId);
  }
}
```

### Step 4: Set Up the Client Proxy

In the service that needs to communicate with the microservice, inject a client proxy. NestJS provides `ClientProxyFactory` and `@Client()` for creating clients that connect to microservices.

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

    // Send command and wait for response
    const result = await this.orderClient
      .send<{ success: boolean; orderId: string }>('order.create', command)
      .toPromise();

    // After successful creation, emit an event
    this.orderClient.emit('order.created', new OrderCreatedEvent(
      command.orderId,
      userId,
      command.totalAmount,
    ));

    return result;
  }
}
```

### Step 5: Implement the Saga Pattern for Distributed Workflows

When a single user operation spans multiple services (e.g., placing an order involves inventory reservation, payment processing, and shipment scheduling), use the Saga pattern. In a choreography-based saga, each service emits events and listens for compensating events.

```typescript
// inventory.service.ts — part of the order saga
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
      // If inventory is insufficient, emit a compensating event
      this.client.emit('order.compensation.needed', {
        orderId: command.orderId,
        reason: 'insufficient_inventory',
      });
      return { success: false, error: 'Insufficient inventory' };
    }
  }

  @EventPattern('payment.failed')
  async handlePaymentFailure(@Payload() event: PaymentFailedEvent) {
    // Compensating action: release the reserved inventory
    await this.inventoryRepository.release(event.reservationId);
  }
}
```

### Step 6: Add Retry Logic and Resilience

Wrap your client proxy calls with retry logic using RxJS operators. NestJS's `ClientProxy.send()` returns an Observable, which allows you to chain retry operators directly:

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
      timeout(5000), // Fail fast if no response in 5 seconds
      retry({
        count: 3,
        delay: (error, retryCount) => {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = 1000 * Math.pow(2, retryCount - 1);
          console.warn(
            `Retry ${retryCount}/3 after ${delayMs}ms due to: ${error.message}`,
          );
          return new Promise(resolve => setTimeout(resolve, delayMs));
        },
      }),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          return throwError(() => new Error('Order service timed out'));
        }
        return throwError(() => error);
      }),
    );

    return lastValueFrom(result$);
  }
}
```

### Step 7: Add Correlation ID Propagation

Create a middleware or interceptor that generates and propagates correlation IDs across service boundaries:

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
      // Inject correlation ID into the response
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

On the client side, inject the current correlation ID from `AsyncLocalStorage` into every outgoing message:

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

### Step 8: Containerize and Orchestrate

Package each NestJS microservice as a Docker container. Use Docker Compose for local development and Kubernetes for production.

```dockerfile
# Dockerfile (placed in each service root)
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
# docker-compose.yml (development)
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

### Step 9: Implement Health Checks and Observability

Add health checks to each service using `@nestjs/terminus`:

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

Add structured logging with correlation ID support:

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

### Step 10: Validate and Secure Inter-Service Communication

Secure your microservice endpoints by implementing authentication between services. In production, services should verify that incoming requests come from trusted peers:

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
      throw new UnauthorizedException('Missing authentication');
    }

    // Verify that the timestamp is within 30 seconds (prevent replay attacks)
    const now = Date.now();
    if (now - parseInt(timestamp, 10) > 30000) {
      throw new UnauthorizedException('Expired request');
    }

    // Verify HMAC signature using shared secret
    const payload = `${timestamp}.${JSON.stringify(request.body)}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.SERVICE_SECRET!)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}
```

Apply the guard to message handlers that should only accept requests from trusted internal services:

```typescript
@MessagePattern('order.create')
@UseGuards(RpcAuthGuard)
async createOrder(@Payload() command: CreateOrderCommand) {
  // This handler will only process authenticated requests
}
```

This authentication pattern ensures that even if an unauthorized service gains network access to your message broker, it cannot invoke sensitive operations without the correct shared secret.
