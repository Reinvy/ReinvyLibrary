---
title: "Building a REST API-Driven Mobile App with React Native"
description: "A step-by-step tutorial on building a React Native mobile app that connects to a REST API — covering navigation, HTTP requests, state management, authentication, and CRUD operations."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a REST API-Driven Mobile App with React Native

## Summary

This tutorial walks you through building a fully functional React Native mobile application that communicates with a REST API backend. You will learn how to set up a React Native project using Expo, implement navigation with React Navigation, manage application state with React Context, handle user authentication, and perform CRUD operations against a RESTful API. By the end, you will have a working note-taking app that persists data via a backend service.

## Target Audience

- Mobile developers looking to learn React Native with real API integration.
- Frontend or full-stack developers transitioning from web to mobile development.
- Expected developer level: Intermediate — comfortable with JavaScript/TypeScript and basic React concepts.

## Prerequisites

- Basic knowledge of JavaScript (ES6+ syntax, async/await, Promises).
- Familiarity with React fundamentals (components, props, state, hooks).
- Node.js (v18 or later) installed on your development machine.
- A code editor (VS Code recommended).
- An Expo Go app installed on your iOS or Android device — or a simulator/emulator configured.
- (Optional) Basic understanding of REST API concepts.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Initialize a React Native project with Expo and configure it for development.
- Implement stack and tab navigation using React Navigation.
- Make HTTP requests to a REST API using the Fetch API.
- Manage global authentication state with React Context.
- Build a complete CRUD interface for a note-taking application.
- Handle loading, error, and empty states in a mobile UI.
- Deploy a React Native app for testing on a physical device.

## Context and Motivation

Modern mobile applications rarely exist in isolation — they connect to backend services to fetch, store, and synchronize data. Whether you are building a social media app, an e-commerce storefront, or a productivity tool, the ability to integrate a REST API is a fundamental skill for any React Native developer.

While there are many tutorials on React Native basics, few cover the complete end-to-end flow of building an API-driven app with authentication, navigation, and state management in a single project. This tutorial bridges that gap by giving you a real-world project template you can extend for your own applications.

We will use a public REST API (JSONPlaceholder) during development and show you how to swap in your own backend. For authentication, we simulate a login flow that can be replaced with a real authentication provider (JWT, OAuth, etc.).

## Core Content

### Setting Up the Project with Expo

Expo is the recommended way to start a new React Native project. It handles native build tooling, device management, and gives you access to a wide range of APIs without requiring Xcode or Android Studio for basic development.

Create a new Expo project:

```bash
npx create-expo-app@latest ReactNativeNotesApp --template blank
cd ReactNativeNotesApp
```

Install the core dependencies we will use throughout this tutorial:

```bash
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
npx expo install @react-native-async-storage/async-storage
```

### Project Structure

Organize your project with a clean, scalable folder layout:

```text
ReactNativeNotesApp/
├── App.js                  # Root component with navigation container
├── src/
│   ├── api/
│   │   └── client.js       # API client (base URL, request helpers)
│   ├── contexts/
│   │   └── AuthContext.js   # Global auth state
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── HomeScreen.js
│   │   ├── AddNoteScreen.js
│   │   └── NoteDetailScreen.js
│   ├── components/
│   │   ├── NoteCard.js
│   │   └── LoadingSpinner.js
│   └── navigation/
│       └── AppNavigator.js  # Stack + Tab navigator setup
```

### Building the API Client Layer

Create a centralized API client that handles base URL configuration, request headers, and error handling:

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
      console.error(`API request failed: ${endpoint}`, error);
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

This abstraction keeps your API logic centralized — if the backend URL changes, you update it in one place.

### Implementing Authentication with React Context

Authentication state needs to be accessible across the entire app. React Context provides a lightweight, built-in solution without external dependencies:

```javascript
// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on app launch
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('@user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load stored user', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    // In production, replace with real API call
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

The `AuthProvider` wraps your navigation tree, and the `useAuth` hook provides access to user state and auth methods from any screen.

### Setting Up Navigation

React Navigation allows you to compose multiple navigation patterns. We combine a **stack navigator** (for screen-to-screen transitions) with a **bottom tab navigator** (for top-level sections):

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
      <Tab.Screen name="Add Note" component={AddNoteScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a splash screen
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
              options={{ title: 'Note Details' }}
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

This pattern — conditional navigation based on auth state — is a standard approach. When the user is logged in, they see the main app; otherwise, they see the login screen.

### Building the Login Screen

The login screen collects user credentials and calls the auth context:

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
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notes App</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
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
          <Text style={styles.buttonText}>Sign In</Text>
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

### Building the Home Screen with FlatList

The home screen fetches notes from the API and displays them in a FlatList — React Native's high-performance scrolling list component:

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
      Alert.alert('Error', 'Failed to load notes');
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
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: logout },
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
          <Text style={styles.empty}>No notes yet. Tap "Add Note" to create one!</Text>
        }
      />
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
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

The `useFocusEffect` hook re-fetches data every time the screen comes into focus — this ensures newly added notes appear without manual refresh.

### Creating the Add Note Screen

This screen demonstrates a POST request to create a new resource:

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
      Alert.alert('Error', 'Title is required');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/posts', {
        title: title.trim(),
        body: body.trim(),
        userId: 1,
      });
      Alert.alert('Success', 'Note created!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Note title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.bodyInput]}
        placeholder="Write your note here..."
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
          <Text style={styles.buttonText}>Save Note</Text>
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

### Building the Note Detail Screen

The detail screen shows full content and allows deletion (DELETE request):

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
    Alert.alert('Delete Note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/posts/${note.id}`);
            Alert.alert('Deleted', 'Note has been deleted.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete note');
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
        <Text style={styles.deleteText}>Delete Note</Text>
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

### Creating the NoteCard Component

Reusable components keep your screens clean. The NoteCard displays a summary of each note:

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

### Wiring Everything Together in App.js

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

## Code Examples

All code examples are provided within the "Core Content" section above, organized by component. Here is a summary of where each file belongs:

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

To run the app:

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your phone, or press `a` to open on an Android emulator / `i` for iOS simulator.

## Key Insights

- **Centralize API logic**: Creating a single `ApiClient` class keeps your network layer consistent and testable. All screens benefit from the same error handling and header configuration.
- **Use React Context for global state**: For authentication and user data, Context is simpler than Redux and fully sufficient for most apps. Only reach for state management libraries when your state graph grows complex.
- **FlatList over ScrollView**: FlatList renders only visible items (virtualization), making it suitable for long lists. ScrollView renders all children upfront and will hurt performance with more than ~20 items.
- **useFocusEffect for data refresh**: Unlike `useEffect`, which fires only on mount, `useFocusEffect` fires every time the screen gains focus — ideal for keeping list data fresh after navigating back from a create/edit screen.
- **Handle loading and error states explicitly**: Every data-fetching screen should show loading indicators, error alerts, and empty-state messages. Skipping these leads to a poor user experience and silent failures.
- **Secure storage for tokens**: This tutorial uses AsyncStorage for simplicity, but for production apps, use `expo-secure-store` for storing authentication tokens securely.

## Next Steps

- Replace the mock login with a real authentication backend using JWT or OAuth 2.0.
- Add push notifications using Expo Notifications API.
- Implement image uploads with `expo-image-picker` and file upload endpoints.
- Explore state management with Zustand or Redux Toolkit for more complex apps.
- Connect to a real backend built with Express.js (see our [Express.js tutorials](/backend/expressjs/tutorials/)).
- Review the [React Native Development Syllabus](/frontend/react-native/syllabi/react-native-development-syllabus.md) for a structured learning path.

## Conclusion

In this tutorial, you built a complete REST API-driven mobile application with React Native. You learned how to set up a project with Expo, implement navigation with React Navigation, manage authentication state with Context, and perform full CRUD operations against a RESTful API. These skills form the foundation for any data-driven mobile app — from social feeds to inventory management to productivity tools.

The architecture you built — centralized API client, context-based auth, conditional navigation, and reusable components — will scale as your app grows. Apply the same patterns to your own projects, and you will ship faster with fewer bugs.
