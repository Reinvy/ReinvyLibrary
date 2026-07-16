---
title: "SwiftUI Components and Patterns Cheat Sheet"
description: "A thorough quick reference for SwiftUI layout containers, data flow, navigation, animations, charts, and advanced patterns."
category: "mobile"
technology: "swift"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# SwiftUI Components and Patterns Cheat Sheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Three-column layout | `NavigationSplitView { sidebar } content: { } detail: { }` | Adaptive split view (iPad/Mac) |
| Stack-based navigation | `NavigationStack { NavigationLink("Go", value: route) }` | Programmatic push navigation |
| Observable data model | `@Observable class Model { }` | iOS 17+ observation (no wrappers) |
| Bind to a view model | `@State private var model = MyModel()` | Source of truth in view |
| Share across views | `@Environment(MyModel.self) private var model` | Environment injection |
| Horizontal scrolling grid | `ScrollView(.horizontal) { LazyHGrid(rows: rows) { } }` | Performant grid scrolling |
| Form section header | `Section { } header: { Text("Section") }` | Grouped form content |
| Present a sheet | `.sheet(item: $item) { item in DetailView(item: item) }` | Item-based sheet presentation |
| Add chart line | `Chart { LineMark(x: "date", y: "value") }` | Swift Charts framework |
| Animate with spring | `.animation(.spring(duration: 0.5, bounce: 0.3), value: value)` | Spring-based animation |
| Matched geometry | `.matchedGeometryEffect(id: "shape", in: namespace)` | Morphing transitions |
| PreferenceKey | `struct WidthKey: PreferenceKey { static let defaultValue: CGFloat = 0 }` | Child-to-parent communication |
| Canvas drawing | `Canvas { context, size in context.fill(path, with: .color(.blue)) }` | Imperative 2D drawing |
| Toolbar item | `.toolbar { ToolbarItem(placement: .primaryAction) { Button("Done") } }` | Toolbar buttons |
| Menu (context) | `.contextMenu { Button("Copy") { } }` | Long-press context menu |

## Common Commands

### Xcode SwiftUI Previews

```bash
# Preview with specific device
# Add to preview provider:
#   MyView()
#     .previewDevice("iPhone 15 Pro")
#     .previewDisplayName("iPhone 15 Pro")

# Preview in light and dark mode
#   MyView()
#     .preferredColorScheme(.light)
#   MyView()
#     .preferredColorScheme(.dark)

# Preview at different dynamic type sizes
#   MyView()
#     .dynamicTypeSize(.accessibility5)

# Preview layout on multiple devices simultaneously
#   Group {
#     MyView().previewDevice("iPhone 15 Pro")
#     MyView().previewDevice("iPad Pro 12.9")
#   }

# Preview widget timelines
#   #Preview(as: .systemSmall) {
#     MyWidget()
#   } timeline: {
#     MyEntry(date: .now)
#   }
```

### Swift Package Plugin Commands

```bash
# Generate SwiftUI component documentation
swift package --disable-sandwich preview-documentation

# Run SwiftUI preview tests
swift test --filter "PreviewSnapshotTests"

# Lint SwiftUI code style
swiftlint --config .swiftlint.yml --strict
```

## Code Snippets

### Layout Container Patterns

```swift
// MARK: - Adaptive horizontal stack with spacing and alignment
HStack(alignment: .top, spacing: 16) {
    ProfileAvatar()
    VStack(alignment: .leading, spacing: 4) {
        Text("User Name")
            .font(.headline)
        Text("Last seen 2m ago")
            .font(.caption)
            .foregroundStyle(.secondary)
    }
    Spacer()
    StatusBadge()
}
.padding()

// MARK: - LazyVGrid with adaptive columns
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

// MARK: - LazyHStack for horizontal paging carousel
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

// MARK: - ZStack with alignment overlay
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

    // Badge overlay
    Text("−40%")
        .font(.caption.bold())
        .foregroundStyle(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.red, in: .capsule)
        .padding(8)
}
```

### Navigation Patterns

```swift
// MARK: - NavigationStack with type-safe routing
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

// MARK: - NavigationSplitView for adaptive layouts
struct AdaptiveContentView: View {
    @State private var selectedCategory: Category?
    @State private var selectedProduct: Product?

    var body: some View {
        NavigationSplitView {
            List(categories, selection: $selectedCategory) { category in
                Label(category.name, systemImage: category.icon)
                    .tag(category)
            }
            .navigationTitle("Categories")
        } content: {
            if let category = selectedCategory {
                List(category.products, selection: $selectedProduct) { product in
                    Text(product.name)
                        .tag(product)
                }
                .navigationTitle(category.name)
            } else {
                Text("Select a category")
            }
        } detail: {
            if let product = selectedProduct {
                ProductDetailView(product: product)
            } else {
                Text("Select a product")
            }
        }
    }
}

// MARK: - Custom path-based navigation
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
                    // ... route handling
                }
        }
    }
}
```

### Data Flow and State Management

```swift
// MARK: - iOS 17+ Observable macro
@Observable
final class ShoppingCart {
    var items: [CartItem] = []
    var couponCode: String = ""
    var isCheckingOut = false

    var total: Decimal {
        items.reduce(0) { $0 + $1.subtotal }
    }

    func addItem(_ product: Product, quantity: Int = 1) {
        // Business logic
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
        .environment(cart)  // Inject for child views
    }
}

// MARK: - @Bindable for mutable properties from @Observable
struct CouponEntryView: View {
    @Bindable var cart: ShoppingCart

    var body: some View {
        TextField("Coupon code", text: $cart.couponCode)
            .textFieldStyle(.roundedBorder)
            .autocapitalization(.allCharacters)
    }
}

// MARK: - @Environment for dependency injection
struct CheckoutButtonView: View {
    @Environment(ShoppingCart.self) private var cart
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Button(action: submitOrder) {
            Label("Place Order", systemImage: "cart.fill")
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

// MARK: - @AppStorage for UserDefaults persistence
struct SettingsView: View {
    @AppStorage("notifications_enabled") private var notificationsEnabled = true
    @AppStorage("theme_mode") private var themeMode: String = "system"
    @AppStorage("items_per_page") private var itemsPerPage = 20

    var body: some View {
        Form {
            Toggle("Push Notifications", isOn: $notificationsEnabled)

            Picker("Theme", selection: $themeMode) {
                Text("Light").tag("light")
                Text("Dark").tag("dark")
                Text("System").tag("system")
            }

            Stepper("Items per page: \(itemsPerPage)", value: $itemsPerPage, in: 10...100, step: 10)
        }
    }
}

// MARK: - @StateObject / @ObservedObject pattern (iOS 16 compatible)
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
    // Child: @ObservedObject var viewModel: TimerViewModel

    var body: some View {
        Text(String(format: "%.1f", viewModel.elapsed))
            .monospacedDigit()
            .onAppear { viewModel.start() }
    }
}
```

### SwiftUI Animations

```swift
// MARK: - Spring animation with value binding
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

// MARK: - Keyframe animation (iOS 17+)
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

// MARK: - MatchedGeometryEffect for shared element transitions
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
                Text("Card Title")
                    .matchedGeometryEffect(id: "title", in: namespace)
                Text("Subtitle")
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

// ExpandedCard omitted for brevity (mirrors same matchedGeometryEffect ids)

// MARK: - Phase animator for sequential effects
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

### Swift Charts Integration

```swift
import Charts

// MARK: - Bar chart with grouped categories
struct SalesChart: View {
    let salesData: [Sale]

    var body: some View {
        Chart(salesData) {
            BarMark(
                x: .value("Month", $0.month, unit: .month),
                y: .value("Revenue", $0.revenue)
            )
            .foregroundStyle(by: .value("Category", $0.category))
            .position(by: .value("Category", $0.category))
        }
        .chartForegroundStyleScale([
            "Electronics": .blue,
            "Clothing": .green,
            "Food": .orange
        ])
        .chartXAxis {
            AxisMarks(values: .stride(by: .month)) { value in
                AxisValueLabel(format: .dateTime.month(.abbreviated))
            }
        }
    }
}

// MARK: - Line chart with multiple series and interactive overlay
struct StockChart: View {
    let series: [StockSeries]

    var body: some View {
        Chart {
            ForEach(series) { series in
                ForEach(series.prices) { price in
                    LineMark(
                        x: .value("Date", price.date),
                        y: .value("Price", price.close)
                    )
                }
                .foregroundStyle(by: .value("Symbol", series.symbol))
                .lineStyle(StrokeStyle(lineWidth: 2))
                .symbol(by: .value("Symbol", series.symbol))
            }

            // Rule mark showing average
            RuleMark(y: .value("Average", averagePrice))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))
                .foregroundStyle(.gray.opacity(0.6))
                .annotation(position: .trailing, alignment: .trailing) {
                    Text("Avg").font(.caption2).foregroundStyle(.secondary)
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

// MARK: - RectangleMark heatmap for activity calendar
struct ActivityHeatmap: View {
    let entries: [DayActivity]

    var body: some View {
        Chart(entries) {
            RectangleMark(
                x: .value("Weekday", $0.weekday),
                y: .value("Week", $0.weekOfYear)
            )
            .foregroundStyle(by: .value("Count", $0.count))
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
                x: .value("Height", $0.height),
                y: .value("Weight", $0.weight)
            )
            .foregroundStyle(by: .value("Category", $0.category))
            .symbolSize(by: .value("Confidence", $0.confidence))
        }
    }
}
```

### Advanced Patterns

```swift
// MARK: - PreferenceKey for measuring child size
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

// Usage: Text("Hello").measureSize($viewSize)

// MARK: - Custom Layout with Layout protocol
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

// Usage: CircularLayout(radius: 120) { ForEach(icons, id: \.self) { ... } }

// MARK: - ViewBuilder result builder for conditional composition
struct ConditionalView<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
    }
}

// MARK: - Environment values for custom theme
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

// MARK: - ScrollView with position tracking
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
                // Content
            }
        }
        .coordinateSpace(name: "scroll")
    }
}

// MARK: - Safe area aware layout
struct SafeAreaAwareView: View {
    @Environment(\.safeAreaInsets) private var safeAreaInsets

    var body: some View {
        HStack {
            Text("Bottom inset: \(safeAreaInsets.bottom)")
                .padding(.bottom, safeAreaInsets.bottom)
        }
        .frame(maxHeight: .infinity, alignment: .bottom)
    }
}
```

### Form and Input Patterns

```swift
// MARK: - Form with section headers and validation
struct ProfileForm: View {
    @State private var name = ""
    @State private var email = ""
    @State private var birthDate = Date()
    @State private var selectedCategory = ""
    @State private var agreeToTerms = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Personal Information") {
                    TextField("Full name", text: $name)
                        .textContentType(.name)

                    TextField("Email address", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                    DatePicker("Date of Birth",
                        selection: $birthDate,
                        displayedComponents: .date
                    )
                }

                Section("Preferences") {
                    Picker("Category", selection: $selectedCategory) {
                        Text("General").tag("general")
                        Text("Technology").tag("tech")
                        Text("Science").tag("science")
                    }
                }

                Section {
                    Toggle("I agree to the terms and conditions", isOn: $agreeToTerms)

                    Button(action: submitForm) {
                        Text("Save Profile")
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(!formValid)
                    .buttonStyle(.borderedProminent)
                }
            }
            .navigationTitle("Edit Profile")
        }
    }

    private var formValid: Bool {
        !name.isEmpty && !email.isEmpty && agreeToTerms
    }

    private func submitForm() { }
}

// MARK: - Multi-step wizard with tab selection
struct WizardStep: Identifiable {
    let id: Int
    let title: String
    let icon: String
}

struct WizardView: View {
    @State private var currentStep = 0
    let steps = [
        WizardStep(id: 0, title: "Details", icon: "1.circle"),
        WizardStep(id: 1, title: "Address", icon: "2.circle"),
        WizardStep(id: 2, title: "Payment", icon: "3.circle"),
        WizardStep(id: 3, title: "Confirm", icon: "4.circle"),
    ]

    var body: some View {
        VStack {
            // Step indicator
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
