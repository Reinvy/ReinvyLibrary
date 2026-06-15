---
title: "Flutter Widget Cheatsheet"
description: "A quick reference guide for Flutter's core widgets — layout, input, navigation, styling, and state management."
category: "mobile"
technology: "flutter"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Flutter Widget Cheatsheet

## Quick Reference Table

| Action | Widget / Code | Description |
|--------|---------------|-------------|
| Center a child | `Center(child: ...)` | Centers a child widget within its parent |
| Add padding | `Padding(padding: EdgeInsets.all(16.0), child: ...)` | Adds empty space around a child |
| Arrange horizontally | `Row(children: [...])` | Places children in a horizontal flex layout |
| Arrange vertically | `Column(children: [...])` | Places children in a vertical flex layout |
| Stack overlapping | `Stack(children: [...])` | Positions children on top of each other |
| Wrap children | `Wrap(children: [...])` | Wraps children to the next line/column when overflow |
| Expanded sizing | `Expanded(child: ...)` | Makes a child fill available space in a Row/Column |
| Sized box | `SizedBox(width: 100, height: 50)` | Fixed-size box for spacing or constraints |
| Container styling | `Container(width: 100, height: 100, color: Colors.blue)` | Decorated box with padding, margin, decoration |
| Text display | `Text('Hello', style: TextStyle(fontSize: 18))` | Displays styled text |
| Image from asset | `Image.asset('assets/logo.png')` | Displays an image from the app bundle |
| Image from network | `Image.network('https://example.com/img.png')` | Displays an image from a URL |
| Icon display | `Icon(Icons.home, color: Colors.blue, size: 32)` | Displays a Material Design icon |
| Button (elevated) | `ElevatedButton(onPressed: () {}, child: Text('Submit'))` | Material elevated button |
| Button (text) | `TextButton(onPressed: () {}, child: Text('Cancel'))` | Text-only button |
| Button (outlined) | `OutlinedButton(onPressed: () {}, child: Text('Save'))` | Outlined button |
| Input field | `TextField(controller: _controller, decoration: InputDecoration(labelText: 'Name'))` | Text input field |
| Form wrapper | `Form(key: _formKey, child: ...)` | Groups and validates form fields |
| List of items | `ListView(children: [...])` | Scrollable list of widgets |
| Lazy list | `ListView.builder(itemCount: n, itemBuilder: (ctx, i) => Widget)` | Efficient scrolling list (builds on demand) |
| Grid of items | `GridView.builder(gridDelegate: ..., itemBuilder: ...)` | Scrollable grid layout |
| Scroll view | `SingleChildScrollView(child: ...)` | Scrollable container for a single child |
| App bar | `AppBar(title: Text('Home'), actions: [...])` | Top application bar with actions |
| Bottom nav | `BottomNavigationBar(items: [...], onTap: _onTabTapped)` | Bottom navigation bar |
| Tab bar | `TabBar(tabs: [...])` / `TabBarView(children: [...])` | Tab-based navigation |
| Drawer menu | `Drawer(child: ...)` | Side menu panel, used with Scaffold |
| Snackbar | `ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Saved!')))` | Temporary bottom message |
| Alert dialog | `showDialog(context: context, builder: (ctx) => AlertDialog(...))` | Modal dialog box |
| Loading indicator | `CircularProgressIndicator()` | Spinning loading indicator |
| Linear progress | `LinearProgressIndicator(value: 0.5)` | Horizontal progress bar |
| Card widget | `Card(child: ..., elevation: 4)` | Material card with rounded corners and shadow |
| Safe area | `SafeArea(child: ...)` | Avoids system UI (notch, status bar, home indicator) |
| Gesture detector | `GestureDetector(onTap: () {}, child: ...)` | Detects gestures (tap, drag, long press) |
| InkWell ripples | `InkWell(onTap: () {}, child: ...)` | Material ink splash effect on tap |
| Stream builder | `StreamBuilder<T>(stream: ..., builder: (ctx, snap) => Widget)` | Reactively builds UI from a Stream |
| Future builder | `FutureBuilder<T>(future: ..., builder: (ctx, snap) => Widget)` | Reactively builds UI from a Future |

## Common Commands

### Project Setup

```bash
# Create a new Flutter project
flutter create my_app

# Create a project with platform-specific code
flutter create --platforms android,ios,web my_app

# Add a package dependency
flutter pub add provider

# Add a dev dependency
flutter pub add --dev flutter_lints

# Install all dependencies from pubspec.yaml
flutter pub get

# Upgrade dependencies to latest compatible versions
flutter pub upgrade
```

### Development

```bash
# Run the app on a connected device / emulator
flutter run

# Run with specific device
flutter run -d chrome

# Run in release mode
flutter run --release

# Hot reload (while app is running, press 'r' in terminal)
# Or use the hot reload button in IDE

# Hot restart (press 'R' in terminal)
flutter run

# Run tests
flutter test

# Run a specific test file
flutter test test/widget_test.dart

# Analyze code for issues
flutter analyze
```

### Build & Deploy

```bash
# Build APK for Android
flutter build apk

# Build app bundle for Play Store
flutter build appbundle

# Build iOS archive
flutter build ios

# Build web release
flutter build web

# Check installed devices / emulators
flutter devices

# List available emulators
flutter emulators --launch <emulator_id>
```

## Code Snippets

### Basic App Scaffold

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'My Flutter App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: const Center(child: Text('Hello, Flutter!')),
    );
  }
}
```

### Common Layout Patterns

```dart
// Column layout with spacing
Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    const Text('Title', style: TextStyle(fontSize: 24)),
    const SizedBox(height: 8),
    const Text('Subtitle'),
    const SizedBox(height: 16),
    ElevatedButton(
      onPressed: () {},
      child: const Text('Action'),
    ),
  ],
)

// Responsive row with expanded children
Row(
  children: [
    Expanded(
      flex: 2,
      child: Container(color: Colors.red, height: 100),
    ),
    const SizedBox(width: 8),
    Expanded(
      flex: 1,
      child: Container(color: Colors.blue, height: 100),
    ),
  ],
)

// Stack with positioned children
Stack(
  children: [
    Container(width: 200, height: 200, color: Colors.grey[300]),
    const Positioned(
      top: 10,
      right: 10,
      child: Icon(Icons.star, color: Colors.amber, size: 32),
    ),
    const Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Text('Bottom label', textAlign: TextAlign.center),
    ),
  ],
)
```

### Stateful Widget with Form Handling

```dart
class LoginForm extends StatefulWidget {
  const LoginForm({super.key});

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      // Simulate API call
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Login successful!')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          TextFormField(
            controller: _emailController,
            decoration: const InputDecoration(
              labelText: 'Email',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.email),
            ),
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.isEmpty) return 'Email is required';
              if (!value.contains('@')) return 'Enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _passwordController,
            decoration: const InputDecoration(
              labelText: 'Password',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.lock),
            ),
            obscureText: true,
            validator: (value) {
              if (value == null || value.length < 6) {
                return 'Password must be at least 6 characters';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Login'),
            ),
          ),
        ],
      ),
    );
  }
}
```

### ListView with Pull-to-Refresh

```dart
class ItemList extends StatefulWidget {
  const ItemList({super.key});

  @override
  State<ItemList> createState() => _ItemListState();
}

class _ItemListState extends State<ItemList> {
  final List<String> _items = List.generate(20, (i) => 'Item ${i + 1}');

  Future<void> _refresh() async {
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      _items.insert(0, 'New Item ${DateTime.now().second}');
    });
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView.builder(
        itemCount: _items.length,
        itemBuilder: (context, index) {
          return ListTile(
            leading: CircleAvatar(child: Text('${index + 1}')),
            title: Text(_items[index]),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Tapped ${_items[index]}')),
              );
            },
          );
        },
      ),
    );
  }
}
```

### Navigation Between Screens

```dart
// Navigate to a new screen (push)
Navigator.of(context).push(
  MaterialPageRoute(builder: (context) => const DetailScreen(id: 42)),
);

// Navigate and wait for a result
final result = await Navigator.of(context).push<String>(
  MaterialPageRoute(builder: (context) => const PickerScreen()),
);
// result contains the value passed to Navigator.pop(context, value)

// Pop back with a result
Navigator.of(context).pop('selected_item');

// Replace the current route (no back button)
Navigator.of(context).pushReplacement(
  MaterialPageRoute(builder: (context) => const HomePage()),
);

// Pop all routes and push a new root
Navigator.of(context).pushAndRemoveUntil(
  MaterialPageRoute(builder: (context) => const LoginPage()),
  (route) => false,
);
```
