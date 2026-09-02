---
title: "Building a Multi-Screen E-Commerce App with SwiftUI and SwiftData"
description: "A project-based tutorial that builds a complete e-commerce storefront in SwiftUI — SwiftData models, @Observable cart state, typed navigation, async networking, and checkout persistence."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Multi-Screen E-Commerce App with SwiftUI and SwiftData

## Summary

This tutorial walks through building a full-featured e-commerce storefront for iOS using SwiftUI and SwiftData. You will model products and orders with SwiftData, manage the shopping cart with the `@Observable` observation framework, drive navigation with a type-safe `NavigationStack` route enum, fetch product data asynchronously from a REST API, and persist completed orders locally. By the end you will have a runnable multi-screen app that demonstrates how persistence, state, networking, and navigation compose into a real-world project.

## Target Audience

- Primary target audience: iOS / SwiftUI developers who have completed a fundamentals course and want to build a realistic multi-screen application.
- Expected developer level: Intermediate to Advanced — comfortable with SwiftUI basics, `async/await`, and the MVVM pattern.

## Prerequisites

- Working knowledge of Swift, SwiftUI layouts, and Swift concurrency (`async/await`).
- Xcode 15 or later (SwiftData and the `@Observable` macro require the iOS 17 SDK).
- An iOS 17+ simulator or device target.
- A basic understanding of REST APIs and JSON decoding.
- Familiarity with the networking layer tutorial (`$APIClient` pattern) is helpful but not required.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Define SwiftData `@Model` classes and configure a `ModelContainer` for the app.
- Manage application state with the `@Observable` macro and inject it via `.environment()`.
- Build a type-safe navigation flow using an enum-based `NavigationStack` route.
- Fetch and decode remote product data with an `async/await` network client.
- Implement cart operations (add, update quantity, remove) that update the UI reactively.
- Persist and read completed orders through SwiftData queries.

## Context and Motivation

Mobile e-commerce is one of the most common real-world app categories, yet beginner tutorials rarely stitch together all the pieces a production storefront needs. A catalog screen, a detail screen, a cart, and a checkout flow interact continuously — every mutation in one screen must be reflected everywhere else, and the data must survive app restarts.

SwiftUI's declarative model makes this composition easier, but only when you choose coherent tools for each concern. SwiftData gives you a Swift-native persistence layer with `@Query`-driven UI updates. The `@Observable` macro provides lightweight state management without the ceremony of `ObservableObject`. An enum-based `NavigationStack` keeps deep navigation type-safe. This tutorial combines these four pillars into a single, coherent project so you learn how they cooperate rather than in isolation.

## Core Content

### Project Setup and Model Container

Start with a fresh iOS app project (SwiftUI lifecycle, iOS 17+). The first architectural decision is creating the `ModelContainer` that hosts your SwiftData models. SwiftData manages the storage context for you; you only supply the schema and an in-memory option for previews.

The entry point wires the container into the environment so every view can access the `modelContext` via the `@Environment` property wrapper.

### Defining the Data Models

E-commerce data decomposes into a small set of related models:

- **Product** — the catalog item displayed across screens.
- **CartItem** — an ephemeral selection; quantity is typically stored in memory or in the model context.
- **Order** — a persisted purchase containing `OrderLine` entries.

Using SwiftData relationships lets you query an order's lines as a native `[OrderLine]` array and traverse `product → category` style relations without manual join logic.

### Managing Cart State with @Observable

The cart is global state shared by the detail, catalog, and checkout screens. The `@Observable` macro turns a plain class into an observable that SwiftUI tracks automatically. Any property read inside a view body becomes a dependency; mutating it invalidates exactly the views that read it. You inject a single `CartStore` into the environment and mutate it from anywhere.

### Type-Safe Navigation

`NavigationStack` accepts a `NavigationPath`, but an enum-based route gives you compile-time safety and lets you attach associated values. Each route value maps to a destination view, and you can push and pop programmatically while preserving the system back gestures.

### Async Networking

Products come from a backend endpoint. You wrap `URLSession` with an `async/await` client, decode the JSON payload, and map it into your SwiftData `Product` model. The loading state is expressed as an enum so the UI can render loading, loaded, and error states distinctly.

### Checkout and Order Persistence

When the user confirms an order, you snapshot the cart into a set of `OrderLine` models, save them through the `modelContext`, and clear the cart. Because the orders are persisted with SwiftData, the history screen can show prior purchases using an `@Query`.

## Code Examples

### App Entry Point with ModelContainer

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

### SwiftData Models

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

### Observable Cart Store

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

### Type-Safe Navigation Routes

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

### Async Product Loading

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

### Checkout with SwiftData Persistence

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

## Key Insights

- **SwiftData relationships are the backbone of a storefront**: modeling `Order` with a cascade `@Relationship` to `OrderLine` means deleting an order cleanly removes its lines, and you get a typed `[OrderLine]` array with zero join boilerplate.
- **The `@Observable` macro collapses the state-management layer**: there is no `ObservableObject`, `@Published`, or manual `objectWillChange` — SwiftUI tracks reads automatically, so a cart mutation invalidates only the views that depend on it.
- **Enum-based navigation prevents runtime crashes**: a `Route` enum with associated values makes every destination explicit and type-checked by the compiler, eliminating stringly-typed path segments.
- **Keep DTOs separate from SwiftData models**: decode the wire format (`ProductDTO`) first, then map into your `@Model` classes. This decouples your persistence schema from the API contract and makes schema migrations safer.
- **Decimal, not Double, for money**: using `Decimal` for prices avoids the floating-point rounding errors that plague currency arithmetic.

## Next Steps

- Deepen your SwiftData skills with the relationships, migrations, and CloudKit sync covered in the `advanced-swiftui-syllabus`.
- Harden the networking layer — retries, caching, and interceptors — by studying the `networking-layer-swift-async-await` tutorial.
- Add authentication and secure storage before shipping, using the `swift-ios-security-data-protection-guide`.
- Consider the `swift-ios-best-practices-guide` to apply MVVM and dependency injection at scale.

## Conclusion

You have built a complete, multi-screen e-commerce app that combines SwiftData persistence, `@Observable` state, type-safe navigation, and async networking into a single coherent project. The key takeaway is architectural: each SwiftUI pillar has a clear responsibility, and they compose cleanly because they share a common reactive model. From here, the same pattern scales to any data-driven iOS app — expand the catalog, add authentication, and apply the advanced patterns in the related syllabi and guides to take it to production.
