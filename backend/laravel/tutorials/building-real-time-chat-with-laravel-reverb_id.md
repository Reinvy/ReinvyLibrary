---
title: "Membangun Aplikasi Chat Real-Time dengan Laravel Reverb"
description: "Panduan langkah demi langkah untuk membangun aplikasi chat real-time menggunakan server WebSocket Laravel Reverb, penyiaran event, Laravel Echo, dan presence channels."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Chat Real-Time dengan Laravel Reverb

## Ringkasan

Tutorial ini memandu Anda dalam membangun aplikasi chat real-time yang lengkap menggunakan Laravel Reverb — server WebSocket first-party milik Laravel yang skalabel. Anda akan mempelajari cara menginstal dan mengonfigurasi Reverb, mengimplementasikan penyiaran event (event broadcasting) dengan sistem broadcasting Laravel, mengautentikasi koneksi WebSocket menggunakan Sanctum, mengelola ruang obrolan dan pesan pribadi, menggunakan presence channels untuk melacak status online, serta mengintegrasikan Laravel Echo di sisi klien. Pada akhirnya, Anda akan memiliki sistem chat real-time siap produksi dengan dukungan multi-ruang, indikator pengetikan, dan kehadiran pengguna.

## Target Audiens

- Backend Developer dan Fullstack Developer yang ingin membangun fitur real-time dengan Laravel.
- Tingkat mahir — mengasumsikan pemahaman tentang dasar-dasar Laravel, Eloquent, autentikasi, dan JavaScript.

## Prasyarat

- Aplikasi Laravel 11.x dengan autentikasi dasar (Sanctum atau Laravel Breeze).
- PHP 8.2+ dengan ekstensi `ext-pcntl` untuk menjalankan Reverb.
- Node.js dan NPM terinstal untuk Laravel Echo dan Vite.
- Composer terinstal secara global.
- Pemahaman dasar tentang konsep WebSocket dan arsitektur berbasis event.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginstal dan mengonfigurasi Laravel Reverb sebagai server WebSocket mandiri.
- Mendefinisikan saluran broadcasting dan mengimplementasikan kelas event untuk pesan real-time.
- Mengautentikasi koneksi WebSocket menggunakan autentikasi token dan cookie Sanctum.
- Membangun sistem chat multi-ruang dengan private dan presence channels.
- Mengimplementasikan indikator pengetikan menggunakan fungsi whisper pada saluran.
- Mengintegrasikan Laravel Echo di sisi klien dengan React atau JavaScript murni.
- Menskalakan Reverb secara horizontal menggunakan Redis dan beberapa instance server.

## Konteks dan Motivasi

Komunikasi real-time telah menjadi kebutuhan fundamental dalam aplikasi web modern. Sistem chat, notifikasi langsung, pengeditan kolaboratif, dan dashboard real-time semuanya bergantung pada komunikasi dua arah yang persisten antara server dan klien. Siklus request-response HTTP tradisional tidak cocok untuk kasus penggunaan ini — mereka memerlukan polling yang membuang bandwidth dan menambah latensi.

Laravel Reverb, yang diperkenalkan di Laravel 11, menyediakan solusi first-party untuk masalah ini. Tidak seperti layanan pihak ketiga seperti Pusher atau Ably, Reverb berjalan di infrastruktur Anda sendiri, menghilangkan biaya per-koneksi dan menjaga data tetap berada dalam batas jaringan Anda. Reverb memanfaatkan sistem broadcasting Laravel yang sudah ada, sehingga pengembang yang sudah memahami event dan channels Laravel dapat menambahkan kemampuan real-time dengan sedikit pembelajaran tambahan.

Reverb menggunakan protokol WebSocket secara langsung, menghindari overhead dari fallback HTTP long-polling. Reverb mendukung Laravel Echo di sisi klien, terintegrasi secara mulus dengan sistem autentikasi Laravel, dan dapat diskalakan secara horizontal melalui Redis. Untuk tim yang membangun fitur komunikasi, alat kolaborasi langsung, atau aplikasi apa pun yang memerlukan aliran data instan, Reverb menyediakan fondasi kelas produksi yang tumbuh bersama basis pengguna Anda.

## Konten Inti

### Persiapan Proyek dan Dependensi

Pastikan aplikasi Laravel Anda menggunakan versi 11 atau lebih baru dan telah memiliki autentikasi dasar. Laravel Breeze dengan stack Blade atau Laravel Sanctum untuk autentikasi API sama-sama cocok digunakan dengan Reverb.

Instal paket Reverb melalui Composer:

```bash
composer require laravel/reverb
```

Publikasikan file konfigurasi Reverb:

```bash
php artisan reverb:install
```

Perintah ini menerbitkan `config/reverb.php` dan menyiapkan variabel lingkungan yang diperlukan di file `.env` Anda. Reverb berjalan sebagai proses terpisah di samping aplikasi Laravel utama Anda, mendengarkan di port khusus (default `8080`) untuk koneksi WebSocket.

### Mengonfigurasi Reverb

File konfigurasi Reverb mendefinisikan dua entri aplikasi utama: satu untuk server WebSocket itu sendiri dan satu untuk API HTTP yang digunakan klien untuk melakukan negosiasi koneksi.

Variabel lingkungan utama di `.env`:

```text
REVERB_APP_ID=my-chat-app
REVERB_APP_KEY=your-app-key-here
REVERB_APP_SECRET=your-app-secret-here
REVERB_HOST="0.0.0.0"
REVERB_PORT=8080
REVERB_SCHEME=http

# Di produksi, gunakan https dan atur host tertentu
# REVERB_SCHEME=https
# REVERB_HOST=reverb.example.com
```

Untuk pengembangan, `0.0.0.0` memungkinkan koneksi dari antarmuka lokal mana pun. Di produksi, batasi ini ke domain server Reverb Anda.

### Konfigurasi Broadcasting

Sistem broadcasting Laravel harus dikonfigurasi untuk menggunakan Reverb sebagai driver. Perbarui file `.env` Anda:

```text
BROADCAST_CONNECTION=reverb
BROADCAST_DRIVER=reverb
```

Pastikan `config/broadcasting.php` memiliki koneksi Reverb yang terdefinisi. Perintah `reverb:install` menangani ini secara otomatis, tetapi verifikasi array connections mencakup:

```php
'connections' => [
    'reverb' => [
        'driver' => 'reverb',
        'key' => env('REVERB_APP_KEY'),
        'secret' => env('REVERB_APP_SECRET'),
        'app_id' => env('REVERB_APP_ID'),
        'options' => [
            'host' => env('REVERB_HOST'),
            'port' => env('REVERB_PORT', 443),
            'scheme' => env('REVERB_SCHEME', 'https'),
            'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
        ],
        'client_options' => [],
    ],
],
```

### Skema Basis Data untuk Chat

Rancang skema basis data untuk mendukung banyak ruang obrolan, pesan, dan partisipasi pengguna. Buat migrasi untuk ruang, peserta ruang, dan pesan.

Pertama, buat model dan migrasi:

```bash
php artisan make:model ChatRoom -m
php artisan make:model ChatMessage -m
php artisan make:model ChatRoomUser -m
```

Migrasi `chat_rooms`:

```php
Schema::create('chat_rooms', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->text('description')->nullable();
    $table->foreignId('created_by')->constrained('users');
    $table->boolean('is_private')->default(false);
    $table->timestamps();
});
```

Migrasi tabel pivot `chat_room_user`:

```php
Schema::create('chat_room_user', function (Blueprint $table) {
    $table->id();
    $table->foreignId('chat_room_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->timestamp('last_read_at')->nullable();
    $table->timestamps();

    $table->unique(['chat_room_id', 'user_id']);
});
```

Migrasi `chat_messages`:

```php
Schema::create('chat_messages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('chat_room_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->text('message');
    $table->timestamps();
});
```

Jalankan migrasi:

```bash
php artisan migrate
```

### Mendefinisikan Model dan Relasi

Siapkan model Eloquent dengan relasi yang tepat:

```php
// app/Models/ChatRoom.php
class ChatRoom extends Model
{
    protected $fillable = ['name', 'description', 'created_by', 'is_private'];

    public function users()
    {
        return $this->belongsToMany(User::class, 'chat_room_user')
            ->withPivot('last_read_at')
            ->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
```

```php
// app/Models/ChatMessage.php
class ChatMessage extends Model
{
    protected $fillable = ['chat_room_id', 'user_id', 'message'];

    protected $with = ['user'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function room()
    {
        return $this->belongsTo(ChatRoom::class);
    }
}
```

### Menyiarkan Event

Buat event broadcast untuk pesan baru dan aktivitas pengguna. Event di Laravel adalah kelas sederhana yang mengimplementasikan antarmuka `ShouldBroadcast`.

```bash
php artisan make:event MessageSent
php artisan make:event UserTyping
```

Event `MessageSent` menyiarkan pesan baru ke semua peserta dalam sebuah ruangan:

```php
// app/Events/MessageSent.php
namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public ChatMessage $message
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('chat.room.' . $this->message->chat_room_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'message' => $this->message->message,
            'user' => [
                'id' => $this->message->user->id,
                'name' => $this->message->user->name,
                'avatar' => $this->message->user->profile_photo_url,
            ],
            'created_at' => $this->message->created_at->toISOString(),
        ];
    }
}
```

Event `UserTyping` menggunakan whisper pada saluran, bukan event broadcast penuh. Whisper bersifat sementara — tidak disimpan di basis data dan hanya dikirimkan ke pelanggan saluran saat ini.

### Mendefinisikan Saluran Otorisasi

Otorisasi saluran menentukan siapa yang dapat mendengarkan saluran tertentu. Definisikan callback otorisasi di `routes/channels.php`:

```php
use App\Models\ChatRoom;

// Private channel untuk setiap ruang chat
Broadcast::channel('chat.room.{roomId}', function ($user, $roomId) {
    $room = ChatRoom::find($roomId);

    if (! $room) {
        return false;
    }

    // Izinkan jika pengguna adalah peserta
    return $room->users()->where('user_id', $user->id)->exists()
        ? ['id' => $user->id, 'name' => $user->name]
        : false;
});

// Presence channel untuk status online di ruangan
Broadcast::channel('presence.chat.room.{roomId}', function ($user, $roomId) {
    $room = ChatRoom::find($roomId);

    if (! $room || ! $room->users()->where('user_id', $user->id)->exists()) {
        return false;
    }

    return ['id' => $user->id, 'name' => $user->name];
});
```

Private channels memastikan hanya peserta yang berwenang yang dapat mendengarkan. Presence channels memperluas private channels dengan mengekspos daftar pengguna yang berlangganan ke semua anggota.

### Endpoint API untuk Chat

Buat route API untuk menampilkan ruang, mengirim pesan, dan mengelola peserta:

```php
// routes/api.php
use App\Http\Controllers\Api\ChatRoomController;
use App\Http\Controllers\Api\ChatMessageController;

Route::middleware('auth:sanctum')->group(function () {
    // Ruang chat
    Route::get('/chat/rooms', [ChatRoomController::class, 'index']);
    Route::post('/chat/rooms', [ChatRoomController::class, 'store']);
    Route::post('/chat/rooms/{room}/join', [ChatRoomController::class, 'join']);
    Route::post('/chat/rooms/{room}/leave', [ChatRoomController::class, 'leave']);

    // Pesan
    Route::get('/chat/rooms/{room}/messages', [ChatMessageController::class, 'index']);
    Route::post('/chat/rooms/{room}/messages', [ChatMessageController::class, 'store']);
});
```

Endpoint penyimpanan pesan membuat pesan dan menyiarkan event:

```php
// app/Http/Controllers/Api/ChatMessageController.php
public function store(Request $request, ChatRoom $room)
{
    $request->validate(['message' => 'required|string|max:5000']);

    $message = $room->messages()->create([
        'user_id' => $request->user()->id,
        'message' => $request->message,
    ]);

    broadcast(new MessageSent($message))->toOthers();

    return response()->json($message->load('user'), 201);
}
```

Metode `toOthers()` mencegah pengirim menerima siaran mereka sendiri, menghindari pesan duplikat di klien.

### Pengaturan Klien dengan Laravel Echo

Di sisi klien, instal Laravel Echo dan konektor Reverb:

```bash
npm install --save-dev laravel-echo @dirkaholic/laravel-echo-reverb
```

Inisialisasi Echo di file JavaScript utama Anda:

```javascript
// resources/js/echo.js
import Echo from 'laravel-echo';
import ReverbConnector from '@dirkaholic/laravel-echo-reverb';

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
});
```

Perbarui `.env` Anda dengan variabel berawalan Vite:

```text
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

### Mendengarkan Pesan di Klien

Berlangganan ke saluran ruang chat dan dengarkan pesan baru:

```javascript
// Dengarkan pesan baru di ruang tertentu
const roomId = 1;

Echo.private(`chat.room.${roomId}`)
    .listen('.MessageSent', (event) => {
        appendMessage(event.message, event.user);
    })
    .listenForWhisper('typing', (event) => {
        showTypingIndicator(event.user.name);
    });

// Kirim indikator pengetikan
function onTyping(roomId) {
    Echo.private(`chat.room.${roomId}`)
        .whisper('typing', { user: { name: currentUser.name } });
}
```

Awalan `.` sebelum `MessageSent` memberi tahu Echo untuk mendengarkan nama event tanpa awalan namespace apa pun yang mungkin ditambahkan Laravel.

### Presence Channels untuk Status Online

Presence channels memberikan kesadaran tentang siapa yang sedang melihat ruang chat. Berlangganan ke presence channel:

```javascript
const presence = Echo.join(`presence.chat.room.${roomId}`)
    .here((users) => {
        // Dipanggil sekali dengan daftar pengguna saat ini
        updateOnlineUsers(users);
    })
    .joining((user) => {
        // Dipanggil ketika pengguna baru bergabung
        addOnlineUser(user);
        showNotification(`${user.name} bergabung ke ruangan`);
    })
    .leaving((user) => {
        // Dipanggil ketika pengguna keluar
        removeOnlineUser(user);
    })
    .error((error) => {
        console.error('Kesalahan presence channel:', error);
    });
```

### Menjalankan Reverb

Jalankan server Reverb bersamaan dengan server pengembangan Laravel Anda:

```bash
# Terminal 1: Server pengembangan Laravel
php artisan serve

# Terminal 2: Server WebSocket Reverb
php artisan reverb:start
```

Untuk produksi, jalankan Reverb sebagai daemon menggunakan Supervisor:

```ini
; /etc/supervisor/conf.d/laravel-reverb.conf
[program:laravel-reverb]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/html/artisan reverb:start
autostart=true
autorestart=true
user=forge
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/html/storage/logs/reverb.log
```

### Menskalakan Reverb dengan Redis

Untuk menskalakan Reverb secara horizontal di beberapa server, konfigurasikan Redis sebagai backend broadcasting. Saat Anda menambahkan lebih banyak instance Reverb, Redis memastikan bahwa pesan yang dipublikasikan di satu instance dikirimkan ke pelanggan yang terhubung ke instance lain.

```text
REVERB_SCALING_ENABLED=true
REVERB_SCALING_REDIS_HOST=127.0.0.1
REVERB_SCALING_REDIS_PORT=6379
REVERB_SCALING_REDIS_PASSWORD=null
```

Dengan penskalaan diaktifkan, setiap instance Reverb mendaftarkan dirinya di Redis dan berlangganan ke saluran pub/sub bersama. Pesan yang disiarkan di server A mencapai klien yang terhubung ke server B melalui relay Redis.

## Contoh Kode

### Komponen Chat Vue.js Lengkap

Berikut adalah komponen Vue 3 lengkap yang terintegrasi dengan Echo dan Reverb:

```vue
<template>
  <div class="chat-container">
    <div class="chat-header">
      <h3>{{ room.name }}</h3>
      <div class="online-users">
        <span v-for="user in onlineUsers" :key="user.id" class="online-dot">
          {{ user.name }}
        </span>
      </div>
    </div>
    <div class="messages" ref="messagesContainer">
      <div v-for="msg in messages" :key="msg.id" class="message"
           :class="{ 'own-message': msg.user.id === currentUser.id }">
        <strong>{{ msg.user.name }}</strong>
        <p>{{ msg.message }}</p>
        <small>{{ formatTime(msg.created_at) }}</small>
      </div>
    </div>
    <div class="typing-indicator" v-if="typingUsers.length">
      {{ typingUsers.join(', ') }} sedang mengetik{{ typingUsers.length > 1 ? '...' : '...' }}
    </div>
    <div class="chat-input">
      <input v-model="newMessage" @keydown="handleTyping" @keyup.enter="sendMessage"
             placeholder="Ketik pesan...">
      <button @click="sendMessage">Kirim</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { usePage } from '@inertiajs/vue3';

const props = defineProps({ room: Object });
const messages = ref([]);
const onlineUsers = ref([]);
const typingUsers = ref([]);
const newMessage = ref('');
const messagesContainer = ref(null);
const currentUser = usePage().props.auth.user;

onMounted(() => {
  loadMessages();
  joinPresenceChannel();
  listenForMessages();
});

onUnmounted(() => {
  leaveChannels();
});

function loadMessages() {
  axios.get(`/api/chat/rooms/${props.room.id}/messages`)
    .then(res => { messages.value = res.data; })
    .catch(err => console.error('Gagal memuat pesan', err));
}

function joinPresenceChannel() {
  window.Echo.join(`presence.chat.room.${props.room.id}`)
    .here((users) => { onlineUsers.value = users; })
    .joining((user) => { onlineUsers.value.push(user); })
    .leaving((user) => {
      onlineUsers.value = onlineUsers.value.filter(u => u.id !== user.id);
    });
}

function listenForMessages() {
  window.Echo.private(`chat.room.${props.room.id}`)
    .listen('.MessageSent', (event) => {
      messages.value.push(event);
      scrollToBottom();
    })
    .listenForWhisper('typing', (event) => {
      if (event.user.name !== currentUser.name
          && !typingUsers.value.includes(event.user.name)) {
        typingUsers.value.push(event.user.name);
        setTimeout(() => {
          typingUsers.value = typingUsers.value.filter(n => n !== event.user.name);
        }, 3000);
      }
    });
}

function sendMessage() {
  if (!newMessage.value.trim()) return;
  axios.post(`/api/chat/rooms/${props.room.id}/messages`, {
    message: newMessage.value,
  }).then(() => { newMessage.value = ''; })
    .catch(err => console.error('Gagal mengirim pesan', err));
}

function handleTyping() {
  window.Echo.private(`chat.room.${props.room.id}`)
    .whisper('typing', { user: { name: currentUser.name } });
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString();
}
</script>
```

### Pengujian Reverb dengan Artisan

Uji pengaturan Reverb Anda menggunakan perintah pengujian broadcast bawaan Artisan:

```bash
php artisan reverb:test
```

Perintah ini memulai server Reverb sementara dan menguji koneksi. Perintah ini memvalidasi bahwa kunci aplikasi, rahasia, dan otorisasi saluran Anda telah dikonfigurasi dengan benar.

## Insight Penting

- **Pilih jenis saluran yang tepat**: Private channels membatasi akses ke pengguna yang berwenang; presence channels juga mengekspos daftar pengguna. Gunakan private channels untuk pesan satu-ke-satu dan presence channels untuk chat grup di mana status online penting.
- **Whisper untuk data sementara**: Indikator pengetikan, posisi kursor, dan status sementara lainnya harus menggunakan whisper daripada event broadcast penuh. Whisper tidak disimpan dan tidak memicu serialisasi event, sehingga secara signifikan lebih murah.
- **Selalu gunakan `toOthers()`**: Saat menyiarkan pesan yang juga harus dilihat oleh pengirim (karena sudah ditambahkan ke UI lokal), panggil `toOthers()` pada siaran untuk mencegah pesan duplikat. Klien pengirim secara optimistis sudah menambahkan pesan ke UI.
- **Proses Reverb terpisah untuk produksi**: Reverb berjalan sebagai proses PHP independen. Dalam produksi, gunakan Supervisor untuk menjaganya tetap berjalan dan memulainya ulang jika gagal. Jangan pernah menjalankan Reverb di belakang server web Anda dalam proses yang sama — harus berupa daemon mandiri.
- **Pertimbangan penskalaan**: Penskalaan berbasis Redis berfungsi dengan baik untuk beban sedang. Untuk throughput yang sangat tinggi, pertimbangkan untuk mendedikasikan instance Reverb tertentu ke saluran tertentu menggunakan strategi routing, dan gunakan sticky WebSocket sessions di belakang load balancer.
- **CSRF dan CORS**: API HTTP Reverb untuk otorisasi saluran memerlukan perlindungan CSRF. Pastikan SPA atau frontend Anda mengirim header `X-CSRF-TOKEN` dengan permintaan otorisasi. Konfigurasikan CORS di `config/cors.php` jika frontend Anda berada di origin yang berbeda.

## Langkah Berikutnya

- Jelajahi Laravel Notifications dengan broadcasting real-time untuk pemberitahuan tingkat sistem.
- Implementasikan penyimpanan pesan dengan SoftDeletes dan riwayat pengeditan pesan di basis data.
- Pelajari spesifikasi protokol Laravel Reverb untuk membangun pustaka klien kustom.
- Tinjau dokumentasi resmi Laravel Broadcasting untuk pola saluran lanjutan.

## Kesimpulan

Dalam tutorial ini, Anda telah membangun aplikasi chat real-time yang lengkap dengan Laravel Reverb, mencakup seluruh stack mulai dari desain skema basis data melalui penyiaran WebSocket hingga integrasi sisi klien dengan Laravel Echo. Anda mempelajari cara mendefinisikan private dan presence channels, mengautentikasi koneksi WebSocket, menyiarkan event, menangani whisper sementara untuk indikator pengetikan, dan menskalakan Reverb dengan Redis. Laravel Reverb menyediakan solusi first-party yang kuat untuk fitur real-time yang menjaga infrastruktur Anda tetap sederhana dan biaya Anda tetap terprediksi. Pola yang Anda implementasikan di sini — otorisasi saluran, penyiaran event, kesadaran kehadiran — berlaku sama untuk notifikasi langsung, pengeditan kolaboratif, dashboard real-time, dan fitur apa pun yang memerlukan sinkronisasi data instan.
