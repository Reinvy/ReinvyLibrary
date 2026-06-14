---
title: "Membangun Aplikasi Express yang Type-Safe dengan TypeScript"
description: "Tutorial ini menjelaskan cara mengintegrasikan TypeScript ke dalam aplikasi Express.js untuk mencapai keamanan tipe (type safety). Materi ini mencakup pengatura"
category: "backend"
technology: "expressjs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Express yang Type-Safe dengan TypeScript

## Ringkasan

Tutorial ini menjelaskan cara mengintegrasikan TypeScript ke dalam aplikasi Express.js untuk mencapai keamanan tipe (type safety). Materi ini mencakup pengaturan awal, konfigurasi kompilator TypeScript, penanganan routing dasar dengan tipe, dan perluasan tipe request Express menggunakan *declaration merging*. Pada akhirnya, Anda akan memiliki fondasi yang kuat untuk membangun aplikasi Express yang skalabel dan mudah dipelihara.

## Target Audiens

Developer Node.js tingkat menengah yang sudah terbiasa dengan Express.js dan ingin memanfaatkan TypeScript untuk menangkap kesalahan pada saat kompilasi (*compile-time*), meningkatkan *autocomplete* kode, dan meningkatkan kualitas kode secara keseluruhan.

## Prasyarat

- Pemahaman dasar tentang JavaScript dan Node.js.
- Terbiasa dengan routing dan middleware di Express.js.
- Pengetahuan dasar tentang sintaks dan tipe TypeScript.
- Node.js sudah terinstal di komputer Anda.

## Tujuan Pembelajaran

- Memahami cara menyiapkan proyek Express baru dengan TypeScript.
- Mempelajari cara mengonfigurasi `tsconfig.json` untuk aplikasi Express.
- Menguasai penerapan tipe TypeScript pada *request*, *response*, dan *middleware* Express.
- Mempelajari cara menggunakan *declaration merging* untuk memperluas objek `Request` standar Express.
- Menghindari jebakan umum saat beralih dari aplikasi Express berbasis JavaScript ke TypeScript.

## Konteks dan Motivasi

Sistem *dynamic typing* pada JavaScript dapat menyebabkan kesalahan *runtime* yang seringkali sulit dilacak dalam aplikasi Express yang besar. Dengan mengintegrasikan TypeScript, developer mendapatkan pemeriksaan saat proses kompilasi (*compile-time checking*), yang menangkap kesalahan lebih awal dalam siklus pengembangan. TypeScript juga menyediakan fitur *autocomplete* IDE yang luar biasa untuk objek-objek Express (seperti `req.body`, `req.query`, dan `res`), sehingga secara drastis meningkatkan pengalaman developer dan membuat *codebase* lebih mudah untuk di-*refactor* dan diskalakan.

## Konten Inti

### 1. Penyiapan dan Instalasi Proyek

Untuk memulai, inisialisasi proyek Node.js baru dan instal dependensi yang diperlukan, termasuk Express, TypeScript, dan definisi tipe yang sesuai.

```bash
npm init -y
npm install express
npm install -D typescript @types/node @types/express ts-node nodemon
```

- `typescript`: Kompilator TypeScript.
- `@types/express` dan `@types/node`: Definisi tipe yang menyediakan dukungan TypeScript untuk Express dan modul inti Node.
- `ts-node`: Memungkinkan Anda untuk menjalankan file TypeScript secara langsung tanpa kompilasi awal.
- `nodemon`: Secara otomatis memulai ulang server saat ada perubahan file.

### 2. Mengonfigurasi TypeScript

Inisialisasi file konfigurasi TypeScript:

```bash
npx tsc --init
```

Perbarui file `tsconfig.json` yang dihasilkan dengan pengaturan yang direkomendasikan untuk Node.js:

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

### 3. Memberikan Tipe pada Request dan Response

Express menyediakan tipe spesifik untuk *request* dan *response* (`Request`, `Response`, `NextFunction`). Anda harus secara eksplisit memberikan tipe pada *route handler* Anda untuk memastikan *type safety*.

```typescript
import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// Rute dasar yang memiliki tipe
app.get('/', (req: Request, res: Response) => {
  res.send('Halo TypeScript Express!');
});
```

### 4. Tipe Lanjutan: Params, Query, dan Body

Anda dapat membuat rute Anda lebih aman dengan memberikan *generic types* ke objek `Request`: `Request<ParamsDictionary, ResBody, ReqBody, ReqQuery>`.

```typescript
interface UserParams {
  id: string;
}

interface UserBody {
  name: string;
  email: string;
}

app.post('/users/:id', (req: Request<UserParams, any, UserBody>, res: Response) => {
  const userId = req.params.id; // Tipe dikenali sebagai string
  const userName = req.body.name; // Tipe dikenali sebagai string

  res.json({ id: userId, name: userName });
});
```

### 5. Declaration Merging untuk Properti Request Kustom

Seringkali, middleware akan menyematkan data ke objek `req` (misalnya, payload pengguna JWT yang telah didekode). Untuk membuat TypeScript mengenali properti kustom ini, Anda harus menggunakan *declaration merging*.

Buat file `types/express/index.d.ts`:

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

Perbarui `tsconfig.json` untuk menyertakan tipe kustom Anda:

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./types"]
  }
}
```

## Contoh Kode

Berikut adalah aplikasi Express sederhana dan lengkap menggunakan TypeScript yang mengimplementasikan middleware autentikasi yang menyematkan objek *user* ke *request*.

```typescript
// src/index.ts
import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// Middleware autentikasi tiruan (mock)
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization;
  if (token === 'valid-token') {
    // req.user sekarang valid dan dikenali oleh TS karena declaration merging
    req.user = { id: 1, role: 'admin' };
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

app.get('/protected', authenticate, (req: Request, res: Response) => {
  res.json({ message: 'Akses diizinkan', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
```

## Insight Penting

- **Strict Mode:** Selalu aktifkan `"strict": true` di `tsconfig.json` Anda. Ini memaksa Anda untuk menangani potensi nilai `null` atau `undefined` dan memastikan tingkat *type safety* tertinggi.
- **Tipe Middleware:** Selalu beri tipe pada middleware secara eksplisit menggunakan `(req: Request, res: Response, next: NextFunction)`.
- **Hindari `any`:** Hindari penggunaan tipe `any` untuk `req.body` atau `req.query`. Alih-alih, definisikan interface atau gunakan pustaka validasi seperti Zod atau Joi bersama TypeScript untuk memvalidasi batasan data *runtime*.
- **Validasi Runtime:** TypeScript hanya memeriksa tipe pada saat kompilasi. Data yang masuk ke aplikasi Express Anda (melalui request POST) tidak memiliki tipe saat *runtime*. Anda tetap membutuhkan validasi *runtime* (misalnya, menggunakan Zod) untuk memastikan data yang masuk sesuai dengan interface TypeScript Anda.

## Kesimpulan

- Mengintegrasikan TypeScript dengan Express membutuhkan instalasi `@types/express` dan konfigurasi `tsconfig.json`.
- Dengan secara eksplisit memberikan tipe `Request`, `Response`, dan `NextFunction`, Anda menangkap kesalahan lebih awal dan meningkatkan pengalaman developer dengan *autocomplete*.
- Generics pada tipe `Request` memungkinkan Anda untuk secara ketat mendefinisikan `params`, `body`, dan `query`.
- *Declaration merging* sangat penting untuk memperluas objek `Request` dengan properti kustom seperti `req.user`.
- TypeScript memberikan keamanan saat kompilasi (*compile-time safety*), tetapi validasi *runtime* tetap diperlukan untuk *payload request* yang masuk.

## Langkah Berikutnya

- Mengintegrasikan Zod untuk validasi data *runtime* di Express.
- Menyusun struktur aplikasi Express TypeScript yang skalabel (Pola Controller, Service, Repository).
- Menyiapkan Jest dengan ts-jest untuk pengujian Express API berbasis TypeScript.
