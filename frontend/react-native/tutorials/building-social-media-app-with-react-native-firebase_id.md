---
title: "Membangun Aplikasi Media Sosial dengan React Native dan Firebase"
description: "Tutorial komprehensif untuk membangun aplikasi media sosial yang kaya fitur dengan React Native (Expo), mencakup Firebase Authentication, Cloud Firestore, Firebase Storage untuk unggahan media, umpan real-time, dan notifikasi push."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Media Sosial dengan React Native dan Firebase

## Ringkasan

Tutorial ini memandu Anda dalam membangun aplikasi media sosial yang berfungsi penuh menggunakan React Native (Expo) dan Firebase. Anda akan mempelajari cara mengimplementasikan autentikasi pengguna dengan email dan Google Sign-In, menyimpan dan mengambil postingan dengan Cloud Firestore, mengunggah gambar dengan Firebase Storage, membangun umpan gulir real-time, menambahkan interaksi suka dan komentar, mengelola profil pengguna, serta mengirim notifikasi push dengan Firebase Cloud Messaging. Pada akhirnya, Anda akan memiliki aplikasi media sosial lengkap di mana pengguna dapat berbagi foto, saling mengikuti, dan berinteraksi dengan konten secara real-time.

## Target Audiens

- Pengembang mobile yang ingin membangun fitur media sosial dalam aplikasi React Native.
- Pengembang frontend atau full-stack yang sudah familiar dengan dasar-dasar React Native dan ingin mempelajari integrasi Firebase.
- Ekspektasi tingkat kemampuan: Mahir — nyaman dengan JavaScript/TypeScript, fundamental React Native, dan pola pemrograman asinkron.

## Prasyarat

- Pemahaman yang kuat tentang JavaScript (sintaks ES6+, Promise, async/await, destructuring).
- Pengetahuan kerja tentang React Native dan Expo (komponen, hooks, navigasi).
- Node.js (v18 atau lebih baru) dan npm/yarn terinstal di mesin pengembangan Anda.
- Aplikasi Expo Go di perangkat iOS atau Android, atau simulator/emulator yang terkonfigurasi.
- Proyek Firebase yang sudah dibuat di [Firebase Console](https://console.firebase.google.com) (tingkat gratis sudah mencukupi).
- Perangkat Android atau iOS untuk pengujian notifikasi push (perangkat fisik sangat disarankan).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mengatur layanan Firebase (Authentication, Firestore, Storage, Cloud Messaging) dalam proyek Expo.
- Mengimplementasikan alur autentikasi email/kata sandi dan Google Sign-In.
- Mendesain model data Firestore untuk konten media sosial (pengguna, postingan, suka, komentar, pengikut).
- Mengunggah gambar dari kamera atau galeri perangkat ke Firebase Storage.
- Membangun umpan real-time dengan data terpaginasikan dari Firestore.
- Menerapkan fitur sosial — menyukai postingan, berkomentar, dan mengikuti pengguna.
- Mengirim notifikasi push menggunakan Firebase Cloud Messaging melalui Expo Notifications.
- Menangani status pemuatan, kesalahan, dan keadaan kosong di semua layar.

## Konteks dan Motivasi

Aplikasi media sosial termasuk dalam kategori aplikasi mobile yang paling populer dan kompleks. Fitur-fitur seperti umpan real-time, unggahan media, interaksi sosial (suka, komentar, ikuti), dan notifikasi push menghadirkan tantangan arsitektural yang melampaui aplikasi CRUD sederhana. Firebase menyediakan platform backend-as-a-service yang kuat yang menangani autentikasi, sinkronisasi data real-time, penyimpanan yang dapat diskalakan, dan notifikasi push secara langsung — menjadikannya pilihan ideal untuk mempelajari cara membangun fitur sosial tanpa mengelola infrastruktur server.

Memahami cara mengarsitektur fitur media sosial sangat berharga di berbagai domain: aplikasi komunitas, platform konten, marketplace dengan ulasan, alat kolaborasi tim, dan aplikasi apa pun di mana pengguna berbagi dan berinteraksi dengan konten. Pola-pola yang akan Anda pelajari — sinkronisasi data real-time, pipeline unggahan gambar, manajemen grafik sosial — dapat ditransfer langsung ke aplikasi produksi dalam skala apa pun.

## Konten Inti

### Persiapan Proyek dan Konfigurasi Firebase

Mulailah dengan membuat proyek Expo baru dan menginstal dependensi yang diperlukan:

```bash
npx create-expo-app SocialMediaApp --template blank-typescript
cd SocialMediaApp
```

Instal Firebase SDK dan modul yang kompatibel dengan Expo:

```bash
npx expo install firebase @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install expo-image-picker expo-notifications expo-device
npx expo install react-native-screens react-native-safe-area-context
```

Buat file konfigurasi Firebase. Di Firebase Console, buka Project Settings > General > Your apps dan daftarkan aplikasi web untuk mendapatkan objek konfigurasi Anda:

```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### Desain Model Data Firestore

Desain koleksi Firestore untuk aplikasi media sosial Anda. Firestore adalah database dokumen NoSQL, jadi strukturlah data Anda agar sesuai dengan pola akses yang dibutuhkan aplikasi:

```typescript
// src/types/index.ts
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  followersCount: number;
  followingCount: number;
  createdAt: number;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  imageURL: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  createdAt: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  text: string;
  createdAt: number;
}
```

**Struktur koleksi**:

```text
users/{uid}          — Dokumen profil pengguna
posts/{postId}       — Dokumen postingan dengan URL gambar, caption, stempel waktu
posts/{postId}/likes/{userId}    — Subkoleksi suka (ada jika pengguna menyukai)
posts/{postId}/comments/{commentId} — Subkoleksi komentar
follows/{followerId_followingId} — Dokumen relasi ikutan
```

Struktur ini mendukung kueri yang efisien: mengambil umpan pengguna, mendapatkan suka untuk sebuah postingan (dengan jumlah), memuat komentar untuk sebuah postingan, dan memeriksa relasi ikutan — semuanya tanpa join atau agregasi yang kompleks.

### Mengimplementasikan Autentikasi

Siapkan alur autentikasi dengan email/kata sandi dan Google Sign-In:

```typescript
// src/services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { AppUser } from '../types';

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<AppUser> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user: AppUser = {
    uid: credential.user.uid,
    email: credential.user.email!,
    displayName,
    photoURL: null,
    bio: '',
    followersCount: 0,
    followingCount: 0,
    createdAt: Date.now(),
  };
  await setDoc(doc(db, 'users', credential.user.uid), user);
  return user;
};

export const loginWithEmail = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  await signOut(auth);
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const fetchUserProfile = async (uid: string): Promise<AppUser | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as AppUser) : null;
};
```

Buat layar autentikasi — layar masuk dan layar pendaftaran. Gunakan React Navigation untuk mengelola alur auth:

```typescript
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { loginWithEmail } from '../services/authService';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Harap isi semua bidang.');
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Login Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>SocialFeed</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Kata Sandi"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Masuk</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>
          Belum punya akun? Daftar
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#1877f2',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1877f2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#1877f2',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});
```

### Membangun Umpan Real-Time dengan Firestore

Umpan adalah inti dari aplikasi media sosial. Gunakan pendengar real-time Firestore (`onSnapshot`) untuk menampilkan postingan saat dibuat, dan implementasikan paginasi dengan kueri berbasis kursor Firestore:

```typescript
// src/services/postService.ts
import {
  collection, query, orderBy, limit, startAfter,
  onSnapshot, doc, getDocs, setDoc, deleteDoc,
  serverTimestamp, increment, where, DocumentSnapshot,
  addDoc, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Post } from '../types';

const POSTS_PER_PAGE = 10;

export const uploadImage = async (
  uri: string,
  userId: string
): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const filename = `posts/${userId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, filename);
  const snapshot = await uploadBytesResumable(storageRef, blob);
  return getDownloadURL(snapshot.ref);
};

export const createPost = async (
  userId: string,
  userName: string,
  userPhotoURL: string | null,
  imageURL: string,
  caption: string
): Promise<void> => {
  const postsRef = collection(db, 'posts');
  await addDoc(postsRef, {
    userId,
    userName,
    userPhotoURL,
    imageURL,
    caption,
    likesCount: 0,
    commentsCount: 0,
    createdAt: Timestamp.now(),
  });
};

export const subscribeToFeed = (
  onPosts: (posts: Post[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'), limit(POSTS_PER_PAGE));

  return onSnapshot(q, (snapshot) => {
    const posts: Post[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Post, 'id'>),
    }));
    onPosts(posts);
  }, onError);
};

export const loadMorePosts = async (
  lastPost: Post
): Promise<Post[]> => {
  const postsRef = collection(db, 'posts');
  const q = query(
    postsRef,
    orderBy('createdAt', 'desc'),
    startAfter(Timestamp.fromMillis(lastPost.createdAt)),
    limit(POSTS_PER_PAGE)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Post, 'id'>),
  }));
};
```

### Mengimplementasikan Interaksi Sosial — Suka dan Komentar

Tambahkan sistem suka dan komentar. Suka menggunakan pola subkoleksi di mana setiap dokumen suka mewakili suka pengguna pada sebuah postingan, dan dokumen postingan melacak jumlah agregat:

```typescript
// src/services/interactionService.ts
import {
  doc, collection, setDoc, deleteDoc, getDoc,
  increment, query, where, orderBy, onSnapshot,
  addDoc, Timestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Comment } from '../types';

// --- Suka ---

export const toggleLike = async (postId: string, userId: string): Promise<boolean> => {
  const likeRef = doc(db, 'posts', postId, 'likes', userId);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, 'posts', postId), {
      likesCount: increment(-1),
    });
    return false; // batal suka
  } else {
    await setDoc(likeRef, { userId, createdAt: Timestamp.now() });
    await updateDoc(doc(db, 'posts', postId), {
      likesCount: increment(1),
    });
    return true; // suka
  }
};

export const checkIfLiked = async (
  postId: string,
  userId: string
): Promise<boolean> => {
  const likeRef = doc(db, 'posts', postId, 'likes', userId);
  const snap = await getDoc(likeRef);
  return snap.exists();
};

// --- Komentar ---

export const addComment = async (
  postId: string,
  userId: string,
  userName: string,
  userPhotoURL: string | null,
  text: string
): Promise<void> => {
  const commentsRef = collection(db, 'posts', postId, 'comments');
  await addDoc(commentsRef, {
    postId,
    userId,
    userName,
    userPhotoURL,
    text,
    createdAt: Timestamp.now(),
  });
  await updateDoc(doc(db, 'posts', postId), {
    commentsCount: increment(1),
  });
};

export const subscribeToComments = (
  postId: string,
  onComments: (comments: Comment[]) => void
): (() => void) => {
  const commentsRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const comments: Comment[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Comment, 'id'>),
    }));
    onComments(comments);
  });
};
```

### Unggah Gambar dengan Firebase Storage

Gunakan `expo-image-picker` dari Expo untuk memungkinkan pengguna memilih atau mengambil foto, lalu unggah ke Firebase Storage:

```typescript
// src/components/ImagePickerComponent.tsx
import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  onImageSelected: (uri: string) => void;
}

export default function ImagePickerComponent({ onImageSelected }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Akses galeri diperlukan untuk memilih foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      onImageSelected(uri);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>
          {imageUri ? 'Ganti Foto' : 'Pilih Foto'}
        </Text>
      </TouchableOpacity>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 16 },
  button: {
    backgroundColor: '#e4e6eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#050505' },
  preview: { width: 200, height: 200, borderRadius: 12, marginTop: 12 },
});
```

### Pengguna, Profil, dan Sistem Ikutan

Bangun layar profil pengguna dan mekanisme ikuti/berhenti ikuti:

```typescript
// src/services/socialGraphService.ts
import {
  doc, setDoc, deleteDoc, getDoc, getDocs,
  collection, query, where, increment, Timestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const followUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  const followDocId = `${currentUserId}_${targetUserId}`;
  await setDoc(doc(db, 'follows', followDocId), {
    followerId: currentUserId,
    followingId: targetUserId,
    createdAt: Timestamp.now(),
  });
  await updateDoc(doc(db, 'users', currentUserId), {
    followingCount: increment(1),
  });
  await updateDoc(doc(db, 'users', targetUserId), {
    followersCount: increment(1),
  });
};

export const unfollowUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  const followDocId = `${currentUserId}_${targetUserId}`;
  await deleteDoc(doc(db, 'follows', followDocId));
  await updateDoc(doc(db, 'users', currentUserId), {
    followingCount: increment(-1),
  });
  await updateDoc(doc(db, 'users', targetUserId), {
    followersCount: increment(-1),
  });
};

export const isFollowing = async (
  currentUserId: string,
  targetUserId: string
): Promise<boolean> => {
  const followDocId = `${currentUserId}_${targetUserId}`;
  const snap = await getDoc(doc(db, 'follows', followDocId));
  return snap.exists();
};
```

### Notifikasi Push dengan Firebase Cloud Messaging

Siapkan notifikasi push menggunakan Expo Notifications dan Firebase Cloud Messaging. Ini memungkinkan pengguna menerima pemberitahuan ketika seseorang menyukai postingan mereka atau mengikuti mereka:

```typescript
// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async (
  userId: string
): Promise<string | null> => {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Simpan token push di dokumen Firestore pengguna
  await setDoc(
    doc(db, 'users', userId),
    { pushToken: token, pushTokenUpdatedAt: Timestamp.now() },
    { merge: true }
  );

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
};

export const scheduleLocalNotification = (
  title: string,
  body: string,
  data?: Record<string, unknown>
) => {
  Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // langsung
  });
};
```

### Arsitektur Navigasi

Gabungkan semuanya dengan React Navigation. Gunakan auth stack untuk pengguna yang belum terautentikasi dan bottom tab navigator untuk pengalaman aplikasi utama:

```typescript
// src/navigation/AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FeedScreen from '../screens/FeedScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1877f2',
        tabBarInactiveTintColor: '#65676b',
      }}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Buat" component={CreatePostScreen} />
      <Tab.Screen name="Notifikasi" component={NotificationsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1877f2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
```

### Penanganan Kesalahan dan Status Pemuatan

Setiap operasi data dalam aplikasi media sosial harus menangani status pemuatan, kesalahan, dan keadaan kosong dengan baik. Buat komponen yang dapat digunakan kembali dan custom hooks:

```typescript
// src/hooks/usePosts.ts
import { useState, useEffect, useCallback } from 'react';
import { Post } from '../types';
import { subscribeToFeed, loadMorePosts } from '../services/postService';

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToFeed(
      (newPosts) => {
        setPosts(newPosts);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Pendengar real-time otomatis memperbarui; set refreshing sebentar untuk umpan balik UI
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const onLoadMore = useCallback(async () => {
    if (posts.length === 0) return;
    const lastPost = posts[posts.length - 1];
    const morePosts = await loadMorePosts(lastPost);
    setPosts((prev) => [...prev, ...morePosts]);
  }, [posts]);

  return { posts, loading, error, refreshing, onRefresh, onLoadMore };
}
```

```typescript
// src/components/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  message: string;
}

export default function EmptyState({ title, message }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 20, fontWeight: '600', color: '#050505', marginBottom: 8 },
  message: { fontSize: 14, color: '#65676b', textAlign: 'center', lineHeight: 20 },
});
```

## Contoh Kode

### Komponen Kartu Postingan Lengkap

Berikut adalah kartu postingan yang lengkap dan dapat digunakan kembali yang menampilkan info pengguna, gambar, tombol aksi (suka, komentar), dan jumlah komentar:

```typescript
// src/components/PostCard.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Post, Comment } from '../types';
import { toggleLike, checkIfLiked, addComment, subscribeToComments } from '../services/interactionService';
import { auth } from '../config/firebase';

interface Props {
  post: Post;
}

export default function PostCard({ post }: Props) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
      checkIfLiked(post.id, currentUser.uid).then(setLiked);
    }
  }, [post.id, currentUser]);

  useEffect(() => {
    if (showComments) {
      const unsubscribe = subscribeToComments(post.id, setComments);
      return unsubscribe;
    }
  }, [post.id, showComments]);

  const handleLike = async () => {
    if (!currentUser) return;
    const nowLiked = await toggleLike(post.id, currentUser.uid);
    setLiked(nowLiked);
    setLikeCount((prev) => (nowLiked ? prev + 1 : prev - 1));
  };

  const handleComment = async () => {
    if (!currentUser || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await addComment(
        post.id,
        currentUser.uid,
        currentUser.displayName || 'Anonymous',
        currentUser.photoURL,
        commentText.trim()
      );
      setCommentText('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header info pengguna */}
      <View style={styles.header}>
        <Image
          source={{ uri: post.userPhotoURL || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <Text style={styles.userName}>{post.userName}</Text>
      </View>

      {/* Gambar postingan */}
      <Image source={{ uri: post.imageURL }} style={styles.image} />

      {/* Tombol aksi */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
          <Text style={[styles.actionIcon, liked && styles.liked]}>
            {liked ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowComments(!showComments)}
          style={styles.actionButton}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.commentsCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <Text style={styles.caption}>
        <Text style={styles.captionUser}>{post.userName}</Text>
        {' '}{post.caption}
      </Text>

      {/* Bagian komentar */}
      {showComments && (
        <View style={styles.commentsSection}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <Text style={styles.commentUser}>{comment.userName}</Text>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))}

          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Tulis komentar..."
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity
              onPress={handleComment}
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#1877f2" />
              ) : (
                <Text style={styles.postButton}>Kirim</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontWeight: '600',
    fontSize: 15,
    color: '#050505',
  },
  image: {
    width: '100%',
    height: 350,
    backgroundColor: '#f0f2f5',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  liked: { color: '#e74c3c' },
  actionCount: { fontSize: 13, color: '#65676b' },
  caption: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    fontSize: 14,
    lineHeight: 19,
    color: '#050505',
  },
  captionUser: { fontWeight: '600' },
  commentsSection: { paddingHorizontal: 12, paddingBottom: 12 },
  commentRow: { flexDirection: 'row', marginBottom: 6 },
  commentUser: {
    fontWeight: '600',
    fontSize: 13,
    marginRight: 6,
    color: '#050505',
  },
  commentText: { fontSize: 13, color: '#050505', flex: 1 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
    paddingTop: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f0f2f5',
    borderRadius: 16,
    marginRight: 8,
  },
  postButton: { fontSize: 13, fontWeight: '600', color: '#1877f2' },
});
```

### Aturan Keamanan Firebase

Amankan sumber daya Firebase Anda dengan aturan keamanan tingkat produksi ini. Terapkan dari Firebase Console di bagian Firestore, Storage, dan Authentication:

```text
// Aturan Keamanan Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Profil pengguna — pemilik dapat baca/tulis, lainnya dapat baca
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
      allow delete: if request.auth.uid == userId;
    }

    // Postingan — pengguna terautentikasi dapat baca dan buat
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth.uid == resource.data.userId;

      // Subkoleksi suka
      match /likes/{likeId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == likeId;
      }

      // Subkoleksi komentar
      match /comments/{commentId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null
          && request.resource.data.userId == request.auth.uid;
        allow delete: if request.auth.uid == resource.data.userId;
      }
    }

    // Ikutan
    match /follows/{followDoc} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == resource.data.followerId;
      allow delete: if request.auth.uid == resource.data.followerId;
    }
  }
}
```

```text
// Aturan Keamanan Firebase Storage
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 10 * 1024 * 1024;
    }

    match /avatars/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

## Insight Penting

- **Pendengar real-time dibanding polling**: `onSnapshot` Firestore menyediakan pembaruan real-time dengan sinkronisasi delta yang efisien. Hindari interval polling — pendengar berbasis WebSocket mengonsumsi lebih sedikit bandwidth dan mengirimkan pembaruan secara instan.
- **Denormalisasi data untuk skala**: Aplikasi media sosial memerlukan data yang didenormalisasi. Simpan jumlah agregat (likesCount, commentsCount, followersCount) langsung di dokumen daripada menghitungnya dari subkoleksi. Gunakan `increment()` Firestore untuk pembaruan counter atomik tanpa baca-sebelum-tulis.
- **Arsitektur subkoleksi**: Gunakan subkoleksi untuk suka dan komentar, bukan array. Array tidak dapat diskalakan melebihi beberapa ratus item, tidak dapat melakukan kueri elemen individu tanpa mengambil seluruh array, dan berisiko melampaui batas ukuran dokumen (1 MiB). Subkoleksi dapat diskalakan hingga jutaan dokumen dan mendukung kueri yang efisien.
- **Pipeline unggahan gambar**: Kompres gambar di sisi klien sebelum mengunggah (gunakan `quality: 0.7` di `ImagePicker`) dan tetapkan batas ukuran file di aturan Storage. Untuk produksi, pertimbangkan menggunakan Firebase Extensions untuk pengubahan ukuran gambar guna menghasilkan thumbnail secara otomatis.
- **Arsitektur notifikasi push**: Layanan notifikasi push Expo menangani pendaftaran token perangkat dan pengiriman pesan. Simpan token di Firestore dan gunakan Cloud Function untuk mengirim notifikasi ketika peristiwa suka, komentar, atau ikuti terjadi, daripada mengirim langsung dari klien.
- **Persistensi offline**: Firestore mengaktifkan akses data offline secara default di perangkat mobile. Uji aplikasi Anda dengan mode pesawat diaktifkan untuk memverifikasi bahwa umpan, suka, dan komentar masih muncul dari cache lokal. Pendengar `onSnapshot` akan memutar ulang data cache dan menyinkronkan perubahan saat konektivitas kembali.
- **Pengembangan berbasis keamanan**: Tulis aturan keamanan sebelum kode aplikasi. Gunakan Firebase Emulator Suite untuk pengujian lokal — ini menangkap kesalahan izin sejak dini dan mempercepat siklus iterasi pengembangan.

## Langkah Berikutnya

- Pelajari cara menskalakan aplikasi media sosial Anda dengan Cloud Functions untuk logika sisi server (pengiriman notifikasi, moderasi konten, agregasi analitik).
- Jelajahi Panduan Performa dan Debugging React Native untuk mengoptimalkan umpan yang sarat gambar dengan FlashList dan strategi caching.
- Pelajari Silabus Pengembangan React Native untuk jalur pembelajaran komprehensif yang mencakup manajemen status, modul native, dan deployment produksi.
- Tambahkan dukungan unggahan video menggunakan `expo-av` dan Firebase Storage dengan Cloud Functions untuk transcoding video.

## Kesimpulan

Anda telah membangun aplikasi media sosial yang lengkap dengan React Native dan Firebase, mengimplementasikan fitur-fitur inti: autentikasi (email dan Google Sign-In), umpan foto real-time dengan pendengar Firestore, unggahan gambar ke Firebase Storage, interaksi sosial (suka dan komentar dengan subkoleksi), profil pengguna dengan sistem ikutan, dan notifikasi push. Pola arsitektur yang Anda pelajari — counter denormalisasi, desain subkoleksi, sinkronisasi real-time, dan penegakan aturan keamanan — dapat diterapkan langsung ke aplikasi sosial produksi dalam skala apa pun. Teknik yang sama ini mendukung aplikasi seperti Instagram, Twitter, dan TikTok, yang disesuaikan dengan kasus penggunaan spesifik Anda.
