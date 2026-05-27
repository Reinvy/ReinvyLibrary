# Building Type-Safe Express Apps with TypeScript

## Ringkasan Singkat

This tutorial explains how to integrate TypeScript into an Express.js application to achieve type safety. It covers the initial setup, configuring the TypeScript compiler, handling basic routing with types, and extending Express request types using declaration merging. By the end, you will have a robust foundation for building scalable and maintainable Express applications.

## Untuk Siapa Materi Ini

Intermediate Node.js developers who are already familiar with Express.js and want to leverage TypeScript to catch errors at compile-time, improve code autocomplete, and enhance overall code quality.

## Prasyarat

- Basic understanding of JavaScript and Node.js.
- Familiarity with Express.js routing and middleware.
- Basic knowledge of TypeScript syntax and types.
- Node.js installed on your machine.

## Tujuan Belajar

- Understand how to set up a new Express project with TypeScript.
- Learn how to configure `tsconfig.json` for an Express application.
- Master the application of TypeScript types to Express requests, responses, and middleware.
- Learn how to use declaration merging to extend the standard Express `Request` object.
- Avoid common pitfalls when transitioning an Express app from JavaScript to TypeScript.

## Konteks dan Motivasi

JavaScript's dynamic typing can lead to runtime errors that are often difficult to trace in large Express applications. By integrating TypeScript, developers gain compile-time checking, which catches errors early in the development cycle. TypeScript also provides exceptional IDE autocomplete for Express objects (like `req.body`, `req.query`, and `res`), drastically improving the developer experience and making the codebase easier to refactor and scale.

## Materi Inti

### 1. Project Setup and Installation

To start, initialize a new Node.js project and install the necessary dependencies, including Express, TypeScript, and the corresponding type definitions.

```bash
npm init -y
npm install express
npm install -D typescript @types/node @types/express ts-node nodemon
```

- `typescript`: The TypeScript compiler.
- `@types/express` and `@types/node`: Type definitions that provide TypeScript support for Express and Node core modules.
- `ts-node`: Allows you to run TypeScript files directly without pre-compiling.
- `nodemon`: Automatically restarts the server upon file changes.

### 2. Configuring TypeScript

Initialize the TypeScript configuration file:

```bash
npx tsc --init
```

Update the generated `tsconfig.json` with recommended settings for Node.js:

```json
{
  "compilerOptions": {
    "target": "ES6",
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

### 3. Typing Requests and Responses

Express provides specific types for requests and responses (`Request`, `Response`, `NextFunction`). You should explicitly type your route handlers to ensure type safety.

```typescript
import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// Basic typed route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello TypeScript Express!');
});
```

### 4. Advanced Typing: Params, Query, and Body

You can make your routes even safer by providing generic types to the `Request` object: `Request<ParamsDictionary, ResBody, ReqBody, ReqQuery>`.

```typescript
interface UserParams {
  id: string;
}

interface UserBody {
  name: string;
  email: string;
}

app.post('/users/:id', (req: Request<UserParams, any, UserBody>, res: Response) => {
  const userId = req.params.id; // Typed as string
  const userName = req.body.name; // Typed as string

  res.json({ id: userId, name: userName });
});
```

### 5. Declaration Merging for Custom Request Properties

Often, middleware will attach data to the `req` object (e.g., a decoded JWT user payload). To make TypeScript aware of these custom properties, you must use declaration merging.

Create a `types/express/index.d.ts` file:

```typescript
import { UserPayload } from '../../src/models/user';

declare global {
  namespace Express {
    export interface Request {
      user?: UserPayload;
    }
  }
}
```

Update `tsconfig.json` to include your custom types:

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./types"]
  }
}
```

## Contoh / Ilustrasi

Here is a complete, simple Express application using TypeScript that implements an authentication middleware attaching a user to the request.

```typescript
// src/index.ts
import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// Mock authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization;
  if (token === 'valid-token') {
    // req.user is now valid and recognized by TS due to declaration merging
    req.user = { id: 1, role: 'admin' };
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

app.get('/protected', authenticate, (req: Request, res: Response) => {
  res.json({ message: 'Access granted', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

## Insight Penting

- **Strict Mode:** Always enable `"strict": true` in your `tsconfig.json`. This forces you to handle potential `null` or `undefined` values and ensures the highest level of type safety.
- **Middleware Types:** Always type middleware explicitly using `(req: Request, res: Response, next: NextFunction)`.
- **Avoid `any`:** Refrain from using the `any` type for `req.body` or `req.query`. Instead, define interfaces or use validation libraries like Zod or Joi alongside TypeScript to validate runtime data boundaries.
- **Runtime Validation:** TypeScript only checks types at compile time. Data coming into your Express app (via POST requests) is untyped at runtime. You still need runtime validation (e.g., using Zod) to ensure the incoming data matches your TypeScript interfaces.

## Ringkasan Akhir

- Integrating TypeScript with Express requires installing `@types/express` and configuring `tsconfig.json`.
- By explicitly typing `Request`, `Response`, and `NextFunction`, you catch errors early and improve developer experience with autocomplete.
- Generics in the `Request` type allow you to strictly define `params`, `body`, and `query`.
- Declaration merging is essential for extending the `Request` object with custom properties like `req.user`.
- TypeScript provides compile-time safety, but runtime validation is still necessary for incoming request payloads.

## Langkah Belajar Berikutnya

- Integrating Zod for runtime data validation in Express.
- Structuring a scalable TypeScript Express app (Controller, Service, Repository patterns).
- Setting up Jest with ts-jest for testing TypeScript Express APIs.

## Metadata

- Level: Menengah
- Topik utama: Express.js, TypeScript
- Topik terkait: Backend Development, Type Safety, Node.js
- Kata kunci: Express TypeScript, Type-Safe API, TS Node, Declaration Merging Express
- Estimasi waktu baca: 10 menit
