---
title: "Membangun Aplikasi Mobile Berbasis REST API dengan React Native"
description: "Tutorial langkah demi langkah untuk membangun aplikasi mobile React Native yang terhubung dengan REST API — mencakup navigasi, HTTP request, manajemen state, autentikasi, dan operasi CRUD."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Mobile Berbasis REST API dengan React Native

## Ringkasan

Tutorial ini memandu Anda dalam membangun aplikasi mobile React Native yang berfungsi penuh dan berkomunikasi dengan backend REST API. Anda akan mempelajari cara menyiapkan proyek React Native menggunakan Expo, mengimplementasikan navigasi dengan React Navigation, mengelola state aplikasi dengan React Context, menangani autentikasi pengguna, dan melakukan operasi CRUD terhadap API RESTful. Pada akhirnya, Anda akan memiliki aplikasi pencatat catatan yang menyimpan data melalui layanan backend.

## Target Audiens

- Pengembang mobile yang ingin mempelajari React Native dengan integrasi API nyata.
- Pengembang frontend atau full-stack yang beralih dari pengembangan web ke mobile.
- Ekspektasi tingkat kemampuan: Menengah — nyaman dengan JavaScript/TypeScript dan konsep dasar React.

## Prasyarat

- Pengetahuan dasar JavaScript (sintaks ES6+, async/await, Promise).
- Familiar dengan fundamental React (komponen, props, state, hooks).
- Node.js (v18 atau lebih baru) terinstal di mesin pengembangan Anda.
- Editor kode (VS Code direkomendasikan).
- Aplikasi Expo Go terinstal di perangkat iOS atau Android Anda — atau simulator/emulator yang telah dikonfigurasi.
- (Opsional) Pemahaman dasar tentang konsep REST API.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginisialisasi proyek React Native dengan Expo dan mengonfigurasinya untuk pengembangan.
- Mengimplementasikan navigasi stack dan tab menggunakan React Navigation.
- Melakukan HTTP request ke REST API menggunakan Fetch API.
- Mengelola state autentikasi global dengan React Context.
- Membangun antarmuka CRUD lengkap untuk aplikasi pencatat catatan.
- Menangani state loading, error, dan konten kosong di UI mobile.
- Menjalankan aplikasi React Native untuk pengujian di perangkat fisik.

## Konteks dan Motivasi

Aplikasi mobile modern jarang berdiri sendiri — mereka terhubung ke layanan backend untuk mengambil, menyimpan, dan menyinkronkan data. Baik Anda membangun aplikasi media sosial, toko e-commerce, atau alat produktivitas, kemampuan untuk mengintegrasikan REST API adalah keterampilan fundamental bagi setiap pengembang React Native.

Meskipun ada banyak tutorial tentang dasar-dasar React Native, hanya sedikit yang mencakup alur lengkap dari awal hingga akhir dalam membangun aplikasi berbasis API dengan autentikasi, navigasi, dan manajemen state dalam satu proyek. Tutorial ini menjembatani kesenjangan tersebut dengan memberikan template proyek dunia nyata yang dapat Anda perluas untuk aplikasi Anda sendiri.

Kami akan menggunakan REST API publik (JSONPlaceholder) selama pengembangan dan menunjukkan cara menggantinya dengan backend Anda sendiri. Untuk autentikasi, kami menyimulasikan alur login yang dapat diganti dengan penyedia autentikasi nyata (JWT, OAuth, dll.).

## Konten Inti

### Menyiapkan Proyek dengan Expo

Expo adalah cara yang direkomendasikan untuk memulai proyek React Native baru. Expo menangani alat build native, manajemen perangkat, dan memberikan akses ke berbagai API tanpa memerlukan Xcode atau Android Studio untuk pengembangan dasar.

Buat proyek Expo baru:

```bash
npx create-expo-app@latest ReactNativeNotesApp --template blank
cd ReactNativeNotesApp
```

Instal dependensi inti yang akan kita gunakan sepanjang tutorial ini:

```bash
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
npx expo install @react-native-async-storage/async-storage
```

### Struktur Proyek

Atur proyek Anda dengan tata letak folder yang bersih dan dapat diskalakan:

```text
ReactNativeNotesApp/
├── App.js                  # Komponen root dengan container navigasi
├── src/
│   ├── api/
│   │   └── client.js       # API client (base URL, helper request)
│   ├── contexts/
│   │   └── AuthContext.js   # State autentikasi global
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── HomeScreen.js
│   │   ├── AddNoteScreen.js
│   │   └── NoteDetailScreen.js
│   ├── components/
│   │   ├── NoteCard.js
│   │   └── LoadingSpinner.js
│   └── navigation/
│       └── AppNavigator.js  # Pengaturan navigasi Stack + Tab
```

### Membangun Lapisan API Client

Buat API client terpusat yang menangani konfigurasi base URL, header request, dan penanganan error:

```javascript
// src/api/client.js
const API_BASE_URL = 'https://jsonplaceholder.typicode.com';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Permintaan API gagal: ${endpoint}`, error);
      throw error;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

Abstraksi ini menjaga logika API Anda tetap terpusat — jika URL backend berubah, Anda memperbaruinya di satu tempat.

### Mengimplementasikan Autentikasi dengan React Context

State autentikasi perlu dapat diakses di seluruh aplikasi. React Context menyediakan solusi bawaan yang ringan tanpa dependensi eksternal:

```javascript
// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Memeriksa sesi tersimpan saat aplikasi dimulai
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('@user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Gagal memuat user tersimpan', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    // Di produksi, ganti dengan panggilan API nyata
    const mockUser = { id: 1, username, email: `${username}@example.com` };
    await AsyncStorage.setItem('@user', JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('@user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}
```

`AuthProvider` membungkus pohon navigasi Anda, dan hook `useAuth` menyediakan akses ke state pengguna serta metode autentikasi dari layar mana pun.

### Menyiapkan Navigasi

React Navigation memungkinkan Anda menyusun beberapa pola navigasi. Kami menggabungkan **stack navigator** (untuk transisi antar layar) dengan **bottom tab navigator** (untuk bagian tingkat atas):

```javascript
// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AddNoteScreen from '../screens/AddNoteScreen';
import NoteDetailScreen from '../screens/NoteDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Notes" component={HomeScreen} />
      <Tab.Screen name="Tambah Catatan" component={AddNoteScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Atau layar splash
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NoteDetail"
              component={NoteDetailScreen}
              options={{ title: 'Detail Catatan' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

Pola ini — navigasi bersyarat berdasarkan state autentikasi — adalah pendekatan standar. Ketika pengguna masuk, mereka melihat aplikasi utama; jika tidak, mereka melihat layar login.

### Membangun Layar Login

Layar login mengumpulkan kredensial pengguna dan memanggil konteks autentikasi:

```javascript
// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Harap isi semua bidang');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
    } catch (error) {
      Alert.alert('Login Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aplikasi Catatan</Text>
      <TextInput
        style={styles.input}
        placeholder="Nama Pengguna"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#fff', padding: 14, borderRadius: 8,
    marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF', padding: 14, borderRadius: 8,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

### Membangun Layar Beranda dengan FlatList

Layar beranda mengambil catatan dari API dan menampilkannya dalam FlatList — komponen daftar berperforma tinggi dari React Native:

```javascript
// src/screens/HomeScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient } from '../api/client';
import NoteCard from '../components/NoteCard';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout } = useAuth();

  const fetchNotes = async () => {
    try {
      const data = await apiClient.get('/posts?_limit=20');
      setNotes(data);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat catatan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotes();
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() => navigation.navigate('NoteDetail', { note: item })}
          />
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <Text style={styles.empty}>Belum ada catatan. Ketuk "Tambah Catatan" untuk membuatnya!</Text>
        }
      />
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Keluar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 16, color: '#999' },
  logoutButton: {
    padding: 16, alignItems: 'center', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
});
```

Hook `useFocusEffect` mengambil ulang data setiap kali layar muncul — ini memastikan catatan yang baru ditambahkan muncul tanpa refresh manual.

### Membuat Layar Tambah Catatan

Layar ini mendemonstrasikan request POST untuk membuat resource baru:

```javascript
// src/screens/AddNoteScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { apiClient } from '../api/client';

export default function AddNoteScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Judul diperlukan');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/posts', {
        title: title.trim(),
        body: body.trim(),
        userId: 1,
      });
      Alert.alert('Berhasil', 'Catatan telah dibuat!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Gagal membuat catatan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Judul catatan"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.bodyInput]}
        placeholder="Tulis catatan Anda di sini..."
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Simpan Catatan</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  input: {
    backgroundColor: '#fff', padding: 14, borderRadius: 8,
    marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd',
  },
  bodyInput: { height: 200 },
  button: {
    backgroundColor: '#007AFF', padding: 14, borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

### Membangun Layar Detail Catatan

Layar detail menampilkan konten lengkap dan memungkinkan penghapusan (request DELETE):

```javascript
// src/screens/NoteDetailScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { apiClient } from '../api/client';

export default function NoteDetailScreen({ route, navigation }) {
  const { note } = route.params;

  const handleDelete = async () => {
    Alert.alert('Hapus Catatan', 'Tindakan ini tidak dapat dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/posts/${note.id}`);
            Alert.alert('Terhapus', 'Catatan telah dihapus.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (error) {
            Alert.alert('Error', 'Gagal menghapus catatan');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{note.title}</Text>
      <Text style={styles.body}>{note.body}</Text>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>Hapus Catatan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  body: { fontSize: 16, lineHeight: 24, color: '#333' },
  deleteButton: {
    marginTop: 32, padding: 14, borderRadius: 8,
    backgroundColor: '#FF3B30', alignItems: 'center',
  },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

### Membuat Komponen NoteCard

Komponen yang dapat digunakan kembali menjaga kebersihan layar. NoteCard menampilkan ringkasan setiap catatan:

```javascript
// src/components/NoteCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function NoteCard({ note, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.title} numberOfLines={1}>
        {note.title}
      </Text>
      <Text style={styles.body} numberOfLines={2}>
        {note.body}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', padding: 16, marginHorizontal: 12,
    marginVertical: 6, borderRadius: 10, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  body: { fontSize: 14, color: '#666' },
});
```

### Menghubungkan Semuanya di App.js

```javascript
// App.js
import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
```

## Contoh Kode

Semua contoh kode disediakan di bagian "Konten Inti" di atas, diorganisir per komponen. Berikut ringkasan lokasi setiap file:

| File | Path |
|------|------|
| API Client | `src/api/client.js` |
| Auth Context | `src/contexts/AuthContext.js` |
| App Navigator | `src/navigation/AppNavigator.js` |
| Login Screen | `src/screens/LoginScreen.js` |
| Home Screen | `src/screens/HomeScreen.js` |
| Add Note Screen | `src/screens/AddNoteScreen.js` |
| Note Detail Screen | `src/screens/NoteDetailScreen.js` |
| Note Card Component | `src/components/NoteCard.js` |
| Root App | `App.js` |

Untuk menjalankan aplikasi:

```bash
npx expo start
```

Pindai kode QR dengan aplikasi Expo Go di ponsel Anda, atau tekan `a` untuk membuka di emulator Android / `i` untuk simulator iOS.

## Insight Penting

- **Sentralisasi logika API**: Membuat satu kelas `ApiClient` menjaga lapisan jaringan Anda konsisten dan dapat diuji. Semua layar mendapat manfaat dari penanganan error dan konfigurasi header yang sama.
- **Gunakan React Context untuk state global**: Untuk autentikasi dan data pengguna, Context lebih sederhana daripada Redux dan sudah cukup untuk sebagian besar aplikasi. Gunakan library manajemen state hanya ketika grafik state Anda menjadi kompleks.
- **FlatList daripada ScrollView**: FlatList hanya merender item yang terlihat (virtualisasi), membuatnya cocok untuk daftar panjang. ScrollView merender semua children di awal dan akan menurunkan performa dengan lebih dari ~20 item.
- **useFocusEffect untuk refresh data**: Berbeda dengan `useEffect` yang hanya berjalan saat mount, `useFocusEffect` berjalan setiap kali layar mendapatkan fokus — ideal untuk menjaga data daftar tetap segar setelah navigasi dari layar buat/edit.
- **Tangani state loading dan error secara eksplisit**: Setiap layar yang mengambil data harus menampilkan indikator loading, alert error, dan pesan konten kosong. Melewatkan hal ini menyebabkan pengalaman pengguna yang buruk dan kegagalan yang tidak terlihat.
- **Penyimpanan aman untuk token**: Tutorial ini menggunakan AsyncStorage untuk kesederhanaan, tetapi untuk aplikasi produksi, gunakan `expo-secure-store` untuk menyimpan token autentikasi dengan aman.

## Langkah Berikutnya

- Ganti login tiruan dengan backend autentikasi nyata menggunakan JWT atau OAuth 2.0.
- Tambahkan notifikasi push menggunakan Expo Notifications API.
- Implementasikan unggahan gambar dengan `expo-image-picker` dan endpoint unggah file.
- Jelajahi manajemen state dengan Zustand atau Redux Toolkit untuk aplikasi yang lebih kompleks.
- Hubungkan ke backend nyata yang dibangun dengan Express.js (lihat [tutorial Express.js kami](/backend/expressjs/tutorials/)).
- Tinjau [Silabus Pengembangan React Native](/frontend/react-native/syllabi/react-native-development-syllabus.md) untuk jalur pembelajaran terstruktur.

## Kesimpulan

Dalam tutorial ini, Anda telah membangun aplikasi mobile berbasis REST API yang lengkap dengan React Native. Anda mempelajari cara menyiapkan proyek dengan Expo, mengimplementasikan navigasi dengan React Navigation, mengelola state autentikasi dengan Context, dan melakukan operasi CRUD penuh terhadap API RESTful. Keterampilan ini menjadi fondasi untuk aplikasi mobile berbasis data — dari feed sosial hingga manajemen inventaris hingga alat produktivitas.

Arsitektur yang Anda bangun — API client terpusat, autentikasi berbasis Context, navigasi bersyarat, dan komponen yang dapat digunakan kembali — akan berkembang seiring pertumbuhan aplikasi Anda. Terapkan pola yang sama ke proyek Anda sendiri, dan Anda akan meluncurkan lebih cepat dengan bug yang lebih sedikit.
