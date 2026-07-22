---
title: "Building an E-Commerce App with Flutter"
description: "A comprehensive project-based tutorial on building a full-featured e-commerce mobile application with Flutter, covering product catalogs, shopping cart, checkout flow, and payment integration."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building an E-Commerce App with Flutter

## Summary

In this project-based tutorial, you will build a complete e-commerce mobile application using Flutter. Starting from project scaffolding, you will implement a product catalog with category filtering, a persistent shopping cart, user authentication, a multi-step checkout flow, and Stripe payment integration. By the end, you will have a production-ready e-commerce app architecture and a deep understanding of state management, navigation patterns, and API integration in Flutter.

## Target Audience

- Mobile developers looking to build real-world shopping applications.
- Flutter developers with basic knowledge seeking a comprehensive project-based learning experience.
- Expected developer level: Intermediate.

## Prerequisites

- Flutter SDK 3.16+ installed and configured.
- Basic knowledge of Dart programming (async/await, classes, generics).
- Familiarity with REST API concepts and JSON serialization.
- A code editor (VS Code or Android Studio) with Flutter extensions.
- (Optional) A Stripe test account for payment integration.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a Flutter project with a scalable feature-first architecture.
- Implement product browsing with category filtering and search.
- Build a persistent shopping cart using Riverpod state management.
- Integrate user authentication with token-based API authentication.
- Design a multi-step checkout flow with address and payment forms.
- Process payments securely using Stripe Elements and the Stripe API.
- Handle loading, error, and empty states across the entire application.

## Context and Motivation

E-commerce applications are among the most common and impactful mobile app categories. From small boutique stores to large marketplaces, the ability to browse products, manage a cart, and complete purchases on mobile devices is essential for modern commerce. Building an e-commerce app in Flutter teaches you a broad set of skills applicable to many domains: complex state management, API integration, form handling, navigation architecture, and payment security. This tutorial walks through building a real e-commerce experience end-to-end, giving you a reusable architecture you can adapt for production projects.

## Core Content

### Project Architecture

We will organize the project using a **feature-first** architecture where each major feature is a self-contained directory. This approach scales well and keeps the codebase navigable as the app grows.

```text
lib/
├── main.dart
├── app.dart
├── core/
│   ├── constants/
│   ├── theme/
│   ├── network/
│   ├── router/
│   └── utils/
└── features/
    ├── auth/
    │   ├── models/
    │   ├── providers/
    │   ├── repositories/
    │   └── screens/
    ├── products/
    │   ├── models/
    │   ├── providers/
    │   ├── repositories/
    │   └── screens/
    ├── cart/
    │   ├── models/
    │   ├── providers/
    │   └── screens/
    └── checkout/
        ├── models/
        ├── providers/
        ├── repositories/
        └── screens/
```

### Setting Up Dependencies

Add the following packages to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5
  dio: ^5.4.0
  go_router: ^14.0.0
  flutter_secure_storage: ^9.0.0
  json_annotation: ^4.8.1
  freezed_annotation: ^2.4.1
  stripe_payment: ^1.1.4
  cached_network_image: ^3.3.0
  shimmer: ^3.0.0

dev_dependencies:
  build_runner: ^2.4.8
  json_serializable: ^6.7.1
  freezed: ^2.5.2
  riverpod_generator: ^2.4.0
  flutter_test:
    sdk: flutter
  mocktail: ^1.0.3
```

### Product Catalog with Categories

The product catalog is the storefront of your app. We will build a browsable product grid with category chips for filtering.

#### Product Model

Define a `Product` model using `freezed` for immutable data classes with JSON serialization:

```dart
// lib/features/products/models/product.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'product.freezed.dart';
part 'product.g.dart';

@freezed
class Product with _$Product {
  const factory Product({
    required String id,
    required String name,
    required String description,
    required double price,
    required String currency,
    required List<String> imageUrls,
    required String categoryId,
    required String categoryName,
    @Default(0.0) double rating,
    @Default(0) int reviewCount,
    @Default(true) bool inStock,
  }) = _Product;

  factory Product.fromJson(Map<String, dynamic> json) =>
      _$ProductFromJson(json);
}
```

#### Product Repository

Create a repository that fetches products from a REST API. Using Dio for HTTP with interceptors for auth token injection:

```dart
// lib/features/products/repositories/product_repository.dart
import 'package:dio/dio.dart';
import '../models/product.dart';

class ProductRepository {
  final Dio _dio;

  ProductRepository(this._dio);

  Future<List<Product>> fetchProducts({String? categoryId}) async {
    final queryParams = <String, dynamic>{};
    if (categoryId != null && categoryId.isNotEmpty) {
      queryParams['category_id'] = categoryId;
    }

    final response = await _dio.get(
      '/products',
      queryParameters: queryParams,
    );

    final List<dynamic> data = response.data['data'];
    return data.map((json) => Product.fromJson(json)).toList();
  }

  Future<List<Product>> searchProducts(String query) async {
    final response = await _dio.get(
      '/products/search',
      queryParameters: {'q': query},
    );

    final List<dynamic> data = response.data['data'];
    return data.map((json) => Product.fromJson(json)).toList();
  }

  Future<Product> fetchProductById(String id) async {
    final response = await _dio.get('/products/$id');
    return Product.fromJson(response.data['data']);
  }
}
```

#### Category Model and Provider

Categories help users narrow down products. Define a simple model and a provider that loads them:

```dart
// lib/features/products/models/category.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'category.freezed.dart';
part 'category.g.dart';

@freezed
class Category with _$Category {
  const factory Category({
    required String id,
    required String name,
    required String iconUrl,
  }) = _Category;

  factory Category.fromJson(Map<String, dynamic> json) =>
      _$CategoryFromJson(json);
}
```

#### Riverpod Providers

Riverpod manages the state of our product list, selected category, and search query:

```dart
// lib/features/products/providers/product_providers.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/product.dart';
import '../models/category.dart';
import '../repositories/product_repository.dart';
import '../../core/network/dio_provider.dart';

part 'product_providers.g.dart';

@riverpod
class SelectedCategory extends _$SelectedCategory {
  @override
  String? build() => null;

  void select(String? categoryId) {
    state = categoryId;
  }
}

@riverpod
Future<List<Product>> products(ProductsRef ref) async {
  final categoryId = ref.watch(selectedCategoryProvider);
  final repository = ref.watch(productRepositoryProvider);
  return repository.fetchProducts(categoryId: categoryId);
}

@riverpod
Future<List<Category>> categories(CategoriesRef ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/categories');
  final List<dynamic> data = response.data['data'];
  return data.map((json) => Category.fromJson(json)).toList();
}
```

#### Product List Screen

Build the UI with a horizontal category chip row and a vertical product grid:

```dart
// lib/features/products/screens/product_list_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/product_providers.dart';

class ProductListScreen extends ConsumerWidget {
  const ProductListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(productsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Shop'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => _showSearch(context, ref),
          ),
          IconButton(
            icon: const Icon(Icons.shopping_cart),
            onPressed: () => const CartRoute().push(context),
          ),
        ],
      ),
      body: Column(
        children: [
          categoriesAsync.when(
            data: (categories) => CategoryChips(
              categories: categories,
              selectedId: ref.watch(selectedCategoryProvider),
              onSelected: (id) =>
                  ref.read(selectedCategoryProvider.notifier).select(id),
            ),
            loading: () => const CategoryChipsShimmer(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          Expanded(
            child: productsAsync.when(
              data: (products) => ProductGrid(products: products),
              loading: () => const ProductGridShimmer(),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
    );
  }
}
```

### Shopping Cart with Riverpod

The shopping cart persists across navigation and handles quantity management, price calculation, and stock validation.

#### Cart State

Use a `StateNotifier` for the mutable cart state:

```dart
// lib/features/cart/providers/cart_provider.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../products/models/product.dart';

part 'cart_provider.g.dart';

class CartItem {
  final Product product;
  int quantity;

  CartItem({required this.product, this.quantity = 1});

  double get totalPrice => product.price * quantity;
}

@riverpod
class Cart extends _$Cart {
  @override
  List<CartItem> build() => [];

  void addItem(Product product, {int quantity = 1}) {
    final existingIndex = state.indexWhere(
      (item) => item.product.id == product.id,
    );

    if (existingIndex >= 0) {
      state = [
        for (int i = 0; i < state.length; i++)
          if (i == existingIndex)
            CartItem(
              product: product,
              quantity: state[i].quantity + quantity,
            )
          else
            state[i],
      ];
    } else {
      state = [...state, CartItem(product: product, quantity: quantity)];
    }
  }

  void removeItem(String productId) {
    state = state.where((item) => item.product.id != productId).toList();
  }

  void updateQuantity(String productId, int quantity) {
    state = [
      for (final item in state)
        if (item.product.id == productId)
          CartItem(product: item.product, quantity: quantity.clamp(1, 99))
        else
          item,
    ];
  }

  void clear() {
    state = [];
  }

  int get itemCount => state.fold(0, (sum, item) => sum + item.quantity);
  double get subtotal =>
      state.fold(0.0, (sum, item) => sum + item.totalPrice);
}
```

#### Cart Screen

Display cart items with quantity controls and a checkout button:

```dart
// lib/features/cart/screens/cart_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/cart_provider.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartItems = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Shopping Cart')),
      body: cartItems.isEmpty
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shopping_cart_outlined, size: 64),
                  SizedBox(height: 16),
                  Text('Your cart is empty'),
                ],
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    itemCount: cartItems.length,
                    padding: const EdgeInsets.all(16),
                    itemBuilder: (context, index) {
                      final item = cartItems[index];
                      return CartItemCard(
                        item: item,
                        onIncrement: () => cartNotifier.updateQuantity(
                            item.product.id, item.quantity + 1),
                        onDecrement: () => cartNotifier.updateQuantity(
                            item.product.id, item.quantity - 1),
                        onRemove: () =>
                            cartNotifier.removeItem(item.product.id),
                      );
                    },
                  ),
                ),
                CartSummary(
                  itemCount: cartNotifier.itemCount,
                  subtotal: cartNotifier.subtotal,
                  onCheckout: () => const CheckoutRoute().push(context),
                ),
              ],
            ),
    );
  }
}
```

### User Authentication

Implement token-based authentication with secure token storage.

#### Auth Service

```dart
// lib/features/auth/repositories/auth_repository.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthRepository {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  AuthRepository(this._dio, this._storage);

  Future<String> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });

    final token = response.data['token'] as String;
    await _storage.write(key: 'auth_token', value: token);
    _dio.options.headers['Authorization'] = 'Bearer $token';
    return token;
  }

  Future<void> register(String name, String email, String password) async {
    await _dio.post('/auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
    });
  }

  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
    _dio.options.headers.remove('Authorization');
  }

  Future<String?> getSavedToken() async {
    return _storage.read(key: 'auth_token');
  }
}
```

#### Auth State Provider

Use an `AsyncNotifier` to track the authentication state across the app:

```dart
// lib/features/auth/providers/auth_provider.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../repositories/auth_repository.dart';

part 'auth_provider.g.dart';

@riverpod
class Auth extends _$Auth {
  @override
  Future<AuthState> build() async {
    final repository = ref.watch(authRepositoryProvider);
    final token = await repository.getSavedToken();
    if (token != null) {
      return AuthState.authenticated(token);
    }
    return const AuthState.unauthenticated();
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repository = ref.read(authRepositoryProvider);
      final token = await repository.login(email, password);
      return AuthState.authenticated(token);
    });
  }

  Future<void> register(String name, String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repository = ref.read(authRepositoryProvider);
      await repository.register(name, email, password);
      return const AuthState.unauthenticated();
    });
  }

  Future<void> logout() async {
    final repository = ref.read(authRepositoryProvider);
    await repository.logout();
    state = const AsyncData(AuthState.unauthenticated());
  }
}

sealed class AuthState {
  const AuthState();
}

class AuthStateAuthenticated extends AuthState {
  final String token;
  const AuthStateAuthenticated(this.token);
}

class AuthStateUnauthenticated extends AuthState {
  const AuthStateUnauthenticated();
}
```

### Checkout Flow and Payment Integration

The checkout process involves three steps: shipping address, order review, and payment.

#### Checkout State

```dart
// lib/features/checkout/models/checkout_state.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'checkout_state.freezed.dart';

@freezed
class CheckoutState with _$CheckoutState {
  const factory CheckoutState({
    @Default(0) int currentStep,
    ShippingAddress? shippingAddress,
    @Default(false) bool isProcessing,
    String? errorMessage,
    String? orderId,
  }) = _CheckoutState;
}

@freezed
class ShippingAddress with _$ShippingAddress {
  const factory ShippingAddress({
    required String fullName,
    required String phone,
    required String street,
    required String city,
    required String state,
    required String zipCode,
    required String country,
  }) = _ShippingAddress;
}
```

#### Payment Intent from Backend

Create a payment intent on your backend to securely process payments through Stripe:

```dart
// lib/features/checkout/repositories/checkout_repository.dart
import 'package:dio/dio.dart';
import '../../../core/network/dio_provider.dart';
import '../models/checkout_state.dart';

class CheckoutRepository {
  final Dio _dio;

  CheckoutRepository(this._dio);

  Future<String> createPaymentIntent(double amount, String currency) async {
    final response = await _dio.post('/payments/create-intent', data: {
      'amount': (amount * 100).toInt(), // Stripe uses cents
      'currency': currency,
    });
    return response.data['clientSecret'] as String;
  }

  Future<String> placeOrder({
    required List<OrderItem> items,
    required ShippingAddress address,
    required double total,
  }) async {
    final response = await _dio.post('/orders', data: {
      'items': items.map((i) => i.toJson()).toList(),
      'shipping_address': address.toJson(),
      'total': total,
    });
    return response.data['orderId'] as String;
  }
}

class OrderItem {
  final String productId;
  final String name;
  final int quantity;
  final double price;

  const OrderItem({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.price,
  });

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'name': name,
        'quantity': quantity,
        'price': price,
      };
}
```

#### Payment Screen with Stripe

```dart
// lib/features/checkout/screens/payment_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:stripe_payment/stripe_payment.dart';
import '../providers/checkout_provider.dart';
import '../repositories/checkout_repository.dart';

class PaymentScreen extends ConsumerWidget {
  const PaymentScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final checkout = ref.watch(checkoutProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Total Amount',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            Text(
              '\$${checkout.totalAmount.toStringAsFixed(2)}',
              style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            StripePaymentButton(
              onPaymentComplete: (paymentMethod) async {
                try {
                  final repository = ref.read(checkoutRepositoryProvider);
                  final clientSecret = await repository.createPaymentIntent(
                    checkout.totalAmount,
                    'usd',
                  );

                  await StripePayment.confirmPaymentIntent(
                    PaymentIntent(
                      clientSecret: clientSecret,
                      paymentMethodId: paymentMethod.id,
                    ),
                  );

                  await ref.read(checkoutProvider.notifier).completeOrder();
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Payment failed: $e')),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
```

### Navigation with GoRouter

Set up the app navigation with GoRouter, using redirects for auth-protected routes:

```dart
// lib/core/router/app_router.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/products/screens/product_list_screen.dart';
import '../../features/cart/screens/cart_screen.dart';
import '../../features/checkout/screens/checkout_screen.dart';
import '../../features/checkout/screens/payment_screen.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/products',
    redirect: (context, state) {
      final isAuthenticated = authState.valueOrNull is AuthStateAuthenticated;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      if (!isAuthenticated && !isAuthRoute) {
        return '/auth/login';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/products',
        name: 'products',
        builder: (_, __) => const ProductListScreen(),
      ),
      GoRoute(
        path: '/products/:id',
        name: 'product-detail',
        builder: (_, state) => ProductDetailScreen(
          productId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/cart',
        name: 'cart',
        builder: (_, __) => const CartScreen(),
      ),
      GoRoute(
        path: '/checkout',
        name: 'checkout',
        builder: (_, __) => const CheckoutScreen(),
        routes: [
          GoRoute(
            path: 'payment',
            name: 'checkout-payment',
            builder: (_, __) => const PaymentScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/auth/login',
        name: 'login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/auth/register',
        name: 'register',
        builder: (_, __) => const RegisterScreen(),
      ),
    ],
  );
});
```

### Error Handling and Loading States

A complete e-commerce app must gracefully handle network errors, empty states, and loading conditions. Here is a reusable pattern:

```dart
// lib/core/widgets/async_value_widget.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AsyncValueWidget<T> extends StatelessWidget {
  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final Widget? loading;
  final Widget Function(Object error, StackTrace? stack)? error;

  const AsyncValueWidget({
    super.key,
    required this.value,
    required this.data,
    this.loading,
    this.error,
  });

  @override
  Widget build(BuildContext context) {
    return value.when(
      data: data,
      error: (e, st) =>
          error?.call(e, st) ??
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text('Something went wrong'),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {},
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
      loading: () => loading ?? const Center(child: CircularProgressIndicator()),
    );
  }
}
```

## Code Examples

### Complete App Entry Point

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: ECommerceApp()));
}
```

### Dio Provider with Auth Interceptor

```dart
// lib/core/network/dio_provider.dart
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: 'https://api.example.com',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.add(AuthInterceptor(ref));
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
  ));

  return dio;
});

class AuthInterceptor extends Interceptor {
  final Ref _ref;

  AuthInterceptor(this._ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final storage = FlutterSecureStorage();
    final token = await storage.read(key: 'auth_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}
```

### Cart Item Card Widget

```dart
// Example cart item card used in the cart screen
class CartItemCard extends StatelessWidget {
  final CartItem item;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final VoidCallback onRemove;

  const CartItemCard({
    super.key,
    required this.item,
    required this.onIncrement,
    required this.onDecrement,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: CachedNetworkImage(
                imageUrl: item.product.imageUrls.first,
                width: 80,
                height: 80,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.product.name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\$${item.product.price.toStringAsFixed(2)}',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline),
                        onPressed: item.quantity > 1 ? onDecrement : onRemove,
                      ),
                      Text('${item.quantity}'),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline),
                        onPressed: onIncrement,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Key Insights

- **Feature-first architecture scales better than layer-first**: Grouping files by feature (auth, products, cart, checkout) makes it easy to locate related code and keeps the project navigable as it grows. Avoid creating generic folders like `models/` or `screens/` at the top level.
- **Riverpod's compile-time safety prevents runtime state errors**: Unlike Provider or BLoC, Riverpod providers are type-safe at compile time. The `@riverpod` annotation generates code that catches mismatches before the app runs, reducing debugging time.
- **Always create payment intents server-side**: Never construct Stripe payment intents on the client. The client secret must be generated by your backend after verifying the order total, preventing price manipulation attacks.
- **Optimistic UI updates improve perceived performance**: For cart operations (add, remove, update quantity), update the UI immediately and reconcile with the server in the background. This makes the app feel instant even on slow networks.
- **Secure token storage is mandatory**: Storing auth tokens in `SharedPreferences` or plain text is a security risk. Always use `flutter_secure_storage` which encrypts tokens at the OS level using Keychain (iOS) or EncryptedSharedPreferences (Android).

## Next Steps

- Explore [Flutter Riverpod](https://riverpod.dev) documentation for advanced patterns like family providers and autodispose.
- Add push notifications using Firebase Cloud Messaging for order status updates.
- Implement product reviews and ratings with a star-rating widget and image upload.
- Learn about Flutter testing strategies in the existing [Flutter Clean Architecture Guide](../guides/flutter-clean-architecture-guide.md).
- Study the [Flutter Syllabus](../../mobile/flutter/syllabi/flutter-syllabus.md) for a structured learning path covering animations, state management, and Firebase integration.

## Conclusion

You have built a complete e-commerce mobile application with Flutter, implementing product browsing, category filtering, a persistent shopping cart, token-based authentication, multi-step checkout, and Stripe payment integration. The feature-first architecture and Riverpod state management patterns you applied provide a solid foundation for production e-commerce apps. More importantly, the skills you practiced — complex state management, secure payment handling, navigation architecture, and API integration — transfer directly to many other app categories. Continue building by adding order history, push notifications, and wishlist features to round out the shopping experience.
