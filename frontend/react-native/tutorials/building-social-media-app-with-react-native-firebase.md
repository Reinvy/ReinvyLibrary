---
title: "Building a Social Media App with React Native and Firebase"
description: "A comprehensive tutorial on building a feature-rich social media application with React Native (Expo), featuring Firebase Authentication, Cloud Firestore, Firebase Storage for media uploads, real-time feeds, and push notifications."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Social Media App with React Native and Firebase

## Summary

This tutorial walks you through building a fully functional social media application using React Native (Expo) and Firebase. You will learn how to implement user authentication with email and Google Sign-In, store and retrieve posts with Cloud Firestore, upload images with Firebase Storage, build a real-time scrolling feed, add like and comment interactions, manage user profiles, and send push notifications with Firebase Cloud Messaging. By the end, you will have a complete social media app where users can share photos, follow each other, and engage with content in real time.

## Target Audience

- Mobile developers looking to build social media features in React Native applications.
- Frontend or full-stack developers familiar with React Native basics who want to learn Firebase integration.
- Expected developer level: Advanced — comfortable with JavaScript/TypeScript, React Native fundamentals, and asynchronous programming patterns.

## Prerequisites

- Solid understanding of JavaScript (ES6+ syntax, Promises, async/await, destructuring).
- Working knowledge of React Native and Expo (components, hooks, navigation).
- Node.js (v18 or later) and npm/yarn installed on your development machine.
- An Expo Go app on your iOS or Android device, or a simulator/emulator configured.
- A Firebase project created in the [Firebase Console](https://console.firebase.google.com) (free tier is sufficient).
- An Android or iOS device for push notification testing (physical device recommended).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up Firebase services (Authentication, Firestore, Storage, Cloud Messaging) in an Expo project.
- Implement email/password and Google Sign-In authentication flows.
- Design a Firestore data model for social media content (users, posts, likes, comments, follows).
- Upload images from the device camera or gallery to Firebase Storage.
- Build a real-time feed with paginated data from Firestore.
- Implement social features — liking posts, commenting, and following users.
- Send push notifications using Firebase Cloud Messaging via Expo Notifications.
- Handle loading, error, and empty states across all screens.

## Context and Motivation

Social media applications are among the most popular and complex mobile app categories. Features like real-time feeds, media uploads, social interactions (likes, comments, follows), and push notifications present architectural challenges that go beyond simple CRUD apps. Firebase provides a powerful backend-as-a-service platform that handles authentication, real-time data synchronization, scalable storage, and push notifications out of the box — making it an ideal choice for learning how to build social features without managing server infrastructure.

Understanding how to architect social media features is valuable across many domains: community apps, content platforms, marketplaces with reviews, team collaboration tools, and any application where users share and interact with content. The patterns you will learn — real-time data synchronization, image upload pipelines, social graph management — transfer directly to production applications at any scale.

## Core Content

### Project Setup and Firebase Configuration

Start by creating a new Expo project and installing the required dependencies:

```bash
npx create-expo-app SocialMediaApp --template blank-typescript
cd SocialMediaApp
```

Install the core Firebase SDK and Expo-compatible modules:

```bash
npx expo install firebase @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install expo-image-picker expo-notifications expo-device
npx expo install react-native-screens react-native-safe-area-context
```

Create a Firebase configuration file. In the Firebase Console, go to Project Settings > General > Your apps and register a web app to get your config object:

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

### Firestore Data Model Design

Design the Firestore collections for your social media app. Firestore is a NoSQL document database, so structure your data to match the access patterns your app needs:

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

**Collection structure**:

```text
users/{uid}          — User profile document
posts/{postId}       — Post document with image URL, caption, timestamps
posts/{postId}/likes/{userId}    — Like subcollection (exists if user liked)
posts/{postId}/comments/{commentId} — Comment subcollection
follows/{followerId_followingId} — Follow relationship document
```

This structure supports efficient queries: fetching a user's feed, getting likes for a post (with count), loading comments for a post, and checking follow relationships — all without complex joins or aggregations.

### Implementing Authentication

Set up the authentication flow with email/password and Google Sign-In:

```typescript
// src/services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

Create the authentication screens — a login screen and a registration screen. Use React Navigation to manage the auth flow:

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
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
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
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>
          Don't have an account? Sign up
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

### Building the Real-Time Feed with Firestore

The feed is the heart of any social media app. Use Firestore's real-time listener (`onSnapshot`) to display posts as they are created, and implement pagination with Firestore's cursor-based querying:

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

### Implementing Social Interactions — Likes and Comments

Add the like and comment systems. Likes use a subcollection pattern where each like document represents a user's like on a post, and the post document tracks the aggregated count:

```typescript
// src/services/interactionService.ts
import {
  doc, collection, setDoc, deleteDoc, getDoc,
  increment, query, where, orderBy, onSnapshot,
  addDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Comment } from '../types';

// --- Likes ---

export const toggleLike = async (postId: string, userId: string): Promise<boolean> => {
  const likeRef = doc(db, 'posts', postId, 'likes', userId);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, 'posts', postId), {
      likesCount: increment(-1),
    });
    return false; // unliked
  } else {
    await setDoc(likeRef, { userId, createdAt: Timestamp.now() });
    await updateDoc(doc(db, 'posts', postId), {
      likesCount: increment(1),
    });
    return true; // liked
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

// --- Comments ---

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

### Image Upload with Firebase Storage

Use Expo's `expo-image-picker` to let users select or capture photos, then upload them to Firebase Storage:

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
      Alert.alert('Permission Required', 'Camera roll access is needed to select photos.');
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
          {imageUri ? 'Change Photo' : 'Select Photo'}
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

### Users, Profiles, and Follow System

Build the user profile screen and the follow/unfollow mechanism:

```typescript
// src/services/socialGraphService.ts
import {
  doc, setDoc, deleteDoc, getDoc, getDocs,
  collection, query, where, increment, Timestamp,
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

### Push Notifications with Firebase Cloud Messaging

Set up push notifications using Expo Notifications and Firebase Cloud Messaging. This allows users to receive alerts when someone likes their post or follows them:

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

  // Store the push token in the user's Firestore document
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
    trigger: null, // immediate
  });
};
```

### Navigation Architecture

Wire everything together with React Navigation. Use an auth stack for unauthenticated users and a bottom tab navigator for the main app experience:

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
      <Tab.Screen name="Create" component={CreatePostScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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

### Error Handling and Loading States

Every data operation in a social media app must handle loading, error, and empty states gracefully. Create reusable components and custom hooks:

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
    // Real-time listener auto-updates; set refreshing briefly for UI feedback
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
  icon?: string;
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

## Code Examples

### Complete Post Card Component

Here is a complete, reusable post card that displays the user info, image, action buttons (like, comment), and comment count:

```typescript
// src/components/PostCard.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  TextInput, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { Post, Comment } from '../types';
import { toggleLike, checkIfLiked, addComment, subscribeToComments } from '../services/interactionService';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation();
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
      {/* User info header */}
      <View style={styles.header}>
        <Image
          source={{ uri: post.userPhotoURL || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <Text style={styles.userName}>{post.userName}</Text>
      </View>

      {/* Post image */}
      <Image source={{ uri: post.imageURL }} style={styles.image} />

      {/* Action buttons */}
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

      {/* Comments section */}
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
              placeholder="Write a comment..."
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
                <Text style={styles.postButton}>Post</Text>
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
  liked: {
    color: '#e74c3c',
  },
  actionCount: {
    fontSize: 13,
    color: '#65676b',
  },
  caption: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    fontSize: 14,
    lineHeight: 19,
    color: '#050505',
  },
  captionUser: {
    fontWeight: '600',
  },
  commentsSection: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  commentUser: {
    fontWeight: '600',
    fontSize: 13,
    marginRight: 6,
    color: '#050505',
  },
  commentText: {
    fontSize: 13,
    color: '#050505',
    flex: 1,
  },
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
  postButton: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1877f2',
  },
});
```

### Firebase Security Rules

Secure your Firebase resources with these production-grade security rules. Deploy them from the Firebase Console under Firestore, Storage, and Authentication:

```text
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profiles — owner can read/write, others can read
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
      allow delete: if request.auth.uid == userId;
    }

    // Posts — authenticated users can read and create
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth.uid == resource.data.userId;

      // Likes subcollection
      match /likes/{likeId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == likeId;
      }

      // Comments subcollection
      match /comments/{commentId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null
          && request.resource.data.userId == request.auth.uid;
        allow delete: if request.auth.uid == resource.data.userId;
      }
    }

    // Follows
    match /follows/{followDoc} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == resource.data.followerId;
      allow delete: if request.auth.uid == resource.data.followerId;
    }
  }
}
```

```text
// Firebase Storage Security Rules
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

## Key Insights

- **Real-time listeners over polling**: Firestore's `onSnapshot` provides real-time updates with efficient delta synchronization. Avoid polling intervals — the WebSocket-backed listener consumes less bandwidth and delivers updates instantly.
- **Data denormalization for scale**: Social media apps require denormalized data. Store aggregated counts (likesCount, commentsCount, followersCount) directly on documents rather than computing them from subcollections. Use Firestore's `increment()` for atomic counter updates without read-before-write.
- **Subcollection architecture**: Use subcollections for likes and comments instead of arrays. Arrays cannot scale beyond a few hundred items, cannot query individual elements without fetching the entire array, and risk document size limits (1 MiB). Subcollections scale to millions of documents and support efficient queries.
- **Image upload pipeline**: Compress images on the client before uploading (use `quality: 0.7` in `ImagePicker`) and set file size limits in Storage rules. For production, consider using Firebase Extensions for image resizing to generate thumbnails automatically.
- **Push notification architecture**: Expo's push notification service handles device token registration and message delivery. Store tokens in Firestore and use a Cloud Function to send notifications when a like, comment, or follow event occurs, rather than sending directly from the client.
- **Offline persistence**: Firestore enables offline data access by default on mobile. Test your app with airplane mode enabled to verify that the feed, likes, and comments still render from the local cache. The `onSnapshot` listener will replay cached data and sync changes when connectivity returns.
- **Security-first development**: Write security rules before application code. Use the Firebase Emulator Suite for local testing — it catches permission errors early and speeds up development iteration cycles.

## Next Steps

- Learn how to scale your social media app with Cloud Functions for server-side logic (notification dispatch, content moderation, analytics aggregation).
- Explore the React Native Performance and Debugging guide for optimizing image-heavy feeds with FlashList and caching strategies.
- Study the React Native Development Syllabus for a comprehensive learning path covering state management, native modules, and production deployment.
- Add video upload support using `expo-av` and Firebase Storage with Cloud Functions for video transcoding.

## Conclusion

You have built a complete social media application with React Native and Firebase, implementing core features: authentication (email and Google Sign-In), real-time photo feed with Firestore listeners, image upload to Firebase Storage, social interactions (likes and comments with subcollections), user profiles with a follow system, and push notifications. The architecture patterns you learned — denormalized counters, subcollection design, real-time synchronization, and security rule enforcement — are directly applicable to production social applications at any scale. These same techniques power apps like Instagram, Twitter, and TikTok, adapted to your specific use case.
