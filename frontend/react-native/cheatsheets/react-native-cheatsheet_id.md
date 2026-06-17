---
title: "Cheat Sheet React Native"
description: "Panduan referensi cepat untuk komponen, API, perintah, dan pola umum React Native."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet React Native

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Membuat proyek Expo | `npx create-expo-app MyApp` | Membuat proyek Expo managed baru |
| Membuat proyek bare RN | `npx @react-native-community/cli init MyApp` | Membuat proyek React Native murni |
| Memulai server dev Expo | `npx expo start` | Meluncurkan server pengembangan Expo |
| Menjalankan di Android | `npx react-native run-android` | Membangun dan menjalankan aplikasi di emulator Android |
| Menjalankan di iOS | `npx react-native run-ios` | Membangun dan menjalankan aplikasi di simulator iOS |
| Membangun APK (Expo) | `npx eas build --platform android --profile production` | Membuat APK/AAB produksi Android via EAS |
| Membangun IPA (Expo) | `npx eas build --platform ios --profile production` | Membuat IPA produksi iOS via EAS |
| Pemeriksaan lint | `npx eslint . --ext .js,.jsx,.ts,.tsx` | Menjalankan ESLint di seluruh proyek |
| Pemeriksaan TypeScript | `npx tsc --noEmit` | Memeriksa tipe tanpa menghasilkan file |
| Menjalankan tes | `npx jest` | Menjalankan rangkaian tes Jest |
| Memasang paket | `npx expo install nama-paket` | Memasang versi paket yang kompatibel dengan Expo |
| Membersihkan cache Metro | `npx react-native start --reset-cache` | Me-reset cache bundler Metro (memperbaiki bundle yang basi) |

## Perintah Umum

### Expo CLI

```bash
# Inisialisasi proyek Expo baru
npx create-expo-app MyApp --template blank

# Memulai server pengembangan
npx expo start

# Memulai dengan tunnel (untuk perangkat fisik)
npx expo start --tunnel

# Melihat perangkat yang tersedia
npx expo devices

# Memasang paket yang kompatibel dengan Expo
npx expo install expo-status-bar expo-font @expo/vector-icons

# Pra-bangun untuk proyek native (bare workflow)
npx expo prebuild

# Menjalankan di Android
npx expo run:android

# Menjalankan di iOS
npx expo run:ios

# Ekspor untuk build web statis
npx expo export --platform web
```

### React Native CLI

```bash
# Inisialisasi proyek React Native baru
npx @react-native-community/cli init MyApp

# Menjalankan di emulator Android
npx react-native run-android

# Menjalankan di simulator iOS
npx react-native run-ios

# Menjalankan di simulator iOS tertentu
npx react-native run-ios --simulator "iPhone 15 Pro"

# Memulai Metro bundler secara manual
npx react-native start

# Memulai dengan reset cache
npx react-native start --reset-cache

# Membundel untuk rilis
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle
```

### EAS Build & Submit

```bash
# Login ke akun Expo
npx eas login

# Konfigurasi EAS Build
npx eas build:configure

# Membuat development build
npx eas build --platform android --profile development

# Membuat preview build
npx eas build --platform all --profile preview

# Membuat production build
npx eas build --platform ios --profile production

# Mengirim ke app store
npx eas submit --platform android
npx eas submit --platform ios

# Pembaruan OTA (over-the-air)
npx eas update --branch production --message "Perbaiki styling tombol login"
```

## Potongan Kode

### Komponen Inti

```tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';

function ContohScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Tata letak Flexbox */}
      <View style={styles.row}>
        <Text style={styles.title}>Halo, React Native!</Text>
        <Image
          source={{ uri: 'https://example.com/avatar.png' }}
          style={styles.avatar}
        />
        <TouchableOpacity style={styles.button} onPress={() => {}}>
          <Text style={styles.buttonText}>Tekan Saya</Text>
        </TouchableOpacity>
      </View>

      {/* Input teks */}
      <TextInput
        style={styles.input}
        placeholder="Masukkan nama Anda"
        onChangeText={(text) => console.log(text)}
      />

      {/* Konten scroll */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.map((item, index) => (
          <View key={index} style={styles.card}>
            <Text>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Styling dengan StyleSheet dan Flexbox

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  column: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### FlatList dengan Pull-to-Refresh

```tsx
import React, { useState, useCallback } from 'react';
import { FlatList, Text, View, RefreshControl, StyleSheet } from 'react-native';

interface Item {
  id: string;
  name: string;
}

function DaftarItem() {
  const [data, setData] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('https://api.example.com/items');
      const items: Item[] = await response.json();
      setData(items);
    } catch (error) {
      console.error('Gagal mengambil item:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>
    </View>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text>Tidak ada item — tarik ke bawah untuk me-refresh</Text>
        </View>
      }
    />
  );
}
```

### React Navigation (Stack + Tab)

```bash
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
```

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <View style={styles.center}>
      <Text>Halaman Utama</Text>
    </View>
  );
}

function ProfileScreen({ route }: { route: any }) {
  const { userId } = route.params;
  return (
    <View style={styles.center}>
      <Text>Profil: {userId}</Text>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={TabNavigator}
          options={{ title: 'Aplikasi Saya' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profil Pengguna' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Fetch API dengan Penanganan Error

```tsx
import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface User {
  id: number;
  name: string;
  email: string;
}

function ProfilPengguna({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `https://jsonplaceholder.typicode.com/users/${userId}`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data: User = await response.json();
        if (!cancelled) setUser(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat pengguna');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <ActivityIndicator size="large" color="#6366F1" />;
  if (error) return <Text style={styles.error}>Error: {error}</Text>;
  if (!user) return <Text>Tidak ada pengguna</Text>;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{user.name}</Text>
      <Text style={styles.subtitle}>{user.email}</Text>
    </View>
  );
}
```

### AsyncStorage untuk Penyimpanan Lokal

```bash
npx expo install @react-native-async-storage/async-storage
```

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_TOKEN: '@user_token',
  ONBOARDING_DONE: '@onboarding_done',
  SETTINGS: '@app_settings',
};

// Menyimpan data
async function simpanToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USER_TOKEN, token);
  } catch (error) {
    console.error('Gagal menyimpan token:', error);
  }
}

// Membaca data
async function bacaToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.USER_TOKEN);
  } catch (error) {
    console.error('Gagal membaca token:', error);
    return null;
  }
}

// Menghapus data
async function hapusToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.USER_TOKEN);
  } catch (error) {
    console.error('Gagal menghapus token:', error);
  }
}

// Menyimpan objek kompleks
async function simpanPengaturan(pengaturan: Record<string, unknown>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(pengaturan));
  } catch (error) {
    console.error('Gagal menyimpan pengaturan:', error);
  }
}

// Membaca objek kompleks
async function bacaPengaturan<T = Record<string, unknown>>(): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error('Gagal membaca pengaturan:', error);
    return null;
  }
}
```

### Kode Spesifik Platform

```tsx
import { Platform, StatusBar, StyleSheet } from 'react-native';

const statusBarHeight =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.select({
      ios: 44,  // Perkiraan safe area inset
      android: statusBarHeight,
      default: 0,
    }),
  },
});

// File spesifik platform (buat file berikut):
// - Button.tsx        (bersama)
// - Button.ios.tsx    (pengganti iOS)
// - Button.android.tsx (pengganti Android)
```

### Izin (contoh expo-location)

```bash
npx expo install expo-location
```

```tsx
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

async function mintaIzinLokasi(): Promise<Location.LocationObject | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      'Izin Diperlukan',
      'Akses lokasi diperlukan untuk menampilkan tempat di sekitar.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
      ]
    );
    return null;
  }

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return location;
  } catch (error) {
    console.error('Gagal mendapatkan lokasi:', error);
    return null;
  }
}
```

### Pola State Loading, Error, dan Kosong

```tsx
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function useAsync<T>(fetcher: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: 'error',
            error: err instanceof Error ? err.message : 'Error tidak diketahui',
          });
        }
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}

// Penggunaan dalam komponen:
function DataScreen() {
  const state = useAsync(() =>
    fetch('https://api.example.com/data').then((r) => r.json())
  );

  switch (state.status) {
    case 'loading':
      return <ActivityIndicator size="large" color="#6366F1" />;
    case 'error':
      return (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Terjadi kesalahan</Text>
          <Text style={styles.errorMessage}>{state.error}</Text>
        </View>
      );
    case 'success':
      return <DataView data={state.data} />;
    default:
      return <Text>Tekan tombol untuk memuat data</Text>;
  }
}
```
