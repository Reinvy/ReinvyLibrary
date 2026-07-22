---
title: "Flutter Animations and Transitions Cheatsheet"
description: "A quick reference guide for Flutter's animation APIs — implicit animations, explicit animations, transitions, motion widgets, and animation techniques."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Flutter Animations and Transitions Cheatsheet

## Quick Reference Table

| Action | Widget / Code | Description |
|--------|---------------|-------------|
| Animate container properties | `AnimatedContainer(duration: const Duration(milliseconds: 300), ...)` | Animates color, size, padding, border, and more implicitly |
| Fade in/out | `AnimatedOpacity(opacity: _visible ? 1.0 : 0.0, duration: ..., child: ...)` | Animates opacity changes with a smooth fade |
| Resize smoothly | `AnimatedSize(duration: ..., curve: Curves.easeInOut, child: ...)` | Animates between different child sizes |
| Animate position | `AnimatedPositioned(left: _x, top: _y, duration: ..., child: ...)` | Animates the position of a child in a Stack |
| Padding animation | `AnimatedPadding(padding: EdgeInsets.all(_pad), duration: ..., child: ...)` | Animates padding changes smoothly |
| Cross-fade between widgets | `AnimatedCrossFade(firstChild: ..., secondChild: ..., crossFadeState: ..., duration: ...)` | Cross-fades between two widgets |
| Scale animation | `AnimatedScale(scale: _scale, duration: ..., child: ...)` | Animates scale (size) changes |
| Animate a theme property | `AnimatedTheme(data: ThemeData(...), duration: ..., child: ...)` | Animates theme changes |
| Default text style transition | `AnimatedDefaultTextStyle(style: _style, duration: ..., child: Text(...))` | Animates text style changes |
| Switcher with animation | `AnimatedSwitcher(duration: ..., child: Widget(key: ValueKey(_key)))` | Animated transition when swapping widgets |
| List insert/remove | `AnimatedList(key: _listKey, itemBuilder: ...)` | Animated insertions and removals in a list |
| Paging animation | `PageView(children: [...], pageController: _controller)` | Swipeable pages with animated transitions |
| Toggle between widgets | `AnimatedSwitcher(layoutBuilder: ..., transitionBuilder: ..., child: ...)` | Custom transition when swapping child widgets |

## Common Commands

### Animation Controller Setup

```dart
class _MyWidgetState extends State<MyWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _animation = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    _controller.forward(); // or .repeat() or .animateTo(0.5)
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

### Tween Types

```dart
Tween<double>(begin: 0.0, end: 100.0)
IntTween(begin: 0, end: 10)
ColorTween(begin: Colors.red, end: Colors.blue)
SizeTween(begin: Size(100, 100), end: Size(200, 200))
AlignmentTween(begin: Alignment.topLeft, end: Alignment.bottomRight)
BorderRadiusTween(begin: BorderRadius.circular(0), end: BorderRadius.circular(20))
RectTween(begin: Rect.fromLTWH(0, 0, 100, 100), end: Rect.fromLTWH(50, 50, 200, 200))
OffsetTween(begin: Offset.zero, end: Offset(100, 100))
```

### Curve Reference

```dart
Curves.linear            // Constant speed
Curves.easeIn            // Slow start, fast end
Curves.easeOut           // Fast start, slow end
Curves.easeInOut         // Slow start and end, fast middle
Curves.bounceIn          // Bouncy start
Curves.bounceOut         // Bouncy end
Curves.elasticIn         // Elastic overshoot at start
Curves.elasticOut        // Elastic overshoot at end
Curves.fastOutSlowIn     // Standard material curve
Curves.decelerate        // Starts fast, decelerates
Curves.easeInBack        // Slight overshoot at start
Curves.easeOutBack       // Slight overshoot at end
```

### Staggered Animation Pattern

```dart
// Run multiple animations with staggered delays
final Interval _firstInterval = const Interval(0.0, 0.5, curve: Curves.easeIn);
final Interval _secondInterval = const Interval(0.3, 0.8, curve: Curves.easeOut);

Animation<double> _first = Tween(begin: 0.0, end: 1.0).animate(
  CurvedAnimation(parent: _controller, curve: _firstInterval),
);
Animation<double> _second = Tween(begin: 0.0, end: 1.0).animate(
  CurvedAnimation(parent: _controller, curve: _secondInterval),
);
```

## Code Snippets

### Implicit Animations (No Controller Needed)

```dart
// Container that animates color, size, and shape changes
AnimatedContainer(
  duration: const Duration(milliseconds: 300),
  curve: Curves.easeInOut,
  width: _expanded ? 200 : 100,
  height: _expanded ? 200 : 100,
  color: _expanded ? Colors.blue : Colors.red,
  decoration: BoxDecoration(
    borderRadius: BorderRadius.circular(_expanded ? 100 : 10),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.2),
        blurRadius: _expanded ? 20 : 5,
      ),
    ],
  ),
  child: const Center(child: Text('Tap me')),
)

// Fade widget in and out
AnimatedOpacity(
  opacity: _isVisible ? 1.0 : 0.0,
  duration: const Duration(milliseconds: 500),
  child: const Text('Now you see me'),
)

// Animate between two colors with text style
AnimatedDefaultTextStyle(
  style: TextStyle(
    fontSize: _isLarge ? 32 : 16,
    color: _isLarge ? Colors.blue : Colors.grey,
    fontWeight: _isBold ? FontWeight.bold : FontWeight.normal,
  ),
  duration: const Duration(milliseconds: 400),
  child: const Text('Styled Text'),
)

// Cross-fade between two entirely different widgets
AnimatedCrossFade(
  duration: const Duration(milliseconds: 300),
  crossFadeState: _showFirst
      ? CrossFadeState.showFirst
      : CrossFadeState.showSecond,
  firstChild: const Icon(Icons.star, size: 64),
  secondChild: Column(
    mainAxisSize: MainAxisSize.min,
    children: const [
      Icon(Icons.favorite, size: 48, color: Colors.red),
      Text('Heart'),
    ],
  ),
)
```

### Explicit Animations with AnimationController

```dart
class BounceAnimation extends StatefulWidget {
  const BounceAnimation({super.key});

  @override
  State<BounceAnimation> createState() => _BounceAnimationState();
}

class _BounceAnimationState extends State<BounceAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _bounceAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _bounceAnimation = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.bounceOut),
    );
    _controller.repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _bounceAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -_bounceAnimation.value * 50),
          child: child,
        );
      },
      child: const FlutterLogo(size: 100),
    );
  }
}
```

### Hero Animation (Page Transition)

```dart
// Source page
GestureDetector(
  onTap: () {
    Navigator.push(context, MaterialPageRoute(
      builder: (context) => const DetailPage(),
    ));
  },
  child: Hero(
    tag: 'hero-image-${item.id}',
    child: Image.network(item.thumbnailUrl),
  ),
)

// Destination page
Hero(
  tag: 'hero-image-${item.id}',
  child: Image.network(item.fullResolutionUrl),
)
```

### Custom Tween Animation Builder

```dart
AnimatedBuilder(
  animation: _controller,
  builder: (context, child) {
    return Opacity(
      opacity: _animation.value,
      child: Transform.rotate(
        angle: _animation.value * 6.28, // Full rotation (2π)
        child: Transform.scale(
          scale: _animation.value,
          child: child,
        ),
      ),
    );
  },
  child: const FlutterLogo(size: 150),
)
```

### Motion / Decoration Transitions

```dart
// TweenAnimationBuilder — self-contained tween animation
TweenAnimationBuilder<double>(
  tween: Tween(begin: 0.0, end: 1.0),
  duration: const Duration(milliseconds: 600),
  curve: Curves.easeOut,
  builder: (context, value, child) {
    return Opacity(
      opacity: value,
      child: Transform.translate(
        offset: Offset(0, 30 * (1 - value)),
        child: child,
      ),
    );
  },
  child: const Card(
    child: Padding(
      padding: EdgeInsets.all(24.0),
      child: Text('Fade-in Slide-up Card'),
    ),
  ),
)
```

### Slide Transition (Custom Route)

```dart
// Custom slide-up route transition
Navigator.push(context, PageRouteBuilder(
  pageBuilder: (context, animation, secondaryAnimation) =>
      const MyNewPage(),
  transitionsBuilder: (context, animation, secondaryAnimation, child) {
    const begin = Offset(0.0, 1.0);
    const end = Offset.zero;
    const curve = Curves.easeInOut;

    var tween = Tween(begin: begin, end: end)
        .chain(CurveTween(curve: curve));
    var offsetAnimation = animation.drive(tween);

    return SlideTransition(
      position: offsetAnimation,
      child: child,
    );
  },
));
```

### Physics-Based Spring Animation

```dart
SpringDescription(
  mass: 1.0,        // Heavier mass = slower, more momentum
  stiffness: 100.0,  // Higher stiffness = faster, snappier
  damping: 10.0,     // Higher damping = less bounce
);

// Usage with AnimationController
_controller = AnimationController(
  vsync: this,
  duration: const Duration(milliseconds: 500), // Ignored for springs
);
_spring = SpringSimulation(
  SpringDescription(mass: 1, stiffness: 100, damping: 10),
  0.0,     // start
  1.0,     // end
  0.0,     // initial velocity
);
_controller.animateWith(_spring);
```

### AnimatedList CRUD Operations

```dart
final GlobalKey<AnimatedListState> _listKey = GlobalKey<AnimatedListState>();
final List<String> _items = [];

// Insert item with animation
void _insertItem(int index, String item) {
  _items.insert(index, item);
  _listKey.currentState?.insertItem(index, duration: const Duration(milliseconds: 300));
}

// Remove item with animation
void _removeItem(int index) {
  final removedItem = _items.removeAt(index);
  _listKey.currentState?.removeItem(
    index,
    (context, animation) => SizeTransition(
      sizeFactor: animation,
      child: Card(child: ListTile(title: Text(removedItem))),
    ),
    duration: const Duration(milliseconds: 300),
  );
}

// AnimatedList widget
AnimatedList(
  key: _listKey,
  initialItemCount: _items.length,
  itemBuilder: (context, index, animation) {
    return SizeTransition(
      sizeFactor: animation,
      child: ListTile(
        title: Text(_items[index]),
        trailing: IconButton(
          icon: const Icon(Icons.delete),
          onPressed: () => _removeItem(index),
        ),
      ),
    );
  },
)
```

### Value Notifier with AnimatedBuilder

```dart
// Lightweight reactive animation without StatefulWidget
final ValueNotifier<double> _scaleNotifier = ValueNotifier<double>(1.0);

// Trigger
_onTap() {
  _scaleNotifier.value = 1.3;
  Future.delayed(const Duration(milliseconds: 200), () {
    _scaleNotifier.value = 1.0;
  });
}

// Widget
ValueListenableBuilder<double>(
  valueListenable: _scaleNotifier,
  builder: (context, scale, child) {
    return Transform.scale(
      scale: scale,
      child: child,
    );
  },
  child: ElevatedButton(
    onPressed: _onTap,
    child: const Text('Press Me'),
  ),
)
```
