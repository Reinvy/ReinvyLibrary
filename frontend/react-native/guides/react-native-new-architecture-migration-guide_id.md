---
title: "Panduan Migrasi React Native ke New Architecture"
description: "Panduan praktis memigrasikan aplikasi React Native ke New Architecture — Fabric, TurboModules, JSI, dan codegen — dengan rencana rollout bertahap, strategi interop layer, dan jalur rollback."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Migrasi React Native ke New Architecture

## Pendahuluan

New Architecture menggantikan bridge JSON asinkron milik React Native dengan sekumpulan antarmuka C++ yang bisa dipanggil langsung oleh JavaScript. Ini bukan satu fitur tunggal, melainkan empat bagian yang bekerja bersama: **JSI** (JavaScript Interface) yang memungkinkan JavaScript memegang referensi ke objek host C++ dan memanggil metodenya tanpa serialisasi; **TurboModules**, pengganti sistem native module lama yang lazy dan type-safe; **Fabric**, pipeline rendering baru yang melakukan mount shadow node di sisi native alih-alih mengirim deskripsi view melewati bridge; dan **codegen**, alat build-time yang mengubah spec TypeScript atau Flow menjadi kode perekat C++ dan Java/Objective-C yang mengikat tiga bagian lainnya.

Migrasi ini penting karena bridge lama sedang menuju akhir masa pakainya. Rilis React Native terbaru mengaktifkan New Architecture secara default, dan API berbasis bridge yang menjadi tumpuan ribuan library pihak ketiga dihapus secara bertahap — bukan sekadar tidak direkomendasikan. Aplikasi yang menunda migrasi akan mengumpulkan ekor dependensi yang sudah meninggalkan dukungan legacy, dan di situlah upgrade "nanti" berubah menjadi insiden darurat selama berminggu-minggu.

Panduan ini ditujukan untuk tim yang memigrasikan aplikasi **brownfield produksi** — aplikasi dengan native module yang sudah ada, campuran library pihak ketiga dengan kematangan tidak diketahui, dan tanpa kemewahan untuk membekukan pengembangan fitur. Migrasi diperlakukan sebagai cutover bertahap dengan titik rollback terukur di setiap langkah, bukan penulisan ulang sekali jadi. Urutan yang sama berlaku untuk aplikasi greenfield, hanya tanpa langkah interop layer.

## Praktik Terbaik

### Perlakukan Migrasi sebagai Cutover Bertahap, Bukan Penulisan Ulang

Mode kegagalan yang paling mahal adalah branch yang mengaktifkan New Architecture, merusak dua ratus layar, dan tidak bisa di-merge selama sebulan. Sebaliknya, lakukan migrasi dalam kenaikan yang masing-masing tetap menjaga aplikasi bisa dirilis: upgrade toolchain dulu, lalu aktifkan codegen tanpa perubahan perilaku, lalu konversi satu native module, lalu satu layar, lalu sisanya. Setiap kenaikan harus bisa di-merge dan diuji sendiri. New Architecture mendukung modul legacy yang dibungkus interop berjalan berdampingan dengan modul yang sudah dikonversi — justru itu yang membuat pengiriman bertahap mungkin; manfaatkan kemampuan tersebut alih-alih berlomba mengonversi semuanya sekaligus.

### Inventarisasi Dependensi Native Sebelum Menyentuh Kode

Anda tidak bisa merencanakan pekerjaan tanpa tahu dependensi mana yang sudah kompatibel dengan New Architecture. Audit setiap paket native — bukan hanya dependensi langsung, tetapi juga transitif, karena satu dependensi transitif yang tidak terawat bisa memblokir cutover. Klasifikasikan masing-masing ke dalam empat keranjang: siap Fabric/TurboModule, kompatibel lewat interop layer, JavaScript murni (tidak relevan), atau tidak didukung dan tanpa pengganti. Keranjang keempat menentukan timeline Anda; mulai cari pengganti atau fork sejak hari pertama, karena di situlah risiko jadwal menumpuk.

### Biarkan Codegen yang Memiliki Antarmuka Native

Header bridge yang ditulis manual adalah sumber bug migrasi terbesar. Di New Architecture, antarmuka native dihasilkan dari file spec, sehingga ketidaksesuaian antara signature JavaScript dan implementasi native menjadi error kompilasi, bukan crash runtime di perangkat pengguna. Tulis spec dalam TypeScript (`Native*.ts`) untuk TurboModule dan dalam bentuk `codegenNativeComponent` untuk komponen Fabric, lalu perlakukan output yang dihasilkan sebagai artefak build read-only yang tidak pernah di-commit. Ketika native module butuh metode baru, ubah spec lebih dulu dan biarkan codegen gagal berisik sampai kedua implementasi platform menyusul.

### Jaga Interop Layer sebagai Perancah Sementara, Bukan Tempat Menetap

Interop layer mendaftarkan modul legacy dan view manager agar tetap berfungsi di New Architecture. Ia adalah jembatan selama migrasi, bukan tujuan: panggilan yang dibungkus interop masih membayar sebagian biaya serialisasi, tidak bisa ikut jalur cepat JSI yang sinkron, dan tidak akan bertahan saat dukungan legacy akhirnya dihapus. Tetapkan tenggat eksplisit untuk mencapai nol dependensi interop dan lacak jumlah modul yang dibungkus interop sebagai metrik burn-down. Tim yang menyelesaikan migrasi dengan interop layer masih terisi sudah mengerjakan bagian yang mahal tetapi tidak memanen hasilnya.

### Perbaiki Panggilan Native Sinkron Secara Sengaja

Bridge lama mayoritas asinkron, tetapi sebagian kecil API berjalan sinkron — pencarian `requireNativeComponent`, pembacaan konstanta `NativeModules`, dan apa pun yang memakai `RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD`. Di bawah JSI, panggilan sinkron benar-benar murah, sehingga godaan untuk membuat semuanya sinkron muncul. Tahan godaan itu untuk apa pun yang menyentuh disk, jaringan, atau main thread: panggilan sinkron memblokir JavaScript thread selama durasinya, sedangkan panggilan asinkron yang sama bisa tumpang tindih dengan rendering. Konversi ke sinkron hanya untuk lookup kecil di memori, dan dokumentasikan alasannya di samping setiap panggilan.

### Siapkan Anggaran untuk Perbedaan Threading dan Lifecycle

Fabric melakukan mount view di UI thread native dengan layout pass-nya sendiri, dan TurboModule dapat dipanggil dari runtime JavaScript mana pun, termasuk beberapa runtime sekaligus saat Anda memakai `react-native-macos`, bridgeless mode, atau instance React yang di-embed. Kode yang diam-diam berasumsi "satu runtime, satu thread, satu siklus hidup bridge" mulai gagal dengan gejala yang tampak tidak berkaitan: callback menyala setelah layar di-unmount, hasil pengukuran layout berbeda satu frame, event emitter bocor antar-instance. Audit kode native untuk shared mutable state dan pekerjaan yang dimulai di konstruktor modul, lalu pindahkan ke lifecycle hook eksplisit.

### Kendalikan Rollout dengan Flag dan Ukur Hasilnya

Rilis aplikasi hasil migrasi dengan saklar runtime yang bisa kembali ke jalur legacy untuk sebagian pengguna, dan pantau metrik yang benar-benar mencerminkan perubahan: waktu cold start, time-to-interactive, frame rate JS dan UI thread saat scroll, puncak memori, serta crash-free session rate. Fabric dan TurboModules umumnya menurunkan biaya startup dan jank terkait bridge, tetapi juga bisa membuka bug native lama yang tersamarkan pipeline sebelumnya. Rollout ber-flag dengan kohort pembanding mengubah cutover yang menakutkan menjadi eksperimen yang bisa dihentikan.

## Langkah Implementasi

### Langkah 1: Tetapkan Baseline dan Lakukan Inventarisasi

Catat kondisi awal sebelum mengubah apa pun. Simpan versi React Native, setelan Hermes, serta isi `Podfile.lock` / `gradle.lockfile`, lalu ambil snapshot performa build release di perangkat fisik kelas menengah agar perbandingan pasca-migrasi jujur.

```bash
node -e "console.log(require('react-native/package.json').version)"
npx react-native config > /tmp/rn-config-before.json
```

File konfigurasi yang dihasilkan adalah inventaris dependensi Anda: ia mencantumkan setiap native module, view manager, dan proyek platform yang dikenal React Native. Klasifikasikan setiap entri menjadi siap, kompatibel interop, JavaScript murni, atau tidak didukung, lalu tulis klasifikasinya ke tabel yang dilacak di repositori agar burn-down terlihat oleh seluruh tim.

```text
Dependensi               Tipe            Status        Tindakan
────────────────────────────────────────────────────────────────
react-native-reanimated native module   siap          tidak ada
react-native-mmkv       native module   siap          tidak ada
react-native-camera     view manager    interop       cari pengganti (Q3)
legacy-analytics-sdk    native module   tidak didukung fork atau vendor
react-native-svg        view manager    siap          tidak ada
date-fns                js murni        n/a           tidak ada
```

### Langkah 2: Upgrade Toolchain Sebelum Mengaktifkan Apa Pun

Migrasi gagal secara tidak proporsional di tahap toolchain, jadi isolasi tahap ini. Upgrade React Native, lalu CocoaPods, Gradle, Android Gradle Plugin, Kotlin, dan target deployment iOS ke versi yang diminta rilis React Native tujuan. Lakukan dengan New Architecture masih nonaktif, lalu rilis versi dari kondisi ini. Anda kini punya titik awal yang terbukti sehat, yang satu-satunya perbedaan dari rilis sebelumnya adalah versi dependensi — kegagalan di sini jelas masalah toolchain, bukan masalah arsitektur.

```bash
npx react-native upgrade
bundle install && cd ios && bundle exec pod install
cd android && ./gradlew clean && ./gradlew assembleRelease
```

### Langkah 3: Aktifkan New Architecture

Pengaktifan berupa flag build di setiap platform ditambah flag JavaScript untuk runtime tanpa bridge. Set semuanya, build ulang dari kondisi bersih, dan harapkan aplikasi masih berjalan lewat interop layer — itulah inti langkah ini: membuktikan build dan aplikasi selamat dari pengaktifan sebelum ada satu pun native module diubah.

```text
# android/gradle.properties
newArchEnabled=true
hermesEnabled=true
```

```ruby
# ios/Podfile — set sebelum definisi target
ENV['RCT_NEW_ARCH_ENABLED'] = '1'
```

Di iOS, flag ini mengubah apa yang dijalankan codegen saat `pod install`, sehingga direktori `Pods` bersih wajib hukumnya; Pods yang basi menghasilkan link error yang tampak seperti simbol hilang untuk output codegen yang tidak pernah dibuat.

```bash
cd ios && rm -rf Pods Podfile.lock && bundle exec pod install
```

### Langkah 4: Verifikasi Output Codegen dan Kunci sebagai Read-Only

Pastikan codegen benar-benar menghasilkan artefak untuk spec Anda sebelum menulis kode native. File hasil generate berada di `build/generated` pada Android dan `ios/build/generated` pada iOS, dan ketidakhadirannya adalah penjelasan paling umum untuk "spec berhasil dikompilasi tetapi modul undefined saat runtime".

```bash
find android/app/build/generated ios/build/generated -name "*Spec*" -type f | head -20
```

Tambahkan kedua direktori ke `.gitignore` dan tolak pull request yang meng-commit-nya. Antarmuka hasil generate harus selalu bisa direproduksi dari spec; jika tidak, dua developer bisa membangun terhadap header hasil generate yang berbeda dan menghasilkan link error yang tidak muncul di mesin satu sama lain.

### Langkah 5: Migrasikan Native Module ke TurboModule

Mulai dari modul internal terkecil — idealnya yang punya dua atau tiga metode tanpa konsumen pihak ketiga. Tulis spec TypeScript lebih dulu. Spec adalah kontraknya, dan codegen menurunkan antarmuka native darinya.

```typescript
// specs/NativeDeviceInfo.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getInstallId(): Promise<string>;
  isLowPowerModeEnabled(): boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DeviceInfo');
```

Pemanggilan `getEnforcing` akan melempar error saat startup jika modul tidak terdaftar, dan itulah kegagalan yang Anda inginkan selama migrasi — modul `undefined` yang diam jauh lebih mahal untuk didiagnosis daripada crash startup di development build. Di Android, implementasikan kelas abstrak hasil generate dan daftarkan di `TurboReactPackage`; di iOS, konform ke protokol hasil generate dan ekspor melalui module provider.

```java
// android/.../DeviceInfoModule.java
public class DeviceInfoModule extends NativeDeviceInfoSpec {
  public static final String NAME = NativeDeviceInfoSpec.NAME;

  @Override
  public void getInstallId(Promise promise) {
    promise.resolve(InstallIdStore.read(getReactApplicationContext()));
  }

  @Override
  public boolean isLowPowerModeEnabled() {
    PowerManager pm = (PowerManager) getReactApplicationContext()
        .getSystemService(Context.POWER_SERVICE);
    return !pm.isInteractive();
  }
}
```

```objectivec
// ios/DeviceInfo.mm
@implementation DeviceInfo
RCT_EXPORT_MODULE()

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeDeviceInfoSpecJSI>(params);
}

- (void)getInstallId:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  resolve([InstallIdStore readInstallId]);
}
@end
```

### Langkah 6: Migrasikan Komponen View ke Fabric

Komponen view Fabric mengikuti disiplin spec-first yang sama, tetapi spec-nya mendeskripsikan prop dan event, bukan metode. Konversi satu view native per satu layar, dengan nama komponen yang terlihat dari JavaScript tetap sama sehingga call site tidak berubah.

```typescript
// specs/ChartViewNativeComponent.ts
import type { ViewProps } from 'react-native';
import type { HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  dataPoints: ReadonlyArray<Readonly<{ x: number; y: number }>>;
  animated?: boolean;
}

export default codegenNativeComponent<NativeProps>(
  'ChartView'
) as HostComponent<NativeProps>;
```

Bug konversi Fabric yang paling umum adalah prop-type drift: view manager legacy menerima prop bertipe longgar lewat makro `RCT_EXPORT_VIEW_PROPERTY`, sedangkan Fabric memvalidasi struct hasil generate. Ketika sebuah prop diam-diam berhenti diterapkan, hampir selalu spec hasil generate tidak sesuai dengan signature setter native — perbaiki spec-nya, jangan menambal sisi native.

### Langkah 7: Tangani Dependensi Tersisa dengan Interop Layer

Apa pun yang masih di jalur legacy setelah modul Anda sendiri dikonversi sebaiknya dibungkus interop layer alih-alih ditulis ulang. Simpan hitungan dependensi terbungkus interop dan tinjau setiap sprint; daftar itu hanya menyusut jika ada yang bertanggung jawab. Ketika sebuah dependensi merilis versi New Architecture, upgrade segera dan hapus entri interop di pull request yang sama, agar burn-down tidak pernah mundur.

```text
Burn-down interop (sprint 14)
─────────────────────────────
Minggu 1: 9 modul interop
Minggu 2: 7   (legacy-analytics-sdk dihapus, react-native-camera di-upgrade)
Minggu 3: 5   (modul auth dan push internal dikonversi)
Minggu 4: 2   (library SVG/gesture tersisa di-upgrade)
```

### Langkah 8: Selesaikan Regresi Threading dan Lifecycle

Setelah konversi, jalankan aplikasi pada alur yang paling sensitif terhadap threading: navigasi cepat saat animasi berjalan, background fetch yang berlanjut setelah aplikasi dimatikan, serta callback kamera atau BLE yang datang saat transisi navigasi. Perbaikannya biasanya berbentuk salah satu dari tiga hal — pindahkan shared state ke balik lock atau actor, pindahkan inisialisasi keluar dari konstruktor modul ke pemanggilan `initialize()` eksplisit, dan ganti callback yang "mengasumsikan view ada" dengan versi yang memeriksa null. Catat identifier instance runtime di kode native selama fase ini; dalam bridgeless mode bisa ada lebih dari satu runtime, dan callback lintas-instance hampir mustahil dilacak tanpa itu.

### Langkah 9: Uji Kedua Arsitektur di CI

Jalankan seluruh test suite dua kali — sekali dengan `newArchEnabled=true` dan sekali nonaktif — sampai migrasi selesai. Suite end-to-end Detox atau Maestro menangkap regresi mount dan layout yang tidak terlihat oleh unit test, dan menangkapnya di tahap pull request alih-alih saat rollout bertahap. Cache kedua konfigurasi secara terpisah, karena berbagi build cache antar-arsitektur menghasilkan link failure yang membuang berjam-jam waktu.

```yaml
jobs:
  e2e:
    strategy:
      matrix:
        newArch: ['true', 'false']
    env:
      RCT_NEW_ARCH_ENABLED: ${{ matrix.newArch == 'true' && '1' || '0' }}
```

### Langkah 10: Rollout di Balik Flag dan Pensiunkan Interop Layer

Rilis dengan New Architecture aktif untuk kohort internal, lalu sebagian kecil pengguna produksi, sambil membandingkan waktu startup, frame rate, memori, dan crash-free session terhadap kohort legacy. Setelah metrik stabil dan daftar interop mencapai nol — atau hanya berisi dependensi yang sengaja Anda terima — hapus jalur build legacy, hapus matriks CI dua arsitektur, dan buang flag-nya. Membiarkan pintu darurat terbuka tanpa batas adalah cara tim memelihara dua pipeline rendering selama setahun.

## Kesimpulan

Migrasi ke New Architecture adalah upgrade toolchain, disiplin penulisan spec, dan burn-down dependensi yang dijalankan bersama, dalam urutan itu. Tim yang mendaratkan ketiganya sebagai kenaikan terpisah yang bisa dirilis menyelesaikan migrasi dalam hitungan minggu dengan rollback terukur di setiap langkah; tim yang menggabungkan semuanya menjadi satu branch heroik menghabiskan minggu yang sama untuk debugging. Keuntungan yang bertahan bukanlah selisih performa pada rilis pertama — melainkan antarmuka native yang menjadi bertipe dan dihasilkan otomatis, sehingga upgrade React Native berikutnya hanya berbiaya satu build, bukan satu migrasi.
