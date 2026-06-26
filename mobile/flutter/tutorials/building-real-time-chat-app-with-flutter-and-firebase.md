---
title: "Building a Real-Time Chat Application with Flutter and Firebase"
description: "A comprehensive hands-on tutorial for building a full-featured real-time chat application using Flutter, Firebase Authentication, and Cloud Firestore."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Real-Time Chat Application with Flutter and Firebase

## Summary

This tutorial walks you through building a complete, production-style real-time chat application using **Flutter** and **Firebase**. You will learn how to integrate Firebase Authentication for user sign-in, set up Cloud Firestore as a real-time database, design chat rooms with message streaming, and build a polished chat UI with Flutter's rich widget library. By the end, you will have a working multi-user chat app that supports real-time messaging, user profiles, and chat room management.

## Target Audience

- Mobile developers with intermediate Flutter and Dart knowledge.
- Developers who understand basic widget composition, `StatefulWidget`, and `pubspec.yaml` dependency management.
- Expected developer level: **Advanced** (comfortable with async programming and Streams in Dart).

## Prerequisites

- Flutter SDK installed (version 3.10 or later) with an emulator or physical device.
- A Firebase project with Authentication and Firestore enabled (see [Firebase Console](https://console.firebase.google.com/)).
- `flutterfire` CLI installed and configured for your project (`dart pub global activate flutterfire_cli`).
- Basic understanding of Firebase concepts (collections, documents, real-time listeners).
- A code editor (VS Code or Android Studio) with Flutter extensions.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Configure Firebase in a Flutter project using the FlutterFire CLI.
- Implement email/password and Google Sign-In with Firebase Authentication.
- Design a Cloud Firestore data model for chat messages and user profiles.
- Stream real-time message updates using Firestore's `snapshots()` method.
- Build a responsive chat UI with message bubbles, input fields, and typing indicators.
- Implement chat room creation and membership management.
- Handle loading, error, and empty states gracefully across the app.

## Context and Motivation

Real-time chat is a cornerstone feature of modern mobile applications — from social media and customer support to collaboration tools and online gaming. Building a chat feature from scratch requires handling persistent connections, message ordering, user presence, and data synchronization across multiple clients — all non-trivial engineering challenges.

Firebase provides a battle-tested backend infrastructure that handles these concerns out of the box. **Cloud Firestore** offers real-time listeners that push data changes to connected clients instantly, while **Firebase Authentication** provides secure user management with minimal boilerplate. By combining Flutter's expressive UI framework with Firebase's real-time backend, you can build a chat application that scales from a prototype to production without managing a single server.

## Core Content

### Project Setup and Firebase Configuration

Start by creating a new Flutter project and connecting it to Firebase.

```bash
flutter create --org com.example flutter_chat_app
cd flutter_chat_app
```

Initialize Firebase for the project using the FlutterFire CLI. This creates the platform-specific configuration files (`google-services.json` for Android, `GoogleService-Info.plist` for iOS) and generates a `firebase_options.dart` file.

```bash
flutterfire configure --project=your-firebase-project-id
```

Add the required Firebase dependencies to `pubspec.yaml`:

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

Run `flutter pub get` to install the packages.

### Firestore Data Model Design

A well-structured Firestore data model is critical for query performance and scalability. For our chat app, we use two top-level collections:

```text
firestore/
├── users/                  # User profiles
│   └── {userId}/
│       ├── displayName: String
│       ├── photoURL: String
│       ├── email: String
│       └── createdAt: Timestamp
├── chat_rooms/             # Chat rooms
│   └── {roomId}/
│       ├── name: String
│       ├── lastMessage: String
│       ├── lastMessageTime: Timestamp
│       ├── members: [String]  (array of userIds)
│       ├── createdBy: String
│       └── createdAt: Timestamp
│   └── messages/           (subcollection)
│       └── {messageId}/
│           ├── senderId: String
│           ├── senderName: String
│           ├── text: String
│           ├── timestamp: Timestamp
│           └── type: String  ("text" | "image" | "system")
```

This structure keeps chat room metadata separate from message data, allowing efficient queries. The `messages` subcollection only loads when a user opens a specific room, which keeps initial load times fast.

### Firebase Authentication Setup

Create an authentication service that abstracts Firebase Auth behind a clean interface. We will support email/password and Google sign-in.

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

### User Profile Service

When a user signs in for the first time, create a Firestore document to store their profile. This also serves as a presence marker.

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

### Chat Room Service

The chat room service handles CRUD operations for rooms and messages.

```dart
// lib/services/chat_service.dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ChatService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  String get _currentUserId => _auth.currentUser!.uid;

  // Create a new chat room
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

  // Join an existing room
  Future<void> joinRoom(String roomId) async {
    await _firestore.collection('chat_rooms').doc(roomId).update({
      'members': FieldValue.arrayUnion([_currentUserId]),
    });
  }

  // Stream available chat rooms
  Stream<QuerySnapshot> getRooms() {
    return _firestore
        .collection('chat_rooms')
        .orderBy('lastMessageTime', descending: true)
        .snapshots();
  }

  // Send a message to a room
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

    // Update room metadata
    await _firestore.collection('chat_rooms').doc(roomId).update({
      'lastMessage': text,
      'lastMessageTime': FieldValue.serverTimestamp(),
    });
  }

  // Stream messages for a specific room
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

### Building the Chat UI

The chat interface consists of three main screens: the authentication gateway, the room list, and the chat view. We use `StreamBuilder` throughout to reactively handle data changes from Firestore.

**Authentication Screen:**

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
        SnackBar(content: Text(e.message ?? 'Sign in failed')),
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
                  'Welcome to ChatRoom',
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
                  validator: (v) => v?.contains('@') == true ? null : 'Enter a valid email',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icon(Icons.lock),
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Min 6 characters',
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _signIn,
                    child: _isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Sign In'),
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
                    label: const Text('Sign In with Google'),
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

**Room List Screen:**

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
        title: const Text('Chat Rooms'),
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
              child: Text('No rooms yet. Create one!'),
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
                title: Text(data['name'] ?? 'Unnamed'),
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
        title: const Text('Create Room'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Room name',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.trim().isEmpty) return;
              await context.read<ChatService>().createRoom(controller.text.trim());
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Create'),
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

**Chat Screen with Real-Time Messaging:**

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
                    child: Text('No messages yet. Say hello!'),
                  );
                }

                // Scroll to bottom on new messages
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
                      senderName: msg['senderName'] ?? 'Unknown',
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
                        hintText: 'Type a message...',
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

### Wiring Everything Together

Connect all services through the app entry point using Provider for dependency injection.

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

## Code Examples

### Complete File Structure

The final project follows this directory layout:

```text
lib/
├── main.dart
├── firebase_options.dart        (generated by flutterfire CLI)
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

### Firestore Security Rules

Protect your data with these Firestore security rules:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null
                        && request.auth.uid == userId;
    }

    // Chat rooms: authenticated users can read and create
    match /chat_rooms/{roomId} {
      allow read: if request.auth != null
                  && resource.data.members.hasAny([request.auth.uid]);
      allow create: if request.auth != null;
      allow update: if request.auth != null
                    && resource.data.members.hasAny([request.auth.uid]);

      // Messages inside a room
      match /messages/{messageId} {
        allow read, write: if request.auth != null
                          && get(/databases/$(database)/documents/chat_rooms/$(roomId))
                               .data.members.hasAny([request.auth.uid]);
      }
    }
  }
}
```

## Key Insights

- **Use subcollections for messages**: Storing messages as a subcollection of each chat room keeps queries fast and data organized. Firestore charges per document read, so fetching only the messages for the current room minimizes costs.
- **Always paginate message history**: In production, implement pagination with `startAfter()` and `limit()` to avoid loading thousands of messages at once. For the scope of this tutorial, real-time streaming of recent messages suffices.
- **Handle optimistic UI updates**: When a user sends a message, add it to the local state immediately before the Firestore write completes. This eliminates perceived latency. The `StreamBuilder` will reconcile the local and server state seamlessly.
- **Use `FieldValue.serverTimestamp()` for ordering**: Client-side timestamps can be unreliable due to clock skew. Firestore's server timestamps ensure consistent ordering across all clients.
- **Batch writes for atomic operations**: When creating a room and sending the first message, use `WriteBatch` to ensure both operations succeed or fail together. This prevents orphaned rooms without messages.
- **Monitor Firestore read/write quotas**: Real-time listeners keep an open connection and count every document change as a read. For high-traffic chat apps, consider using Firebase Realtime Database instead, which is more cost-effective for chat workloads.

## Next Steps

- Implement **push notifications** using Firebase Cloud Messaging (FCM) to alert users of new messages when the app is in the background.
- Add **image sharing** with Firebase Storage — upload photos from the gallery and display them inline in the chat.
- Introduce **typing indicators** by writing a user's typing status to Firestore and reading it with a stream from other clients.
- Explore **offline support** — Firestore caches data locally by default, but you can fine-tune this with `FirestoreSettings.setPersistenceEnabled()`.
- Follow the [Flutter syllabus](../syllabi/flutter-syllabus.md) for a structured learning path covering the full Flutter ecosystem.

## Conclusion

You have built a complete real-time chat application with Flutter and Firebase, covering Firebase Authentication integration, Cloud Firestore data modeling, real-time message streaming with `snapshots()`, responsive chat UI with custom message bubbles, and scalable service architecture using Provider for dependency injection. This foundation can be extended to add features like push notifications, image sharing, typing indicators, and offline support — all essential ingredients for a production-grade messaging application.
