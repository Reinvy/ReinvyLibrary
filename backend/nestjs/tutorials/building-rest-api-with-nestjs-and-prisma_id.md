---
title: "Membangun REST API dengan NestJS dan Prisma"
description: "Membangun REST API NestJS bertipe dengan Prisma: skema dan migrasi, validasi DTO, guard JWT, paginasi keyset, pengujian integrasi, serta deployment Docker."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun REST API dengan NestJS dan Prisma

## Ringkasan

Kita membangun REST API manajemen tugas dengan NestJS 10 dan Prisma 5 di PostgreSQL. Anda akan memodelkan data di `schema.prisma`, membungkus client hasil generate dalam lapisan service, memvalidasi input dengan DTO, melindungi rute dengan guard JWT, memaginasi memakai cursor keyset, menguji terhadap SQL sungguhan, lalu mengirim image Docker yang menjalankan migrasi saat start.

## Target Audiens

- Pengembang backend yang menguasai TypeScript dan pernah merilis service Express atau Fastify.
- Pengembang tingkat menengah yang nyaman dengan dependency injection dan SQL dasar.

## Prasyarat

- Node.js 20 LTS, npm 10, dan Docker untuk PostgreSQL lokal.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda mampu:

- Mendeklarasikan model Prisma dengan relasi dan index penunjang.
- Mengekspos Prisma lewat satu service injectable dengan lifecycle hook.
- Memasang user bertipe ke request melalui strategi JWT.
- Memaginasi dengan cursor yang tetap cepat ketika tabel membesar.

## Konteks dan Motivasi

NestJS memberi struktur — module, guard, pipe — tetapi menyerahkan persistensi kepada Anda. Prisma memberi client bertipe hasil generate dan skema deklaratif, tetapi tidak punya opini soal HTTP. Menggabungkan keduanya menghasilkan keamanan tipe di batas database dengan lapisan di atasnya yang mudah diuji. Pola yang harus dihindari adalah controller gemuk: satu method yang mem-parsing body, menjalankan SQL mentah, dan membentuk respons. Begitu pola itu menyebar, setiap perubahan menyentuh tiga urusan sekaligus dan pengujian butuh server hidup hanya untuk memeriksa satu nilai.

## Konten Inti

### Batas antar lapisan

Alurnya controller → service → `PrismaService` → PostgreSQL. Controller hanya menangani HTTP, service memegang aturan bisnis dan melempar error domain, Prisma memegang SQL. Tidak ada lapisan di atas service yang tahu Prisma ada, dan itulah yang membuat service bisa diuji unit.

### Validasi di tepi, otorisasi di dekat data

`ValidationPipe` dengan `whitelist: true` membuang properti tak dikenal, sehingga klien tidak bisa menyelipkan `{"role": "admin"}` ke pembaruan profil. Guard membuktikan *siapa* pemanggilnya; boleh atau tidak ia menyentuh *baris ini* hanya bisa diputuskan setelah barisnya dibaca, jadi pemeriksaan kepemilikan diletakkan bersebelahan dengan query di service.

### Keyset dibanding offset

`OFFSET 40000` memaksa PostgreSQL memindai lalu membuang 40.000 baris. Paginasi keyset melompat lewat cursor `(createdAt, id)` yang terindeks dan tetap konstan. Sisakan paginasi offset hanya untuk tabel admin yang butuh nomor halaman.

## Contoh Kode

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

Lapisan service dengan paginasi, pemeriksaan kepemilikan, dan error domain:

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
    if (!task) throw new NotFoundException(`Task ${taskId} tidak ditemukan`);
    if (task.ownerId !== ownerId) throw new ForbiddenException('Bukan tugas Anda');
    return this.prisma.task.update({ where: { id: taskId }, data: { status: 'DONE' } });
  }
}
```

Strategi JWT dan controller yang dijaga guard:

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET belum dikonfigurasi');
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: secret });
  }

  validate(payload: { sub?: string; email?: string }) {
    if (!payload?.sub) throw new UnauthorizedException('Payload token tidak valid');
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

Uji integrasi terhadap PostgreSQL sungguhan, lalu container yang bermigrasi saat start:

```typescript
it('mengembalikan daftar dengan paginasi cursor', async () => {
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

## Insight Penting

- **Generate client di tahap build.** Tanpa `npx prisma generate` di Docker Anda akan menemui `@prisma/client did not initialize yet` saat runtime, sementara tes lokal tetap hijau. Di produksi gunakan `migrate deploy`, jangan `db push`, karena `db push` bisa menghapus kolom agar sesuai skema.
- **Ambil `limit + 1` baris untuk mendeteksi halaman berikutnya, dan selaraskan `ORDER BY` dengan index.** Memanggil `count()` terpisah berarti satu pemindaian tambahan, dan paginasi keyset hanya stabil bila kolom urutnya sama dengan `@@index([ownerId, createdAt, id])`.
- **Satu instance Prisma.** Membuat client per request menghabiskan koneksi PostgreSQL; perluas `PrismaClient` di provider singleton.

## Langkah Berikutnya

- Tambahkan refresh token dengan rotasi dan tabel `Session`.

## Kesimpulan

Anda kini punya API berlapis di mana Prisma memegang skema, service memegang aturan, dan controller hanya menangani HTTP. Validasi berjalan di tepi, identitas diperiksa guard, kepemilikan diperiksa service, paginasi tetap cepat melewati batas offset, dan migrasi yang berjalan di laptop Anda juga berjalan di dalam container saat start.
