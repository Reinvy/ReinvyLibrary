---
title: "Membangun Aplikasi E-Commerce dengan Flutter"
description: "Tutorial berbasis proyek yang komprehensif untuk membangun aplikasi mobile e-commerce lengkap dengan Flutter, mencakup katalog produk, keranjang belanja, alur checkout, dan integrasi pembayaran."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi E-Commerce dengan Flutter

## Ringkasan

Dalam tutorial berbasis proyek ini, Anda akan membangun aplikasi mobile e-commerce yang lengkap menggunakan Flutter. Mulai dari pembuatan proyek, Anda akan mengimplementasikan katalog produk dengan filter kategori, keranjang belanja persisten, autentikasi pengguna, alur checkout multi-langkah, dan integrasi pembayaran Stripe. Pada akhirnya, Anda akan memiliki arsitektur aplikasi e-commerce yang siap produksi dan pemahaman mendalam tentang manajemen state, pola navigasi, dan integrasi API di Flutter.

## Target Audiens

- Pengembang mobile yang ingin membangun aplikasi belanja nyata.
- Pengembang Flutter dengan pengetahuan dasar yang mencari pengalaman belajar proyek komprehensif.
- Ekspektasi tingkat kemampuan pembaca: Menengah.

## Prasyarat

- Flutter SDK 3.16+ terinstal dan terkonfigurasi.
- Pengetahuan dasar tentang pemrograman Dart (async/await, kelas, generics).
- Keakraban dengan konsep REST API dan serialisasi JSON.
- Editor kode (VS Code atau Android Studio) dengan ekstensi Flutter.
- (Opsional) Akun uji coba Stripe untuk integrasi pembayaran.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuat proyek Flutter dengan arsitektur feature-first yang skalabel.
- Mengimplementasikan penelusuran produk dengan filter kategori dan pencarian.
- Membangun keranjang belanja persisten menggunakan manajemen state Riverpod.
- Mengintegrasikan autentikasi pengguna dengan autentikasi berbasis token API.
- Mendesain alur checkout multi-langkah dengan formulir alamat dan pembayaran.
- Memproses pembayaran secara aman menggunakan Stripe Elements dan Stripe API.
- Menangani state loading, error, dan kosong di seluruh aplikasi.

## Konteks dan Motivasi

Aplikasi e-commerce adalah salah satu kategori aplikasi mobile yang paling umum dan berdampak. Dari toko butik kecil hingga pasar besar, kemampuan untuk menjelajahi produk, mengelola keranjang, dan menyelesaikan pembelian di perangkat mobile sangat penting untuk perdagangan modern. Membangun aplikasi e-commerce di Flutter mengajarkan berbagai keterampilan yang berlaku di banyak domain: manajemen state kompleks, integrasi API, penanganan formulir, arsitektur navigasi, dan keamanan pembayaran. Tutorial ini memandu Anda membangun pengalaman e-commerce yang nyata dari awal hingga akhir, memberikan arsitektur yang dapat digunakan kembali untuk proyek produksi.

## Konten Inti

### Arsitektur Proyek

Kita akan mengatur proyek menggunakan arsitektur **feature-first** di mana setiap fitur utama adalah direktori mandiri. Pendekatan ini berskala baik dan menjaga basis kode tetap mudah dinavigasi seiring pertumbuhan aplikasi.

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

### Menyiapkan Dependensi

Tambahkan paket-paket berikut ke `pubspec.yaml` Anda:

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

### Katalog Produk dengan Kategori

Katalog produk adalah etalase aplikasi Anda. Kita akan membangun grid produk yang dapat dijelajahi dengan chip kategori untuk pemfilteran.

#### Model Produk

Definisikan model `Product` menggunakan `freezed` untuk kelas data immutabel dengan serialisasi JSON:

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

#### Repositori Produk

Buat repositori yang mengambil produk dari REST API. Menggunakan Dio untuk HTTP dengan interceptor untuk injeksi token autentikasi:

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

#### Model dan Provider Kategori

Kategori membantu pengguna mempersempit produk. Definisikan model sederhana dan provider yang memuatnya:

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

#### Provider Riverpod

Riverpod mengelola state daftar produk, kategori yang dipilih, dan kueri pencarian:

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

#### Layar Daftar Produk

Bangun UI dengan baris chip kategori horizontal dan grid produk vertikal:

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
        title: const Text('Toko'),
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

### Keranjang Belanja dengan Riverpod

Keranjang belanja tetap ada di seluruh navigasi dan menangani manajemen kuantitas, kalkulasi harga, dan validasi stok.

#### State Keranjang

Gunakan `StateNotifier` untuk state keranjang yang mutable:

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

#### Layar Keranjang

Tampilkan item keranjang dengan kontrol kuantitas dan tombol checkout:

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
      appBar: AppBar(title: const Text('Keranjang Belanja')),
      body: cartItems.isEmpty
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shopping_cart_outlined, size: 64),
                  SizedBox(height: 16),
                  Text('Keranjang Anda kosong'),
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

### Autentikasi Pengguna

Implementasikan autentikasi berbasis token dengan penyimpanan token aman.

#### Layanan Auth

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

#### Provider State Auth

Gunakan `AsyncNotifier` untuk melacak state autentikasi di seluruh aplikasi:

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

### Alur Checkout dan Integrasi Pembayaran

Proses checkout melibatkan tiga langkah: alamat pengiriman, review pesanan, dan pembayaran.

#### State Checkout

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

#### Payment Intent dari Backend

Buat payment intent di backend Anda untuk memproses pembayaran secara aman melalui Stripe:

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
      'amount': (amount * 100).toInt(), // Stripe menggunakan sen
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

#### Layar Pembayaran dengan Stripe

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
      appBar: AppBar(title: const Text('Pembayaran')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Jumlah Total',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            Text(
              'Rp ${checkout.totalAmount.toStringAsFixed(0)}',
              style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            StripePaymentButton(
              onPaymentComplete: (paymentMethod) async {
                try {
                  final repository = ref.read(checkoutRepositoryProvider);
                  final clientSecret = await repository.createPaymentIntent(
                    checkout.totalAmount,
                    'idr',
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
                    SnackBar(content: Text('Pembayaran gagal: $e')),
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

### Navigasi dengan GoRouter

Siapkan navigasi aplikasi dengan GoRouter, menggunakan redirect untuk rute yang dilindungi autentikasi:

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

### Penanganan Error dan State Loading

Aplikasi e-commerce yang lengkap harus menangani error jaringan, state kosong, dan kondisi loading dengan baik. Berikut pola yang dapat digunakan kembali:

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
                Text('Terjadi kesalahan'),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {},
                  child: const Text('Coba Lagi'),
                ),
              ],
            ),
          ),
      loading: () => loading ?? const Center(child: CircularProgressIndicator()),
    );
  }
}
```

## Contoh Kode

### Titik Masuk Aplikasi Lengkap

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

### Provider Dio dengan Interceptor Auth

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

### Widget Kartu Item Keranjang

```dart
// Contoh kartu item keranjang yang digunakan di layar keranjang
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
                    'Rp ${item.product.price.toStringAsFixed(0)}',
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

## Insight Penting

- **Arsitektur feature-first lebih skalabel daripada layer-first**: Mengelompokkan file berdasarkan fitur (auth, products, cart, checkout) memudahkan pencarian kode terkait dan menjaga proyek tetap mudah dinavigasi seiring pertumbuhannya. Hindari membuat folder generik seperti `models/` atau `screens/` di tingkat atas.
- **Keamanan tipe kompilasi Riverpod mencegah error state runtime**: Tidak seperti Provider atau BLoC, provider Riverpod aman tipe pada waktu kompilasi. Anotasi `@riverpod` menghasilkan kode yang mendeteksi ketidakcocokan sebelum aplikasi dijalankan, mengurangi waktu debugging.
- **Selalu buat payment intent di sisi server**: Jangan pernah membuat Stripe payment intent di klien. Client secret harus dihasilkan oleh backend Anda setelah memverifikasi total pesanan, mencegah serangan manipulasi harga.
- **Pembaruan UI optimistis meningkatkan persepsi performa**: Untuk operasi keranjang (tambah, hapus, update kuantitas), perbarui UI segera dan sinkronkan dengan server di latar belakang. Ini membuat aplikasi terasa instan bahkan di jaringan lambat.
- **Penyimpanan token aman adalah wajib**: Menyimpan token auth di `SharedPreferences` atau teks biasa adalah risiko keamanan. Selalu gunakan `flutter_secure_storage` yang mengenkripsi token di tingkat OS menggunakan Keychain (iOS) atau EncryptedSharedPreferences (Android).

## Langkah Berikutnya

- Jelajahi dokumentasi [Flutter Riverpod](https://riverpod.dev) untuk pola lanjutan seperti family provider dan autodispose.
- Tambahkan notifikasi push menggunakan Firebase Cloud Messaging untuk pembaruan status pesanan.
- Implementasikan ulasan dan rating produk dengan widget star-rating dan unggahan gambar.
- Pelajari strategi pengujian Flutter di [Panduan Flutter Clean Architecture](../guides/flutter-clean-architecture-guide.md) yang sudah ada.
- Ikuti [Silabus Flutter](../../mobile/flutter/syllabi/flutter-syllabus.md) untuk jalur pembelajaran terstruktur yang mencakup animasi, manajemen state, dan integrasi Firebase.

## Kesimpulan

Anda telah membangun aplikasi mobile e-commerce yang lengkap dengan Flutter, mengimplementasikan penelusuran produk, filter kategori, keranjang belanja persisten, autentikasi berbasis token, checkout multi-langkah, dan integrasi pembayaran Stripe. Arsitektur feature-first dan pola manajemen state Riverpod yang Anda terapkan memberikan fondasi yang kokoh untuk aplikasi e-commerce produksi. Yang lebih penting, keterampilan yang Anda praktikkan — manajemen state kompleks, penanganan pembayaran aman, arsitektur navigasi, dan integrasi API — dapat ditransfer langsung ke banyak kategori aplikasi lainnya. Lanjutkan dengan menambahkan fitur riwayat pesanan, notifikasi push, dan wishlist untuk melengkapi pengalaman berbelanja.
