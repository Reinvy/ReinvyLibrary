---
title: "Cheat Sheet Navigasi dan Deep Linking React Native"
description: "Referensi cepat untuk React Navigation dan Expo Router: stack, tab, dan drawer navigator, params bertipe, alur autentikasi, dan konfigurasi deep link."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Navigasi dan Deep Linking React Native

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Menginstal inti React Navigation | `@react-navigation/native` | Paket dasar yang dibutuhkan oleh semua navigator |
| Menambahkan stack navigator | `@react-navigation/native-stack` | Navigasi push/pop dengan transisi native |
| Menambahkan tab bar | `@react-navigation/bottom-tabs` | Tab bar bawah dengan ikon dan label |
| Menambahkan menu drawer | `@react-navigation/drawer` | Drawer geser untuk navigasi bertingkat |
| Kontainer layar native | `react-native-screens` | Optimasi performa berbasis tampilan native |
| Penanganan safe area | `react-native-safe-area-context` | Provider wajib untuk header dan tab bar |
| Membuat aplikasi Expo Router | `npx create-expo-app --template tabs` | Scaffolding routing berbasis file di direktori app/ |
| Navigasi aman tipe | `RootStackParamList` | Memaksa nama layar dan params terverifikasi saat kompilasi |
| Memetakan URL ke layar | prop `linking` pada `NavigationContainer` | Menghubungkan deep link ke rute bernama |
| Membaca URL peluncuran | `Linking.getInitialURL()` | Mengembalikan URL yang membuka aplikasi |
| Berlangganan peristiwa URL | `Linking.addEventListener('url')` | Terpicu saat deep link masuk ketika aplikasi berjalan |
| Dynamic links | `@react-native-firebase/dynamic-links` | Deep link tertunda lintas platform via Firebase |

## Perintah Umum

### Menginstal React Navigation

```bash
# Inti + stack navigator (proyek Expo gunakan expo install untuk versi yang kompatibel)
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context

# Bottom tab navigator
npm install @react-navigation/bottom-tabs

# Drawer navigator (membutuhkan gesture handler; Reanimated menggerakkan animasi)
npm install @react-navigation/drawer react-native-gesture-handler

# Proyek React Native murni menautkan modul native secara eksplisit
cd ios && pod install
```

### Menginstal Expo Router

```bash
# Scaffolding template tabs dengan routing berbasis file yang sudah dikonfigurasi
npx create-expo-app MyApp --template tabs

# Menambahkan Expo Router ke proyek yang sudah ada
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

### Mengaktifkan Skema Deep Link

```bash
# Atur skema URL di app.json agar sistem operasi dapat mengarahkan tautan ke aplikasi
# "scheme": "myapp" mendaftarkan URL myapp:// di kedua platform
npx expo prebuild --clean
```

## Potongan Kode

### Navigasi Bertipe dengan TypeScript

```typescript
// Definisikan setiap nama layar dan params-nya dalam satu tipe terpusat
export type RootStackParamList = {
  Home: undefined;
  Profile: { userId: number };
  Settings: undefined;
};

// Perluas namespace global agar hook menyimpulkan params secara otomatis
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

### Setup Stack Navigator

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Hook Navigasi Bertipe

```typescript
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeNavigation = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();

  const openProfile = () => {
    navigation.navigate('Profile', { userId: 42 });
  };

  return <Button title="Open Profile" onPress={openProfile} />;
}
```

### Mengirim dan Membaca Params

```typescript
import { useRoute, type RouteProp } from '@react-navigation/native';

type ProfileRoute = RouteProp<RootStackParamList, 'Profile'>;

function ProfileScreen() {
  const route = useRoute<ProfileRoute>();
  // route.params.userId bertipe number
  const { userId } = route.params;
  return <Text>User #{userId}</Text>;
}
```

### Setup Tab Navigator

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

### Konfigurasi Deep Linking

```typescript
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const linking = {
  prefixes: [Linking.createURL('/'), 'https://myapp.com'],
  config: {
    screens: {
      Home: 'home',
      Profile: 'users/:userId',
      Settings: 'settings',
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Menangani Deep Link Masuk

```typescript
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

// Mengurai URL seperti myapp://users/42 menjadi aksi navigasi
function handleDeepLink(url: string) {
  // Navigasi ke layar yang sesuai menggunakan parameter yang diekstrak
  console.log('Deep link diterima:', url);
}

export function useDeepLinkHandler() {
  useEffect(() => {
    // URL yang meluncurkan aplikasi (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // URL yang masuk ketika aplikasi sedang berjalan
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);
}
```

### Alur Autentikasi dengan Layar Kondisional

```typescript
function RootNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator>
      {user ? (
        <Stack.Screen name="Home" component={HomeScreen} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
```

### Routing Berbasis File dengan Expo Router

```text
app/
├── _layout.tsx        # Layout root (Stack, Tabs, atau Drawer)
├── index.tsx          # /  (rute beranda)
├── users/
│   ├── index.tsx      # /users
│   └── [id].tsx       # /users/:id  (segmen dinamis)
└── profile.tsx        # /profile
```

```typescript
// Params rute dinamis dibaca melalui useLocalSearchParams
import { useLocalSearchParams, Link } from 'expo-router';

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Link href={`/users/${id}`}>Buka profil</Link>
  );
}
```
