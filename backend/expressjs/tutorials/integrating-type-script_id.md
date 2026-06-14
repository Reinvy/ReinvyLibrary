---
title: "Mengintegrasikan TypeScript dengan Express JS"
description: "Tutorial ini menjelaskan cara mengatur dan mengkonfigurasi TypeScript dalam aplikasi Express JS. Dengan menambahkan static typing pada Express, Anda dapat menul"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Mengintegrasikan TypeScript dengan Express JS

## Ringkasan Singkat

Tutorial ini menjelaskan cara mengatur dan mengkonfigurasi TypeScript dalam aplikasi Express JS. Dengan menambahkan *static typing* pada Express, Anda dapat menulis kode yang lebih kokoh dan mudah dikelola, menangkap error selama masa pengembangan, dan menikmati fitur *autocompletion* yang lebih baik di IDE Anda.

---

## Untuk Siapa Materi Ini

* Developer backend yang sedang beralih dari JavaScript murni ke TypeScript.
* Developer Node.js yang ingin memperbaiki arsitektur API Express mereka.
* Pembaca tingkat menengah (Intermediate) yang sudah familiar dengan konsep dasar Express.

---

## Prasyarat

* Pemahaman dasar tentang JavaScript dan Node.js.
* Familiar dengan *routing* dan *middleware* di Express JS.
* Node.js dan npm sudah terpasang di komputer Anda.
* Pengetahuan dasar tentang sintaks TypeScript (types, interfaces, dll).

---

## Tujuan Belajar

Setelah membaca materi ini, Anda akan memahami cara:

* Mengatur proyek Express baru dengan TypeScript.
* Mengkonfigurasi file `tsconfig.json` untuk lingkungan Express.
* Memberikan tipe (typing) yang ketat pada objek `Request`, `Response`, dan `NextFunction` di Express.
* Menggunakan `ts-node` untuk pengembangan lokal dan melakukan kompilasi ke JavaScript untuk tahap produksi (production).

---

## Konteks dan Motivasi

Meskipun Express sangat fleksibel, framework ini ditulis menggunakan JavaScript, yang memiliki sifat *dynamically typed*. Hal ini dapat menyebabkan error *runtime* ketika menangani *request body*, parameter *query*, atau *header*, karena tidak ada jaminan mengenai bentuk datanya.

TypeScript mengatasi masalah ini dengan menyediakan *static typing*. Dalam aplikasi Express tingkat produksi, penggunaan TypeScript secara signifikan mengurangi bug dengan menangkap error terkait tipe data pada saat kompilasi (*compile time*). TypeScript juga berfungsi sebagai dokumentasi mandiri (self-documenting code), yang membuatnya lebih mudah bagi tim besar untuk berkolaborasi dan memahami struktur data apa yang diharapkan di berbagai endpoint.

---

## Materi Inti

### 1. Inisialisasi Proyek

Pertama, buat direktori baru untuk proyek Anda dan inisialisasi file `package.json`.

```bash
mkdir express-typescript-app
cd express-typescript-app
npm init -y
```

### 2. Menginstal Dependensi

Anda perlu menginstal Express, TypeScript, dan definisi tipe (type definitions) yang diperlukan. Definisi tipe (`@types/express`, `@types/node`) memungkinkan TypeScript untuk memahami objek dari Express dan Node.js.

```bash
npm install express
npm install -D typescript @types/express @types/node ts-node nodemon
```

* `typescript`: Kompiler TypeScript.
* `@types/express` & `@types/node`: Definisi tipe.
* `ts-node`: Memungkinkan eksekusi file TypeScript secara langsung di Node.js tanpa perlu kompilasi sebelumnya.
* `nodemon`: Memantau perubahan file dan me-restart server selama masa pengembangan.

### 3. Konfigurasi tsconfig.json

Hasilkan file `tsconfig.json` untuk mengatur bagaimana TypeScript mengkompilasi kode Anda.

```bash
npx tsc --init
```

Perbarui file `tsconfig.json` yang dihasilkan dengan pengaturan yang direkomendasikan untuk Express:

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

* `rootDir`: Direktori tempat file sumber (source) TypeScript Anda berada.
* `outDir`: Direktori tempat file JavaScript hasil kompilasi akan dikeluarkan.
* `strict`: Mengaktifkan semua opsi pengecekan tipe yang ketat.

### 4. Memperbarui Skrip di package.json

Tambahkan skrip ke `package.json` Anda untuk menangani proses *build* pengembangan dan produksi.

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "nodemon src/index.ts"
}
```

---

## Contoh / Ilustrasi

Buat folder `src` dan tambahkan file `index.ts` di dalamnya.

```bash
mkdir src
touch src/index.ts
```

Berikut ini adalah cara mengatur server Express dasar dengan TypeScript, memberikan tipe secara benar pada objek *request* dan *response*:

```typescript
import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Menambahkan tipe pada request GET sederhana
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Halo, TypeScript dengan Express!' });
});

// Interface khusus (custom interface) untuk Request Body
interface UserRequestBody {
  name: string;
  email: string;
}

// Menambahkan tipe pada request POST dengan body spesifik
app.post('/users', (req: Request<{}, {}, UserRequestBody>, res: Response) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nama dan email diperlukan' });
  }

  res.status(201).json({
    message: 'User berhasil dibuat',
    user: { name, email }
  });
});

// Penangan error global (global error handler) dengan NextFunction
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server sedang berjalan di http://localhost:${PORT}`);
});
```

Untuk menjalankan aplikasi ini dalam mode pengembangan, gunakan:

```bash
npm run dev
```

---

## Insight Penting

* **Generics dalam Request Express:** Objek `Request` pada Express dapat menerima *generics*: `Request<ParamsDictionary, ResBody, ReqBody, ReqQuery>`. Ini memungkinkan Anda untuk memberikan tipe yang ketat pada parameter URL, *response body*, *request body*, dan *query string*.
* **Hindari `any`:** Saat bermigrasi dari JavaScript, Anda mungkin tergoda untuk menggunakan tipe `any` untuk melewati error kompiler. Namun, melakukan hal ini akan mengalahkan tujuan penggunaan TypeScript. Selalu definisikan *interface* atau *types* untuk struktur data Anda.
* **Penanganan Error:** Saat memberikan tipe pada *middleware* penanganan error, selalu sertakan parameter `next: NextFunction` meskipun Anda tidak menggunakannya. Express bergantung pada jumlah parameter (arity - 4 parameter) untuk mengidentifikasi fungsi tersebut sebagai *middleware* penanganan error.
* **Eksposur Informasi:** Ingatlah untuk selalu mengembalikan pesan error yang generik ke klien (misalnya, "Internal Server Error") dan mencatat (log) detail error secara internal menggunakan `console.error` untuk menghindari tereksposnya jejak tumpukan (stack trace) yang sensitif.

---

## Ringkasan Akhir

* TypeScript menambahkan *static typing* pada Express, yang meningkatkan keandalan kode dan pengalaman developer.
* Dependensi kunci meliputi `typescript`, `@types/express`, dan `ts-node` untuk tahap pengembangan.
* Konfigurasi berpusat pada pengaturan `tsconfig.json` dengan `rootDir` dan `outDir` yang sesuai.
* Express menyediakan tipe bawaan seperti `Request`, `Response`, dan `NextFunction` yang dapat diimpor dan dimanfaatkan.
* Anda dapat mendefinisikan *interface* kustom untuk memberikan tipe yang ketat pada *request body* dan *query parameter*, memastikan data *runtime* sesuai dengan struktur yang diharapkan.

---

## Langkah Belajar Berikutnya

* Pelajari cara menyusun aplikasi Express yang berskala besar menggunakan pola MVC atau Service Layer dengan TypeScript.
* Jelajahi cara mengintegrasikan ORM seperti Prisma atau TypeORM yang menyediakan dukungan TypeScript yang sangat baik secara bawaan (out of the box).
* Implementasikan Deklarasi Tipe (Type Declarations) kustom untuk memperluas objek `Request` Express (misalnya, melampirkan objek `user` setelah otentikasi berhasil).

---

## Metadata

* Level: Menengah (Intermediate)
* Topik utama: Express JS, TypeScript
* Topik terkait: Static Typing, Backend Development, Node.js
* Kata kunci: typescript, express, ts-node, types, @types/express, tsconfig
* Estimasi waktu baca: 8 menit
