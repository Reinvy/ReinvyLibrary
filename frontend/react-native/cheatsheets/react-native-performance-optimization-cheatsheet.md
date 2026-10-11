---
title: "React Native Performance Optimization Cheatsheet"
description: "A quick reference for profiling and speeding up React Native apps: Hermes and the New Architecture, bundle size reduction, render optimization, list virtualization, image and startup performance, and memory management."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# React Native Performance Optimization Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Enable Hermes in Android | `hermesEnabled true` in `android/gradle.properties` | Default since RN 0.70 — compiles JS to bytecode ahead of time |
| Enable Hermes in iOS | Enable the `hermes` pod and set the flag in the Podfile | Faster startup and lower memory, smaller app size |
| Enable the New Architecture | `newArchEnabled=true` in `gradle.properties` | Fabric renderer, TurboModules, and codegen — enabled by default in RN 0.76+ |
| Analyze bundle size | `npx react-native bundle --platform android --dev false --profile` | Generates a `.map` file for bundle analysis |
| Analyze with source maps | `npx source-map-explorer android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle.map` | Visualizes what each module contributes to the bundle |
| Profile JS with React DevTools | `npx react-devtools` | CPU and component tree profiling, highlights wasteful re-renders |
| Profile with native tools | Android Studio Profiler / Xcode Instruments | Frame rate (FPS), CPU, memory, and native thread activity |
| Enable Fast Refresh | Metro default in development | Preserves component state while hot-reloading edited modules |
| Detect render loops | `why-did-you-render` library | Logs every unexpected re-render with the props/state diff |
| List empty placeholder | `ListEmptyComponent` on FlatList | Avoids conditional `render` branches that re-create elements |
| Freeze off-screen rows | `react-native-freeze` | Suspends hidden list rows to cut inactive render cost |
| Cache remote images | `react-native-fast-image` | Disk and memory cache with priority and resize support |
| Load config in parallel | `.env` files bundled at build time | Avoids blocking startup on remote config fetches |

## Common Commands

### Hermes and Build Flags

```bash
# Android: keep Hermes and the New Architecture enabled
echo "hermesEnabled=true" >> android/gradle.properties
echo "newArchEnabled=true" >> android/gradle.properties

# iOS: enable Hermes in the Podfile (RN 0.70+)
cd ios && bundle install && bundle exec pod install

# Build a release bundle for profiling
npx react-native bundle --platform android --dev false --entry-file index.js \
  --bundle-output android/app/build/main.jsbundle --profile

# Android release build
cd android && ./gradlew assembleRelease

# iOS release build
cd ios && npx react-native run-ios --configuration Release
```

### Bundle and Performance Analysis

```bash
# Install the bundle visualizer
npm install --save-dev source-map-explorer

# Generate the bundle, then explore it
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output /tmp/index.bundle \
  --sourcemap-output /tmp/index.bundle.map
npx source-map-explorer /tmp/index.bundle.map

# Start React DevTools for the component profiler
npx react-devtools

# Reset Metro's transform cache when measurements look stale
npx react-native start --reset-cache
```

### Release-Specific Verification

```bash
# Android: verify Hermes bytecode was produced (release build)
find android/app/build -name "*.hbc" | head

# iOS: measure startup with Instruments' App Launch template
# Android: use "Startup Profiling" in Android Studio Profiler

# Log JS-render timings (Android, release variant)
adb logcat -s ReactNativeJS:V ReactNative:V
```

## Code Snippets

### Memoize Components and Callbacks

```javascript
import React, { memo, useCallback, useMemo } from 'react';

// Skip re-renders when props are referentially equal
const ProductCard = memo(function ProductCard({ product, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Text>{product.name}</Text>
      <Text>{product.price}</Text>
    </Pressable>
  );
});

export default function ProductList({ products }) {
  // Stable callbacks: a new function identity would invalidate memoization
  const handlePress = useCallback((id) => {
    navigate(`/product/${id}`);
  }, [navigate]);

  // Expensive derived data is computed once per products change
  const sorted = useMemo(
    () => [...products].sort((a, b) => a.price - b.price),
    [products],
  );

  return sorted.map((product) => (
    <ProductCard key={product.id} product={product} onPress={() => handlePress(product.id)} />
  ));
}
```

### Virtualized FlatList

```javascript
import React, { useCallback } from 'react';
import { FlatList, Image, Text, View } from 'react-native';

// One row component, memoized, avoids creating elements in render
const Row = React.memo(({ item, onPress }) => (
  <View style={{ flexDirection: 'row' }}>
    <Image source={{ uri: item.thumbnail }} style={{ width: 48, height: 48 }} />
    <Text>{item.title}</Text>
  </View>
));

export default function Feed({ items, onPressItem }) {
  const renderItem = useCallback(
    ({ item }) => <Row item={item} onPress={() => onPressItem(item.id)} />,
    [onPressItem],
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      removeClippedSubviews
      getItemLayout={(_, index) => ({
        length: 56,
        offset: 56 * index,
        index,
      })}
      ListEmptyComponent={<Text>No items yet</Text>}
    />
  );
}
```

### Image Caching and Lifecycle

```javascript
import FastImage from 'react-native-fast-image';

// Cache to disk, prioritize above-the-fold images
<FastImage
  style={{ width: 200, height: 200 }}
  source={{
    uri: 'https://cdn.example.com/large.jpg',
    priority: FastImage.priority.high,
  }}
  resizeMode={FastImage.resizeMode.contain}
/>

// Android only: release image memory when a screen is hidden
import { Image } from 'react-native';
// On unmount: Image.queryCache and Image prefetch keep the cache under control
FastImage.preload([
  { uri: 'https://cdn.example.com/next.jpg' },
  { uri: 'https://cdn.example.com/next2.jpg' },
]);
```

### Interaction and Thread Management

```javascript
import { InteractionManager, TurboModuleRegistry } from 'react-native';

// Defer heavy work until the current navigation transition finishes
InteractionManager.runAfterInteractions(() => {
  hydrateExpensiveState();
});

// Move pure JS work off the JS thread with a native TurboModule
// (New Architecture codegen exposes the native method synchronously)
const NativeHeavy = TurboModuleRegistry.getEnforcing('NativeHeavy');
const result = NativeHeavy.computeInBackground(input);
```

### Measuring Startup Cost

```javascript
// Track JS-bootstrap duration to spot startup regressions
const START = Date.now();

if (global.performance && global.performance.mark) {
  global.performance.mark('app:start');
}

// After the first screen is interactive:
InteractionManager.runAfterInteractions(() => {
  console.log('Time-to-interactive (ms):', Date.now() - START);
});
```

### Avoiding Common Pitfalls

```javascript
import React from 'react';

// ❌ Inline object/function props break memoization on every render
<View style={{ marginTop: 8 }} />
<Row onPress={() => doSomething(id)} />

// ✅ Hoist constants and use stable callbacks
const STYLE = { marginTop: 8 };
const handlePress = React.useCallback(() => doSomething(id), [id]);
<View style={STYLE} />
<Row onPress={handlePress} />

// ❌ console.log in render paths stays in production bundles
// ✅ Remove or gate it behind __DEV__
if (__DEV__) console.log('render', id);

// ❌ Importing from large libraries pulls the whole tree
// ✅ Use per-module imports (e.g., lodash/groupBy) or tree-shakeable ESM
```
