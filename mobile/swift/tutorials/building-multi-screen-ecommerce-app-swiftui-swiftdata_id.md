---
title: "Membangun Aplikasi E-Commerce Multi-Layar dengan SwiftUI dan SwiftData"
description: "Tutorial berbasis proyek yang membangun storefront e-commerce lengkap di SwiftUI — model SwiftData, state keranjang @Observable, navigasi bertipe, networking async, dan persistensi checkout."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi E-Commerce Multi-Layar dengan SwiftUI dan SwiftData

## Ringkasan

Tutorial ini memandu Anda membangun storefront e-commerce berfitur lengkap untuk iOS menggunakan SwiftUI dan SwiftData. Anda akan memodelkan produk dan pesanan dengan SwiftData, mengelola keranjang belanja dengan framework observasi `@Observable`, mengarahkan navigasi dengan enum `NavigationStack` yang aman-tipe, mengambil data produk secara asinkron dari REST API, dan menyimpan pesanan yang sudah selesai secara lokal. Pada akhirnya Anda akan memiliki aplikasi multi-layar yang dapat dijalankan dan menunjukkan bagaimana persistensi, state, networking, dan navigasi tersusun menjadi proyek dunia nyata.

## Target Audiens

- Target pembaca utama: pengembang iOS / SwiftUI yang telah menyelesaikan kursus dasar dan ingin membangun aplikasi multi-layar yang realistis.
- Ekspektasi tingkat kemampuan pembaca: Menengah hingga Mahir — nyaman dengan dasar SwiftUI, `async/await`, dan pola MVVM.

## Prasyarat

- Pengetahuan kerja tentang Swift, tata letak SwiftUI, dan concurrency Swift (`async/await`).
- Xcode 15 atau lebih baru (SwiftData dan makro `@Observable` memerlukan SDK iOS 17).
- Simulator atau perangkat target iOS 17+.
- Pemahaman dasar tentang REST API dan decoding JSON.
- Keakraban dengan tutorial lapisan networking (pola `$APIClient`) membantu tetapi tidak wajib.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mendefinisikan kelas `@Model` SwiftData dan mengonfigurasi `ModelContainer` untuk aplikasi.
- Mengelola state aplikasi dengan makro `@Observable` dan menyuntikkannya melalui `.environment()`.
- Membangun alur navigasi aman-tipe menggunakan rute `NavigationStack` berbasis enum.
- Mengambil dan mendekode data produk jarak jauh dengan klien jaringan `async/await`.
- Mengimplementasikan operasi keranjang (tambah, ubah jumlah, hapus) yang memperbarui UI secara reaktif.
- Menyimpan dan membaca pesanan yang sudah selesai melalui kueri SwiftData.

## Konteks dan Motivasi

E-commerce seluler adalah salah satu kategori aplikasi dunia nyata yang paling umum, namun tutorial pemula jarang menyatukan semua bagian yang dibutuhkan storefront produksi. Layar katalog, layar detail, keranjang, dan alur checkout saling berinteraksi terus-menerus — setiap perubahan di satu layar harus tercermin di mana-mana, dan datanya harus bertahan setelah aplikasi dimulai ulang.

Model deklaratif SwiftUI membuat komposisi ini lebih mudah, tetapi hanya jika Anda memilih alat yang koheren untuk setiap kebutuhan. SwiftData memberi Anda lapisan persistensi asli Swift dengan pembaruan UI yang digerakkan `@Query`. Makro `@Observable` menyediakan manajemen state yang ringan tanpa seremonial `ObservableObject`. `NavigationStack` berbasis enum menjaga navigasi dalam menjadi aman-tipe. Tutorial ini menggabungkan empat pilar ini ke dalam satu proyek yang koheren sehingga Anda belajar bagaimana mereka bekerja sama, bukan secara terpisah.

## Konten Inti

### Penyiapan Proyek dan Model Container

Mulai dengan proyek aplikasi iOS baru (siklus hidup SwiftUI, iOS 17+). Keputusan arsitektur pertama adalah membuat `ModelContainer` yang menampung model SwiftData Anda. SwiftData mengelola konteks penyimpanan untuk Anda; Anda hanya menyediakan skema dan opsi in-memory untuk pratinjau.

Titik masuk menghubungkan container ke lingkungan sehingga setiap view dapat mengakses `modelContext` melalui properti wrapper `@Environment`.

### Mendefinisikan Model Data

Data e-commerce terurai menjadi sekumpulan kecil model yang saling terkait:

- **Product** — item katalog yang ditampilkan di berbagai layar.
- **CartItem** — pilihan sementara; jumlah biasanya disimpan di memori atau di konteks model.
- **Order** — pembelian yang disimpan berisi entri `OrderLine`.

Menggunakan relasi SwiftData memungkinkan Anda mengkueri baris pesanan sebagai array `[OrderLine]` asli dan menjelajahi relasi bergaya `product → category` tanpa logika join manual.

### Mengelola State Keranjang dengan @Observable

Keranjang adalah state global yang dibagikan oleh layar detail, katalog, dan checkout. Makro `@Observable` mengubah kelas biasa menjadi observable yang dilacak SwiftUI secara otomatis. Setiap properti yang dibaca di dalam body view menjadi dependensi; memutasi properti tersebut membatalkan secara tepat view yang membacanya. Anda menyuntikkan satu `CartStore` ke lingkungan dan memutasi dari mana saja.

### Navigasi Aman-Tipe

`NavigationStack` menerima `NavigationPath`, tetapi rute berbasis enum memberi Anda keamanan waktu-kompilasi dan memungkinkan lampiran nilai terkait. Setiap nilai rute dipetakan ke view tujuan, dan Anda dapat melakukan push serta pop secara terprogram sambil mempertahankan gerakan kembali sistem.

### Networking Asinkron

Produk berasal dari endpoint backend. Anda membungkus `URLSession` dengan klien `async/await`, mendekode payload JSON, dan memetakannya ke model `Product` SwiftData Anda. State pemuatan diekspresikan sebagai enum sehingga UI dapat merender state loading, loaded, dan error secara terpisah.

### Checkout dan Persistensi Pesanan

Saat pengguna mengonfirmasi pesanan, Anda mengambil snapshot keranjang ke sekumpulan model `OrderLine`, menyimpannya melalui `modelContext`, dan mengosongkan keranjang. Karena pesanan dipersistensikan dengan SwiftData, layar riwayat dapat menampilkan pembelian sebelumnya menggunakan `@Query`.

## Contoh Kode

### Titik Masuk Aplikasi dengan ModelContainer

```swift
import SwiftUI
import SwiftData

@main
struct ECommerceApp: App {
    let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(for: Product.self, Order.self)
        } catch {
            fatalError("Failed to create model container: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            CatalogView()
                .environment(CartStore())
                .modelContainer(container)
        }
    }
}
```

### Model SwiftData

```swift
import Foundation
import SwiftData

@Model
final class Product {
    var name: String
    var price: Decimal
    var summary: String
    var imageURL: String?
    var stock: Int

    init(name: String, price: Decimal, summary: String, imageURL: String?,
         stock: Int) {
        self.name = name
        self.price = price
        self.summary = summary
        self.imageURL = imageURL
        self.stock = stock
    }
}

@Model
final class Order {
    var placedAt: Date
    @Relationship(deleteRule: .cascade) var lines: [OrderLine]

    var total: Decimal {
        lines.reduce(0) { $0 + ($1.unitPrice * Decimal($1.quantity)) }
    }

    init(placedAt: Date = .now, lines: [OrderLine] = []) {
        self.placedAt = placedAt
        self.lines = lines
    }
}

@Model
final class OrderLine {
    var productName: String
    var unitPrice: Decimal
    var quantity: Int

    init(productName: String, unitPrice: Decimal, quantity: Int) {
        self.productName = productName
        self.unitPrice = unitPrice
        self.quantity = quantity
    }
}
```

### Cart Store Observable

```swift
import Foundation
import Observation

@Observable
final class CartStore {
    private(set) var items: [CartItem] = []

    var subtotal: Decimal {
        items.reduce(0) { $0 + ($1.unitPrice * Decimal($1.quantity)) }
    }

    func add(_ product: Product, quantity: Int = 1) {
        if let index = items.firstIndex(where: { $0.product == product }) {
            items[index].quantity += quantity
        } else {
            items.append(CartItem(product: product, quantity: quantity))
        }
    }

    func updateQuantity(_ id: UUID, to quantity: Int) {
        guard let index = items.firstIndex(where: { $0.id == id }) else { return }
        items[index].quantity = max(1, quantity)
    }

    func remove(_ id: UUID) {
        items.removeAll { $0.id == id }
    }

    func clear() {
        items.removeAll()
    }

    class CartItem: Identifiable {
        let id = UUID()
        let product: Product
        var quantity: Int

        var unitPrice: Decimal { product.price }

        init(product: Product, quantity: Int) {
            self.product = product
            self.quantity = quantity
        }
    }
}
```

### Rute Navigasi Aman-Tipe

```swift
import SwiftUI

enum Route: Hashable {
    case productDetail(Product)
    case cart
    case checkout
}

struct CatalogView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Product.name) private var products: [Product]

    var body: some View {
        NavigationStack {
            List(products) { product in
                NavigationLink(value: Route.productDetail(product)) {
                    ProductRow(product: product)
                }
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .productDetail(let product):
                    ProductDetailView(product: product)
                case .cart:
                    CartView()
                case .checkout:
                    CheckoutView()
                }
            }
            .navigationTitle("Store")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: Route.cart) {
                        CartButton(cart: cart)
                    }
                }
            }
        }
    }
}
```

### Pemuatan Produk Asinkron

```swift
import Foundation

enum LoadState<Value> {
    case loading
    case loaded(Value)
    case failed(Error)
}

actor APIClient {
    private let session: URLSession
    private let baseURL = URL(string: "https://api.example.com/")!

    init(session: URLSession = .shared) {
        self.session = session
    }

    func fetchProducts() async throws -> [ProductDTO] {
        let url = baseURL.appendingPathComponent("products")
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode([ProductDTO].self, from: data)
    }
}

struct ProductDTO: Codable, Identifiable {
    let id: Int
    let name: String
    let price: String
    let summary: String
}
```

### Checkout dengan Persistensi SwiftData

```swift
import SwiftUI
import SwiftData

struct CheckoutView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(CartStore.self) private var cart
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Form {
            Section("Items") {
                ForEach(cart.items) { item in
                    HStack {
                        Text(item.product.name)
                        Spacer()
                        Text("\(item.quantity) × \(item.unitPrice)")
                    }
                }
            }
            Section("Total") {
                Text(cart.subtotal, format: .currency(code: "USD"))
            }
            Section {
                Button("Place Order") {
                    placeOrder()
                }
            }
        }
        .navigationTitle("Checkout")
    }

    private func placeOrder() {
        let lines = cart.items.map { item in
            OrderLine(productName: item.product.name,
                      unitPrice: item.unitPrice,
                      quantity: item.quantity)
        }
        let order = Order(lines: lines)
        modelContext.insert(order)
        cart.clear()
        dismiss()
    }
}
```

## Insight Penting

- **Relasi SwiftData adalah tulang punggung storefront**: memodelkan `Order` dengan `@Relationship` cascade ke `OrderLine` berarti menghapus pesanan akan membersihkan barisnya, dan Anda mendapatkan array `[OrderLine]` bertipe dengan nol boilerplate join.
- **Makro `@Observable` meruntuhkan lapisan manajemen state**: tidak ada `ObservableObject`, `@Published`, atau `objectWillChange` manual — SwiftUI melacak pembacaan secara otomatis, sehingga mutasi keranjang hanya membatalkan view yang bergantung padanya.
- **Navigasi berbasis enum mencegah crash runtime**: `Route` enum dengan nilai terkait membuat setiap tujuan eksplisit dan diperiksa-tipe oleh kompiler, menghilangkan segmen path stringly-typed.
- **Pisahkan DTO dari model SwiftData**: dekode format wire (`ProductDTO`) terlebih dahulu, lalu petakan ke kelas `@Model`. Ini memisahkan skema persistensi Anda dari kontrak API dan membuat migrasi skema lebih aman.
- **Gunakan Decimal, bukan Double, untuk uang**: menggunakan `Decimal` untuk harga menghindari kesalahan pembulatan floating-point yang mengganggu aritmetika mata uang.

## Langkah Berikutnya

- Perdalam keterampilan SwiftData Anda dengan relasi, migrasi, dan sinkronisasi CloudKit yang dibahas di `advanced-swiftui-syllabus`.
- Perkuat lapisan networking — retry, caching, dan interceptor — dengan mempelajari tutorial `networking-layer-swift-async-await`.
- Tambahkan autentikasi dan penyimpanan aman sebelum rilis, menggunakan `swift-ios-security-data-protection-guide`.
- Pertimbangkan `swift-ios-best-practices-guide` untuk menerapkan MVVM dan dependency injection dalam skala besar.

## Kesimpulan

Anda telah membangun aplikasi e-commerce multi-layar yang lengkap yang menggabungkan persistensi SwiftData, state `@Observable`, navigasi aman-tipe, dan networking asinkron ke dalam satu proyek yang koheren. Inti pembelajarannya adalah arsitektur: setiap pilar SwiftUI memiliki tanggung jawab yang jelas, dan mereka tersusun dengan bersih karena berbagi model reaktif yang sama. Dari sini, pola yang sama dapat diskalakan ke aplikasi iOS mana pun yang digerakkan data — perluas katalog, tambahkan autentikasi, dan terapkan pola lanjutan di silabus dan panduan terkait untuk membawanya ke produksi.
