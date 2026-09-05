---
title: "React Native Navigation and Deep Linking Cheatsheet"
description: "A quick reference for React Navigation and Expo Router: stack, tab, and drawer navigators, typed params, authentication flows, and deep link configuration."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# React Native Navigation and Deep Linking Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Install React Navigation core | `@react-navigation/native` | Base package required by every navigator |
| Add a stack navigator | `@react-navigation/native-stack` | Push/pop screens with native transitions |
| Add a tab bar | `@react-navigation/bottom-tabs` | Bottom tab navigator with icons and labels |
| Add a drawer menu | `@react-navigation/drawer` | Slide-in drawer for nested navigation |
| Native screen containers | `react-native-screens` | Performance optimization backed by native views |
| Safe area handling | `react-native-safe-area-context` | Required provider for headers and tab bars |
| Create an Expo Router app | `npx create-expo-app --template tabs` | Scaffolds file-based routing in an app/ directory |
| Type-safe navigation | `RootStackParamList` | Enforces screen names and params at compile time |
| Map URLs to screens | `linking` prop on `NavigationContainer` | Connects deep links to named routes |
| Read the launch URL | `Linking.getInitialURL()` | Returns the URL that opened the app |
| Subscribe to URL events | `Linking.addEventListener('url')` | Fires whenever a deep link arrives while running |
| Dynamic links | `@react-native-firebase/dynamic-links` | Deferred cross-platform deep links via Firebase |

## Common Commands

### Installing React Navigation

```bash
# Core + stack navigator (Expo projects use expo install for compatible versions)
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context

# Bottom tab navigator
npm install @react-navigation/bottom-tabs

# Drawer navigator (requires gesture handler; Reanimated powers the animation)
npm install @react-navigation/drawer react-native-gesture-handler

# Bare React Native projects link native modules explicitly
cd ios && pod install
```

### Installing Expo Router

```bash
# Scaffold a tabs template with file-based routing preconfigured
npx create-expo-app MyApp --template tabs

# Add Expo Router to an existing project
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

### Enabling Deep Link Schemes

```bash
# Set a URL scheme in app.json so the OS can route links to your app
# "scheme": "myapp" registers myapp:// URLs on both platforms
npx expo prebuild --clean
```

## Code Snippets

### Typed Navigation with TypeScript

```typescript
// Define every screen name and its params in one central type
export type RootStackParamList = {
  Home: undefined;
  Profile: { userId: number };
  Settings: undefined;
};

// Extend the global namespace so hooks infer params automatically
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

### Stack Navigator Setup

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

### Typed Navigation Hooks

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

### Passing and Reading Params

```typescript
import { useRoute, type RouteProp } from '@react-navigation/native';

type ProfileRoute = RouteProp<RootStackParamList, 'Profile'>;

function ProfileScreen() {
  const route = useRoute<ProfileRoute>();
  // route.params.userId is typed as number
  const { userId } = route.params;
  return <Text>User #{userId}</Text>;
}
```

### Tab Navigator Setup

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

### Deep Linking Configuration

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

### Handling Incoming Deep Links

```typescript
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

// Parses a URL like myapp://users/42 into a navigation action
function handleDeepLink(url: string) {
  // Navigate to the matching screen using the extracted parameters
  console.log('Deep link received:', url);
}

export function useDeepLinkHandler() {
  useEffect(() => {
    // URL that launched the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // URLs that arrive while the app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);
}
```

### Authentication Flow with Conditional Screens

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

### File-Based Routing with Expo Router

```text
app/
├── _layout.tsx        # Root layout (Stack, Tabs, or Drawer)
├── index.tsx          # /  (home route)
├── users/
│   ├── index.tsx      # /users
│   └── [id].tsx       # /users/:id  (dynamic segment)
└── profile.tsx        # /profile
```

```typescript
// Dynamic route params are read via useLocalSearchParams
import { useLocalSearchParams, Link } from 'expo-router';

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Link href={`/users/${id}`}>Open profile</Link>
  );
}
```
