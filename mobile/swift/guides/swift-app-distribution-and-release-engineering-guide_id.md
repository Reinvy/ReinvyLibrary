---
title: "Panduan Distribusi dan Release Engineering Aplikasi Swift"
description: "Panduan praktis merilis aplikasi Swift dan SwiftUI secara andal: code signing deklaratif, API key App Store Connect, nomor build deterministik, kohort TestFlight, peluncuran bertahap, simbolisasi dSYM, dan gerbang kualitas di dalam CI."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Distribusi dan Release Engineering Aplikasi Swift

## Pendahuluan

Sebagian besar tutorial Swift berhenti pada titik ketika aplikasi berhasil dikompilasi dan berjalan di Simulator. Dalam praktiknya, itu baru sekitar setengah jalan. Sisa pekerjaannya — menandatangani archive dengan identitas yang tepat, menghasilkan build yang bisa terpasang di perangkat penguji, meloloskannya melalui App Review, merilis ke sebagian kecil pengguna, lalu menyimbolkan laporan crash yang menyusul — adalah bagian tempat tim benar-benar kehilangan berhari-hari.

Panduan ini memperlakukan distribusi sebagai disiplin rekayasa, bukan ritual manual yang dijalankan oleh siapa pun yang sedang memegang laptop release manager. Tujuannya konkret: archive yang bisa dihasilkan di mesin mana pun dari checkout bersih, nomor build yang tidak pernah mundur, pipeline TestFlight yang bisa dipicu oleh orang non-developer, peluncuran produksi yang bisa dihentikan dalam waktu kurang dari satu menit, dan laporan crash yang mengarah ke baris kode asli alih-alih alamat heksadesimal.

Panduan ini mengasumsikan sudah ada proyek Xcode dengan setidaknya satu target aplikasi. Pembahasannya mencakup konfigurasi signing, autentikasi API App Store Connect, pembuatan versi yang deterministik, otomasi archive dan export dengan `xcodebuild` serta fastlane, pengelolaan kohort TestFlight, rilis App Store bertahap, unggah simbol, dan gerbang kualitas yang seharusnya mencegah build buruk sampai ke pengguna.

Gagasan utamanya: **sebuah rilis adalah artefak, bukan sebuah momen**. Jika proses rilis Anda tidak dapat dijalankan ulang dari sebuah tag dan menghasilkan archive yang sebanding byte demi byte, maka itu belum bisa disebut proses — itu masih sekadar ingatan tentang apa yang pernah dilakukan seseorang.

## Praktik Terbaik

### 1. Perlakukan Code Signing sebagai Konfigurasi Deklaratif

Code signing gagal ketika ia bergantung pada state yang hanya hidup di satu mesin: entri keychain yang diimpor seseorang pada 2022, provisioning profile yang diam-diam diperbarui Xcode, atau sertifikat yang ada di keychain dua anggota tim dan tidak di tempat lain. Setiap input signing harus bisa dijelaskan dalam sebuah berkas yang tersimpan di dalam source control.

Model praktisnya punya tiga lapisan deklaratif. Proyek Xcode mendeklarasikan bundle identifier, team identifier, dan entitlements. Sebuah `ExportOptions.plist` mendeklarasikan gaya signing dan profile mana yang dipakai saat export. Konfigurasi CI mendeklarasikan dari mana sertifikat dan profile berasal saat build. Jika salah satu dari ketiganya tidak terdokumentasi, signing akan rusak pada mesin berikutnya yang bukan milik penulis aslinya.

Audit yang berguna: clone repositori ke direktori baru dengan keychain kosong, lalu coba hasilkan archive distribusi. Setiap langkah yang menuntut intervensi manual adalah cacat pada prosesnya, bukan keanehan lingkungan.

### 2. Pisahkan Identitas Signing Berdasarkan Tujuan

Sertifikat development, ad hoc, enterprise, dan distribusi App Store tidak bisa saling dipertukarkan, dan mencampurnya adalah penyebab paling umum error "no signing certificate found" di CI. Simpan satu sertifikat distribusi per tim untuk build App Store, satu untuk build ad hoc internal, dan jangan biarkan mesin CI menyimpan sertifikat development yang tidak dibutuhkannya.

Merotasi sertifikat distribusi membatalkan setiap profile yang merujuknya, sehingga jumlah mesin yang memegangnya harus kecil dan diketahui. Simpan berkas `.p12` beserta kata sandinya di secret manager — bukan sebagai blob base64 yang ditempel ke berkas workflow — dan catat tanggal kedaluwarsa sertifikat di kalender tim. Sertifikat distribusi yang kedaluwarsa di tengah release train sepenuhnya bisa dihindari dan sepenuhnya fatal akibatnya.

### 3. Autentikasi Otomasi dengan API Key App Store Connect

Apple ID plus app-specific password memang berfungsi untuk manusia yang mengetik di depan keyboard, tetapi gagal untuk otomasi: kena rate limit, rusak saat kata sandi dirotasi, dan tidak bisa dibatasi cakupannya. API key App Store Connect adalah jalur yang didukung. Sebuah key terdiri atas key ID, issuer ID, dan berkas privat `.p8`, serta unggahan dan pembaruan metadata bisa dibatasi pada sebuah peran tertentu.

Buat key di menu Users and Access dengan peran tersempit yang masih bisa mengirim build — biasanya App Manager, bukan Admin. Berkas `.p8` hanya bisa diunduh sekali, jadi segera simpan. Di CI, sediakan sebagai berkas yang ditulis dari secret saat job dimulai dan hapus pada langkah pembersihan `always()`, karena `.p8` yang tertinggal di cache workspace build adalah kredensial yang bocor.

### 4. Hasilkan Nomor Versi dan Build secara Deterministik

Versi marketing (`CFBundleShortVersionString`) adalah keputusan produk. Nomor build (`CFBundleVersion`) adalah keputusan mesin, dan ia harus naik secara ketat pada setiap unggahan untuk versi tertentu — App Store Connect menolak duplikat, dan TestFlight akan tetap menampilkan build lama jika nomornya dipakai ulang.

Biarkan CI yang memiliki nomor build. Pakai nomor run pipeline, timestamp monotonik dalam format `yyyyMMddHHmm`, atau penghitung yang di-commit — apa pun yang tidak bisa mundur ketika sebuah branch di-build ulang. Timestamp waktu dinding paling robust karena bertahan pada clone baru dan tidak butuh state bersama; nomor run lebih mudah dibaca tetapi akan reset jika Anda berpindah penyedia CI.

Dua jebakan terkait: mengeset `manageAppVersionAndBuildNumber` menjadi `true` di `ExportOptions.plist` membuat Xcode menulis ulang nomor build yang sudah Anda hitung dengan hati-hati, dan `agvtool` menulis langsung ke berkas proyek sehingga harus dijalankan sebelum archive dan tidak boleh dikembalikan di tengah pipeline.

### 5. Simpan Entitlements dan Capabilities di Source Control

Capabilities hidup di dua tempat yang harus selalu konsisten: berkas `.entitlements` di repositori dan konfigurasi capability pada App ID di developer portal. Ketidakcocokan keduanya menghasilkan error signing yang tampak tidak berhubungan — App Group yang ada di kode tetapi tidak ada di portal, entitlement push yang diaktifkan untuk aplikasi tetapi tidak untuk notification service extension-nya.

Setiap target yang dirilis — aplikasi, setiap extension, setiap watch app, setiap app clip — memerlukan berkas entitlements sendiri dan prefiks bundle identifier sendiri. Saat menambah capability, perbarui portal dulu, lalu berkas entitlements, lalu regenerasi profile. Meng-commit berkas entitlements berarti reviewer bisa melihat persis apa yang diberikan pada build tersebut.

### 6. Rancang Kohort TestFlight dengan Sengaja

TestFlight bukan satu keranjang tunggal. Penguji internal (hingga 100 orang, tim yang sama, tanpa beta review) ada untuk memvalidasi bahwa build benar-benar terpasang dan bisa dijalankan. Penguji eksternal (hingga 10.000 orang, memerlukan beta review) ada untuk mendapatkan umpan balik perubahan perilaku dari orang yang tidak punya kepentingan emosional agar build tersebut berhasil.

Susun kohort berdasarkan apa yang bisa mereka bantah: grup smoke internal yang memeriksa peluncuran aplikasi, sign-in, dan satu jalur kritis; grup dogfood yang berjalan di versi produksi sebelumnya untuk menangkap bug migrasi; grup desain yang hanya menerima build ketika ada perubahan UI. Kirim catatan build yang bermakna — apa yang berubah, apa yang perlu diperhatikan, apa yang diketahui rusak — karena penguji yang tidak tahu apa yang harus diuji tidak akan melaporkan apa pun.

Build kedaluwarsa setelah 90 hari, dan ini penting untuk distribusi internal berumur panjang: alat internal yang didistribusikan lewat TestFlight akan berhenti bisa dibuka bagi penggunanya jika tidak ada build baru selama satu kuartal. Jika masa hidup itu tidak cocok untuk kasus Anda, TestFlight bukan kanal yang tepat.

### 7. Gunakan Phased Release untuk Produksi, Bukan untuk Kejutan

Phased release App Store mengirimkan pembaruan ke 1 persen pengguna, lalu 2, 5, 10, 20, 50, dan 100 persen selama tujuh hari, dan bisa dijeda kapan saja. Ini asuransi termurah dalam pengiriman aplikasi iOS: rilis yang menyebabkan crash hanya menjangkau beberapa ribu pengguna alih-alih seluruh basis pengguna Anda.

Mekanisme ini hanya membantu jika dipasangkan dengan loop observasi. Pantau crash-free sessions dan metrik funnel utama selama 24 jam pertama pada jendela 1 persen, lalu putuskan secara eksplisit apakah akan melanjutkan. Phased release yang tidak dipantau siapa pun hanyalah rilis buruk yang lebih lambat.

Perlu dicatat bahwa phased release tidak bisa diaktifkan kembali setelah sebuah versi dirilis manual ke semua pengguna, dan tidak berlaku untuk versi pertama sebuah aplikasi. Rencanakan keputusan penghentian sebelum build dikirim, bukan sesudahnya.

### 8. Simbolkan Semua yang Anda Kirim

Laporan crash tanpa dSYM hanyalah tumpukan alamat heksadesimal. Konfigurasi rilis default Swift membuang simbol dan optimizer melakukan inlining secara agresif, sehingga post-processing tidak dapat memulihkan apa yang memang tidak pernah diunggah. Setel `uploadSymbols` menjadi `true` di opsi export dan verifikasi setelah unggahan bahwa bundle `.dSYM` untuk nomor build yang tepat benar-benar ada.

Bitcode bukan lagi mekanisme yang menyelamatkan Anda di sini — App Store tidak lagi melakukan kompilasi ulang dari bitcode, sehingga dSYM yang dihasilkan build Anda adalah satu-satunya yang akan pernah ada. Arsipkan bersama `.ipa` di penyimpanan artefak, dengan kunci versi dan nomor build, dan simpan setidaknya selama Anda menyimpan laporan crash.

Untuk crash reporter pihak ketiga, unggah dSYM pada job yang sama dengan yang mengunggah build. Pipeline terpisah di mana simbol datang belakangan — atau tidak sama sekali — menghasilkan kondisi yang menjengkelkan: crash terbaru, yaitu yang paling penting, justru satu-satunya yang tidak tersimbolkan.

### 9. Pasang Gerbang Rilis pada Sinyal Kualitas, Bukan pada Optimisme

Gerbang rilis adalah kondisi yang menggagalkan pipeline alih-alih meminta manusia mengingatnya. Gerbang yang wajar: suite unit test dan UI test lulus pada konfigurasi rilis, anggaran waktu build atau ukuran biner, nol peringatan kompilasi baru pada berkas yang disentuh, crash-free rate di atas ambang untuk versi sebelumnya, dan smoke test yang lulus pada matriks perangkat fisik bila tersedia.

Jaga jumlah gerbang tetap kecil agar tidak pernah dilewati. Pipeline dengan dua belas persetujuan manual wajib adalah pipeline di mana kedua belasnya menjadi klik refleks. Tiga atau empat pemeriksaan otomatis yang benar-benar memblokir lebih bernilai daripada daftar periksa panjang yang tidak dibaca siapa pun.

### 10. Jauhkan Aset Signing dan Secret dari Repositori

Sertifikat, key `.p8`, provisioning profile, dan token API tidak boleh pernah di-commit — termasuk di branch yang kemudian dihapus, karena riwayat git bersifat permanen. Tambahkan `*.p8`, `*.p12`, `*.mobileprovision`, dan varian `ExportOptions.plist` yang memuat identifier khusus tim ke `.gitignore`.

Periksa isi provisioning profile. Sebuah profile memuat sertifikat dan UDID perangkat yang diizinkannya, sehingga profile ad hoc yang di-commit ke repositori publik membocorkan identifier perangkat semua orang di tim penguji. Profile adalah artefak yang dihasilkan; regenerasi saja daripada menyimpannya.

## Langkah Implementasi

### Langkah 1: Inventarisasi Kondisi Signing Saat Ini

Mulai dengan menuliskan apa yang ada. Baca pengaturan signing untuk target aplikasi dan setiap target yang tertanam, daftar berkas entitlements, dan catat profile mana yang saat ini terpasang.

```bash
# Tampilkan build setting terkait signing untuk setiap konfigurasi
xcodebuild -project MyApp.xcodeproj -scheme MyApp -showBuildSettings \
  | grep -E "CODE_SIGN|DEVELOPMENT_TEAM|PROVISIONING_PROFILE|PRODUCT_BUNDLE_IDENTIFIER"

# Daftar identitas signing dan provisioning profile yang terpasang
security find-identity -v -p codesigning
ls ~/Library/MobileDevice/Provisioning\ Profiles/ 2>/dev/null | head -20
```

Catat team identifier dan setiap bundle identifier dalam dokumen singkat di repositori. Dokumen ini menjadi rujukan yang diperiksa terhadap konfigurasi CI, dan merupakan hal pertama yang perlu dilihat ketika error signing muncul enam minggu kemudian.

### Langkah 2: Normalisasi Pembuatan Versi di Proyek

Pindahkan nilai versi keluar dari nilai hardcoded di berkas proyek dan ke build setting yang bisa ditimpa CI. Setel `MARKETING_VERSION` dan `CURRENT_PROJECT_VERSION` sebagai user-defined setting, lalu biarkan pipeline menimpa `CURRENT_PROJECT_VERSION` saat archive.

```bash
# Baca nilai saat ini
/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" MyApp/Info.plist
/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" MyApp/Info.plist

# Hitung nomor build monotonik untuk CI (UTC, resolusi menit)
BUILD_NUMBER="$(date -u +%Y%m%d%H%M)"
echo "Menggunakan nomor build ${BUILD_NUMBER}"
```

Simpan versi marketing di satu tempat saja — berkas `version.xcconfig` adalah opsi terbersih, karena proyek maupun pipeline bisa membacanya tanpa mem-parsing `.pbxproj`.

### Langkah 3: Tulis Konfigurasi Export yang Eksplisit

Buat satu `ExportOptions.plist` per kanal distribusi. Simpan varian app-store-connect di repositori; nama export method berubah dari `app-store` menjadi `app-store-connect` pada Xcode 15.3, jadi pastikan dulu nilai mana yang diterima versi Xcode Anda sebelum run CI pertama.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>teamID</key>
  <string>ABCDE12345</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>uploadSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
  <key>destination</key>
  <string>export</string>
</dict>
</plist>
```

Dua pengaturan yang paling banyak mencegah kegagalan membingungkan adalah `uploadSymbols` bernilai true dan `manageAppVersionAndBuildNumber` bernilai false. Yang pertama membuat laporan crash terbaca; yang kedua menghentikan Xcode menomori ulang build yang baru saja Anda hitung secara diam-diam.

### Langkah 4: Skripkan Archive dan Export Secara Lokal Lebih Dulu

Pastikan rilis dua perintah ini berjalan di mesin developer sebelum melibatkan CI. Archive yang dihasilkan `xcodebuild` identik dengan yang dihasilkan Xcode Organizer, dan memiliki perintahnya sendiri adalah hal yang membuat debugging CI bisa ditangani.

```bash
#!/bin/bash
set -euo pipefail

SCHEME="MyApp"
BUILD_NUMBER="$(date -u +%Y%m%d%H%M)"
ARCHIVE="build/MyApp-${BUILD_NUMBER}.xcarchive"

xcodebuild archive \
  -project MyApp.xcodeproj \
  -scheme "${SCHEME}" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "${ARCHIVE}" \
  -allowProvisioningUpdates \
  CURRENT_PROJECT_VERSION="${BUILD_NUMBER}"

xcodebuild -exportArchive \
  -archivePath "${ARCHIVE}" \
  -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates
```

Pastikan `.ipa` hasil export memuat bundle identifier dan nomor build yang diharapkan sebelum mengunggah apa pun.

```bash
unzip -p build/export/MyApp.ipa Payload/MyApp.app/Info.plist > /tmp/info.plist
/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" /tmp/info.plist
```

### Langkah 5: Pindahkan Kredensial Signing ke Secret CI

Mengenkode sertifikat distribusi ke dalam secret base64 adalah pola standar untuk CI terkelola, dan itu berfungsi selama secret-nya sempit. Dekode ke keychain sementara yang dihapus runner setelah selesai, dan jangan pernah mencetak materi hasil dekode.

```bash
#!/bin/bash
set -euo pipefail

KEYCHAIN="${RUNNER_TEMP}/signing.keychain-db"
KEYCHAIN_PASSWORD="$(openssl rand -hex 16)"

security create-keychain -p "${KEYCHAIN_PASSWORD}" "${KEYCHAIN}"
security set-keychain-settings -lut 21600 "${KEYCHAIN}"
security unlock-keychain -p "${KEYCHAIN_PASSWORD}" "${KEYCHAIN}"

echo "${DISTRIBUTION_P12_BASE64}" | base64 --decode > "${RUNNER_TEMP}/dist.p12"
security import "${RUNNER_TEMP}/dist.p12" -k "${KEYCHAIN}" \
  -P "${P12_PASSWORD}" -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple: \
  -k "${KEYCHAIN_PASSWORD}" "${KEYCHAIN}" > /dev/null

security list-keychains -d user -s "${KEYCHAIN}" $(security list-keychains -d user | tr -d '"')
```

Jika proyek Anda memakai manual signing di CI, pasang provisioning profile ke `~/Library/MobileDevice/Provisioning Profiles/` pada langkah yang sama. Jika memakai automatic signing, flag `-allowProvisioningUpdates` yang digabung dengan flag API key App Store Connect membuat Xcode bisa mengambil profile tanpa Apple ID yang login.

```bash
xcodebuild archive \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath build/MyApp.xcarchive \
  -allowProvisioningUpdates \
  -authenticationKeyPath "${RUNNER_TEMP}/AuthKey.p8" \
  -authenticationKeyID "${ASC_KEY_ID}" \
  -authenticationKeyIssuerID "${ASC_ISSUER_ID}"
```

### Langkah 6: Otomasi Unggahan dengan fastlane

Setelah archive dan export terskripkan, fastlane sebagian besar menjadi lapisan kenyamanan untuk unggahan, metadata, dan distribusi TestFlight — plus `match` jika Anda ingin profile dikelola di repositori privat alih-alih oleh portal.

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Archive, export, dan unggah ke TestFlight"
  lane :beta do
    api_key = app_store_connect_api_key(
      key_id: ENV.fetch("ASC_KEY_ID"),
      issuer_id: ENV.fetch("ASC_ISSUER_ID"),
      key_filepath: ENV.fetch("ASC_KEY_PATH"),
      duration: 1200
    )

    increment_build_number(
      build_number: ENV.fetch("BUILD_NUMBER")
    )

    build_app(
      scheme: "MyApp",
      configuration: "Release",
      export_method: "app-store-connect",
      export_options: { uploadSymbols: true, manageAppVersionAndBuildNumber: false },
      include_bitcode: false
    )

    upload_to_testflight(
      api_key: api_key,
      skip_waiting_for_build_processing: false,
      changelog: ENV.fetch("BUILD_NOTES", "Build internal"),
      distribute_external: false
    )
  end
end
```

Biarkan `distribute_external` bernilai false pada setiap jalur otomatis. Distribusi eksternal memicu beta review, yang memakan waktu dan bisa gagal — keputusan itu harus berupa tindakan yang disengaja, bukan efek samping dari seseorang yang push ke branch rilis.

### Langkah 7: Rangkai Pipeline dan Gerbangnya

Letakkan seluruh urutan di balik pemicu manual dengan konfirmasi wajib, dan buat pipeline gagal dengan jelas pada setiap langkah verifikasi. Workflow rilis yang bisa dimulai oleh push tag itu praktis; workflow yang bisa dimulai secara tidak sengaja dari branch fitur adalah beban.

```yaml
name: release
on:
  workflow_dispatch:
    inputs:
      version:
        description: "Versi marketing, misalnya 3.2.0"
        required: true
      distribute_external:
        description: "Kirim ke penguji eksternal"
        type: boolean
        default: false

jobs:
  beta:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - name: Pilih Xcode
        run: sudo xcode-select -s /Applications/Xcode_15.4.app
      - name: Pasang aset signing
        env:
          DISTRIBUTION_P12_BASE64: ${{ secrets.DISTRIBUTION_P12_BASE64 }}
          P12_PASSWORD: ${{ secrets.P12_PASSWORD }}
        run: bash scripts/install-signing.sh
      - name: Verifikasi kenaikan versi
        run: |
          CURRENT=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" MyApp/Info.plist)
          test "${CURRENT}" = "${{ inputs.version }}" || \
            { echo "Versi Info.plist ${CURRENT} tidak cocok dengan ${{ inputs.version }}"; exit 1; }
      - name: Test
        run: xcodebuild test -scheme MyApp -destination "platform=iOS Simulator,name=iPhone 15"
      - name: Build dan unggah
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_KEY_PATH: ${{ runner.temp }}/AuthKey.p8
        run: bundle exec fastlane beta
      - name: Arsipkan simbol dan ipa
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: symbols-${{ github.run_number }}
          path: |
            build/MyApp.xcarchive/dSYMs
            build/MyApp.ipa
          retention-days: 90
```

`if: always()` pada unggahan artefak bukan soal kesopanan — unggahan yang gagal tetap menghasilkan archive yang simbolnya akan Anda butuhkan jika build itu kelak sampai ke perangkat lewat jalur lain.

### Langkah 8: Verifikasi Build di TestFlight Sebelum Promosi

Setelah unggahan mendarat, konfirmasi tiga hal: nomor build sesuai hasil hitungan pipeline, dSYM terlampir, dan jawaban kepatuhan ekspor sudah disetel. Jawaban export compliance yang belum diisi menahan build dalam limbo "Waiting for Review" tanpa batas waktu, dan perbaikannya hanya satu key di `Info.plist` atau satu pengaturan fastlane.

```ruby
# Di Fastfile, setel kepatuhan ekspor sekali per build
upload_to_testflight(
  api_key: api_key,
  export_compliance_uses_encryption: false,
  expire_build_after: 90
)
```

Lalu distribusikan ke kohort internal, tunggu sinyal smoke test, dan baru setelah itu pertimbangkan penguji eksternal. Build yang gagal dibuka di perangkat internal tidak boleh sampai ke beta review.

### Langkah 9: Siapkan Pengiriman App Store dan Peluncuran Bertahap

Promosikan build yang sudah teruji ke versi App Store, lampirkan teks "What's New", dan aktifkan phased release saat pengiriman. Phased release dipilih per versi, dan mengaktifkannya setelah fakta hanya mungkin selama versi masih dalam review.

```ruby
lane :release do
  api_key = app_store_connect_api_key(
    key_id: ENV.fetch("ASC_KEY_ID"),
    issuer_id: ENV.fetch("ASC_ISSUER_ID"),
    key_filepath: ENV.fetch("ASC_KEY_PATH")
  )

  upload_to_app_store(
    api_key: api_key,
    app_version: ENV.fetch("MARKETING_VERSION"),
    submit_for_review: true,
    automatic_release: false,
    phased_release: true,
    precheck_include_in_app_purchases: false,
    submission_information: {
      add_id_info_uses_idfa: false
    }
  )
end
```

Dengan `automatic_release: false`, versi tersebut berada di status "Pending Developer Release" setelah disetujui, yang memberi Anda titik keputusan manusia antara persetujuan dan pengguna. Gabungkan dengan phased release, dan Anda memiliki dua kontrol independen atas radius dampak rilis.

### Langkah 10: Pantau Peluncuran dan Tutup Loopnya

Selama jendela bertahap, pantau crash-free sessions, waktu peluncuran, dan metrik yang paling penting untuk rilis tersebut. Jika kohort 1 persen menunjukkan regresi, hentikan rollout dari App Store Connect; itu menahan pengiriman pada persentase saat ini alih-alih mengembalikan versi — pengguna yang sudah memperbarui tetap berada di versi baru, sehingga perbaikannya adalah build baru, bukan rollback.

```bash
# Hentikan phased release lewat App Store Connect API
curl -X PATCH "https://api.appstoreconnect.apple.com/v1/appStoreVersions/${VERSION_ID}" \
  -H "Authorization: Bearer ${ASC_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"data":{"type":"appStoreVersions","id":"'"${VERSION_ID}"'","attributes":{"phasedReleaseState":"PAUSED"}}}'
```

Ketika rollout selesai, beri tag pada commit yang menghasilkan build tersebut, lampirkan archive dan bundle dSYM pada catatan rilis tag itu, dan catat baseline crash-free versi tersebut. Catatan itulah yang membuat ambang gerbang rilis berikutnya bermakna alih-alih sembarang.

## Kesimpulan

Release engineering adalah bagian pengembangan iOS di mana sedikit struktur di awal menghilangkan banyak rasa sakit yang berulang. Signing deklaratif, autentikasi berbasis API key, nomor build yang dimiliki pipeline, unggahan simbol, dan rollout bertahap dengan loop observasi semuanya murah untuk disiapkan sekali dan mahal untuk ditambal di bawah tekanan.

Ukuran pipeline distribusi yang baik bukanlah bahwa ia berfungsi hari ini, melainkan bahwa ia berfungsi identik pada mesin yang belum pernah membangun proyek ini, untuk developer yang belum pernah merilis aplikasi iOS. Bangunlah menuju standar itu, dan rilis berhenti menjadi sebuah peristiwa.
