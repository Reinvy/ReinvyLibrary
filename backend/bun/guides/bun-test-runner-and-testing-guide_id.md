---
title: "Panduan Test Runner Bun dan Praktik Terbaik Pengujian"
description: "Panduan komprehensif untuk test runner bawaan Bun (bun:test) — mencakup organisasi pengujian, hook siklus hidup, mocking dan spy, mocking modul, snapshot testing, pengujian integrasi HTTP dan WebSocket, DOM testing, analisis cakupan kode, dan integrasi CI."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Test Runner Bun dan Praktik Terbaik Pengujian

## Pendahuluan

Bun memiliki test runner bawaan yang kompatibel dengan Jest, yaitu `bun:test`, dan tidak memerlukan konfigurasi apa pun. Karena Bun mengeksekusi TypeScript dan TSX secara native, pengujian berjalan langsung terhadap berkas sumber tanpa tahap transpilasi, sehingga siklus pengujian menjadi jauh lebih cepat dibandingkan pengaturan berbasis Node.js. Runner ini mendukung API `describe`/`test`/`it` yang sudah familier, hook siklus hidup, pengujian berbasis tabel (parameterized tests), mocking dan spy, snapshot testing, pelaporan cakupan kode, serta DOM testing melalui lingkungan yang dapat dipasang seperti happy-dom dan jsdom.

Panduan ini membahas pola pengujian kelas produksi untuk aplikasi Bun: cara mengorganisasi suite pengujian, menulis pengujian unit yang deterministik, mengisolasi dependensi dengan `mock()` dan `mock.module()`, melakukan snapshot testing terhadap keluaran yang kompleks, menguji server HTTP dan endpoint WebSocket, mengukur cakupan kode, serta mengintegrasikan test runner ke dalam pipeline CI. Fokusnya adalah praktik yang menjaga suite tetap cepat, andal, dan mudah dirawat seiring pertumbuhan basis kode.

## Praktik Terbaik

- **Letakkan berkas pengujian di samping kode yang diuji** — Menempatkan berkas `*.test.ts` berdampingan dengan modulnya membuat impor tetap pendek dan relatif, memudahkan penemuan kode terkait, dan selaras dengan cara Bun menyelesaikan modul. Sisakan direktori `tests/` di tingkat atas untuk suite integrasi yang melintasi banyak modul.

- **Susun suite dengan blok `describe` dan hook siklus hidup** — Kelompokkan pengujian yang terkait dengan `describe()` dan gunakan `beforeAll`/`beforeEach`/`afterEach`/`afterAll` untuk menyiapkan dan membersihkan state. Setiap berkas pengujian berjalan dalam prosesnya sendiri secara bawaan, sehingga suite tetap terisolasi satu sama lain.

- **Utamakan `mock()` dan `spyOn()` dibanding stub tulisan tangan** — `mock()` membuat fungsi mock baru dengan `.mock.calls`, `.mock.results`, serta perilaku `.mockReturnValue()` yang praktis. `spyOn()` membungkus metode objek yang sudah ada sehingga Anda dapat memeriksa jumlah pemanggilan dan argumen sambil mempertahankan implementasi aslinya hingga Anda menimpanya.

- **Isolasi dependensi dengan `mock.module()`** — `mock.module()` mencegat registri modul, sehingga pernyataan `import` di dalam modul yang diuji akan diselesaikan ke mock Anda. Panggil sebelum impor yang memicu dependensi tersebut; mock berulang untuk modul yang sama akan menggunakan mock pertama.

- **Jaga pengujian tetap deterministik dan aman untuk paralel** — Bun menjalankan berkas pengujian secara paralel secara bawaan. Hindari state mutable tingkat modul yang dibagikan, nilai acak, dan port tetap. Gunakan `beforeEach` untuk mereset state, dan suntikkan clock atau seed acak yang tetap saat menguji perilaku yang bergantung pada waktu atau keacakan.

- **Snapshot-test keluaran yang stabil dan mudah dibaca** — Gunakan `toMatchSnapshot()` untuk keluaran yang mahal jika diassert satu per satu, seperti payload JSON hasil serialisasi, kode hasil generasi, atau pesan kesalahan. Jaga snapshot tetap kecil dan mudah ditinjau; utamakan inline snapshot untuk nilai pendek yang memang sebaiknya berada di dalam berkas pengujian.

- **Uji endpoint HTTP dan WebSocket melalui permintaan nyata** — Jalankan `Bun.serve()` di dalam `beforeAll`, ikat ke port ephemeral, dan pacu server dengan `fetch()` atau klien WebSocket. Ini memvalidasi routing, middleware, penguraian permintaan, dan jalur streaming secara end-to-end tanpa layanan eksternal.

- **Terapkan ambang cakupan kode di CI** — `bun test --coverage` menginstrumentasi kode tanpa dependensi tambahan. Tetapkan ambang batas di `package.json` sehingga penurunan cakupan menggagalkan pipeline, bukan baru disadari berminggu-minggu kemudian.

## Langkah Implementasi

### Langkah 1: Siapkan Proyek dan Jalankan Pengujian Pertama

Buat proyek minimal dan pastikan runner menemukan berkas pengujian. Bun mencocokkan `*.test.{ts,tsx,js,jsx}` (dan varian akhiran `_test`) secara rekursif.

```text
├── package.json
├── tsconfig.json
└── src/
    ├── math.ts
    └── math.test.ts
```

```typescript
// src/math.ts
export function add(a: number, b: number): number {
  return a + b;
}
```

```typescript
// src/math.test.ts
import { describe, expect, test } from "bun:test";
import { add } from "./math";

describe("add", () => {
  test("menjumlahkan dua angka", () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

Jalankan suite:

```bash
bun test
```

Runner mencetak ringkasan per berkas dengan jumlah lulus/gagal serta durasi.

### Langkah 2: Susun Suite dengan Hook dan Pengujian Berbasis Tabel

Gunakan hook siklus hidup untuk penyiapan dan pembersihan, serta `test.each` untuk kasus berbasis tabel. Karena setiap berkas pengujian berjalan dalam prosesnya sendiri, state hook hanya berlaku per berkas.

```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const db: string[] = [];

beforeEach(() => {
  db.length = 0;
});

afterEach(() => {
  // lepaskan resource eksternal, jika ada
});

describe("penyimpanan pengguna", () => {
  test("menyisipkan pengguna", () => {
    db.push("alice");
    expect(db).toContain("alice");
  });

  test("dimulai dengan kosong", () => {
    expect(db).toHaveLength(0);
  });
});

describe("formatting", () => {
  test.each([
    [1, 2, "3"],
    [10, 20, "30"],
  ])("menjumlahkan %i dan %i menjadi %s", (a, b, expected) => {
    expect(String(a + b)).toBe(expected);
  });
});
```

### Langkah 3: Mock Fungsi, Metode Objek, dan Modul

`mock()` membuat fungsi mock mandiri; `spyOn()` membungkus metode yang sudah ada; `mock.module()` mencegat impor modul. Contoh berikut mengisolasi layanan yang dependensinya mengambil data dari API jarak jauh.

```typescript
// src/fetcher.ts
export async function fetchUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  return res.json();
}
```

```typescript
// src/user-service.ts
import { fetchUser } from "./fetcher";

export async function getUserName(id: string) {
  const user = await fetchUser(id);
  return user.name;
}
```

```typescript
// src/user-service.test.ts
import { describe, expect, mock, mockModule, test } from "bun:test";

mockModule("./fetcher", () => ({
  fetchUser: mock(async () => ({ name: "Alice" })),
}));

import { getUserName } from "./user-service";

describe("getUserName", () => {
  test("mengembalikan nama pengguna dari fetcher yang di-mock", async () => {
    expect(await getUserName("u1")).toBe("Alice");
  });
});
```

Untuk metode objek yang sudah ada, `spyOn` mencatat pemanggilan sambil mempertahankan implementasi aslinya hingga Anda menimpanya atau memulihkannya:

```typescript
import { expect, spyOn, test } from "bun:test";

const logger = { log: (msg: string) => console.log(msg) };

test("membuat spy pada logger.log", () => {
  const spy = spyOn(logger, "log");
  logger.log("hello");
  expect(spy).toHaveBeenCalledWith("hello");
  spy.mockRestore();
});
```

### Langkah 4: Snapshot Testing

Gunakan `toMatchSnapshot()` ketika keluaran yang diassert panjang tetapi stabil. Snapshot disimpan di direktori `__snapshots__/` di samping berkas pengujian.

```typescript
import { expect, test } from "bun:test";

function renderPage(user: { name: string; roles: string[] }) {
  return {
    title: `Dashboard untuk ${user.name}`,
    roles: user.roles,
  };
}

test("merender payload dashboard", () => {
  const payload = renderPage({ name: "Alice", roles: ["admin", "editor"] });
  expect(payload).toMatchSnapshot();
});
```

Jalankan `bun test -u` untuk memperbarui snapshot setelah perubahan keluaran yang disengaja. Jaga snapshot tetap fokus — snapshot yang besar mengaburkan regresi nyata saat ditinjau.

### Langkah 5: Uji Endpoint HTTP dan WebSocket

Jalankan server pada port ephemeral di dalam `beforeAll` dan pacu dengan Fetch API. Pola ini mencakup endpoint REST, respons streaming, dan jalur kesalahan.

```typescript
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

let server: ReturnType<typeof Bun.serve>;
let baseUrl: string;

beforeAll(() => {
  server = Bun.serve({
    port: 0, // port ephemeral
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/health") {
        return Response.json({ status: "ok" });
      }
      return new Response("Not Found", { status: 404 });
    },
  });
  baseUrl = `http://${server.hostname}:${server.port}`;
});

afterAll(() => {
  server.stop();
});

describe("endpoint health", () => {
  test("mengembalikan ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
```

Untuk server WebSocket, sambungkan dengan klien WebSocket dan tunggu pesan untuk memverifikasi jalur upgrade dan echo:

```typescript
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

let server: ReturnType<typeof Bun.serve>;
let wsUrl: string;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req, srv) {
      if (srv.upgrade(req)) return;
      return new Response("Upgrade Required", { status: 426 });
    },
    websocket: {
      open(ws) {
        ws.send("welcome");
      },
      message(ws, msg) {
        ws.send(`echo: ${msg}`);
      },
    },
  });
  wsUrl = `ws://${server.hostname}:${server.port}`;
});

afterAll(() => {
  server.stop();
});

test("mengembalikan echo pesan melalui WebSocket", async () => {
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((resolve) => {
    ws.onopen = () => {
      ws.send("hello");
      resolve();
    };
  });
  const reply = await new Promise<string>((resolve) => {
    ws.onmessage = (event) => resolve(String(event.data));
  });
  expect(reply).toBe("echo: hello");
  ws.close();
});
```

### Langkah 6: Aktifkan DOM Testing dan Cakupan Kode

Bun dapat menjalankan pengujian yang bergantung pada DOM dengan happy-dom (atau jsdom) dengan mengaktifkan lingkungan pengujian DOM di `package.json`. Tidak perlu framework atau test runner terpisah.

```json
{
  "name": "my-app",
  "scripts": {
    "test": "bun test",
    "test:coverage": "bun test --coverage"
  },
  "bun": {
    "test": {
      "dom": true,
      "coverageThreshold": {
        "global": {
          "lines": 80,
          "functions": 75
        }
      }
    }
  },
  "devDependencies": {
    "happy-dom": "^15.0.0"
  }
}
```

```tsx
// src/button.test.tsx
import { expect, test } from "bun:test";

function Button({ label }: { label: string }) {
  return <button>{label}</button>;
}

test("merender tombol dengan label", () => {
  const el = <Button label="Save" /> as unknown as HTMLElement;
  expect(el.textContent).toBe("Save");
});
```

Buat laporan cakupan kode:

```bash
bun test --coverage
```

Reporter mencetak cakupan baris, fungsi, dan cabang per berkas, serta keluar dengan status non-nol ketika ambang batas dilanggar — pasang ini di CI agar regresi kode yang tidak tercakup memblokir penggabungan.

### Langkah 7: Integrasikan dengan CI

Gunakan `bun install --frozen-lockfile` dan `bun test` di dalam pipeline agar lingkungan CI sama persis dengan perilaku lokal.

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun test --coverage
```

Action `oven-sh/setup-bun` memasang Bun dalam hitungan detik, dan perintah yang sama berfungsi di lingkungan lokal, sehingga pengalaman pengujian lokal dan CI tetap identik.
