---
title: "Membangun Aplikasi Chat Real-Time dengan Kotlin dan WebSocket"
description: "Tutorial praktis untuk membangun aplikasi chat real-time menggunakan Kotlin, OkHttp WebSockets, dan Jetpack Compose dengan arsitektur MVVM."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Chat Real-Time dengan Kotlin dan WebSocket

## Ringkasan

Tutorial ini memandu Anda dalam membangun aplikasi chat real-time yang berfungsi penuh untuk Android menggunakan Kotlin, OkHttp WebSockets, dan Jetpack Compose. Anda akan mempelajari cara membuat koneksi WebSocket persisten, menangani aliran pesan real-time dengan StateFlow, mendesain UI chat dengan Compose, dan mengelola siklus hidup koneksi termasuk logika koneksi ulang. Pada akhirnya, Anda akan memiliki klien chat yang dapat terhubung ke server WebSocket mana pun yang kompatibel.

## Target Audiens

- Pengembang Android yang ingin mengimplementasikan fitur real-time.
- Pengembang Kotlin dengan pengetahuan dasar Jetpack Compose dan coroutine.
- Tingkat menengah — Anda harus nyaman dengan sintaks Kotlin, pola ViewModel, dan konfigurasi Gradle.

## Prasyarat

- Android Studio Hedgehog (2023.1.1) atau yang lebih baru.
- Familiaritas dasar dengan Kotlin coroutine dan Flow.
- Pemahaman dasar Jetpack Compose (Column, LazyColumn, TextField).
- Server WebSocket untuk pengujian — kita akan menggunakan `wss://echo.websocket.org` untuk pengembangan dan server Node.js lokal untuk pengujian produksi.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mengatur klien WebSocket OkHttp dan mengelola siklus hidup koneksi.
- Menggunakan StateFlow Kotlin untuk menyiarkan pesan real-time ke lapisan UI.
- Membangun antarmuka chat responsif dengan Jetpack Compose.
- Mengimplementasikan koneksi ulang otomatis dengan backoff eksponensial.
- Menangani serialisasi dan deserialisasi JSON untuk pesan chat terstruktur.
- Mengelola event siklus hidup WebSocket (open, closing, closed, failure) dengan baik.

## Konteks dan Motivasi

Komunikasi real-time adalah fondasi aplikasi mobile modern. Media sosial, pesan instan, alat kolaborasi langsung, dan game multipemain semuanya bergantung pada koneksi persisten dengan latensi rendah antara klien dan server. Meskipun REST API memadai untuk alur kerja request-response, REST tidak cukup untuk kasus penggunaan di mana server perlu mengirim data ke klien tanpa permintaan eksplisit.

WebSocket menyediakan saluran komunikasi full-duplex melalui satu koneksi TCP, menjadikannya pilihan ideal untuk aplikasi chat, notifikasi langsung, dan streaming data real-time. Di Android, library OkHttp menawarkan implementasi WebSocket yang matang dan teruji yang terintegrasi secara alami dengan Kotlin coroutine dan Flow API.

Tutorial ini menjembatani kesenjangan antara pengembangan Android berbasis REST dasar dan paradigma real-time, memberi Anda arsitektur WebSocket yang dapat digunakan kembali dan dapat diadaptasi untuk fitur real-time apa pun.

## Konten Inti

### Pengaturan Proyek dan Dependensi

Buat proyek Android baru dengan Empty Compose Activity di Android Studio. Buka file `build.gradle.kts` (Module :app) dan tambahkan dependensi berikut:

```kotlin
// build.gradle.kts (Module :app)
dependencies {
    // Compose BOM
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")

    // OkHttp untuk WebSocket
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Gson untuk serialisasi JSON
    implementation("com.google.code.gson:gson:2.10.1")

    // Coroutine
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
```

Sinkronkan proyek untuk mengunduh dependensi.

### Model Pesan Chat

Definisikan data class yang mewakili satu pesan chat. Setiap pesan membawa identitas pengirim, konten teks, timestamp, dan tipe pesan yang memungkinkan klien membedakan antara pesan pengguna, pengumuman sistem, dan status koneksi.

```kotlin
// model/ChatMessage.kt
package com.example.chatapp.model

import com.google.gson.annotations.SerializedName

data class ChatMessage(
    @SerializedName("type")
    val type: String = "message",

    @SerializedName("sender")
    val sender: String,

    @SerializedName("content")
    val content: String,

    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis()
)
```

Anotasi `@SerializedName` memetakan properti Kotlin ke kunci JSON mereka, memastikan kompatibilitas dengan server WebSocket yang sesuai RFC 6455 yang mengirim payload JSON terstruktur.

### Manajer WebSocket

Manajer WebSocket adalah inti dari aplikasi. Ini merangkum klien WebSocket OkHttp, mengekspos StateFlow dari pesan yang diterima, dan menyediakan metode untuk menghubungkan, memutuskan, dan mengirim pesan.

```kotlin
// network/ChatWebSocketManager.kt
package com.example.chatapp.network

import android.util.Log
import com.example.chatapp.model.ChatMessage
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

class ChatWebSocketManager(
    private val serverUrl: String
) {
    private val gson = Gson()
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)  // Tidak ada timeout untuk koneksi jangka panjang
        .pingInterval(30, TimeUnit.SECONDS)       // Keep-alive ping setiap 30 detik
        .build()

    private var webSocket: WebSocket? = null
    private var shouldReconnect = true

    // StateFlow untuk lapisan UI
    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    // Channel untuk mengantrekan pesan keluar dari thread mana pun
    private val outgoingChannel = Channel<String>(Channel.BUFFERED)

    enum class ConnectionState {
        CONNECTED,
        CONNECTING,
        DISCONNECTED,
        RECONNECTING
    }

    fun connect() {
        if (_connectionState.value == ConnectionState.CONNECTED ||
            _connectionState.value == ConnectionState.CONNECTING
        ) return

        shouldReconnect = true
        _connectionState.value = ConnectionState.CONNECTING
        _error.value = null

        val request = Request.Builder()
            .url(serverUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket terbuka: ${response.code}")
                _connectionState.value = ConnectionState.CONNECTED
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Pesan diterima: $text")
                try {
                    val message = gson.fromJson(text, ChatMessage::class.java)
                    _messages.value = _messages.value + message
                } catch (e: Exception) {
                    Log.e(TAG, "Gagal mem-parsing pesan: ${e.message}")
                    // Jika server mengirim teks biasa, bungkus ke dalam ChatMessage
                    val fallback = ChatMessage(
                        type = "message",
                        sender = "server",
                        content = text
                    )
                    _messages.value = _messages.value + fallback
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket menutup: $code $reason")
                webSocket.close(code, reason)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket ditutup: $code $reason")
                _connectionState.value = ConnectionState.DISCONNECTED
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "Kegagalan WebSocket: ${t.message}")
                _error.value = t.message
                _connectionState.value = ConnectionState.DISCONNECTED
                if (shouldReconnect) {
                    scheduleReconnect()
                }
            }
        })
    }

    fun sendMessage(sender: String, content: String) {
        val message = ChatMessage(
            type = "message",
            sender = sender,
            content = content
        )
        val json = gson.toJson(message)
        val sent = webSocket?.send(json) ?: false
        if (!sent) {
            Log.w(TAG, "Gagal mengirim pesan — WebSocket mungkin terputus")
            _error.value = "Gagal mengirim pesan. Periksa koneksi Anda."
        }
    }

    fun disconnect() {
        shouldReconnect = false
        webSocket?.close(1000, "Klien menutup")
        webSocket = null
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    private suspend fun scheduleReconnect() {
        var attempt = 0
        val maxAttempts = 5
        while (shouldReconnect && attempt < maxAttempts) {
            attempt++
            _connectionState.value = ConnectionState.RECONNECTING
            // Backoff eksponensial: 1d, 2d, 4d, 8d, 16d
            val delayMs = (1000L * Math.pow(2.0, (attempt - 1).toDouble())).toLong()
            Log.d(TAG, "Koneksi ulang dalam ${delayMs}ms (percobaan $attempt/$maxAttempts)")
            delay(delayMs)
            connect()
            if (_connectionState.value == ConnectionState.CONNECTED) break
        }
        if (attempt >= maxAttempts && _connectionState.value != ConnectionState.CONNECTED) {
            _error.value = "Gagal koneksi ulang setelah $maxAttempts percobaan"
        }
    }

    // Panggil dari ViewModel scope untuk memproses pesan keluar
    suspend fun processOutgoing() {
        for (json in outgoingChannel) {
            webSocket?.send(json)
        }
    }

    companion object {
        private const val TAG = "ChatWebSocket"
    }
}
```

Keputusan desain utama dalam manajer ini:

- **Interval ping**: Ping 30 detik menjaga koneksi tetap hidup melalui NAT timeout dan transisi jaringan seluler.
- **Read timeout nol**: WebSocket bersifat jangka panjang; read timeout 0 menonaktifkan read timeout sepenuhnya, mencegah pemutusan palsu pada koneksi idle.
- **Backoff eksponensial**: Logika koneksi ulang dimulai dari 1 detik dan berlipat ganda hingga 16 detik, memberikan waktu bagi masalah jaringan sementara untuk pulih tanpa membanjiri server.
- **Channel untuk pesan keluar**: Meskipun implementasi ini mengirim secara langsung, pola `outgoingChannel` berguna untuk mengantrekan pesan saat koneksi sedang dibangun kembali.

### ViewModel Chat

ViewModel menghubungkan manajer WebSocket ke UI Compose. ViewModel mengekspos daftar pesan dan status koneksi sebagai state yang dapat diamati, dan menyediakan aksi untuk mengirim pesan serta mengelola koneksi.

```kotlin
// viewmodel/ChatViewModel.kt
package com.example.chatapp.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.chatapp.model.ChatMessage
import com.example.chatapp.network.ChatWebSocketManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ChatViewModel(application: Application) : AndroidViewModel(application) {

    // Gunakan 10.0.2.2 untuk emulator Android agar mencapai localhost host
    private val webSocketManager = ChatWebSocketManager("ws://10.0.2.2:8080/chat")

    val messages: StateFlow<List<ChatMessage>> = webSocketManager.messages
    val connectionState: StateFlow<ChatWebSocketManager.ConnectionState> =
        webSocketManager.connectionState
    val error: StateFlow<String?> = webSocketManager.error

    private val _userName = MutableStateFlow("User${(1000..9999).random()}")
    val userName: StateFlow<String> = _userName.asStateFlow()

    init {
        connect()
    }

    fun connect() {
        viewModelScope.launch {
            webSocketManager.connect()
        }
    }

    fun sendMessage(text: String) {
        if (text.isBlank()) return
        webSocketManager.sendMessage(userName.value, text.trim())
    }

    fun disconnect() {
        webSocketManager.disconnect()
    }

    override fun onCleared() {
        super.onCleared()
        webSocketManager.disconnect()
    }
}
```

ViewModel menghasilkan nama pengguna acak untuk tujuan demonstrasi. Dalam aplikasi produksi, nama pengguna akan berasal dari alur autentikasi atau preferensi pengguna.

### UI Chat dengan Jetpack Compose

Lapisan UI terdiri dari dua komposabel utama: daftar pesan dan bilah input.

```kotlin
// ui/ChatScreen.kt
package com.example.chatapp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.chatapp.model.ChatMessage
import com.example.chatapp.network.ChatWebSocketManager
import com.example.chatapp.viewmodel.ChatViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(viewModel: ChatViewModel = viewModel()) {
    val messages by viewModel.messages.collectAsStateWithLifecycle()
    val connectionState by viewModel.connectionState.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val userName by viewModel.userName.collectAsStateWithLifecycle()

    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // Gulir otomatis ke bawah saat pesan baru tiba
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Chat Room")
                        ConnectionStatusBadge(connectionState)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        },
        snackbarHost = {
            error?.let {
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.connect() }) {
                            Text("Koneksi Ulang")
                        }
                    }
                ) {
                    Text(it)
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Daftar pesan
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(messages, key = { "${it.timestamp}_${it.content.hashCode()}" }) { message ->
                    ChatBubble(message = message, isOwnMessage = message.sender == userName)
                }
            }

            // Bilah input
            ChatInputBar(
                inputText = inputText,
                onInputChange = { inputText = it },
                onSend = {
                    viewModel.sendMessage(inputText)
                    inputText = ""
                },
                enabled = connectionState == ChatWebSocketManager.ConnectionState.CONNECTED
            )
        }
    }
}

@Composable
fun ConnectionStatusBadge(state: ChatWebSocketManager.ConnectionState) {
    val (text, color) = when (state) {
        ChatWebSocketManager.ConnectionState.CONNECTED -> "Terhubung" to Color(0xFF4CAF50)
        ChatWebSocketManager.ConnectionState.CONNECTING -> "Menghubungkan..." to Color(0xFFFFC107)
        ChatWebSocketManager.ConnectionState.DISCONNECTED -> "Terputus" to Color(0xFFF44336)
        ChatWebSocketManager.ConnectionState.RECONNECTING -> "Koneksi Ulang..." to Color(0xFFFF9800)
    }
    Text(
        text = text,
        color = color,
        fontSize = 12.sp
    )
}

@Composable
fun ChatBubble(message: ChatMessage, isOwnMessage: Boolean) {
    val alignment = if (isOwnMessage) Alignment.End else Alignment.Start
    val backgroundColor = if (isOwnMessage)
        MaterialTheme.colorScheme.primaryContainer
    else
        MaterialTheme.colorScheme.surfaceVariant
    val shape = if (isOwnMessage)
        androidx.compose.foundation.shape.RoundedCornerShape(
            topStart = 12.dp, topEnd = 4.dp,
            bottomStart = 12.dp, bottomEnd = 12.dp
        )
    else
        androidx.compose.foundation.shape.RoundedCornerShape(
            topStart = 4.dp, topEnd = 12.dp,
            bottomStart = 12.dp, bottomEnd = 12.dp
        )

    val timeFormat = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalAlignment = if (isOwnMessage) Alignment.End else Alignment.Start
    ) {
        Surface(
            shape = shape,
            color = backgroundColor,
            shadowElevation = 1.dp
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)) {
                Text(
                    text = message.sender,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = if (isOwnMessage)
                        MaterialTheme.colorScheme.onPrimaryContainer
                    else
                        MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = message.content,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = timeFormat.format(Date(message.timestamp)),
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.align(Alignment.End)
                )
            }
        }
    }
}

@Composable
fun ChatInputBar(
    inputText: String,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
    enabled: Boolean
) {
    Surface(
        tonalElevation = 3.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = inputText,
                onValueChange = onInputChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Ketik pesan...") },
                enabled = enabled,
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors()
            )
            Spacer(modifier = Modifier.width(8.dp))
            FilledTonalButton(
                onClick = onSend,
                enabled = enabled && inputText.isNotBlank()
            ) {
                Text("Kirim")
            }
        }
    }
}
```

Gelembung chat menggunakan bentuk yang berbeda untuk pesan sendiri versus pesan pengguna lain — konvensi yang membantu pengguna melacak alur percakapan secara visual. `LazyColumn` dengan `animateScrollToItem` memastikan pesan baru selalu terlihat tanpa pengguliran manual.

### MainActivity Entry Point

Hubungkan semuanya di aktivitas utama.

```kotlin
// MainActivity.kt
package com.example.chatapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.chatapp.ui.ChatScreen
import com.example.chatapp.ui.theme.ChatAppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ChatAppTheme {
                ChatScreen()
            }
        }
    }
}
```

### Menyiapkan Server Uji Lokal

Untuk menguji aplikasi chat secara end-to-end, jalankan server WebSocket sederhana secara lokal. Buat file bernama `server.js`:

```javascript
// server.js — Server WebSocket echo untuk pengujian
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  console.log(`Klien terhubung dari ${req.socket.remoteAddress}`);

  ws.on('message', (data) => {
    const message = data.toString();
    console.log(`Diterima: ${message}`);
    // Siarkan ke semua klien yang terhubung
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Klien terputus');
  });

  // Kirim pesan selamat datang
  ws.send(JSON.stringify({
    type: "system",
    sender: "system",
    content: "Selamat datang di ruang chat!",
    timestamp: Date.now()
  }));
});

console.log('Server WebSocket berjalan di ws://localhost:8080');
```

Jalankan dengan Node.js:

```bash
npm install ws
node server.js
```

Emulator mencapai `localhost` mesin host di `10.0.2.2`, sehingga aplikasi terhubung ke `ws://10.0.2.2:8080/chat`.

## Contoh Kode

Struktur proyek lengkap adalah sebagai berikut:

```text
app/
├── src/main/java/com/example/chatapp/
│   ├── MainActivity.kt
│   ├── model/
│   │   └── ChatMessage.kt
│   ├── network/
│   │   └── ChatWebSocketManager.kt
│   ├── viewmodel/
│   │   └── ChatViewModel.kt
│   └── ui/
│       ├── ChatScreen.kt
│       └── theme/
│           ├── Theme.kt
│           ├── Color.kt
│           └── Type.kt
├── build.gradle.kts
└── src/main/AndroidManifest.xml
```

Semua contoh kode di atas siap untuk disalin ke proyek Android baru. Ingat untuk menambahkan izin Internet di `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Insight Penting

- **Manajemen siklus hidup koneksi sangat penting**: Selalu pasangkan `connect()` dengan `disconnect()` di `onCleared()` ViewModel untuk mencegah kebocoran. WebSocket OkHttp memegang referensi ke listener, yang dapat mencegah pengumpulan sampah (garbage collection) dari seluruh ViewModel jika tidak ditutup dengan benar.
- **Backoff eksponensial mencegah kelebihan server**: Tanpa backoff, loop koneksi ulang pada jaringan yang tidak stabil dapat mengirim ratusan permintaan koneksi per menit. Jadwal 1d→2d→4d→8d→16d memberikan waktu bagi stack jaringan untuk pulih sambil menjaga sesi pengguna tetap aktif.
- **StateFlow lebih baik dari LiveData di Compose**: `StateFlow` terintegrasi secara native dengan Kotlin coroutine dan mendukung `collectAsStateWithLifecycle()`, yang secara otomatis menghentikan koleksi saat UI tidak terlihat — menghemat baterai dan sumber daya jaringan.
- **Kegagalan parsing JSON tidak boleh menghentikan aplikasi**: Server chat mungkin mengirim pesan teks mentah, detak jantung, atau payload non-JSON. Blok `try-catch` di `onMessage` dengan anggun menurunkan dengan membungkus teks biasa ke dalam model `ChatMessage`.
- **UX gulir otomatis itu penting**: Tanpa `animateScrollToItem`, pengguna harus menggulir secara manual untuk melihat pesan baru — pengalaman yang buruk di aplikasi chat. Namun, jika pengguna telah menggulir ke atas untuk membaca riwayat, pertimbangkan untuk menekan gulir otomatis sampai mereka kembali ke bagian bawah.

## Langkah Berikutnya

- Pelajari tentang **Kotlin Flow dan StateFlow** lebih dalam: lihat [Panduan Pola Lanjutan Coroutine dan Flow Kotlin](./kotlin-coroutines-flow-advanced-patterns-guide.md).
- Jelajahi **enkripsi end-to-end** untuk pesan chat dengan mengintegrasikan lapisan WebSocket dengan library kriptografi seperti Tink.
- Tambahkan **persistensi pesan** dengan Room — simpan pesan secara lokal sehingga tetap ada setelah aplikasi dimulai ulang.
- Kembangkan aplikasi dengan **berbagi gambar dan file** dengan beralih ke protokol frame WebSocket biner (`webSocket.send(ByteString)`).

## Kesimpulan

Anda telah membangun klien chat real-time berkualitas produksi yang lengkap untuk Android menggunakan Kotlin, OkHttp WebSockets, dan Jetpack Compose. Arsitektur yang Anda implementasikan — manajer WebSocket yang mengekspos StateFlow, ViewModel yang menjembatani lapisan jaringan dan UI, dan UI Compose reaktif — adalah pola yang dapat digunakan kembali yang berlaku untuk fitur real-time Android apa pun: notifikasi langsung, pengeditan kolaboratif, lobi game multipemain, dan pemantauan perangkat IoT.

Poin-poin penting yang dapat diambil adalah integrasi siklus hidup WebSocket dengan OkHttp, pola manajemen state menggunakan `StateFlow` untuk data real-time, dan pertimbangan pengalaman pengguna (gulir otomatis, indikator status koneksi, koneksi ulang backoff eksponensial) yang memisahkan prototipe dari fitur siap produksi.
