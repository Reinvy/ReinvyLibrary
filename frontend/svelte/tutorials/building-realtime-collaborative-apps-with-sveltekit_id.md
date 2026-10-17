---
title: "Membangun Aplikasi Kolaboratif Real-Time dengan SvelteKit"
description: "Bangun editor kolaboratif kelas produksi dengan SvelteKit: pasang server WebSocket pada adapter-node, autentikasi upgrade dengan cookie sesi, modelkan room sebagai aktor server-authoritative, sinkronkan editan dengan CRDT Yjs, siarkan presence, dan skalakan horizontal dengan Redis pub/sub."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Kolaboratif Real-Time dengan SvelteKit

## Ringkasan

Tutorial ini membangun editor dokumen kolaboratif multi-pengguna di atas SvelteKit. Anda akan memasang endpoint WebSocket pada adapter Node, mengautentikasi upgrade protokol dengan cookie sesi yang sama yang sudah dipakai rute HTTP Anda, memodelkan setiap dokumen sebagai room server-authoritative, menggabungkan editan bersamaan dengan CRDT Yjs, menyiarkan presence dan kursor, serta menyebarkan pesan antar beberapa proses Node dengan Redis pub/sub. Di akhir, Anda memiliki editor yang berfungsi di mana dua peramban mengubah dokumen yang sama tanpa keystroke hilang, teks ganda, atau kursor meloncat.

## Target Audiens

- Engineer fullstack dan frontend yang sudah pernah merilis setidaknya satu aplikasi SvelteKit dan nyaman dengan `+page.server.ts`, hooks, serta sistem adapter.
- Developer mahir yang membutuhkan perilaku real-time yang tetap bertahan saat reconnect, beberapa instance server, dan penulis bersamaan.
- Engineer yang condong ke backend dan sedang mengevaluasi apakah monolit SvelteKit dapat menampung fitur real-time tanpa layanan terpisah.

## Prasyarat

- SvelteKit 2 dengan Svelte 5 (runes: `$state`, `$derived`, `$effect`) dan TypeScript aktif.
- Node.js 20 atau lebih baru, plus instance Redis yang dapat dijangkau dari mesin pengembangan Anda.
- Pemahaman kerja mengenai cookie HTTP, sesi, dan handshake WebSocket.
- Keterbiasaan dengan `adapter-node` — `adapter-auto` bawaan tidak mendukung koneksi berumur panjang di sebagian besar platform.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Memasang server `ws` pada adapter Node SvelteKit tanpa merusak dev server Vite maupun build produksi.
- Mengautentikasi upgrade WebSocket menggunakan cookie sesi yang diterbitkan hooks SvelteKit, bukan token pada query string.
- Menyusun room sebagai aktor server-authoritative yang memiliki keanggotaan, presence, dan persistensi.
- Menggabungkan editan teks bersamaan dengan CRDT Yjs dan menjelaskan mengapa last-write-wins adalah default yang salah untuk dokumen.
- Menerapkan render lokal optimistis dengan rekonsiliasi server dan patch jarak jauh yang mempertahankan kursor.
- Menskalakan fan-out antar beberapa proses dengan Redis pub/sub tanpa mengubah protokol socket.
- Menangani reconnect, exponential backoff, dan antrean editan offline tanpa menduplikasi operasi.

## Konteks dan Motivasi

Sebagian besar aplikasi SvelteKit dimulai sebagai sistem request/response: form action mengubah basis data, fungsi load membacanya kembali, dan halaman dimuat ulang. Model itu runtuh begitu dua pengguna perlu melihat perubahan satu sama lain dalam hitungan ratusan milidetik. Polling membuang bandwidth dan menghasilkan lag yang terlihat; kode WebSocket naif memunculkan tiga masalah yang tidak ada di dunia HTTP — autentikasi pada koneksi yang hidup lebih lama daripada request mana pun, state yang harus konsisten di antara penulis bersamaan, dan fan-out pada lebih dari satu proses server.

Jalan pintas yang menggoda adalah merge last-write-wins tingkat dokumen: siapa yang menyimpan terakhir, dia yang menang. Untuk satu field teks, itu terasa memadai. Untuk dokumen dengan dua kursor, model itu menghasilkan paragraf yang hancur secara diam-diam, yang dialami pengguna sebagai kehilangan data — kegagalan paling merusak yang bisa dikirim produk kolaboratif. CRDT menyelesaikannya dengan menjadikan setiap editan sebagai operasi komutatif, sehingga hasil merge identik terlepas dari urutan kedatangan.

SvelteKit adalah host yang baik untuk ini bila Anda menghormati tiga batasan: adapter harus berumur panjang (`adapter-node`), handler upgrade harus berada di luar fetch handler, dan state otoritatif tidak boleh hanya hidup di dalam komponen. Arsitektur pada tutorial ini menjaga SvelteKit bertanggung jawab atas routing, rendering, dan identitas sesi, lalu memberikan urusan real-time batas kecil yang eksplisit.

## Konten Inti

### Mengapa Kolaborasi Merusak Kode Realtime Naif

Editor kolaboratif adalah sistem terdistribusi dengan mode kegagalan yang terlihat oleh manusia. Sebelum menulis kode, namai empat kelas kegagalan yang Anda rancang untuk dicegah.

- **Update hilang.** Dua klien mengirim pesan `set text` berisi seluruh isi dokumen; yang diproses kedua menimpa yang pertama. Tidak ada error yang muncul.
- **Insert ganda.** Klien mengulang setelah acknowledgement terputus dan server menambahkan karakter yang sama dua kali.
- **Kursor tercuri.** Patch jarak jauh mengganti seluruh dokumen, sehingga seleksi lokal runtuh ke akhir buffer saat pengguna sedang menulis.
- **State terbelah antar instance.** Instance A hanya menyiarkan ke socket-nya; pengguna yang terhubung ke instance B tidak pernah melihat editan sampai me-reload.

Masing-masing punya penawar spesifik: operasi CRDT memperbaiki update yang hilang dan ganda, patch delta alih-alih penulisan seluruh dokumen memperbaiki kursor tercuri, dan jembatan pub/sub memperbaiki state yang terbelah. Sisa tutorial ini mengimplementasikan penawar tersebut secara berurutan.

### Memilih Transport: SSE, WebSocket, atau WebTransport

Server-Sent Events adalah alat yang tepat ketika data utamanya mengalir satu arah — dashboard, log tail, bilah progres pekerjaan. SSE menumpang pada HTTP biasa, lolos dari proxy, dan melakukan reconnect otomatis. SSE tidak dapat mengirim editan klien tanpa satu request HTTP tambahan per keystroke, yang mendiskualifikasikannya untuk editor.

WebSocket menyediakan kanal dupleks dengan satu handshake dan overhead framing beberapa byte per pesan. Konsekuensinya, server harus menahan file descriptor terbuka, sehingga platform Anda wajib mendukung koneksi berumur panjang; platform serverless yang dimatikan setelah respons tidak memenuhi syarat.

WebTransport di atas HTTP/3 menawarkan multiplexing lebih baik serta datagram yang tidak andal, tetapi dukungan peramban dan kematangan infrastruktur masih menjadikannya pilihan spesialis. Pilih hanya untuk media atau telemetri berfrekuensi tinggi di mana head-of-line blocking benar-benar terukur.

Untuk editor dokumen, WebSocket adalah default yang tepat. Poin arsitektur pentingnya adalah transport harus dapat diganti: semua komponen di hilir bagian ini mengonsumsi envelope pesan bertipe, bukan socket secara langsung.

### Memasang Server WebSocket pada SvelteKit

SvelteKit membangun ke direktori `build/` yang berisi `handler.js` yang mengekspor Node request listener. Untuk menambah endpoint WebSocket, Anda membuat file entry sendiri yang mengombinasikan handler SvelteKit dengan HTTP server, lalu mengimpor handler hasil build agar keduanya berbagi satu port.

Dalam pengembangan, `vite dev` menguasai port, jadi Anda mendaftarkan plugin Vite yang memasang `WebSocketServer` yang sama ke HTTP server Vite di `configureServer`. Menjaga logika room di modul yang agnostik terhadap adapter berarti dev dan produksi memakai satu implementasi, dan hanya pengkabelannya yang berbeda.

```text
src/
  hooks.server.ts        resolusi sesi untuk request HTTP
  lib/server/rooms.ts    registry room — keanggotaan, presence, persistensi
  lib/server/auth.ts     autentikasi upgrade (cookie -> user)
  lib/collab/protocol.ts tipe pesan bersama (klien + server)
  lib/collab/client.ts   klien peramban: reconnect, backoff, antrean
  routes/doc/[id]/
    +page.server.ts      otorisasi untuk halaman dokumen
    +page.svelte         UI editor, mengikat Yjs ke DOM
server.js                entry produksi: handler SvelteKit + server ws
vite.config.ts           plugin dev: server ws yang sama pada HTTP server Vite
```

Kesalahan paling umum di sini adalah memanggil `wss.handleUpgrade` untuk setiap path request. Server Anda juga melayani aset, form action, dan health check; lakukan upgrade hanya pada path yang Anda miliki dan hancurkan socket selebihnya, atau fetch handler SvelteKit akan menerima socket yang tidak dapat dijawabnya.

### Mengautentikasi Upgrade dengan Cookie Sesi

Peramban melampirkan cookie pada handshake WebSocket secara otomatis, karena handshake tersebut adalah HTTP GET. Artinya Anda dapat memakai kembali mekanisme sesi yang sudah dipercaya aplikasi SvelteKit Anda — tanpa token bertanda tangan pada query string, tanpa penyelundupan lewat `Sec-WebSocket-Protocol`.

Parse header `cookie` dari `IncomingMessage`, resolusi sesi persis seperti yang dilakukan `hooks.server.ts`, lalu tolak dengan `401` yang ditulis langsung ke socket sebelum upgrade selesai. Ini harus terjadi *sebelum* `handleUpgrade`, karena setelah protokol berganti Anda hanya bisa menutup dengan kode close WebSocket — peramban tidak akan menampilkan status HTTP.

Dua detail halus penting di produksi. Pertama, `Origin` wajib divalidasi: koneksi WebSocket tidak tercakup oleh same-origin policy, sehingga halaman berbahaya dapat membuka socket ke server Anda dan peramban akan melampirkan cookie pengguna. Bandingkan `Origin` dengan allowlist. Kedua, sesi harus diperiksa ulang secara berkala untuk socket berumur panjang, karena logout atau perubahan peran tidak dengan sendirinya memutus koneksi yang terbuka.

### Memodelkan Room sebagai Aktor Server-Authoritative

Room adalah unit konsistensi. Room memiliki himpunan anggota, peta presence, dokumen Yjs, dan debounce persistensinya. Klien tidak pernah menerima pesan mentah dari klien lain; server membaca, menerapkan, lalu menyiarkan ulang.

Indireksi inilah yang membuat sistem dapat di-debug. Setiap pesan melewati satu fungsi, sehingga Anda bisa mencatatnya, memvalidasinya, membatasi lajunya, dan memutarnya kembali. Topologi peer-to-peer terlihat menarik dari sisi latensi, tetapi memindahkan kepercayaan ke klien, yang tidak dapat diterima untuk dokumen dengan izin akses.

Setiap room menyimpan nomor urut yang bertambah per batch operasi yang diterima. Klien mengirim `lastSeq` saat reconnect; server membalas dengan snapshot plus operasi apa pun yang dihasilkan setelah urutan tersebut. Tanpa handshake ini, klien yang reconnect setelah tiga puluh detik diam-diam kehilangan tiga puluh detik editan jarak jauh, dan editan lokal berikutnya memasukkan kembali teks yang sudah usang.

Siklus hidup room penting untuk memori. Hitung referensi anggota: buat dokumen saat join pertama, mulai debounce persistensi, dan evict room setelah anggota terakhir pergi ditambah masa tenggang. Evict segera akan menghancurkan CRDT di memori dan memaksa pemuatan dingin pada setiap refresh.

### Presence dan Awareness Tanpa Kebisingan

Presence — siapa yang ada di sini, di mana kursornya, apa yang diseleksi — adalah state berfrekuensi tinggi dengan nilai rendah. State ini tidak boleh menyentuh basis data dan tidak boleh dipersistenkan. Menyiarkan pesan presence untuk setiap mousemove akan menjenuhkan socket dan membakar CPU di setiap klien.

Batasi update kursor pada kisaran 20-30 milidetik dengan menggabungkan posisi di antaranya. Kirim snapshot presence lengkap saat join dan update inkremental sesudahnya. Ketika socket tertutup, hapus anggota dan siarkan kepergiannya segera alih-alih menunggu timeout; pengguna membaca avatar hantu sebagai produk yang rusak.

Yjs menyertakan protokol awareness yang sudah mengimplementasikan pola ini — heartbeat, timeout, dan state per klien — sehingga Anda tidak perlu menulis logika pembersihan sendiri. State awareness bersifat ephemeral secara desain dan bukan bagian dari riwayat dokumen, yang persis merupakan semantik yang dibutuhkan presence.

### Resolusi Konflik dengan CRDT Yjs

CRDT membuat editan bersamaan ter-merge secara deterministik. Yjs merepresentasikan dokumen sebagai rangkaian item dengan pengenal unik dan referensi asal; menyisipkan pada indeks yang sama di dua klien menghasilkan dua item dengan urutan yang terdefinisi, bukan satu item yang tertimpa. Penghapusan adalah tombstone, sehingga delete dan insert bersamaan pada posisi yang sama keduanya bertahan dengan benar.

Titik integrasinya adalah `Y.Text` bersama yang diikatkan ke editor. Di klien Anda mengamati event teks dan menerapkan delta jarak jauh; di server Anda memegang `Y.Doc` yang sama, menerapkan update dari klien, dan menyiarkan update terenkode. Karena update Yjs bersifat komutatif dan idempoten, server tidak perlu mengurutkannya — server hanya perlu mengantarkan setiap update setidaknya sekali.

Persistensi adalah snapshot dari state CRDT, bukan teks yang dirender. Simpan `Y.encodeStateAsUpdate(doc)` sebagai kolom `bytea`/`BLOB` plus kompaksi berkala, dan Anda dapat merekonstruksi dokumen persis termasuk riwayatnya. Menyimpan markdown hasil render justru menghilangkan tombstone dan merusak merge setelah restart.

Trade-off yang perlu dinyatakan jujur: payload Yjs bersifat biner, tidak transparan di log, dan tumbuh seiring riwayat editan sampai Anda menjalankan garbage collection. Untuk editor rich-text, alternatifnya — operational transformation — menuntut server pusat mentransformasi setiap operasi terhadap setiap operasi bersamaan, jauh lebih sulit dilakukan dengan benar dan tidak bertahan pada editan offline.

### Update Optimistis dan Rekonsiliasi

Editan lokal harus dirender sebelum server mengakuinya, atau mengetik terasa lambat pada round-trip 80 ms. Dengan CRDT Anda mendapatkannya gratis: terapkan operasi lokal ke dokumen lokal segera, kirim update ke server, dan biarkan echo tiba sebagai merge no-op.

Masalah rekonsiliasi muncul pada state non-CRDT — menyimpan judul dokumen, mengubah flag berbagi, mengurutkan ulang daftar. Untuk itu, simpan peta operasi tertunda yang kecil dengan kunci id operasi yang dihasilkan klien. Server menggemakan id tersebut dalam acknowledgement; saat diterima, Anda menghapus entri optimistis dan merekonsiliasi dengan nilai otoritatif. Jika terdeteksi konflik, nilai server menang dan UI menampilkan indikator singkat "diperbarui oleh pengguna lain" alih-alih diam-diam mengembalikan.

Jangan pernah memblokir input menunggu acknowledgement. Jangan pernah menerapkan snapshot jarak jauh di atas dokumen yang memiliki operasi lokal yang belum diakui — merge, jangan ganti. Inilah satu aturan yang mencegah laporan bug "ketikan saya hilang".

### Menskalakan Antar Proses dengan Redis Pub/Sub

Satu proses Node hanya menyiarkan ke socket pada proses itu. Begitu Anda menjalankan dua instance di belakang load balancer, pengguna yang terhubung ke instance berbeda berhenti saling melihat editan.

Solusinya adalah bus pesan antar proses. Setiap room berlangganan kanal Redis; ketika instance mana pun menerima operasi, instance itu mempublikasikan update terenkode ke kanal tersebut; setiap instance — termasuk penerbit — menerapkannya ke salinan lokal `Y.Doc` milik room itu dan menyiarkannya ke socket-nya sendiri. Anggota yang tiba di instance baru menerima snapshot dari basis data lalu bergabung ke kanal live.

Redis pub/sub bersifat fire-and-forget: subscriber yang terputus di tengah pesan kehilangan pesan itu. Ini dapat diterima justru karena update Yjs idempoten dan handshake reconnect memutar ulang apa pun yang terlewat setelah `lastSeq`. Jika Anda juga membutuhkan durabilitas pada bus itu sendiri, Redis Streams dengan consumer group adalah jalur peningkatan, dengan biaya pembukuan ack.

Jaga kanal per room, bukan per tenant atau global. Kanal global membuat setiap instance melakukan deserialisasi setiap editan di seluruh sistem; kanal per room menjaga fan-out proporsional terhadap room yang aktif.

### Reconnect, Backoff, dan Antrean Offline

Jaringan terputus. Laptop tidur. Klien kolaboratif wajib mengasumsikan socket mati secara berkala dan pulih tanpa tindakan pengguna.

Tiga bagian membuatnya bekerja. Pertama, exponential backoff dengan jitter, dibatasi sekitar tiga puluh detik, agar server yang restart tidak menerima thundering herd. Kedua, handshake resume yang membawa nomor urut terakhir, sehingga klien dapat meminta delta yang terlewat alih-alih memuat ulang penuh. Ketiga, antrean keluar berisi update yang belum diakui yang disimpan di memori (dan di IndexedDB untuk sesi lebih panjang) dan dikuras saat reconnect — karena update idempoten, pengurasan ganda tidak berbahaya, itulah sebabnya desain ini tidak memerlukan pengantaran exactly-once.

Tampilkan status koneksi di UI. Pil "menyambung ulang" yang tidak mencolok jauh lebih baik daripada editor yang membeku; pengguna memaklumi reconnect yang terlihat dan mencurigai yang tak terlihat. Cegah aksi destruktif selama terputus, dan tandai dokumen read-only jika sesi kedaluwarsa alih-alih menerima editan yang akan Anda tolak.

## Contoh Kode

### Protokol bersama

```typescript
// src/lib/collab/protocol.ts
export type ClientMessage =
  | { type: 'join'; docId: string; lastSeq: number }
  | { type: 'update'; docId: string; update: Uint8Array; opId: string }
  | { type: 'awareness'; docId: string; update: Uint8Array }
  | { type: 'leave'; docId: string };

export type ServerMessage =
  | { type: 'snapshot'; docId: string; update: Uint8Array; seq: number }
  | { type: 'update'; docId: string; update: Uint8Array; seq: number; opId?: string }
  | { type: 'awareness'; docId: string; update: Uint8Array }
  | { type: 'presence'; docId: string; members: PresenceMember[] }
  | { type: 'error'; code: 'unauthorized' | 'forbidden' | 'rate_limited'; message: string };

export interface PresenceMember {
  clientId: number;
  userId: string;
  name: string;
  color: string;
  cursor: { anchor: number; head: number } | null;
}
```

### Autentikasi upgrade

```typescript
// src/lib/server/auth.ts
import type { IncomingMessage } from 'node:http';
import { parse } from 'cookie';
import { getSessionUser } from './session';

const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'http://localhost:5173'
]);

export interface UpgradeIdentity {
  userId: string;
  name: string;
  token: string;
}

export async function authenticateUpgrade(
  req: IncomingMessage
): Promise<UpgradeIdentity | null> {
  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return null;
  }

  const header = req.headers.cookie;
  if (!header) return null;

  const cookies = parse(header);
  const token = cookies.session;
  if (!token) return null;

  const user = await getSessionUser(token);
  if (!user) return null;

  return { userId: user.id, name: user.name, token };
}
```

### Entry produksi: satu port, dua tanggung jawab

```javascript
// server.js
import { createServer } from 'node:http';
import { handler } from './build/handler.js';
import { WebSocketServer } from 'ws';
import { authenticateUpgrade } from './src/lib/server/auth.js';
import { rooms } from './src/lib/server/rooms.js';

const PORT = Number(process.env.PORT ?? 3000);
const server = createServer(handler);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname !== '/api/collab') {
    socket.destroy();
    return;
  }

  let identity;
  try {
    identity = await authenticateUpgrade(req);
  } catch (error) {
    console.error('autentikasi upgrade gagal', error);
    identity = null;
  }

  if (!identity) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  const docId = url.searchParams.get('docId');
  if (!docId) {
    socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, { identity, docId });
  });
});

wss.on('connection', async (ws, _req, { identity, docId }) => {
  const room = await rooms.acquire(docId, identity);
  room.attach(ws);

  ws.on('message', (raw) => {
    room.receive(identity, raw).catch((error) => {
      console.error('kesalahan pesan room', error);
      ws.close(1011, 'internal error');
    });
  });

  ws.on('close', () => {
    room.detach(ws);
  });
});

server.listen(PORT, () => {
  console.log(`mendengarkan pada ${PORT}`);
});
```

### Registry room dengan eviction

```typescript
// src/lib/server/rooms.ts
import * as Y from 'yjs';
import type { WebSocket } from 'ws';
import { loadSnapshot, saveSnapshot } from './documents';
import { bridge } from './bus';
import type { PresenceMember } from '$lib/collab/protocol';

const GRACE_MS = 60_000;

class Room {
  readonly doc = new Y.Doc();
  readonly members = new Map<WebSocket, PresenceMember>();
  private seq = 0;
  private evictTimer: NodeJS.Timeout | null = null;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(readonly id: string) {}

  async hydrate(): Promise<void> {
    const stored = await loadSnapshot(this.id);
    if (stored) Y.applyUpdate(this.doc, stored);
    this.doc.on('update', (update: Uint8Array) => {
      this.seq += 1;
      this.broadcast({ type: 'update', docId: this.id, update, seq: this.seq });
      this.scheduleSave();
    });
  }

  attach(ws: WebSocket): void {
    if (this.evictTimer) {
      clearTimeout(this.evictTimer);
      this.evictTimer = null;
    }
    this.members.set(ws, {
      clientId: Math.floor(Math.random() * 2 ** 31),
      userId: '',
      name: '',
      color: '',
      cursor: null
    });
    ws.send(
      JSON.stringify({
        type: 'snapshot',
        docId: this.id,
        update: Y.encodeStateAsUpdate(this.doc),
        seq: this.seq
      })
    );
    this.broadcastPresence();
  }

  detach(ws: WebSocket): void {
    this.members.delete(ws);
    this.broadcastPresence();
    if (this.members.size === 0) {
      this.evictTimer = setTimeout(() => rooms.release(this.id), GRACE_MS);
    }
  }

  receive(identity: { userId: string }, raw: unknown): Promise<void> {
    const message = JSON.parse(String(raw));
    if (message.type === 'update' && message.update) {
      Y.applyUpdate(this.doc, new Uint8Array(message.update));
    }
    return bridge.publish(this.id, message);
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      saveSnapshot(this.id, Y.encodeStateAsUpdate(this.doc)).catch((error) =>
        console.error('penyimpanan snapshot gagal', error)
      );
    }, 2_000);
  }

  private broadcastPresence(): void {
    const members = [...this.members.values()];
    this.broadcast({ type: 'presence', docId: this.id, members });
  }

  private broadcast(message: unknown): void {
    const payload = JSON.stringify(message);
    for (const ws of this.members.keys()) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }
}

class RoomRegistry {
  private rooms = new Map<string, Room>();

  async acquire(id: string, identity: { userId: string; name: string }): Promise<Room> {
    let room = this.rooms.get(id);
    if (!room) {
      room = new Room(id);
      await room.hydrate();
      this.rooms.set(id, room);
    }
    return room;
  }

  release(id: string): void {
    this.rooms.delete(id);
  }
}

export const rooms = new RoomRegistry();
```

### Jembatan fan-out Redis

```typescript
// src/lib/server/bus.ts
import { createClient } from 'redis';
import type { ServerMessage } from '$lib/collab/protocol';

const publisher = createClient({ url: process.env.REDIS_URL });
const subscriber = publisher.duplicate();

const handlers = new Map<string, (message: ServerMessage) => void>();

await Promise.all([publisher.connect(), subscriber.connect()]);

await subscriber.pSubscribe('room:*', (payload) => {
  const parsed = JSON.parse(payload) as { docId: string; message: ServerMessage };
  handlers.get(parsed.docId)?.(parsed.message);
});

export const bridge = {
  subscribe(docId: string, handler: (message: ServerMessage) => void) {
    handlers.set(docId, handler);
  },
  async publish(docId: string, message: unknown) {
    await publisher.publish(
      `room:${docId}`,
      JSON.stringify({ docId, message })
    );
  }
};
```

### Klien peramban dengan backoff dan resume

```typescript
// src/lib/collab/client.ts
import * as Y from 'yjs';

export interface CollabOptions {
  docId: string;
  doc: Y.Doc;
  onPresence: (members: unknown[]) => void;
  onStatus: (status: 'connecting' | 'open' | 'reconnecting' | 'closed') => void;
}

export function connectCollab({ docId, doc, onPresence, onStatus }: CollabOptions) {
  let socket: WebSocket | null = null;
  let attempt = 0;
  let lastSeq = 0;
  let closedByUser = false;
  const queue: Uint8Array[] = [];

  const url = () => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}/api/collab?docId=${encodeURIComponent(docId)}`;
  };

  const send = (payload: unknown) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  const flush = () => {
    while (queue.length > 0) {
      const update = queue[0];
      if (!send({ type: 'update', docId, update, opId: crypto.randomUUID() })) return;
      queue.shift();
    }
  };

  const localUpdate = (update: Uint8Array) => {
    if (!send({ type: 'update', docId, update, opId: crypto.randomUUID() })) {
      queue.push(update);
    }
  };

  const open = () => {
    onStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    socket = new WebSocket(url());
    socket.binaryType = 'arraybuffer';

    socket.addEventListener('open', () => {
      attempt = 0;
      onStatus('open');
      send({ type: 'join', docId, lastSeq });
      flush();
    });

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data as string);
      if (message.type === 'snapshot') {
        Y.applyUpdate(doc, new Uint8Array(message.update), 'server');
        lastSeq = Math.max(lastSeq, message.seq);
      } else if (message.type === 'update') {
        lastSeq = Math.max(lastSeq, message.seq);
        Y.applyUpdate(doc, new Uint8Array(message.update), 'server');
      } else if (message.type === 'presence') {
        onPresence(message.members);
      }
    });

    socket.addEventListener('close', () => {
      onStatus(closedByUser ? 'closed' : 'reconnecting');
      if (closedByUser) return;
      const delay = Math.min(30_000, 500 * 2 ** attempt) + Math.random() * 250;
      attempt += 1;
      setTimeout(open, delay);
    });

    socket.addEventListener('error', () => socket?.close());
  };

  doc.on('update', localUpdate);
  open();

  return {
    disconnect() {
      closedByUser = true;
      doc.off('update', localUpdate);
      socket?.close();
    }
  };
}
```

### Otorisasi halaman dan pengkabelan editor

```typescript
// src/routes/doc/[id]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import { getDocumentForUser } from '$lib/server/documents';

export async function load({ params, locals }) {
  if (!locals.user) throw redirect(303, `/login?next=/doc/${params.id}`);

  const document = await getDocumentForUser(params.id, locals.user.id);
  if (!document) throw error(404, 'Dokumen tidak ditemukan');

  return {
    docId: document.id,
    title: document.title,
    canEdit: document.role !== 'viewer'
  };
}
```

```svelte
<!-- src/routes/doc/[id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as Y from 'yjs';
  import { connectCollab } from '$lib/collab/client';

  export let data;

  let editor: HTMLTextAreaElement;
  let presence = $state<{ name: string; color: string }[]>([]);
  let status = $state<'connecting' | 'open' | 'reconnecting' | 'closed'>('connecting');

  const doc = new Y.Doc();
  const text = doc.getText('content');

  onMount(() => {
    const connection = connectCollab({
      docId: data.docId,
      doc,
      onPresence: (members) => {
        presence = members as { name: string; color: string }[];
      },
      onStatus: (next) => {
        status = next;
      }
    });

    const render = () => {
      const selectionStart = editor?.selectionStart ?? 0;
      const selectionEnd = editor?.selectionEnd ?? 0;
      const value = text.toString();
      if (editor && editor.value !== value) {
        editor.value = value;
        editor.selectionStart = Math.min(selectionStart, value.length);
        editor.selectionEnd = Math.min(selectionEnd, value.length);
      }
    };

    render();
    text.observe(render);

    return () => {
      text.unobserve(render);
      connection.disconnect();
    };
  });

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLTextAreaElement;
    const next = target.value;
    const current = text.toString();

    if (next === current) return;

    let start = 0;
    while (start < current.length && current[start] === next[start]) start += 1;
    let endCurrent = current.length;
    let endNext = next.length;
    while (endCurrent > start && endNext > start && current[endCurrent - 1] === next[endNext - 1]) {
      endCurrent -= 1;
      endNext -= 1;
    }

    doc.transact(() => {
      if (endCurrent > start) text.delete(start, endCurrent - start);
      if (endNext > start) text.insert(start, next.slice(start, endNext));
    });
  }
</script>

<div class="editor">
  <header>
    <h1>{data.title}</h1>
    <span class="status" data-state={status}>{status}</span>
    <ul class="presence">
      {#each presence as member (member.name)}
        <li style:background={member.color} title={member.name}>{member.name[0]}</li>
      {/each}
    </ul>
  </header>

  <textarea
    bind:this={editor}
    readonly={!data.canEdit}
    oninput={handleInput}
    aria-label="Isi dokumen"
  ></textarea>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status[data-state='open'] {
    color: #157347;
  }

  .status[data-state='reconnecting'] {
    color: #b58105;
  }

  .status[data-state='closed'] {
    color: #b02a37;
  }

  .presence {
    display: flex;
    list-style: none;
    gap: 0.25rem;
    margin-left: auto;
  }

  .presence li {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 0.75rem;
  }

  textarea {
    min-height: 60vh;
    font-family: ui-monospace, monospace;
    line-height: 1.6;
  }
</style>
```

### Pengkabelan dev server

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { WebSocketServer } from 'ws';
import { authenticateUpgrade } from './src/lib/server/auth';

function collabPlugin(): Plugin {
  return {
    name: 'collab-websocket',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer?.on('upgrade', async (req, socket, head) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname !== '/api/collab') return;

        const identity = await authenticateUpgrade(req).catch(() => null);
        if (!identity) {
          socket.destroy();
          return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [sveltekit(), collabPlugin()]
});
```

## Insight Penting

- **Koneksi berumur panjang menuntut adapter berumur panjang.** `adapter-node` menjaga proses tetap hidup; sebagian besar adapter serverless berhenti setelah respons, yang mematikan socket. Tentukan target deployment sebelum menulis kode protokol.
- **Autentikasi sebelum upgrade, otorisasi sesudahnya.** Cookie tiba pada handshake, jadi resolusi identitas di sana dan tolak dengan `401` mentah. Namun keanggotaan harus diotorisasi ulang pada setiap join room dan diperiksa berkala sesudahnya, karena WebSocket yang dibuat sebelum perubahan izin tetap terbuka sampai ada yang menutupnya.
- **Validasi `Origin` pada setiap upgrade.** WebSocket dikecualikan dari same-origin policy; tanpa allowlist, halaman mana pun dapat membuka socket dengan cookie pengguna terlampir. Ini kontrol keamanan yang paling sering terlewat pada kode SvelteKit real-time.
- **Jangan pernah menyimpan teks hasil render sebagai sumber kebenaran kolaborasi.** Simpan update CRDT terenkode. Menyimpan markdown menghilangkan tombstone dan metadata merge, sehingga penulisan berikutnya membangkitkan kembali paragraf yang sudah dihapus.
- **CRDT membuat retry aman, jadi rancanglah untuk pengantaran at-least-once** alih-alih exactly-once. Update yang idempoten adalah alasan antrean reconnect boleh dikuras dua kali tanpa merusak dokumen.
- **Siarkan delta, bukan snapshot.** Penggantian seluruh dokumen pada setiap keystroke menghancurkan seleksi jarak jauh dan mengubah room 90 MB/s menjadi 9 GB/s pada ukuran realistis.
- **Kanal Redis per room, bukan global.** Biaya fan-out harus proporsional terhadap room aktif, dan kanal global memaksa setiap instance mem-parse setiap editan di seluruh sistem.
- **Presence bersifat ephemeral dan tidak boleh menyentuh basis data.** Menyimpan posisi kursor menambah beban tulis untuk data yang usang dalam satu detik, dan memperumit kewajiban penghapusan menurut aturan privasi.
- **Evict room dengan masa tenggang.** Penghitungan referensi dengan ekor satu menit menghindari pemuatan CRDT dingin pada setiap refresh halaman sekaligus membatasi memori.
- **Kompaksi bukan opsional.** Yjs menyimpan tombstone dan pengenal item lama; jadwalkan `encodeStateAsUpdate` dengan garbage collection atau memori snapshot tumbuh tanpa batas pada dokumen berumur panjang.

## Langkah Berikutnya

- Tambahkan persistensi offline-first dengan mencerminkan `Y.Doc` ke IndexedDB melalui `y-indexeddb`, lalu kuras antrean pada event `online`.
- Beralih dari textarea biasa ke binding rich-text menggunakan ProseMirror dengan `y-prosemirror`, atau CodeMirror 6 dengan `y-codemirror.next`, dan amati bagaimana protokol yang sama membawa operasi yang lebih kaya.
- Ganti Redis pub/sub dengan Redis Streams dan consumer group ketika Anda membutuhkan fan-out yang dapat diputar ulang dan diakui.
- Lapisi izin dokumen berbasis peran di atas aktor room, dan tambahkan audit log dengan mencatat batch operasi yang diterima beserta identitas penulisnya.
- Pelajari silabus Advanced Svelte untuk streaming SSR, island, dan trade-off deployment tingkat adapter yang cocok dengan batas real-time ini.

## Kesimpulan

Anda telah membangun editor kolaboratif yang memisahkan tanggung jawab dengan rapi: SvelteKit memiliki routing, rendering, dan identitas sesi; aktor room memiliki konsistensi; Yjs memiliki resolusi konflik; Redis memiliki fan-out antar proses; dan klien peramban memiliki reconnection. Setiap batas dapat diuji secara terpisah, yang membuat sistem tetap terpelihara seiring bertambahnya fitur.

Pelajaran yang bertahan bersifat arsitektural, bukan sintaksis. Autentikasi upgrade sebelum handshake dan otorisasi ulang sesudahnya. Persistenkan update CRDT, bukan teks hasil render. Siarkan delta dan biarkan merge idempoten menyerap retry. Batasi fan-out per room dan evict dengan masa tenggang. Benarkan empat keputusan itu, dan transport, binding editor, serta platform deployment semuanya menjadi detail yang dapat diganti.
