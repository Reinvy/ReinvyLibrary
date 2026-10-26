---
title: "React Native Animations Cheatsheet"
description: "Quick reference for the Animated API, Reanimated 3 shared values, gesture-driven transitions, layout animations, and animation performance tuning."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# React Native Animations Cheatsheet

## Quick Reference Table

| Action | API / Code | Notes |
|--------|-----------|-------|
| Imperative timing animation | `Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true })` | Must call `.start()`; native driver for transform and opacity only |
| Spring animation | `Animated.spring(v, { toValue: 1, friction: 6, tension: 60 })` | Ignores `duration`; tune with `damping`/`stiffness` in Reanimated |
| Decay / fling | `Animated.decay(v, { velocity: 2, deceleration: 0.997 })` | Momentum after a drag release |
| Run in sequence | `Animated.sequence([a, b])` | Each animation starts after the previous completes |
| Run in parallel | `Animated.parallel([a, b], { stopTogether: false })` | Set `stopTogether: false` to keep siblings alive |
| Stagger children | `Animated.stagger(80, items)` | Common for list entry |
| Loop forever | `Animated.loop(anim, { iterations: -1 })` | Stop it on unmount or it keeps the JS thread busy |
| Interpolate value | `v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] })` | Single value, many output styles |
| Shared value | `const x = useSharedValue(0)` | Reanimated 3; writable from the UI thread |
| UI-thread animation | `x.value = withTiming(1, { duration: 250 })` | No bridge traffic per frame |
| Animated style | `useAnimatedStyle(() => ({ opacity: x.value }))` | Must read `.value` inside the worklet |
| Layout animation | `entering={FadeInDown.duration(300)}` | Reanimated 3 built-in presets |
| Gesture handler | `const pan = Gesture.Pan().onUpdate(e => { tx.value = e.translationX })` | Wrap with `GestureDetector` |
| Scroll-linked value | `useAnimatedScrollHandler({ onScroll: e => { y.value = e.contentOffset.y } })` | Attach to `Animated.ScrollView` |
| Reduce motion | `useReducedMotion()` | Skip non-essential motion for accessibility |

## Common Commands

### Install and configure the toolchain

```bash
# Reanimated 3 + gesture handler (Expo)
npx expo install react-native-reanimated react-native-gesture-handler

# Bare React Native
npm install react-native-reanimated react-native-gesture-handler

# iOS pods after install
cd ios && pod install && cd ..

# Clear the Metro cache after any Babel change
npx expo start --clear

# Frame rate overlay on a connected device
adb shell dumpsys gfxinfo com.example.app
```

```javascript
// babel.config.js — the Reanimated plugin must be the final entry
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: ['react-native-reanimated/plugin'],
    };
};
```

### Verify the native driver is actually used

```bash
# Animations must keep running while this blocks the JS thread
# for two seconds. If they freeze, the animation is on the JS thread.
node -e "console.log('use the in-app dev menu: Perf Monitor')"
```

## Code Snippets

### Animated API with the native driver

```typescript
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';

export function FadeInCard({ children }: { children: React.ReactNode }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        const anim = Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }),
        ]);

        anim.start(({ finished }) => {
            if (!finished) {
                console.warn('Card entrance animation was interrupted');
            }
        });

        return () => anim.stop();
    }, [opacity, translateY]);

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            <Pressable accessibilityRole="button">{children}</Pressable>
        </Animated.View>
    );
}
```

### Reanimated 3: gesture-driven swipe row with clamping

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const MAX_TRANSLATE = -96;

export function SwipeRow({ children }: { children: React.ReactNode }) {
    const tx = useSharedValue(0);
    const start = useSharedValue(0);

    const pan = Gesture.Pan()
        .onBegin(() => {
            start.value = tx.value;
        })
        .onUpdate((event) => {
            const next = start.value + event.translationX;
            tx.value = Math.min(0, Math.max(MAX_TRANSLATE, next));
        })
        .onEnd((event) => {
            const shouldOpen = event.translationX < MAX_TRANSLATE / 2;
            tx.value = withSpring(shouldOpen ? MAX_TRANSLATE : 0, { damping: 18 });
        });

    const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={style}>{children}</Animated.View>
        </GestureDetector>
    );
}
```

### Performance rules of thumb

```text
1. Prefer transform and opacity — they run on the native driver.
2. Never animate width, height, top, or margin for anything user-visible.
3. Set useNativeDriver: true everywhere it is legal, or the animation jitters under load.
4. Keep worklets small; each allocation inside a worklet runs per frame.
5. Always stop loops and timers on unmount to avoid leaks and battery drain.
6. Use LayoutAnimation only for one-off, low-frequency changes.
7. Test on the slowest supported Android device, not the simulator.
```
