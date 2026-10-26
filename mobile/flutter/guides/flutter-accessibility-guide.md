---
title: "Flutter Accessibility Guide"
description: "Practical guidelines for shipping accessible Flutter apps: semantics widgets, screen reader support, color contrast, touch target sizes, text scaling, and automated accessibility tests."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Flutter Accessibility Guide

## Introduction

Accessibility is not a feature you bolt on before release; it is a property of every widget you build. Roughly one in six people lives with a disability, and many more depend on accessibility features temporarily — a broken wrist, bright sunlight, a noisy train. When a Flutter app ignores semantics, contrast, or text scaling, those users cannot complete tasks that everyone else finishes in two taps.

Flutter gives you a strong foundation: almost every Material and Cupertino widget ships with sensible semantics, and the framework exposes `Semantics`, `MergeSemantics`, and `ExcludeSemantics` for everything custom. The gap is rarely the framework — it is that custom UI is composed ad hoc, with bare `GestureDetector`s, grey-on-grey text, and fixed-height rows.

This guide covers the six areas that cause almost all real-world accessibility failures in Flutter: semantics annotations, screen reader behavior, contrast, touch targets, font scaling, and testing. Each practice is paired with the specific API that enforces it.

## Best Practices

- **Label every interactive element with its action, not its appearance.** A screen reader announces "Play Aurora", not "icon button". Prefer `Semantics(label:, button: true)` or a `tooltip` on `IconButton`; unlabeled icon buttons are invisible to TalkBack.
- **Merge the parts of a composite row.** A list tile made of an icon, a title, and a trailing button produces three focus stops and two redundant announcements. Wrap it in `MergeSemantics` and keep only the actionable child outside the merge.
- **Exclude purely decorative content.** Icons and images that add no information should be wrapped in `ExcludeSemantics` or have `excludeFromSemantics: true`, otherwise they add noise between real items.
- **Respect the user's text scale, never fight it.** Layouts must grow with `MediaQuery.textScalerOf(context)`. Avoid fixed heights and single-line `Text` inside containers; clamp only as a last resort with `MediaQuery.withClampedTextScaling`.
- **Meet WCAG AA contrast in both themes.** Body text needs a 4.5:1 ratio against its background, large text 3:1. Derive colors from `ColorScheme` (`onSurface`, `onPrimary`) instead of hard-coded greys, and never encode meaning in color alone.
- **Keep touch targets at least 48×48 dp.** Android's guideline is 48 dp, iOS 44 pt. Small icons get padding, not smaller tap areas — use `IconButton` defaults or `ConstrainedBox(minWidth: 48, minHeight: 48)`.
- **Never rely on gestures alone.** Swipe-to-dismiss and long-press actions need an equivalent explicit control; otherwise a switch-access or screen-reader user cannot discover them.
- **Treat accessibility tests as build gates.** `meetsGuideline` catches regressions in tap targets, labels, and contrast on every widget you pump, for free.

## Implementation Steps

### Step 1: Audit Before You Change Anything

Run the app on a device with TalkBack (Android) or VoiceOver (iOS) enabled, close your eyes, and try to complete the app's primary task. Then install Android's Accessibility Scanner or use Xcode's Accessibility Inspector to list contrast and tap-target violations. Record what fails; that list becomes your backlog.

### Step 2: Annotate Custom Widgets with Semantics

A `GestureDetector` produces no semantics at all. Wrap it explicitly and describe the action in the user's language:

```dart
class TrackTile extends StatelessWidget {
  const TrackTile({super.key, required this.title, required this.onPlay});

  final String title;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return MergeSemantics(
      child: Semantics(
        button: true,
        label: 'Play $title',
        child: InkWell(
          onTap: onPlay,
          child: Row(
            children: [
              const Icon(Icons.play_arrow, size: 20),
              const SizedBox(width: 12),
              Expanded(child: Text(title, overflow: TextOverflow.ellipsis)),
            ],
          ),
        ),
      ),
    );
  }
}
```

The icon is now part of the same node as the title, so a swipe reads one coherent item. For transient feedback, announce it explicitly instead of relying on a visual snackbar:

```dart
SemanticsService.announce('Added $title to queue', Directionality.of(context));
```

Use `Semantics(sortKey: OrdinalSortKey(2))` when the visual order differs from the logical reading order, for example a card whose badge is painted first but should be read last.

### Step 3: Fix Contrast and Touch Targets at the Theme Level

Contrast bugs usually come from ad-hoc colors. Move them into the theme so every screen inherits the fix:

```dart
final theme = ThemeData(
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFF3F51B5),
    brightness: Brightness.light,
  ),
);

Text(
  'Now playing',
  style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
);
```

Then enforce hit areas for custom controls:

```dart
SizedBox(
  width: 48,
  height: 48,
  child: IconButton(
    tooltip: 'Skip to next track',
    icon: const Icon(Icons.skip_next),
    onPressed: onSkip,
  ),
);
```

`IconButton` already guarantees the minimum tap target; the explicit `SizedBox` matters for hand-rolled `InkWell` icons.

### Step 4: Make Layouts Survive Text Scaling

Test at 200% system font size. Replace fixed row heights with minimums and let `Text` wrap:

```dart
Container(
  constraints: const BoxConstraints(minHeight: 56),
  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  child: Text(
    track.title,
    maxLines: 3,
    softWrap: true,
    overflow: TextOverflow.ellipsis,
  ),
);
```

Where a design truly cannot scale — a dense table header, for instance — clamp deliberately and document it:

```dart
MediaQuery.withClampedTextScaling(maxScaleFactor: 1.3, child: const HeaderRow());
```

### Step 5: Catch Regressions with Widget Tests

Flutter's accessibility guidelines are testable matchers. Add them next to your normal widget tests:

```dart
void _noop() {}

testWidgets('track tile is labelled and meets tap target guidelines', (tester) async {
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(body: TrackTile(title: 'Aurora', onPlay: _noop)),
  ));

  expect(
    tester.getSemantics(find.byType(TrackTile)),
    matchesSemantics(label: 'Play Aurora', isButton: true, hasTapAction: true, isEnabled: true),
  );
  expect(tester, meetsGuideline(androidTapTargetGuideline));
  expect(tester, meetsGuideline(labeledTapTargetGuideline));
  expect(tester, meetsGuideline(textContrastGuideline));
});
```

The three guideline matchers cover the most common regressions: targets under 48 dp, tappable widgets without labels, and text that fails WCAG AA. Run them in CI so a new screen cannot merge without them.
