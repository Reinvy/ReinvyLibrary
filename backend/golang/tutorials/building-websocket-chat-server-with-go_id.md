---
title: "Membangun Server Chat WebSocket Real-time dengan Go"
description: "Tutorial praktis membangun server chat WebSocket lengkap di Go menggunakan gorilla/websocket, mencakup manajemen koneksi, pesan berbasis ruang, pola konkurensi, dan penghentian server secara graceful."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Server Chat WebSocket Real-time dengan Go

## Ringkasan

Tutorial ini memandu Anda dalam membangun server chat real-time yang lengkap di Go menggunakan library `gorilla/websocket`. Anda akan mempelajari cara mengelola koneksi WebSocket secara konkuren menggunakan pola Hub, mengimplementasikan ruang obrolan dengan penyiaran pesan, menangani siklus hidup klien (terhubung, terputus, tersambung kembali), dan mengoordinasikan goroutine dengan channel untuk penghentian server secara graceful. Di akhir tutorial, Anda akan memiliki server WebSocket siap-produksi yang dapat digunakan oleh banyak klien untuk mengobrol secara real-time.

## Target Audiens

- Pengembang backend dengan pengetahuan Go tingkat menengah (struct, interface, goroutine, channel).
- Pengembang yang telah menyelesaikan tutorial dasar Go dan ingin mendalami jaringan real-time serta konkurensi secara mendalam.
- Insinyur yang ingin memahami pola WebSocket produksi (manajemen koneksi, graceful shutdown, fan-out siaran).

## Prasyarat

- Go versi 1.22 atau lebih baru telah terinstal di komputer Anda.
- Pemahaman dasar sintaks Go (fungsi, struct, method, slice, map).
- Pemahaman dasar tentang HTTP dan model klien-server.
- `curl` dan klien WebSocket (seperti `wscat` yang diinstal melalui `npm install -g wscat`, atau konsol developer peramban).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyiapkan endpoint WebSocket di Go menggunakan `gorilla/websocket` dengan upgrade HTTP.
- Mengimplementasikan pola Hub untuk manajemen koneksi WebSocket terpusat antar goroutine.
- Merancang model pesan berbasis ruang dengan protokol tipe diskriminan menggunakan union.
- Mengoordinasikan siklus hidup goroutine dengan `context.Context`, `sync.WaitGroup`, dan sinyal berbasis channel.
- Menangani siklus hidup koneksi klien: otentikasi, deteksi putus, ping/pong keep-alive, dan penghentian graceful.
- Membangun klien chat berbasis peramban yang berkomunikasi dengan server Go.

## Konteks dan Motivasi

Komunikasi real-time adalah kebutuhan inti untuk aplikasi web modern — sistem chat, notifikasi langsung, pengeditan kolaboratif, game multipemain, dan dashboard langsung semuanya membutuhkan transfer data dua arah dengan latensi rendah. Siklus permintaan-respons HTTP tradisional menimbulkan overhead yang tidak dapat diterima untuk kasus penggunaan ini.

WebSocket, yang distandarisasi sebagai RFC 6455, menyediakan koneksi persisten full-duplex antara klien dan server melalui satu soket TCP. Model konkurensi Go — goroutine dan channel — sangat cocok untuk pemrograman WebSocket: setiap koneksi dapat dikelola oleh goroutine-nya sendiri, dan channel menyediakan komunikasi yang aman dan mudah dikomposisi di antara mereka.

Namun, membangun server WebSocket yang menangani koneksi konkuren, fan-out pesan berbasis ruang, koneksi ulang, dan penghentian graceful melibatkan pola konkurensi yang tidak sepele yang sering dilewatkan oleh tutorial lain. Tutorial ini menjembatani kesenjangan tersebut dengan membangun server chat berkualitas produksi dari awal, menjelaskan setiap keputusan konkurensi di sepanjang proses.

## Konten Inti

### Gambaran Arsitektur

Server chat mengikuti pola **Hub**, sebuah desain terkenal dari contoh Gorilla WebSocket:

```text
Klien A ──ws──▶ Handler WebSocket ──reg──▶ Hub (status terpusat) ──siarkan──▶ Manajer Ruang
Klien B ──ws──▶ Handler WebSocket ──reg──┘                                           │
Klien C ──ws──▶ Handler WebSocket ──gabung──▶ Ruang "general" ◀──pesan──┐            │
Klien D ──ws──▶ Handler WebSocket ──gabung──▶ Ruang "random"  ◀──pesan──┤            │
                                                                                │            │
                                                                                ▼            ▼
                                                                         Siaran ke     Siaran ke
                                                                         Ruang "general" Ruang "random"
```

Tiga jenis goroutine utama berkoordinasi untuk membentuk server:

1. **Goroutine Hub** — memiliki kumpulan utama semua klien terhubung dan status keanggotaan ruang. Ia tidak pernah melakukan penguncian — status terbatas pada satu goroutine, sehingga menghilangkan persaingan mutex.
2. **Goroutine readPump Klien** — satu per koneksi, membaca pesan masuk dari WebSocket, menguraikannya, dan meneruskan tindakan ke Hub melalui channel.
3. **Goroutine writePump Klien** — satu per koneksi, menerima pesan keluar dari channel siaran Hub dan menulisnya ke koneksi WebSocket.

Desain ini memastikan bahwa setiap goroutine memiliki satu tanggung jawab dan berkomunikasi dengan goroutine lain secara eksklusif melalui channel yang telah ditentukan tipenya — ini adalah mantra konkurensi inti Go: "Jangan berkomunikasi dengan berbagi memori; sebaliknya, bagikan memori dengan berkomunikasi."

### Struktur Proyek

```text
chat-server/
├── main.go          # Server HTTP, pendaftaran rute, penghentian graceful
├── hub.go           # Hub pusat: mengelola klien, ruang, perutean pesan
├── client.go        # Klien: pembungkus koneksi WebSocket (readPump, writePump)
├── message.go       # Definisi tipe pesan (protokol union diskriminan)
└── room.go          # Ruang: mengelola kumpulan klien yang berlangganan topik
```

### Desain Protokol Pesan

Semua komunikasi antara klien dan server menggunakan JSON union yang didiskriminasikan. Setiap pesan memiliki bidang `type` yang menentukan strukturnya:

```text
Klien → Server:
  {"type": "join",   "room": "general"}
  {"type": "leave",  "room": "general"}
  {"type": "message","room": "general", "text": "Halo, dunia!"}

Server → Klien:
  {"type": "error",              "text": "Ruang tidak dikenal"}
  {"type": "system",  "room": "general", "text": "Ali bergabung ke ruang"}
  {"type": "message", "room": "general", "sender": "Ali", "text": "Halo, dunia!"}
  {"type": "history", "room": "general", "messages": [...]}
```

Protokol ini sederhana, dapat diperluas, dan mudah diurai di sisi klien.

### Langkah 1: Tipe Pesan dan Protokol

Mulailah dengan mendefinisikan struktur pesan dan fungsi pembantu untuk mengurai pesan masuk:

```go
// message.go
package main

import "encoding/json"

// InboundMessage mewakili pesan yang dikirim dari klien ke server.
type InboundMessage struct {
    Type string `json:"type"`
    Room string `json:"room,omitempty"`
    Text string `json:"text,omitempty"`
}

// OutboundMessage mewakili pesan yang dikirim dari server ke klien.
type OutboundMessage struct {
    Type   string   `json:"type"`
    Room   string   `json:"room,omitempty"`
    Sender string   `json:"sender,omitempty"`
    Text   string   `json:"text,omitempty"`
    List   []string `json:"list,omitempty"`
}

// parseInbound mendekode data JSON mentah menjadi InboundMessage.
func parseInbound(data []byte) (InboundMessage, error) {
    var msg InboundMessage
    if err := json.Unmarshal(data, &msg); err != nil {
        return InboundMessage{}, err
    }
    return msg, nil
}
```

### Langkah 2: Hub — Manajer Status Pusat

Hub adalah koordinator pusat. Ia berjalan sebagai satu goroutine yang memiliki semua status yang dapat diubah, menerima perintah melalui channel yang telah ditentukan tipenya:

```go
// hub.go
package main

// Hub mengelola kumpulan klien aktif dan keanggotaan ruang.
type Hub struct {
    clients    map[*Client]bool          // semua klien terhubung
    rooms      map[string]map[*Client]bool // nama ruang → kumpulan klien
    register   chan *Client              // klien ingin terhubung
    unregister chan *Client              // klien ingin terputus
    broadcast  chan HubMessage           // pesan untuk disiarkan
}

// HubMessage membungkus pesan keluar dengan target ruang opsional.
type HubMessage struct {
    Message OutboundMessage
    Room    string   // jika diisi, siarkan hanya ke ruang ini
    Sender  *Client  // jika diisi, kecualikan klien ini (supresi gema)
}

// NewHub membuat dan mengembalikan instance Hub baru.
func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        rooms:      make(map[string]map[*Client]bool),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        broadcast:  make(chan HubMessage, 256),
    }
}

// Run memulai loop event Hub. Harus dipanggil sebagai goroutine.
func (h *Hub) Run(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        case client := <-h.register:
            h.clients[client] = true
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                // Hapus klien dari semua ruang
                for _, members := range h.rooms {
                    delete(members, client)
                }
                delete(h.clients, client)
                close(client.send)
            }
        case hmsg := <-h.broadcast:
            if hmsg.Room != "" {
                // Siaran khusus ruang
                if members, ok := h.rooms[hmsg.Room]; ok {
                    for client := range members {
                        if client != hmsg.Sender {
                            select {
                            case client.send <- hmsg.Message:
                            default:
                                close(client.send)
                                delete(h.clients, client)
                            }
                        }
                    }
                }
            } else {
                // Siaran global (sistem)
                for client := range h.clients {
                    select {
                    case client.send <- hmsg.Message:
                    default:
                        close(client.send)
                        delete(h.clients, client)
                    }
                }
            }
        }
    }
}
```

Keputusan desain utama di Hub:

- **Konkurensi kepemilikan tunggal**: semua status keanggotaan ruang dan klien hanya dibaca atau diubah oleh goroutine Hub. Tidak perlu mutex.
- **Channel siaran buffer**: buffer `256` menyerap lonjakan sementara volume siaran tanpa memblokir pengirim.
- **Pengiriman non-blocking ke klien**: `select` dengan `default` dalam loop siaran Hub memastikan bahwa klien lambat atau terputus tidak dapat memblokir pengiriman pesan ke semua klien lain. Ini penting untuk keandalan produksi.
- **Penghentian berbasis context**: meneruskan `ctx` ke `Run()` memungkinkan fungsi utama memberi sinyal penghentian dengan bersih.

### Langkah 3: Klien — Siklus Hidup Koneksi

Setiap koneksi WebSocket dibungkus dalam struct `Client` dengan dua goroutine — satu untuk membaca (readPump) dan satu untuk menulis (writePump):

```go
// client.go
package main

import (
    "context"
    "log"
    "time"

    "github.com/gorilla/websocket"
)

const (
    // Waktu yang diizinkan untuk menulis pesan ke peer.
    writeWait = 10 * time.Second

    // Waktu yang diizinkan untuk membaca pesan pong berikutnya dari peer.
    pongWait = 60 * time.Second

    // Kirim ping ke peer dengan periode ini. Harus kurang dari pongWait.
    pingPeriod = (pongWait * 9) / 10

    // Ukuran maksimum pesan yang diizinkan dari peer.
    maxMessageSize = 4096
)

// Client mewakili satu koneksi WebSocket.
type Client struct {
    hub  *Hub
    conn *websocket.Conn
    send chan OutboundMessage
    name string // nama tampilan, diatur setelah pesan pertama
}

// readPump memompa pesan dari koneksi WebSocket ke hub.
func (c *Client) readPump(ctx context.Context) {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        select {
        case <-ctx.Done():
            return
        default:
            _, message, err := c.conn.ReadMessage()
            if err != nil {
                if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
                    log.Printf("kesalahan baca: %v", err)
                }
                return
            }

            inbound, err := parseInbound(message)
            if err != nil {
                c.send <- OutboundMessage{Type: "error", Text: "Format pesan tidak valid"}
                continue
            }

            c.handleMessage(inbound)
        }
    }
}

// handleMessage memproses pesan masuk dan merutekannya melalui hub.
func (c *Client) handleMessage(msg InboundMessage) {
    switch msg.Type {
    case "join":
        if msg.Room == "" {
            c.send <- OutboundMessage{Type: "error", Text: "Nama ruang diperlukan"}
            return
        }
        c.hub.joinRoom(c, msg.Room)

    case "leave":
        c.hub.leaveRoom(c, msg.Room)

    case "message":
        if msg.Room == "" || msg.Text == "" {
            c.send <- OutboundMessage{Type: "error", Text: "Ruang dan teks diperlukan"}
            return
        }
        c.hub.broadcast <- HubMessage{
            Message: OutboundMessage{
                Type:   "message",
                Room:   msg.Room,
                Sender: c.name,
                Text:   msg.Text,
            },
            Room:   msg.Room,
            Sender: c,
        }

    default:
        c.send <- OutboundMessage{Type: "error", Text: "Tipe pesan tidak dikenal: " + msg.Type}
    }
}

// writePump memompa pesan dari hub ke koneksi WebSocket.
func (c *Client) writePump(ctx context.Context) {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()

    for {
        select {
        case <-ctx.Done():
            // Kirim pesan yang tersisa dengan batas waktu
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            c.conn.WriteMessage(websocket.CloseMessage, []byte{})
            return

        case message, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            if err := c.conn.WriteJSON(message); err != nil {
                return
            }

        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

### Langkah 4: Ruang — Manajemen Keanggotaan

Tambahkan metode manajemen ruang ke Hub:

```go
// room.go
package main

import "log"

// joinRoom menambahkan klien ke ruang dan memberi tahu anggota yang ada.
func (h *Hub) joinRoom(c *Client, room string) {
    if h.rooms[room] == nil {
        h.rooms[room] = make(map[*Client]bool)
    }
    h.rooms[room][c] = true

    // Atur nama tampilan dari gabung ruang pertama
    if c.name == "" {
        c.name = "User-" + randomID(4)
    }

    // Beri tahu ruang
    h.broadcast <- HubMessage{
        Message: OutboundMessage{
            Type: "system",
            Room: room,
            Text: c.name + " bergabung ke ruang",
        },
        Room: room,
    }

    log.Printf("Klien %s bergabung ke ruang %s", c.name, room)
}

// leaveRoom menghapus klien dari ruang dan memberi tahu anggota yang tersisa.
func (h *Hub) leaveRoom(c *Client, room string) {
    if members, ok := h.rooms[room]; ok {
        delete(members, c)
        if len(members) == 0 {
            delete(h.rooms, room)
        }
        h.broadcast <- HubMessage{
            Message: OutboundMessage{
                Type: "system",
                Room: room,
                Text: c.name + " meninggalkan ruang",
            },
            Room: room,
        }
        log.Printf("Klien %s meninggalkan ruang %s", c.name, room)
    }
}

// randomID menghasilkan pengenal acak pendek untuk nama tampilan.
func randomID(length int) string {
    const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
    buf := make([]byte, length)
    for i := range buf {
        buf[i] = letters[hashIndex(i, length)]
    }
    return string(buf)
}

func hashIndex(i, length int) int {
    return (i*7 + length*13) % len("abcdefghijklmnopqrstuvwxyz0123456789")
}
```

### Langkah 5: Server HTTP dengan Upgrade WebSocket dan Penghentian Graceful

Gabungkan semuanya di `main.go`:

```go
// main.go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true // Izinkan semua asal untuk pengembangan
    },
}

func main() {
    hub := NewHub()
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Mulai loop event Hub
    go hub.Run(ctx)

    // Endpoint WebSocket
    http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
        serveWS(hub, w, r)
    })

    // Endpoint kesehatan
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"ok"}`))
    })

    server := &http.Server{
        Addr:         ":8080",
        Handler:      nil,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
    }

    // Mulai server HTTP
    go func() {
        log.Printf("Server chat dimulai di :8080")
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("kesalahan listen: %v", err)
        }
    }()

    // Penghentian graceful
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    log.Println("Mematikan server...")

    // Batalkan konteks Hub (menghentikan loop Run Hub)
    cancel()

    // Beri waktu koneksi yang ada untuk menguras
    shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer shutdownCancel()

    if err := server.Shutdown(shutdownCtx); err != nil {
        log.Fatalf("Server terpaksa dimatikan: %v", err)
    }

    log.Println("Server berhenti dengan bersih")
}

// serveWS menangani jabat tangan upgrade WebSocket.
func serveWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("kesalahan upgrade: %v", err)
        return
    }

    client := &Client{
        hub:  hub,
        conn: conn,
        send: make(chan OutboundMessage, 256),
    }

    hub.register <- client

    // Mulai readPump dan writePump di goroutine terpisah
    ctx := context.Background()
    go client.writePump(ctx)
    go client.readPump(ctx)
}
```

### Langkah 6: Menjalankan Server

Buat file `go.mod` dan instal dependensi:

```bash
go mod init chat-server
go get github.com/gorilla/websocket
```

Jalankan server:

```bash
go run .
```

### Langkah 7: Pengujian dengan wscat

Di jendela terminal, mulai server:

```bash
go run .
```

Di terminal kedua, hubungkan menggunakan `wscat`:

```bash
# Instal wscat jika diperlukan
npm install -g wscat

# Hubungkan ke server
wscat -c ws://localhost:8080/ws
```

Setelah terhubung, kirim perintah JSON:

```json
{"type": "join", "room": "general"}
{"type": "message", "room": "general", "text": "Halo dari wscat!"}
{"type": "leave", "room": "general"}
```

Buka terminal kedua dengan koneksi `wscat` lain untuk melihat penyiaran pesan real-time antar klien.

## Contoh Kode

### Contoh Lengkap — Klien Chat Peramban

Simpan file HTML berikut dan buka di peramban saat server Go sedang berjalan:

```html
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Go WebSocket Chat</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, sans-serif; background: #1a1a2e; color: #eee; display: flex; height: 100vh; }
        #app { display: flex; width: 100%; max-width: 900px; margin: auto; height: 80vh; }
        #sidebar { width: 200px; background: #16213e; padding: 16px; border-radius: 8px 0 0 8px; }
        #sidebar h3 { margin-bottom: 8px; color: #0f3460; }
        #room-list { list-style: none; }
        #room-list li { padding: 4px 8px; cursor: pointer; border-radius: 4px; }
        #room-list li:hover { background: #0f3460; }
        #room-list li.active { background: #e94560; color: #fff; }
        #chat { flex: 1; display: flex; flex-direction: column; background: #0f3460; border-radius: 0 8px 8px 0; }
        #messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .msg { padding: 8px 12px; border-radius: 8px; max-width: 70%; background: #1a1a2e; }
        .msg.system { background: transparent; color: #aaa; font-style: italic; font-size: 0.9em; text-align: center; }
        .msg.self { align-self: flex-end; background: #e94560; }
        .sender { font-size: 0.8em; font-weight: bold; color: #e94560; margin-bottom: 2px; }
        #input-bar { display: flex; padding: 12px; gap: 8px; background: #16213e; border-radius: 0 0 8px 0; }
        #input { flex: 1; padding: 10px; border: none; border-radius: 4px; background: #1a1a2e; color: #eee; }
        #send { padding: 10px 20px; background: #e94560; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        #status { position: fixed; top: 16px; right: 16px; padding: 8px 16px; border-radius: 4px; font-size: 0.9em; }
        .connected { background: #2ecc71; color: #fff; }
        .disconnected { background: #e74c3c; color: #fff; }
    </style>
</head>
<body>
    <div id="status" class="disconnected">Terputus</div>
    <div id="app">
        <div id="sidebar">
            <h3>Ruang</h3>
            <ul id="room-list">
                <li data-room="general"># general</li>
                <li data-room="random"># random</li>
                <li data-room="golang"># golang</li>
            </ul>
        </div>
        <div id="chat">
            <div id="messages"></div>
            <div id="input-bar">
                <input id="input" type="text" placeholder="Ketik pesan..." />
                <button id="send">Kirim</button>
            </div>
        </div>
    </div>
    <script>
        const status = document.getElementById('status');
        const messages = document.getElementById('messages');
        const input = document.getElementById('input');
        const sendBtn = document.getElementById('send');
        const roomList = document.getElementById('room-list');

        let ws = null;
        let currentRoom = 'general';
        let userName = 'User-' + Math.random().toString(36).slice(2, 6);

        function connect() {
            ws = new WebSocket('ws://localhost:8080/ws');

            ws.onopen = () => {
                status.textContent = 'Terhubung';
                status.className = 'connected';
                ws.send(JSON.stringify({ type: 'join', room: currentRoom }));
            };

            ws.onclose = () => {
                status.textContent = 'Terputus';
                status.className = 'disconnected';
                setTimeout(connect, 3000);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const div = document.createElement('div');

                if (data.type === 'system') {
                    div.className = 'msg system';
                    div.textContent = data.text;
                } else if (data.type === 'error') {
                    div.className = 'msg system';
                    div.style.color = '#e74c3c';
                    div.textContent = 'Error: ' + data.text;
                } else if (data.type === 'message') {
                    div.className = 'msg';
                    if (data.sender === userName) div.classList.add('self');
                    div.innerHTML = `<div class="sender">${data.sender}</div>${data.text}`;
                }

                messages.appendChild(div);
                messages.scrollTop = messages.scrollHeight;
            };
        }

        function sendMessage() {
            const text = input.value.trim();
            if (!text || !ws) return;
            ws.send(JSON.stringify({ type: 'message', room: currentRoom, text }));
            input.value = '';
        }

        function switchRoom(room) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'leave', room: currentRoom }));
                ws.send(JSON.stringify({ type: 'join', room }));
            }
            currentRoom = room;
            document.querySelectorAll('#room-list li').forEach(li => li.classList.remove('active'));
            document.querySelector(`[data-room="${room}"]`).classList.add('active');
            messages.innerHTML = '';
        }

        roomList.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li) switchRoom(li.dataset.room);
        });

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

        connect();
    </script>
</body>
</html>
```

Buka file HTML di dua tab peramban. Keduanya terhubung ke server Go yang sama dan dapat mengobrol secara real-time di berbagai ruang.

## Insight Penting

- **Pola Hub menghilangkan mutex**: Dengan membatasi semua status bersama ke satu goroutine dan menggunakan channel untuk komunikasi, Hub menghindari kompleksitas dan jebakan sinkronisasi berbasis mutex. Ini adalah pendekatan idiomatis Go untuk status bersama.
- **Pengiriman non-blocking mencegah back-pressure siaran**: `select` dengan `default` dalam loop siaran Hub memastikan bahwa klien lambat atau terputus tidak dapat memblokir pengiriman pesan ke semua klien lain. Ini penting untuk keandalan produksi.
- **Ping/pong keep-alive mendeteksi koneksi mati**: Library `gorilla/websocket` menyediakan penangan ping/pong bawaan. Mengatur batas waktu baca dan penangan pong memastikan bahwa koneksi basi terdeteksi dan dibersihkan dalam jendela `pongWait` (60 detik dalam contoh ini).
- **Pembatalan berbasis context untuk penghentian graceful**: Meneruskan `context.Context` ke goroutine dan memilih `<-ctx.Done()` memungkinkan server dimatikan tanpa menghentikan koneksi yang sedang berlangsung secara tiba-tiba. Jendela pengurasan 10 detik memberi waktu klien untuk menyambung kembali.
- **Pasangan batas waktu baca dan penangan pong**: `SetReadDeadline` diperpanjang setiap kali pong diterima. Ini menciptakan mekanisme detak jantung sederhana: jika tidak ada data yang tiba dalam `pongWait`, koneksi dianggap mati. Selalu pasangkan keduanya — mengatur salah satu tanpa yang lain menyebabkan pemutusan prematur atau koneksi mati yang tidak terdeteksi.
- **Versi protokol pesan**: Protokol JSON yang didiskriminasikan berdasarkan tipe (`"type": "message"`, `"type": "join"`, dll.) mudah diperluas. Menambahkan tipe pesan baru (misalnya, `"typing"` untuk indikator mengetik) hanya memerlukan penambahan case baru ke switch `handleMessage` tanpa memutus klien yang ada.

## Langkah Berikutnya

- Jelajahi otentikasi dengan menerbitkan token JWT sebelum mengizinkan koneksi WebSocket (validasi token di `serveWS`).
- Tambahkan persistensi pesan dengan PostgreSQL atau Redis agar klien melihat riwayat saat bergabung ke ruang.
- Implementasikan penskalaan horizontal menggunakan Redis Pub/Sub sebagai bus pesan antara beberapa instance server Go.
- Bangun klien yang lebih canggih dengan React, Vue.js, atau kerangka kerja seluler (lihat tutorial Flutter atau React Native di perpustakaan ini).
- Pelajari [dokumentasi Gorilla WebSocket](https://github.com/gorilla/websocket) untuk fitur lanjutan seperti kompresi, subprotokol, dan dukungan TLS.
- Tinjau [panduan pola konkurensi Go](../guides/golang-concurrency-patterns-guide.md) di perpustakaan ini untuk cakupan lebih dalam tentang pipeline, fan-out/fan-in, dan pola errgroup.

## Kesimpulan

Dalam tutorial ini, Anda telah membangun server chat WebSocket real-time yang lengkap di Go menggunakan library `gorilla/websocket`. Anda mempelajari cara mengimplementasikan pola Hub untuk manajemen koneksi terpusat, mendesain protokol pesan berbasis JSON dengan tipe union diskriminan, mengelola keanggotaan ruang dengan penyiaran konkuren yang aman, dan menangani penghentian graceful dengan pembatalan context. Pola-pola ini — goroutine pemilik tunggal, komunikasi berbasis channel, fan-out non-blocking, dan manajemen koneksi yang sadar siklus hidup — dapat langsung diterapkan ke aplikasi Go real-time apa pun, dari dashboard langsung hingga game multipemain hingga alat pengeditan kolaboratif.
