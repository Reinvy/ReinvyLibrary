---
title: "Membangun API Chat Real-Time dengan NestJS dan WebSocket Gateway"
description: "Tutorial komprehensif tentang membangun aplikasi chat real-time menggunakan NestJS WebSocket gateway, Socket.io, TypeORM, dan autentikasi JWT untuk komunikasi pesan yang aman."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun API Chat Real-Time dengan NestJS dan WebSocket Gateway

## Ringkasan

Komunikasi real-time merupakan fondasi dari aplikasi web modern, mendukung berbagai fitur mulai dari pesan instan dan notifikasi langsung hingga pengeditan kolaboratif dan game. Tutorial ini memandu Anda dalam membangun API chat real-time yang lengkap menggunakan WebSocket gateway NestJS dengan Socket.io. Anda akan mempelajari cara menyiapkan server WebSocket dengan autentikasi, mengelola ruang obrolan, menyimpan pesan menggunakan TypeORM dengan PostgreSQL, dan mengimplementasikan komunikasi berbasis event dua arah antara klien dan server.

## Target Audiens

- Pengembang backend dan fullstack yang ingin menambahkan fitur real-time ke aplikasi mereka.
- Level menengah. Familiar dengan dasar-dasar NestJS (modul, controller, provider) dan TypeScript dasar disarankan.
- Pengembang yang telah menyelesaikan tutorial dasar NestJS dan ingin mengeksplorasi kemampuan WebSocket.

## Prasyarat

- Node.js (v18 atau lebih baru) dan npm terinstal.
- Pengetahuan dasar tentang NestJS (modul, controller, provider, dekorator).
- Pemahaman tentang sintaks TypeScript dan dekorator.
- PostgreSQL berjalan secara lokal atau melalui Docker.
- REST API client (seperti Postman, Insomnia, atau curl) untuk pengujian awal.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyiapkan dan mengonfigurasi WebSocket gateway NestJS menggunakan paket `@nestjs/platform-socket.io`.
- Mengimplementasikan autentikasi berbasis JWT untuk koneksi WebSocket menggunakan adapter `@nestjs/passport`.
- Mengelola ruang chat real-time dengan primitive ruang Socket.io (`join` dan `leave`).
- Menyimpan pesan chat dan metadata ruang menggunakan TypeORM dan PostgreSQL.
- Menangani event WebSocket untuk mengirim, mengedit, dan menghapus pesan secara real-time.
- Mengintegrasikan klien Socket.io untuk menguji alur chat secara end-to-end.

## Konteks dan Motivasi

API tradisional berbasis HTTP mengikuti model request-response di mana klien memulai setiap interaksi. Meskipun sangat memadai untuk operasi CRUD, model ini tidak cocok untuk fitur yang membutuhkan **push dari server ke klien** — pesan chat, notifikasi langsung, kursor kolaboratif, atau dashboard real-time.

Teknologi WebSocket memecahkan masalah ini dengan membangun saluran komunikasi persisten dua arah antara klien dan server. NestJS menyediakan abstraksi kelas satu atas WebSocket melalui pola **Gateway** yang terintegrasi secara mulus dengan sistem modul, dependency injection, dan infrastruktur guard yang sama yang Anda gunakan untuk endpoint REST.

Membangun API chat adalah proyek yang ideal untuk mempelajari pola real-time dengan NestJS. Ini menyentuh setiap konsep WebSocket penting — siklus hidup koneksi, routing event, manajemen ruang, autentikasi, persistensi, dan penanganan error — dalam konteks yang langsung relevan dan siap produksi.

## Konten Inti

### Menyiapkan Proyek NestJS

Mulailah dengan membuat proyek NestJS baru dan menginstal dependensi yang diperlukan untuk dukungan WebSocket dan database:

```bash
nest new realtime-chat-api --package-manager npm
cd realtime-chat-api
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install class-validator class-transformer
npm install --save-dev @types/socket.io
```

Paket kunci di sini adalah `@nestjs/platform-socket.io`, yang menyediakan dekorator `@WebSocketGateway()` dan hook siklus hidup gateway.

### Konfigurasi Database dengan TypeORM

Siapkan koneksi PostgreSQL dan definisikan entitas yang diperlukan untuk aplikasi chat. Buat konfigurasi `TypeOrmModule` di modul root aplikasi:

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
      synchronize: true, // gunakan migration di produksi
    }),
    ChatModule,
    AuthModule,
  ],
})
export class AppModule {}
```

### Mendefinisikan Entitas Message dan ChatRoom

Aplikasi chat membutuhkan dua entitas inti: `ChatRoom` yang merepresentasikan saluran percakapan, dan `Message` yang menyimpan setiap pesan dalam ruang:

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

### Guard Autentikasi JWT

Koneksi WebSocket membutuhkan autentikasi sama seperti endpoint HTTP. Buat strategi JWT yang mengekstrak token dari handshake koneksi:

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

// Auth guard untuk koneksi WebSocket
@Injectable()
export class WsJwtGuard {
  constructor(private readonly jwtService: JwtService) {}

  async validate(client: Socket): Promise<{ userId: string; username: string }> {
    const token = client.handshake.auth?.token
      || client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new WsException('Token autentikasi tidak ditemukan');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-key',
      });
      return { userId: payload.sub, username: payload.username };
    } catch {
      throw new WsException('Token autentikasi tidak valid');
    }
  }
}
```

### Membangun WebSocket Gateway

Gateway adalah jantung dari aplikasi real-time. Ia menangani koneksi klien, mengelola ruang, dan memproses event pesan:

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

  // Validasi token saat koneksi
  async handleConnection(client: Socket) {
    try {
      const user = await this.wsGuard.validate(client);
      this.connectedUsers.set(client.id, {
        socketId: client.id,
        username: user.username,
      });
      client.data.user = user;
      client.emit('connected', { message: `Selamat datang, ${user.username}!` });
    } catch (error) {
      client.emit('error', { message: 'Autentikasi gagal' });
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

  // --- Manajemen Ruang ---

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

    // Beri tahu pengguna lain di ruang
    client.to(data.roomId).emit('userJoined', {
      username: user.username,
      roomId: data.roomId,
    });

    // Kirim pesan terbaru ke pengguna yang bergabung
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

  // --- Event Pesan ---

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    const user = client.data.user;

    if (!data.content?.trim()) {
      throw new WsException('Isi pesan tidak boleh kosong');
    }

    const message = await this.chatService.createMessage({
      roomId: data.roomId,
      content: data.content.trim(),
      senderId: user.userId,
      senderName: user.username,
    });

    // Siarkan ke semua orang di ruang termasuk pengirim
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

    // Siarkan pesan yang telah diedit ke ruang
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

### Lapisan Service

Enkapsulasi logika bisnis dan interaksi database dalam service khusus:

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
      throw new NotFoundException(`Ruang chat ${roomId} tidak ditemukan`);
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
    if (!message) throw new NotFoundException('Pesan tidak ditemukan');
    if (message.senderId !== userId) {
      throw new ForbiddenException('Anda hanya dapat mengedit pesan Anda sendiri');
    }

    message.content = newContent;
    message.isEdited = true;
    return this.messageRepository.save(message);
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Pesan tidak ditemukan');
    if (message.senderId !== userId) {
      throw new ForbiddenException('Anda hanya dapat menghapus pesan Anda sendiri');
    }

    await this.messageRepository.remove(message);
  }
}
```

### Merakit Modul Chat

Daftarkan semua komponen dalam modul fitur:

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

## Contoh Kode

### Integrasi Klien Lengkap

Halaman HTML berikut menunjukkan cara terhubung ke server WebSocket NestJS dan berinteraksi dengan semua fitur yang telah dibangun di atas. Simpan sebagai `chat-client.html` dan buka di browser setelah menjalankan server:

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Klien Chat NestJS</title>
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
  <h1>Chat Real-Time NestJS</h1>

  <div id="auth">
    <input type="text" id="tokenInput" placeholder="Token JWT" size="60" />
    <button onclick="connect()">Hubungkan</button>
  </div>

  <div id="chat" style="display:none">
    <div id="rooms"></div>
    <div id="messages"></div>
    <div id="inputArea">
      <input type="text" id="messageInput" placeholder="Ketik pesan..." style="width: 70%" />
      <button onclick="sendMessage()">Kirim</button>
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
      if (!token) return alert('Masukkan token JWT');

      // Decode JWT untuk mendapatkan username (untuk demo)
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
        addSystemMessage(`${data.username} bergabung ke ruang`);
      });

      socket.on('userLeft', (data) => {
        addSystemMessage(`${data.username} meninggalkan ruang`);
      });

      socket.on('userTyping', (data) => {
        const indicator = document.getElementById('typingIndicator');
        indicator.textContent = data.isTyping ? `${data.username} sedang mengetik...` : '';
      });

      socket.on('error', (data) => {
        alert(`Error: ${data.message}`);
      });

      socket.on('disconnect', () => {
        console.log('Terputus');
      });
    }

    async function loadRooms() {
      const response = await fetch('http://localhost:3000/api/rooms', {
        headers: { Authorization: `Bearer ${document.getElementById('tokenInput').value}` },
      });
      const rooms = await response.json();
      const container = document.getElementById('rooms');
      container.innerHTML = '<strong>Ruang:</strong> ';
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
        <div class="content">${escapeHtml(msg.content)}${msg.isEdited ? ' <span class="edited">(diedit)</span>' : ''}</div>
      `;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }

    function updateMessageElement(msg) {
      const el = document.getElementById(`msg-${msg.id}`);
      if (el) {
        el.querySelector('.content').innerHTML =
          `${escapeHtml(msg.content)} <span class="edited">(diedit)</span>`;
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

    // Indikator mengetik
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

### Endpoint REST untuk Manajemen Ruang

Tambahkan endpoint HTTP bersamaan dengan gateway WebSocket untuk operasi CRUD ruang:

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

## Insight Penting

- **Hook siklus hidup Gateway** (`OnGatewayConnection`, `OnGatewayDisconnect`) adalah padanan WebSocket dari hook siklus hidup controller NestJS. Gunakan `handleConnection` untuk memvalidasi autentikasi sebelum mengizinkan pemrosesan event — ini mencegah pengguna tidak sah bergabung ke ruang privat atau mengirim pesan.
- **Ruang Socket.io vs modul NestJS**: Primitive ruang Socket.io (`client.join()` / `client.leave()`) adalah pengidentifikasi berbasis string ringan yang hanya ada di memori server. Selalu simpan metadata ruang (nama, deskripsi, pengaturan privasi) di database Anda dan gunakan string `roomId` untuk menjembatani kedua dunia.
- **Granularitas siaran itu penting**: Gunakan `this.server.to(roomId).emit(...)` ketika Anda ingin setiap klien yang terhubung di ruang (termasuk pengirim) menerima event. Gunakan `client.to(roomId).emit(...)` untuk mengecualikan pengirim. Pilih dengan sengaja berdasarkan apakah pengirim perlu mengonfirmasi pengiriman.
- **Autentikasi WebSocket berbasis token**: Tidak seperti HTTP di mana setiap permintaan membawa header `Authorization`, koneksi WebSocket melakukan autentikasi sekali selama handshake. Simpan payload pengguna yang telah divalidasi di `client.data` sehingga Anda dapat mengaksesnya di setiap handler event berikutnya tanpa harus memvalidasi ulang token.
- **Propagasi error**: Method gateway NestJS yang melempar `WsException` secara otomatis ditangkap dan pesan error dikirim kembali ke klien sebagai event `exception`. Ini mencerminkan pola HTTP exception filter dan menjaga konsistensi penanganan error di seluruh transport.

## Langkah Berikutnya

- Tambahkan **reaksi pesan** (respons emoji) menggunakan tabel `reactions` terpisah dan event `addReaction` baru.
- Implementasikan **pesan pribadi** dengan membuat ruang satu lawan satu secara otomatis ketika dua pengguna memulai chat langsung.
- Tambahkan **berbagi file** dalam pesan chat dengan mengintegrasikan layanan penyimpanan file (S3, MinIO) dan mengirim URL file sebagai bagian dari payload pesan.
- Jelajahi adapter `@nestjs/platform-ws` untuk implementasi WebSocket `ws` mentah sebagai pengganti Socket.io.
- Pelajari [Silabus Pengembangan NestJS](/backend/nestjs/syllabi/nestjs-development-syllabus.md) untuk jalur pembelajaran terstruktur yang mencakup topik NestJS lanjutan termasuk microservices, GraphQL, dan strategi pengujian.

## Kesimpulan

Anda telah berhasil membangun API chat real-time yang berfungsi penuh menggunakan WebSocket gateway NestJS. Aplikasi ini mendukung koneksi terautentikasi, chat multi-ruang dengan semantik join/leave, riwayat pesan persisten, dan indikator mengetik real-time — semuanya dalam arsitektur modular NestJS. Pola gateway yang Anda implementasikan di sini dapat diperluas ke berbagai kasus penggunaan real-time: dashboard langsung yang mengirimkan metrik ke klien yang terhubung, alat pengeditan kolaboratif yang menyinkronkan status dokumen, dan sistem notifikasi yang memberi tahu pengguna tentang event penting. Dengan menguasai gateway NestJS, Anda telah menambahkan pola komunikasi yang kuat ke dalam perangkat pengembangan backend Anda.
