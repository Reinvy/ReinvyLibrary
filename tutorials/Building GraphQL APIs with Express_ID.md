# Membangun GraphQL API dengan Express dan Apollo Server

## Ringkasan Singkat

Tutorial ini memperkenalkan GraphQL sebagai alternatif yang kuat untuk REST API dan menunjukkan cara mengintegrasikannya ke dalam aplikasi Express.js menggunakan Apollo Server. Anda akan mempelajari konsep inti GraphQL, cara mendefinisikan skema dan resolver, serta cara mengeksekusi query dan mutation untuk pengambilan data yang efisien.

---

## Untuk Siapa Materi Ini

* **Target pembaca:** Backend developer yang sudah familiar dengan Express.js dan ingin belajar cara membangun dan mengimplementasikan GraphQL API.
* **Level pembaca:** Menengah (Intermediate).

---

## Prasyarat

Sebelum membaca materi ini, Anda idealnya sudah memahami:

* Konsep dasar Node.js dan Express.js (routing, middleware).
* Pemahaman tentang konsep RESTful API.
* Pemahaman dasar tentang JavaScript dan pemrograman asinkron.

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Perbedaan mendasar antara GraphQL dan REST.
* Cara mengatur server Express.js dengan Apollo Server untuk GraphQL.
* Cara mendefinisikan Skema GraphQL (TypeDefs) menggunakan Schema Definition Language (SDL).
* Cara mengimplementasikan Resolver untuk menangani pengambilan data untuk query dan mutation.
* Cara berinteraksi dengan API GraphQL menggunakan Apollo Sandbox.

---

## Konteks dan Motivasi

Dalam REST API tradisional, endpoint sering kali mengembalikan struktur data yang tetap. Hal ini dapat menyebabkan masalah "over-fetching" (menerima lebih banyak data daripada yang dibutuhkan) atau "under-fetching" (harus membuat beberapa request ke endpoint yang berbeda untuk mengumpulkan data yang diperlukan).

GraphQL memecahkan masalah ini dengan menyediakan bahasa query yang fleksibel untuk API Anda. GraphQL memungkinkan klien untuk meminta tepat data yang mereka butuhkan, tidak lebih dan tidak kurang, hanya dalam satu request. Memahami GraphQL memberdayakan developer untuk membangun API yang sangat efisien dan terukur, terutama untuk aplikasi modern dengan kebutuhan frontend yang kompleks. Mengintegrasikan Apollo Server dengan Express adalah cara standar dan paling tangguh untuk membangun GraphQL API di ekosistem Node.js.

---

## Materi Inti

### 1. Apa itu GraphQL?

GraphQL adalah bahasa query untuk API Anda dan runtime sisi server untuk mengeksekusi query tersebut menggunakan sistem tipe yang Anda tentukan untuk data Anda. Tidak seperti REST, yang menggunakan banyak URL untuk mengakses sumber daya yang berbeda, GraphQL biasanya mengekspos satu endpoint (misalnya, `/graphql`). Klien mengirimkan query yang menjelaskan bentuk respons yang diinginkan, dan server mengembalikan tepat seperti itu.

### 2. Konsep Inti: Skema dan Resolver

Server GraphQL dibangun di sekitar dua komponen mendasar:

* **Skema (TypeDefs):** Ditulis dalam GraphQL Schema Definition Language (SDL), skema mendefinisikan struktur data Anda dan operasi yang dapat dilakukan klien. Ini bertindak sebagai kontrak antara klien dan server.
* **Resolver:** Resolver adalah fungsi JavaScript yang menyediakan logika aktual untuk mengambil data yang dijelaskan dalam skema. Ketika sebuah query dieksekusi, Apollo Server memanggil resolver yang sesuai untuk mengisi respons.

### 3. Menyiapkan Apollo Server dengan Express

Untuk menggunakan GraphQL di Express, kita biasanya menggunakan `@apollo/server` bersama dengan middleware Express-nya. Pengaturan ini melibatkan pembuatan instance Apollo Server dengan skema dan resolver Anda, menjalankannya, dan melampirkannya ke aplikasi Express Anda.

### 4. Query vs. Mutation

* **Query:** Digunakan untuk mengambil atau membaca data (mirip dengan `GET` di REST).
* **Mutation:** Digunakan untuk memodifikasi data, seperti membuat, memperbarui, atau menghapus record (mirip dengan `POST`, `PUT`, `PATCH`, `DELETE` di REST).

---

## Contoh / Ilustrasi

Berikut adalah contoh lengkap dan minimal untuk menyiapkan API GraphQL dengan Express dan Apollo Server.

### Langkah 1: Instalasi Dependensi

```bash
npm install express @apollo/server graphql cors
```

### Langkah 2: Implementasi

Buat file `index.js`:

```javascript
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';

// Data sampel
const books = [
  { id: '1', title: 'The Awakening', author: 'Kate Chopin' },
  { id: '2', title: 'City of Glass', author: 'Paul Auster' },
];

// 1. Definisikan Skema (TypeDefs)
const typeDefs = `#graphql
  type Book {
    id: ID!
    title: String!
    author: String!
  }

  type Query {
    books: [Book]
    book(id: ID!): Book
  }

  type Mutation {
    addBook(title: String!, author: String!): Book
  }
`;

// 2. Definisikan Resolver
const resolvers = {
  Query: {
    books: () => books,
    book: (_, args) => books.find(book => book.id === args.id),
  },
  Mutation: {
    addBook: (_, args) => {
      const newBook = { id: String(books.length + 1), title: args.title, author: args.author };
      books.push(newBook);
      return newBook;
    },
  },
};

const app = express();

// 3. Inisialisasi Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// 4. Jalankan server dan terapkan middleware
await server.start();

app.use(
  '/graphql',
  cors(),
  express.json(),
  expressMiddleware(server)
);

app.listen(4000, () => {
  console.log(\`🚀 Server ready at http://localhost:4000/graphql\`);
});
```

Ketika Anda menjalankan server ini dan membuka `http://localhost:4000/graphql`, Anda dapat menggunakan Apollo Sandbox untuk menjalankan query seperti:

```graphql
query GetBooks {
  books {
    title
    author
  }
}
```

---

## Insight Penting

* **Hindari Masalah N+1:** Jebakan umum di GraphQL adalah masalah N+1, di mana sebuah query untuk daftar item menghasilkan N tambahan query database untuk mengambil data terkait. Gunakan alat bantu seperti `DataLoader` untuk menggabungkan (batch) dan melakukan cache pada request database.
* **Keamanan:** Karena klien dapat meminta data yang sangat bersarang (deeply nested), pengguna jahat dapat mengirimkan query kompleks yang membebani server Anda. Implementasikan pembatasan kedalaman query (query depth limiting) dan analisis kompleksitas untuk melindungi API Anda.
* **Penanganan Error:** GraphQL menangani error secara berbeda dari REST. Respons GraphQL akan selalu mengembalikan kode status `200 OK` jika request berhasil diuraikan, bahkan jika ada error selama eksekusi. Error dikembalikan dalam array `errors` spesifik di dalam body respons.
* **Kapan TIDAK menggunakan GraphQL:** Jika API Anda sangat sederhana, sepenuhnya publik, atau jika Anda sangat bergantung pada mekanisme cache HTTP standar, REST mungkin menjadi pilihan yang lebih sederhana dan efisien.

---

## Ringkasan Akhir

* GraphQL menyediakan pendekatan yang fleksibel dan digerakkan oleh klien untuk pengambilan data, memecahkan masalah over-fetching dan under-fetching yang umum terjadi di REST.
* Apollo Server adalah alat standar untuk mengintegrasikan GraphQL dengan backend Express.js.
* API didefinisikan oleh **Skema** yang memiliki tipe kuat (strongly-typed) dan didukung oleh **Resolver** yang mengeksekusi logika aktual.
* Meskipun kuat, GraphQL memperkenalkan tantangan baru seperti masalah N+1 dan pertimbangan keamanan spesifik yang memerlukan implementasi yang cermat.

---

## Langkah Belajar Berikutnya

* Pelajari penggunaan **DataLoader** untuk mengoptimalkan query database dan memecahkan masalah N+1.
* Pelajari tentang implementasi **Authentication dan Authorization** di dalam resolver GraphQL.
* Pelajari cara mengintegrasikan database seperti PostgreSQL atau MongoDB menggunakan ORM seperti Prisma di dalam resolver GraphQL Anda.
* Pahami GraphQL Subscriptions untuk pembaruan data secara real-time.

---

## Metadata

* Level: Menengah
* Topik utama: Express.js, GraphQL
* Topik terkait: API Design, Apollo Server, Node.js
* Kata kunci: graphql, express, apollo server, skema, resolver, api
* Estimasi waktu baca: 15 menit
