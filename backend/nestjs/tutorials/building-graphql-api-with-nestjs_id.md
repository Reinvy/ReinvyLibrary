---
title: "Membangun API GraphQL dengan NestJS"
description: "Tutorial komprehensif tentang membangun API GraphQL production-ready dengan NestJS menggunakan pendekatan code-first dengan @nestjs/graphql dan Apollo Driver."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun API GraphQL dengan NestJS

## Ringkasan

Tutorial ini memandu pembangunan API GraphQL lengkap untuk aplikasi manajemen tugas menggunakan NestJS dan pendekatan code-first dengan `@nestjs/graphql` dan Apollo Server. Anda akan mempelajari cara mendefinisikan tipe objek GraphQL, resolver, mutasi, query, dan subscription menggunakan dekorator NestJS, berintegrasi dengan database PostgreSQL melalui TypeORM, mengimplementasikan autentikasi dengan Guard, serta menangani validasi input — sambil memanfaatkan arsitektur modular NestJS.

## Target Audiens

- Developer backend yang sudah familiar dengan dasar-dasar NestJS (modul, controller, dependency injection).
- Developer yang memahami dasar REST dan ingin mempelajari cara kerja GraphQL dalam ekosistem NestJS.
- Ekspektasi tingkat kemampuan pengembang: Menengah.

## Prasyarat

- Node.js 18+ dan npm terinstal.
- Instance PostgreSQL yang berjalan (lokal atau Docker) atau pemahaman tentang konfigurasi TypeORM.
- Pemahaman dasar tentang konsep GraphQL (query, mutations, types, resolvers).
- Pengalaman sebelumnya dengan struktur proyek NestJS (atau menyelesaikan tutorial "Getting Started with NestJS" di perpustakaan ini).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuat proyek NestJS dengan GraphQL dan Apollo Driver yang dikonfigurasi menggunakan pendekatan code-first.
- Mendefinisikan tipe objek GraphQL, input type, dan enum menggunakan dekorator NestJS (`@ObjectType`, `@InputType`, `@Field`, `@Int`, `@registerEnumType`).
- Membangun resolver yang menangani query, mutasi, dan resolusi tingkat field dengan `@Resolver`, `@Query`, `@Mutation`, dan `@ResolveField`.
- Mengimplementasikan akses data berbasis database menggunakan entity dan repository TypeORM di dalam resolver GraphQL.
- Mengamankan endpoint GraphQL dengan Guard berbasis autentikasi dan otorisasi berbasis peran.
- Memvalidasi input menggunakan class-validator dan custom pipe yang dipetakan ke argumen GraphQL.
- Mengimplementasikan subscription GraphQL real-time untuk pembaruan data langsung.
- Menerapkan pola DataLoader untuk menyelesaikan masalah query N+1.

## Konteks dan Motivasi

GraphQL telah menjadi paradigma API yang dominan karena memberikan kontrol presisi kepada klien atas data yang mereka terima, menghilangkan over-fetching dan under-fetching, serta memungkinkan alat yang kuat melalui skema yang diketik secara ketat. NestJS menyediakan dukungan GraphQL kelas satu melalui `@nestjs/graphql`, menawarkan pendekatan **code-first** (di mana dekorator menghasilkan skema dari kelas TypeScript) dan pendekatan **schema-first** (di mana Anda menulis SDL secara manual). Pendekatan code-first sangat kuat dalam basis kode TypeScript karena menjaga definisi tipe dan resolver Anda tetap sinkron secara otomatis — satu kelas `@ObjectType()` berfungsi sebagai model runtime dan definisi skema GraphQL secara bersamaan.

Dalam tutorial ini, Anda akan membangun API GraphQL untuk aplikasi manajemen tugas yang mendukung pembuatan proyek, pengelolaan tugas dengan prioritas dan status yang berbeda, penugasan tugas kepada pengguna, dan penerimaan pembaruan real-time saat status tugas berubah.

## Konten Inti

### Persiapan Proyek

Mulai dengan membuat proyek NestJS baru dan menginstal dependensi GraphQL:

```bash
npm install -g @nestjs/cli
nest new task-manager-graphql
cd task-manager-graphql
npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql
npm install @nestjs/typeorm typeorm pg
npm install class-validator class-transformer
npm install graphql-subscriptions
```

Paket `@nestjs/graphql` menyediakan dekorator inti dan modul, sementara `@nestjs/apollo` mengintegrasikan Apollo Server sebagai driver GraphQL. TypeORM menyediakan konektivitas PostgreSQL, dan `class-validator` mendukung validasi input.

### Mengonfigurasi Modul GraphQL

Buka `AppModule` dan konfigurasikan modul GraphQL dengan pendekatan code-first:

```typescript
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'task_manager',
      autoLoadEntities: true,
      synchronize: true,
    }),
  ],
})
export class AppModule {}
```

Opsi `autoSchemaFile` memberitahu NestJS untuk menghasilkan `schema.gql` secara otomatis dari kelas yang didekorasi. Dengan `sortSchema: true`, field skema diurutkan secara alfabetis untuk diff yang konsisten. Konfigurasi subscription mengaktifkan subscription GraphQL berbasis WebSocket menggunakan protokol `graphql-ws`.

### Mendefinisikan Entity dan Object Type

Dalam pendekatan code-first, satu kelas dapat berfungsi sebagai entity TypeORM dan tipe objek GraphQL secara bersamaan. Ini mengurangi duplikasi secara dramatis:

```typescript
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { User } from './user.entity';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

registerEnumType(TaskStatus, { name: 'TaskStatus' });
registerEnumType(TaskPriority, { name: 'TaskPriority' });

@Entity()
@ObjectType()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => String)
  id: string;

  @Column()
  @Field()
  @IsString()
  @MinLength(3)
  title: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  @Field(() => TaskStatus)
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  @Field(() => TaskPriority)
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @ManyToOne(() => User, (user) => user.tasks, { eager: true })
  @Field(() => User)
  assignee: User;

  @Column()
  @Field(() => String)
  assigneeId: string;

  @CreateDateColumn()
  @Field()
  createdAt: Date;
}
```

Perhatikan bagaimana `@ObjectType()` dan `@Field()` berada berdampingan dengan dekorator TypeORM. Dekorator `@Field()` mengekspos properti di skema GraphQL, dan argumen tipenya mengontrol pemetaan tipe GraphQL (misalnya, `() => TaskStatus` untuk enum, `{ nullable: true }` untuk field opsional).

### Mendefinisikan Entity User

```typescript
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Task } from './task.entity';

@Entity()
@ObjectType()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => String)
  id: string;

  @Column({ unique: true })
  @Field()
  email: string;

  @Column()
  @Field()
  name: string;

  @OneToMany(() => Task, (task) => task.assignee)
  @Field(() => [Task])
  tasks: Task[];
}
```

### Membuat Task Resolver

Resolver di NestJS adalah provider yang didekorasi dengan `@Resolver()`. Mereka berisi method handler query dan mutasi:

```typescript
import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from './task.entity';
import { CreateTaskInput } from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';
import { User } from '../users/user.entity';

@Resolver(() => Task)
@Injectable()
export class TaskResolver {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Query(() => [Task])
  async tasks(
    @Args('status', { type: () => TaskStatus, nullable: true })
    status?: TaskStatus,
  ): Promise<Task[]> {
    if (status) {
      return this.taskRepository.find({ where: { status } });
    }
    return this.taskRepository.find();
  }

  @Query(() => Task, { nullable: true })
  async task(
    @Args('id', { type: () => String }) id: string,
  ): Promise<Task | null> {
    return this.taskRepository.findOne({ where: { id } });
  }

  @Mutation(() => Task)
  async createTask(
    @Args('input') input: CreateTaskInput,
  ): Promise<Task> {
    const assignee = await this.userRepository.findOne({
      where: { id: input.assigneeId },
    });
    if (!assignee) {
      throw new Error('User not found');
    }
    const task = this.taskRepository.create({
      ...input,
      assignee,
    });
    return this.taskRepository.save(task);
  }

  @Mutation(() => Task)
  async updateTask(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdateTaskInput,
  ): Promise<Task> {
    await this.taskRepository.update(id, input);
    return this.taskRepository.findOne({ where: { id } });
  }

  @Mutation(() => Boolean)
  async deleteTask(
    @Args('id', { type: () => String }) id: string,
  ): Promise<boolean> {
    const result = await this.taskRepository.delete(id);
    return result.affected > 0;
  }

  @ResolveField(() => User)
  async assignee(@Parent() task: Task): Promise<User> {
    return this.userRepository.findOne({ where: { id: task.assigneeId } });
  }
}
```

Dekorator `@Args()` memetakan argumen GraphQL yang masuk ke parameter method. Dekorator `@ResolveField()` menangani resolusi tingkat field — ketika klien meminta field `assignee` pada `Task`, NestJS secara otomatis memanggil method ini.

### Membuat Input Type (DTO)

Input type didefinisikan dengan `@InputType()` dan divalidasi dengan dekorator `class-validator`:

```typescript
import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TaskStatus, TaskPriority } from '../task.entity';

@InputType()
export class CreateTaskInput {
  @Field()
  @IsString()
  @MinLength(3)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => TaskPriority, { defaultValue: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @Field(() => String)
  @IsString()
  assigneeId: string;
}

@InputType()
export class UpdateTaskInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @Field(() => TaskPriority, { nullable: true })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
```

### Mendaftarkan Modul

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskResolver } from './task.resolver';
import { Task } from './task.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User])],
  providers: [TaskResolver],
})
export class TasksModule {}
```

### Autentikasi dengan Guard

Resolver GraphQL di NestJS mendukung sistem guard yang sama dengan controller REST. Buat guard autentikasi JWT:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    // Di production, validasi token JWT dari req.headers.authorization
    // Untuk contoh ini, kita memeriksa keberadaan header auth sederhana
    return !!req.headers.authorization;
  }
}
```

Terapkan ke resolver menggunakan `@UseGuards()`:

```typescript
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';

@Resolver(() => Task)
@UseGuards(GqlAuthGuard)
export class TaskResolver {
  // ... method resolver
}
```

Pembantu `GqlExecutionContext.create()` mengonversi konteks eksekusi NestJS standar menjadi konteks eksekusi GraphQL, memberikan akses ke konteks permintaan GraphQL termasuk `req` dan `res`.

### Mengimplementasikan Subscription GraphQL

Subscription memungkinkan komunikasi push berbasis real-time. Buat sistem pub/sub dan hubungkan ke resolver subscription:

```typescript
import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

export const pubSub = new PubSub();
export const TASK_UPDATED_EVENT = 'taskUpdated';
```

Kemudian tambahkan handler subscription di resolver Anda:

```typescript
import { Subscription } from '@nestjs/graphql';

@Resolver(() => Task)
export class TaskResolver {
  // ... query dan mutasi

  @Mutation(() => Task)
  async updateTask(@Args('id') id: string, @Args('input') input: UpdateTaskInput): Promise<Task> {
    await this.taskRepository.update(id, input);
    const updated = await this.taskRepository.findOne({ where: { id } });
    pubSub.publish(TASK_UPDATED_EVENT, { taskUpdated: updated });
    return updated;
  }

  @Subscription(() => Task, {
    filter: (payload, variables) =>
      !variables.taskId || payload.taskUpdated.id === variables.taskId,
  })
  taskUpdated(
    @Args('taskId', { type: () => String, nullable: true }) taskId: string,
  ) {
    return pubSub.asyncIterator(TASK_UPDATED_EVENT);
  }
}
```

Dekorator `@Subscription()` mendaftarkan subscription GraphQL. Opsi `filter` memungkinkan klien berlangganan ke event tertentu dengan melewatkan argumen — dalam kasus ini, memfilter secara opsional berdasarkan `taskId`.

### Menyelesaikan N+1 dengan DataLoader

Masalah N+1 terjadi ketika meresolve daftar tugas — jika setiap tugas memuat penanggung jawabnya melalui query terpisah, mengambil 100 tugas menghasilkan 101 query database. Pola DataLoader mengelompokkan ini menjadi satu query:

```bash
npm install dataloader
```

Buat provider DataLoader:

```typescript
import * as DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserLoader {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  createLoader(): DataLoader<string, User> {
    return new DataLoader<string, User>(async (ids: string[]) => {
      const users = await this.userRepository.findByIds(ids);
      const userMap = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => userMap.get(id) || new Error(`User ${id} not found`));
    });
  }
}
```

Kemudian injeksikan ke dalam resolver:

```typescript
@Resolver(() => Task)
export class TaskResolver {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField(() => User)
  async assignee(
    @Parent() task: Task,
    @Context() context: any,
  ): Promise<User> {
    if (!context.userLoader) {
      context.userLoader = this.userLoader.createLoader();
    }
    return context.userLoader.load(task.assigneeId);
  }
}
```

Dekorator `@Context()` menyediakan akses ke konteks permintaan GraphQL, yang merupakan tempat yang sempurna untuk melampirkan instance DataLoader berdasarkan cakupan permintaan. Setiap permintaan mendapatkan DataLoader baru, dan semua resolusi `assignee` dalam permintaan tersebut dikelompokkan.

### Output Skema

Dengan semua dekorator di atas, NestJS menghasilkan `schema.gql` berikut secara otomatis:

```graphql
type Task {
  id: String!
  title: String!
  description: String
  status: TaskStatus!
  priority: TaskPriority!
  assignee: User!
  assigneeId: String!
  createdAt: DateTime!
}

type User {
  id: String!
  email: String!
  name: String!
  tasks: [Task!]!
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

type Query {
  tasks(status: TaskStatus): [Task!]!
  task(id: String!): Task
}

type Mutation {
  createTask(input: CreateTaskInput!): Task!
  updateTask(id: String!, input: UpdateTaskInput!): Task!
  deleteTask(id: String!): Boolean!
}

type Subscription {
  taskUpdated(taskId: String): Task!
}

input CreateTaskInput {
  title: String!
  description: String
  priority: TaskPriority = MEDIUM
  assigneeId: String!
}

input UpdateTaskInput {
  title: String
  description: String
  status: TaskStatus
  priority: TaskPriority
}
```

## Contoh Kode

### Contoh Lengkap Mutasi GraphQL

Klien membuat tugas dan berlangganan pembaruan status dalam satu sesi:

```typescript
// Sisi klien: Setup Apollo Client
import { ApolloClient, InMemoryCache, gql, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { HttpLink } from '@apollo/client/core';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({ uri: 'http://localhost:3000/graphql' });
const wsLink = new GraphQLWsLink(
  createClient({ url: 'ws://localhost:3000/graphql' }),
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

// Membuat tugas
const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      status
      assignee {
        name
      }
    }
  }
`;

async function createTask() {
  const result = await client.mutate({
    mutation: CREATE_TASK,
    variables: {
      input: {
        title: 'Implementasi subscription GraphQL',
        priority: 'HIGH',
        assigneeId: 'user-uuid-disini',
      },
    },
  });
  console.log('Dibuat:', result.data.createTask);
}

// Berlangganan pembaruan
const TASK_UPDATED = gql`
  subscription OnTaskUpdated($taskId: String) {
    taskUpdated(taskId: $taskId) {
      id
      title
      status
    }
  }
`;

const subscription = client.subscribe({
  query: TASK_UPDATED,
  variables: { taskId: undefined }, // Dengarkan semua tugas
}).subscribe({
  next({ data }) {
    console.log('Tugas diperbarui:', data.taskUpdated);
  },
});
```

### Query dengan Pemilihan Field

Klien dapat meminta field yang mereka butuhkan secara tepat:

```graphql
query GetHighPriorityTasks {
  tasks(status: TODO) {
    id
    title
    priority
    assignee {
      name
      email
    }
  }
}
```

Query ini hanya mengambil `id`, `title`, `priority`, dan `assignee.name` serta `assignee.email` bersarang — tidak ada over-fetching field yang tidak digunakan.

### Mutasi dengan Penanganan Error Validasi

```typescript
// Mencoba membuat tugas dengan judul yang tidak valid
const result = await client.mutate({
  mutation: CREATE_TASK,
  variables: {
    input: {
      title: 'AB', // Terlalu pendek — akan memicu validasi MinLength(3)
      assigneeId: 'user-uuid',
    },
  },
});

console.log(result.errors);
// [
//   {
//     "message": "Bad Request Exception",
//     "extensions": {
//       "code": "BAD_USER_INPUT",
//       "response": {
//         "message": ["title must be longer than or equal to 3 characters"],
//         "error": "Bad Request"
//       }
//     }
//   }
// ]
```

## Insight Penting

- **Code-first vs schema-first**: NestJS mendukung kedua pendekatan, tetapi code-first sangat direkomendasikan untuk proyek TypeScript. Ini menghilangkan duplikasi antara skema dan tipe TypeScript Anda, membuat refactoring lebih aman dan menjaga skema Anda tetap sinkron secara otomatis.
- **Kelas tunggal, fungsi ganda**: Mendekorasi entity TypeORM dengan `@Entity()` dan `@ObjectType()` menciptakan sumber kebenaran tunggal untuk model database dan tipe GraphQL, tetapi perhatikan untuk mengekspos field sensitif — gunakan `@Field({ nullable: true })` atau hilangkan `@Field()` sama sekali untuk field yang tidak boleh dilihat klien (misalnya, hash password).
- **Konteks autentikasi**: Guard GraphQL menggunakan `GqlExecutionContext.create(context)` untuk mengakses konteks permintaan. Tidak seperti controller REST, objek `req` bersarang di dalam `ctx.getContext().req` daripada menjadi argumen tingkat atas.
- **DataLoader untuk pencegahan N+1**: Selalu gunakan DataLoader saat meresolve field relasi dalam daftar. Tanpanya, mengambil 50 tugas dengan penanggung jawabnya menghasilkan 51 query database, bukan 2. DataLoader mengelompokkan semua panggilan `load()` dari permintaan yang sama menjadi satu query `IN`.
- **Siklus hidup subscription**: Subscription GraphQL mempertahankan koneksi WebSocket. Sistem PubSub `graphql-subscriptions` bekerja di memori untuk deployment server tunggal, tetapi untuk lingkungan multi-server atau serverless, gunakan transport bersama seperti Redis (`@nestjs/graphql` mendukung `RedisPubSub`).
- **Pipeline validasi**: Dekorator `class-validator` pada kelas `@InputType()` secara otomatis diintegrasikan ke dalam pipeline validasi NestJS ketika `ValidationPipe` didaftarkan secara global. Tidak diperlukan pengkabelan pipe tambahan untuk tipe input GraphQL.

## Langkah Berikutnya

- Jelajahi pendekatan schema-first dengan `@nestjs/graphql` dengan menulis SDL secara manual dan menyediakan resolver sebagai peta.
- Pelajari tentang Apollo Federation untuk membangun gateway GraphQL terfederasi di beberapa microservice NestJS.
- Pelajari pola DataLoader lebih dalam untuk menangani skenario batch kompleks dengan pengurutan dan pemfilteran.
- Lihat [Panduan Praktik Terbaik NestJS](../guides/nestjs-best-practices-guide.md) untuk pola produksi.

## Kesimpulan

Dalam tutorial ini, Anda telah membangun API GraphQL lengkap dengan NestJS menggunakan pendekatan code-first. Anda mendefinisikan tipe objek dan tipe input dengan dekorator, membuat resolver untuk query, mutasi, dan subscription, berintegrasi dengan PostgreSQL melalui TypeORM, mengamankan endpoint dengan guard autentikasi, dan menerapkan pola DataLoader untuk menyelesaikan masalah query N+1. Pendekatan code-first menjaga skema dan tipe TypeScript Anda tetap sinkron sempurna, menjadikan NestJS salah satu framework paling produktif untuk membangun API GraphQL.
