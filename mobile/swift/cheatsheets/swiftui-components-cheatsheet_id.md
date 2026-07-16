---
title: "Cheat Sheet Komponen dan Pola SwiftUI"
description: "Referensi cepat yang komprehensif untuk container tata letak SwiftUI, aliran data, navigasi, animasi, grafik, dan pola tingkat lanjut."
category: "mobile"
technology: "swift"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Komponen dan Pola SwiftUI

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Tata letak tiga kolom | `NavigationSplitView { sidebar } content: { } detail: { }` | Tampilan terpisah adaptif (iPad/Mac) |
| Navigasi berbasis tumpukan | `NavigationStack { NavigationLink("Go", value: route) }` | Navigasi push secara terprogram |
| Model data observable | `@Observable class Model { }` | Observasi iOS 17+ (tanpa wrapper) |
| Ikat ke view model | `@State private var model = MyModel()` | Sumber kebenaran di dalam view |
| Bagikan antar view | `@Environment(MyModel.self) private var model` | Injeksi environment |
| Grid scrolling horizontal | `ScrollView(.horizontal) { LazyHGrid(rows: rows) { } }` | Grid scrolling yang performan |
| Header bagian form | `Section { } header: { Text("Section") }` | Konten form yang dikelompokkan |
| Tampilkan sheet | `.sheet(item: $item) { item in DetailView(item: item) }` | Presentasi sheet berbasis item |
| Tambah grafik garis | `Chart { LineMark(x: "date", y: "value") }` | Framework Swift Charts |
| Animasi dengan spring | `.animation(.spring(duration: 0.5, bounce: 0.3), value: value)` | Animasi berbasis spring |
| Geometri yang cocok | `.matchedGeometryEffect(id: "shape", in: namespace)` | Transisi morphing |
| PreferenceKey | `struct WidthKey: PreferenceKey { static let defaultValue: CGFloat = 0 }` | Komunikasi anak-ke-induk |
| Gambar Canvas | `Canvas { context, size in context.fill(path, with: .color(.blue)) }` | Gambar 2D imperatif |
| Item toolbar | `.toolbar { ToolbarItem(placement: .primaryAction) { Button("Done") } }` | Tombol toolbar |
| Menu (konteks) | `.contextMenu { Button("Copy") { } }` | Menu konteks tekan lama |

## Perintah Umum

### Pratinjau SwiftUI Xcode

```bash
# Pratinjau dengan perangkat tertentu
# Tambahkan ke penyedia pratinjau:
#   MyView()
#     .previewDevice("iPhone 15 Pro")
#     .previewDisplayName("iPhone 15 Pro")

# Pratinjau dalam mode terang dan gelap
#   MyView()
#     .preferredColorScheme(.light)
#   MyView()
#     .preferredColorScheme(.dark)

# Pratinjau pada berbagai ukuran teks
#   MyView()
#     .dynamicTypeSize(.accessibility5)

# Pratinjau tata letak di beberapa perangkat secara bersamaan
#   Group {
#     MyView().previewDevice("iPhone 15 Pro")
#     MyView().previewDevice("iPad Pro 12.9")
#   }

# Pratinjau timeline widget
#   #Preview(as: .systemSmall) {
#     MyWidget()
#   } timeline: {
#     MyEntry(date: .now)
#   }
```

### Perintah Plugin Paket Swift

```bash
# Hasilkan dokumentasi komponen SwiftUI
swift package --disable-sandwich preview-documentation

# Jalankan tes pratinjau SwiftUI
swift test --filter "PreviewSnapshotTests"

# Periksa gaya kode SwiftUI
swiftlint --config .swiftlint.yml --strict
```

## Potongan Kode

### Pola Container Tata Letak

```swift
// MARK: - HStack adaptif dengan jarak dan perataan
HStack(alignment: .top, spacing: 16) {
    ProfileAvatar()
    VStack(alignment: .leading, spacing: 4) {
        Text("Nama Pengguna")
            .font(.headline)
        Text("Terakhir dilihat 2m lalu")
            .font(.caption)
            .foregroundStyle(.secondary)
    }
    Spacer()
    StatusBadge()
}
.padding()

// MARK: - LazyVGrid dengan kolom adaptif
let columns = [
    GridItem(.adaptive(minimum: 100, maximum: 200), spacing: 12),
    GridItem(.adaptive(minimum: 100, maximum: 200), spacing: 12)
]

LazyVGrid(columns: columns, spacing: 16) {
    ForEach(items) { item in
        ItemCard(item: item)
            .frame(height: 120)
    }
}
.padding(.horizontal)

// MARK: - LazyHStack untuk korsel horizontal
ScrollView(.horizontal, showsIndicators: false) {
    LazyHStack(spacing: 12) {
        ForEach(cards) { card in
            CardView(card: card)
                .frame(width: 280, height: 200)
                .containerRelativeFrame(.horizontal, count: 1, span: 1, spacing: 12)
        }
    }
    .scrollTargetLayout()
}
.safeAreaPadding(.horizontal, 16)
.scrollTargetBehavior(.viewAligned)

// MARK: - ZStack dengan overlay perataan
ZStack(alignment: .bottomTrailing) {
    AsyncImage(url: product.imageURL) { phase in
        switch phase {
        case .success(let image):
            image.resizable().scaledToFill()
        case .failure:
            Color.gray
        case .empty:
            ProgressView()
        @unknown default:
            EmptyView()
        }
    }
    .frame(height: 200)
    .clipped()

    // Lencana overlay
    Text("−40%")
        .font(.caption.bold())
        .foregroundStyle(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.red, in: .capsule)
        .padding(8)
}
```

### Pola Navigasi

```swift
// MARK: - NavigationStack dengan routing tipe-aman
enum AppRoute: Hashable {
    case productDetail(id: UUID)
    case checkout
    case orderConfirmation(orderID: String)
}

struct ContentView: View {
    var body: some View {
        NavigationStack {
            ProductListView()
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .productDetail(let id):
                        ProductDetailView(productID: id)
                    case .checkout:
                        CheckoutView()
                    case .orderConfirmation(let orderID):
                        OrderConfirmationView(orderID: orderID)
                    }
                }
        }
    }
}

// MARK: - NavigationSplitView untuk tata letak adaptif
struct AdaptiveContentView: View {
    @State private var selectedCategory: Category?
    @State private var selectedProduct: Product?

    var body: some View {
        NavigationSplitView {
            List(categories, selection: $selectedCategory) { category in
                Label(category.name, systemImage: category.icon)
                    .tag(category)
            }
            .navigationTitle("Kategori")
        } content: {
            if let category = selectedCategory {
                List(category.products, selection: $selectedProduct) { product in
                    Text(product.name)
                        .tag(product)
                }
                .navigationTitle(category.name)
            } else {
                Text("Pilih kategori")
            }
        } detail: {
            if let product = selectedProduct {
                ProductDetailView(product: product)
            } else {
                Text("Pilih produk")
            }
        }
    }
}

// MARK: - Navigasi berbasis jalur kustom
@Observable
class NavigationManager {
    var path = NavigationPath()

    func navigate(to route: AppRoute) {
        path.append(route)
    }

    func goBack() {
        path.removeLast()
    }

    func resetToRoot() {
        path.removeLast(path.count)
    }
}

struct AppView: View {
    @State private var navManager = NavigationManager()

    var body: some View {
        NavigationStack(path: Bindable(navManager).path) {
            HomeView()
                .environment(navManager)
                .navigationDestination(for: AppRoute.self) { route in
                    // ... penanganan rute
                }
        }
    }
}
```

### Aliran Data dan Manajemen State

```swift
// MARK: - Makro Observable iOS 17+
@Observable
final class ShoppingCart {
    var items: [CartItem] = []
    var couponCode: String = ""
    var isCheckingOut = false

    var total: Decimal {
        items.reduce(0) { $0 + $1.subtotal }
    }

    func addItem(_ product: Product, quantity: Int = 1) {
        // Logika bisnis
    }
}

struct CartView: View {
    @State private var cart = ShoppingCart()

    var body: some View {
        List {
            ForEach(cart.items) { item in
                CartRowView(item: item)
            }

            HStack {
                Text("Total")
                    .font(.headline)
                Spacer()
                Text(cart.total, format: .currency(code: "USD"))
                    .font(.title2.bold())
            }
        }
        .environment(cart)
    }
}

// MARK: - @Bindable untuk properti mutable dari @Observable
struct CouponEntryView: View {
    @Bindable var cart: ShoppingCart

    var body: some View {
        TextField("Kode kupon", text: $cart.couponCode)
            .textFieldStyle(.roundedBorder)
            .autocapitalization(.allCharacters)
    }
}

// MARK: - @Environment untuk injeksi dependensi
struct CheckoutButtonView: View {
    @Environment(ShoppingCart.self) private var cart
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Button(action: submitOrder) {
            Label("Pesan Sekarang", systemImage: "cart.fill")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .disabled(cart.items.isEmpty)
    }

    private func submitOrder() {
        // ...
        dismiss()
    }
}

// MARK: - @AppStorage untuk persistensi UserDefaults
struct SettingsView: View {
    @AppStorage("notifications_enabled") private var notificationsEnabled = true
    @AppStorage("theme_mode") private var themeMode: String = "system"
    @AppStorage("items_per_page") private var itemsPerPage = 20

    var body: some View {
        Form {
            Toggle("Notifikasi Push", isOn: $notificationsEnabled)

            Picker("Tema", selection: $themeMode) {
                Text("Terang").tag("light")
                Text("Gelap").tag("dark")
                Text("Sistem").tag("system")
            }

            Stepper("Item per halaman: \(itemsPerPage)", value: $itemsPerPage, in: 10...100, step: 10)
        }
    }
}

// MARK: - Pola @StateObject / @ObservedObject (kompatibel iOS 16)
class TimerViewModel: ObservableObject {
    @Published var elapsed: TimeInterval = 0
    private var timer: Timer?

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.elapsed += 0.1
        }
    }
}

struct TimerView: View {
    @StateObject private var viewModel = TimerViewModel()

    var body: some View {
        Text(String(format: "%.1f", viewModel.elapsed))
            .monospacedDigit()
            .onAppear { viewModel.start() }
    }
}
```

### Animasi SwiftUI

```swift
// MARK: - Animasi spring dengan binding nilai
struct AnimatedToggle: View {
    @State private var isOn = false

    var body: some View {
        Circle()
            .fill(isOn ? .green : .gray)
            .frame(width: 60, height: 60)
            .overlay(Image(systemName: isOn ? "checkmark" : "xmark").foregroundStyle(.white))
            .onTapGesture {
                withAnimation(.spring(duration: 0.5, bounce: 0.3)) {
                    isOn.toggle()
                }
            }
    }
}

// MARK: - Animasi keyframe (iOS 17+)
struct PulseAnimation: View {
    @State private var animate = false

    var body: some View {
        Circle()
            .fill(.blue)
            .frame(width: 80, height: 80)
            .keyframeAnimator(initialValue: AnimationValues(), trigger: animate) { content, value in
                content
                    .scaleEffect(value.scale)
                    .opacity(value.opacity)
            } keyframes: { _ in
                KeyframeTrack(\.scale) {
                    CubicKeyframe(1.2, duration: 0.3)
                    CubicKeyframe(0.8, duration: 0.2)
                    CubicKeyframe(1.0, duration: 0.2)
                }
                KeyframeTrack(\.opacity) {
                    LinearKeyframe(0.6, duration: 0.1)
                    LinearKeyframe(1.0, duration: 0.3)
                    LinearKeyframe(0.8, duration: 0.2)
                    LinearKeyframe(1.0, duration: 0.2)
                }
            }
            .onAppear { animate = true }
    }
}

struct AnimationValues {
    var scale: CGFloat = 1.0
    var opacity: Double = 1.0
}

// MARK: - MatchedGeometryEffect untuk transisi elemen bersama
struct SharedElementTransition: View {
    @Namespace private var animation
    @State private var expanded = false

    var body: some View {
        VStack {
            if expanded {
                ExpandedCard(namespace: animation)
                    .onTapGesture {
                        withAnimation(.spring(duration: 0.6)) {
                            expanded.toggle()
                        }
                    }
            } else {
                CompactCard(namespace: animation)
                    .onTapGesture {
                        withAnimation(.spring(duration: 0.6)) {
                            expanded.toggle()
                        }
                    }
            }
        }
        .padding()
    }
}

struct CompactCard: View {
    let namespace: Namespace.ID

    var body: some View {
        HStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(.blue)
                .frame(width: 50, height: 50)
                .matchedGeometryEffect(id: "icon", in: namespace)
            VStack(alignment: .leading) {
                Text("Judul Kartu")
                    .matchedGeometryEffect(id: "title", in: namespace)
                Text("Subjudul")
                    .font(.caption)
                    .matchedGeometryEffect(id: "subtitle", in: namespace)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.regularMaterial, in: .rect(cornerRadius: 16))
    }
}

// MARK: - PhaseAnimator untuk efek berurutan
struct PhaseAnimatorExample: View {
    var body: some View {
        PhaseAnimator([0, 1, 2, 3], trigger: true) { phase in
            Image(systemName: phase >= 1 ? "star.fill" : "star")
                .foregroundStyle(phase >= 2 ? .yellow : .gray)
                .scaleEffect(phase == 3 ? 1.3 : 1.0)
        } animation: { phase in
            .easeInOut(duration: 0.3)
        }
    }
}
```

### Integrasi Swift Charts

```swift
import Charts

// MARK: - Grafik batang dengan kategori berkelompok
struct SalesChart: View {
    let salesData: [Sale]

    var body: some View {
        Chart(salesData) {
            BarMark(
                x: .value("Bulan", $0.month, unit: .month),
                y: .value("Pendapatan", $0.revenue)
            )
            .foregroundStyle(by: .value("Kategori", $0.category))
            .position(by: .value("Kategori", $0.category))
        }
        .chartForegroundStyleScale([
            "Elektronik": .blue,
            "Pakaian": .green,
            "Makanan": .orange
        ])
        .chartXAxis {
            AxisMarks(values: .stride(by: .month)) { value in
                AxisValueLabel(format: .dateTime.month(.abbreviated))
            }
        }
    }
}

// MARK: - Grafik garis dengan beberapa seri dan overlay interaktif
struct StockChart: View {
    let series: [StockSeries]

    var body: some View {
        Chart {
            ForEach(series) { series in
                ForEach(series.prices) { price in
                    LineMark(
                        x: .value("Tanggal", price.date),
                        y: .value("Harga", price.close)
                    )
                }
                .foregroundStyle(by: .value("Simbol", series.symbol))
                .lineStyle(StrokeStyle(lineWidth: 2))
                .symbol(by: .value("Simbol", series.symbol))
            }

            // RuleMark untuk rata-rata
            RuleMark(y: .value("Rata-rata", averagePrice))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))
                .foregroundStyle(.gray.opacity(0.6))
                .annotation(position: .trailing, alignment: .trailing) {
                    Text("Rata2").font(.caption2).foregroundStyle(.secondary)
                }
        }
        .chartLegend(position: .top, alignment: .trailing, spacing: 8)
        .chartYAxis {
            AxisMarks(format: Decimal.FormatStyle.Currency(code: "USD"))
        }
    }

    private var averagePrice: Double {
        series.flatMap(\.prices).map(\.close).reduce(0, +) /
            Double(series.flatMap(\.prices).count)
    }
}

// MARK: - RectangleMark heatmap untuk kalender aktivitas
struct ActivityHeatmap: View {
    let entries: [DayActivity]

    var body: some View {
        Chart(entries) {
            RectangleMark(
                x: .value("Hari", $0.weekday),
                y: .value("Minggu", $0.weekOfYear)
            )
            .foregroundStyle(by: .value("Jumlah", $0.count))
        }
        .chartXAxis { AxisMarks(values: .automatic(desiredCount: 7)) }
        .chartYAxis { AxisMarks(values: .automatic(desiredCount: 8)) }
    }
}

// MARK: - PointMark scatter plot
struct ScatterPlot: View {
    let dataPoints: [DataPoint]

    var body: some View {
        Chart(dataPoints) {
            PointMark(
                x: .value("Tinggi", $0.height),
                y: .value("Berat", $0.weight)
            )
            .foregroundStyle(by: .value("Kategori", $0.category))
            .symbolSize(by: .value("Keyakinan", $0.confidence))
        }
    }
}
```

### Pola Tingkat Lanjut

```swift
// MARK: - PreferenceKey untuk mengukur ukuran anak
struct SizePreferenceKey: PreferenceKey {
    static let defaultValue: CGSize = .zero
    static func reduce(value: inout CGSize, nextValue: () -> CGSize) {
        value = nextValue()
    }
}

extension View {
    func measureSize(_ size: Binding<CGSize>) -> some View {
        background(
            GeometryReader { proxy in
                Color.clear
                    .preference(key: SizePreferenceKey.self, value: proxy.size)
            }
        )
        .onPreferenceChange(SizePreferenceKey.self) { size.wrappedValue = $0 }
    }
}

// Penggunaan: Text("Hello").measureSize($viewSize)

// MARK: - Tata Letak Kustom dengan protokol Layout
struct CircularLayout: Layout {
    var radius: CGFloat = 100

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let diameter = radius * 2
        return CGSize(width: diameter, height: diameter)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let angleStep = (Angle.degrees(360).radians) / Double(max(subviews.count, 1))
        let center = CGPoint(x: bounds.midX, y: bounds.midY)

        for (index, subview) in subviews.enumerated() {
            let angle = angleStep * Double(index) - .pi / 2
            let x = center.x + radius * cos(angle)
            let y = center.y + radius * sin(angle)
            subview.place(at: CGPoint(x: x, y: y), anchor: .center, proposal: .unspecified)
        }
    }
}

// MARK: - Nilai Environment untuk tema kustom
private struct AppThemeKey: EnvironmentKey {
    static let defaultValue: AppTheme = .default
}

extension EnvironmentValues {
    var appTheme: AppTheme {
        get { self[AppThemeKey.self] }
        set { self[AppThemeKey.self] = newValue }
    }
}

struct AppTheme {
    let primaryColor: Color
    let secondaryColor: Color
    let fontName: String

    static let `default` = AppTheme(
        primaryColor: .blue,
        secondaryColor: .gray,
        fontName: "SF Pro"
    )
}

// MARK: - ScrollView dengan pelacakan posisi
struct ScrollPositionReader: View {
    @State private var scrollOffset: CGFloat = 0

    var body: some View {
        ScrollView {
            GeometryReader { proxy in
                Color.clear
                    .onAppear {
                        scrollOffset = proxy.frame(in: .named("scroll")).minY
                    }
            }
            .frame(height: 0)

            LazyVStack(spacing: 16) {
                // Konten
            }
        }
        .coordinateSpace(name: "scroll")
    }
}

// MARK: - Tata letak sadar safe area
struct SafeAreaAwareView: View {
    @Environment(\.safeAreaInsets) private var safeAreaInsets

    var body: some View {
        HStack {
            Text("Inset bawah: \(safeAreaInsets.bottom)")
                .padding(.bottom, safeAreaInsets.bottom)
        }
        .frame(maxHeight: .infinity, alignment: .bottom)
    }
}
```

### Pola Form dan Input

```swift
// MARK: - Form dengan header bagian dan validasi
struct ProfileForm: View {
    @State private var name = ""
    @State private var email = ""
    @State private var birthDate = Date()
    @State private var selectedCategory = ""
    @State private var agreeToTerms = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Informasi Pribadi") {
                    TextField("Nama lengkap", text: $name)
                        .textContentType(.name)

                    TextField("Alamat email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                    DatePicker("Tanggal Lahir",
                        selection: $birthDate,
                        displayedComponents: .date
                    )
                }

                Section("Preferensi") {
                    Picker("Kategori", selection: $selectedCategory) {
                        Text("Umum").tag("general")
                        Text("Teknologi").tag("tech")
                        Text("Sains").tag("science")
                    }
                }

                Section {
                    Toggle("Saya setuju dengan syarat dan ketentuan", isOn: $agreeToTerms)

                    Button(action: submitForm) {
                        Text("Simpan Profil")
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(!formValid)
                    .buttonStyle(.borderedProminent)
                }
            }
            .navigationTitle("Edit Profil")
        }
    }

    private var formValid: Bool {
        !name.isEmpty && !email.isEmpty && agreeToTerms
    }

    private func submitForm() { }
}

// MARK: - Wizard multi-langkah dengan seleksi tab
struct WizardStep: Identifiable {
    let id: Int
    let title: String
    let icon: String
}

struct WizardView: View {
    @State private var currentStep = 0
    let steps = [
        WizardStep(id: 0, title: "Detail", icon: "1.circle"),
        WizardStep(id: 1, title: "Alamat", icon: "2.circle"),
        WizardStep(id: 2, title: "Pembayaran", icon: "3.circle"),
        WizardStep(id: 3, title: "Konfirmasi", icon: "4.circle"),
    ]

    var body: some View {
        VStack {
            // Indikator langkah
            HStack {
                ForEach(steps) { step in
                    Image(systemName: step.icon)
                        .foregroundStyle(step.id <= currentStep ? .blue : .gray)
                    if step.id < steps.count - 1 {
                        Rectangle()
                            .fill(step.id < currentStep ? .blue : .gray.opacity(0.3))
                            .frame(height: 2)
                    }
                }
            }
            .padding()

            TabView(selection: $currentStep) {
                StepOneView().tag(0)
                StepTwoView().tag(1)
                StepThreeView().tag(2)
                StepConfirmView().tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
    }
}
```
