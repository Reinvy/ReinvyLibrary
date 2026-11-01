---
title: "Membangun Pencarian Semantik dan Pipeline RAG dengan MongoDB Atlas Vector Search"
description: "Pelajari cara mengindeks embedding di MongoDB Atlas, mengkuerinya dengan $vectorSearch, menggabungkan pencarian leksikal dan semantik, lalu memasukkannya ke pipeline retrieval-augmented generation."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Pencarian Semantik dan Pipeline RAG dengan MongoDB Atlas Vector Search

## Ringkasan

Tutorial ini membangun lapisan pencarian semantik siap produksi di atas MongoDB Atlas Vector Search. Anda akan menyimpan embedding berdampingan dengan dokumen yang sudah ada, mendefinisikan indeks vector search dengan filter field, mengkuerinya melalui stage agregasi `$vectorSearch`, menggabungkan hasil tersebut dengan pencarian leksikal Atlas Search, dan menyambungkan kandidat gabungan ke endpoint retrieval-augmented generation (RAG) yang didukung model bahasa. Hasil akhirnya adalah layanan Node.js yang menjawab pertanyaan tentang korpus Anda sendiri dan menyebutkan dokumen yang dipakai sebagai sumber.

## Target Audiens

- Backend dan data engineer yang sudah mengoperasikan MongoDB di produksi dan ingin menambahkan pencarian semantik.
- Pengembang aplikasi yang membangun fitur AI dan perlu memahami apa yang terjadi antara model embedding dan prompt.
- Platform engineer yang sedang mengevaluasi apakah vektor disimpan di MongoDB atau ditambahkan sebagai vector database terpisah.

## Prasyarat

- Pemahaman tentang dokumen MongoDB, aggregation pipeline, dan indeks.
- Node.js 20 atau lebih baru dengan npm, serta cluster MongoDB Atlas versi 7.0 atau lebih baru (Vector Search hanya tersedia di Atlas, tidak pada `mongod` biasa).
- Kemampuan memanggil API embedding (OpenAI, Voyage, Cohere, atau model self-hosted) dan membaca definisi indeks JSON.
- Sebuah project Atlas tempat Anda boleh membuat search index, beserta connection string untuk database user.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan bagaimana Atlas Vector Search menyimpan dan menelusuri embedding, serta kapan pencarian aproksimasi cukup akurat.
- Mendefinisikan indeks vector search yang menyertakan filter field sehingga kueri bisa dibatasi berdasarkan tenant, locale, atau visibilitas.
- Menulis stage `$vectorSearch` dengan `numCandidates`, `limit`, dan pre-filter, serta menafsirkan skor relevansi yang dikembalikan.
- Memotong dokumen pada batas yang masuk akal dan menyimpan embedding tingkat chunk tanpa menduplikasi metadata sumber.
- Menggabungkan pencarian leksikal dan semantik menjadi satu himpunan kandidat yang berperingkat.
- Menyusun chunk hasil retrieval menjadi prompt yang ter-grounding dan mengembalikan sitasi dari API Node.js.

## Konteks dan Motivasi

Pencarian full-text mencocokkan token. Jika pengguna bertanya "bagaimana cara menghentikan cluster saya agar tidak timeout saat reindex", indeks leksikal hanya menemukan dokumen yang memuat kata-kata itu persis, dan tidak lebih. Dokumen berjudul "Connection pool exhaustion during maintenance windows" menjawab pertanyaan tersebut dengan sempurna namun hampir tidak berbagi token dengan kuerinya. Embedding menutup celah ini: keduanya memetakan teks ke ruang vektor di mana makna, bukan ejaan, yang menentukan kedekatan.

Insting pertama biasanya menambahkan vector database khusus di samping MongoDB. Itu berarti sumber kebenaran kedua, cerita backup dan kontrol akses kedua, serta job sinkronisasi yang pasti akan melenceng. Atlas Vector Search menyimpan vektor di koleksi yang sama dengan dokumennya, sehingga filter, transaksi, dan aturan akses bekerja persis seperti yang sudah ada. Untuk korpus berskala aplikasi, kesederhanaan operasional itu lebih berharga daripada beberapa poin persen recall terakhir yang mungkin ditawarkan mesin khusus.

Motivasi kedua adalah grounding. Model bahasa besar berhalusinasi ketika menjawab hanya dari memori parametriknya. Retrieval-augmented generation membatasi model pada himpunan kandidat yang Anda kendalikan, dan sitasi membuat jawaban dapat diaudit. Vector search adalah separuh retrieval dari kontrak tersebut; tutorial ini memperlakukannya sebagai masalah data terlebih dahulu, baru kemudian masalah prompt.

## Konten Inti

### Mengapa pencarian leksikal menemui batas

Skor bergaya BM25 memberi ganjaran pada tumpang tindih term yang jarang. Ia tidak punya gagasan tentang parafrase, terjemahan, atau sinonimi kecuali Anda memelihara hubungan tersebut secara manual lewat analyzer dan daftar sinonim. Tiga mode kegagalan sering muncul di praktik:

- Ketidakcocokan kosakata: pengguna menulis "timeout", dokumen menulis "pool exhaustion".
- Kueri lintas bahasa: korpus berbahasa Inggris, kueri datang dalam bahasa Indonesia.
- Kueri konseptual: "apa yang harus saya pantau pada sharded cluster" tidak punya satu frasa kanonik di dalam korpus.

Embedding menangani ketiganya karena kueri dan dokumen dibandingkan pada ruang yang dipelajari, bukan melalui irisan token. Namun embedding punya kelemahan sendiri: ia lemah pada identifier persis, kode error, dan nama produk. Asimetri itulah alasan sistem matang menjalankan kedua retriever lalu menggabungkan hasilnya, bukan menggantikan salah satunya.

### Cara kerja Atlas Vector Search

Atlas Vector Search membangun indeks pada field yang memuat array angka. Saat kueri, stage `$vectorSearch` harus menjadi stage pertama dalam pipeline dan mengembalikan dokumen yang dianotasi dengan skor relevansi.

Ada dua jenis field indeks yang penting:

- `vector` (Hierarchical Navigable Small World, atau HNSW): pencarian nearest neighbor aproksimatif. Cepat dan akurat pada skala besar, tetapi ia menelusuri graf, bukan setiap dokumen, sehingga recall sedikit di bawah 100 persen.
- Field `filter`: field skalar atau boolean yang dideklarasikan bersama vektor, sehingga Atlas dapat mengindeksnya dan pre-filter tidak memerlukan pemindaian penuh.

Sifat aproksimatif HNSW adalah model mental paling penting di sini. `numCandidates` mengatur berapa banyak kandidat yang dikumpulkan penelusuran graf sebelum pemeringkatan; nilai lebih besar menukar latensi dengan recall. Nilai `numCandidates` yang terlalu kecil ditambah filter yang ketat adalah penyebab klasik dari "dokumen saya ada tetapi tidak pernah muncul".

### Memilih model embedding dan dimensi

Indeks memiliki jumlah dimensi tetap dan harus cocok dengan model yang menghasilkan vektor Anda. Mengganti model di kemudian hari berarti meng-embed ulang seluruh korpus, jadi perlakukan pilihan ini sebagai keputusan skema:

- Dimensi: kisaran praktis 384 sampai 1536. Vektor lebih besar memakan memori lebih banyak dan memperlambat penelusuran; yang lebih kecil kehilangan nuansa.
- Simetri: sebagian model dilatih untuk kemiripan simetris (dokumen ke dokumen), sebagian lain untuk retrieval asimetris (kueri pendek ke passage panjang). Untuk RAG, model retrieval adalah pilihan yang benar.
- Biaya dan latensi: API terkelola praktis; model self-hosted menjaga data tetap di infrastruktur Anda.
- Normalisasi: jika model mengeluarkan vektor ternormalisasi, cosine dan dot product menghasilkan peringkat identik.

Simpan nama model dan versi embedding di setiap dokumen chunk. Tanpa metadata itu, peng-embed-an ulang sebagian membuat Anda tidak bisa membedakan vektor mana yang sudah kedaluwarsa.

### Merancang indeks vector search

Definisi indeks vector search adalah JSON dengan tiga bagian: field vektor beserta dimensinya, fungsi kemiripan, dan filter field.

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    { "type": "filter", "path": "tenantId" },
    { "type": "filter", "path": "locale" },
    { "type": "filter", "path": "visibility" },
    { "type": "filter", "path": "sourceType" }
  ]
}
```

Setiap field yang Anda filter harus dideklarasikan. Memfilter field yang tidak dideklarasikan bukan error, ia hanya tidak punya dukungan indeks dan berubah menjadi post-filtering yang bisa menguras hasil secara diam-diam.

### Menulis stage `$vectorSearch`

Stage ini menerima vektor kueri, nama indeks, path ke field vektor, ukuran kandidat, dan jumlah hasil.

```javascript
{
  $vectorSearch: {
    index: "chunk_embeddings",
    path: "embedding",
    queryVector: queryEmbedding,
    numCandidates: 200,
    limit: 20,
    filter: { tenantId: "acme", visibility: { $in: ["public", "internal"] } }
  }
}
```

Tiga aturan praktis mengatur penyetelannya:

1. `limit` adalah jumlah yang benar-benar dikembalikan; `numCandidates` adalah jumlah yang ditelusuri graf. Jaga rasio sekitar 10 sampai 20 untuk keseimbangan recall dan latensi yang sehat.
2. Filter diterapkan di dalam pemindaian indeks, sehingga filter yang ketat membutuhkan `numCandidates` lebih besar untuk mengisi `limit` yang sama.
3. Susulkan `$project` atau `$set` setelah `$vectorSearch` untuk membuang embedding mentah dari respons. Mengembalikan 1024 float per hit membuang bandwidth dan membocorkan internal model.

### Strategi chunking untuk dokumen panjang

Meng-embed artikel utuh membuat isinya kabur menjadi rata-rata. Potong dulu, embed setiap chunk, dan simpan pointer ke induknya:

- Targetkan 200 sampai 500 token per chunk dengan overlap 10 sampai 20 persen, agar kalimat yang terpotong di batas tetap muncul utuh di suatu tempat.
- Utamakan batas struktural: heading, item daftar, blok fungsi. Gunakan jendela tetap hanya ketika struktur tidak ada.
- Denormalisasi apa pun yang Anda filter. Simpan `tenantId`, `sourceId`, `locale`, dan `url` pada setiap chunk agar retrieval tidak perlu lookup sebelum memfilter.
- Pastikan teks induk dapat dialamatkan lewat `sourceId` dan ordinal chunk, sehingga sitasi bisa menautkan langsung ke bagian yang tepat.

Keputusan chunking mendominasi kualitas retrieval lebih besar daripada pilihan model embedding. Tim sering berganti model untuk mencari jawaban lebih baik padahal masalah sebenarnya adalah chunk 4000 token yang merata-ratakan lima topik berbeda.

### Retrieval hibrida dan penggabungan peringkat

Retriever leksikal dan semantik gagal ke arah yang berbeda, dan itulah alasan penggabungan keduanya berhasil. Reciprocal rank fusion (RRF) adalah default pragmatis karena tidak memerlukan kalibrasi skor antara dua skala yang tak sebanding:

- Setiap retriever mengembalikan daftar berurutan.
- Skor gabungan sebuah dokumen adalah jumlah atas semua retriever dari satu dibagi konstanta ditambah peringkatnya.
- Konstanta, secara konvensi 60, meredam pengaruh peringkat teratas sehingga satu retriever tidak mendominasi.

MongoDB 8.1 dan setelahnya juga menyediakan `$rankFusion` di aggregation framework yang melakukan penggabungan yang sama di sisi server. Melakukannya di kode aplikasi tetap pilihan wajar ketika retriever Anda berada di sistem berbeda atau ketika Anda ingin memeriksa daftar antara.

### Menyambungkan retrieval ke prompt RAG

Retrieval menghasilkan kandidat; prompt mengubahnya menjadi jawaban. Tiga batasan menjaga prompt tetap jujur:

- Beri nomor pada chunk dan instruksikan model untuk menyitasi identifier chunk, bukan mengarang URL.
- Batasi anggaran konteks secara eksplisit. Sepuluh chunk berisi 400 token berarti 4000 token konteks; lebih banyak belum tentu lebih baik ketika ekornya tidak relevan.
- Wajibkan jawaban eksplisit "konteks tidak memadai". Tanpanya, model mengisi celah dari memori parametrik dan sitasi menjadi hiasan.

Lakukan deduplikasi berdasarkan `sourceId` sebelum menyusun konteks. Lima chunk dari satu dokumen akan menyingkirkan empat dokumen lain dan membuat jawaban bias ke satu sumber.

## Contoh Kode

### Mendefinisikan indeks vector search lewat Atlas Admin API

Buat indeks secara terprogram agar dapat direproduksi di semua environment.

```bash
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${ATLAS_GROUP_ID}/clusters/${CLUSTER_NAME}/search/indexes/${DB_NAME}/${COLLECTION_NAME}" \
  -H "Authorization: Bearer ${ATLAS_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "chunk_embeddings",
    "type": "vectorSearch",
    "definition": {
      "fields": [
        { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" },
        { "type": "filter", "path": "tenantId" },
        { "type": "filter", "path": "locale" },
        { "type": "filter", "path": "visibility" }
      ]
    }
  }'
```

Indeks dibangun secara asinkron. Lakukan polling pada endpoint daftar indeks hingga statusnya `READY`; kueri yang dijalankan saat indeks masih dibangun akan mengembalikan error, bukan hasil kosong.

### Meng-ingest chunk dan menghasilkan embedding

Skrip ini memotong Markdown berdasarkan heading, meng-embed setiap chunk, lalu melakukan upsert dengan kunci deterministik agar pengulangan bersifat idempoten.

```javascript
import { MongoClient } from "mongodb";

const EMBED_MODEL = "voyage-3-large";
const EMBED_VERSION = 1;

function chunkMarkdown(text, maxChars = 1600) {
  const sections = text.split(/\n(?=#{1,3} )/);
  const chunks = [];

  for (const section of sections) {
    if (section.length <= maxChars) {
      chunks.push(section.trim());
      continue;
    }
    const overlap = Math.floor(maxChars * 0.15);
    for (let i = 0; i < section.length; i += maxChars - overlap) {
      chunks.push(section.slice(i, i + maxChars).trim());
    }
  }
  return chunks.filter((chunk) => chunk.length > 80);
}

async function embed(inputs) {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs, input_type: "document" })
  });
  const payload = await response.json();
  return payload.data.map((item) => item.embedding);
}

export async function ingest({ client, tenantId, sourceId, url, text, locale = "id" }) {
  const chunks = chunkMarkdown(text);
  const vectors = await embed(chunks);
  const collection = client.db("docs").collection("chunks");

  const operations = chunks.map((chunk, ordinal) => ({
    updateOne: {
      filter: { _id: `${sourceId}#${ordinal}` },
      update: {
        $set: {
          tenantId,
          sourceId,
          url,
          locale,
          ordinal,
          text: chunk,
          visibility: "internal",
          embedding: vectors[ordinal],
          embedModel: EMBED_MODEL,
          embedVersion: EMBED_VERSION,
          updatedAt: new Date()
        }
      },
      upsert: true
    }
  }));

  return collection.bulkWrite(operations, { ordered: false });
}
```

Perhatikan bahwa `input_type` berbeda antara dokumen dan kueri pada model retrieval asimetris. Meng-embed kueri sebagai dokumen di satu sisi dan passage di sisi lain menurunkan recall secara terukur, dan kegagalannya senyap.

### Mengkueri dengan filter dan ambang skor

```javascript
export async function semanticSearch({ client, tenantId, queryVector, limit = 20 }) {
  const collection = client.db("docs").collection("chunks");
  return collection
    .aggregate([
      {
        $vectorSearch: {
          index: "chunk_embeddings",
          path: "embedding",
          queryVector,
          numCandidates: 200,
          limit,
          filter: { tenantId, visibility: { $in: ["public", "internal"] } }
        }
      },
      {
        $project: {
          _id: 1,
          text: 1,
          url: 1,
          sourceId: 1,
          ordinal: 1,
          score: { $meta: "vectorSearchScore" }
        }
      },
      { $match: { score: { $gte: 0.72 } } },
      { $limit: limit }
    ])
    .toArray();
}
```

Proyeksi `$meta: "vectorSearchScore"` adalah satu-satunya cara membaca skor. Ambang bersifat spesifik per model: kalibrasi pada sampel berlabel daripada menyalin angka dari blog, karena skor cosine 0,72 berarti berbeda untuk model yang berbeda.

### Menggabungkan hasil leksikal dan semantik di kode aplikasi

```javascript
const RRF_K = 60;

function fuseRankings(lists, limit = 10) {
  const scores = new Map();
  const payloads = new Map();

  lists.forEach((list) => {
    list.forEach((doc, index) => {
      const key = doc._id;
      const contribution = 1 / (RRF_K + index + 1);
      scores.set(key, (scores.get(key) ?? 0) + contribution);
      if (!payloads.has(key)) payloads.set(key, doc);
    });
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, score]) => ({ ...payloads.get(key), fusedScore: score }));
}

export async function hybridSearch({ client, tenantId, query, queryVector }) {
  const [semantic, lexical] = await Promise.all([
    semanticSearch({ client, tenantId, queryVector, limit: 40 }),
    client
      .db("docs")
      .collection("chunks")
      .aggregate([
        {
          $search: {
            index: "chunk_lexical",
            compound: {
              must: [{ text: { query, path: "text" } }],
              filter: [{ equals: { path: "tenantId", value: tenantId } }]
            }
          }
        },
        { $limit: 40 },
        { $project: { _id: 1, text: 1, url: 1, sourceId: 1, ordinal: 1 } }
      ])
      .toArray()
  ]);

  return fuseRankings([semantic, lexical]);
}
```

Jalankan kedua retriever secara bersamaan. Menunggu keduanya secara berurutan menggandakan latensi tanpa manfaat, karena keduanya tidak saling bergantung.

### Menyusun prompt ter-grounding dan mengembalikan sitasi

```javascript
import express from "express";

const app = express();
app.use(express.json());

function buildContext(chunks, maxChars = 12000) {
  const seen = new Set();
  const blocks = [];
  let used = 0;

  for (const chunk of chunks) {
    if (seen.has(chunk.sourceId)) continue;
    const block = `[${blocks.length + 1}] source: ${chunk.url}\n${chunk.text}`;
    if (used + block.length > maxChars) break;
    seen.add(chunk.sourceId);
    blocks.push(block);
    used += block.length;
  }
  return blocks;
}

app.post("/answer", async (req, res) => {
  const { query, tenantId } = req.body;
  const queryVector = await embedOne(query);
  const candidates = await hybridSearch({ client, tenantId, query, queryVector });
  const blocks = buildContext(candidates);

  if (blocks.length === 0) {
    return res.json({ answer: "Tidak ada konten terindeks yang cocok dengan pertanyaan ini.", citations: [] });
  }

  const completion = await chat({
    system:
      "Jawab hanya menggunakan sumber bernomor berikut. Sitasi dalam bentuk [n]. " +
      "Jika sumber tidak memuat jawabannya, katakan secara eksplisit.",
    user: `Sumber:\n\n${blocks.join("\n\n")}\n\nPertanyaan: ${query}`
  });

  res.json({
    answer: completion,
    citations: candidates
      .filter((_, index) => index < blocks.length)
      .map((chunk) => ({ url: chunk.url, sourceId: chunk.sourceId, ordinal: chunk.ordinal }))
  });
});

app.listen(3000);
```

Helper `buildContext` melakukan deduplikasi berdasarkan sumber sekaligus menegakkan anggaran karakter, sehingga jumlah token tetap dapat diprediksi ketika korpus tumbuh.

## Insight Penting

- Kualitas retrieval ditentukan saat ingestion: ukuran chunk, overlap, dan denormalisasi filter field lebih menentukan daripada berganti model embedding.
- Deklarasikan setiap field yang difilter di definisi indeks; filter yang tidak dideklarasikan berubah menjadi post-filtering yang menguras hasil tanpa memunculkan error.
- Setel `numCandidates` terhadap himpunan kueri berlabel, jangan menebak. Filter ketat membutuhkan kandidat lebih banyak untuk mencapai `limit` yang sama.
- Hibrida mengalahkan semantik murni pada identifier, kode error, dan nama produk, sementara semantik murni mengalahkan leksikal pada parafrase dan kueri lintas bahasa. Pertahankan keduanya.
- Gabungkan dengan reciprocal rank fusion, bukan penjumlahan skor mentah. Cosine similarity dan BM25 berada pada skala yang tak sebanding, dan penjumlahan naif membuat retriever dengan angka lebih besar mendominasi.
- Beri versi pada setiap embedding. Simpan nama model dan versinya per chunk agar peng-embed-an ulang sebagian dapat dideteksi, bukan merusak recall secara tak terlihat.
- Batasi anggaran konteks dan lakukan deduplikasi berdasarkan sumber, jika tidak satu dokumen yang bertele-tele akan memonopoli prompt dan membiaskan jawaban.
- Jangan pernah menghapus instruksi "konteks tidak memadai" dari system prompt; tanpanya, sitasi menjadi hiasan di atas prosa halusinasi.

## Langkah Berikutnya

- Evaluasi kualitas retrieval dengan himpunan kueri berlabel dan ukur recall pada 10 untuk masing-masing retriever serta untuk hasil gabungannya.
- Tambahkan job peng-embed-an ulang otomatis yang dikunci pada `embedVersion` agar upgrade model bergulir bertahap, bukan sebagai penulisan ulang berisiko sekaligus.
- Pelajari `$rankFusion` pada MongoDB 8.1 dan setelahnya untuk memindahkan penggabungan ke sisi server dan memperkecil payload aplikasi.
- Dalami materi analyzer Atlas Search untuk mempertajam separuh leksikal dari pipeline hibrida.
- Baca tutorial MongoDB Text Search and Atlas Search di repositori ini untuk retriever leksikal secara mendalam, serta silabus advanced MongoDB untuk jalur data engineering yang lebih luas.

## Kesimpulan

Atlas Vector Search mengubah MongoDB menjadi lapisan retrieval yang layak dipakai tanpa menghadirkan database kedua: embedding hidup berdampingan dengan dokumen yang digambarkannya, filter memakai ulang model keamanan yang sudah Anda miliki, dan `$vectorSearch` berkomposisi dengan aggregation framework yang sudah Anda kenal. Bagian yang menentukan apakah fitur terasa cerdas justru kurang bergengsi dibanding pilihan model: batas chunk, filter field yang dideklarasikan, kandidat yang terkalibrasi, dan peringkat gabungan yang mempertahankan presisi leksikal bersama recall semantik. Bangun retrieval lebih dulu, ukur terhadap pertanyaan nyata, dan baru setelah itu biarkan lapisan prompt mengambil kredit atas hasilnya.
