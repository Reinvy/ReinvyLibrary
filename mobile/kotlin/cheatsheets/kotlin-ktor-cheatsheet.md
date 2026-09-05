---
title: "Kotlin Ktor Cheat Sheet"
description: "A quick reference for the Ktor framework — Ktor Client HTTP calls, Ktor Server routing, content negotiation, authentication, WebSockets, and testing."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Kotlin Ktor Cheat Sheet

## Quick Reference Table

### Ktor Client Essentials

| Action | Code | Description |
|--------|------|-------------|
| Create client | `HttpClient(CIO)` | Non-blocking HTTP client backed by the CIO engine |
| GET request | `client.get("https://api.example.com/users")` | Fetch a resource as a string |
| POST request | `client.post("https://api.example.com/users") { setBody(user) }` | Send a request with a body |
| Expect success | `HttpClient(CIO) { expectSuccess = true }` | Throw on non-2xx responses automatically |
| Timeout | `install(HttpTimeout) { requestTimeoutMillis = 5000 }` | Configure connect/request/socket timeouts |
| Default request | `defaultRequest { url("https://api.example.com") }` | Apply base URL and headers to every call |
| Close client | `client.close()` | Release connection resources when done |

### Ktor Server Essentials

| Action | Code | Description |
|--------|------|-------------|
| Embedded server | `embeddedServer(Netty, port = 8080) { module() }` | Start a server without an external container |
| Start server | `.start(wait = true)` | Block the main thread and serve requests |
| Route definition | `routing { get("/") { ... } }` | Register HTTP handlers |
| Path parameter | `get("/user/{id}") { call.parameters["id"] }` | Read a variable segment of the path |
| Query parameter | `call.request.queryParameters["q"]` | Read a query string value |
| Respond text | `call.respondText("Hello, Ktor!")` | Return a plain text response |
| Respond JSON | `call.respond(user)` | Serialize an object with the installed serializer |
| Receive body | `val user = call.receive<User>()` | Deserialize the request body into an object |

### Content Negotiation and Serialization

| Action | Code | Description |
|--------|------|-------------|
| Client plugin | `install(ContentNegotiation) { json() }` | Register JSON handling on the client |
| Server plugin | `install(ContentNegotiation) { json(Json { prettyPrint = true }) }` | Register JSON with pretty printing on the server |
| Serializable class | `@Serializable data class User(val id: Int, val name: String)` | Mark a class for kotlinx.serialization |
| Custom JSON config | `json(Json { ignoreUnknownKeys = true })` | Tolerate unknown fields in payloads |
| Send JSON | `client.post(url) { contentType(ContentType.Application.Json); setBody(user) }` | POST with an explicit JSON content type |
| Receive list | `val users = client.get(url).body<List<User>>()` | Deserialize a JSON array |

### Authentication

| Action | Code | Description |
|--------|------|-------------|
| Install auth | `install(Authentication) { ... }` | Enable the authentication plugin |
| Basic auth | `basic("my-basic") { validate { credentials -> ... } }` | Validate username and password credentials |
| Bearer auth | `bearer { authenticate { ... } }` | Validate bearer tokens from the Authorization header |
| JWT auth | `jwt { verifier(verifier); validate { credential -> ... } }` | Verify and validate JWT tokens |
| Client credentials | `client.get(url) { basicAuth("user", "pass") }` | Send basic credentials from the client |

### WebSockets

| Action | Code | Description |
|--------|------|-------------|
| Server plugin | `install(WebSockets)` | Enable the WebSocket plugin on the server |
| Server handler | `webSocket("/chat") { ... }` | Handle a WebSocket connection at a route |
| Client session | `client.webSocket("ws://host/chat") { ... }` | Open a WebSocket session from the client |
| Send text | `send(Frame.Text("hello"))` | Send a text frame |
| Receive frames | `for (frame in incoming) { ... }` | Iterate over incoming frames |
| Ping/pong | `send(Frame.Ping(...))` | Keep the connection alive with control frames |

### Plugins and Features

| Plugin | Purpose |
|--------|---------|
| `CallLogging` | Log method, path, status, and duration of each call |
| `DefaultHeaders` | Add default headers such as `Server` and `Date` |
| `CORS` | Configure cross-origin resource sharing rules |
| `Compression` | Compress responses with gzip/deflate |
| `StatusPages` | Map exceptions to HTTP status codes and bodies |
| `ContentNegotiation` | Serialize and deserialize JSON (or other formats) |
| `Authentication` | Protect routes with basic, bearer, or JWT auth |
| `WebSockets` | Upgrade routes to bidirectional WebSocket connections |

## Common Commands

### Gradle Dependencies — Ktor Client

```kotlin
// build.gradle.kts — module: app
val ktorVersion = "2.3.12"

dependencies {
    implementation("io.ktor:ktor-client-core:$ktorVersion")
    implementation("io.ktor:ktor-client-cio:$ktorVersion")
    implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
}
```

### Gradle Dependencies — Ktor Server

```kotlin
// build.gradle.kts — module: server
val ktorVersion = "2.3.12"

dependencies {
    implementation("io.ktor:ktor-server-core:$ktorVersion")
    implementation("io.ktor:ktor-server-netty:$ktorVersion")
    implementation("io.ktor:ktor-server-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
}
```

### Gradle Dependencies — WebSockets and Auth

```kotlin
// build.gradle.kts — optional plugins
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

### Running and Building

```bash
# Run the embedded server from Gradle
./gradlew run

# Build a self-contained fat JAR (Shadow plugin) and run it
./gradlew shadowJar
java -jar build/libs/server-all.jar

# Set the port from the command line
./gradlew run -Pport=9090
```

### Testing Commands

```bash
# Run all tests
./gradlew test

# Run a single test class
./gradlew test --tests "com.example.UserRouteTest"

# Run tests and print detailed output
./gradlew test --info
```

## Code Snippets

### Ktor Client: Basic GET Request

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

### Ktor Client: JSON POST with Content Negotiation

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

### Ktor Client: Timeouts and Default Request

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

### Ktor Server: Minimal Embedded Server

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
                call.respondText("Hello, Ktor!")
            }
        }
    }.start(wait = true)
}
```

### Ktor Server: Routing with Path Parameters

```kotlin
import io.ktor.server.application.call
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing

fun Application.routes() {
    routing {
        get("/user/{id}") {
            val id = call.parameters["id"] ?: return@get call.respondText("Missing id")
            call.respondText("User $id")
        }
        get("/search") {
            val query = call.request.queryParameters["q"] ?: ""
            call.respondText("Searching for: $query")
        }
    }
}
```

### Ktor Server: JSON API with Content Negotiation

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
            call.respond(listOf(User(1, "Alice"), User(2, "Bob")))
        }
        post("/users") {
            val user = call.receive<User>()
            call.respond(User(id = 3, name = user.name))
        }
    }
}
```

### Authentication: Basic

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
            realm = "Admin Area"
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
                call.respondText("Welcome, admin!")
            }
        }
    }
}
```

### Authentication: JWT (Bearer)

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
    val secret = "change-me-in-production"
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

### WebSocket Server Handler

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
            send(Frame.Text("Welcome to the chat!"))
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

### WebSocket Client

```kotlin
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.readText

suspend fun chatWithServer() {
    val client = HttpClient(CIO) {
        install(WebSockets)
    }
    client.webSocket("ws://localhost:8080/chat") {
        send(Frame.Text("Hello server"))
        for (frame in incoming) {
            if (frame is Frame.Text) {
                println(frame.readText())
            }
        }
    }
    client.close()
}
```

### API Testing with testApplication

```kotlin
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals

class UserRouteTest {

    @Test
    fun rootReturnsHello() = testApplication {
        application {
            module()
        }
        val response = client.get("/")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("Hello, Ktor!", response.bodyAsText())
    }
}
```
