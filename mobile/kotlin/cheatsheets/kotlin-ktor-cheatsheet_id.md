---
title: "Cheat Sheet Ktor Kotlin"
description: "Referensi cepat untuk framework Ktor — panggilan HTTP Ktor Client, routing Ktor Server, negosiasi konten, autentikasi, WebSocket, dan pengujian."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Ktor Kotlin

## Tabel Referensi Cepat

### Esensi Ktor Client

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Membuat client | `HttpClient(CIO)` | HTTP client non-blocking dengan engine CIO |
| Permintaan GET | `client.get("https://api.example.com/users")` | Mengambil resource sebagai string |
| Permintaan POST | `client.post("https://api.example.com/users") { setBody(user) }` | Mengirim permintaan dengan body |
| Expect success | `HttpClient(CIO) { expectSuccess = true }` | Melempar error otomatis untuk respons non-2xx |
| Timeout | `install(HttpTimeout) { requestTimeoutMillis = 5000 }` | Mengatur timeout connect/request/socket |
| Permintaan default | `defaultRequest { url("https://api.example.com") }` | Menerapkan base URL dan header ke setiap panggilan |
| Menutup client | `client.close()` | Melepaskan resource koneksi setelah selesai |

### Esensi Ktor Server

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Server tertanam | `embeddedServer(Netty, port = 8080) { module() }` | Menjalankan server tanpa container eksternal |
| Menjalankan server | `.start(wait = true)` | Memblokir thread utama dan melayani permintaan |
| Definisi route | `routing { get("/") { ... } }` | Mendaftarkan handler HTTP |
| Parameter jalur | `get("/user/{id}") { call.parameters["id"] }` | Membaca segmen variabel dari path |
| Parameter query | `call.request.queryParameters["q"]` | Membaca nilai dari query string |
| Respons teks | `call.respondText("Halo, Ktor!")` | Mengembalikan respons teks biasa |
| Respons JSON | `call.respond(user)` | Menyerialisasi objek dengan serializer terpasang |
| Menerima body | `val user = call.receive<User>()` | Mendeserialisasi body permintaan menjadi objek |

### Negosiasi Konten dan Serialisasi

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Plugin client | `install(ContentNegotiation) { json() }` | Mendaftarkan penanganan JSON di sisi client |
| Plugin server | `install(ContentNegotiation) { json(Json { prettyPrint = true }) }` | Mendaftarkan JSON dengan pretty print di sisi server |
| Kelas serializable | `@Serializable data class User(val id: Int, val name: String)` | Menandai kelas untuk kotlinx.serialization |
| Konfigurasi JSON kustom | `json(Json { ignoreUnknownKeys = true })` | Mengabaikan field yang tidak dikenal pada payload |
| Mengirim JSON | `client.post(url) { contentType(ContentType.Application.Json); setBody(user) }` | POST dengan content type JSON eksplisit |
| Menerima list | `val users = client.get(url).body<List<User>>()` | Mendeserialisasi array JSON |

### Autentikasi

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Memasang auth | `install(Authentication) { ... }` | Mengaktifkan plugin autentikasi |
| Basic auth | `basic("my-basic") { validate { credentials -> ... } }` | Memvalidasi kredensial username dan password |
| Bearer auth | `bearer { authenticate { ... } }` | Memvalidasi token bearer dari header Authorization |
| JWT auth | `jwt { verifier(verifier); validate { credential -> ... } }` | Memverifikasi dan memvalidasi token JWT |
| Kredensial client | `client.get(url) { basicAuth("user", "pass") }` | Mengirim kredensial basic dari sisi client |

### WebSocket

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Plugin server | `install(WebSockets)` | Mengaktifkan plugin WebSocket di server |
| Handler server | `webSocket("/chat") { ... }` | Menangani koneksi WebSocket pada sebuah route |
| Sesi client | `client.webSocket("ws://host/chat") { ... }` | Membuka sesi WebSocket dari client |
| Mengirim teks | `send(Frame.Text("halo"))` | Mengirim frame teks |
| Menerima frame | `for (frame in incoming) { ... }` | Mengiterasi frame yang masuk |
| Ping/pong | `send(Frame.Ping(...))` | Menjaga koneksi tetap hidup dengan frame kontrol |

### Plugin dan Fitur

| Plugin | Fungsi |
|--------|--------|
| `CallLogging` | Mencatat method, path, status, dan durasi setiap panggilan |
| `DefaultHeaders` | Menambahkan header default seperti `Server` dan `Date` |
| `CORS` | Mengatur aturan cross-origin resource sharing |
| `Compression` | Mengompresi respons dengan gzip/deflate |
| `StatusPages` | Memetakan exception ke kode status dan body HTTP |
| `ContentNegotiation` | Menyerialisasi dan mendeserialisasi JSON (atau format lain) |
| `Authentication` | Melindungi route dengan auth basic, bearer, atau JWT |
| `WebSockets` | Meng-upgrade route menjadi koneksi WebSocket dua arah |

## Perintah Umum

### Dependensi Gradle — Ktor Client

```kotlin
// build.gradle.kts — modul: app
val ktorVersion = "2.3.12"

dependencies {
    implementation("io.ktor:ktor-client-core:$ktorVersion")
    implementation("io.ktor:ktor-client-cio:$ktorVersion")
    implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
}
```

### Dependensi Gradle — Ktor Server

```kotlin
// build.gradle.kts — modul: server
val ktorVersion = "2.3.12"

dependencies {
    implementation("io.ktor:ktor-server-core:$ktorVersion")
    implementation("io.ktor:ktor-server-netty:$ktorVersion")
    implementation("io.ktor:ktor-server-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
}
```

### Dependensi Gradle — WebSocket dan Auth

```kotlin
// build.gradle.kts — plugin opsional
val ktorVersion = "2.3.12"

dependencies {
    implementation("io.ktor:ktor-server-websockets:$ktorVersion")
    implementation("io.ktor:ktor-client-websockets:$ktorVersion")
    implementation("io.ktor:ktor-server-auth:$ktorVersion")
    implementation("io.ktor:ktor-server-auth-jwt:$ktorVersion")
    implementation("io.ktor:ktor-server-cors:$ktorVersion")
    implementation("io.ktor:ktor-server-call-logging:$ktorVersion")
}
```

### Menjalankan dan Membangun

```bash
# Menjalankan server tertanam dari Gradle
./gradlew run

# Membangun fat JAR mandiri (plugin Shadow) dan menjalankannya
./gradlew shadowJar
java -jar build/libs/server-all.jar

# Mengatur port dari baris perintah
./gradlew run -Pport=9090
```

### Perintah Pengujian

```bash
# Menjalankan semua pengujian
./gradlew test

# Menjalankan satu kelas pengujian
./gradlew test --tests "com.example.UserRouteTest"

# Menjalankan pengujian dengan output terperinci
./gradlew test --info
```

## Potongan Kode

### Ktor Client: Permintaan GET Dasar

```kotlin
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText

suspend fun fetchUsers(): String {
    val client = HttpClient(CIO)
    return try {
        client.get("https://api.example.com/users").bodyAsText()
    } finally {
        client.close()
    }
}
```

### Ktor Client: POST JSON dengan Negosiasi Konten

```kotlin
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class NewUser(val name: String, val email: String)

@Serializable
data class ApiResponse(val id: Int, val name: String)

suspend fun createUser(name: String, email: String): ApiResponse {
    val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }
    return client.post("https://api.example.com/users") {
        contentType(ContentType.Application.Json)
        setBody(NewUser(name = name, email = email))
    }.body()
}
```

### Ktor Client: Timeout dan Permintaan Default

```kotlin
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders

val apiClient = HttpClient(CIO) {
    expectSuccess = true
    defaultRequest {
        url("https://api.example.com/v1")
        header(HttpHeaders.Authorization, "Bearer $token")
    }
    install(HttpTimeout) {
        connectTimeoutMillis = 3_000
        requestTimeoutMillis = 10_000
        socketTimeoutMillis = 10_000
    }
}

suspend fun loadDashboard() = apiClient.get("/dashboard").bodyAsText()
```

### Ktor Server: Server Tertanam Minimal

```kotlin
import io.ktor.server.application.Application
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0") {
        routing {
            get("/") {
                call.respondText("Halo, Ktor!")
            }
        }
    }.start(wait = true)
}
```

### Ktor Server: Routing dengan Parameter Jalur

```kotlin
import io.ktor.server.application.call
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing

fun Application.routes() {
    routing {
        get("/user/{id}") {
            val id = call.parameters["id"] ?: return@get call.respondText("Id tidak ada")
            call.respondText("User $id")
        }
        get("/search") {
            val query = call.request.queryParameters["q"] ?: ""
            call.respondText("Mencari: $query")
        }
    }
}
```

### Ktor Server: API JSON dengan Negosiasi Konten

```kotlin
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class User(val id: Int, val name: String)

fun Application.jsonApi() {
    install(ContentNegotiation) {
        json(Json { prettyPrint = true; ignoreUnknownKeys = true })
    }
    routing {
        get("/users") {
            call.respond(listOf(User(1, "Alice"), User(2, "Budi")))
        }
        post("/users") {
            val user = call.receive<User>()
            call.respond(User(id = 3, name = user.name))
        }
    }
}
```

### Autentikasi: Basic

```kotlin
import io.ktor.server.application.Application
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.basic
import io.ktor.server.response.respondText
import io.ktor.server.routing.routing

fun Application.basicAuth() {
    install(Authentication) {
        basic("admin-basic") {
            realm = "Area Admin"
            validate { credentials ->
                if (credentials.name == "admin" && credentials.password == "secret") {
                    UserIdPrincipal(credentials.name)
                } else {
                    null
                }
            }
        }
    }
    routing {
        authenticate("admin-basic") {
            get("/admin") {
                call.respondText("Selamat datang, admin!")
            }
        }
    }
}
```

### Autentikasi: JWT (Bearer)

```kotlin
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import io.ktor.server.application.Application
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.jwt.jwt
import io.ktor.server.auth.authenticate
import io.ktor.server.response.respondText
import io.ktor.server.routing.routing

fun Application.jwtAuth() {
    val secret = "ganti-di-produksi"
    val issuer = "https://example.com"
    val verifier = JWT.require(Algorithm.HMAC256(secret))
        .withIssuer(issuer)
        .build()

    install(Authentication) {
        jwt {
            verifier(verifier)
            realm = "example"
            validate { credential ->
                if (credential.payload.getClaim("role").asString() == "admin") {
                    JWTPrincipal(credential.payload)
                } else {
                    null
                }
            }
        }
    }
    routing {
        authenticate {
            get("/profile") {
                val principal = call.principal<JWTPrincipal>()
                call.respondText("User: ${principal?.payload?.subject}")
            }
        }
    }
}
```

### Handler WebSocket Server

```kotlin
import io.ktor.server.application.Application
import io.ktor.server.routing.routing
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.readText

fun Application.chatSocket() {
    install(WebSockets)
    routing {
        webSocket("/chat") {
            send(Frame.Text("Selamat datang di chat!"))
            for (frame in incoming) {
                if (frame is Frame.Text) {
                    val message = frame.readText()
                    send(Frame.Text("Echo: $message"))
                }
            }
        }
    }
}
```

### Klien WebSocket

```kotlin
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.readText

suspend fun chatDenganServer() {
    val client = HttpClient(CIO) {
        install(WebSockets)
    }
    client.webSocket("ws://localhost:8080/chat") {
        send(Frame.Text("Halo server"))
        for (frame in incoming) {
            if (frame is Frame.Text) {
                println(frame.readText())
            }
        }
    }
    client.close()
}
```

### Pengujian API dengan testApplication

```kotlin
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals

class UserRouteTest {

    @Test
    fun rootMengembalikanHalo() = testApplication {
        application {
            module()
        }
        val response = client.get("/")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("Halo, Ktor!", response.bodyAsText())
    }
}
```
