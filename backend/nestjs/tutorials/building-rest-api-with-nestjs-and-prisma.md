---
title: "Building a REST API with NestJS and Prisma"
description: "Build a typed NestJS REST API on Prisma: schema and migrations, DTO validation, a JWT guard, keyset pagination, integration tests, and Docker deployment."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a REST API with NestJS and Prisma

## Summary

Build a task-management REST API with NestJS 10 and Prisma 5 on PostgreSQL. You will model data in `schema.prisma`, wrap the generated client in a service layer, validate input with DTOs, protect routes with a JWT guard, paginate with keyset cursors, test against real SQL, and ship a Docker image that migrates on boot.

## Target Audience

- Backend developers who know TypeScript and have shipped an Express or Fastify service.

## Prerequisites

- Node.js 20 LTS, npm 10, and Docker for a local PostgreSQL.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Declare a Prisma model with a relation and a covering index.
- Expose Prisma through one injectable service with lifecycle hooks.
- Attach a typed user to the request with a JWT strategy.

## Context and Motivation

NestJS gives you structure — modules, guards, pipes — but leaves persistence to you. Prisma gives you a generated typed client and a declarative schema, but no HTTP opinions. Combining them yields compile-time safety at the database boundary with testable layers above it.

## Core Content

### Layer boundaries

The path is controller → service → `PrismaService` → PostgreSQL. Controllers handle HTTP only, services own rules and throw domain errors, Prisma owns SQL. Nothing above the service knows Prisma exists, which is what makes it unit-testable.

### Validate at the edge, authorize beside the data

`ValidationPipe` with `whitelist: true` strips unknown properties, so a client cannot post `{"role": "admin"}` into a profile update. A guard proves *who* is calling; whether they may touch *this row* needs the row, so ownership checks live next to the query in the service.

### Keyset over offset

`OFFSET 40000` makes PostgreSQL scan and discard 40,000 rows. Keyset paging seeks with an indexed `(createdAt, id)` cursor and stays constant-time. Keep offset paging only for admin tables that need page numbers.

## Code Examples

```prisma
enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

model Task {
  id        String     @id @default(uuid())
  title     String
  status    TaskStatus @default(TODO)
  ownerId   String
  owner     User       @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())

  @@index([ownerId, createdAt, id])
}
```

Service layer with pagination, ownership checks, and domain errors:

```typescript
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string, limit = 20, cursor?: string) {
    const rows = await this.prisma.task.findMany({
      where: { ownerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  async complete(ownerId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);
    if (task.ownerId !== ownerId) throw new ForbiddenException('Not your task');
    return this.prisma.task.update({ where: { id: taskId }, data: { status: 'DONE' } });
  }
}
```

JWT strategy plus a guarded controller:

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: secret });
  }

  validate(payload: { sub?: string; email?: string }) {
    if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');
    return { id: payload.sub, email: payload.email };
  }
}

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Patch(':id/complete')
  complete(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.tasks.complete(req.user.id, id);
  }
}
```

Integration test against real PostgreSQL, then the container that migrates on boot:

```typescript
it('returns a cursor-paginated list', async () => {
  const res = await request(app.getHttpServer()).get('/api/v1/tasks?limit=5')
    .set('Authorization', `Bearer ${token}`).expect(200);
  expect(res.body.items.length).toBeLessThanOrEqual(5);
});
```

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

## Key Insights

- **Generate the client in the build stage.** Skip `npx prisma generate` in Docker and you hit `@prisma/client did not initialize yet` at runtime while local tests stay green. In production use `migrate deploy`, never `db push`, which can drop columns to match the schema.
- **Fetch `limit + 1` rows to detect more pages.** A separate `count()` is a second scan on a large table.
- **One Prisma instance.** A client per request exhausts PostgreSQL connections; extend `PrismaClient` in a singleton provider.

## Next Steps

- Add refresh tokens with rotation and a `Session` table.

## Conclusion

You now have a layered API where Prisma owns the schema, services own the rules, and controllers own only HTTP. Validation runs at the edge, identity is a guard, ownership is a service check, pagination scales past the offset cliff, and the same migrations that ran locally run inside the container on boot.
