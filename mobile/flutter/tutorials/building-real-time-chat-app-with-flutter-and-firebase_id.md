---
title: "Membangun Aplikasi Chat Real-Time dengan Flutter dan Firebase"
description: "Tutorial praktis komprehensif untuk membangun aplikasi chat real-time penuh fitur menggunakan Flutter, Firebase Authentication, dan Cloud Firestore."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Chat Real-Time dengan Flutter dan Firebase

## Ringkasan

Tutorial ini memandu Anda dalam membangun aplikasi chat real-time bergaya produksi menggunakan **Flutter** dan **Firebase**. Anda akan mempelajari cara mengintegrasikan Firebase Authentication untuk login pengguna, menyiapkan Cloud Firestore sebagai database real-time, merancang ruang chat dengan streaming pesan, dan membangun antarmuka chat yang menarik dengan pustaka widget Flutter yang kaya. Pada akhirnya, Anda akan memiliki aplikasi chat multi-pengguna yang mendukung perpesanan real-time, profil pengguna, dan manajemen ruang chat.

## Target Audiens

- Pengembang mobile dengan pengetahuan Flutter dan Dart tingkat menengah.
- Pengembang yang memahami komposisi widget dasar, `StatefulWidget`, dan manajemen dependensi `pubspec.yaml`.
- Ekspektasi tingkat kemampuan pembaca: **Mahir** (nyaman dengan pemrograman async dan Streams di Dart).

## Prasyarat

- Flutter SDK terinstal (versi 3.10 atau lebih baru) dengan emulator atau perangkat fisik.
- Proyek Firebase dengan Authentication dan Firestore yang diaktifkan (lihat [Firebase Console](https://console.firebase.google.com/)).
- CLI `flutterfire` terinstal dan dikonfigurasi untuk proyek Anda (`dart pub global activate flutterfire_cli`).
- Pemahaman dasar tentang konsep Firebase (koleksi, dokumen, pendengar real-time).
- Editor kode (VS Code atau Android Studio) dengan ekstensi Flutter.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mengonfigurasi Firebase di proyek Flutter menggunakan FlutterFire CLI.
- Mengimplementasikan login email/kata sandi dan Google Sign-In dengan Firebase Authentication.
- Mendesain model data Cloud Firestore untuk pesan chat dan profil pengguna.
- Melakukan streaming pembaruan pesan real-time menggunakan metode `snapshots()` Firestore.
- Membangun antarmuka chat yang responsif dengan gelembung pesan, kolom input, dan indikator pengetikan.
- Mengimplementasikan pembuatan ruang chat dan manajemen keanggotaan.
- Menangani status loading, error, dan empty dengan baik di seluruh aplikasi.

## Konteks dan Motivasi

Chat real-time adalah fitur penting dari aplikasi mobile modern — mulai dari media sosial dan dukungan pelanggan hingga alat kolaborasi dan game online. Membangun fitur chat dari awal membutuhkan penanganan koneksi persisten, pengurutan pesan, kehadiran pengguna, dan sinkronisasi data di beberapa klien — semua ini adalah tantangan rekayasa yang tidak sepele.

Firebase menyediakan infrastruktur backend yang teruji yang menangani masalah ini secara langsung. **Cloud Firestore** menawarkan pendengar real-time yang mengirimkan perubahan data ke klien yang terhubung secara instan, sementara **Firebase Authentication** menyediakan manajemen pengguna yang aman dengan sedikit kode boilerplate. Dengan menggabungkan framework UI Flutter yang ekspresif dengan backend real-time Firebase, Anda dapat membangun aplikasi chat yang berskala dari prototipe ke produksi tanpa mengelola server tunggal.

## Konten Inti

### Persiapan Proyek dan Konfigurasi Firebase

Mulai dengan membuat proyek Flutter baru dan menghubungkannya ke Firebase.

```bash
flutter create --org com.example flutter_chat_app
cd flutter_chat_app
```

Inisialisasi Firebase untuk proyek menggunakan FlutterFire CLI. Ini akan membuat file konfigurasi spesifik platform (`google-services.json` untuk Android, `GoogleService-Info.plist` untuk iOS) dan menghasilkan file `firebase_options.dart`.

```bash
flutterfire configure --project=your-firebase-project-id
```

Tambahkan dependensi Firebase yang diperlukan ke `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^2.24.0
  firebase_auth: ^4.16.0
  cloud_firestore: ^4.14.0
  google_sign_in: ^6.1.5
  provider: ^6.1.2
  intl: ^0.19.0
  cached_network_image: ^3.3.0
```

Jalankan `flutter pub get` untuk menginstal paket-paket tersebut.

### Desain Model Data Firestore

Model data Firestore yang terstruktur dengan baik sangat penting untuk kinerja dan skalabilitas query. Untuk aplikasi chat kita, kita menggunakan dua koleksi tingkat atas:

```text
firestore/
├── users/                  # Profil pengguna
│   └── {userId}/
│       ├── displayName: String
│       ├── photoURL: String
│       ├── email: String
│       └── createdAt: Timestamp
├── chat_rooms/             # Ruang chat
│   └── {roomId}/
│       ├── name: String
│       ├── lastMessage: String
│       ├── lastMessageTime: Timestamp
│       ├── members: [String]  (array userId)
│       ├── createdBy: String
│       └── createdAt: Timestamp
│   └── messages/           (subkoleksi)
│       └── {messageId}/
│           ├── senderId: String
│           ├── senderName: String
│           ├── text: String
│           ├── timestamp: Timestamp
│           └── type: String  ("text" | "image" | "system")
```

Struktur ini memisahkan metadata ruang chat dari data pesan, memungkinkan query yang efisien. Subkoleksi `messages` hanya dimuat saat pengguna membuka ruang tertentu, yang menjaga waktu muat awal tetap cepat.

### Pengaturan Firebase Authentication

Buat layanan autentikasi yang mengabstraksi Firebase Auth di belakang antarmuka yang bersih. Kita akan mendukung login email/kata sandi dan Google.

```dart
// lib/services/auth_service.dart
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  User? get currentUser => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  Future<UserCredential> signInWithEmail(String email, String password) async {
    return await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<UserCredential> signUpWithEmail(String email, String password) async {
    return await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<UserCredential> signInWithGoogle() async {
    final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
    final GoogleSignInAuthentication googleAuth =
        await googleUser!.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );
    return await _auth.signInWithCredential(credential);
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _auth.signOut();
  }
}
```

### Layanan Profil Pengguna

Saat pengguna masuk untuk pertama kalinya, buat dokumen Firestore untuk menyimpan profil mereka. Ini juga berfungsi sebagai penanda kehadiran.

```dart
// lib/services/user_service.dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class UserService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<void> createUserProfile(User user) async {
    final userRef = _firestore.collection('users').doc(user.uid);
    final doc = await userRef.get();

    if (!doc.exists) {
      await userRef.set({
        'displayName': user.displayName ?? 'Anonymous',
        'photoURL': user.photoURL ?? '',
        'email': user.email ?? '',
        'createdAt': FieldValue.serverTimestamp(),
      });
    }
  }

  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    final doc = await _firestore.collection('users').doc(userId).get();
    return doc.data();
  }

  Stream<DocumentSnapshot> streamUserProfile(String userId) {
    return _firestore.collection('users').doc(userId).snapshots();
  }
}
```

### Layanan Chat

Layanan chat menangani operasi CRUD untuk ruang dan pesan.

```dart
// lib/services/chat_service.dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ChatService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  String get _currentUserId => _auth.currentUser!.uid;

  // Membuat ruang chat baru
  Future<String> createRoom(String name) async {
    final roomRef = await _firestore.collection('chat_rooms').add({
      'name': name,
      'lastMessage': 'Room created',
      'lastMessageTime': FieldValue.serverTimestamp(),
      'members': [_currentUserId],
      'createdBy': _currentUserId,
      'createdAt': FieldValue.serverTimestamp(),
    });
    return roomRef.id;
  }

  // Bergabung ke ruang yang sudah ada
  Future<void> joinRoom(String roomId) async {
    await _firestore.collection('chat_rooms').doc(roomId).update({
      'members': FieldValue.arrayUnion([_currentUserId]),
    });
  }

  // Streaming daftar ruang chat yang tersedia
  Stream<QuerySnapshot> getRooms() {
    return _firestore
        .collection('chat_rooms')
        .orderBy('lastMessageTime', descending: true)
        .snapshots();
  }

  // Mengirim pesan ke suatu ruang
  Future<void> sendMessage(String roomId, String text) async {
    final user = _auth.currentUser!;
    await _firestore
        .collection('chat_rooms')
        .doc(roomId)
        .collection('messages')
        .add({
      'senderId': _currentUserId,
      'senderName': user.displayName ?? 'Anonymous',
      'text': text,
      'timestamp': FieldValue.serverTimestamp(),
      'type': 'text',
    });

    // Perbarui metadata ruang
    await _firestore.collection('chat_rooms').doc(roomId).update({
      'lastMessage': text,
      'lastMessageTime': FieldValue.serverTimestamp(),
    });
  }

  // Streaming pesan untuk ruang tertentu
  Stream<QuerySnapshot> getMessages(String roomId) {
    return _firestore
        .collection('chat_rooms')
        .doc(roomId)
        .collection('messages')
        .orderBy('timestamp', descending: false)
        .snapshots();
  }
}
```

### Membangun Antarmuka Chat

Antarmuka chat terdiri dari tiga layar utama: gerbang autentikasi, daftar ruang, dan tampilan chat. Kita menggunakan `StreamBuilder` di seluruh aplikasi untuk menangani perubahan data dari Firestore secara reaktif.

**Layar Autentikasi:**

```dart
// lib/screens/auth_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      await context.read<AuthService>().signInWithEmail(
            _emailController.text.trim(),
            _passwordController.text.trim(),
          );
    } on FirebaseAuthException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message ?? 'Gagal masuk')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.chat, size: 80, color: Theme.of(context).primaryColor),
                const SizedBox(height: 16),
                Text(
                  'Selamat Datang di ChatRoom',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email),
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) => v?.contains('@') == true ? null : 'Masukkan email yang valid',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Kata Sandi',
                    prefixIcon: Icon(Icons.lock),
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Minimal 6 karakter',
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _signIn,
                    child: _isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Masuk'),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await context.read<AuthService>().signInWithGoogle();
                    },
                    icon: const Icon(Icons.login),
                    label: const Text('Masuk dengan Google'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

**Layar Daftar Ruang Chat:**

```dart
// lib/screens/room_list_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/chat_service.dart';
import 'chat_screen.dart';

class RoomListScreen extends StatelessWidget {
  const RoomListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final chatService = context.read<ChatService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ruang Chat'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthService>().signOut(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateRoomDialog(context),
        child: const Icon(Icons.add),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: chatService.getRooms(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.data!.docs.isEmpty) {
            return const Center(
              child: Text('Belum ada ruang. Buat yang baru!'),
            );
          }
          return ListView.builder(
            itemCount: snapshot.data!.docs.length,
            itemBuilder: (context, index) {
              final room = snapshot.data!.docs[index];
              final data = room.data() as Map<String, dynamic>;
              return ListTile(
                leading: CircleAvatar(
                  child: Text(data['name'][0].toUpperCase()),
                ),
                title: Text(data['name'] ?? 'Tanpa Nama'),
                subtitle: Text(data['lastMessage'] ?? ''),
                trailing: Text(
                  data['lastMessageTime'] != null
                      ? _formatTime(data['lastMessageTime'])
                      : '',
                ),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ChatScreen(roomId: room.id, roomName: data['name']),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showCreateRoomDialog(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Buat Ruang'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Nama ruang',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.trim().isEmpty) return;
              await context.read<ChatService>().createRoom(controller.text.trim());
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Buat'),
          ),
        ],
      ),
    );
  }

  String _formatTime(Timestamp timestamp) {
    final date = timestamp.toDate();
    final now = DateTime.now();
    if (date.day == now.day) {
      return '${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    }
    return '${date.day}/${date.month}';
  }
}
```

**Layar Chat dengan Pengiriman Pesan Real-Time:**

```dart
// lib/screens/chat_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/chat_service.dart';

class ChatScreen extends StatelessWidget {
  final String roomId;
  final String roomName;

  const ChatScreen({
    super.key,
    required this.roomId,
    required this.roomName,
  });

  @override
  Widget build(BuildContext context) {
    final chatService = context.read<ChatService>();
    final textController = TextEditingController();
    final scrollController = ScrollController();

    return Scaffold(
      appBar: AppBar(title: Text(roomName)),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: chatService.getMessages(roomId),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final messages = snapshot.data!.docs;

                if (messages.isEmpty) {
                  return const Center(
                    child: Text('Belum ada pesan. Sapa teman-teman!'),
                  );
                }

                // Scroll ke bawah saat ada pesan baru
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  scrollController.jumpTo(scrollController.position.maxScrollExtent);
                });

                return ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index].data() as Map<String, dynamic>;
                    final isMe = msg['senderId'] == chatService.currentUserId;
                    return _MessageBubble(
                      message: msg['text'] ?? '',
                      senderName: msg['senderName'] ?? 'Tidak Dikenal',
                      isMe: isMe,
                      timestamp: msg['timestamp'],
                    );
                  },
                );
              },
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              boxShadow: [
                BoxShadow(
                  offset: const Offset(0, -2),
                  blurRadius: 8,
                  color: Colors.black.withOpacity(0.1),
                ),
              ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: textController,
                      decoration: const InputDecoration(
                        hintText: 'Ketik pesan...',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      onSubmitted: (value) {
                        if (value.trim().isEmpty) return;
                        chatService.sendMessage(roomId, value.trim());
                        textController.clear();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send),
                    onPressed: () {
                      if (textController.text.trim().isEmpty) return;
                      chatService.sendMessage(
                        roomId,
                        textController.text.trim(),
                      );
                      textController.clear();
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final String message;
  final String senderName;
  final bool isMe;
  final Timestamp? timestamp;

  const _MessageBubble({
    required this.message,
    required this.senderName,
    required this.isMe,
    this.timestamp,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment:
            isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (!isMe)
            Padding(
              padding: const EdgeInsets.only(left: 12, bottom: 4),
              child: Text(
                senderName,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isMe
                  ? Theme.of(context).primaryColor
                  : Colors.grey[200],
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(20),
                topRight: const Radius.circular(20),
                bottomLeft: Radius.circular(isMe ? 20 : 4),
                bottomRight: Radius.circular(isMe ? 4 : 20),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message,
                  style: TextStyle(
                    color: isMe ? Colors.white : Colors.black87,
                    fontSize: 16,
                  ),
                ),
                if (timestamp != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      _formatTime(timestamp!),
                      style: TextStyle(
                        fontSize: 11,
                        color: isMe
                            ? Colors.white.withOpacity(0.7)
                            : Colors.grey[600],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(Timestamp timestamp) {
    final date = timestamp.toDate();
    return '${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}
```

### Menghubungkan Semua Komponen

Hubungkan semua layanan melalui titik masuk aplikasi menggunakan Provider untuk injeksi dependensi.

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'services/auth_service.dart';
import 'services/chat_service.dart';
import 'services/user_service.dart';
import 'screens/auth_screen.dart';
import 'screens/room_list_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<AuthService>(create: (_) => AuthService()),
        Provider<ChatService>(create: (_) => ChatService()),
        Provider<UserService>(create: (_) => UserService()),
      ],
      child: MaterialApp(
        title: 'ChatRoom',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
        ),
        home: StreamBuilder<User?>(
          stream: FirebaseAuth.instance.authStateChanges(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.hasData) {
              return const RoomListScreen();
            }
            return const AuthScreen();
          },
        ),
      ),
    );
  }
}
```

## Contoh Kode

### Struktur File Lengkap

Proyek akhir mengikuti tata letak direktori berikut:

```text
lib/
├── main.dart
├── firebase_options.dart        (dihasilkan oleh flutterfire CLI)
├── models/
│   ├── message.dart
│   └── user_profile.dart
├── services/
│   ├── auth_service.dart
│   ├── chat_service.dart
│   └── user_service.dart
└── screens/
    ├── auth_screen.dart
    ├── room_list_screen.dart
    └── chat_screen.dart
```

### Aturan Keamanan Firestore

Lindungi data Anda dengan aturan keamanan Firestore berikut:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Pengguna dapat membaca/menulis profil mereka sendiri
    match /users/{userId} {
      allow read, write: if request.auth != null
                        && request.auth.uid == userId;
    }

    // Ruang chat: pengguna terautentikasi dapat membaca dan membuat
    match /chat_rooms/{roomId} {
      allow read: if request.auth != null
                  && resource.data.members.hasAny([request.auth.uid]);
      allow create: if request.auth != null;
      allow update: if request.auth != null
                    && resource.data.members.hasAny([request.auth.uid]);

      // Pesan di dalam ruang
      match /messages/{messageId} {
        allow read, write: if request.auth != null
                          && get(/databases/$(database)/documents/chat_rooms/$(roomId))
                               .data.members.hasAny([request.auth.uid]);
      }
    }
  }
}
```

## Insight Penting

- **Gunakan subkoleksi untuk pesan**: Menyimpan pesan sebagai subkoleksi dari setiap ruang chat menjaga query tetap cepat dan data terorganisir. Firestore membebankan biaya per pembacaan dokumen, jadi mengambil hanya pesan untuk ruang saat ini meminimalkan biaya.
- **Selalu paginasi riwayat pesan**: Dalam produksi, implementasikan paginasi dengan `startAfter()` dan `limit()` untuk menghindari memuat ribuan pesan sekaligus. Untuk cakupan tutorial ini, streaming real-time dari pesan terbaru sudah cukup.
- **Tangani pembaruan UI optimistis**: Saat pengguna mengirim pesan, tambahkan ke status lokal segera sebelum operasi tulis Firestore selesai. Ini menghilangkan latensi yang dirasakan. `StreamBuilder` akan menyelaraskan status lokal dan server dengan mulus.
- **Gunakan `FieldValue.serverTimestamp()` untuk pengurutan**: Stempel waktu sisi klien bisa tidak dapat diandalkan karena perbedaan jam. Stempel waktu server Firestore memastikan pengurutan yang konsisten di semua klien.
- **Tulis batch untuk operasi atomik**: Saat membuat ruang dan mengirim pesan pertama, gunakan `WriteBatch` untuk memastikan kedua operasi berhasil atau gagal bersama-sama. Ini mencegah ruang yatim tanpa pesan.
- **Pantau kuota baca/tulis Firestore**: Pendengar real-time menjaga koneksi tetap terbuka dan menghitung setiap perubahan dokumen sebagai pembacaan. Untuk aplikasi chat lalu lintas tinggi, pertimbangkan menggunakan Firebase Realtime Database yang lebih hemat biaya untuk beban kerja chat.

## Langkah Berikutnya

- Implementasikan **notifikasi push** menggunakan Firebase Cloud Messaging (FCM) untuk memberi tahu pengguna tentang pesan baru saat aplikasi berada di latar belakang.
- Tambahkan **berbagi gambar** dengan Firebase Storage — unggah foto dari galeri dan tampilkan inline di chat.
- Perkenalkan **indikator pengetikan** dengan menulis status pengetikan pengguna ke Firestore dan membacanya dengan stream dari klien lain.
- Jelajahi **dukungan offline** — Firestore menyimpan data di cache lokal secara default, tetapi Anda dapat menyempurnakannya dengan `FirestoreSettings.setPersistenceEnabled()`.
- Ikuti [silabus Flutter](../syllabi/flutter-syllabus.md) untuk jalur pembelajaran terstruktur yang mencakup seluruh ekosistem Flutter.

## Kesimpulan

Anda telah berhasil membangun aplikasi chat real-time yang lengkap dengan Flutter dan Firebase, mencakup integrasi Firebase Authentication, pemodelan data Cloud Firestore, streaming pesan real-time dengan `snapshots()`, antarmuka chat responsif dengan gelembung pesan kustom, dan arsitektur layanan yang skalabel menggunakan Provider untuk injeksi dependensi. Fondasi ini dapat diperluas untuk menambahkan fitur seperti notifikasi push, berbagi gambar, indikator pengetikan, dan dukungan offline — semua bahan penting untuk aplikasi perpesanan tingkat produksi.
