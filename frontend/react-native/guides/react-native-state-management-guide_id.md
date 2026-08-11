---
title: "Panduan Manajemen State React Native"
description: "Panduan komprehensif tentang manajemen state di aplikasi React Native — mencakup state lokal komponen, state global dengan Context API dan Zustand, state server dengan React Query, dan memilih arsitektur yang tepat untuk skala aplikasi Anda."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Manajemen State React Native

## Pendahuluan

Manajemen state adalah salah satu keputusan arsitektural paling konsekuensial yang akan Anda buat dalam aplikasi React Native. Tidak seperti aplikasi web satu halaman di mana tab browser adalah satu-satunya klien, aplikasi React Native berjalan pada perangkat dengan memori terbatas, konektivitas intermiten, dan thread UI native yang harus berkoordinasi dengan thread JavaScript. Setiap pembaruan state melintasi jembatan React Native, dan state yang dikelola dengan buruk dapat menyebabkan animasi tersendat-sendat, render ulang yang tidak perlu, dan pengurasan baterai.

Panduan ini menyurvei lanskap pendekatan manajemen state yang tersedia untuk React Native — dari hooks bawaan `useState` dan `useReducer` hingga solusi global seperti Zustand, Jotai, dan Redux Toolkit, serta pustaka server-state seperti TanStack React Query. Setiap pendekatan dievaluasi melalui lensa kendala spesifik perangkat seluler: overhead jembatan, tekanan memori, siklus hidup layar, dan ketahanan offline. Pada akhirnya, Anda akan memiliki kerangka keputusan yang jelas untuk memilih arsitektur state yang tepat untuk kebutuhan aplikasi Anda saat ini dan pertumbuhan di masa depan.

## Praktik Terbaik

### Jaga State Tetap Selokal Mungkin

Praktik paling berdampak adalah mendorong state ke bawah ke komponen daun yang benar-benar membutuhkannya. Setiap bagian state global yang berakhir di penyedia konteks memaksa semua konsumen untuk render ulang ketika state tersebut berubah, bahkan jika mereka hanya membaca bagian yang berbeda. Sebelum menggunakan store global, tanyakan: apakah state ini perlu bertahan di seluruh layar? Apakah ini dibagikan antara lebih dari dua komponen yang tidak terkait? Jika jawaban untuk keduanya tidak, simpan state tersebut di `useState` atau `useReducer` lokal ke komponen.

```tsx
// ❌ State yang terlalu tinggi — seluruh layar render ulang pada setiap ketikan input
const [formData, setFormData] = useState({ name: '', email: '', bio: '' });

// ✅ State lokal per-field — hanya komponen input yang render ulang
function NameInput() {
  const [name, setName] = useState('');
  return <TextInput value={name} onChangeText={setName} />;
}
```

### Pisahkan State Server dari State UI

State server (data yang diambil dari API) memiliki karakteristik yang berbeda secara fundamental dari state UI (visibilitas modal, tab saat ini, nilai input formulir). State server bersifat asinkron, berpotensi basi, dan dibagikan di seluruh sesi. Memperlakukan state server dengan cara yang sama seperti state UI menyebabkan pengambilan data yang redundan, bug invalidasi cache manual, dan logika loading/error yang diduplikasi di setiap layar.

Gunakan pustaka server-state khusus seperti TanStack React Query (sebelumnya React Query) atau RTK Query. Pustaka-pustaka ini menangani caching, pengambilan ulang latar belakang, paginasi, pembaruan optimistis, dan pola stale-while-revalidate secara langsung — pola yang membutuhkan ratusan baris middleware Redux buatan tangan untuk diimplementasikan dengan benar.

```tsx
// ✅ React Query memisahkan concern dengan bersih
function useProducts(categoryId: string) {
  return useQuery({
    queryKey: ['products', categoryId],
    queryFn: () => api.fetchProducts(categoryId),
    staleTime: 5 * 60 * 1000, // 5 menit sebelum pengambilan ulang
  });
}

// Komponen hanya peduli dengan UI state
function ProductScreen() {
  const [filterOpen, setFilterOpen] = useState(false);
  const { data, isLoading } = useProducts('elektronik');

  if (isLoading) return <ActivityIndicator />;
  return (/* render produk */);
}
```

### Pilih Prediktabilitas di Atas Boilerplate

Aplikasi React Native memiliki anggaran ukuran bundle yang lebih ketat daripada aplikasi web. Pustaka manajemen state yang menambahkan 30 KB (terkompresi gzip) ke bundle JavaScript secara langsung memengaruhi waktu cold-start pada perangkat kelas bawah. Namun, trade-off yang tepat tergantung pada ukuran tim dan kompleksitas aplikasi:

- **Pengembang solo atau tim kecil, aplikasi sederhana**: Context API + `useReducer` sudah cukup. Tahan godaan untuk menambahkan pustaka sebelum waktunya.
- **Aplikasi menengah dengan state lintas-bagian**: Zustand atau Jotai. Keduanya di bawah 2 KB, tanpa boilerplate, dan bekerja di luar komponen React (berguna untuk helper navigasi atau analitik).
- **Tim besar, transisi state kompleks**: Redux Toolkit (RTK). Ekosistem middleware (thunks, listeners) dan devtools memberikan nilai lebih ketika beberapa pengembang perlu memahami aliran state.

```tsx
// Zustand — boilerplate minimal, bekerja di luar komponen
import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  login: async (credentials) => {
    const { token, user } = await api.login(credentials);
    set({ token, user });
  },
  logout: () => set({ token: null, user: null }),
}));

// Akses dari komponen atau file layanan mana pun
export { useAuthStore };
```

### Tangani Siklus Hidup Layar dan Memori

Layar React Native tidak dihancurkan ketika Anda navigasi menjauh — mereka tetap berada di tumpukan navigasi, memegang referensi ke pohon komponen dan langganan yang mereka buat. Layar yang berlangganan ke store tetapi tidak pernah berhenti berlangganan akan terus menerima pembaruan dan render ulang di latar belakang, mengonsumsi CPU dan memori.

Selalu batalkan langganan dari store dan observer di fungsi pembersihan `useEffect`. Untuk store Zustand, panggil fungsi `unsubscribe` yang dikembalikan oleh `subscribe`. Untuk React Query, query client secara otomatis membatalkan permintaan yang sedang berlangsung ketika komponen dilepas, tetapi Anda tetap harus mengonfigurasi `gcTime` (sebelumnya `cacheTime`) untuk mengontrol berapa lama data query yang tidak aktif tetap berada di memori.

```tsx
useEffect(() => {
  const unsub = useAuthStore.subscribe((state) => {
    console.log('Status auth berubah:', state.token ? 'masuk' : 'keluar');
  });
  return () => unsub(); // kritis untuk memori
}, []);
```

### Utamakan Pembaruan Atomik untuk Menghindari Spam Jembatan

Setiap pemanggilan `setState` atau dispatch memicu siklus render ulang JavaScript yang harus disinkronkan dengan thread UI native. Ketika memperbarui beberapa bagian state yang terkait, kelompokkan ke dalam satu pembaruan. React 18 secara otomatis mengelompokkan pembaruan di dalam event handler, tetapi pembaruan di dalam `setTimeout`, panggilan balik `Promise`, atau listener event native tidak dikelompokkan secara otomatis — gunakan `unstable_batchedUpdates` dari `react-dom` atau kelompokkan secara manual dengan fungsi `set` Zustand.

```tsx
// ❌ Tiga kali penyeberangan jembatan terpisah
setIsLoading(true);
setError(null);
setData(response.data);

// ✅ Satu pembaruan
setState({ isLoading: true, error: null, data: response.data });

// ✅ Zustand mengelompokkan secara alami
store.setState({ isLoading: true, error: null, data: response.data });
```

## Langkah Implementasi

### Langkah 1: Audit State Saat Ini

Sebelum mengadopsi pustaka apa pun, petakan setiap bagian state di aplikasi Anda. Buat tabel dengan tiga kolom: variabel state, komponen yang membacanya, dan komponen yang menulisnya. Latihan ini segera mengungkapkan:

- State yang hanya dibaca oleh satu komponen (tetap lokal).
- State yang ditulis oleh satu komponen tetapi dibaca oleh banyak (kandidat untuk Context).
- State yang ditulis dan dibaca oleh banyak komponen yang tidak terkait (kandidat untuk Zustand atau Redux).
- State yang berasal dari API (kandidat untuk React Query).

```text
| State            | Pembaca                       | Penulis           | Kategori   |
|------------------|-------------------------------|-------------------|------------|
| currentUser      | Header, Profile, Settings     | LoginScreen       | Auth       |
| productList      | ProductGrid, SearchBar        | Fetch API         | Server     |
| cartItems        | CartBadge, CartScreen, Checkout| ProductCard      | Lintas-cut |
| isDarkMode       | ThemeProvider                 | SettingsScreen    | Preferensi |
| searchQuery      | SearchBar                     | SearchBar         | Lokal      |
```

### Langkah 2: Instal Dependensi Berdasarkan Skala

Tambahkan pustaka secara inkremental — jangan pernah menginstal semuanya di awal.

**Pengaturan minimum (aplikasi sederhana):**

```bash
npm install @tanstack/react-query
```

Ini memberikan lapisan khusus untuk state server, yang merupakan kategori paling rawan kesalahan jika ditangani secara manual. State UI tetap menggunakan `useState` dan `useReducer`.

**Pengaturan menengah (state lintas-bagian diperlukan):**

```bash
npm install zustand @tanstack/react-query
```

Zustand menggantikan Context untuk state global. Ini menghindari masalah penumpukan penyedia dan kaskade render ulang yang menjangkiti rantai Context yang bersarang dalam.

**Pengaturan besar (logika bisnis kompleks, banyak pengembang):**

```bash
npm install @reduxjs/toolkit react-redux @tanstack/react-query
```

RTK menyediakan pola terstandarisasi yang langsung dipahami oleh setiap pengembang di tim, dan devtools-nya membuat debugging transisi state menjadi jauh lebih mudah.

### Langkah 3: Konfigurasi QueryClientProvider

Bungkus root aplikasi Anda dengan `QueryClientProvider` terlepas dari pustaka state global mana yang Anda pilih. Ini adalah satu-satunya lapisan yang tidak bisa ditawar.

```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false, // tidak relevan di perangkat seluler
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
```

### Langkah 4: Implementasi Pola Store Berdasarkan Fitur

Untuk Zustand (atau slice Redux Toolkit), atur store berdasarkan domain fitur, bukan berdasarkan kategori teknis. Satu store auth lebih jelas daripada `userReducer`, `tokenReducer`, dan `permissionsReducer` terpisah yang selalu di-dispatch bersamaan.

```tsx
// stores/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  total: () => number;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...product, quantity: 1 }] };
        }),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(0, qty) } : i
          ),
        })),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

Middleware `persist` menulis keranjang ke `AsyncStorage` secara otomatis, sehingga keranjang bertahan setelah aplikasi dimulai ulang tanpa kode tambahan.

### Langkah 5: Hubungkan State Server dengan Hooks React Query

Buat hooks kustom yang merangkum panggilan API, state loading, dan penanganan error. Komponen mengonsumsi hooks ini tanpa perlu tahu apakah data berasal dari cache atau jaringan.

```tsx
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'https://api.example.com';

export function useProducts(categoryId: string) {
  return useQuery({
    queryKey: ['products', categoryId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/products?category=${categoryId}`);
      if (!res.ok) throw new Error('Gagal mengambil produk');
      return res.json();
    },
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();

  return useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`${API_BASE}/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error('Gagal menambahkan ke keranjang');
      return res.json();
    },
    onSuccess: (data, productId) => {
      // Perbarui store lokal secara optimistis
      addItem({ id: productId, name: data.name, price: data.price, imageUrl: data.image });
      // Invalidasi query jumlah keranjang
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
    },
  });
}
```

### Langkah 6: Tangani State Loading dan Error Secara Konsisten

Definisikan komponen atau hooks yang dapat digunakan kembali untuk state machine umum yang dimiliki setiap layar yang bergantung pada server: loading, error, kosong, dan sukses.

```tsx
// components/ScreenShell.tsx
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ScreenShellProps {
  isLoading: boolean;
  error: Error | null;
  children: React.ReactNode;
  onRetry?: () => void;
}

export function ScreenShell({ isLoading, error, children, onRetry }: ScreenShellProps) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 16, color: '#D32F2F', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

// Penggunaan di layar
function ProductListScreen() {
  const { data, isLoading, error, refetch } = useProducts('elektronik');

  return (
    <ScreenShell isLoading={isLoading} error={error} onRetry={refetch}>
      <FlatList
        data={data}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item.id}
      />
    </ScreenShell>
  );
}
```

### Langkah 7: Uji Logika State Secara Terisolasi

Ekstrak logika bisnis dari store state dan uji secara independen. Store Zustand adalah fungsi biasa — uji tanpa me-render komponen apa pun.

```tsx
// __tests__/cart-store.test.ts
import { useCartStore } from '../stores/useCartStore';

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('CartStore', () => {
  const sampleProduct = { id: '1', name: 'Item Tes', price: 10, imageUrl: 'https://example.com/img.png' };

  it('menambahkan item ke keranjang kosong', () => {
    useCartStore.getState().addItem(sampleProduct);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('menambah kuantitas ketika menambahkan item yang sudah ada', () => {
    useCartStore.getState().addItem(sampleProduct);
    useCartStore.getState().addItem(sampleProduct);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('menghitung total dengan benar', () => {
    useCartStore.getState().addItem(sampleProduct);
    useCartStore.getState().addItem({ ...sampleProduct, id: '2', price: 20 });
    expect(useCartStore.getState().total()).toBe(30);
  });

  it('membersihkan keranjang', () => {
    useCartStore.getState().addItem(sampleProduct);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
```

Jalankan pengujian state sebagai bagian dari pipeline CI Anda. Pengujian ini berjalan dalam hitungan milidetik dan menangkap kelas bug yang paling umum di aplikasi React Native — transisi state yang salah yang dialami pengguna sebagai kehilangan data atau UI yang tidak konsisten.
