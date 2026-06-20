---
title: "Panduan Praktik Terbaik NestJS"
description: "Panduan komprehensif tentang struktur proyek NestJS, pola arsitektur, strategi pengujian, dan praktik terbaik deployment produksi untuk membangun aplikasi server-side yang skalabel."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Praktik Terbaik NestJS

## Pendahuluan

NestJS adalah framework Node.js progresif untuk membangun aplikasi server-side yang efisien, andal, dan skalabel. Framework ini menggunakan TypeScript secara default dan menggabungkan elemen pemrograman berorientasi objek, pemrograman fungsional, dan pemrograman reaktif fungsional dalam arsitektur modular. Meskipun NestJS menyediakan konfigurasi dasar yang kokoh, membangun aplikasi kelas produksi memerlukan keputusan yang matang mengenai struktur proyek, organisasi modul, injeksi dependensi, penanganan kesalahan, pengujian, dan deployment.

Panduan ini mencakup pola arsitektur dan praktik terbaik yang membantu tim membangun aplikasi NestJS yang mudah dipelihara, diuji, dan berperforma tinggi. Panduan ini diambil dari pengalaman produksi nyata dan konvensi komunitas, menawarkan rekomendasi konkret untuk setiap lapisan aplikasi NestJS — mulai dari pembuatan proyek dan desain modul hingga integrasi basis data, autentikasi, pengujian, dan deployment.

## Praktik Terbaik

### Konvensi Struktur Proyek

Atur proyek NestJS Anda menggunakan pola **modul fitur**, di mana setiap domain memiliki modul sendiri dengan direktori yang mandiri. Hindari menempatkan semua kontroler, layanan, dan penyedia ke dalam direktori `src/` yang datar.

```text
src/
├── common/              # Utilitas bersama, guard, interceptor, filter
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   └── filters/
├── config/              # Modul konfigurasi dan skema validasi
├── database/            # Koneksi basis data, migrasi, seed
│   ├── migrations/
│   └── seeds/
├── modules/             # Modul fitur yang dikelompokkan berdasarkan domain
│   ├── users/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.service.spec.ts
│   ├── auth/
│   ├── orders/
│   └── payments/
├── app.module.ts
└── main.ts
```

Jaga agar setiap modul fitur tetap fokus dan dapat diuji secara independen. Sebuah modul hanya boleh mengimpor apa yang dibutuhkan dan mengekspor hanya apa yang diperlukan oleh modul lain. Gunakan `@Global()` dengan hemat — lebih baik menggunakan impor eksplisit yang membuat grafik dependensi terlihat.

### Prinsip Desain Modul

**Tanggung Jawab Tunggal per Modul**: Setiap modul harus memiliki satu konsep domain. `UsersModule` menangani CRUD pengguna dan event terkait pengguna; `AuthModule` menangani autentikasi dan otorisasi. Hindari mencampurkan logika seperti meletakkan logika reset password di dalam modul pengguna — buat modul `PasswordModule` khusus atau simpan di `AuthModule`.

**Penghindaran Dependensi Melingkar**: Impor melingkar antar modul adalah masalah umum di NestJS. Gunakan `forwardRef(() => Module)` hanya sebagai upaya terakhir. Lebih baik melakukan restrukturisasi batas modul atau memperkenalkan modul bersama yang dapat diimpor oleh kedua modul. Untuk komunikasi dua arah, pertimbangkan menggunakan sistem event bawaan NestJS (`@nestjs/event-emitter`) atau antrean pesan sebagai pengganti referensi layanan langsung.

**Modul Dinamis untuk Konfigurabilitas**: Saat membangun modul yang dapat digunakan kembali (misalnya modul basis data, modul caching), ekspos sebagai modul dinamis menggunakan pola `forRoot()` / `forRootAsync()`. Ini memungkinkan konsumen melewatkan konfigurasi secara asinkron, yang penting ketika konfigurasi bergantung pada variabel lingkungan yang diambil saat runtime.

```typescript
@Module({})
export class DatabaseModule {
  static forRootAsync(options: DatabaseAsyncOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        ConfigModule,
        {
          provide: 'DATABASE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      providers: [DatabaseService],
      exports: [DatabaseService],
    };
  }
}
```

### Pola Injeksi Dependensi

**Cakupan Penyedia**: Pahami tiga cakupan penyedia NestJS:
- **DEFAULT (singleton)**: Satu instance dibagi di seluruh aplikasi. Terbaik untuk layanan stateless, koneksi basis data, dan penyedia konfigurasi.
- **REQUEST**: Instance baru per permintaan masuk. Berguna untuk data yang terikat pada permintaan seperti konteks penyewa di aplikasi multi-tenant. Waspadai overhead kinerja — setiap permintaan membuat pohon instance baru.
- **TRANSIENT**: Instance baru per injeksi. Jarang diperlukan; gunakan ketika penyedia harus mempertahankan state terisolasi untuk setiap konsumen.

Gunakan penyedia dengan cakupan request secara hemat dan dokumentasikan dengan jelas, karena mereka mengubah perilaku seluruh rantai injeksi.

**Penyedia Kustom**: Saat Anda memerlukan kontrol lebih atas pembuatan penyedia, gunakan penyedia kustom dengan `useFactory`, `useClass`, atau `useExisting`. Pola `useFactory` sangat berguna untuk mengintegrasikan pustaka pihak ketiga yang memerlukan inisialisasi asinkron:

```typescript
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const client = new Redis(configService.get('redis.url'));
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
})
export class CacheModule {}
```

### Komposisi Guard, Interceptor, dan Pipe

**Guard** menangani autentikasi dan otorisasi. Jaga agar tetap fokus — satu guard per tanggung jawab. Komposisikan dengan `@UseGuards()` daripada membangun guard monolitik:

```typescript
@UseGuards(AuthGuard, RolesGuard, ThrottlerGuard)
```

**Interceptor** ideal untuk urusan lintas sektor: logging, transformasi respons, caching, dan pengukuran waktu. Lapisi interceptor berdasarkan cakupan: interceptor global untuk urusan infrastruktur (logging permintaan, pengukuran waktu), interceptor tingkat kontroler untuk pembentukan respons, dan interceptor tingkat metode untuk transformasi spesifik.

**Pipe** menangani validasi dan transformasi di batas masuk. Gunakan `ValidationPipe` secara global dengan `whitelist: true` dan `forbidNonWhitelisted: true` untuk membersihkan field yang tidak diharapkan dan menolak payload berbahaya sejak awal.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

**Filter Pengecualian** memusatkan penanganan kesalahan. Buat satu filter pengecualian global yang menangkap semua instance `HttpException` dan memetakannya ke bentuk respons API yang konsisten. Perluas untuk menangani kesalahan tak terduga dengan menangkap kelas dasar `Exception`:

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      message: exception instanceof HttpException
        ? exception.message
        : 'Terjadi kesalahan internal server',
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Desain Dekorator Kustom

Buat dekorator kustom untuk mengurangi boilerplate dan membuat kontroler lebih ekspresif:

**Dekorator Parameter** untuk mengekstrak properti permintaan umum:

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Dekorator Metode** untuk routing berbasis metadata atau pemeriksaan izin:

```typescript
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
```

Selalu pasangkan dekorator kustom dengan guard atau interceptor yang membaca metadata — dekorator itu sendiri hanya boleh menyimpan metadata, tidak pernah menjalankan logika.

### Integrasi Basis Data dengan TypeORM

**Pola Repository**: Gunakan pola repository TypeORM dengan kelas repository kustom untuk merangkum kueri basis data. Injeksikan repository melalui `@InjectRepository()` daripada menggunakan `EntityManager` secara langsung di layanan.

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
}
```

**Migrasi daripada Sinkronisasi**: Atur `synchronize: false` di produksi. Gunakan migrasi TypeORM untuk mengelola perubahan skema dengan cara yang terkontrol versi dan dapat diulang. Hasilkan migrasi setelah perubahan entitas:

```bash
npx typeorm migration:generate src/database/migrations/AddEmailVerificationColumn -d src/database/data-source.ts
```

**Optimasi Kueri**: Gunakan `select` untuk mengambil hanya kolom yang diperlukan. Gunakan `relations` atau `QueryBuilder` dengan `leftJoinAndSelect` secara bijaksana — memuat terlalu banyak relasi secara eager menyebabkan masalah N+1. Pertimbangkan menggunakan `find` dengan `loadEagerRelations: false` dan pemuatan relasi eksplisit untuk kueri kompleks.

### Manajemen Konfigurasi

Gunakan paket bawaan `@nestjs/config` dengan skema yang divalidasi. Definisikan kelas atau interface konfigurasi yang diketik secara kuat dan validasi semua variabel lingkungan saat startup aplikasi:

```typescript
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  @IsOptional()
  DATABASE_PORT: number = 5432;

  @IsString()
  JWT_SECRET: string;
}
```

Muat dan validasi di modul root:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => {
        const validated = plainToClass(EnvironmentVariables, config, {
          enableImplicitConversion: true,
        });
        const errors = validateSync(validated, { skipMissingProperties: false });
        if (errors.length > 0) {
          throw new Error(errors.toString());
        }
        return validated;
      },
    }),
  ],
})
```

Gunakan file `.env` khusus lingkungan (`.env.development`, `.env.production`) dan muat secara kondisional berdasarkan `NODE_ENV`. Jangan pernah melakukan commit file `.env` ke kontrol versi — gunakan `.env.example` sebagai templat.

### Strategi Pengujian

Ikuti **piramida pengujian** untuk aplikasi NestJS:

**Pengujian Unit**: Uji layanan dan penyedia secara terisolasi. Gunakan `Test.createTestingModule()` untuk menyiapkan modul pengujian dengan dependensi yang di-mock. Fokus pada logika bisnis — mock repository, panggilan API eksternal, dan penyedia infrastruktur.

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: MockType<Repository<User>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: createMock<Repository<User>>() },
      ],
    }).compile();
    service = module.get(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it('harus membuat pengguna', async () => {
    repository.save.mockResolvedValue({ id: 1, email: 'test@test.com' });
    const result = await service.create({ email: 'test@test.com', password: 'dihash' });
    expect(result.email).toBe('test@test.com');
  });
});
```

**Pengujian Integrasi**: Uji kontroler dengan dependensinya. Gunakan `superTest` dengan `@nestjs/testing` untuk membuat permintaan HTTP terhadap instance aplikasi. Gunakan basis data in-memory atau test containers untuk pengujian yang bergantung pada basis data.

**Pengujian E2E**: Uji tumpukan aplikasi secara penuh. Buat direktori `test/` khusus di root proyek. Gunakan transaksi basis data yang di-roll back setelah setiap pengujian untuk menjaga isolasi.

```typescript
describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@test.com', password: 'Password123!' })
      .expect(201);
  });
});
```

### Logging dan Monitoring

Ganti logger default NestJS dengan solusi logging terstruktur seperti `pino` atau `winston` untuk produksi. Log terstruktur menghasilkan JSON, sehingga dapat diurai oleh alat agregasi log (ELK, Datadog, Grafana Loki).

```typescript
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  await app.listen(3000);
}
```

Tambahkan ID permintaan (correlation ID) menggunakan middleware atau interceptor sehingga semua log untuk satu permintaan dapat dikorelasikan:

```typescript
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.headers['x-correlation-id'] || uuidv4();
    request.correlationId = correlationId;
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        response.setHeader('x-correlation-id', correlationId);
      }),
    );
  }
}
```

### Pola Penanganan Kesalahan

**Pengecualian Khusus Domain**: Buat kelas pengecualian kustom yang memperluas `HttpException` untuk kesalahan tingkat domain. Ini menjaga penanganan kesalahan tetap ekspresif dan memungkinkan filter pengecualian global memetakannya secara konsisten.

```typescript
export class UserNotFoundException extends HttpException {
  constructor(userId: string) {
    super(`Pengguna dengan ID ${userId} tidak ditemukan`, HttpStatus.NOT_FOUND);
  }
}
```

**Kesalahan Logika Bisnis**: Gunakan `BadRequestException`, `UnauthorizedException`, dan `ForbiddenException` bawaan NestJS untuk kesalahan HTTP standar. Cadangkan `InternalServerErrorException` untuk kondisi yang benar-benar tidak terduga — jangan pernah menggunakannya untuk kegagalan validasi.

**Penanganan Kesalahan Asinkron**: Bungkus metode kontroler asinkron dalam try-catch atau andalkan filter pengecualian global NestJS, yang secara otomatis menangkap penolakan promise yang tidak tertangani. Hindari blok catch kosong — selalu log atau lempar ulang.

## Langkah Implementasi

### Langkah 1: Pembuatan Proyek

Inisialisasi proyek NestJS baru dengan CLI dan atur struktur direktori yang direkomendasikan:

```bash
nest new my-app --package-manager npm --strict
cd my-app
npm install @nestjs/config @nestjs/typeorm typeorm pg class-validator class-transformer
npm install -D @types/node typescript
```

Buat struktur direktori:

```bash
mkdir -p src/{common/{decorators,guards,interceptors,filters},config,database/{migrations,seeds},modules}
```

### Langkah 2: Konfigurasi Pipe Global, Filter, dan Validasi

Atur `main.ts` dengan konfigurasi global yang direkomendasikan:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

### Langkah 3: Implementasi Modul Fitur

Buat modul fitur mengikuti praktik terbaik yang diuraikan di atas. Mulai dengan definisi modul:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

Implementasikan layanan dengan penanganan kesalahan dan logging yang tepat:

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: Logger,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new UserNotFoundException(id);
    }
    return user;
  }
}
```

### Langkah 4: Atur Migrasi Basis Data

Konfigurasikan data source dan atur pembuatan migrasi di `package.json`:

```json
{
  "scripts": {
    "migration:generate": "typeorm migration:generate -d src/database/data-source.ts",
    "migration:run": "typeorm migration:run -d src/database/data-source.ts",
    "migration:revert": "typeorm migration:revert -d src/database/data-source.ts"
  }
}
```

Buat konfigurasi data source:

```typescript
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
```

### Langkah 5: Menulis dan Menjalankan Pengujian

Atur konfigurasi Jest untuk pengujian unit, integrasi, dan E2E:

```typescript
// jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

Implementasikan pengujian untuk setiap lapisan. Jalankan seluruh rangkaian pengujian sebelum setiap commit:

```bash
npm test           # Pengujian unit + integrasi
npm run test:e2e   # Pengujian E2E
```

### Langkah 6: Persiapan Deployment Produksi

Konfigurasikan aplikasi untuk produksi dengan langkah-langkah penting berikut:

1. **Build**: Gunakan `nest build` yang mengompilasi TypeScript dan menghasilkan bundle di direktori `dist/`.
2. **Variabel Lingkungan**: Atur semua konfigurasi melalui variabel lingkungan. Gunakan skema konfigurasi yang divalidasi.
3. **Dockerisasi**: Buat `Dockerfile` multi-tahap untuk pembuatan image yang efisien:

```dockerfile
# Tahap build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Tahap produksi
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

1. **Pemeriksaan Kesehatan**: Tambahkan endpoint pemeriksaan kesehatan khusus menggunakan `@nestjs/terminus`:

```bash
npm install @nestjs/terminus
```

1. **Integrasi CI/CD**: Atur GitHub Actions atau GitLab CI untuk menjalankan linting, pengujian, dan build pada setiap push. Tambahkan job deployment yang menjalankan migrasi sebelum memulai aplikasi.

## Insight Penting

- **Modul fitur** adalah tulang punggung aplikasi NestJS yang mudah dipelihara. Investasikan waktu untuk menentukan batas modul yang jelas di awal — merombak batas modul di tahap selanjutnya jauh lebih mahal daripada merombak kode di dalam modul.
- **Pipe dan filter global** menghilangkan kode berulang. Mengonfigurasi `ValidationPipe` dengan `whitelist` dan `forbidNonWhitelisted` di tingkat aplikasi mencegah korupsi data dan masalah keamanan di semua endpoint.
- **Migrasi daripada sinkronisasi**: Selalu nonaktifkan `synchronize` di produksi dan gunakan migrasi yang dikontrol versi. Sinkronisasi skema otomatis nyaman di pengembangan tetapi berbahaya di produksi — dapat menghapus kolom atau tabel tanpa peringatan.
- **Penyedia dengan cakupan request mahal**. Setiap permintaan membuat pohon instance baru untuk penyedia dengan cakupan request, termasuk semua dependensinya. Gunakan hanya ketika diperlukan (misalnya konteks multi-tenant) dan dokumentasikan trade-off kinerjanya.
- **Correlation ID** mengubah debugging dari tebak-tebakan menjadi alur permintaan yang dapat dilacak. Menambahkannya di awal siklus proyek sangat mudah; memasangnya setelah ratusan endpoint ada sangatlah menyakitkan.
- **Pola repository TypeORM** adalah pendekatan yang direkomendasikan untuk akses data. Penggunaan `EntityManager` langsung di layanan menggabungkan logika bisnis ke urusan infrastruktur dan membuat pengujian lebih sulit.

## Langkah Berikutnya

Setelah mengimplementasikan pola dalam panduan ini, perdalam pengetahuan NestJS Anda dengan topik-topik berikut:

- **GraphQL dengan NestJS**: Jelajahi `@nestjs/graphql` dengan pendekatan code-first untuk membangun API GraphQL yang terintegrasi dengan sistem modul.
- **Microservices dengan NestJS**: Pelajari lapisan transport microservice bawaan NestJS (TCP, Redis, RabbitMQ, Kafka) dan cara membangun arsitektur berbasis event menggunakan paket `@nestjs/microservices`.
- **Strategi Caching**: Implementasikan caching terdistribusi dengan `@nestjs/cache-manager` dan Redis untuk meningkatkan waktu respons aplikasi untuk beban kerja berat baca.
- **WebSocket Gateway**: Bangun fitur real-time menggunakan dukungan WebSocket NestJS dengan `@nestjs/websockets` dan `@nestjs/platform-socket.io`.
- **Pengujian Lanjutan**: Jelajahi pengujian snapshot, pengujian kontrak dengan Pact, dan pengujian beban dengan k6 untuk aplikasi NestJS.

## Kesimpulan

Membangun aplikasi NestJS kelas produksi membutuhkan lebih dari sekadar memahami dekorator dan sistem modul framework ini. Panduan ini mencakup pola arsitektur, strategi injeksi dependensi, pendekatan pengujian, dan praktik deployment yang membantu tim membangun aplikasi yang dapat dipelihara dari waktu ke waktu dan berperforma baik di bawah beban.

Poin-poin utamanya adalah: atur kode berdasarkan modul fitur, manfaatkan sistem DI NestJS dengan cakupan penyedia yang sesuai, gunakan pipe dan filter global untuk menegakkan validasi dan penanganan kesalahan yang konsisten, ikuti piramida pengujian dengan pengujian unit, integrasi, dan E2E, serta gunakan migrasi TypeORM untuk manajemen skema basis data yang aman. Terapkan praktik-praktik ini sejak awal proyek Anda untuk menghindari refactoring yang mahal di kemudian hari.
