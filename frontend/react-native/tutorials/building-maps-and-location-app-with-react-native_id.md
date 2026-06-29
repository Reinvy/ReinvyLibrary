---
title: "Membangun Aplikasi Maps dan Lokasi dengan React Native"
description: "Tutorial komprehensif untuk membangun aplikasi React Native dengan peta interaktif, pelacakan lokasi real-time, geocoding, dan pencarian tempat menggunakan Expo, react-native-maps, dan expo-location."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Maps dan Lokasi dengan React Native

## Ringkasan

Tutorial ini memandu Anda dalam membangun aplikasi mobile berbasis lokasi yang fungsional dengan React Native. Anda akan mempelajari cara mengintegrasikan peta interaktif, meminta dan melacak lokasi pengguna, menampilkan penanda khusus, melakukan geocoding, dan mengimplementasikan pencarian tempat — semuanya menggunakan Expo, `react-native-maps`, dan `expo-location`. Pada akhirnya, Anda akan memiliki aplikasi penjelajah "Tempat di Sekitar" yang menampilkan titik-titik menarik di sekitar lokasi pengguna.

## Target Audiens

- Pengembang mobile yang ingin menambahkan fitur peta dan lokasi ke aplikasi React Native.
- Pengembang frontend atau full-stack yang sudah familiar dengan dasar-dasar React Native dan ingin mengeksplorasi API perangkat.
- Ekspektasi tingkat kemampuan pembaca: Menengah — nyaman dengan JavaScript/TypeScript dan dasar-dasar React Native.

## Prasyarat

- Pengetahuan dasar JavaScript (sintaks ES6+, async/await, Promises).
- Keakraban dengan komponen dan hooks React Native (`useState`, `useEffect`).
- Node.js (v18 atau lebih baru) terinstal di mesin pengembangan Anda.
- Aplikasi Expo Go terinstal di perangkat iOS atau Android Anda — atau simulator/emulator yang sudah dikonfigurasi.
- Perangkat fisik untuk pengujian lokasi (simulator dapat menyimulasikan lokasi tetapi akurasi GPS bervariasi).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginisialisasi proyek Expo dengan dependensi peta dan lokasi.
- Meminta dan menangani izin lokasi di iOS dan Android.
- Menampilkan peta interaktif menggunakan `react-native-maps`.
- Melacak lokasi pengguna secara real-time dengan `expo-location`.
- Menempatkan penanda khusus dan callout pada peta.
- Melakukan geocoding maju dan mundur menggunakan Google Maps Geocoding API atau Mapbox.
- Mengimplementasikan pencarian tempat dengan saran autocomplete.
- Membangun aplikasi penjelajah "Tempat di Sekitar" yang lengkap.

## Konteks dan Motivasi

Kesadaran lokasi adalah fondasi dari aplikasi mobile modern. Dari pengantaran makanan dan pemesanan kendaraan hingga panduan perjalanan dan check-in sosial, mengetahui di mana pengguna berada — dan apa yang ada di sekitar mereka — membuka berbagai macam pengalaman pengguna.

React Native, melalui ekosistem API Expo, menyediakan dukungan yang sangat baik untuk membangun aplikasi berbasis lokasi. Namun, mengintegrasikan peta, izin, geocoding, dan pencarian secara kohesif membutuhkan orkestrasi yang hati-hati. Tutorial ini menjembatani kesenjangan antara halaman referensi API individual dan aplikasi dunia nyata dengan memandu Anda melalui pembangunan aplikasi penjelajah "Tempat di Sekitar" secara end-to-end.

Keterampilan yang Anda pelajari di sini — penanganan izin lokasi, rendering peta, manajemen penanda, geocoding, dan pencarian tempat — dapat ditransfer langsung ke aplikasi produksi di domain seperti perjalanan, logistik, jejaring sosial, dan perdagangan lokal.

## Konten Inti

### Menyiapkan Proyek dengan Expo

Mulailah dengan membuat proyek Expo baru. Kita akan menggunakan template blank TypeScript untuk keamanan tipe yang lebih baik:

```bash
npx create-expo-app@latest TempatDiSekitar --template blank-typescript
cd TempatDiSekitar
```

Instal dependensi inti untuk peta, lokasi, dan UI:

```bash
npx expo install react-native-maps expo-location expo-constants
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```

- **`react-native-maps`** — Menyediakan komponen peta interaktif (Apple Maps di iOS, Google Maps di Android secara default).
- **`expo-location`** — Menangani izin lokasi, koordinat GPS, dan geocoding melalui API platform native.
- **`expo-constants`** — Menyediakan akses ke manifes aplikasi, tempat kita akan menyimpan kunci API Google Maps untuk Android.
- **`@react-navigation/native`** — Digunakan untuk navigasi layar antara tampilan peta dan layar detail tempat.

> **Catatan**: Di Android, `react-native-maps` memerlukan kunci API Google Maps. Buat proyek di [Google Cloud Console](https://console.cloud.google.com), aktifkan Maps SDK untuk Android, buat kunci API, dan tambahkan ke `app.json` di bawah `expo.android.config.googleMaps.apiKey`. Di iOS, Apple Maps berfungsi langsung tanpa kunci API — Google Maps di iOS memerlukan konfigurasi terpisah.

### Mengonfigurasi app.json

Perbarui `app.json` Anda dengan kunci API Google Maps untuk Android dan izin untuk akses lokasi:

```json
{
  "expo": {
    "name": "TempatDiSekitar",
    "slug": "tempat-di-sekitar",
    "version": "1.0.0",
    "orientation": "portrait",
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Aplikasi ini membutuhkan lokasi Anda untuk menampilkan tempat di sekitar dan memberikan petunjuk arah.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Aplikasi ini membutuhkan lokasi Anda untuk memberikan rekomendasi tempat secara berkelanjutan."
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "KUNCI_API_GOOGLE_MAPS_ANDA"
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
          "locationAlwaysAndWhenInUsePermission": "Izinkan TempatDiSekitar menggunakan lokasi Anda.",
          "locationWhenInUsePermission": "Izinkan TempatDiSekitar menggunakan lokasi Anda."
        }
      ]
    ]
  }
}
```

Ganti `KUNCI_API_GOOGLE_MAPS_ANDA` dengan kunci API nyata dari Google Cloud Console. Entri `infoPlist` iOS otomatis ditambahkan oleh Expo saat menggunakan plugin `expo-location`, tetapi mendefinisikannya secara eksplisit memastikan mereka menggunakan pesan khusus Anda.

### Meminta Izin Lokasi

Sebelum mengakses lokasi pengguna, Anda harus meminta izin saat runtime. Sistem operasi mobile modern mengharuskan persetujuan eksplisit pengguna untuk data lokasi. Di Android 12+, ada dua tingkat granular: lokasi perkiraan (kasar) dan lokasi presisi (halus). Selalu minta tingkat minimum yang dibutuhkan fitur Anda.

Buat utilitas izin:

```typescript
// src/utils/location.ts
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Meminta izin lokasi latar depan.
 * Mengembalikan 'granted' jika izin diberikan, 'denied' jika ditolak.
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status === 'granted') {
    return 'granted';
  }

  if (status === 'denied') {
    Alert.alert(
      'Izin Lokasi Diperlukan',
      'Aplikasi ini membutuhkan akses lokasi untuk menampilkan tempat di sekitar Anda. Silakan aktifkan di Pengaturan.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
      ]
    );
    return 'denied';
  }

  return 'undetermined';
}

/**
 Memeriksa status izin saat ini tanpa meminta.
 */
export async function checkLocationPermission(): Promise<LocationPermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status as LocationPermissionStatus;
}
```

Selalu tangani kasus `denied` dengan baik. Jika pengguna menolak izin, tampilkan penjelasan yang jelas tentang mengapa fitur membutuhkan lokasi dan sediakan tombol untuk membuka Pengaturan sistem. Di iOS, setelah ditolak, sistem tidak akan meminta ulang secara otomatis — pengguna harus pergi ke Pengaturan secara manual.

### Mendapatkan Lokasi Pengguna Saat Ini

Setelah izin diberikan, Anda dapat memperoleh posisi pengguna saat ini. `expo-location` menyediakan dua pendekatan:

- **`getCurrentPositionAsync`** — Permintaan satu kali yang mengembalikan koordinat GPS saat ini.
- **`watchPositionAsync`** — Mengalirkan pembaruan lokasi secara terus-menerus saat pengguna bergerak.

Untuk aplikasi kita, kita akan menggunakan `getCurrentPositionAsync` untuk pusat peta awal dan `watchPositionAsync` untuk memperbarui peta saat pengguna bergerak secara signifikan.

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
        // Mendapatkan posisi awal
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

        // Berlangganan pembaruan terus-menerus
        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,    // Perbarui setiap 5 detik
            distanceInterval: 10,  // Atau setiap 10 meter
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
        setErrorMsg(error.message || 'Gagal mendapatkan lokasi');
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

Parameter `accuracy` mengontrol keseimbangan antara presisi dan daya tahan baterai:

| Tingkat Akurasi            | Kasus Penggunaan                            | Dampak Baterai |
|----------------------------|---------------------------------------------|----------------|
| `Location.Accuracy.Highest` | Navigasi, petunjuk arah belokan demi belokan | Tinggi         |
| `Location.Accuracy.Balanced` | Tempat di sekitar, lokasi umum               | Sedang         |
| `Location.Accuracy.Low`     | Data cuaca, fitur tingkat kota               | Rendah         |

Untuk aplikasi "Tempat di Sekitar", `Balanced` memberikan presisi yang memadai tanpa menguras baterai.

### Menampilkan Peta

Komponen `MapView` dari `react-native-maps` merender peta interaktif. Ini mendukung gerakan (geser, zoom, putar), penanda, polyline, dan overlay.

Buat layar peta utama:

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
        <Text style={styles.loadingText}>Mendapatkan lokasi Anda...</Text>
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
        <Text style={styles.loadingText}>Memuat peta...</Text>
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

Props kunci pada `MapView`:

- **`provider`** — Atur ke `PROVIDER_GOOGLE` untuk menggunakan Google Maps (diperlukan untuk penanda dengan gambar kustom, heatmap, dan peta dalam ruangan di kedua platform). Mengabaikannya menggunakan Apple Maps di iOS dan Google Maps di Android.
- **`showsUserLocation`** — Menampilkan titik biru yang mewakili posisi pengguna saat ini.
- **`showsMyLocationButton`** — Menampilkan tombol yang memusatkan peta pada lokasi pengguna.
- **`region`** — Objek region terkontrol dengan `latitude`, `longitude`, `latitudeDelta`, dan `longitudeDelta` (rentang dalam derajat). Mengaturnya secara terprogram akan memindahkan dan memperbesar peta.

### Menambahkan Penanda dan Callout

Penanda menunjukkan titik-titik menarik di peta. Anda dapat menyesuaikan tampilannya, menambahkan label, dan memasang popup callout.

Buat komponen penanda untuk tempat di sekitar:

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

Komponen `Callout` merender popup khusus saat penanda diketuk. Jaga agar callout tetap kecil dan informatif — mereka tidak dimaksudkan untuk interaksi yang kompleks. Untuk tampilan detail, navigasikan ke layar terpisah.

Untuk merender beberapa penanda, lakukan mapping pada array tempat:

```typescript
{places.map((place) => (
  <PlaceMarker
    key={place.id}
    place={place}
    onPress={(p) => navigation.navigate('PlaceDetail', { place: p })}
  />
))}
```

### Geocoding Mundur — Dari Koordinat ke Alamat

Geocoding mundur mengonversi lintang dan bujur menjadi alamat yang dapat dibaca manusia. `expo-location` menyediakan geocoder bawaan yang menggunakan layanan native platform (CLGeocoder Apple di iOS, Geocoder Android di Android).

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
    console.error('Geocoding mundur gagal:', error);
    return null;
  }
}

/**
 * Mendapatkan string alamat yang dapat dibaca dari koordinat.
 */
export async function getAddressFromCoords(
  latitude: number,
  longitude: number
): Promise<string> {
  const address = await reverseGeocode(latitude, longitude);
  return address?.formattedAddress ?? 'Lokasi tidak diketahui';
}
```

Gabungkan ini dengan gestur tekan lama pada peta untuk menjatuhkan pin dan menampilkan alamatnya:

```typescript
<MapView
  onLongPress={async (event) => {
    const { coordinate } = event.nativeEvent;
    const address = await getAddressFromCoords(
      coordinate.latitude,
      coordinate.longitude
    );
    Alert.alert('Lokasi Dipin', address);
  }}
/>
```

### Geocoding Maju — Mencari Tempat

Geocoding maju (juga disebut geocoding) mengonversi alamat teks atau nama tempat menjadi koordinat. Meskipun `expo-location` tidak menawarkan geocoding maju secara langsung, Anda dapat menggunakan Google Maps Geocoding API melalui fetch sederhana.

```typescript
// src/utils/geocoding.ts (lanjutan)

const GOOGLE_GEOCODING_API = 'https://maps.googleapis.com/maps/api/geocode/json';

interface GeocodedPlace {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Melakukan geocoding maju pada kueri pencarian menjadi koordinat.
 * Memerlukan kunci API Google Maps yang valid yang disimpan di konstanta app.json.
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
      console.warn('Error Geocoding API:', data.status);
      return [];
    }

    return data.results.map((result: any) => ({
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    }));
  } catch (error) {
    console.error('Geocoding maju gagal:', error);
    return [];
  }
}
```

Untuk produksi, pertimbangkan untuk menggunakan plugin geocoding maju `expo-location` atau SDK yang lebih kaya fitur seperti Mapbox. Google Maps Geocoding API memiliki kuota penggunaan (biasanya 40.000 permintaan per bulan pada tingkat gratis), jadi cache hasil secara agresif.

### Membangun Aplikasi "Tempat di Sekitar"

Sekarang mari kita gabungkan semuanya menjadi aplikasi yang lengkap. Aplikasi ini akan:

1. Meminta izin lokasi saat diluncurkan.
2. Menampilkan peta yang berpusat pada lokasi pengguna.
3. Mengambil tempat di sekitar menggunakan Google Places API (atau dataset tiruan untuk pengembangan).
4. Menampilkan penanda untuk setiap tempat.
5. Mengizinkan pengetukan penanda untuk melihat detail di lembar bawah atau layar detail.
6. Menyediakan bilah pencarian untuk menemukan tempat tertentu.

Buat struktur navigasi:

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
          options={{ title: 'Tempat di Sekitar', headerLargeTitle: true }}
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

Fungsionalitas pencarian dapat ditempatkan di overlay bilah pencarian pada layar peta:

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
        placeholder="Cari tempat..."
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

Layar detail menampilkan informasi tentang tempat yang dipilih:

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
            Dapatkan Petunjuk Arah
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

### Menguji Fitur Lokasi

Menguji fitur lokasi memerlukan beberapa pengaturan karena data GPS tidak tersedia di simulator standar secara bawaan:

- **Simulator iOS**: Gunakan `Debug > Location > Custom Location...` di menu bar simulator. Masukkan nilai lintang/bujur secara manual, atau gunakan file GPX untuk simulasi rute.
- **Emulator Android**: Buka extended controls (tombol `...` di toolbar emulator) dan navigasi ke `Location`. Anda dapat mengatur satu titik atau memutar rute GPX.
- **Perangkat Fisik**: Jalankan aplikasi Expo Go di perangkat Anda. GPS menyediakan data lokasi nyata.
- **Expo Go**: Gunakan `expo-location` dengan perangkat fisik untuk hasil GPS yang paling akurat. Saat menguji di simulator, lokasi akan kembali ke koordinat yang dikonfigurasi simulator.

## Contoh Kode

### Layar Peta Lengkap dengan Penanda dan Pencarian

Berikut adalah integrasi lengkap penanda, pencarian, dan pelacakan lokasi dalam satu layar peta:

```typescript
// src/screens/MapScreen.tsx (versi lengkap)
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

// Data tiruan untuk pengembangan — ganti dengan Google Places API di produksi
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
        <Text style={styles.loadingText}>Mendapatkan lokasi Anda...</Text>
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
            Alert.alert('Lokasi Dipin', address);
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

### Integrasi API Tempat di Sekitar

Untuk aplikasi produksi, ganti data sampel dengan Google Places API — endpoint Nearby Search:

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
    return { results: [], error: 'Network error saat mengambil tempat di sekitar' };
  }
}
```

## Insight Penting

- **Selalu minta tingkat izin minimum** yang dibutuhkan fitur Anda. Menggunakan `WhenInUse` (hanya latar depan) kurang mengganggu dibandingkan `Always` (latar belakang) dan lebih mungkin disetujui pengguna. Hanya minta `Always` jika aplikasi Anda benar-benar membutuhkan lokasi latar belakang (misalnya, geofencing, pelacakan kebugaran).
- **Tangani penolakan izin dengan baik**. Di iOS, setelah pengguna menolak izin, sistem tidak akan meminta ulang. Tampilkan penjelasan yang jelas dan tombol untuk navigasi ke Pengaturan. Periksa status izin saat aplikasi dilanjutkan jika pengguna mengubahnya secara eksternal.
- **Gunakan `distanceInterval` daripada `timeInterval`** untuk pemantauan lokasi saat presisi pergerakan penting. Mengatur `distanceInterval: 10` meter lebih hemat baterai daripada `timeInterval` yang ketat karena hanya aktif saat pengguna benar-benar bergerak.
- **Cache hasil geocoding secara agresif**. Google Geocoding API memiliki tingkat gratis 40.000 permintaan/bulan. Cache alamat geocoding mundur berdasarkan pasangan koordinat di `AsyncStorage` untuk mengurangi panggilan API dan meningkatkan performa yang dirasakan.
- **Uji dengan lokasi simulasi tetapi verifikasi di perangkat nyata**. Simulator dapat menyediakan data lokasi, tetapi akurasi GPS, alur izin, dan rendering peta berbeda secara signifikan di perangkat fisik. Selalu uji fitur lokasi di ponsel nyata sebelum merilis.
- **Region `latitudeDelta` dan `longitudeDelta`** mengontrol tingkat zoom. Nilai `latitudeDelta` yang lebih kecil berarti zoom yang lebih dekat. Rasio antara `latitudeDelta` dan `longitudeDelta` harus kira-kira sama dengan rasio aspek kontainer peta untuk menghindari distorsi. Untuk layar mobile tipikal, `latitudeDelta: 0.05` memberikan zoom tingkat blok kota.
- **Google Maps di Android memerlukan kunci API** sementara Apple Maps di iOS berfungsi tanpa kunci. Jika Anda menggunakan `PROVIDER_GOOGLE` di kedua platform, keduanya memerlukan konfigurasi kunci API. Jika Anda menghilangkan provider, iOS menggunakan Apple Maps dan Android menggunakan Google Maps (memerlukan kunci hanya di Android).
- **Hindari membuat ulang komponen MapView** saat props-nya berubah — me-mount ulang peta menyebabkan kilatan visual dan mengatur ulang status gestur. Gunakan props terkontrol seperti `region` dan `onRegionChangeComplete` daripada me-unmount dan me-remount.

## Langkah Berikutnya

- Jelajahi **fitur lanjutan MapView**: polyline untuk tampilan rute, polygon untuk area, heatmap untuk visualisasi kepadatan, dan `AnimatedRegion` untuk transisi penanda yang halus.
- Pelajari tentang **pelacakan lokasi latar belakang** dengan `expo-task-manager` dan `expo-background-fetch` untuk geofencing dan pengingat berbasis lokasi.
- Integrasikan **SDK navigasi** seperti Mapbox atau Google Navigation untuk petunjuk arah belokan demi belokan di dalam aplikasi Anda.
- Tambahkan **dukungan peta offline** dengan menyimpan tile peta menggunakan TileOverlay `react-native-maps` atau penyimpanan tile offline Mapbox.
- Ikuti **Syllabus Pengembangan React Native** untuk jalur pembelajaran terstruktur yang mencakup semua aspek pengembangan React Native.
- Lihat **Panduan Performa dan Debugging React Native** untuk tips mengoptimalkan rendering peta dan polling lokasi di produksi.

## Kesimpulan

Selamat! Anda telah berhasil membangun aplikasi React Native berbasis lokasi yang fungsional dengan peta interaktif, pelacakan lokasi real-time, penanda khusus, geocoding, dan pencarian tempat. Anda sekarang memahami cara:

- Mengonfigurasi dan meminta izin lokasi untuk iOS dan Android.
- Menampilkan peta interaktif dengan `react-native-maps`.
- Melacak lokasi pengguna dengan `expo-location` menggunakan strategi satu kali dan pemantauan berkelanjutan.
- Menampilkan penanda khusus dengan callout dan kode warna berbasis kategori.
- Melakukan geocoding mundur untuk mengonversi koordinat menjadi alamat.
- Mengimplementasikan geocoding maju dan pencarian tempat untuk menemukan lokasi berdasarkan nama.
- Mengintegrasikan Google Places API untuk penemuan tempat di sekitar.

Keterampilan ini dapat langsung diterapkan ke berbagai aplikasi produksi — dari perjalanan dan pengantaran makanan hingga jejaring sosial dan logistik. Pola yang telah Anda pelajari di sini (penanganan izin, pemantauan lokasi, rendering peta, geocoding, pencarian) membentuk fondasi dari hampir setiap aplikasi mobile berbasis lokasi di pasaran.
