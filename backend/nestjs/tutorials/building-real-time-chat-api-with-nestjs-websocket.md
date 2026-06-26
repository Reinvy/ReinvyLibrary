---
title: "Building a Real-Time Chat API with NestJS and WebSocket Gateway"
description: "A comprehensive tutorial on building a real-time chat application using NestJS WebSocket gateways, Socket.io, TypeORM, and JWT authentication for secure message communication."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Real-Time Chat API with NestJS and WebSocket Gateway

## Summary

Real-time communication is a cornerstone of modern web applications, powering everything from instant messaging and live notifications to collaborative editing and gaming. This tutorial walks through building a complete real-time chat API using NestJS WebSocket gateways with Socket.io. You will learn how to set up a WebSocket server with authentication, manage chat rooms, persist messages using TypeORM with PostgreSQL, and implement bidirectional event-driven communication between clients and the server.

## Target Audience

- Backend developers and fullstack developers who want to add real-time features to their applications.
- Intermediate level. Familiarity with NestJS fundamentals (modules, controllers, providers) and basic TypeScript is recommended.
- Developers who have completed a basic NestJS tutorial and want to explore WebSocket capabilities.

## Prerequisites

- Node.js (v18 or later) and npm installed.
- Basic knowledge of NestJS (modules, controllers, providers, decorators).
- Understanding of TypeScript syntax and decorators.
- PostgreSQL database running locally or via Docker.
- A REST API client (like Postman, Insomnia, or curl) for initial testing.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up and configure a NestJS WebSocket gateway using the `@nestjs/platform-socket.io` package.
- Implement JWT-based authentication for WebSocket connections using the `@nestjs/passport` adapter.
- Manage real-time chat rooms with Socket.io room primitives (`join` and `leave`).
- Persist chat messages and room metadata using TypeORM and PostgreSQL.
- Handle WebSocket events for sending, editing, and deleting messages in real time.
- Integrate a Socket.io client to test the complete chat flow end to end.

## Context and Motivation

Traditional HTTP-based APIs follow a request-response model where the client initiates every interaction. While perfectly adequate for CRUD operations, this model breaks down for features that require **server-to-client push** — chat messages, live notifications, collaborative cursors, or real-time dashboards.

WebSocket technology solves this by establishing a persistent, bidirectional communication channel between the client and server. NestJS provides a first-class abstraction over WebSocket via its **Gateways** pattern, which integrates seamlessly with the same module system, dependency injection, and guard infrastructure you already use for REST endpoints.

Building a chat API is the ideal gateway project for learning real-time patterns with NestJS. It touches on every important WebSocket concept — connection lifecycle, event routing, room management, authentication, persistence, and error handling — in a context that is immediately relatable and production-relevant.

## Core Content

### Setting Up the NestJS Project

Begin by creating a new NestJS project and installing the required dependencies for WebSocket and database support:

```bash
nest new realtime-chat-api --package-manager npm
cd realtime-chat-api
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install class-validator class-transformer
npm install --save-dev @types/socket.io
```

The key package here is `@nestjs/platform-socket.io`, which provides the `@WebSocketGateway()` decorator and the gateway lifecycle hooks.

### Database Configuration with TypeORM

Set up a PostgreSQL connection and define the entities needed for the chat application. Create a `TypeOrmModule` configuration in the application root module:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'realtime_chat',
      autoLoadEntities: true,
      synchronize: true, // use migrations in production
    }),
    ChatModule,
    AuthModule,
  ],
})
export class AppModule {}
```

### Defining the Message and Room Entities

The chat application needs two core entities: `ChatRoom` which represents a conversation channel, and `Message` which stores individual messages within a room:

```typescript
// chat/entities/chat-room.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, OneToMany,
} from 'typeorm';
import { Message } from './message.entity';

@Entity()
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isPrivate: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Message, (message) => message.room)
  messages: Message[];
}
```

```typescript
// chat/entities/message.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column()
  senderId: string;

  @Column()
  senderName: string;

  @ManyToOne(() => ChatRoom, (room) => room.messages)
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @Column()
  roomId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isEdited: boolean;
}
```

### JWT Authentication Guard

WebSocket connections need authentication just like HTTP endpoints. Create a JWT strategy that extracts the token from the connection handshake:

```typescript
// auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key',
    });
  }

  async validate(payload: { sub: string; username: string }) {
    return { userId: payload.sub, username: payload.username };
  }
}

// Auth guard for WebSocket connections
@Injectable()
export class WsJwtGuard {
  constructor(private readonly jwtService: JwtService) {}

  async validate(client: Socket): Promise<{ userId: string; username: string }> {
    const token = client.handshake.auth?.token
      || client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new WsException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-key',
      });
      return { userId: payload.sub, username: payload.username };
    } catch {
      throw new WsException('Invalid authentication token');
    }
  }
}
```

### Building the WebSocket Gateway

The gateway is the heart of the real-time application. It handles client connections, manages rooms, and processes message events:

```typescript
// chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../auth/jwt.strategy';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, { socketId: string; username: string; roomId?: string }> =
    new Map();

  constructor(private readonly chatService: ChatService) {}

  // Validate token on connection
  async handleConnection(client: Socket) {
    try {
      const user = await this.wsGuard.validate(client);
      this.connectedUsers.set(client.id, {
        socketId: client.id,
        username: user.username,
      });
      client.data.user = user;
      client.emit('connected', { message: `Welcome, ${user.username}!` });
    } catch (error) {
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user?.roomId) {
      client.to(user.roomId).emit('userLeft', {
        username: user.username,
        roomId: user.roomId,
      });
    }
    this.connectedUsers.delete(client.id);
  }

  // --- Room Management ---

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const user = client.data.user;
    const room = await this.chatService.findOrValidateRoom(data.roomId);

    client.join(data.roomId);
    this.connectedUsers.set(client.id, {
      ...this.connectedUsers.get(client.id),
      roomId: data.roomId,
    });

    // Notify others in the room
    client.to(data.roomId).emit('userJoined', {
      username: user.username,
      roomId: data.roomId,
    });

    // Send recent messages to the joining user
    const recentMessages = await this.chatService.getMessages(data.roomId, 50);
    client.emit('roomHistory', { roomId: data.roomId, messages: recentMessages });

    return { event: 'roomJoined', data: { roomId: data.roomId } };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.leave(data.roomId);
    const user = this.connectedUsers.get(client.id);
    if (user) {
      user.roomId = undefined;
      client.to(data.roomId).emit('userLeft', {
        username: user.username,
        roomId: data.roomId,
      });
    }
    return { event: 'roomLeft', data: { roomId: data.roomId } };
  }

  // --- Message Events ---

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    const user = client.data.user;

    if (!data.content?.trim()) {
      throw new WsException('Message content cannot be empty');
    }

    const message = await this.chatService.createMessage({
      roomId: data.roomId,
      content: data.content.trim(),
      senderId: user.userId,
      senderName: user.username,
    });

    // Broadcast to everyone in the room INCLUDING sender
    this.server.to(data.roomId).emit('newMessage', message);
    return message;
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    const user = client.data.user;
    const updated = await this.chatService.editMessage(
      data.messageId,
      user.userId,
      data.content.trim(),
    );

    // Broadcast the edited message to the room
    this.server.to(updated.roomId).emit('messageEdited', updated);
    return updated;
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; roomId: string },
  ) {
    const user = client.data.user;
    await this.chatService.deleteMessage(data.messageId, user.userId);

    this.server.to(data.roomId).emit('messageDeleted', {
      messageId: data.messageId,
      roomId: data.roomId,
    });
    return { success: true };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    const user = client.data.user;
    client.to(data.roomId).emit('userTyping', {
      username: user.username,
      isTyping: data.isTyping,
    });
  }
}
```

### The Chat Service Layer

Encapsulate business logic and database interactions in a dedicated service:

```typescript
// chat/chat.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepository: Repository<ChatRoom>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async findOrValidateRoom(roomId: string): Promise<ChatRoom> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Chat room ${roomId} not found`);
    }
    return room;
  }

  async createRoom(data: { name: string; description?: string; isPrivate?: boolean }): Promise<ChatRoom> {
    const room = this.roomRepository.create(data);
    return this.roomRepository.save(room);
  }

  async listRooms(): Promise<ChatRoom[]> {
    return this.roomRepository.find({ order: { createdAt: 'DESC' } });
  }

  async createMessage(data: {
    roomId: string;
    content: string;
    senderId: string;
    senderName: string;
  }): Promise<Message> {
    await this.findOrValidateRoom(data.roomId);

    const message = this.messageRepository.create({
      roomId: data.roomId,
      content: data.content,
      senderId: data.senderId,
      senderName: data.senderName,
    });
    return this.messageRepository.save(message);
  }

  async getMessages(roomId: string, limit = 50): Promise<Message[]> {
    return this.messageRepository.find({
      where: { roomId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = newContent;
    message.isEdited = true;
    return this.messageRepository.save(message);
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepository.remove(message);
  }
}
```

### Wiring Up the Chat Module

Register all the components in a feature module:

```typescript
// chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatRoom } from './entities/chat-room.entity';
import { Message } from './entities/message.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, Message]),
    AuthModule,
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
```

## Code Examples

### Complete Client-Side Integration

The following HTML page demonstrates how to connect to the NestJS WebSocket server and interact with all the features built above. Save it as `chat-client.html` and open it in a browser after starting the server:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>NestJS Chat Client</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    #messages { border: 1px solid #ddd; height: 400px; overflow-y: auto; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; }
    .msg { margin-bottom: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 6px; }
    .msg .meta { font-size: 0.8rem; color: #666; }
    .msg .edited { font-style: italic; color: #999; font-size: 0.75rem; }
    input, button { padding: 0.5rem 1rem; margin: 0.25rem; }
    #rooms { margin-bottom: 1rem; }
    .room-btn { background: #0070f3; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    .room-btn.active { background: #0050b3; }
  </style>
</head>
<body>
  <h1>NestJS Real-Time Chat</h1>

  <div id="auth">
    <input type="text" id="tokenInput" placeholder="JWT Token" size="60" />
    <button onclick="connect()">Connect</button>
  </div>

  <div id="chat" style="display:none">
    <div id="rooms"></div>
    <div id="messages"></div>
    <div id="inputArea">
      <input type="text" id="messageInput" placeholder="Type a message..." style="width: 70%" />
      <button onclick="sendMessage()">Send</button>
    </div>
    <p id="typingIndicator" style="font-style: italic; color: #666; height: 1.2rem;"></p>
  </div>

  <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
  <script>
    let socket;
    let currentRoom = null;
    let username = '';

    async function connect() {
      const token = document.getElementById('tokenInput').value;
      if (!token) return alert('Enter a JWT token');

      // Decode JWT to get username (for demo purposes)
      const payload = JSON.parse(atob(token.split('.')[1]));
      username = payload.username;

      socket = io('http://localhost:3000/chat', {
        auth: { token },
      });

      socket.on('connect', () => {
        document.getElementById('auth').style.display = 'none';
        document.getElementById('chat').style.display = 'block';
        loadRooms();
      });

      socket.on('connected', (data) => {
        console.log(data.message);
      });

      socket.on('newMessage', (msg) => {
        displayMessage(msg);
      });

      socket.on('messageEdited', (msg) => {
        updateMessageElement(msg);
      });

      socket.on('messageDeleted', (data) => {
        document.getElementById(`msg-${data.messageId}`)?.remove();
      });

      socket.on('roomHistory', (data) => {
        document.getElementById('messages').innerHTML = '';
        data.messages.reverse().forEach(displayMessage);
      });

      socket.on('userJoined', (data) => {
        addSystemMessage(`${data.username} joined the room`);
      });

      socket.on('userLeft', (data) => {
        addSystemMessage(`${data.username} left the room`);
      });

      socket.on('userTyping', (data) => {
        const indicator = document.getElementById('typingIndicator');
        indicator.textContent = data.isTyping ? `${data.username} is typing...` : '';
      });

      socket.on('error', (data) => {
        alert(`Error: ${data.message}`);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected');
      });
    }

    async function loadRooms() {
      const response = await fetch('http://localhost:3000/api/rooms', {
        headers: { Authorization: `Bearer ${document.getElementById('tokenInput').value}` },
      });
      const rooms = await response.json();
      const container = document.getElementById('rooms');
      container.innerHTML = '<strong>Rooms:</strong> ';
      rooms.forEach((room) => {
        const btn = document.createElement('button');
        btn.className = 'room-btn';
        btn.textContent = room.name;
        btn.onclick = () => joinRoom(room.id, btn);
        container.appendChild(btn);
      });
    }

    function joinRoom(roomId, btn) {
      if (currentRoom) {
        socket.emit('leaveRoom', { roomId: currentRoom });
      }
      socket.emit('joinRoom', { roomId });
      currentRoom = roomId;
      document.querySelectorAll('.room-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    }

    function sendMessage() {
      const input = document.getElementById('messageInput');
      const content = input.value.trim();
      if (!content || !currentRoom) return;

      socket.emit('sendMessage', { roomId: currentRoom, content });
      input.value = '';
    }

    function displayMessage(msg) {
      const container = document.getElementById('messages');
      const div = document.createElement('div');
      div.className = 'msg';
      div.id = `msg-${msg.id}`;
      div.innerHTML = `
        <div class="meta">${msg.senderName} &middot; ${new Date(msg.createdAt).toLocaleTimeString()}</div>
        <div class="content">${escapeHtml(msg.content)}${msg.isEdited ? ' <span class="edited">(edited)</span>' : ''}</div>
      `;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }

    function updateMessageElement(msg) {
      const el = document.getElementById(`msg-${msg.id}`);
      if (el) {
        el.querySelector('.content').innerHTML =
          `${escapeHtml(msg.content)} <span class="edited">(edited)</span>`;
      }
    }

    function addSystemMessage(text) {
      const container = document.getElementById('messages');
      const div = document.createElement('div');
      div.style.cssText = 'text-align: center; color: #666; font-style: italic; margin: 0.5rem 0;';
      div.textContent = text;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Typing indicator
    let typingTimeout;
    document.getElementById('messageInput').addEventListener('input', () => {
      if (!currentRoom) return;
      socket.emit('typing', { roomId: currentRoom, isTyping: true });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit('typing', { roomId: currentRoom, isTyping: false });
      }, 1000);
    });
  </script>
</body>
</html>
```

### REST Endpoints for Room Management

Add HTTP endpoints alongside the WebSocket gateway for room CRUD operations:

```typescript
// chat/chat.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('api/rooms')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async listRooms() {
    return this.chatService.listRooms();
  }

  @Post()
  async createRoom(@Body() data: { name: string; description?: string }) {
    return this.chatService.createRoom(data);
  }
}
```

## Key Insights

- **Gateway lifecycle hooks** (`OnGatewayConnection`, `OnGatewayDisconnect`) are the WebSocket equivalent of NestJS controller lifecycle hooks. Use `handleConnection` to validate authentication before allowing any event processing — this prevents unauthorized users from joining private rooms or sending messages.
- **Socket.io rooms vs NestJS modules**: Socket.io room primitives (`client.join()` / `client.leave()`) are lightweight string-based identifiers, not database entities. They exist only in memory on the server. Always persist room metadata (name, description, privacy settings) in your database and use the string `roomId` to bridge the two worlds.
- **Broadcast granularity matters**: Use `this.server.to(roomId).emit(...)` when you want every connected client in the room (including the sender) to receive an event. Use `client.to(roomId).emit(...)` to exclude the sender. Choose deliberately based on whether the sender needs to confirm delivery.
- **Token-based WebSocket auth**: Unlike HTTP where every request carries an `Authorization` header, WebSocket connections authenticate once during the handshake. Store the validated user payload in `client.data` so you can access it in every subsequent event handler without re-validating the token.
- **Error propagation**: NestJS gateway methods that throw `WsException` are automatically caught and the error message is sent back to the client as an `exception` event. This mirrors the HTTP exception filter pattern and keeps error handling consistent across transports.

## Next Steps

- Add **message reactions** (emoji responses) using a separate `reactions` table and a new `addReaction` event.
- Implement **private messaging** by creating one-on-one rooms automatically when two users initiate a direct chat.
- Add **file sharing** in chat messages by integrating with a file storage service (S3, MinIO) and sending the file URL as part of the message payload.
- Explore the `@nestjs/platform-ws` adapter for a raw `ws` WebSocket implementation instead of Socket.io.
- Review the [NestJS Development Syllabus](/backend/nestjs/syllabi/nestjs-development-syllabus.md) for a structured learning path covering advanced NestJS topics including microservices, GraphQL, and testing strategies.

## Conclusion

You have built a fully functional real-time chat API using NestJS WebSocket gateways. The application supports authenticated connections, multi-room chat with join/leave semantics, persistent message history, and real-time typing indicators — all within NestJS's modular architecture. The gateway pattern you implemented here extends to any real-time use case: live dashboards push metrics to connected clients, collaborative editing tools synchronize document state, and notification systems alert users of important events. By mastering NestJS gateways, you have added a powerful communication pattern to your backend development toolkit.
