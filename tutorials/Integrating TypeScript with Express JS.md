# Integrating TypeScript with Express JS

## Ringkasan Singkat

This tutorial explains how to set up and configure TypeScript in an Express JS application. By adding static typing to Express, you can write more robust, maintainable code, catch errors during development, and enjoy better autocompletion in your IDE.

---

## Untuk Siapa Materi Ini

* Backend developers transitioning from plain JavaScript to TypeScript.
* Node.js developers looking to improve their Express API architecture.
* Intermediate-level readers familiar with basic Express concepts.

---

## Prasyarat

* Basic understanding of JavaScript and Node.js.
* Familiarity with Express JS routing and middleware.
* Node.js and npm installed on your machine.
* Basic knowledge of TypeScript syntax (types, interfaces, etc.).

---

## Tujuan Belajar

After reading this material, you will understand how to:

* Set up a new Express project with TypeScript.
* Configure the `tsconfig.json` file for an Express environment.
* Strongly type Express `Request`, `Response`, and `NextFunction` objects.
* Use `ts-node` for local development and compile to JavaScript for production.

---

## Konteks dan Motivasi

While Express is highly flexible, it is written in JavaScript, which is dynamically typed. This can lead to runtime errors when handling request bodies, query parameters, or headers, as there is no guarantee about the shape of the data.

TypeScript solves this by providing static typing. In a production-level Express application, using TypeScript significantly reduces bugs by catching type-related errors at compile time. It also serves as self-documenting code, making it easier for large teams to collaborate and understand what data structures are expected across different endpoints.

---

## Materi Inti

### 1. Initializing the Project

First, create a new directory for your project and initialize a `package.json` file.

```bash
mkdir express-typescript-app
cd express-typescript-app
npm init -y
```

### 2. Installing Dependencies

You need to install Express, TypeScript, and the necessary type definitions. The type definitions (`@types/express`, `@types/node`) allow TypeScript to understand Express and Node.js objects.

```bash
npm install express
npm install -D typescript @types/express @types/node ts-node nodemon
```

* `typescript`: The TypeScript compiler.
* `@types/express` & `@types/node`: Type definitions.
* `ts-node`: Allows running TypeScript files directly in Node.js without pre-compiling.
* `nodemon`: Watches for file changes and restarts the server during development.

### 3. Configuring tsconfig.json

Generate a `tsconfig.json` file to configure how TypeScript compiles your code.

```bash
npx tsc --init
```

Update the generated `tsconfig.json` with recommended settings for Express:

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

* `rootDir`: The directory where your TypeScript source files live.
* `outDir`: The directory where the compiled JavaScript files will be output.
* `strict`: Enables all strict type-checking options.

### 4. Updating package.json Scripts

Add scripts to your `package.json` to handle development and production builds.

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "nodemon src/index.ts"
}
```

---

## Contoh / Ilustrasi

Create a `src` folder and add an `index.ts` file inside it.

```bash
mkdir src
touch src/index.ts
```

Here is how you can set up a basic Express server with TypeScript, properly typing the request and response objects:

```typescript
import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Typing a simple GET request
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Hello, TypeScript with Express!' });
});

// Custom interface for Request Body
interface UserRequestBody {
  name: string;
  email: string;
}

// Typing a POST request with specific body
app.post('/users', (req: Request<{}, {}, UserRequestBody>, res: Response) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  res.status(201).json({
    message: 'User created successfully',
    user: { name, email }
  });
});

// Global error handler with NextFunction
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
```

To run this application in development mode, use:

```bash
npm run dev
```

---

## Insight Penting

* **Generics in Express Requests:** The Express `Request` object can take generics: `Request<ParamsDictionary, ResBody, ReqBody, ReqQuery>`. This allows you to strictly type URL parameters, response bodies, request bodies, and query strings.
* **Avoid `any`:** When migrating from JavaScript, it might be tempting to use the `any` type to bypass compiler errors. However, doing so defeats the purpose of using TypeScript. Always define interfaces or types for your data structures.
* **Error Handling:** When typing error handling middleware, always include the `next: NextFunction` parameter even if you don't use it. Express relies on the function signature arity (4 parameters) to identify it as an error-handling middleware.
* **Information Exposure:** Remember to only return generic error messages to the client (e.g., "Internal Server Error") and log the detailed errors internally using `console.error` to avoid exposing sensitive stack traces.

---

## Ringkasan Akhir

* TypeScript adds static typing to Express, enhancing code reliability and developer experience.
* Key dependencies include `typescript`, `@types/express`, and `ts-node` for development.
* Configuration revolves around setting up `tsconfig.json` with appropriate `rootDir` and `outDir`.
* Express provides built-in types like `Request`, `Response`, and `NextFunction` which can be imported and utilized.
* You can define custom interfaces to strongly type request bodies and query parameters, ensuring runtime data matches expected structures.

---

## Langkah Belajar Berikutnya

* Learn how to structure a scalable Express application using the MVC pattern or Service Layer with TypeScript.
* Explore integrating an ORM like Prisma or TypeORM which provides excellent TypeScript support out of the box.
* Implement custom Type Declarations to extend the Express `Request` object (e.g., attaching a `user` object after authentication).

---

## Metadata

* Level: Intermediate
* Topik utama: Express JS, TypeScript
* Topik terkait: Static Typing, Backend Development, Node.js
* Kata kunci: typescript, express, ts-node, types, @types/express, tsconfig
* Estimasi waktu baca: 8 menit
