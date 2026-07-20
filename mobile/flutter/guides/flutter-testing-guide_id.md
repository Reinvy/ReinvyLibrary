---
title: "Panduan Pengujian Flutter"
description: "Panduan komprehensif untuk menguji aplikasi Flutter di setiap level — pengujian unit, pengujian widget, pengujian integrasi, golden tests, dan praktik terbaik untuk membangun aplikasi yang andal dan bebas bug."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Pengujian Flutter

## Pendahuluan

Flutter menyediakan framework pengujian yang kuat dan first-class yang memungkinkan pengembang menulis tes di berbagai tingkat granularitas — dari unit test cepat yang memvalidasi fungsi individual hingga integration test end-to-end yang menjalankan seluruh aplikasi. Strategi pengujian yang terstruktur dengan baik menangkap regresi sejak dini, mendokumentasikan perilaku yang diharapkan, dan memberi Anda kepercayaan diri untuk melakukan refaktor dan merilis secara sering.

Panduan ini mencakup seluruh lanskap pengujian Flutter: pengujian unit dengan `flutter_test`, pengujian widget untuk komponen UI, pengujian integrasi untuk alur aplikasi penuh, strategi mocking dengan `mockito` dan `mocktail`, golden file testing untuk regresi visual, pengujian solusi state management (Provider, Riverpod, Bloc), pola organisasi pengujian, dan integrasi CI/CD. Pada akhirnya, Anda akan memiliki alur kerja pengujian yang dapat diulang dan berskala dari aplikasi satu fitur hingga codebase multi-tim yang besar.

## Praktik Terbaik

### 1. Ikuti Testing Trophy, Bukan Piramida

Piramida pengujian tradisional (banyak unit test, sedikit integration test) adalah awal yang baik, tetapi proyek Flutter mendapat manfaat dari pendekatan "testing trophy": investasikan banyak pada widget test dan integration test yang melatih lapisan UI, sambil mempertahankan fondasi unit test yang solid. Widget test di Flutter cukup cepat untuk dijalankan di setiap commit dan menangkap bug UI yang paling umum.

- **Unit test (40%)**: Uji logika Dart murni — model, validator, fungsi utilitas, antarmuka repositori, use case.
- **Widget test (40%)**: Uji widget dan layar individual — rendering, perubahan state, interaksi pengguna, state error.
- **Integration test (15%)**: Uji alur pengguna penuh — login, checkout, navigasi, persistensi data.
- **Eksplorasi manual (5%)**: Polish visual, edge-case UX, perilaku spesifik perangkat.

### 2. Strukturkan Test untuk Mencerminkan Pohon Sumber

Cerminkan struktur direktori `lib/` Anda di dalam `test/` sehingga pengembang dapat menemukan tes untuk file apa pun tanpa menebak-nebak:

```text
test/
├── unit/
│   ├── models/
│   ├── services/
│   └── helpers/
├── widget/
│   ├── features/
│   │   ├── login/
│   │   └── cart/
│   └── shared/
│       ├── buttons/
│       └── inputs/
├── integration/
│   ├── auth_flow_test.dart
│   └── checkout_flow_test.dart
└── helpers/
    ├── test_data.dart
    └── widget_test_utils.dart
```

### 3. Gunakan Pola Arrange-Act-Assert di Mana Saja

Setiap pengujian — terlepas dari levelnya — harus mengikuti pola Arrange-Act-Assert (AAA) yang dipisahkan oleh baris kosong:

```dart
// Arrange
final mockRepository = MockAuthRepository();
when(mockRepository.login(any, any)).thenAnswer(
  (_) async => User(id: '1', name: 'Test'),
);
final sut = AuthService(mockRepository);

// Act
final user = await sut.login('test@example.com', 'password123');

// Assert
expect(user.name, 'Test');
verify(mockRepository.login('test@example.com', 'password123')).called(1);
```

### 4. Mock Dependensi Eksternal, Bukan Internal

Gunakan `mockito` atau `mocktail` untuk dependensi yang melintasi batas aplikasi: HTTP client, konektor database, platform channel, dan SDK pihak ketiga. Jangan mock objek value Dart internal, collection, atau kelas utilitas sederhana — gunakan instance asli. Over-mocking membuat pengujian rapuh dan menyembunyikan bug nyata.

- **Mock**: `http.Client`, `FirebaseAuth`, `SharedPreferences`, `platform.MethodChannel`
- **Jangan mock**: `UserModel`, `List<int>`, `String extensions`, `DateFormatter`

### 5. Utamakan Verifikasi Perilaku daripada Verifikasi State

Alih-alih memastikan bahwa metode tertentu dipanggil pada dependensi (verifikasi state), pastikan bahwa sistem yang diuji menghasilkan output atau efek yang diharapkan (verifikasi perilaku). Verifikasi state rapuh — mengganti nama metode akan merusak setiap tes yang memverifikasi nama lama. Verifikasi perilaku bertahan dari refactoring.

```dart
// Lebih baik (perilaku):
expect(result.isSuccess, true);
expect(result.value.name, 'Alice');

// Hindari ini (state):
verify(mockService.fetchUser('alice@example.com')).called(1);
```

### 6. Simpan Factory Data Test Terpusat

Definisikan metode factory atau ekstensi `with` untuk model data Anda di file `helpers/test_data.dart` bersama. Ini menghindari pengulangan panggilan konstruktor yang sama di puluhan tes dan membuat perubahan data tes menjadi satu suntingan:

```dart
extension UserTestFactory on User {
  static User create({String id = '1', String name = 'Alice', String email = 'alice@example.com'}) {
    return User(id: id, name: name, email: email);
  }
}
```

### 7. Tag dan Atur Pengujian Berdasarkan Kecepatan

Gunakan anotasi `@Tags` Dart atau konvensi penamaan file tes untuk mengkategorikan tes berdasarkan kecepatan. Jalankan tes cepat di setiap penyimpanan file selama pengembangan dan cadangkan suite lengkap untuk pre-commit dan CI:

```dart
@Tags(['slow'])
import 'package:flutter_test/flutter_test.dart';
```

- Cepat (< 100ms): unit test murni, widget test sederhana tanpa animasi
- Sedang (100ms–5s): widget test dengan animasi, golden test
- Lambat (> 5s): integration test, golden test yang bergantung pada gambar/jaringan

## Langkah Implementasi

### Langkah 1: Siapkan Lingkungan Pengujian

Tambahkan dependensi yang diperlukan ke `pubspec.yaml` proyek Anda:

```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
  mockito: ^5.4.4
  build_runner: ^2.4.8
  mocktail: ^1.0.1
  golden_toolkit: ^0.15.0
```

Jalankan `flutter pub get` dan buat struktur direktori pengujian:

```bash
mkdir -p test/unit test/widget test/integration test/helpers
```

Untuk `mockito`, hasilkan kelas mock dengan menjalankan:

```bash
dart run build_runner build
```

### Langkah 2: Tulis Unit Test untuk Model dan Service

Unit test memvalidasi logika Dart murni tanpa ketergantungan pada framework Flutter. Gunakan paket `flutter_test` bahkan untuk unit test non-widget — ia menyediakan matcher yang berguna dan `TestAsyncUtils`.

Buat `test/unit/models/user_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/models/user.dart';

void main() {
  group('User.fromJson', () {
    test('mengurai JSON yang valid dengan benar', () {
      final json = {
        'id': '1',
        'name': 'Alice',
        'email': 'alice@example.com',
      };

      final user = User.fromJson(json);

      expect(user.id, '1');
      expect(user.name, 'Alice');
      expect(user.email, 'alice@example.com');
    });

    test('melempar FormatException ketika field yang diperlukan hilang', () {
      expect(() => User.fromJson({}), throwsFormatException);
    });

    test('melempar FormatException pada nilai id null', () {
      expect(
        () => User.fromJson({'id': null, 'name': 'Alice'}),
        throwsFormatException,
      );
    });
  });

  group('User.toJson', () {
    test('menserialisasi ke map yang benar', () {
      final user = User(id: '1', name: 'Alice', email: 'alice@example.com');

      final json = user.toJson();

      expect(json, {
        'id': '1',
        'name': 'Alice',
        'email': 'alice@example.com',
      });
    });
  });
}
```

Buat `test/unit/services/auth_service_test.dart` menggunakan mockito:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:my_app/models/user.dart';
import 'package:my_app/services/auth_service.dart';
import 'package:my_app/repositories/auth_repository.dart';

// Kelas mock yang dihasilkan dari build_runner
class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late MockAuthRepository mockRepository;
  late AuthService sut;

  setUp(() {
    mockRepository = MockAuthRepository();
    sut = AuthService(mockRepository);
  });

  group('login', () {
    test('mengembalikan User pada login berhasil', () async {
      when(mockRepository.login(any, any)).thenAnswer(
        (_) async => User(id: '1', name: 'Alice', email: 'alice@example.com'),
      );

      final result = await sut.login('alice@example.com', 'password123');

      expect(result, isA<User>());
      expect(result.name, 'Alice');
    });

    test('melempar AuthException pada kredensial tidak valid', () async {
      when(mockRepository.login(any, any)).thenThrow(
        AuthException('Email atau password salah'),
      );

      expect(
        () => sut.login('bad@example.com', 'wrong'),
        throwsA(isA<AuthException>()),
      );
    });

    test('memanggil repositori dengan kredensial yang benar', () async {
      await sut.login('alice@example.com', 'password123');

      verify(
        mockRepository.login('alice@example.com', 'password123'),
      ).called(1);
    });
  });

  group('logout', () {
    test('memanggil repositori logout', () async {
      when(mockRepository.logout()).thenAnswer((_) async {});

      await sut.logout();

      verify(mockRepository.logout()).called(1);
    });
  });
}
```

### Langkah 3: Tulis Widget Test untuk Komponen UI

Widget test memverifikasi bahwa widget merender dengan benar, merespons interaksi pengguna, dan menampilkan state yang tepat (loading, error, empty, data). Paket `flutter_test` menyediakan `WidgetTester`, `pumpWidget`, dan seperangkat utilitas `Finder` yang kaya.

Buat `test/widget/features/login/login_screen_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:mockito/mockito.dart';
import 'package:provider/provider.dart';
import 'package:my_app/features/login/login_screen.dart';
import 'package:my_app/providers/auth_provider.dart';

class MockAuthProvider extends Mock implements AuthProvider {}

Widget createTestWidget(MockAuthProvider mockProvider) {
  return ChangeNotifierProvider<AuthProvider>.value(
    value: mockProvider,
    child: const MaterialApp(
      home: LoginScreen(),
    ),
  );
}

void main() {
  late MockAuthProvider mockProvider;

  setUp(() {
    mockProvider = MockAuthProvider();
    when(mockProvider.isLoading).thenReturn(false);
    when(mockProvider.errorMessage).thenReturn(null);
  });

  group('Rendering LoginScreen', () {
    testWidgets('menampilkan field email dan password', (tester) async {
      await tester.pumpWidget(createTestWidget(mockProvider));

      expect(find.byType(TextField), findsNWidgets(2));
      expect(find.byType(ElevatedButton), findsOneWidget);
      expect(find.text('Login'), findsOneWidget);
    });

    testWidgets('menampilkan pesan error ketika login gagal', (tester) async {
      when(mockProvider.errorMessage).thenReturn('Kredensial tidak valid');

      await tester.pumpWidget(createTestWidget(mockProvider));

      expect(find.text('Kredensial tidak valid'), findsOneWidget);
    });

    testWidgets('menampilkan indikator loading selama login', (tester) async {
      when(mockProvider.isLoading).thenReturn(true);

      await tester.pumpWidget(createTestWidget(mockProvider));

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byType(ElevatedButton), findsNothing);
    });
  });

  group('Interaksi LoginScreen', () {
    testWidgets('memanggil login dengan email dan password', (tester) async {
      when(mockProvider.login(any, any)).thenAnswer((_) async {});

      await tester.pumpWidget(createTestWidget(mockProvider));

      // Isi field email
      await tester.enterText(find.byType(TextField).first, 'alice@example.com');
      // Isi field password
      await tester.enterText(find.byType(TextField).last, 'password123');

      // Tekan tombol login
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();

      verify(mockProvider.login('alice@example.com', 'password123')).called(1);
    });

    testWidgets('menonaktifkan tombol ketika field kosong', (tester) async {
      await tester.pumpWidget(createTestWidget(mockProvider));

      final loginButton = tester.widget<ElevatedButton>(
        find.byType(ElevatedButton),
      );

      expect(loginButton.onPressed, isNull);
    });
  });
}
```

### Langkah 4: Tulis Integration Test untuk Alur Aplikasi Penuh

Integration test berjalan di perangkat nyata atau emulator dan melatih seluruh stack aplikasi — UI, service, database, dan jaringan. Gunakan paket `integration_test` dari SDK Flutter.

Buat `test/integration/auth_flow_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Alur autentikasi', () {
    testWidgets('siklus login dan logout lengkap', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Navigasi ke login dari layar selamat datang
      await tester.tap(find.text('Mulai'));
      await tester.pumpAndSettle();

      // Masukkan kredensial
      await tester.enterText(
        find.byKey(const Key('emailField')),
        'user@example.com',
      );
      await tester.enterText(
        find.byKey(const Key('passwordField')),
        'TestPass123!',
      );

      // Kirim login
      await tester.tap(find.byKey(const Key('loginButton')));
      await tester.pumpAndSettle(const Duration(seconds: 5));

      // Verifikasi kita berada di dashboard
      expect(find.text('Dashboard'), findsOneWidget);
      expect(find.text('Selamat Datang, User!'), findsOneWidget);

      // Logout
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();

      // Verifikasi kita kembali ke layar login
      expect(find.text('Login'), findsOneWidget);
    });
  });
}
```

Jalankan integration test di perangkat yang terhubung:

```bash
flutter test integration_test/auth_flow_test.dart
```

### Langkah 5: Implementasikan Golden Test untuk Regresi Visual

Golden test menangkap screenshot widget yang dirender dan membandingkannya dengan gambar referensi pada proses berikutnya. Setiap perubahan visual — disengaja atau tidak — akan muncul sebagai kegagalan pengujian.

Gunakan paket `golden_toolkit` untuk pengujian multi-surface golden:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';

void main() {
  testGoldens('ProductCard merender dengan benar', (tester) async {
    await tester.pumpWidgetBuilder(
      const ProductCard(
        title: 'Produk Test',
        price: 29999,
        imageUrl: 'https://example.com/product.png',
      ),
      surfaceSize: const Size(200, 300),
    );

    await screenMatchesGolden(tester, 'product_card_default');
  });

  testGoldens('ProductCard dengan panjang teks berbeda', (tester) async {
    await tester.pumpWidgetBuilder(
      const ProductCard(
        title: 'Nama produk yang sangat panjang dan mungkin meluap dari kontainer',
        price: 999999,
        imageUrl: 'https://example.com/large.png',
      ),
      surfaceSize: const Size(200, 300),
    );

    await screenMatchesGolden(tester, 'product_card_long_text');
  });
}
```

Perbarui gambar referensi golden ketika perubahan visual yang disengaja terjadi:

```bash
flutter test --update-goldens
```

Praktik terbaik untuk golden test:
- Uji pada ukuran permukaan tetap untuk menghindari perbedaan spesifik platform
- Gunakan `deviceBuilder` dari `golden_toolkit` untuk menguji di berbagai ukuran layar dalam satu proses
- Eksklusikan platform channel yang menghasilkan output non-deterministik (mis., `Platform.isIOS`)
- Simpan file golden di `test/goldens/` dengan nama yang deskriptif
- Commit gambar referensi ke version control untuk tinjauan tim

### Langkah 6: Uji State Management — Provider, Riverpod, dan Bloc

Setiap solusi state management memiliki pola pengujiannya sendiri. Di bawah ini adalah pendekatan yang direkomendasikan untuk tiga state manager Flutter yang paling populer.

#### Menguji Provider

Bungkus widget Anda dalam `ChangeNotifierProvider` dengan nilai mock notifier:

```dart
testWidgets('CounterProvider menambah dengan benar', (tester) async {
  final counter = CounterProvider();

  await tester.pumpWidget(
    ChangeNotifierProvider<CounterProvider>.value(
      value: counter,
      child: const MaterialApp(home: CounterScreen()),
    ),
  );

  expect(find.text('0'), findsOneWidget);

  await tester.tap(find.byType(FloatingActionButton));
  await tester.pump();

  expect(find.text('1'), findsOneWidget);
  expect(counter.count, 1);
});
```

#### Menguji Riverpod

Gunakan `ProviderContainer` untuk menimpa provider dengan implementasi mock:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('UserNotifierProvider mengambil user dengan benar', () async {
    final mockRepository = MockUserRepository();
    when(mockRepository.fetchUser('1')).thenAnswer(
      (_) async => User(id: '1', name: 'Alice'),
    );

    final container = ProviderContainer(
      overrides: [
        userRepositoryProvider.overrideWithValue(mockRepository),
      ],
    );

    final userNotifier = container.read(userProvider.notifier);
    await userNotifier.fetchUser('1');

    expect(container.read(userProvider).value?.name, 'Alice');
    container.dispose();
  });

  testWidgets('UserScreen menampilkan data user dengan Riverpod', (tester) async {
    final mockRepository = MockUserRepository();
    when(mockRepository.fetchUser(any)).thenAnswer(
      (_) async => User(id: '1', name: 'Alice'),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          userRepositoryProvider.overrideWithValue(mockRepository),
        ],
        child: const MaterialApp(home: UserScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Alice'), findsOneWidget);
  });
}
```

#### Menguji Bloc

Kirim state melalui Bloc dan assert pada output UI:

```dart
void main() {
  group('LoginBloc', () {
    late LoginBloc sut;
    late MockAuthRepository mockRepository;

    setUp(() {
      mockRepository = MockAuthRepository();
      sut = LoginBloc(authRepository: mockRepository);
    });

    tearDown(() {
      sut.close();
    });

    test('state awal adalah LoginInitial', () {
      expect(sut.state, isA<LoginInitial>());
    });

    blocTest<LoginBloc, LoginState>(
      'menghasilkan [Loading, Success] pada kredensial valid',
      build: () => sut,
      act: (bloc) => bloc.add(LoginSubmitted(
        email: 'alice@example.com',
        password: 'password123',
      )),
      setUp: () {
        when(mockRepository.login(any, any)).thenAnswer(
          (_) async => User(id: '1', name: 'Alice'),
        );
      },
      expect: () => [isA<LoginLoading>(), isA<LoginSuccess>()],
    );

    testWidgets('LoginScreen dengan Bloc menampilkan error pada kegagalan', (tester) async {
      when(mockRepository.login(any, any)).thenThrow(AuthException('Tidak valid'));

      await tester.pumpWidget(
        BlocProvider<LoginBloc>(
          create: (_) => sut,
          child: const MaterialApp(home: LoginScreen()),
        ),
      );

      await tester.enterText(find.byKey(const Key('emailField')), 'bad@test.com');
      await tester.enterText(find.byKey(const Key('passwordField')), 'salah');
      await tester.tap(find.byKey(const Key('loginButton')));
      await tester.pumpAndSettle();

      expect(find.text('Login gagal. Silakan coba lagi.'), findsOneWidget);
    });
  });
}
```

### Langkah 7: Siapkan Fixture dan Mock untuk Pengujian

Gunakan direktori `test/helpers/` khusus untuk berbagi utilitas pengujian, kelas mock, dan data fixture di semua file pengujian.

Buat `test/helpers/widget_test_utils.dart` untuk pembungkus widget test yang dapat digunakan ulang:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

extension WidgetTesterUtils on WidgetTester {
  /// Pump widget yang dibungkus dengan MaterialApp dan provider umum
  Future<void> pumpApp(
    Widget widget, {
    List<SingleChildWidget> providers = const [],
  }) {
    return pumpWidget(
      MultiProvider(
        providers: providers,
        child: MaterialApp(
          home: Scaffold(body: widget),
          localizationsDelegates: const [
            DefaultMaterialLocalizations.delegate,
            DefaultWidgetsLocalizations.delegate,
          ],
        ),
      ),
    );
  }
}
```

Buat `test/helpers/test_data.dart` untuk factory data test bersama:

```dart
import 'package:my_app/models/user.dart';
import 'package:my_app/models/product.dart';

class TestData {
  static User get alice => User(
    id: '1',
    name: 'Alice',
    email: 'alice@example.com',
  );

  static User get bob => User(
    id: '2',
    name: 'Bobi',
    email: 'bobi@example.com',
  );

  static Product get laptop => Product(
    id: 'p1',
    name: 'MacBook Pro',
    price: 24999900,
    currency: 'IDR',
  );

  static List<Product> get productList => [
    laptop,
    Product(id: 'p2', name: 'Mouse Nirkabel', price: 799900, currency: 'IDR'),
    Product(id: 'p3', name: 'USB-C Hub', price: 499900, currency: 'IDR'),
  ];
}
```

### Langkah 8: Jalankan Pengujian di CI/CD

Konfigurasikan GitHub Actions (atau penyedia CI Anda) untuk menjalankan pengujian Flutter di setiap push dan pull request. Gunakan strategi matrix untuk menguji di beberapa channel Flutter (stable, beta).

Buat `.github/workflows/flutter_tests.yml`:

```yaml
name: Flutter Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        flutter_channel: [stable, beta]

    steps:
      - uses: actions/checkout@v4

      - uses: subosito/flutter-action@v2
        with:
          channel: ${{ matrix.flutter_channel }}
          cache: true

      - name: Install dependencies
        run: flutter pub get

      - name: Analyze
        run: flutter analyze

      - name: Unit and widget tests
        run: flutter test --exclude-tags slow --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: coverage/lcov.info

      - name: Integration tests
        if: github.event_name == 'pull_request'
        run: |
          flutter test integration_test/ \
            --dart-define=CI=true
```

Tambahkan script quality gate (`scripts/check_quality.sh`) yang menegakkan ambang batas cakupan:

```bash
#!/bin/bash
# Gagal jika cakupan turun di bawah ambang batas
MIN_COVERAGE=70

# Hasilkan laporan cakupan
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html

# Ekstrak persentase cakupan baris
COVERAGE=$(lcov --summary coverage/lcov.info 2>&1 | \
  grep 'lines......' | awk '{print $2}' | tr -d '%' | cut -d. -f1)

if [ "$COVERAGE" -lt "$MIN_COVERAGE" ]; then
  echo "GAGAL: Cakupan baris $COVERAGE% di bawah minimum $MIN_COVERAGE%"
  exit 1
fi

echo "LULUS: Cakupan baris $COVERAGE% memenuhi ambang batas $MIN_COVERAGE%"
```

### Langkah 9: Jalankan Pengujian Secara Efisien Selama Pengembangan

Adopsi strategi eksekusi pengujian bertingkat untuk menyeimbangkan kecepatan dan kepercayaan diri:

1. **Pemicu simpan file** (integrasi editor tercepat): Jalankan hanya file pengujian yang sedang Anda edit. Sebagian besar IDE menyediakan tombol run di samping setiap fungsi pengujian. Gunakan `flutter test test/unit/models/user_test.dart` untuk proses yang ditargetkan.

2. **Pre-commit hook**: Jalankan semua unit test dan widget test tidak termasuk `@Tags(['slow'])`. Ini akan selesai dalam waktu kurang dari 30 detik:

   ```bash
   flutter test --exclude-tags slow
   ```

3. **Pipeline CI**: Jalankan suite lengkap termasuk golden test dan integration test. Tambahkan flag `--run-slow` atau pisahkan pengujian lambat ke dalam job terjadwal cron untuk menghindari pemblokiran merge PR pada pembaruan baseline visual.

4. **Eksekusi pengujian paralel**: Gunakan flag `--concurrency` untuk menjalankan pengujian secara paralel di beberapa isolate:

   ```bash
   flutter test --concurrency=4
   ```

   Pantau masalah isolasi pengujian saat memparalelkan — state bersama atau global statis yang dapat berubah akan menyebabkan kegagalan flaky. Hook `setUp` dan `tearDown` harus mereset semua state bersama sepenuhnya.

### Langkah 10: Tambahkan Pelaporan Cakupan Pengujian

Integrasikan pelacakan cakupan kode untuk mengidentifikasi jalur kode yang tidak teruji dan mencegah regresi cakupan:

```bash
flutter test --coverage
```

Hasilkan laporan HTML:

```bash
# Install lcov jika belum tersedia
brew install lcov  # macOS
sudo apt install lcov  # Linux

genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

Metrik cakupan utama yang perlu dilacak:

| Metrik | Target | Cara meningkatkan |
|--------|--------|-------------------|
| Cakupan baris | ≥ 80% | Tambahkan tes untuk cabang kondisi yang tidak teruji |
| Cakupan cabang | ≥ 70% | Uji jalur null/error dan kondisi edge-case |
| Cakupan fungsi | ≥ 90% | Pastikan setiap fungsi publik memiliki setidaknya satu tes |
| Cakupan widget | ≥ 75% | Tulis widget test untuk setiap layar dan komponen bersama |

Gunakan `flutter test --coverage --merge-coverage` saat menggabungkan cakupan dari beberapa file pengujian.

## Kesimpulan

Strategi pengujian yang kuat adalah fondasi aplikasi Flutter yang dapat dipelihara. Dengan menggabungkan unit test untuk logika bisnis, widget test untuk perilaku UI, golden test untuk ketepatan visual, dan integration test untuk alur aplikasi penuh, Anda menciptakan jaring pengaman yang menangkap bug sebelum mencapai produksi.

Mulailah dari yang kecil — tambahkan unit test untuk model dan service Anda terlebih dahulu, kemudian perluas ke widget test untuk layar yang paling kritis. Siapkan eksekusi pengujian CI/CD dan ambang batas cakupan sejak awal, dan perlakukan suite pengujian sebagai dokumentasi hidup tentang bagaimana aplikasi Anda harus berperilaku. Dengan pola dan alat yang dibahas dalam panduan ini, tim Flutter Anda dapat merilis dengan percaya diri dan melakukan iterasi tanpa takut regresi.
