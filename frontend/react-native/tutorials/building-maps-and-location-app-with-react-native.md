---
title: "Building a Maps and Location-Aware App with React Native"
description: "A comprehensive tutorial on building a React Native app with interactive maps, real-time location tracking, geocoding, and place search using Expo, react-native-maps, and expo-location."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Maps and Location-Aware App with React Native

## Summary

This tutorial walks you through building a fully functional location-aware mobile application with React Native. You will learn how to integrate interactive maps, request and track user location, display custom markers, perform geocoding, and implement place search — all using Expo, `react-native-maps`, and `expo-location`. By the end, you will have a "Nearby Places" explorer app that shows points of interest around the user's current location.

## Target Audience

- Mobile developers looking to add maps and location features to React Native apps.
- Frontend or full-stack developers familiar with React Native basics who want to explore device APIs.
- Expected developer level: Intermediate — comfortable with JavaScript/TypeScript and React Native fundamentals.

## Prerequisites

- Basic knowledge of JavaScript (ES6+ syntax, async/await, Promises).
- Familiarity with React Native components and hooks (`useState`, `useEffect`).
- Node.js (v18 or later) installed on your development machine.
- An Expo Go app installed on your iOS or Android device — or a simulator/emulator configured.
- A physical device for location testing (simulators can simulate locations but GPS accuracy varies).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Initialize an Expo project with maps and location dependencies.
- Request and handle location permissions on both iOS and Android.
- Display an interactive map using `react-native-maps`.
- Track the user's real-time location with `expo-location`.
- Place custom markers and callouts on the map.
- Perform forward and reverse geocoding using the Google Maps Geocoding API or Mapbox.
- Implement place search with autocomplete suggestions.
- Build a complete "Nearby Places" finder application.

## Context and Motivation

Location awareness is a cornerstone of modern mobile applications. From food delivery and ride-hailing to travel guides and social check-ins, understanding where the user is — and what is around them — unlocks a vast range of user experiences.

React Native, through Expo's ecosystem of APIs, provides excellent support for building location-aware apps. However, integrating maps, permissions, geocoding, and search in a cohesive manner requires careful orchestration. This tutorial bridges the gap between individual API reference pages and a real-world application by guiding you through the complete end-to-end build of a "Nearby Places" explorer.

The skills you learn here — location permissions handling, map rendering, marker management, geocoding, and place search — transfer directly to production apps in domains like travel, logistics, social networking, and local commerce.

## Core Content

### Setting Up the Project with Expo

Start by creating a new Expo project. We will use the blank TypeScript template for better type safety:

```bash
npx create-expo-app@latest NearbyPlaces --template blank-typescript
cd NearbyPlaces
```

Install the core dependencies for maps, location, and UI:

```bash
npx expo install react-native-maps expo-location expo-constants
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```

- **`react-native-maps`** — Provides the interactive map component (Apple Maps on iOS, Google Maps on Android by default).
- **`expo-location`** — Handles location permissions, GPS coordinates, and geocoding via native platform APIs.
- **`expo-constants`** — Provides access to the app manifest, where we will store the Google Maps API key for Android.
- **`@react-navigation/native`** — Used for screen navigation between the map view and the place detail screens.

> **Note**: On Android, `react-native-maps` requires a Google Maps API key. Create a project in the [Google Cloud Console](https://console.cloud.google.com), enable the Maps SDK for Android, generate an API key, and add it to `app.json` under `expo.android.config.googleMaps.apiKey`. On iOS, Apple Maps works out of the box with no API key — Google Maps on iOS requires a separate configuration.

### Configuring app.json

Update your `app.json` with the Google Maps API key for Android and permissions for location access:

```json
{
  "expo": {
    "name": "NearbyPlaces",
    "slug": "nearby-places",
    "version": "1.0.0",
    "orientation": "portrait",
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs your location to show nearby places and provide directions.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app needs your location to offer continuous place recommendations."
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow NearbyPlaces to use your location.",
          "locationWhenInUsePermission": "Allow NearbyPlaces to use your location."
        }
      ]
    ]
  }
}
```

Replace `YOUR_GOOGLE_MAPS_API_KEY` with a real API key from the Google Cloud Console. The iOS `infoPlist` entries are automatically added by Expo when using the `expo-location` plugin, but defining them explicitly ensures they use your custom message.

### Requesting Location Permissions

Before accessing the user's location, you must request permission at runtime. Modern mobile operating systems require explicit user consent for location data. On Android 12+, there are two granular levels: approximate location (coarse) and precise location (fine). Always request the minimum level your feature needs.

Create a permission utility:

```typescript
// src/utils/location.ts
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Request foreground location permission.
 * Returns 'granted' if permission was given, 'denied' otherwise.
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status === 'granted') {
    return 'granted';
  }

  if (status === 'denied') {
    Alert.alert(
      'Location Permission Required',
      'This app needs location access to show places near you. Please enable it in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return 'denied';
  }

  return 'undetermined';
}

/**
 * Check current permission status without prompting.
 */
export async function checkLocationPermission(): Promise<LocationPermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status as LocationPermissionStatus;
}
```

Always handle the `denied` case gracefully. If the user denies permission, show a clear explanation of why the feature needs location and provide a button to open system Settings. On iOS, once denied, the system will not re-prompt automatically — the user must go to Settings manually.

### Getting the User's Current Location

With permission granted, you can obtain the user's current position. `expo-location` provides two approaches:

- **`getCurrentPositionAsync`** — A one-shot request that returns the current GPS coordinates.
- **`watchPositionAsync`** — Continuously streams location updates as the user moves.

For our app, we will use `getCurrentPositionAsync` for the initial map center and `watchPositionAsync` to update the map when the user moves significantly.

```typescript
// src/hooks/useUserLocation.ts
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface UserLocation {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  errorMsg: string | null;
  isLoading: boolean;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;

    async function startWatching() {
      try {
        // Get initial position
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
          altitude: initial.coords.altitude,
          accuracy: initial.coords.accuracy,
        });
        setIsLoading(false);

        // Subscribe to continuous updates
        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,    // Update every 5 seconds
            distanceInterval: 10,  // Or every 10 meters
          },
          (newLocation) => {
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              altitude: newLocation.coords.altitude,
              accuracy: newLocation.coords.accuracy,
            });
          }
        );
      } catch (error: any) {
        setErrorMsg(error.message || 'Failed to get location');
        setIsLoading(false);
      }
    }

    startWatching();

    return () => {
      if (watcher) {
        watcher.remove();
      }
    };
  }, []);

  return { location, errorMsg, isLoading };
}
```

The `accuracy` parameter controls the trade-off between precision and battery life:

| Accuracy Level         | Use Case                                      | Battery Impact |
|------------------------|-----------------------------------------------|----------------|
| `Location.Accuracy.Highest` | Navigation, turn-by-turn directions          | High           |
| `Location.Accuracy.Balanced` | Nearby places, general location               | Medium         |
| `Location.Accuracy.Low`     | Weather data, city-level features             | Low            |

For a "Nearby Places" app, `Balanced` provides sufficient precision without draining the battery.

### Displaying the Map

The `MapView` component from `react-native-maps` renders an interactive map. It supports gestures (pan, zoom, rotate), markers, polylines, and overlays.

Create the main map screen:

```typescript
// src/screens/MapScreen.tsx
import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useUserLocation } from '../hooks/useUserLocation';
import { requestLocationPermission } from '../utils/location';

export default function MapScreen() {
  const { location, errorMsg, isLoading } = useUserLocation();
  const [region, setRegion] = React.useState<Region | null>(null);

  React.useEffect(() => {
    async function init() {
      const perm = await requestLocationPermission();
      if (perm !== 'granted') {
        return;
      }
    }
    init();
  }, []);

  React.useEffect(() => {
    if (location && !region) {
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [location]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {errorMsg}</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
```

Key props on `MapView`:

- **`provider`** — Set to `PROVIDER_GOOGLE` to use Google Maps (required for markers with custom images, heatmaps, and indoor maps on both platforms). Omitting this uses Apple Maps on iOS and Google Maps on Android.
- **`showsUserLocation`** — Displays a blue dot representing the user's current position.
- **`showsMyLocationButton`** — Shows a button that centers the map on the user's location.
- **`region`** — A controlled region object with `latitude`, `longitude`, `latitudeDelta`, and `longitudeDelta` (span in degrees). Setting this programmatically moves and zooms the map.

### Adding Markers and Callouts

Markers indicate points of interest on the map. You can customize their appearance, add labels, and attach callout popups.

Create a marker component for nearby places:

```typescript
// src/components/PlaceMarker.tsx
import React from 'react';
import { Marker, Callout } from 'react-native-maps';
import { View, Text, StyleSheet, Image } from 'react-native';

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  rating?: number;
  vicinity?: string;
}

interface PlaceMarkerProps {
  place: Place;
  onPress: (place: Place) => void;
}

export default function PlaceMarker({ place, onPress }: PlaceMarkerProps) {
  return (
    <Marker
      coordinate={{
        latitude: place.latitude,
        longitude: place.longitude,
      }}
      title={place.name}
      description={place.vicinity}
      onPress={() => onPress(place)}
      pinColor={getMarkerColor(place.category)}
    >
      <Callout>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{place.name}</Text>
          {place.vicinity && (
            <Text style={styles.calloutAddress}>{place.vicinity}</Text>
          )}
          {place.rating && (
            <Text style={styles.calloutRating}>
              ⭐ {place.rating.toFixed(1)}
            </Text>
          )}
        </View>
      </Callout>
    </Marker>
  );
}

function getMarkerColor(category: string): string {
  const colors: Record<string, string> = {
    restaurant: '#FF6B6B',
    cafe: '#D4A574',
    park: '#4CAF50',
    museum: '#9C27B0',
    shop: '#FF9800',
    hospital: '#F44336',
    school: '#2196F3',
  };
  return colors[category.toLowerCase()] ?? '#007AFF';
}
```

The `Callout` component renders a custom popup when the marker is tapped. Keep callouts small and informational — they are not meant for complex interactions. For a detail view, navigate to a separate screen.

To render multiple markers, map over an array of places:

```typescript
{places.map((place) => (
  <PlaceMarker
    key={place.id}
    place={place}
    onPress={(p) => navigation.navigate('PlaceDetail', { place: p })}
  />
))}
```

### Reverse Geocoding — From Coordinates to Addresses

Reverse geocoding converts latitude and longitude into a human-readable address. `expo-location` provides a built-in reverse geocoder that uses the platform's native services (Apple's CLGeocoder on iOS, Android's Geocoder on Android).

```typescript
// src/utils/geocoding.ts
import * as Location from 'expo-location';

interface GeocodedAddress {
  street: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postalCode: string | null;
  formattedAddress: string | null;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodedAddress | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (results.length === 0) {
      return null;
    }

    const address = results[0];
    const parts = [
      address.street,
      address.city,
      address.region,
      address.postalCode,
      address.country,
    ].filter(Boolean);

    return {
      street: address.street ?? null,
      city: address.city ?? null,
      region: address.region ?? null,
      country: address.country ?? null,
      postalCode: address.postalCode ?? null,
      formattedAddress: parts.join(', '),
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * Get a human-readable address string from coordinates.
 */
export async function getAddressFromCoords(
  latitude: number,
  longitude: number
): Promise<string> {
  const address = await reverseGeocode(latitude, longitude);
  return address?.formattedAddress ?? 'Unknown location';
}
```

Combine this with a long-press gesture on the map to drop a pin and show its address:

```typescript
<MapView
  onLongPress={async (event) => {
    const { coordinate } = event.nativeEvent;
    const address = await getAddressFromCoords(
      coordinate.latitude,
      coordinate.longitude
    );
    Alert.alert('Pinned Location', address);
  }}
/>
```

### Forward Geocoding — Searching for Places

Forward geocoding (also called geocoding) converts a textual address or place name into coordinates. While `expo-location` does not offer forward geocoding directly, you can use the Google Maps Geocoding API via a simple fetch.

```typescript
// src/utils/geocoding.ts (continued)

const GOOGLE_GEOCODING_API = 'https://maps.googleapis.com/maps/api/geocode/json';

interface GeocodedPlace {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Forward geocode a search query into coordinates.
 * Requires a valid Google Maps API key stored in app.json constants.
 */
export async function forwardGeocode(
  query: string,
  apiKey: string
): Promise<GeocodedPlace[]> {
  const url = `${GOOGLE_GEOCODING_API}?address=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.warn('Geocoding API error:', data.status);
      return [];
    }

    return data.results.map((result: any) => ({
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    }));
  } catch (error) {
    console.error('Forward geocoding failed:', error);
    return [];
  }
}
```

For production, consider using the Expo `expo-location` forward geocoding plugin or a more feature-rich SDK like Mapbox. The Google Maps Geocoding API has usage quotas (typically 40,000 requests per month on the free tier), so cache results aggressively.

### Building the "Nearby Places" App

Now let's bring everything together into a complete application. The app will:

1. Request location permission on launch.
2. Show a map centered on the user's location.
3. Fetch nearby places using the Google Places API (or a mock dataset for development).
4. Display markers for each place.
5. Allow tapping a marker to see details in a bottom sheet or detail screen.
6. Provide a search bar to find specific places.

Create the navigation structure:

```typescript
// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapScreen from './src/screens/MapScreen';
import PlaceDetailScreen from './src/screens/PlaceDetailScreen';

export type RootStackParamList = {
  Map: undefined;
  PlaceDetail: { place: Place };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{ title: 'Nearby Places', headerLargeTitle: true }}
        />
        <Stack.Screen
          name="PlaceDetail"
          component={PlaceDetailScreen}
          options={({ route }) => ({ title: route.params.place.name })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

The search functionality can live in a search bar overlay on the map screen:

```typescript
// src/components/SearchBar.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { forwardGeocode } from '../utils/geocoding';
import Constants from 'expo-constants';

interface SearchBarProps {
  onPlaceSelected: (lat: number, lng: number, name: string) => void;
}

export default function SearchBar({ onPlaceSelected }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChangeText = (text: string) => {
    setQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const geocoded = await forwardGeocode(
        text,
        Constants.expoConfig?.extra?.googleMapsApiKey ?? ''
      );
      setResults(geocoded);
      setIsSearching(false);
    }, 500);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for a place..."
        value={query}
        onChangeText={handleChangeText}
        returnKeyType="search"
      />
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(_, index) => String(index)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => {
                  onPlaceSelected(
                    item.latitude,
                    item.longitude,
                    item.formattedAddress
                  );
                  setQuery(item.formattedAddress);
                  setResults([]);
                }}
              >
                <Text style={styles.resultText}>{item.formattedAddress}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  resultsContainer: {
    backgroundColor: 'white',
    marginTop: 4,
    borderRadius: 12,
    maxHeight: 200,
    overflow: 'hidden',
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
  },
});
```

The detail screen shows information about a selected place:

```typescript
// src/screens/PlaceDetailScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceDetail'>;

export default function PlaceDetailScreen({ route }: Props) {
  const { place } = route.params;

  const openInMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: place.latitude,
            longitude: place.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            title={place.name}
          />
        </MapView>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{place.name}</Text>
        {place.vicinity && (
          <Text style={styles.address}>{place.vicinity}</Text>
        )}
        {place.rating && (
          <Text style={styles.rating}>Rating: {place.rating.toFixed(1)} ⭐</Text>
        )}

        <View style={styles.actions}>
          <Text style={styles.actionLink} onPress={openInMaps}>
            Get Directions
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  mapContainer: { height: 250 },
  map: { width: '100%', height: '100%' },
  infoContainer: { padding: 20 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  address: { fontSize: 16, color: '#666', marginBottom: 8 },
  rating: { fontSize: 16, color: '#333', marginBottom: 16 },
  actions: { marginTop: 16 },
  actionLink: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
  },
});
```

### Testing Location Features

Testing location features requires some setup since GPS data is not available in standard simulators out of the box:

- **iOS Simulator**: Use `Debug > Location > Custom Location...` in the simulator menu bar. Enter lat/lng values manually, or use a GPX file for route simulation.
- **Android Emulator**: Open the extended controls (`...` button in the emulator toolbar) and navigate to `Location`. You can set a single point or play a GPX route.
- **Physical Device**: Run the Expo Go app on your device. GPS provides real location data.
- **Expo Go**: Use `expo-location` with physical devices for the most accurate GPS results. When testing on a simulator, the location falls back to the simulator's configured coordinates.

## Code Examples

### Complete Map Screen with Markers and Search

Here is the full integration of markers, search, and location tracking in a single map screen:

```typescript
// src/screens/MapScreen.tsx (full version)
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Callout, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useUserLocation } from '../hooks/useUserLocation';
import { requestLocationPermission } from '../utils/location';
import { getAddressFromCoords } from '../utils/geocoding';
import SearchBar from '../components/SearchBar';
import PlaceMarker from '../components/PlaceMarker';

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  rating?: number;
  vicinity?: string;
}

// Mock data for development — replace with Google Places API in production
const SAMPLE_PLACES: Place[] = [
  { id: '1', name: 'Central Park', latitude: 40.785091, longitude: -73.968285, category: 'park', rating: 4.8, vicinity: 'New York, NY 10024' },
  { id: '2', name: 'The Metropolitan Museum of Art', latitude: 40.779437, longitude: -73.963244, category: 'museum', rating: 4.7, vicinity: '1000 5th Ave, New York, NY' },
  { id: '3', name: 'Joe Coffee', latitude: 40.782864, longitude: -73.965355, category: 'cafe', rating: 4.3, vicinity: '1412 6th Ave, New York, NY' },
];

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const { location, errorMsg, isLoading } = useUserLocation();
  const [region, setRegion] = useState<Region | null>(null);
  const [places] = useState<Place[]>(SAMPLE_PLACES);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (location && !region) {
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [location]);

  const handlePlaceSelected = useCallback(
    (lat: number, lng: number, name: string) => {
      setRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    },
    []
  );

  const handleMarkerPress = useCallback((place: Place) => {
    setSelectedPlace(place);
    navigation.navigate('PlaceDetail', { place });
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar onPlaceSelected={handlePlaceSelected} />
      {region && (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          onLongPress={async (event) => {
            const { coordinate } = event.nativeEvent;
            const address = await getAddressFromCoords(
              coordinate.latitude,
              coordinate.longitude
            );
            Alert.alert('Location Pinned', address);
          }}
        >
          {places.map((place) => (
            <PlaceMarker
              key={place.id}
              place={place}
              onPress={handleMarkerPress}
            />
          ))}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorText: { fontSize: 16, color: '#FF3B30', textAlign: 'center' },
});
```

### Nearby Places API Integration

For a production app, replace the sample data with the Google Places API — Nearby Search endpoint:

```typescript
// src/api/places.ts
const GOOGLE_PLACES_API = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

interface PlacesApiResult {
  results: Place[];
  error?: string;
}

export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  radius: number = 1000,
  apiKey: string
): Promise<PlacesApiResult> {
  const url = `${GOOGLE_PLACES_API}?location=${latitude},${longitude}&radius=${radius}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return { results: [], error: `Places API error: ${data.status}` };
    }

    const results: Place[] = (data.results || []).map((item: any) => ({
      id: item.place_id,
      name: item.name,
      latitude: item.geometry.location.lat,
      longitude: item.geometry.location.lng,
      category: item.types?.[0] ?? 'generic',
      rating: item.rating ?? undefined,
      vicinity: item.vicinity ?? undefined,
    }));

    return { results };
  } catch (error) {
    return { results: [], error: 'Network error fetching nearby places' };
  }
}
```

## Key Insights

- **Always request the minimum permission level** your feature needs. Using `WhenInUse` (foreground only) is less intrusive than `Always` (background) and is more likely to be approved by users. Only request `Always` if your app genuinely needs background location (e.g., geofencing, fitness tracking).
- **Handle permission denial gracefully**. On iOS, once a user denies permission, the system will not re-prompt. Show a clear explanation and a button to navigate to Settings. Check permission status on app resume in case the user changed it externally.
- **Use `distanceInterval` over `timeInterval`** for location watching when movement precision matters. Setting `distanceInterval: 10` meters is more battery-friendly than a tight `timeInterval` because it only fires when the user actually moves.
- **Cache geocoding results aggressively**. The Google Geocoding API has a free tier of 40,000 requests/month. Cache reverse geocoded addresses by coordinate pairs in `AsyncStorage` to reduce API calls and improve perceived performance.
- **Test with simulated locations but verify on real devices**. Simulators can provide location data, but GPS accuracy, permission flows, and map rendering differ significantly on physical devices. Always test location features on a real phone before shipping.
- **Region `latitudeDelta` and `longitudeDelta`** control the zoom level. A smaller `latitudeDelta` value means a closer zoom. The ratio between `latitudeDelta` and `longitudeDelta` should roughly equal the aspect ratio of the map container to avoid distortion. For a typical mobile screen, `latitudeDelta: 0.05` provides a city-block-level zoom.
- **Google Maps on Android requires an API key** while Apple Maps on iOS works without one. If you use `PROVIDER_GOOGLE` on both platforms, both need API key configuration. If you omit the provider, iOS uses Apple Maps and Android uses Google Maps (requiring the key only on Android).
- **Avoid re-creating the MapView component** when its props change — remounting the map causes a visual flash and resets the gesture state. Use controlled props like `region` and `onRegionChangeComplete` instead of unmounting and remounting.

## Next Steps

- Explore **MapView advanced features**: polylines for route display, polygons for areas, heatmaps for density visualization, and `AnimatedRegion` for smooth marker transitions.
- Learn about **background location tracking** with `expo-task-manager` and `expo-background-fetch` for geofencing and location-based reminders.
- Integrate **navigation SDKs** like Mapbox or Google Navigation for turn-by-turn directions within your app.
- Add **offline maps support** by caching map tiles with `react-native-maps` TileOverlay or using Mapbox's offline tile storage.
- Follow the **React Native Development Syllabus** for a structured learning path covering all aspects of React Native development.
- Check the **React Native Performance and Debugging Guide** for tips on optimizing map rendering and location polling in production.

## Conclusion

Congratulations! You have built a fully functional location-aware React Native application with interactive maps, real-time location tracking, custom markers, geocoding, and place search. You now understand how to:

- Configure and request location permissions for both iOS and Android.
- Display interactive maps with `react-native-maps`.
- Track user location with `expo-location` using both one-shot and continuous watching strategies.
- Display custom markers with callouts and category-based color coding.
- Perform reverse geocoding to convert coordinates into addresses.
- Implement forward geocoding and place search to find locations by name.
- Integrate the Google Places API for nearby place discovery.

These skills are directly applicable to a wide range of production applications — from travel and food delivery to social networking and logistics. The patterns you have learned here (permission handling, location watching, map rendering, geocoding, search) form the foundation of virtually every location-aware mobile app on the market.
