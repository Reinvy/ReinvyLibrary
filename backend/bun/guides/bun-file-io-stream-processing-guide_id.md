---
title: "Panduan I/O Berkas dan Pemrosesan Stream dengan Bun"
description: "Panduan komprehensif mengenai API I/O berkas native Bun dan kemampuan pemrosesan stream — mencakup pembacaan dan penulisan berkas yang efisien, streaming data melalui pipeline, integrasi perintah shell, dan pola pemrosesan berkas tingkat produksi."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan I/O Berkas dan Pemrosesan Stream dengan Bun

## Pendahuluan

Bun menyediakan sekumpulan API sistem berkas dan pemrosesan stream modern berperforma tinggi yang secara signifikan lebih cepat dibandingkan ekivalen Node.js. Dibangun di atas mesin JavaScriptCore dan memanfaatkan panggilan sistem native seperti `copy_file_range` dan `sendfile`, operasi I/O Bun menghindari penyalinan data yang tidak perlu antara kernel dan ruang pengguna. Panduan ini mencakup pola siap-produksi untuk membaca dan menulis berkas, melakukan streaming data, mengintegrasikan perintah shell dengan `Bun.$`, dan membangun pipeline pemrosesan data yang efisien — semuanya menggunakan API native Bun.

## Praktik Terbaik

- **Utamakan `Bun.file()` dibanding `fs.readFile()`** — `Bun.file()` mengembalikan objek `BunFile` yang membaca metadata secara lazy tanpa blocking. Objek ini mendukung metode `text()`, `json()`, `arrayBuffer()`, `stream()`, dan `bytes()`, masing-masing dioptimalkan untuk format data tertentu. Tidak seperti `fs.readFile` Node.js yang mem-buffer seluruh file ke memori, `Bun.file()` dapat melakukan streaming data langsung dari disk.

- **Gunakan `Bun.write()` untuk penulisan berkas yang efisien** — `Bun.write()` secara otomatis memilih strategi penulisan tercepat berdasarkan tujuan output (path berkas, file descriptor, `BunFile`, `S3File`, atau `Response`). Fungsi ini menerima string, `Uint8Array`, `Blob`, `Response`, dan `BunFile` sebagai input, menghilangkan kebutuhan serialisasi manual pada sebagian besar kasus.

- **Manfaatkan `Bun.file().stream()` untuk pemrosesan berkas besar** — Saat bekerja dengan berkas yang lebih besar dari memori yang tersedia, gunakan API streaming untuk memproses data dalam potongan (chunks). Stream Bun mengimplementasikan Web Streams API (`ReadableStream`, `WritableStream`, `TransformStream`), membuatnya kompatibel dengan pola stream standar browser sambil berjalan pada kecepatan native.

- **Gunakan `Bun.$` untuk operasi berkas tingkat shell** — Fungsi template tag Bun `Bun.$` menjalankan perintah shell langsung dari TypeScript/JavaScript tanpa memunculkan proses child pada sebagian besar kasus. Fungsi ini mendukung piping, `Bun.file()` sebagai stdin/stdout, dan konversi string-ke-Buffer otomatis, sehingga ideal untuk operasi perekat seperti `grep`, `sed`, `awk`, dan komposisi pipeline.

- **Stream unggahan multipart langsung dari disk** — Saat melayani berkas besar melalui HTTP, berikan `BunFile` langsung sebagai body dari objek `Response`. Bun secara otomatis menggunakan panggilan sistem `sendfile` untuk melakukan streaming konten berkas dengan efisiensi zero-copy, menghindari overhead memori karena membaca seluruh berkas ke dalam buffer.

- **Proses data terstruktur dengan `Bun.file().json()` dan `Bun.file().text()`** — Untuk berkas konfigurasi, dataset JSON, dan format berbasis teks, gunakan metode pembaca bertipe pada `BunFile`. Metode-metode ini mengembalikan nilai `Promise` yang diselesaikan dengan konten yang telah diurai, terintegrasi secara alami dengan dukungan async/await kelas satu Bun.

- **Pipeline perintah shell dengan komposisi `Bun.$`** — Rantai beberapa pemanggilan `Bun.$` dengan melewatkan `stdout` dari satu perintah sebagai `stdin` perintah lainnya. Ini menciptakan pipeline gaya Unix yang efisien sepenuhnya dalam JavaScript, tanpa overhead berkas perantara atau manajemen buffer manual.

- **Tangani data biner dengan `Uint8Array` dan `Buffer`** — Meskipun Bun lebih mengutamakan `Uint8Array` untuk data biner, Bun tetap mempertahankan kompatibilitas dengan `Buffer` Node.js. Untuk performa maksimal dengan API native Bun, gunakan `Uint8Array` secara langsung — metode berkas Bun secara native mengembalikan dan menerima typed array tanpa overhead konversi.

- **Pantau perubahan sistem berkas dengan `Bun.file()` dan polling** — Bun belum menyertakan file watcher bawaan, tetapi Anda dapat melakukan polling metadata berkas secara efisien menggunakan `Bun.file().lastModified` dan `Bun.file().size`. Untuk pemantauan berkas lintas platform, pertimbangkan menggabungkan `fs.watch` (dari kompatibilitas Node.js) dengan `Bun.file()` untuk I/O yang sebenarnya.

- **Gunakan `Bun.write()` dengan `Response` untuk caching HTTP** — Saat mengambil sumber daya jarak jauh, berikan objek `Response` langsung ke `Bun.write()` untuk menyimpan body respons ke disk. Bun melakukan streaming data respons melalui klien HTTP native langsung ke sistem berkas tanpa mem-buffer seluruh payload di memori.

## Langkah Implementasi

### Langkah 1: Membaca Berkas dengan `Bun.file()`

Fungsi `Bun.file()` membuat referensi `BunFile` tanpa langsung membaca berkas ke memori. Evaluasi lazy ini memungkinkan Anda memeriksa metadata berkas sebelum memutuskan cara membaca konten.

```typescript
import { BunFile } from "bun";

// Membuat referensi BunFile (lazy — belum ada I/O disk)
const file: BunFile = Bun.file("./data/config.json");

// Membaca metadata tanpa memuat konten
console.log("Ukuran:", file.size, "byte");
console.log("Tipe:", file.type);         // MIME type
console.log("Diubah:", file.lastModified); // Timestamp Unix

// Membaca konten menggunakan metode bertipe
const config = await file.json();
console.log("Konfigurasi:", config);

// Strategi pembacaan alternatif:
const text = await Bun.file("./data/readme.txt").text();
const buffer = await Bun.file("./data/image.png").arrayBuffer();
const raw = await Bun.file("./data/data.bin").bytes();
```

Untuk berkas besar yang melebihi memori yang tersedia, selalu gunakan API streaming:

```typescript
const stream = Bun.file("./data/large-dataset.csv").stream();
const reader = stream.getReader();
const decoder = new TextDecoder();
let headerRow = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  headerRow += decoder.decode(value, { stream: true });
  // Memproses potongan secara inkremental
  const lines = headerRow.split("\n");
  headerRow = lines.pop() || ""; // Menyimpan baris tidak lengkap untuk potongan berikutnya
  for (const line of lines) {
    processRow(line);
  }
}
```

### Langkah 2: Menulis Berkas dengan `Bun.write()`

`Bun.write()` menyediakan antarmuka terpadu untuk menulis data ke berbagai tujuan. Fungsi ini secara otomatis memilih strategi penulisan optimal berdasarkan tipe tujuan.

```typescript
import { BunFile } from "bun";

// Menulis string ke berkas
await Bun.write("./output/hello.txt", "Halo, Bun!");

// Menulis data JSON (otomatis diserialisasi melalui BunFile)
const data = { user: "bun", version: 1, features: ["file", "stream", "shell"] };
await Bun.write("./output/data.json", JSON.stringify(data, null, 2));

// Menulis Blob atau Uint8Array ke disk
const blob = new Blob(["<html><body>Bun</body></html>"], { type: "text/html" });
await Bun.write("./output/page.html", blob);

// Menulis ke file descriptor
const fd = Bun.file("./output/log.txt");
await Bun.write(fd, "Entri log yang ditambahkan\n");

// Salin berkas efisien menggunakan panggilan sistem copy_file_range
await Bun.write(Bun.file("./backup/config.json"), Bun.file("./data/config.json"));
```

Untuk menambahkan ke berkas yang sudah ada tanpa menimpa:

```typescript
import { open } from "node:fs/promises";

// Membuka berkas dalam mode append menggunakan API kompatibilitas Node.js
const fileHandle = await open("./output/app.log", "a");
await fileHandle.writeFile("[INFO] Aplikasi dimulai\n");
await fileHandle.close();

// Atau gunakan Bun.file() dengan baca-lalu-tulis eksplisit untuk berkas kecil
const existing = await Bun.file("./output/counter.txt").text().catch(() => "0");
const count = parseInt(existing, 10) + 1;
await Bun.write("./output/counter.txt", String(count));
```

### Langkah 3: Membangun Pipeline Pemrosesan Stream

Bun mengimplementasikan Web Streams API secara native, memungkinkan pipeline stream yang dapat dikomposisi tanpa dependensi eksternal.

```typescript
// Membuat transform stream untuk pemrosesan baris per baris
const lineSplitter = new TransformStream<string, string>({
  transform(chunk, controller) {
    // Menyimpan buffer baris parsial antar potongan
    this.buffer = (this.buffer || "") + chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || ""; // Menyimpan baris terakhir yang tidak lengkap
    for (const line of lines) {
      controller.enqueue(line);
    }
  },
  flush(controller) {
    if (this.buffer) controller.enqueue(this.buffer);
  },
});

// Mengalirkan berkas melalui pipeline pemrosesan
async function processLogFile(inputPath: string, outputPath: string) {
  const source = Bun.file(inputPath).stream();
  const sink = new WritableStream<string>({
    async write(line) {
      const parsed = parseLogLine(line);
      if (parsed.level === "ERROR") {
        await Bun.write(
          Bun.file("./output/errors.log"),
          JSON.stringify(parsed) + "\n",
        );
      }
    },
  });

  await source
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(lineSplitter)
    .pipeTo(sink);
}
```

Untuk streaming array JSON — memproses elemen array JSON besar satu per satu tanpa memuat seluruh array ke memori:

```typescript
async function* streamJsonArray(filePath: string) {
  const stream = Bun.file(filePath).stream();
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let depth = 0;
  let elementStart = -1;

  while (true) {
    const { done, value } = await reader.read();
    if (done && buffer.length === 0) break;

    buffer += value || "";

    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];
      if (char === "{" && depth === 1 && elementStart === -1) {
        elementStart = i;
      }
      if (char === "{") depth++;
      if (char === "}") depth--;
      if (depth === 1 && char === "}" && elementStart !== -1) {
        yield JSON.parse(buffer.slice(elementStart, i + 1));
        elementStart = -1;
      }
    }

    // Menyimpan hanya bagian yang belum diproses
    buffer = elementStart !== -1 ? buffer.slice(elementStart) : "";
    if (elementStart !== -1) {
      elementStart = 0; // Reset relatif terhadap awal buffer baru
    }
  }
}

// Penggunaan
for await (const item of streamJsonArray("./data/large-array.json")) {
  console.log("Item:", item);
}
```

### Langkah 4: Mengintegrasikan Perintah Shell dengan `Bun.$`

Template tag `Bun.$` Bun menyediakan integrasi shell tanpa memunculkan proses child, menggunakan panggilan sistem native untuk perintah umum.

```typescript
import { $ } from "bun";

// Menjalankan perintah shell sederhana
const result = await $`echo "Halo dari Bun"`;
console.log(result.stdout.toString()); // "Halo dari Bun\n"
console.log(result.exitCode);          // 0

// Melewatkan BunFile sebagai stdin
const input = Bun.file("./data/input.csv");
const grepResult = await $`grep "ERROR" ${input}`;
console.log("Baris yang cocok:", grepResult.stdout.toString());

// Menangkap stdout sebagai output BunFile
await $`ls -la ./data`.stdout(Bun.file("./output/file-list.txt"));

// Membangun pipeline multi-perintah
const pipeline = await $`
  cat ${Bun.file("./data/access.log")} |
  grep "500" |
  awk '{print $1, $7}' |
  sort | uniq -c | sort -rn |
  head -10
`;
console.log("Top 5 endpoint error 500:\n", pipeline.stdout.toString());

// Mengalirkan data antar proses Bun.$
const process1 = $`cat ./data/large-file.csv`;
const process2 = $`wc -l`;
// Ini menghitung baris menggunakan pipe antara kedua proses
const lineCount = await $`${process1} | ${process2}`;
console.log("Baris:", parseInt(lineCount.stdout.toString(), 10));

// Menangani kegagalan perintah shell dengan error bertipe
try {
  await $`cat ./nonexistent-file.txt`;
} catch (err: any) {
  console.error("Perintah shell gagal:", err.stderr?.toString());
  console.error("Kode keluar:", err.exitCode);
}
```

### Langkah 5: Melayani Berkas Melalui HTTP dengan Streaming Zero-Copy

Server HTTP Bun dapat melakukan streaming berkas langsung dari disk menggunakan panggilan sistem `sendfile`, mencapai overhead memori mendekati nol untuk penyajian berkas.

```typescript
const server = Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url);
    const filePath = `./public${url.pathname}`;

    // Mencoba menyajikan berkas
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      return new Response("Tidak Ditemukan", { status: 404 });
    }

    // Mengembalikan BunFile langsung — Bun melakukan streaming via sendfile
    return new Response(file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": String(file.size),
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
});

console.log(`Server berjalan di http://localhost:${server.port}`);
```

Untuk streaming respons besar yang dibuat secara dinamis (misalnya, ekspor CSV):

```typescript
async function* generateCSV() {
  yield "id,nama,email\n";
  for (let i = 1; i <= 100_000; i++) {
    yield `${i},user${i}@example.com,user${i}@example.com\n`;
    // Menyerahkan kontrol secara periodik untuk penjadwalan yang adil
    if (i % 1000 === 0) await Bun.sleep(0);
  }
}

Bun.serve({
  port: 3001,
  fetch() {
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of generateCSV()) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=export.csv",
      },
    });
  },
});
```

### Langkah 6: Memproses Unggahan Berkas Multipart

Bun menangani unggahan berkas secara efisien dengan melakukan streaming data multipart langsung ke disk tanpa mem-buffer seluruh payload di memori.

```typescript
const server = Bun.serve({
  port: 3002,
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("Metode tidak diizinkan", { status: 405 });
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response("Diharapkan multipart/form-data", { status: 400 });
    }

    const formData = await request.formData();
    const uploadDir = "./uploads";
    const results: string[] = [];

    // Memastikan direktori uploads ada
    await $`mkdir -p ${uploadDir}`;

    for (const [fieldName, value] of formData.entries()) {
      if (value instanceof File) {
        const filePath = `${uploadDir}/${value.name}`;
        // Menulis langsung dari objek File ke disk
        await Bun.write(filePath, value);
        results.push(`Tersimpan ${value.name} (${value.size} byte) ke ${filePath}`);
      }
    }

    return new Response(results.join("\n"), { status: 200 });
  },
});
```

### Langkah 7: Mengimplementasikan Utilitas Rotasi Log

Gabungkan I/O berkas, stream, dan perintah shell untuk membangun utilitas rotasi log tingkat produksi.

```typescript
async function rotateLog(
  logPath: string,
  maxSizeMB: number = 100,
  maxBackups: number = 5,
) {
  const logFile = Bun.file(logPath);
  const size = logFile.size;
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (size < maxBytes) {
    console.log(`Berkas log (${(size / 1024 / 1024).toFixed(1)}MB) di bawah batas`);
    return;
  }

  console.log(`Memutar ${logPath} (${(size / 1024 / 1024).toFixed(1)}MB)`);

  // Menggeser cadangan yang ada: hapus yang terlama
  const oldestBackup = `${logPath}.${maxBackups}`;
  if (await Bun.file(oldestBackup).exists()) {
    await $`rm ${oldestBackup}`;
  }

  // Mengganti nama cadangan: .4→.5, .3→.4, dst.
  for (let i = maxBackups - 1; i >= 1; i--) {
    const oldName = `${logPath}.${i}`;
    const newName = `${logPath}.${i + 1}`;
    if (await Bun.file(oldName).exists()) {
      await $`mv ${oldName} ${newName}`;
    }
  }

  // Mengganti nama log saat ini menjadi .1
  await $`mv ${logPath} ${logPath}.1`;

  // Mengompresi log yang sudah diputar di latar belakang
  $`gzip ${logPath}.1`.then(() => {
    console.log(`Terkompresi ${logPath}.1.gz`);
  });

  // Memberi sinyal ke aplikasi untuk membuka ulang handle log
  console.log(`Rotasi selesai. Dibuat ${logPath}.1`);
  console.log("Kirim SIGHUP ke proses yang berjalan untuk membuka ulang handle log.");
}
```

### Langkah 8: Membangun Skrip Sinkronisasi Direktori

Gunakan I/O berkas dan integrasi shell Bun untuk membangun alat sinkronisasi direktori yang cepat.

```typescript
async function syncDirectories(source: string, dest: string) {
  await $`mkdir -p ${dest}`;

  // Mendaftar berkas menggunakan shell
  const result = await $`find ${source} -type f`.quiet();
  const files = result.stdout.toString().trim().split("\n").filter(Boolean);

  for (const file of files) {
    const relativePath = file.replace(source, "").replace(/^\//, "");
    const destPath = `${dest}/${relativePath}`;
    const destDir = destPath.substring(0, destPath.lastIndexOf("/"));

    // Memastikan direktori tujuan ada
    await $`mkdir -p ${destDir}`;

    // Membandingkan waktu modifikasi
    const sourceStat = Bun.file(file);
    const destStat = Bun.file(destPath);

    const sourceMtime = sourceStat.lastModified;
    const destMtime = destStat.lastModified;

    if (!sourceMtime) {
      console.log(`Melewati ${file}: tidak dapat membaca sumber`);
      continue;
    }

    if (!destMtime || sourceMtime > destMtime) {
      await Bun.write(destPath, sourceStat);
      console.log(`Tersinkronisasi: ${relativePath}`);
    }
  }

  console.log(`Sinkronisasi selesai: ${files.length} berkas diperiksa`);
}

// Penggunaan
await syncDirectories("./src", "./dist/backup");
```

## Insight Penting

- **`Bun.file()` bersifat lazy** — Properti metadata seperti `size` dan `lastModified` di-cache setelah pembacaan pertama. Untuk menyegarkan metadata, buat instance `BunFile` baru.
- **Penyajian berkas zero-copy** — Melewatkan `BunFile` sebagai body dari `Response` mengaktifkan panggilan sistem `sendfile`, yang menyalin data langsung dari sistem berkas ke soket jaringan tanpa melalui memori ruang pengguna.
- **`Bun.write()` mendeteksi tipe tujuan secara otomatis** — Saat menulis ke path berkas (string), ia menggunakan panggilan sistem `write`. Saat menulis ke `BunFile`, ia menggunakan `copy_file_range` untuk salinan berkas-ke-berkas yang efisien. Saat menulis ke `Response`, ia melakukan streaming data.
- **Injeksi shell tidak di-escape secara otomatis** — `Bun.$` melewatkan argumen sebagai parameter posisional ke shell, yang berarti interpolasi variabel mengikuti semantik shell. Selalu validasi atau sanitasi input pengguna sebelum melewatkannya ke `Bun.$`.
- **Backpressure stream bersifat otomatis** — Implementasi Web Streams Bun menangani backpressure secara native. Ketika `ReadableStream` dialirkan ke konsumen yang lambat, Bun secara otomatis menjeda pembacaan dari sumber hingga konsumen siap untuk lebih banyak data.
- **Pertimbangan berkas besar** — Untuk berkas yang lebih besar dari 500MB, selalu gunakan `.stream()` daripada `.text()` atau `.json()`. Metode bertipe memuat seluruh berkas ke memori, yang dapat menyebabkan error kehabisan memori pada sistem dengan sumber daya terbatas.

## Langkah Berikutnya

Setelah menguasai I/O berkas dan pemrosesan stream Bun, jelajahi topik terkait berikut:

- Pola WebSocket Bun untuk streaming data real-time
- Integrasi SQLite Bun untuk penyimpanan data persisten
- `Bun.build()` untuk bundling produksi dan pemrosesan aset
- Bun test runner untuk menguji pipeline pemrosesan berkas
- Lapisan kompatibilitas Node.js untuk migrasi aplikasi pemrosesan berkas yang sudah ada

## Kesimpulan

Panduan ini mencakup kemampuan I/O berkas dan pemrosesan stream native Bun, dari pembacaan dan penulisan berkas dasar dengan `Bun.file()` dan `Bun.write()` hingga pola lanjutan seperti penyajian berkas HTTP zero-copy, integrasi perintah shell dengan `Bun.$`, streaming array JSON, dan rotasi log tingkat produksi. API berkas Bun yang efisien — dibangun di atas panggilan sistem native seperti `sendfile` dan `copy_file_range` — memungkinkan pengembang untuk membangun pipeline pemrosesan data berperforma tinggi dengan kode yang lebih bersih dan lebih idiomatis dibandingkan pendekatan tradisional Node.js.
