---
title: "SwiftUI Animations Cheatsheet"
description: "Quick reference for SwiftUI animation APIs: withAnimation, animation modifiers, transitions, matchedGeometryEffect, phase and keyframe animators, and performance rules."
category: "mobile"
technology: "swift"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# SwiftUI Animations Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Animate a state change | `withAnimation(.spring) { isOn.toggle() }` | Explicit animation for affected views |
| Animate one value | `.animation(.easeInOut(duration: 0.3), value: isOn)` | Implicit, scoped to a single value |
| Spring with bounce | `.spring(duration: 0.5, bounce: 0.3)` | iOS 17 spring; bounce 0 = smooth |
| Snappy preset | `.snappy(duration: 0.35, extraBounce: 0.1)` | Apple's recommended default feel |
| Asymmetric transition | `.transition(.asymmetric(insertion: .scale, removal: .opacity))` | Different in and out |
| Shared element | `.matchedGeometryEffect(id: "card", in: ns)` | Hero morph between states |
| Keyframe timeline | `keyframeAnimator(initialValue:trigger:)` | Multi-property keyframes |
| Reduce motion | `@Environment(\.accessibilityReduceMotion)` | Skip or soften animations |

## Common Commands

### Simulator checks for animation work

```bash
# Dark mode: translucent layers behave differently than in light mode
xcrun simctl ui booted appearance dark

# Largest Dynamic Type size, where text-heavy animations break layout
xcrun simctl ui booted content_size accessibility-extra-extra-extra-large

# Confirm Reduce Motion degradation path
xcrun simctl ui booted increase_contrast enabled
```

### Build and test

```bash
# Run only the animation snapshot suite
xcodebuild test -scheme MyApp \
    -destination 'platform=iOS Simulator,name=iPhone 15' \
    -only-testing:MyAppTests/AnimationTests
```

## Code Snippets

### Explicit versus implicit animation

```swift
struct ToggleDot: View {
    @State private var isOn = false
    var body: some View {
        Circle()
            .fill(isOn ? .green : .gray)
            .frame(width: 60, height: 60)
            .onTapGesture {
                // Explicit: only this change animates
                withAnimation(.spring(duration: 0.45, bounce: 0.35)) { isOn.toggle() }
            }
            // Implicit: every change to isOn animates
            .animation(.snappy, value: isOn)
    }
}
```

### Shared element with matchedGeometryEffect

```swift
struct ExpandableCard: View {
    @Namespace private var ns
    @State private var expanded = false
    var body: some View {
        RoundedRectangle(cornerRadius: expanded ? 20 : 12)
            .fill(.blue.gradient)
            .matchedGeometryEffect(id: "card", in: ns)
            .frame(height: expanded ? 260 : 90)
            .padding()
            .onTapGesture {
                withAnimation(.spring(duration: 0.5)) { expanded.toggle() }
            }
    }
}
```

### Phase and keyframe animators

```swift
// Sequenced phases, each with its own curve
struct HeartBeat: View {
    @State private var beat = false
    var body: some View {
        PhaseAnimator([1.0, 1.25, 0.95, 1.0], trigger: beat) { scale in
            Image(systemName: "heart.fill")
                .font(.system(size: 64))
                .foregroundStyle(.red)
                .scaleEffect(scale)
        } animation: { _ in .easeInOut(duration: 0.22) }
            .onTapGesture { beat.toggle() }
    }
}
// Keyframes: independent tracks for scale and rotation
struct KeyframeBadge: View {
    @State private var trigger = false
    struct Values { var scale: Double = 1; var rotation: Double = 0 }
    var body: some View {
        Image(systemName: "star.fill")
            .keyframeAnimator(initialValue: Values(), trigger: trigger) { content, value in
                content.scaleEffect(value.scale).rotationEffect(.degrees(value.rotation))
            } keyframes: { _ in
                KeyframeTrack(\.scale) {
                    SpringKeyframe(1.4, duration: 0.25)
                    SpringKeyframe(1.0, duration: 0.30)
                }
            }
            .onTapGesture { trigger.toggle() }
    }
}
```

### Performance and accessibility guards

```swift
struct PulseGlow: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulsing = false
    var body: some View {
        Circle()
            .fill(.blue.opacity(0.7))
            .frame(width: 120, height: 120)
            .scaleEffect(pulsing ? 1.08 : 1.0)
            .drawingGroup()   // rasterises the layer, cheaper per frame
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                    pulsing = true
                }
            }
    }
}
```

### Scroll-linked transitions

```swift
ScrollView {
    LazyVStack(spacing: 16) {
        ForEach(items) { item in
            CardView(item: item)
                .scrollTransition(.animated(.snappy)) { content, phase in
                    content.opacity(phase.isIdentity ? 1 : 0.4)
                        .scaleEffect(phase.isIdentity ? 1 : 0.92)
                }
        }
    }
}
```

### Rules of thumb

- Animate transform-friendly properties (`scaleEffect`, `opacity`, `offset`) rather than `frame` or `padding`; transforms run on the render server, layout animates every frame.
- Always pass `value:` to `.animation`; the unvalued overload is deprecated and animates unrelated changes.
- Keep one source and one destination per `matchedGeometryEffect` id; duplicates glitch.
- Test with Reduce Motion plus Slow Animations before shipping any looping animation.
