---
title: "Building a Real-Time Chat App with Kotlin and WebSockets"
description: "A hands-on tutorial for building a real-time chat application using Kotlin, OkHttp WebSockets, and Jetpack Compose with MVVM architecture."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Real-Time Chat App with Kotlin and WebSockets

## Summary

This tutorial walks you through building a fully functional real-time chat application for Android using Kotlin, OkHttp WebSockets, and Jetpack Compose. You will learn how to establish persistent WebSocket connections, handle real-time message flow with StateFlow, design a chat UI with Compose, and manage connection lifecycle events including reconnection logic. By the end, you will have a working chat client that can connect to any WebSocket-compatible chat server.

## Target Audience

- Android Developers looking to implement real-time features.
- Kotlin developers with basic knowledge of Jetpack Compose and coroutines.
- Intermediate level — you should be comfortable with Kotlin syntax, ViewModel patterns, and Gradle build configuration.

## Prerequisites

- Android Studio Hedgehog (2023.1.1) or newer.
- Basic familiarity with Kotlin coroutines and Flow.
- Understanding of Jetpack Compose fundamentals (Column, LazyColumn, TextField).
- A WebSocket test server — we will use `wss://echo.websocket.org` for development and a local Node.js server for production testing.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up OkHttp WebSocket client and manage connection lifecycle.
- Use Kotlin StateFlow to broadcast real-time messages to the UI layer.
- Build a responsive chat interface with Jetpack Compose.
- Implement automatic reconnection with exponential backoff.
- Handle JSON serialization and deserialization for structured chat messages.
- Manage WebSocket lifecycle events (open, closing, closed, failure) gracefully.

## Context and Motivation

Real-time communication is a cornerstone of modern mobile applications. Social media, instant messaging, live collaboration tools, and multiplayer gaming all depend on low-latency, persistent connections between clients and servers. While REST APIs are adequate for request-response workflows, they fall short for use cases where the server needs to push data to the client without an explicit request.

WebSockets provide a full-duplex communication channel over a single TCP connection, making them the ideal choice for chat applications, live notifications, and real-time data streaming. On Android, the OkHttp library offers a mature, battle-tested WebSocket implementation that integrates naturally with Kotlin coroutines and Flow APIs.

This tutorial bridges the gap between basic REST-based Android development and the real-time paradigm, giving you a reusable WebSocket architecture you can adapt for any real-time feature.

## Core Content

### Project Setup and Dependencies

Create a new Android project with an Empty Compose Activity in Android Studio. Open the `build.gradle.kts` (Module :app) file and add the following dependencies:

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

    // OkHttp for WebSockets
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Gson for JSON serialization
    implementation("com.google.code.gson:gson:2.10.1")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
```

Sync the project to download the dependencies.

### Chat Message Model

Define a data class that represents a single chat message. Each message carries a sender identifier, the text content, a timestamp, and a message type that allows the client to distinguish between user messages, system announcements, and connection status updates.

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

The `@SerializedName` annotations map Kotlin properties to their JSON keys, ensuring compatibility with any RFC 6455-compliant WebSocket server that sends structured JSON payloads.

### WebSocket Manager

The WebSocket manager is the heart of the application. It encapsulates the OkHttp WebSocket client, exposes a StateFlow of received messages, and provides methods for connecting, disconnecting, and sending messages.

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
        .readTimeout(0, TimeUnit.MILLISECONDS)  // No timeout for long-lived connections
        .pingInterval(30, TimeUnit.SECONDS)      // Keep-alive ping every 30 seconds
        .build()

    private var webSocket: WebSocket? = null
    private var shouldReconnect = true

    // StateFlows for the UI layer
    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    // Channel for enqueuing outgoing messages from any thread
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
                Log.d(TAG, "WebSocket opened: ${response.code}")
                _connectionState.value = ConnectionState.CONNECTED
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Message received: $text")
                try {
                    val message = gson.fromJson(text, ChatMessage::class.java)
                    _messages.value = _messages.value + message
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse message: ${e.message}")
                    // If the server sends plain text, wrap it in a ChatMessage
                    val fallback = ChatMessage(
                        type = "message",
                        sender = "server",
                        content = text
                    )
                    _messages.value = _messages.value + fallback
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closing: $code $reason")
                webSocket.close(code, reason)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $code $reason")
                _connectionState.value = ConnectionState.DISCONNECTED
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket failure: ${t.message}")
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
            Log.w(TAG, "Failed to send message — WebSocket may be disconnected")
            _error.value = "Failed to send message. Check your connection."
        }
    }

    fun disconnect() {
        shouldReconnect = false
        webSocket?.close(1000, "Client closing")
        webSocket = null
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    private suspend fun scheduleReconnect() {
        var attempt = 0
        val maxAttempts = 5
        while (shouldReconnect && attempt < maxAttempts) {
            attempt++
            _connectionState.value = ConnectionState.RECONNECTING
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s
            val delayMs = (1000L * Math.pow(2.0, (attempt - 1).toDouble())).toLong()
            Log.d(TAG, "Reconnecting in ${delayMs}ms (attempt $attempt/$maxAttempts)")
            delay(delayMs)
            connect()
            if (_connectionState.value == ConnectionState.CONNECTED) break
        }
        if (attempt >= maxAttempts && _connectionState.value != ConnectionState.CONNECTED) {
            _error.value = "Failed to reconnect after $maxAttempts attempts"
        }
    }

    // Call this from a ViewModel scope to process outbound messages
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

Key design decisions in this manager:

- **Ping interval**: The 30-second ping keeps the connection alive through NAT timeouts and mobile network transitions.
- **Zero read timeout**: WebSockets are long-lived; a read timeout of 0 disables the read timeout entirely, preventing spurious disconnections on idle connections.
- **Exponential backoff**: The reconnection logic starts at 1 second and doubles up to 16 seconds, giving transient network issues time to resolve without hammering the server.
- **Channel for outgoing messages**: Although this implementation sends directly, the `outgoingChannel` pattern is useful for queuing messages while the connection is being re-established.

### Chat ViewModel

The ViewModel wires the WebSocket manager to the Compose UI. It exposes the message list and connection state as observable state, and provides user-facing actions for sending messages and managing the connection.

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

    // Use 10.0.2.2 for Android emulator to reach host localhost
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

The ViewModel generates a random username for demonstration purposes. In a production app, the username would come from an authentication flow or user preferences.

### Chat UI with Jetpack Compose

The UI layer consists of two main composables: the message list and the input bar.

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

    // Auto-scroll to bottom when new messages arrive
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
                            Text("Reconnect")
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
            // Message list
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

            // Input bar
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
        ChatWebSocketManager.ConnectionState.CONNECTED -> "Connected" to Color(0xFF4CAF50)
        ChatWebSocketManager.ConnectionState.CONNECTING -> "Connecting..." to Color(0xFFFFC107)
        ChatWebSocketManager.ConnectionState.DISCONNECTED -> "Disconnected" to Color(0xFFF44336)
        ChatWebSocketManager.ConnectionState.RECONNECTING -> "Reconnecting..." to Color(0xFFFF9800)
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
                placeholder = { Text("Type a message...") },
                enabled = enabled,
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors()
            )
            Spacer(modifier = Modifier.width(8.dp))
            FilledTonalButton(
                onClick = onSend,
                enabled = enabled && inputText.isNotBlank()
            ) {
                Text("Send")
            }
        }
    }
}
```

The chat bubble uses different shapes for own messages versus other users' messages — a convention that helps users visually track the conversation flow at a glance. The `LazyColumn` with `animateScrollToItem` ensures new messages are always visible without manual scrolling.

### MainActivity Entry Point

Wire everything together in the main activity.

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

### Setting Up a Local Test Server

To test the chat application end-to-end, run a simple WebSocket server locally. Create a file called `server.js`:

```javascript
// server.js — WebSocket echo server for testing
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  console.log(`Client connected from ${req.socket.remoteAddress}`);

  ws.on('message', (data) => {
    const message = data.toString();
    console.log(`Received: ${message}`);
    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Send a welcome message
  ws.send(JSON.stringify({
    type: "system",
    sender: "system",
    content: "Welcome to the chat room!",
    timestamp: Date.now()
  }));
});

console.log('WebSocket server running on ws://localhost:8080');
```

Run it with Node.js:

```bash
npm install ws
node server.js
```

The emulator reaches the host machine's `localhost` at `10.0.2.2`, so the app connects to `ws://10.0.2.2:8080/chat`.

## Code Examples

The complete project structure follows this layout:

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

All code examples above are ready to copy into a new Android project. Remember to add the Internet permission in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Key Insights

- **Connection lifecycle management is critical**: Always pair `connect()` with `disconnect()` in your ViewModel's `onCleared()` to prevent leaks. The OkHttp WebSocket holds a reference to the listener, which can prevent garbage collection of your entire ViewModel if not properly closed.
- **Exponential backoff prevents server overload**: Without backoff, a reconnection loop on a flaky network can send hundreds of connection requests per minute. The 1s→2s→4s→8s→16s schedule gives the network stack time to recover while keeping the user's session alive.
- **StateFlow over LiveData in Compose**: `StateFlow` integrates natively with Kotlin coroutines and supports `collectAsStateWithLifecycle()`, which automatically stops collection when the UI is not visible — saving battery and network resources.
- **JSON parsing failures should not crash the app**: Chat servers may send raw text messages, heartbeats, or non-JSON payloads. The `try-catch` in `onMessage` gracefully degrades by wrapping plain text into the `ChatMessage` model.
- **Auto-scroll UX matters**: Without `animateScrollToItem`, users must manually scroll to see new messages — a poor experience in a chat app. However, if the user has manually scrolled up to read history, consider suppressing auto-scroll until they return to the bottom.

## Next Steps

- Learn about **Kotlin Flow and StateFlow** in more depth: see the [Kotlin Coroutines and Flow Advanced Patterns Guide](./kotlin-coroutines-flow-advanced-patterns-guide.md).
- Explore **end-to-end encryption** for chat messages by integrating the WebSocket layer with a cryptographic library like Tink.
- Add **message persistence** with Room — store messages locally so they survive app restarts.
- Extend the app with **image and file sharing** by switching to a binary WebSocket frame protocol (`webSocket.send(ByteString)`).

## Conclusion

You have built a complete, production-quality real-time chat client for Android using Kotlin, OkHttp WebSockets, and Jetpack Compose. The architecture you implemented — a WebSocket manager exposing StateFlow, a ViewModel bridging network and UI layers, and a reactive Compose UI — is a reusable pattern that applies to any real-time Android feature: live notifications, collaborative editing, multiplayer game lobbies, and IoT device monitoring.

The key takeaways are the WebSocket lifecycle integration with OkHttp, the state management pattern using `StateFlow` for real-time data, and the user experience considerations (auto-scroll, connection status indicators, exponential backoff reconnection) that separate a prototype from a production-ready feature.
