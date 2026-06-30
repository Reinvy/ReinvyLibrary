---
title: "React Native Cheatsheet"
description: "A quick reference guide for React Native components, APIs, commands, and common patterns."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# React Native Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Create Expo project | `npx create-expo-app MyApp` | Scaffolds a new Expo managed project |
| Create bare RN project | `npx @react-native-community/cli init MyApp` | Scaffolds a bare React Native project |
| Start Expo dev server | `npx expo start` | Launches the Expo development server |
| Run on Android | `npx react-native run-android` | Builds and runs the app on an Android emulator |
| Run on iOS | `npx react-native run-ios` | Builds and runs the app on iOS simulator |
| Build APK (Expo) | `npx eas build --platform android --profile production` | Creates a production Android APK/AAB via EAS |
| Build IPA (Expo) | `npx eas build --platform ios --profile production` | Creates a production iOS IPA via EAS |
| Lint check | `npx eslint . --ext .js,.jsx,.ts,.tsx` | Runs ESLint across the project |
| TypeScript check | `npx tsc --noEmit` | Type-checks the project without emitting files |
| Run tests | `npx jest` | Executes the Jest test suite |
| Install a package | `npx expo install package-name` | Installs an Expo-compatible package version |
| Clear Metro cache | `npx react-native start --reset-cache` | Resets Metro bundler cache (fixes stale bundles) |

## Common Commands

### Expo CLI

```bash
# Initialize a new Expo project
npx create-expo-app MyApp --template blank

# Start development server
npx expo start

# Start with specific tunnel (for physical devices)
npx expo start --tunnel

# View available devices
npx expo devices

# Install Expo-compatible package
npx expo install expo-status-bar expo-font @expo/vector-icons

# Prebuild for native projects (bare workflow)
npx expo prebuild

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios

# Export static web build
npx expo export --platform web
```

### React Native CLI

```bash
# Initialize a new React Native project
npx @react-native-community/cli init MyApp

# Run on Android emulator
npx react-native run-android

# Run on iOS simulator
npx react-native run-ios

# Run on specific iOS simulator
npx react-native run-ios --simulator "iPhone 15 Pro"

# Start Metro bundler manually
npx react-native start

# Start with cache reset
npx react-native start --reset-cache

# Bundle for release
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle
```

### EAS Build & Submit

```bash
# Login to Expo account
npx eas login

# Configure EAS Build
npx eas build:configure

# Create development build
npx eas build --platform android --profile development

# Create preview build
npx eas build --platform all --profile preview

# Create production build
npx eas build --platform ios --profile production

# Submit to app stores
npx eas submit --platform android
npx eas submit --platform ios

# Update OTA (over-the-air)
npx eas update --branch production --message "Fix login button styling"
```

## Code Snippets

### Core Components

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

function ExampleScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Flexbox layout */}
      <View style={styles.row}>
        <Text style={styles.title}>Hello, React Native!</Text>
        <Image
          source={{ uri: 'https://example.com/avatar.png' }}
          style={styles.avatar}
        />
        <TouchableOpacity style={styles.button} onPress={() => {}}>
          <Text style={styles.buttonText}>Press Me</Text>
        </TouchableOpacity>
      </View>

      {/* Text input */}
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        onChangeText={(text) => console.log(text)}
      />

      {/* Scrollable content */}
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

### Styling with StyleSheet and Flexbox

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

### FlatList with Pull-to-Refresh

```tsx
import React, { useState, useCallback } from 'react';
import { FlatList, Text, View, RefreshControl, StyleSheet } from 'react-native';

interface Item {
  id: string;
  name: string;
}

function ItemList() {
  const [data, setData] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('https://api.example.com/items');
      const items: Item[] = await response.json();
      setData(items);
    } catch (error) {
      console.error('Failed to fetch items:', error);
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
          <Text>No items found — pull down to refresh</Text>
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
      <Text>Home Screen</Text>
    </View>
  );
}

function ProfileScreen({ route }: { route: any }) {
  const { userId } = route.params;
  return (
    <View style={styles.center}>
      <Text>Profile: {userId}</Text>
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
          options={{ title: 'My App' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'User Profile' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Fetch API with Error Handling

```tsx
import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface User {
  id: number;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: number }) {
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
          setError(err instanceof Error ? err.message : 'Failed to load user');
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
  if (!user) return <Text>No user found</Text>;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{user.name}</Text>
      <Text style={styles.subtitle}>{user.email}</Text>
    </View>
  );
}
```

### AsyncStorage for Local Persistence

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

// Save data
async function saveToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USER_TOKEN, token);
  } catch (error) {
    console.error('Failed to save token:', error);
  }
}

// Read data
async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.USER_TOKEN);
  } catch (error) {
    console.error('Failed to read token:', error);
    return null;
  }
}

// Remove data
async function removeToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.USER_TOKEN);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
}

// Save complex objects
async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Read complex objects
async function getSettings<T = Record<string, unknown>>(): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error('Failed to read settings:', error);
    return null;
  }
}
```

### Platform-Specific Code

```tsx
import { Platform, StatusBar, StyleSheet } from 'react-native';

const statusBarHeight =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.select({
      ios: 44,  // Safe area inset approximation
      android: statusBarHeight,
      default: 0,
    }),
  },
});

// Platform-specific files (create these files):
// - Button.tsx        (shared)
// - Button.ios.tsx    (iOS override)
// - Button.android.tsx (Android override)
```

### Permissions (expo-location example)

```bash
npx expo install expo-location
```

```tsx
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

async function requestLocationPermission(): Promise<Location.LocationObject | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Location access is needed to show nearby places.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
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
    console.error('Failed to get location:', error);
    return null;
  }
}
```

### Loading, Error, and Empty States Pattern

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
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}

// Usage in a component:
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
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{state.error}</Text>
        </View>
      );
    case 'success':
      return <DataView data={state.data} />;
    default:
      return <Text>Press a button to load data</Text>;
  }
}
```
