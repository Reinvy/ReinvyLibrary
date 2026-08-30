---
title: "Membangun Alat Command-Line dengan Bun"
description: "Tutorial berbasis proyek untuk membangun task tracker CLI yang siap produksi menggunakan API bawaan Bun — eksekusi shebang, parsing Bun.argv, prompt stdin interaktif, persistensi JSON dengan Bun.file, spawning subproses dengan Bun.spawn, dan kompilasi menjadi executable mandiri dengan bun build --compile."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Alat Command-Line dengan Bun

## Ringkasan

Dalam tutorial berbasis proyek ini, Anda akan membangun **task tracker CLI** yang berfungsi penuh hanya dengan API bawaan Bun — tanpa `commander`, tanpa `yargs`, tanpa `prompts`, tanpa `pkg`. Anda akan belajar menulis skrip yang dapat dieksekusi dengan shebang `#!/usr/bin/env bun`, mem-parsing argumen dengan `Bun.argv`, membaca input interaktif dari stdin, menyimpan data dengan `Bun.file()` dan penulisan atomik, memunculkan subproses dengan `Bun.spawn()`, menangani `Ctrl+C` dengan baik, serta mengompilasi semuanya menjadi satu executable mandiri dengan `bun build --compile`.

## Target Audiens

- Pengembang backend dan pengembang TypeScript yang ingin membuat alat command-line yang cepat dan bebas dependensi.
- Pengembang yang sudah familiar dengan Bun dan ingin mengeksplorasi kemampuan scripting serta kompilasi biner.
- Pengembang level menengah yang nyaman dengan JavaScript asinkron dan I/O file.

## Prasyarat

- Bun terinstal di sistem Anda (lihat tutorial [Getting Started with Bun](/backend/bun/tutorials/getting-started-with-bun)).
- Pengetahuan dasar TypeScript atau JavaScript (ES modules, `async`/`await`, destructuring).
- Nyaman menggunakan terminal: menjalankan perintah, mengatur izin file, dan membaca output error.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menulis skrip Bun yang dapat dieksekusi menggunakan shebang `#!/usr/bin/env bun` dan `chmod +x`.
- Mem-parsing argumen posisional dan flag dari `Bun.argv` tanpa library eksternal.
- Membaca input interaktif dari stdin dengan `Bun.stdin` dan loop `for await`.
- Menyimpan state CLI menggunakan `Bun.file()` dan penulisan berbasis rename atomik.
- Menjalankan dan menunggu subproses dengan `Bun.spawn()` dan `exited`.
- Menangani sinyal interupsi dan menetapkan exit code proses yang bermakna.
- Mengompilasi CLI menjadi executable mandiri dengan `bun build --compile`.
- Menerbitkan CLI Bun ke registry npm dengan entri `bin` yang tepat.

## Konteks dan Motivasi

Alat command-line adalah tulang punggung alur kerja pengembang — membuat scaffold proyek, mengotomatisasi deployment, mengelola data, dan merekatkan pipeline. Selama bertahun-tahun, menulis CLI yang serius di ekosistem Node.js berarti menarik banyak dependensi: `commander` atau `yargs` untuk parsing argumen, `prompts` atau `inquirer` untuk input interaktif, `chalk` untuk warna, dan `pkg` atau `nexe` untuk menghasilkan biner mandiri. Setiap dependensi menambah waktu instalasi, permukaan audit, dan perubahan versi yang silih berganti.

Bun meruntuhkan tumpukan ini. Runtime-nya sudah dilengkapi akses argumen (`Bun.argv`), API stream dupleks penuh (`Bun.stdin`), abstraksi file cepat (`Bun.file`), pengelola subproses (`Bun.spawn`), helper sinyal (`Bun.signal`), dan bundler yang dapat menghasilkan executable mandiri (`bun build --compile`). Karena Bun menyala dalam hitungan milidetik — didukung JavaScriptCore, bukan V8 — bahkan skrip sederhana pun terasa responsif, dan ini penting untuk alat yang dipanggil puluhan kali sehari.

Dalam tutorial ini Anda akan menerapkan API-API tersebut pada produk yang realistis: task tracker yang dapat menambah, menampilkan, menyelesaikan, dan menghapus tugas, mendukung konfirmasi interaktif, membuka detail tugas di `$EDITOR`, serta didistribusikan baik sebagai paket npm maupun sebagai satu biner terkompilasi. Pola-pola ini berlaku langsung ke alat dunia nyata: skrip rilis, seeder database, generator kode, dan utilitas deployment.

## Konten Inti

### Anatomi skrip CLI Bun

Skrip CLI Bun adalah file TypeScript biasa dengan satu tambahan ajaib — baris shebang di baris paling pertama:

```typescript
#!/usr/bin/env bun

console.log("Hello from a Bun CLI!");
```

Shebang memberi tahu sistem operasi interpreter mana yang akan digunakan saat file dieksekusi langsung. `env bun` menyelesaikan eksekusi `bun` dari `PATH`, sehingga skrip tetap portabel antar mesin.

Untuk menjalankan skrip secara langsung, tandai sebagai executable dan panggil melalui path:

```bash
chmod +x hello.ts
./hello.ts
```

Anda juga dapat menjalankannya secara eksplisit dengan `bun`:

```bash
bun hello.ts
```

Bun mengompilasi TypeScript dan JSX dengan cepat, jadi tidak ada langkah build untuk pengembangan — Anda edit, simpan, dan jalankan.

### Membaca argumen dengan Bun.argv

Di dalam skrip Bun, `Bun.argv` berisi argumen command-line:

```text
Bun.argv[0] -> path ke biner bun
Bun.argv[1] -> path ke skrip yang dieksekusi
Bun.argv[2] -> argumen pengguna pertama
Bun.argv[3] -> argumen pengguna kedua
...
```

Indeks ini adalah sumber umum kesalahan off-by-one. Helper yang melewati dua entri pertama membuat kode selanjutnya lebih jelas:

```typescript
function userArgs(): string[] {
  return Bun.argv.slice(2);
}
```

Untuk task tracker, Anda akan mendefinisikan perintah sederhana yang dapat diprediksi: `add`, `list`, `done`, `delete`, `open`, dan `help`. Dispatcher kecil merutekan argumen pertama ke handler yang tepat:

```typescript
const args = userArgs();
const command = args[0] ?? "help";

switch (command) {
  case "add":
    await addTask(args.slice(1));
    break;
  case "list":
    await listTasks(args.slice(1));
    break;
  case "done":
    await markDone(args.slice(1));
    break;
  ...
  default:
    printHelp();
}
```

### Menyiapkan proyek task-tracker

Buat direktori proyek dan inisialisasi:

```bash
mkdir bun-task-tracker
cd bun-task-tracker
bun init -y
```

Flag `-y` menghasilkan `package.json` dan `tsconfig.json` minimal. Struktur akhirnya terlihat seperti ini:

```text
bun-task-tracker/
├── package.json
├── tsconfig.json
└── src/
    ├── storage.ts      # helper load/save JSON
    ├── prompts.ts      # helper stdin interaktif
    └── cli.ts          # parsing argumen + handler perintah
```

Tambahkan entri `bin` ke `package.json` agar CLI dapat diinstal secara global dan ditautkan sebagai executable. Beri juga `name` berupa nama paket asli dan tambahkan versi:

```json
{
  "name": "task-tracker-bun",
  "version": "1.0.0",
  "module": "src/cli.ts",
  "bin": {
    "task-tracker": "src/cli.ts"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

Saat npm menginstal paket dengan entri `bin`, npm membuat symlink di folder `node_modules/.bin` global. Karena file target membawa shebang `#!/usr/bin/env bun`, perintah tertaut langsung menjalankan Bun.

### Mendefinisikan model tugas

Setiap tugas adalah objek polos dengan bentuk yang stabil agar penyimpanan JSON tetap dapat diprediksi:

```typescript
interface Task {
  id: number;
  description: string;
  createdAt: string;
  completedAt: string | null;
  done: boolean;
}
```

`id` adalah angka yang meningkat secara monoton, diturunkan dari id tertinggi yang ada ditambah satu. `createdAt` dan `completedAt` menggunakan string ISO-8601 dari `new Date().toISOString()` — selalu simpan timestamp UTC dan format hanya pada saat ditampilkan.

### Membangun modul penyimpanan JSON

Lapisan penyimpanan adalah tulang punggung CLI: memuat daftar tugas dari disk, mengubahnya di memori, lalu menulisnya kembali. `Bun.file()` dari Bun memberi Anda handle file lazy dengan helper `json()` bawaan:

```typescript
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const DATA_DIR = join(homedir(), ".task-tracker");
const DATA_FILE = join(DATA_DIR, "tasks.json");

export async function loadTasks(): Promise<Task[]> {
  const file = Bun.file(DATA_FILE);
  if (!(await file.exists())) {
    return [];
  }
  return (await file.json()) as Task[];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  await Bun.write(DATA_FILE, JSON.stringify(tasks, null, 2));
}
```

Menyimpan data di direktori home pengguna (dengan folder berawalan titik) mengikuti konvensi XDG untuk konfigurasi level pengguna dan menjaga CLI tetap dapat digunakan dari direktori kerja mana pun.

### Menulis secara atomik dengan file sementara

`Bun.write` naif ke tujuan dapat meninggalkan file terpotong jika proses crash di tengah penulisan. Perbaikan standar adalah urutan tulis-ke-temp-lalu-rename. Rename bersifat atomik pada filesystem POSIX, sehingga pembaca selalu melihat file lama atau file baru yang lengkap:

```typescript
import { renameSync } from "node:fs";

export async function saveTasks(tasks: Task[]): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = join(DATA_DIR, `tasks.json.tmp-${process.pid}`);
  await Bun.write(tmpFile, JSON.stringify(tasks, null, 2));
  renameSync(tmpFile, DATA_FILE);
}
```

Menyertakan `process.pid` pada nama sementara menghindari tabrakan antara pemanggilan CLI yang berjalan bersamaan.

### Menambah tugas

Handler `add` membaca deskripsi dari argumen yang tersisa, membangun `Task`, menambahkannya, dan menyimpan:

```typescript
async function addTask(args: string[]): Promise<void> {
  const description = args.join(" ").trim();
  if (!description) {
    console.error("Usage: task-tracker add <description>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;

  tasks.push({
    id: nextId,
    description,
    createdAt: new Date().toISOString(),
    completedAt: null,
    done: false,
  });

  await saveTasks(tasks);
  console.log(`Added task #${nextId}: ${description}`);
}
```

Perhatikan penggunaan `process.exitCode`, bukan `process.exit()`. Menetapkan exit code memungkinkan skrip berakhir secara alami — penulisan yang tertunda dan flush stream selesai sebelum proses berakhir.

### Menampilkan tugas dengan format rapi

Handler `list` mengurutkan tugas terbuka terlebih dahulu, lalu berdasarkan id, dan mencetak tabel ringkas menggunakan `padEnd` untuk perataan kolom:

```typescript
async function listTasks(args: string[]): Promise<void> {
  const tasks = await loadTasks();
  if (tasks.length === 0) {
    console.log("No tasks yet. Add one with: task-tracker add <description>");
    return;
  }

  const showAll = args.includes("--all");
  const visible = showAll ? tasks : tasks.filter((t) => !t.done);

  for (const task of visible) {
    const status = task.done ? "[x]" : "[ ]";
    console.log(
      `${String(task.id).padStart(3)} ${status} ${task.description}`,
    );
  }

  const doneCount = tasks.filter((t) => t.done).length;
  console.log(`\n${tasks.length - doneCount} open, ${doneCount} done`);
}
```

Menggunakan `padStart` alih-alih spasi keras menjaga kolom tetap rata bahkan ketika id tugas tumbuh melewati sembilan.

### Menyelesaikan dan menghapus tugas

Menandai tugas sebagai selesai memperbarui flag-nya dan menyimpan perubahannya:

```typescript
async function markDone(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker done <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  task.done = true;
  task.completedAt = new Date().toISOString();
  await saveTasks(tasks);
  console.log(`Completed task #${id}`);
}
```

Menghapus adalah operasi destruktif, jadi ia meminta konfirmasi sebelum menyentuh file — helper prompt interaktif akan dijelaskan berikutnya.

### Membaca input interaktif dari stdin

Untuk prompt konfirmasi, baca satu baris dari `Bun.stdin`. Loop `for await` menghasilkan setiap chunk; kumpulkan chunk hingga newline tiba:

```typescript
async function readLine(promptText: string): Promise<string> {
  Bun.stdout.write(promptText);

  let input = "";
  for await (const chunk of Bun.stdin.stream()) {
    const text = new TextDecoder().decode(chunk);
    input += text;
    if (input.includes("\n")) {
      break;
    }
  }

  return input.trim();
}

async function confirm(message: string): Promise<boolean> {
  const answer = (await readLine(`${message} [y/N] `)).toLowerCase();
  return answer === "y" || answer === "yes";
}
```

Perilaku default-pada-`N` melindungi pengguna: menekan Enter saja menjawab "tidak", yang merupakan pilihan aman untuk tindakan destruktif.

### Menghubungkan konfirmasi ke penghapusan

Dengan helper yang sudah ada, handler delete menjadi:

```typescript
async function deleteTask(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker delete <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  if (!(await confirm(`Delete task #${id} ("${task.description}")?`))) {
    console.log("Aborted");
    return;
  }

  await saveTasks(tasks.filter((t) => t.id !== id));
  console.log(`Deleted task #${id}`);
}
```

### Membuka tugas di editor dengan Bun.spawn

Fitur daya yang praktis: membuka detail tugas di editor pilihan pengguna. `Bun.spawn` memulai subproses tanpa memblokir; menunggu `exited` menanti hingga selesai:

```typescript
import { Bun } from "bun";

async function openTask(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker open <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  // Tulis file sementara dengan detail terkini
  const scratch = join(DATA_DIR, `task-${id}.md`);
  const content = [
    `# Task #${id}`,
    "",
    task.description,
    "",
    `Created: ${task.createdAt}`,
    `Completed: ${task.completedAt ?? "not yet"}`,
  ].join("\n");
  await Bun.write(scratch, content);

  const editor = process.env.EDITOR ?? "vi";
  const proc = Bun.spawn([editor, scratch], {
    stdout: "inherit",
    stdin: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}
```

Melewatkan `stdio: "inherit"` untuk ketiga stream membuat editor interaktif persis seperti jika diluncurkan langsung dari shell. Fallback `?? "vi"` menjaga alat tetap berfungsi di mesin yang variabel `EDITOR`-nya tidak disetel.

### Menangani Ctrl+C dengan Bun.signal

Subproses interaktif dapat meninggalkan terminal dalam kondisi berantakan saat diinterupsi. Daftarkan handler `SIGINT` dengan `Bun.signal` untuk membersihkan dan keluar dengan sopan:

```typescript
import { signal } from "bun";

const sigint = signal("SIGINT");
sigint.addEventListener("unload", () => {
  console.log("\nInterrupted — no changes were lost.");
  process.exit(130);
});
```

Exit code 130 adalah status konvensional "dihentikan oleh SIGINT" (128 + 2), yang dipahami pipeline shell. Karena penulisan melewati helper penyimpanan atomik, interupsi di antara edit tidak pernah merusak penyimpanan JSON.

### Mengompilasi executable mandiri

Bundler Bun dapat menghasilkan satu executable mandiri yang menyematkan runtime JavaScriptCore. Tidak diperlukan instalasi Node.js atau Bun di mesin target:

```bash
bun build ./src/cli.ts --compile --outfile task-tracker
```

Hasilnya adalah biner native di direktori saat ini:

```bash
./task-tracker add "ship the release notes"
./task-tracker list
```

Trade-off ukuran dan waktu mulai dapat diatur dengan flag:

```text
--minify        minifikasi JavaScript yang disematkan (biner lebih kecil)
--sourcemap     menyematkan source map untuk stack trace yang lebih baik
--bytecode      pra-kompilasi ke bytecode (cold start lebih cepat)
--target        target kompilasi silang, mis. bun-linux-x64, bun-windows-x64
```

Kompilasi silang adalah keunggulan yang menonjol: Anda dapat membuat biner Windows dari mesin Linux dengan `--target=bun-windows-x64`, yang tidak dapat dilakukan alur kerja `pkg` Node.js lama secara andal.

### Menerbitkan ke npm

Ketika target pengguna adalah pengembang lain, distribusikan CLI sebagai paket alih-alih biner. Dengan entri `bin` yang sudah ada di `package.json`, penerbitan cukup dua perintah:

```bash
bun publish
```

Pengguna kemudian dapat menginstalnya secara global dan menjalankan `task-tracker` langsung:

```bash
bun install -g task-tracker-bun
task-tracker list
```

Kolom `files` di `package.json` (atau aturan penyertaan default) memastikan `src/cli.ts` dan impor-nya terkirim bersama. Karena shebang menunjuk ke `bun`, pengguna perlu menginstal Bun — untuk distribusi bebas dependensi, pilih executable terkompilasi.

## Contoh Kode

Berikut modul penyimpanan lengkap, `src/storage.ts`:

```typescript
import { mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Task {
  id: number;
  description: string;
  createdAt: string;
  completedAt: string | null;
  done: boolean;
}

const DATA_DIR = join(homedir(), ".task-tracker");
const DATA_FILE = join(DATA_DIR, "tasks.json");

export async function loadTasks(): Promise<Task[]> {
  const file = Bun.file(DATA_FILE);
  if (!(await file.exists())) {
    return [];
  }
  return (await file.json()) as Task[];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = join(DATA_DIR, `tasks.json.tmp-${process.pid}`);
  await Bun.write(tmpFile, JSON.stringify(tasks, null, 2));
  renameSync(tmpFile, DATA_FILE);
}
```

Dan helper prompt interaktif lengkap, `src/prompts.ts`:

```typescript
export async function readLine(promptText: string): Promise<string> {
  Bun.stdout.write(promptText);

  let input = "";
  for await (const chunk of Bun.stdin.stream()) {
    const text = new TextDecoder().decode(chunk);
    input += text;
    if (input.includes("\n")) {
      break;
    }
  }

  return input.trim();
}

export async function confirm(message: string): Promise<boolean> {
  const answer = (await readLine(`${message} [y/N] `)).toLowerCase();
  return answer === "y" || answer === "yes";
}
```

Terakhir, titik masuk `src/cli.ts` yang merangkai semuanya:

```typescript
#!/usr/bin/env bun

import { signal } from "bun";
import { loadTasks, saveTasks, type Task } from "./storage";
import { confirm } from "./prompts";

const signalHandler = signal("SIGINT");
signalHandler.addEventListener("unload", () => {
  console.log("\nInterrupted — no changes were lost.");
  process.exit(130);
});

function userArgs(): string[] {
  return Bun.argv.slice(2);
}

async function addTask(args: string[]): Promise<void> {
  const description = args.join(" ").trim();
  if (!description) {
    console.error("Usage: task-tracker add <description>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;

  tasks.push({
    id: nextId,
    description,
    createdAt: new Date().toISOString(),
    completedAt: null,
    done: false,
  });

  await saveTasks(tasks);
  console.log(`Added task #${nextId}: ${description}`);
}

async function listTasks(args: string[]): Promise<void> {
  const tasks = await loadTasks();
  if (tasks.length === 0) {
    console.log("No tasks yet. Add one with: task-tracker add <description>");
    return;
  }

  const showAll = args.includes("--all");
  const visible = showAll ? tasks : tasks.filter((t) => !t.done);

  for (const task of visible) {
    const status = task.done ? "[x]" : "[ ]";
    console.log(
      `${String(task.id).padStart(3)} ${status} ${task.description}`,
    );
  }

  const doneCount = tasks.filter((t) => t.done).length;
  console.log(`\n${tasks.length - doneCount} open, ${doneCount} done`);
}

async function markDone(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker done <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  task.done = true;
  task.completedAt = new Date().toISOString();
  await saveTasks(tasks);
  console.log(`Completed task #${id}`);
}

async function deleteTask(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker delete <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  if (!(await confirm(`Delete task #${id} ("${task.description}")?`))) {
    console.log("Aborted");
    return;
  }

  await saveTasks(tasks.filter((t) => t.id !== id));
  console.log(`Deleted task #${id}`);
}

async function printHelp(): Promise<void> {
  console.log(
    [
      "task-tracker — a minimal task tracker built with Bun",
      "",
      "Usage:",
      "  task-tracker add <description>   add a task",
      "  task-tracker list [--all]        list open tasks (or all with --all)",
      "  task-tracker done <id>           mark a task as done",
      "  task-tracker delete <id>         delete a task (asks for confirmation)",
      "  task-tracker help                show this help",
      "",
    ].join("\n"),
  );
}

const args = userArgs();
const command = args[0] ?? "help";

switch (command) {
  case "add":
    await addTask(args.slice(1));
    break;
  case "list":
    await listTasks(args.slice(1));
    break;
  case "done":
    await markDone(args.slice(1));
    break;
  case "delete":
    await deleteTask(args.slice(1));
    break;
  case "help":
  case "--help":
  case "-h":
    await printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
    await printHelp();
}
```

Contoh sesi menunjukkan alat beraksi:

```text
$ ./task-tracker add "write the tutorial"
Added task #1: write the tutorial
$ ./task-tracker add "publish to npm"
Added task #2: publish to npm
$ ./task-tracker list
  1 [ ] write the tutorial
  2 [ ] publish to npm

2 open, 0 done
$ ./task-tracker done 1
Completed task #1
$ ./task-tracker delete 2
Delete task #2 ("publish to npm")? n
Aborted
$ ./task-tracker list --all
  1 [x] write the tutorial
  2 [ ] publish to npm

1 open, 1 done
```

## Insight Penting

- **`Bun.argv` dimulai dari indeks 2 untuk argumen pengguna**: `argv[0]` adalah biner Bun dan `argv[1]` adalah path skrip. Selalu potong di 2, atau Anda akan diam-diam kehilangan argumen pertama.
- **Penulisan atomik mencegah state rusak**: tulis ke file sementara lalu `renameSync` ke tempatnya. Crash di tengah penulisan akan menyisakan file bagus sebelumnya, bukan dokumen JSON terpotong.
- **Utamakan `process.exitCode` daripada `process.exit()`**: menetapkan exit code membiarkan pekerjaan asinkron yang tertunda selesai dan menghindari output buffer terpotong.
- **`Bun.spawn` dengan `stdio: "inherit"` memberikan interaktivitas terminal penuh**: subproses seperti editor menerima TTY asli, sehingga key binding dan warna berperilaku sesuai harapan pengguna.
- **Biner terkompilasi menghilangkan kebutuhan runtime**: `bun build --compile` menyematkan JavaScriptCore, dan `--target` bahkan memungkinkan build lintas platform dari satu mesin.
- **Sinyal layak ditangani secara eksplisit**: handler `SIGINT` yang keluar dengan kode 130 menjaga pipeline tetap berperilaku baik dan memungkinkan Anda menjalankan pembersihan sebelum proses mati.

## Langkah Berikutnya

- Baca [Bun Test Runner and Testing Best Practices guide](/backend/bun/guides/bun-test-runner-and-testing-guide) untuk menambahkan unit test pada logika penyimpanan dan parsing CLI Anda.
- Jelajahi [Bun Production Patterns guide](/backend/bun/guides/bun-production-patterns-guide) untuk masalah deployment dan operasional.
- Perdalam pengetahuan Anda dengan [Advanced Bun syllabus](/backend/bun/syllabi/advanced-bun-syllabus), yang mencakup internal runtime dan modul native.
- Bereksperimenlah dengan `bun:sqlite` (lihat [Bun SQLite Database Cheatsheet](/backend/bun/cheatsheets/bun-sqlite-database-cheatsheet)) saat CLI Anda melampaui file JSON dan membutuhkan query sungguhan.

## Kesimpulan

Anda telah membangun alat command-line lengkap berbentuk produksi menggunakan hanya API bawaan Bun: eksekusi shebang untuk skrip instan, `Bun.argv` untuk parsing argumen, `Bun.stdin` untuk prompt interaktif, `Bun.file` plus rename atomik untuk persistensi aman, `Bun.spawn` untuk integrasi subproses, dan `bun build --compile` untuk distribusi mandiri. Blok bangunan yang sama menggerakkan CLI dunia nyata di seluruh ekosistem — otomasi rilis, alat scaffolding, seeder database, dan helper CI. Dengan Bun, seluruh perangkat berada dalam satu runtime dengan nol dependensi runtime.
