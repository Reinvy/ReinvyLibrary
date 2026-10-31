---
title: "NestJS Database and TypeORM Cheatsheet"
description: "A quick reference for wiring TypeORM into NestJS: entities and relations, repository injection, migrations, transactions, and SQLite-backed repository tests."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# NestJS Database and TypeORM Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Install the integration | `npm install @nestjs/typeorm typeorm pg` | TypeORM plus the Postgres driver; swap `pg` for `mysql2` or `better-sqlite3` |
| Register the connection | `TypeOrmModule.forRootAsync({...})` | Async root config, usually fed by `ConfigService` |
| Register a feature repo | `TypeOrmModule.forFeature([User])` | Exposes `Repository<User>` inside that module only |
| Inject a repository | `@InjectRepository(User) private repo: Repository<User>` | Constructor injection inside a service |
| Define a table | `@Entity('users')` | Class-level decorator; the argument is the table name |
| Primary key | `@PrimaryGeneratedColumn('uuid')` | Database-generated UUID; use `'increment'` for bigint ids |
| Column mapping | `@Column({ type: 'varchar', length: 120 })` | Explicit types stop schema drift between environments |
| Unique constraint | `@Index(['tenantId', 'email'], { unique: true })` | Composite uniqueness enforced at the database level |
| Many-to-one | `@ManyToOne(() => Tenant, { onDelete: 'CASCADE' })` | Owning side holds the foreign key |
| Eager-load relations | `repo.find({ relations: { posts: true } })` | Object form; the array form still works but is deprecated |
| Fail on miss | `findOneOrFail({ where: { id } })` | Throws `EntityNotFoundError`; map it to a 404 |
| Wrap a unit of work | `dataSource.transaction(async (manager) => {...})` | Commits on return, rolls back on any throw |
| Disable auto-sync | `synchronize: false` | Mandatory outside local dev; migrations own the schema |
| Generate a migration | `npm run migration:generate src/migrations/AddTenant` | Diffs entities against the live database |
| Apply migrations | `npm run migration:run` | Runs every pending migration in order |
| Roll back one step | `npm run migration:revert` | Reverts the last applied migration |

## Common Commands

### Installing, Scaffolding, and Migrating

```bash
# Persistence layer, Postgres driver, and the SQLite driver used by tests
npm install @nestjs/typeorm typeorm pg
npm install --save-dev better-sqlite3

# Module skeleton with controller, service, entities and DTOs
npx nest g resource users --no-spec
npm run typeorm -- schema:log
npm run migration:generate src/migrations/AddTenantIdToUsers
npm run migration:run

npm run migration:revert
npm run migration:show
```

### Migration Scripts in package.json

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

## Code Snippets

### Async Connection Configuration

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
        // Never true outside local dev: migrations own the schema.
        synchronize: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class AppModule {}
```

### Entity with a Relation

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

### Repository Access with Error Handling

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
        throw new NotFoundException(`User ${id} not found`);
      }
      throw error;
    }
  }
}
```

### Transaction Around a State Change

```typescript
async publish(postId: string): Promise<void> {
  await this.dataSource.transaction(async (manager) => {
    const post = await manager.findOneOrFail(Post, { where: { id: postId } });
    post.publishedAt = new Date();
    await manager.save(post);
    // Any throw here rolls the whole unit of work back.
    await manager.increment(Post, { id: postId }, 'revision', 1);
  });
}
```

### SQLite-Backed Repository Test

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [User],
      synchronize: true, // acceptable in tests only
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UsersService],
}).compile();

const repo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
```
