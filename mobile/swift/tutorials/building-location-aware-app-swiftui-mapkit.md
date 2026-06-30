---
title: "Building a Location-Aware App with SwiftUI and MapKit"
description: "A hands-on tutorial on integrating MapKit and CoreLocation into a SwiftUI app, covering map display, annotations, user location tracking, and location-based search."
category: "mobile"
technology: "swift"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Location-Aware App with SwiftUI and MapKit

## Summary

Location awareness is a cornerstone of modern mobile applications. This tutorial walks through building a complete location-aware iOS app using SwiftUI, MapKit, and CoreLocation. You will implement interactive map views, place annotations, track the user's current location, perform point-of-interest searches, and handle location permissions — all following SwiftUI best practices and the MVVM architecture pattern.

## Target Audience

- iOS developers who have basic Swift and SwiftUI experience and want to add location features to their apps.
- Mobile developers familiar with UIKit who are transitioning to SwiftUI.
- Intermediate developers ready to learn about CoreLocation permissions, MapKit annotations, and region monitoring.

## Prerequisites

- Basic knowledge of Swift syntax and SwiftUI (views, state, `@State`, `@Binding`).
- Xcode 15+ installed on a Mac running macOS Sonoma or later.
- An iOS 17+ simulator or a physical iPhone/iPad for testing location features.
- Familiarity with the `Codable` protocol is helpful but not required.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Request and handle location authorization using `CLLocationManager`.
- Display an interactive map with `Map` and control the visible region.
- Add custom annotations and annotation markers to a map.
- Track the user's current location in real time.
- Perform natural-language point-of-interest searches using MKLocalSearch.
- Implement region monitoring for geofencing events.
- Structure location logic with the MVVM pattern using `@Observable`.

## Context and Motivation

Location services are everywhere. From ride-sharing apps that show nearby drivers to food delivery trackers and fitness apps that map a running route, location awareness has become an expected feature in modern iOS applications. Apple provides two core frameworks for this: **CoreLocation** handles the hardware-level positioning (GPS, Wi-Fi, Bluetooth, cellular) and permission management, while **MapKit** provides the mapping interface, annotations, and search capabilities.

Historically, location code was tangled in UIKit view controllers and delegate callbacks. SwiftUI and the modern `@Observable` pattern allow you to build clean, testable location services that are decoupled from your views. This tutorial shows you how to combine these frameworks into a well-architected location-aware app.

## Core Content

### 1. Project Setup and Architecture

Create a new iOS app in Xcode using the SwiftUI lifecycle with Swift. The project will follow an MVVM structure:

```text
LocationExplorer/
├── LocationExplorerApp.swift
├── Views/
│   ├── MapContentView.swift
│   └── SearchResultsView.swift
├── ViewModels/
│   └── LocationViewModel.swift
├── Models/
│   ├── PlaceAnnotation.swift
│   └── SearchResult.swift
├── Services/
│   └── LocationService.swift
└── Info.plist (added automatically)
```

### 2. Configuring Location Permissions

CoreLocation requires explicit user authorization. Add the following keys to your `Info.plist`:

- `NSLocationWhenInUseUsageDescription` — "This app needs your location to show nearby places."
- `NSLocationAlwaysAndWhenInUseUsageDescription` — only if you need background location access. For this tutorial, "when in use" suffices.

### 3. Creating the Location Service

The `LocationService` class wraps `CLLocationManager` and publishes location updates through an `AsyncStream` or a Combine publisher. Starting with iOS 17, the cleanest approach is using the `@Observable` macro:

```swift
import CoreLocation
import Observation

@Observable
final class LocationService: NSObject {
    var currentLocation: CLLocation?
    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    var error: Error?

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func requestAuthorization() {
        manager.requestWhenInUseAuthorization()
    }

    func startUpdatingLocation() {
        manager.startUpdatingLocation()
    }

    func stopUpdatingLocation() {
        manager.stopUpdatingLocation()
    }
}

extension LocationService: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        case .denied, .restricted:
            error = LocationError.permissionDenied
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager,
                         didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        currentLocation = location
    }

    func locationManager(_ manager: CLLocationManager,
                         didFailWithError error: Error) {
        self.error = error
    }
}

enum LocationError: LocalizedError {
    case permissionDenied
    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Location permission was denied. Enable it in Settings."
        }
    }
}
```

### 4. Building the Map View

SwiftUI's `Map` view (introduced in iOS 17) is declarative and composable. You control the visible region with a `@State` binding and add annotations directly in the view body:

```swift
import SwiftUI
import MapKit

struct MapContentView: View {
    @State private var viewModel = LocationViewModel()
    @State private var position: MapCameraPosition = .userLocation(fallback: .automatic)

    var body: some View {
        Map(position: $position) {
            // User location annotation (blue dot)
            UserAnnotation()

            // Custom point-of-interest annotations
            ForEach(viewModel.searchResults) { result in
                Annotation(
                    result.name,
                    coordinate: result.coordinate,
                    anchor: .bottom
                ) {
                    MarkerLabel(result: result)
                }
            }
        }
        .mapControls {
            MapUserLocationButton()
            MapCompass()
            MapScaleView()
        }
        .onAppear {
            viewModel.requestAuthorization()
        }
    }
}

struct MarkerLabel: View {
    let result: SearchResult

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: "mappin.circle.fill")
                .font(.title2)
                .foregroundStyle(.red)
            Text(result.name)
                .font(.caption2)
                .fixedSize()
        }
    }
}
```

The `MapUserLocationButton` provides a built-in control to center the map on the user's location, while `MapCompass` and `MapScaleView` add essential navigation aids without any additional code.

### 5. Location-Aware ViewModel

The `LocationViewModel` mediates between the location service and the view, holding all state as `@Observable` properties:

```swift
import Observation
import MapKit

@Observable
final class LocationViewModel: NSObject {
    var searchResults: [SearchResult] = []
    var selectedResult: SearchResult?
    var searchQuery = ""
    var isSearching = false
    var errorMessage: String?
    var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )

    private let locationService = LocationService()

    override init() {
        super.init()
        locationService.currentLocation
    }

    func requestAuthorization() {
        locationService.requestAuthorization()
    }

    func centerOnUser() {
        guard let loc = locationService.currentLocation else { return }
        region.center = loc.coordinate
    }

    func searchNearby(query: String) {
        guard !query.isEmpty else { return }
        isSearching = true
        let center = locationService.currentLocation?.coordinate ?? region.center
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.region = MKCoordinateRegion(
            center: center,
            span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
        )

        let search = MKLocalSearch(request: request)
        Task {
            do {
                let response = try await search.start()
                searchResults = response.mapItems.map { item in
                    SearchResult(
                        name: item.name ?? "Unknown",
                        coordinate: item.placemark.coordinate,
                        phoneNumber: item.phoneNumber,
                        url: item.url,
                        address: item.placemark.title ?? ""
                    )
                }
                isSearching = false
            } catch {
                errorMessage = "Search failed: \(error.localizedDescription)"
                isSearching = false
            }
        }
    }
}
```

### 6. Point-of-Interest Search with MKLocalSearch

`MKLocalSearch` is Apple's built-in point-of-interest search engine. It operates asynchronously and returns `MKMapItem` results that include names, coordinates, phone numbers, URLs, and address details. The search request accepts a natural language query such as "coffee", "restaurants", or "gas stations" and scopes the search to a geographic region:

```swift
import MapKit

struct SearchResult: Identifiable {
    let id = UUID()
    let name: String
    let coordinate: CLLocationCoordinate2D
    let phoneNumber: String?
    let url: URL?
    let address: String
}
```

### 7. Region Monitoring (Geofencing)

Geofencing allows your app to trigger events when the user enters or exits a defined region. CoreLocation supports circular regions with a minimum radius of approximately 100 meters:

```swift
extension LocationService {
    func startMonitoringRegion(at coordinate: CLLocationCoordinate2D,
                               radius: CLLocationDistance = 200,
                               identifier: String = "monitoredRegion") {
        let region = CLCircularRegion(
            center: coordinate,
            radius: radius,
            identifier: identifier
        )
        region.notifyOnEntry = true
        region.notifyOnExit = true
        manager.startMonitoring(for: region)
    }
}
```

Handle region events in the delegate:

```swift
func locationManager(_ manager: CLLocationManager,
                     didEnterRegion region: CLRegion) {
    NotificationCenter.default.post(
        name: .didEnterRegion,
        object: region.identifier
    )
}
```

## Code Examples

### Complete App Entry Point

```swift
import SwiftUI

@main
struct LocationExplorerApp: App {
    var body: some Scene {
        WindowGroup {
            MapContentView()
        }
    }
}
```

### Search Results Sheet

```swift
struct SearchResultsView: View {
    let results: [SearchResult]
    let onSelect: (SearchResult) -> Void

    var body: some View {
        List(results) { result in
            Button {
                onSelect(result)
            } label: {
                VStack(alignment: .leading) {
                    Text(result.name)
                        .font(.headline)
                    if !result.address.isEmpty {
                        Text(result.address)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}
```

### Putting It All Together

The complete app flow works as follows:

1. On launch, `LocationViewModel.requestAuthorization()` triggers the system permission dialog.
2. After authorization, `CLLocationManager` begins delivering location updates to the delegate.
3. The `MapContentView` renders an interactive map centered on the user's location.
4. The user types a query (e.g., "coffee") into a search field.
5. `searchNearby(query:)` performs an `MKLocalSearch` scoped to the current region.
6. Results appear as custom `Annotation` markers on the map.
7. Tapping a marker shows a detail sheet with the name, address, and phone number.

## Key Insights

- **Always request location authorization explicitly** — do not assume it is already granted. Handle `.denied` and `.restricted` states gracefully by showing a descriptive alert.
- **Use `@Observable` for location state** — the macro automatically publishes changes, making your views reactive without Combine or `@Published` boilerplate.
- **Prefer `MapCameraPosition` over direct region binding** — it gives you built-in user-location centering and smooth camera transitions.
- **MKLocalSearch is free and requires no API key** — unlike Google Maps or Foursquare, Apple's search uses the Maps service that ships with every device.
- **Geofencing has a minimum radius of ~100 meters** — regions smaller than this are silently adjusted upward. Test on a physical device, as the simulator has limited region-monitoring support.
- **Test on a real device** — the simulator can simulate locations via the Features → Location menu, but CoreLocation accuracy, power consumption, and region monitoring behave differently on hardware.

## Next Steps

- Explore `MapPolyline` and `MapPolygon` overlays to draw custom shapes (e.g., walking routes, heat maps).
- Learn about `CLVisit` monitoring for automatic location-based check-ins.
- Integrate a server-side API (like FourSquare or Yelp) for richer POI data beyond what `MKLocalSearch` provides.
- Check the [Swift iOS Best Practices Guide](../guides/swift-ios-best-practices-guide.md) for architecture patterns, memory management, and testing strategies.
- Follow the [iOS Development Syllabus](../syllabi/ios-development-syllabus.md) for a complete 12-week learning path.

## Conclusion

In this tutorial you built a fully functional location-aware iOS app using SwiftUI, MapKit, and CoreLocation. You learned how to request location permissions, display interactive maps, track user location, search for nearby points of interest, and monitor geographic regions. By structuring the location logic with the `@Observable` pattern and separating concerns into a service and view model, you have a clean, reusable foundation that can be extended into production apps like delivery trackers, travel guides, or social check-in platforms.
