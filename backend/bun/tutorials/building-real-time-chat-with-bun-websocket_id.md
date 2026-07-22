---
title: "Membangun Aplikasi Chat Real-time dengan Bun WebSocket"
description: "Tutorial berbasis proyek untuk membangun aplikasi chat grup real-time menggunakan dukungan WebSocket bawaan Bun. Mencakup penanganan WebSocket di sisi server, manajemen ruang obrolan, dan klien berbasis browser."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Chat Real-time dengan Bun WebSocket

## Ringkasan

Dalam tutorial berbasis proyek ini, Anda akan membangun aplikasi chat grup real-time yang berfungsi penuh menggunakan API WebSocket bawaan Bun. Anda akan mempelajari cara menangani koneksi WebSocket, mengelola ruang obrolan, menyiarkan pesan, dan membangun antarmuka klien berbasis browser — semuanya tanpa ketergantungan eksternal selain Bun itu sendiri.

## Target Audiens

- Pengembang backend dan pengembang JavaScript/TypeScript yang tertarik pada aplikasi real-time.
- Pengembang yang memiliki pengetahuan dasar tentang Bun dan ingin mengeksplorasi kemampuan WebSocket-nya.
- Pengembang tingkat menengah yang nyaman dengan JavaScript dan pemrograman async.

## Prasyarat

- Bun terinstal di sistem Anda (lihat tutorial [Memulai dengan Bun](/backend/bun/tutorials/getting-started-with-bun)).
- Pengetahuan dasar JavaScript (ES modules, arrow functions, `async`/`await`).
- Browser web modern untuk menguji klien chat.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyiapkan server HTTP Bun dengan dukungan WebSocket menggunakan `Bun.serve()`.
- Menangani event siklus hidup WebSocket (`open`, `message`, `close`) di sisi server.
- Mengimplementasikan sistem chat berbasis ruang dengan penyiaran pesan.
- Membangun klien WebSocket berbasis browser dengan antarmuka chat.
- Mengelola status koneksi, heartbeat ping, dan pemutusan koneksi yang baik.
- Men-deploy server WebSocket Bun untuk penggunaan produksi.

## Konteks dan Motivasi

Komunikasi real-time adalah fondasi aplikasi web modern — mulai dari aplikasi chat dan notifikasi langsung hingga pengeditan kolaboratif dan game multipemain. Pengaturan Node.js tradisional memerlukan pustaka eksternal seperti `socket.io` atau `ws` untuk menangani koneksi WebSocket, menambah kompleksitas pada pohon dependensi dan konfigurasi.

Bun mengubah hal ini dengan menyematkan dukungan WebSocket langsung ke dalam runtime server HTTP-nya. Dengan `Bun.serve()`, Anda dapat menangani permintaan HTTP dan koneksi WebSocket dalam satu instance server menggunakan objek konfigurasi terpadu — tanpa paket tambahan, tanpa middleware, tanpa pengaturan yang rumit. Ini menjadikan Bun pilihan yang sangat baik untuk membangun layanan real-time yang ringan dan berkinerja tinggi.

Dalam proyek ini, Anda akan membangun aplikasi chat grup di mana pengguna dapat bergabung ke ruang obrolan, mengirim pesan, dan melihat pembaruan secara real-time. Pola yang sama yang Anda pelajari dapat langsung diterapkan untuk membangun dashboard langsung, sistem notifikasi, dan alat kolaboratif.

## Konten Inti

### Persiapan Proyek

Buat direktori baru dan inisialisasi proyek Bun:

```bash
mkdir bun-chat-app
cd bun-chat-app
bun init -y
```

Flag `-y` membuat `package.json` dan `tsconfig.json` minimal. Tidak diperlukan dependensi eksternal — semua yang kita gunakan berasal dari API bawaan Bun.

### Bun.serve() dengan Dukungan WebSocket

`Bun.serve()` milik Bun menerima objek konfigurasi `websocket` di samping handler `fetch` standar. Pengaturan mode ganda ini memungkinkan satu server memproses permintaan HTTP (seperti melayani HTML klien chat) dan mengelola koneksi WebSocket secara bersamaan.

Objek `websocket` memerlukan tiga fungsi handler:

| Handler | Tujuan |
|---------|--------|
| `open(ws)` | Dipanggil ketika koneksi WebSocket baru dibuat |
| `message(ws, data)` | Dipanggil ketika server menerima pesan dari klien |
| `close(ws)` | Dipanggil ketika klien terputus |

Berikut adalah kerangka server dasar:

```typescript
const server = Bun.serve({
  port: 3000,
  
  // Handler HTTP — melayani halaman klien chat
  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("./index.html"));
    }
    
    return new Response("Not Found", { status: 404 });
  },
  
  // Handler WebSocket
  websocket: {
    open(ws) {
      console.log(`Klien terhubung`);
    },
    
    message(ws, data) {
      console.log(`Diterima: ${data}`);
    },
    
    close(ws) {
      console.log(`Klien terputus`);
    },
  },
});

console.log(`Server berjalan di ${server.hostname}:${server.port}`);
```

### Arsitektur Manajemen Ruang

Aplikasi chat kita perlu mendukung banyak ruang. Setiap ruang adalah area bernama di mana klien yang terhubung dapat bertukar pesan. Pesan yang dikirim di satu ruang hanya boleh mencapai anggota lain di ruang yang sama — bukan seluruh server.

Kita akan melacak ruang dengan `Map` dalam memori:

```typescript
type ClientData = {
  username: string;
  room: string;
};

const rooms = new Map<string, Set<ServerWebSocket<ClientData>>>();
```

Setiap koneksi WebSocket membawa metadata bertipe (`ClientData`) yang menyimpan nama pengguna yang dipilih dan ruang yang telah mereka masuki. API WebSocket Bun mendukung data bertipe per-socket melalui tipe generik `ServerWebSocket<T>`, yang kita atur saat memanggil `ws.data`.

Ketika klien mengirim pesan `join`, kita mendaftarkan mereka di ruang tersebut. Ketika mereka mengirim tipe `message`, kita menyiarkannya ke semua anggota lain di ruang yang sama.

### Protokol Pesan

Kita mendefinisikan protokol berbasis JSON yang sederhana untuk komunikasi klien-server:

```typescript
type IncomingMessage = 
  | { type: "join"; username: string; room: string }
  | { type: "message"; text: string }
  | { type: "ping" };

type OutgoingMessage =
  | { type: "system"; content: string }
  | { type: "chat"; username: string; text: string; timestamp: number }
  | { type: "user-joined"; username: string }
  | { type: "user-left"; username: string }
  | { type: "room-users"; users: string[] }
  | { type: "error"; content: string };
```

Menggunakan union yang didiskriminasi pada field `type` membuat penguraian pesan menjadi dapat diprediksi dan aman dari segi tipe.

### Implementasi Server Lengkap

Sekarang mari kita rangkai logika server secara lengkap:

```typescript
import { ServerWebSocket } from "bun";

type ClientData = {
  username: string;
  room: string;
};

const rooms = new Map<string, Set<ServerWebSocket<ClientData>>>();

function broadcastToRoom(room: string, message: object, exclude?: ServerWebSocket<ClientData>) {
  const clients = rooms.get(room);
  if (!clients) return;
  
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (exclude && client === exclude) continue;
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function getRoomUsers(room: string): string[] {
  const clients = rooms.get(room);
  if (!clients) return [];
  return Array.from(clients).map((ws) => ws.data.username);
}

function removeFromRooms(ws: ServerWebSocket<ClientData>) {
  for (const [roomName, clients] of rooms.entries()) {
    if (clients.has(ws)) {
      clients.delete(ws);
      
      // Beri tahu pengguna yang tersisa
      broadcastToRoom(roomName, {
        type: "user-left",
        username: ws.data.username,
      });
      
      broadcastToRoom(roomName, {
        type: "room-users",
        users: getRoomUsers(roomName),
      });
      
      // Bersihkan ruang kosong
      if (clients.size === 0) {
        rooms.delete(roomName);
      }
      break;
    }
  }
}

const server = Bun.serve<ClientData>({
  port: 3000,
  
  async fetch(request, server) {
    const url = new URL(request.url);
    
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("./index.html"));
    }
    
    // Endpoint upgrade WebSocket
    if (url.pathname === "/chat") {
      const upgraded = server.upgrade(request);
      if (!upgraded) {
        return new Response("Gagal upgrade WebSocket", { status: 400 });
      }
      return undefined;
    }
    
    return new Response("Not Found", { status: 404 });
  },
  
  websocket: {
    open(ws) {
      console.log(`Koneksi WebSocket baru`);
    },
    
    message(ws, data) {
      try {
        const msg: IncomingMessage = JSON.parse(data.toString());
        
        switch (msg.type) {
          case "join": {
            const username = msg.username.trim();
            const room = msg.room.trim();
            
            if (!username || !room) {
              ws.send(JSON.stringify({
                type: "error",
                content: "Username dan room wajib diisi",
              }));
              return;
            }
            
            ws.data = { username, room };
            
            if (!rooms.has(room)) {
              rooms.set(room, new Set());
            }
            rooms.get(room)!.add(ws);
            
            ws.send(JSON.stringify({
              type: "system",
              content: `Selamat datang di #${room}`,
            }));
            
            broadcastToRoom(room, {
              type: "user-joined",
              username,
            }, ws);
            
            broadcastToRoom(room, {
              type: "room-users",
              users: getRoomUsers(room),
            });
            break;
          }
          
          case "message": {
            if (!ws.data || !ws.data.room) {
              ws.send(JSON.stringify({
                type: "error",
                content: "Anda harus bergabung ke room sebelum mengirim pesan",
              }));
              return;
            }
            
            broadcastToRoom(ws.data.room, {
              type: "chat",
              username: ws.data.username,
              text: msg.text,
              timestamp: Date.now(),
            }, ws);
            break;
          }
          
          case "ping": {
            ws.send(JSON.stringify({ type: "pong" }));
            break;
          }
          
          default:
            ws.send(JSON.stringify({
              type: "error",
              content: `Tipe pesan tidak dikenal: ${msg.type}`,
            }));
        }
      } catch (err) {
        ws.send(JSON.stringify({
          type: "error",
          content: "Format pesan tidak valid",
        }));
      }
    },
    
    close(ws) {
      if (ws.data) {
        removeFromRooms(ws);
        console.log(`Pengguna ${ws.data.username} terputus`);
      }
    },
  },
});

console.log(`Server chat berjalan di http://localhost:${server.port}`);
```

Keputusan desain utama dalam implementasi ini:

- **Isolasi ruang**: Fungsi `broadcastToRoom` hanya mengirim pesan ke klien di ruang yang sama. Pengguna di ruang berbeda tidak akan melihat pesan satu sama lain.
- **Pembersihan stateful**: Ketika klien terputus, `removeFromRooms` memberi tahu anggota yang tersisa dan membersihkan ruang kosong.
- **Data bertipe**: `ServerWebSocket<T>` milik Bun membawa metadata per-koneksi melalui `ws.data`, menghindari tabel pencarian eksternal.
- **Batas kesalahan**: Setiap penguraian pesan dibungkus dalam try-catch, dan tipe pesan yang tidak dikenal dilaporkan kembali ke klien.

### Klien Chat Berbasis Browser

Klien adalah satu file HTML yang dilayani oleh server Bun. Ini menggunakan API `WebSocket` bawaan yang tersedia di semua browser modern:

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bun Chat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; height: 100vh; display: flex; justify-content: center; align-items: center; }
    #app { width: 480px; max-width: 100vw; height: 600px; display: flex; flex-direction: column; border: 1px solid #16213e; border-radius: 12px; overflow: hidden; }
    #join-screen { display: flex; flex-direction: column; gap: 12px; padding: 24px; background: #16213e; height: 100%; justify-content: center; }
    #join-screen h1 { text-align: center; margin-bottom: 8px; color: #0f3460; }
    #join-screen input { padding: 10px 14px; border: 1px solid #0f3460; border-radius: 8px; background: #1a1a2e; color: #e0e0e0; font-size: 14px; }
    #join-screen button { padding: 10px; border: none; border-radius: 8px; background: #0f3460; color: #e0e0e0; font-size: 14px; font-weight: 600; cursor: pointer; }
    #join-screen button:hover { background: #533483; }
    #chat-screen { display: none; flex-direction: column; height: 100%; }
    #messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; background: #1a1a2e; }
    .msg { padding: 8px 12px; border-radius: 8px; max-width: 80%; line-height: 1.4; }
    .msg.self { background: #0f3460; align-self: flex-end; }
    .msg.other { background: #16213e; align-self: flex-start; }
    .msg.system { background: transparent; color: #888; font-size: 12px; text-align: center; align-self: center; }
    .msg .author { font-size: 11px; font-weight: 600; color: #533483; margin-bottom: 2px; }
    .msg .time { font-size: 10px; color: #666; text-align: right; margin-top: 2px; }
    #input-bar { display: flex; padding: 12px; gap: 8px; background: #16213e; }
    #input-bar input { flex: 1; padding: 10px 14px; border: 1px solid #0f3460; border-radius: 8px; background: #1a1a2e; color: #e0e0e0; font-size: 14px; }
    #input-bar button { padding: 10px 18px; border: none; border-radius: 8px; background: #0f3460; color: #e0e0e0; font-size: 14px; font-weight: 600; cursor: pointer; }
    #input-bar button:hover { background: #533483; }
    #room-header { padding: 12px 16px; background: #0f3460; font-weight: 600; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
    #room-header #user-count { font-size: 12px; color: #aaa; }
    .error-msg { color: #e74c3c; text-align: center; padding: 4px; font-size: 13px; }
  </style>
</head>
<body>
<div id="app">
  <div id="join-screen">
    <h1>💬 Bun Chat</h1>
    <input id="username-input" placeholder="Nama Pengguna" autofocus />
    <input id="room-input" placeholder="Nama ruang (misal: umum)" />
    <button id="join-btn">Masuk Ruang</button>
    <div id="join-error" class="error-msg"></div>
  </div>
  <div id="chat-screen">
    <div id="room-header">
      <span id="room-name"></span>
      <span id="user-count">0 pengguna</span>
    </div>
    <div id="messages"></div>
    <div id="input-bar">
      <input id="message-input" placeholder="Ketik pesan..." />
      <button id="send-btn">Kirim</button>
    </div>
  </div>
</div>

<script>
  const WS_URL = `ws://${location.host}/chat`;
  let ws = null;
  let username = "";
  let room = "";

  const $joinScreen = document.getElementById("join-screen");
  const $chatScreen = document.getElementById("chat-screen");
  const $messages = document.getElementById("messages");
  const $usernameInput = document.getElementById("username-input");
  const $roomInput = document.getElementById("room-input");
  const $joinBtn = document.getElementById("join-btn");
  const $joinError = document.getElementById("join-error");
  const $messageInput = document.getElementById("message-input");
  const $sendBtn = document.getElementById("send-btn");
  const $roomName = document.getElementById("room-name");
  const $userCount = document.getElementById("user-count");

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", username, room }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      handleMessage(msg);
    };

    ws.onclose = () => {
      appendMessage("system", "Terputus dari server. Menyambung ulang dalam 3 detik...");
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      appendMessage("system", "Kesalahan koneksi. Silakan coba lagi.");
    };
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case "system":
        appendMessage("system", msg.content);
        break;
      case "chat":
        appendMessage(msg.username === username ? "self" : "other", msg.text, msg.username, msg.timestamp);
        break;
      case "user-joined":
        appendMessage("system", `${msg.username} bergabung ke ruang`);
        break;
      case "user-left":
        appendMessage("system", `${msg.username} meninggalkan ruang`);
        break;
      case "room-users":
        $userCount.textContent = `${msg.users.length} pengguna`;
        break;
      case "error":
        appendMessage("system", "Error: " + msg.content);
        break;
      case "pong":
        break;
    }
  }

  function appendMessage(type, content, author, timestamp) {
    const div = document.createElement("div");
    div.className = `msg ${type}`;

    if (type === "system") {
      div.textContent = content;
    } else {
      const authorEl = document.createElement("div");
      authorEl.className = "author";
      authorEl.textContent = type === "self" ? "Anda" : author;
      div.appendChild(authorEl);

      const textEl = document.createElement("div");
      textEl.textContent = content;
      div.appendChild(textEl);

      if (timestamp) {
        const timeEl = document.createElement("div");
        timeEl.className = "time";
        timeEl.textContent = new Date(timestamp).toLocaleTimeString();
        div.appendChild(timeEl);
      }
    }

    $messages.appendChild(div);
    $messages.scrollTop = $messages.scrollHeight;
  }

  function joinRoom() {
    username = $usernameInput.value.trim();
    room = $roomInput.value.trim() || "umum";

    if (!username) {
      $joinError.textContent = "Silakan masukkan nama pengguna.";
      return;
    }

    $joinError.textContent = "";
    $joinScreen.style.display = "none";
    $chatScreen.style.display = "flex";
    $roomName.textContent = `#${room}`;
    connect();
  }

  function sendMessage() {
    const text = $messageInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "message", text }));
    $messageInput.value = "";
    $messageInput.focus();
  }

  // Event listeners
  $joinBtn.addEventListener("click", joinRoom);
  $roomInput.addEventListener("keydown", (e) => { if (e.key === "Enter") joinRoom(); });
  $usernameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") $roomInput.focus(); });
  $sendBtn.addEventListener("click", sendMessage);
  $messageInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
</script>
</body>
</html>
```

### Menjalankan Aplikasi Chat

Jalankan server:

```bash
bun run server.ts
```

Buka `http://localhost:3000` di dua tab browser. Masukkan nama pengguna yang berbeda dan nama ruang yang sama (misalnya `umum`). Pesan yang diketik di satu tab akan muncul di tab lain secara real-time.

Untuk menguji isolasi ruang, buka tab ketiga dan masukkan nama ruang yang berbeda. Pesan yang dikirim di `umum` tidak akan muncul di ruang lain dan sebaliknya.

### Pertimbangan Produksi

Untuk deployment produksi, pertimbangkan peningkatan berikut:

- **Riwayat pesan persisten**: Simpan pesan chat di database SQLite (menggunakan `bun:sqlite` bawaan Bun) sehingga pesan lama bertahan setelah server restart.
- **Autentikasi**: Minta token atau sesi sebelum mengizinkan upgrade WebSocket. `server.upgrade(request)` milik Bun dapat memeriksa cookie atau header dari permintaan HTTP awal.
- **Skalabilitas horizontal**: Gunakan Redis Pub/Sub untuk menyinkronkan pesan di beberapa instance server Bun di belakang load balancer.
- **Pembatasan laju**: Lacak frekuensi pesan per pengguna dan putuskan klien yang melebihi batas.
- **Dukungan TLS**: Bun.serve menerima konfigurasi `tls: { key, cert }` untuk WebSocket aman (wss://).

## Contoh Kode

Kode sumber proyek lengkap tersedia dalam dua file. Jalankan server dan buka klien di browser Anda:

```bash
# Buat proyek
mkdir bun-chat-app && cd bun-chat-app
bun init -y

# Simpan server.ts dengan kode server lengkap di atas
# Simpan index.html dengan kode klien HTML lengkap di atas

# Jalankan server
bun run server.ts
```

## Insight Penting

- **API terpadu Bun menyederhanakan pengembangan real-time**: Dengan `Bun.serve()`, HTTP dan WebSocket berbagi konfigurasi dan port yang sama — tidak diperlukan pustaka WebSocket terpisah atau pengaturan middleware. Ini mengurangi boilerplate dan menjaga basis kode tetap ramping.

- **Manajemen ruang sepenuhnya tanggung jawab Anda**: Bun menyediakan primitif WebSocket mentah (open, message, close) tetapi tidak menyertakan abstraksi ruang atau saluran bawaan. Implementasi ruang kami menggunakan `Map<string, Set<ServerWebSocket>>` ringan dan memadai untuk skala menengah, tetapi untuk aplikasi multi-ruang yang masif, pertimbangkan manajemen saluran berbasis Redis.

- **Data bertipe per-socket mencegah korupsi**: Mengatur `ws.data` selama handler `join` berarti setiap handler pesan berikutnya memiliki akses langsung ke identitas dan ruang pengguna. Ini menghindari jebakan umum pemeliharaan peta eksternal yang bisa tidak sinkron dengan status koneksi yang sebenarnya.

- **Koneksi ulang otomatis di sisi klien**: Dalam klien browser, handler `ws.onclose` secara otomatis menyambung ulang setelah 3 detik. Ini menangani masalah jaringan sementara dengan baik, tetapi Anda harus menerapkan exponential backoff dan batas percobaan maksimum untuk penggunaan produksi.

- **Manajemen memori sangat penting**: Setiap koneksi WebSocket menyimpan sumber daya sampai ditutup secara eksplisit. Selalu bersihkan referensi di handler `close` — pengumpul sampah Bun tidak dapat mengklaim kembali koneksi yang masih dirujuk di peta ruang.

- **WebSocket produksi memerlukan sticky sessions atau lapisan state bersama**: Saat diskalakan di beberapa instance Bun, koneksi WebSocket klien terikat ke satu server. Gunakan Redis, NATS, atau sejenisnya untuk menyiarkan pesan di seluruh instance.

## Langkah Berikutnya

- Jelajahi modul **`bun:sqlite`** milik Bun untuk menambahkan persistensi pesan ke aplikasi chat Anda sehingga riwayat bertahan setelah server restart.
- Bangun di atas fondasi ini dengan menambahkan **pesan pribadi**, **berbagi file**, atau **indikator pengetikan** menggunakan protokol WebSocket yang sudah Anda pahami.
- Baca [Panduan Pola Produksi Bun](/backend/bun/guides/bun-production-patterns-guide) untuk praktik terbaik deployment dan penskalaan.
- Pelajari [standar WebSocket (RFC 6455)](https://datatracker.ietf.org/doc/html/rfc6455) untuk pemahaman lebih dalam tentang tipe frame, masking, dan control frame.

## Kesimpulan

Dalam tutorial ini, Anda telah membangun aplikasi chat grup real-time menggunakan API WebSocket bawaan Bun. Anda mempelajari cara mengonfigurasi handler WebSocket di `Bun.serve()`, mengimplementasikan penyiaran pesan berbasis ruang, mengelola siklus hidup koneksi, dan membangun klien berbasis browser. Pola-pola ini dapat langsung diterapkan ke fitur real-time apa pun — dari notifikasi langsung dan dashboard hingga alat pengeditan kolaboratif — dan menunjukkan bagaimana desain terintegrasi Bun mengurangi kompleksitas dibandingkan dengan pengaturan WebSocket Node.js tradisional.
