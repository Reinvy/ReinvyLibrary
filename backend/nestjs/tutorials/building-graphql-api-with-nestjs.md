---
title: "Building a GraphQL API with NestJS"
description: "A comprehensive tutorial on building a production-ready GraphQL API with NestJS using the code-first approach with @nestjs/graphql and Apollo Driver."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a GraphQL API with NestJS

## Summary

This tutorial walks through building a complete GraphQL API for a task management application using NestJS and the code-first approach with `@nestjs/graphql` and Apollo Server. You will learn how to define GraphQL object types, resolvers, mutations, queries, and subscriptions using NestJS decorators, integrate with a PostgreSQL database via TypeORM, implement authentication with Auth guards, and handle input validation — all while leveraging NestJS's modular architecture.

## Target Audience

- Backend developers familiar with NestJS basics (modules, controllers, dependency injection).
- Developers who understand REST fundamentals and want to learn how GraphQL works within the NestJS ecosystem.
- Expected developer level: Intermediate.

## Prerequisites

- Node.js 18+ and npm installed.
- A running PostgreSQL instance (local or Docker) or familiarity with TypeORM configuration.
- Basic understanding of GraphQL concepts (queries, mutations, types, resolvers).
- Prior experience with NestJS project structure (or completion of the "Getting Started with NestJS" tutorial in this library).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a NestJS project with GraphQL and Apollo Driver configured via the code-first approach.
- Define GraphQL object types, input types, and enums using NestJS decorators (`@ObjectType`, `@InputType`, `@Field`, `@Int`, `@registerEnumType`).
- Build resolvers that handle queries, mutations, and field-level resolution with `@Resolver`, `@Query`, `@Mutation`, and `@ResolveField`.
- Implement database-backed data access using TypeORM entities and repositories within GraphQL resolvers.
- Secure GraphQL endpoints with Guard-based authentication and role-based authorization.
- Validate inputs using class-validator and custom pipes mapped to GraphQL arguments.
- Implement real-time GraphQL subscriptions for live data updates.
- Apply the DataLoader pattern to solve the N+1 query problem.

## Context and Motivation

GraphQL has become a dominant API paradigm because it gives clients precise control over what data they receive, eliminates over-fetching and under-fetching, and enables powerful tooling through a strongly typed schema. NestJS provides first-class GraphQL support through `@nestjs/graphql`, offering both a **code-first** approach (where decorators generate the schema from TypeScript classes) and a **schema-first** approach (where you write SDL manually). The code-first approach is especially powerful in a TypeScript codebase because it keeps your type definitions and resolvers in sync automatically — a single `@ObjectType()` class serves as both the runtime model and the GraphQL schema definition.

In this tutorial, you will build a GraphQL API for a task management application that supports creating projects, managing tasks with different priorities and statuses, assigning tasks to users, and receiving real-time updates when task statuses change.

## Core Content

### Project Setup

Start by scaffolding a new NestJS project and installing the GraphQL dependencies:

```bash
npm install -g @nestjs/cli
nest new task-manager-graphql
cd task-manager-graphql
npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql
npm install @nestjs/typeorm typeorm pg
npm install class-validator class-transformer
npm install graphql-subscriptions
```

The `@nestjs/graphql` package provides the core decorators and module, while `@nestjs/apollo` integrates Apollo Server as the GraphQL driver. TypeORM provides PostgreSQL connectivity, and `class-validator` powers input validation.

### Configuring the GraphQL Module

Open `AppModule` and configure the GraphQL module with the code-first approach:

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

The `autoSchemaFile` option tells NestJS to generate `schema.gql` automatically from your decorated classes. With `sortSchema: true`, the schema fields are alphabetically ordered for consistent diffs. The subscriptions configuration enables WebSocket-based GraphQL subscriptions using the `graphql-ws` protocol.

### Defining Entity and Object Type

In the code-first approach, a single class can serve as both the TypeORM entity and the GraphQL object type. This reduces duplication dramatically:

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

Notice how `@ObjectType()` and `@Field()` decorators sit alongside TypeORM decorators. The `@Field()` decorator exposes the property in the GraphQL schema, and its type argument controls the GraphQL type mapping (e.g., `() => TaskStatus` for enums, `{ nullable: true }` for optional fields).

### Defining the User Entity

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

### Creating the Task Resolver

Resolvers in NestJS are providers decorated with `@Resolver()`. They contain query and mutation handler methods:

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

The `@Args()` decorator maps incoming GraphQL arguments to method parameters. The `@ResolveField()` decorator handles field-level resolution — when a client requests the `assignee` field on a `Task`, NestJS automatically invokes this method.

### Creating Input Types (DTOs)

Input types are defined with `@InputType()` and validated with `class-validator` decorators:

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

### Registering the Module

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

### Authentication with Guards

GraphQL resolvers in NestJS support the same guard system as REST controllers. Create a JWT authentication guard:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    // In production, validate the JWT token from req.headers.authorization
    // For this example, we check for a simple auth header
    return !!req.headers.authorization;
  }
}
```

Apply it to resolvers using `@UseGuards()`:

```typescript
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';

@Resolver(() => Task)
@UseGuards(GqlAuthGuard)
export class TaskResolver {
  // ... resolver methods
}
```

The `GqlExecutionContext.create()` helper converts the standard NestJS execution context into the GraphQL execution context, giving access to the GraphQL request context including `req` and `res` objects.

### Implementing GraphQL Subscriptions

Subscriptions enable real-time push-based communication. Create a pub/sub system and wire it to a subscription resolver:

```typescript
import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

export const pubSub = new PubSub();
export const TASK_UPDATED_EVENT = 'taskUpdated';
```

Then add a subscription handler in your resolver:

```typescript
import { Subscription } from '@nestjs/graphql';

@Resolver(() => Task)
export class TaskResolver {
  // ... queries and mutations

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

The `@Subscription()` decorator registers a GraphQL subscription. The `filter` option allows clients to subscribe to specific events by passing arguments — in this case, optionally filtering by `taskId`.

### Solving N+1 with DataLoader

The N+1 problem occurs when resolving a list of tasks — if each task loads its assignee via a separate query, fetching 100 tasks generates 101 database queries. The DataLoader pattern batches these into a single query:

```bash
npm install @nestjs/graphql dataloader
```

Create a DataLoader provider:

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

Then inject it into the resolver:

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

The `@Context()` decorator provides access to the GraphQL request context, which is the perfect place to attach a request-scoped DataLoader instance. Each request gets a fresh DataLoader, and all `assignee` resolutions within that request are batched.

### Schema Output

With all the decorators above, NestJS generates the following `schema.gql` automatically:

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

## Code Examples

### Complete GraphQL Mutation Example

A client creates a task and subscribes to status updates in a single session:

```typescript
// Client-side: Apollo Client setup
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

// Create a task
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
        title: 'Implement GraphQL subscriptions',
        priority: 'HIGH',
        assigneeId: 'user-uuid-here',
      },
    },
  });
  console.log('Created:', result.data.createTask);
}

// Subscribe to updates
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
  variables: { taskId: undefined }, // Listen to all tasks
}).subscribe({
  next({ data }) {
    console.log('Task updated:', data.taskUpdated);
  },
});
```

### Query with Field Selection

Clients can request exactly the fields they need:

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

This query fetches only the `id`, `title`, `priority`, and the nested `assignee.name` and `assignee.email` — no over-fetching of unused fields.

### Mutation with Validation Error Handling

```typescript
// Attempt to create a task with an invalid title
const result = await client.mutate({
  mutation: CREATE_TASK,
  variables: {
    input: {
      title: 'AB', // Too short — will trigger MinLength(3) validation
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

## Key Insights

- **Code-first vs schema-first**: NestJS supports both approaches, but code-first is strongly recommended for TypeScript projects. It eliminates duplication between your schema and your TypeScript types, making refactoring safer and keeping your schema in sync automatically.
- **Single class, dual purpose**: Decorating a TypeORM entity with both `@Entity()` and `@ObjectType()` creates a single source of truth for both the database model and the GraphQL type, but be mindful of exposing sensitive fields — use `@Field({ nullable: true })` or omit `@Field()` entirely for fields clients should not see (e.g., password hashes).
- **Authentication context**: GraphQL guards use `GqlExecutionContext.create(context)` to access the request context. Unlike REST controllers, the `req` object is nested inside `ctx.getContext().req` rather than being the top-level argument.
- **DataLoader for N+1 prevention**: Always use DataLoader when resolving relationship fields in lists. Without it, fetching 50 tasks with their assignees generates 51 database queries instead of 2. The DataLoader batches all `load()` calls from the same request into a single `IN` query.
- **Subscription lifecycle**: GraphQL subscriptions maintain a WebSocket connection. The `graphql-subscriptions` PubSub system works in-memory for single-server deployments, but for multi-server or serverless environments, use a shared transport like Redis (`@nestjs/graphql` supports `RedisPubSub`).
- **Validation pipeline**: `class-validator` decorators on `@InputType()` classes are automatically integrated into NestJS's validation pipeline when `ValidationPipe` is registered globally. No additional pipe wiring is needed for GraphQL input types.

## Next Steps

- Explore the schema-first approach with `@nestjs/graphql` by writing SDL manually and providing resolvers as a map.
- Learn about Apollo Federation for building a federated GraphQL gateway across multiple NestJS microservices.
- Study the DataLoader pattern in more depth to handle complex batch scenarios with sorting and filtering.
- Check out the [NestJS Best Practices Guide](../guides/nestjs-best-practices-guide.md) for production patterns.

## Conclusion

In this tutorial, you built a complete GraphQL API with NestJS using the code-first approach. You defined object types and input types with decorators, created resolvers for queries, mutations, and subscriptions, integrated with PostgreSQL via TypeORM, secured endpoints with authentication guards, and applied the DataLoader pattern to solve the N+1 query problem. The code-first approach keeps your schema and TypeScript types in perfect sync, making NestJS one of the most productive frameworks for building GraphQL APIs.
