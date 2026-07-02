---
title: "Building a Real-Time Chat Application with Laravel Reverb"
description: "A comprehensive step-by-step tutorial on building a real-time chat application using Laravel Reverb WebSocket server, event broadcasting, Laravel Echo, and presence channels."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Real-Time Chat Application with Laravel Reverb

## Summary

This tutorial walks through building a fully functional real-time chat application using Laravel Reverb — Laravel's first-party, scalable WebSocket server. You will learn how to install and configure Reverb, implement event broadcasting with Laravel's broadcasting system, authenticate WebSocket connections with Sanctum, manage chat rooms and private messaging, use presence channels for online status tracking, and integrate Laravel Echo on the client side. By the end, you will have a production-ready real-time chat system with multi-room support, typing indicators, and user presence.

## Target Audience

- Backend Developers and Fullstack Developers who want to build real-time features with Laravel.
- Advanced level — assumes familiarity with Laravel basics, Eloquent, authentication, and JavaScript.

## Prerequisites

- Laravel 11.x application with basic authentication (Sanctum or Laravel Breeze).
- PHP 8.2+ with the `ext-pcntl` extension for running Reverb.
- Node.js and NPM installed for Laravel Echo and Vite.
- Composer installed globally.
- Basic understanding of WebSocket concepts and event-driven architecture.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Install and configure Laravel Reverb as a standalone WebSocket server.
- Define broadcasting channels and implement event classes for real-time messaging.
- Authenticate WebSocket connections using Sanctum token-based and cookie-based auth.
- Build a multi-room chat system with private and presence channels.
- Implement typing indicators using channel `whisper` functionality.
- Integrate Laravel Echo on the client side with React or vanilla JavaScript.
- Scale Reverb horizontally using Redis and multiple server instances.

## Context and Motivation

Real-time communication has become a fundamental requirement for modern web applications. Chat systems, live notifications, collaborative editing, and real-time dashboards all depend on persistent, bidirectional communication between the server and client. Traditional HTTP request-response cycles are ill-suited for these use cases — they require polling, which wastes bandwidth and introduces latency.

Laravel Reverb, introduced in Laravel 11, provides a first-party solution to this problem. Unlike third-party services like Pusher or Ably, Reverb runs on your own infrastructure, eliminating per-connection costs and keeping data within your network boundary. It leverages Laravel's existing broadcasting system, which means developers who already know Laravel events and channels can add real-time capabilities with minimal additional learning.

Reverb uses the WebSocket protocol directly, avoiding the overhead of HTTP long-polling fallbacks. It supports Laravel Echo on the client side, integrates seamlessly with Laravel's authentication system, and scales horizontally through Redis. For teams building communication features, live collaboration tools, or any application requiring instant data flow, Reverb provides a production-grade foundation that grows with your user base.

## Core Content

### Project Setup and Dependencies

Start by ensuring your Laravel application is on version 11 or later and has basic authentication set up. Laravel Breeze with the Blade stack or Laravel Sanctum for API authentication both work well with Reverb.

Install the Reverb package via Composer:

```bash
composer require laravel/reverb
```

Publish the Reverb configuration file:

```bash
php artisan reverb:install
```

This command publishes `config/reverb.php` and sets up the necessary environment variables in your `.env` file. Reverb runs as a separate process alongside your main Laravel application, listening on a dedicated port (default `8080`) for WebSocket connections.

### Configuring Reverb

The Reverb configuration file defines two main application entries: one for the WebSocket server itself and one for the HTTP API that clients use to negotiate connections.

Key environment variables in `.env`:

```text
REVERB_APP_ID=my-chat-app
REVERB_APP_KEY=your-app-key-here
REVERB_APP_SECRET=your-app-secret-here
REVERB_HOST="0.0.0.0"
REVERB_PORT=8080
REVERB_SCHEME=http

# In production, use https and set a specific host
# REVERB_SCHEME=https
# REVERB_HOST=reverb.example.com
```

For development, `0.0.0.0` allows connections from any local interface. In production, restrict this to your Reverb server's domain.

### Broadcasting Configuration

Laravel's broadcasting system must be configured to use Reverb as the driver. Update your `.env` file:

```text
BROADCAST_CONNECTION=reverb
BROADCAST_DRIVER=reverb
```

Ensure `config/broadcasting.php` has the Reverb connections defined. The `reverb:install` command handles this automatically, but verify the connections array includes:

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

### Database Schema for Chat

Design the database schema to support multiple chat rooms, messages, and user participation. Create migrations for rooms, room participants, and messages.

First, create the models and migrations:

```bash
php artisan make:model ChatRoom -m
php artisan make:model ChatMessage -m
php artisan make:model ChatRoomUser -m
```

The `chat_rooms` migration:

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

The `chat_room_user` pivot migration:

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

The `chat_messages` migration:

```php
Schema::create('chat_messages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('chat_room_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->text('message');
    $table->timestamps();
});
```

Run the migrations:

```bash
php artisan migrate
```

### Defining Models and Relationships

Set up the Eloquent models with proper relationships:

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

### Broadcasting Events

Create broadcast events for new messages and user activity. Events in Laravel are simple classes that implement the `ShouldBroadcast` interface.

```bash
php artisan make:event MessageSent
php artisan make:event UserTyping
```

The `MessageSent` event broadcasts the new message to all participants in a room:

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

The `UserTyping` event uses a `whisper` on the channel rather than a full broadcast event. Whisper events are ephemeral — they are not stored in the database and are only delivered to current channel subscribers.

### Defining Authorization Channels

Channel authorization determines who can listen to a given channel. Define authorization callbacks in `routes/channels.php`:

```php
use App\Models\ChatRoom;

// Private channel for each chat room
Broadcast::channel('chat.room.{roomId}', function ($user, $roomId) {
    $room = ChatRoom::find($roomId);

    if (! $room) {
        return false;
    }

    // Allow if the user is a participant
    return $room->users()->where('user_id', $user->id)->exists()
        ? ['id' => $user->id, 'name' => $user->name]
        : false;
});

// Presence channel for online status in a room
Broadcast::channel('presence.chat.room.{roomId}', function ($user, $roomId) {
    $room = ChatRoom::find($roomId);

    if (! $room || ! $room->users()->where('user_id', $user->id)->exists()) {
        return false;
    }

    return ['id' => $user->id, 'name' => $user->name];
});
```

Private channels ensure only authorized participants can listen. Presence channels extend private channels by exposing the list of subscribed users to all members.

### API Endpoints for Chat

Create API routes to list rooms, send messages, and manage participants:

```php
// routes/api.php
use App\Http\Controllers\Api\ChatRoomController;
use App\Http\Controllers\Api\ChatMessageController;

Route::middleware('auth:sanctum')->group(function () {
    // Chat rooms
    Route::get('/chat/rooms', [ChatRoomController::class, 'index']);
    Route::post('/chat/rooms', [ChatRoomController::class, 'store']);
    Route::post('/chat/rooms/{room}/join', [ChatRoomController::class, 'join']);
    Route::post('/chat/rooms/{room}/leave', [ChatRoomController::class, 'leave']);

    // Messages
    Route::get('/chat/rooms/{room}/messages', [ChatMessageController::class, 'index']);
    Route::post('/chat/rooms/{room}/messages', [ChatMessageController::class, 'store']);
});
```

The message store endpoint creates a message and broadcasts the event:

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

The `toOthers()` method prevents the sender from receiving their own broadcast, avoiding duplicate messages on the client.

### Client Setup with Laravel Echo

On the client side, install Laravel Echo and the Reverb connector:

```bash
npm install --save-dev laravel-echo @dirkaholic/laravel-echo-reverb
```

Initialize Echo in your main JavaScript file:

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

Update your `.env` with the Vite-prefixed variables:

```text
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

### Listening to Messages on the Client

Subscribe to a chat room channel and listen for new messages:

```javascript
// Listen for new messages on a specific room
const roomId = 1;

Echo.private(`chat.room.${roomId}`)
    .listen('.MessageSent', (event) => {
        appendMessage(event.message, event.user);
    })
    .listenForWhisper('typing', (event) => {
        showTypingIndicator(event.user.name);
    });

// Send a typing indicator
function onTyping(roomId) {
    Echo.private(`chat.room.${roomId}`)
        .whisper('typing', { user: { name: currentUser.name } });
}
```

The `.` prefix before `MessageSent` tells Echo to listen for the event name without any namespace prefix that Laravel might append.

### Presence Channels for Online Status

Presence channels provide awareness of who is currently viewing a chat room. Subscribe to a presence channel:

```javascript
const presence = Echo.join(`presence.chat.room.${roomId}`)
    .here((users) => {
        // Called once with the current list of users
        updateOnlineUsers(users);
    })
    .joining((user) => {
        // Called when a new user joins
        addOnlineUser(user);
        showNotification(`${user.name} joined the room`);
    })
    .leaving((user) => {
        // Called when a user leaves
        removeOnlineUser(user);
    })
    .error((error) => {
        console.error('Presence channel error:', error);
    });
```

### Running Reverb

Start the Reverb server alongside your Laravel development server:

```bash
# Terminal 1: Laravel development server
php artisan serve

# Terminal 2: Reverb WebSocket server
php artisan reverb:start
```

For production, run Reverb as a daemon using Supervisor:

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

### Scaling Reverb with Redis

To scale Reverb horizontally across multiple servers, configure Redis as the broadcasting backend. When you add more Reverb instances, Redis ensures that messages published on one instance are delivered to subscribers connected to other instances.

```text
REVERB_SCALING_ENABLED=true
REVERB_SCALING_REDIS_HOST=127.0.0.1
REVERB_SCALING_REDIS_PORT=6379
REVERB_SCALING_REDIS_PASSWORD=null
```

With scaling enabled, each Reverb instance registers itself in Redis and subscribes to a shared pub/sub channel. A message broadcast on server A reaches clients connected to server B through Redis relay.

## Code Examples

### Complete Vue.js Chat Component

Here is a complete Vue 3 chat component that integrates with Echo and Reverb:

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
      {{ typingUsers.join(', ') }} typing{{ typingUsers.length > 1 ? '...' : '...' }}
    </div>
    <div class="chat-input">
      <input v-model="newMessage" @keydown="handleTyping" @keyup.enter="sendMessage"
             placeholder="Type a message...">
      <button @click="sendMessage">Send</button>
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
    .catch(err => console.error('Failed to load messages', err));
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
    .catch(err => console.error('Failed to send message', err));
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

### Reverb Testing with Artisan

Test your Reverb setup using Artisan's built-in broadcast testing command:

```bash
php artisan reverb:test
```

This command starts a temporary Reverb server and tests the connection. It validates that your app key, secret, and channel authorization are correctly configured.

## Key Insights

- **Choose the right channel type**: Private channels restrict access to authorized users; presence channels additionally expose the user list. Use private channels for one-to-one messaging and presence channels for group chats where online status matters.
- **Whisper events for ephemeral data**: Typing indicators, cursor positions, and other transient states should use whispers rather than full broadcast events. Whispers are not stored and do not trigger event serialization, making them significantly cheaper.
- **Always use `toOthers()`**: When broadcasting a message that the sender should also see (because it was already added to the local UI), call `toOthers()` on the broadcast to prevent duplicate messages. The sender's client already optimistically added the message to the UI.
- **Separate Reverb process for production**: Reverb runs as an independent PHP process. In production, use Supervisor to keep it running and restart it on failure. Never run Reverb behind your web server in the same process — it must be a standalone daemon.
- **Scaling considerations**: Redis-backed scaling works well for moderate loads. For very high throughput, consider dedicating specific Reverb instances to specific channels using a routing strategy, and use sticky WebSocket sessions behind a load balancer.
- **CSRF and CORS**: Reverb's HTTP API for channel authorization requires CSRF protection. Ensure your SPA or frontend sends the `X-CSRF-TOKEN` header with authorization requests. Configure CORS in `config/cors.php` if your frontend is on a different origin.

## Next Steps

- Explore Laravel Notifications with real-time broadcasting for system-wide alerts.
- Implement message persistence with SoftDeletes and message editing history in the database.
- Study the Laravel Reverb protocol specification to build custom client libraries.
- Review the official Laravel Broadcasting documentation for advanced channel patterns.

## Conclusion

In this tutorial, you built a complete real-time chat application with Laravel Reverb, covering the full stack from database schema design through WebSocket broadcasting to client-side integration with Laravel Echo. You learned how to define private and presence channels, authenticate WebSocket connections, broadcast events, handle ephemeral whispers for typing indicators, and scale Reverb with Redis. Laravel Reverb provides a powerful, first-party solution for real-time features that keeps your infrastructure simple and your costs predictable. The patterns you implemented here — channel authorization, event broadcasting, presence awareness — apply equally to live notifications, collaborative editing, real-time dashboards, and any other feature requiring instant data synchronization.
