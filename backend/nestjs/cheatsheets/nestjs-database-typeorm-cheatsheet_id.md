---
title: "Cheat Sheet Database dan TypeORM NestJS"
description: "Referensi cepat integrasi TypeORM di NestJS: entity dan relasi, injeksi repository, migrasi, transaksi, serta test repository berbasis SQLite."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Database dan TypeORM NestJS

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Memasang integrasi | `npm install @nestjs/typeorm typeorm pg` | TypeORM plus driver Postgres; ganti `pg` dengan `mysql2` atau `better-sqlite3` |
| Mendaftarkan koneksi | `TypeOrmModule.forRootAsync({...})` | Konfigurasi root asinkron, biasanya disuplai `ConfigService` |
| Mendaftarkan repository fitur | `TypeOrmModule.forFeature([User])` | Menyediakan `Repository<User>` hanya di modul tersebut |
| Menyuntikkan repository | `@InjectRepository(User) private repo: Repository<User>` | Injeksi lewat konstruktor di dalam service |
| Mendefinisikan tabel | `@Entity('users')` | Decorator tingkat kelas; argumennya nama tabel |
| Primary key | `@PrimaryGeneratedColumn('uuid')` | UUID dari database; pakai `'increment'` untuk id bigint |
| Pemetaan kolom | `@Column({ type: 'varchar', length: 120 })` | Tipe eksplisit mencegah skema bergeser antar lingkungan |
| Constraint unik | `@Index(['tenantId', 'email'], { unique: true })` | Keunikan komposit ditegakkan di level database |
| Many-to-one | `@ManyToOne(() => Tenant, { onDelete: 'CASCADE' })` | Sisi pemilik menyimpan foreign key |
| Eager-load relasi | `repo.find({ relations: { posts: true } })` | Bentuk objek; bentuk array masih jalan tetapi sudah usang |
| Gagal saat kosong | `findOneOrFail({ where: { id } })` | Melempar `EntityNotFoundError`; petakan ke 404 |
| Membungkus unit kerja | `dataSource.transaction(async (manager) => {...})` | Commit saat selesai, rollback saat ada error |
| Mematikan auto-sync | `synchronize: false` | Wajib di luar dev lokal; skema dikelola migrasi |
| Membuat migrasi | `npm run migration:generate src/migrations/AddTenant` | Membandingkan entity dengan database yang berjalan |
| Menjalankan migrasi | `npm run migration:run` | Menerapkan semua migrasi yang tertunda secara berurutan |
| Membatalkan satu langkah | `npm run migration:revert` | Rollback migrasi terakhir yang sudah diterapkan |

## Perintah Umum

### Memasang, Membuat Kerangka, dan Migrasi

```bash
# Lapisan persistensi, driver Postgres, dan driver SQLite untuk test
npm install @nestjs/typeorm typeorm pg
npm install --save-dev better-sqlite3

# Kerangka modul lengkap dengan controller, service, entity, dan DTO
npx nest g resource users --no-spec
npm run typeorm -- schema:log
npm run migration:generate src/migrations/AddTenantIdToUsers
npm run migration:run

npm run migration:revert
npm run migration:show
```

### Skrip Migrasi di package.json

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs -d src/data-source.ts",
    "migration:generate": "npm run typeorm -- migration:generate",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert"
  }
}
```

## Potongan Kode

### Konfigurasi Koneksi Asinkron

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        autoLoadEntities: true,
        // Jangan pernah true di luar dev lokal: skema dikelola migrasi.
        synchronize: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class AppModule {}
```

### Entity dengan Relasi

```typescript
// users/entities/user.entity.ts
@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;
  @Column({ type: 'varchar', length: 160 })
  email: string;
  @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
```

### Akses Repository dengan Penanganan Error

```typescript
// users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User> {
    try {
      return await this.users.findOneOrFail({
        where: { id },
        relations: { tenant: true },
      });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new NotFoundException(`User ${id} tidak ditemukan`);
      }
      throw error;
    }
  }
}
```

### Transaksi di Sekitar Perubahan State

```typescript
async publish(postId: string): Promise<void> {
  await this.dataSource.transaction(async (manager) => {
    const post = await manager.findOneOrFail(Post, { where: { id: postId } });
    post.publishedAt = new Date();
    await manager.save(post);
    // Error apa pun di sini membatalkan seluruh unit kerja.
    await manager.increment(Post, { id: postId }, 'revision', 1);
  });
}
```

### Test Repository Berbasis SQLite

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [User],
      synchronize: true, // hanya boleh di test
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UsersService],
}).compile();

const repo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
```
