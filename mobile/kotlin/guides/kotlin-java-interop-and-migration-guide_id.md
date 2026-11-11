---
title: "Panduan Interop dan Migrasi Kotlin ke Java"
description: "Merancang API Kotlin yang ramah Java dan null-safe serta memigrasikan basis kode campuran Java/Kotlin secara bertahap tanpa merusak kompatibilitas biner atau framework berbasis refleksi."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Interop dan Migrasi Kotlin ke Java

## Pendahuluan

Hampir tidak ada basis kode Kotlin yang murni Kotlin. Proyek Android membawa warisan Java dari era sebelum 2017, backend JVM mewarisi lapisan Spring dan JPA yang ditulis dengan Java, dan library bersama harus dapat dikonsumsi oleh kedua ekosistem bahasa. Kompiler Kotlin membuat koeksistensi ini terasa mudah pada awalnya: kelas Java dapat diimpor, kelas Kotlin terlihat dari Java, dan modul campuran dapat dikompilasi tanpa konfigurasi apa pun. Kelancaran itulah yang membuat bug interop begitu mahal — bug tersebut muncul sebagai `NullPointerException` saat runtime, sebagai `NoSuchMethodError` setelah refactor yang tampak tidak berbahaya, atau sebagai kegagalan injeksi dependensi ketika framework tidak menemukan konstruktor yang diharapkannya.

Asimetri intinya adalah ini: **Kotlin memahami Java, tetapi Java tidak memahami Kotlin.** Ketika Kotlin memanggil Java, kompiler menurunkan tipe Java tanpa anotasi menjadi *platform type* (`String!`), yang berarti "nullable atau tidak, saya menolak menyebutkannya" — kompiler berhenti membantu Anda. Ketika Java memanggil Kotlin, kompiler menghasilkan metode sintetis tambahan, nama yang di-mangle, serta anotasi `@NotNull`/`@Nullable` yang hanya sebagian dihormati perkakas Java, sehingga bentuk sisi Java dari sebuah kelas Kotlin jarang sama dengan bentuk yang Anda tulis.

Panduan ini membahas kedua arah asimetri tersebut lalu strategi migrasi yang menyatukannya: cara memperkuat call site Java, cara merancang permukaan API sisi Java secara sengaja pada tipe Kotlin, cara bertahan menghadapi framework yang bergantung pada refleksi, dan cara mengonversi modul dari Java ke Kotlin secara bertahap sambil menjaga setiap commit tetap dapat dikompilasi dan setiap API yang dipublikasikan tetap kompatibel secara biner.

## Praktik Terbaik

### 1. Perlakukan Platform Type sebagai Input yang Tidak Tepercaya

Platform type adalah cara kompiler memberi tahu bahwa ia tidak memiliki informasi nullability. Setiap nilai yang menyeberang dari Java ke Kotlin harus divalidasi di batas, bukan jauh di dalam logika bisnis. Disiplin termurah adalah segera memberikan tipe deklaratif pada batas tersebut: tetapkan hasil Java ke tipe Kotlin yang eksplisit nullable, lalu tangani kasus null di tempat kegagalan masih dapat dikaitkan dengan pemanggilan tertentu.

```kotlin
// Library Java mengembalikan platform type: kompiler tidak akan memperingatkan di sini.
val legacyName: String? = legacyUserService.findDisplayName(id) // tipe nullable eksplisit

val displayName = legacyName?.trim()?.takeIf { it.isNotEmpty() }
    ?: throw IllegalStateException("Pengguna legacy $id tidak memiliki nama tampilan")
```

Hindari kesalahan sebaliknya, yaitu menegaskan non-null dengan `!!` di batas. `!!` mengubah masalah data yang sebenarnya dapat didiagnosis menjadi `NullPointerException` anonim dengan stack trace yang menunjuk ke asersi Anda, bukan ke cacat yang sebenarnya.

### 2. Rancang Permukaan API Sisi Java Secara Sengaja

Jangan pernah membiarkan API Java dari sebuah kelas Kotlin menjadi kebetulan dari cara Anda menulis Kotlin-nya. Tentukan sejak awal anggota mana yang akan dipakai konsumen Java, dan berikan bentuk yang akan dirancang oleh pengembang Java: metode statis sungguhan, overload sungguhan, tanpa parameter default yang hanya hidup di metadata Kotlin, dan tanpa indireksi companion object.

Aturan yang berguna: **jika sebuah anggota tidak ditujukan untuk Java, jadikan `internal`.** Kompiler Kotlin kemudian akan me-mangle atau menyembunyikannya, sehingga Anda tidak berkomitmen pada bentuk yang tidak pernah Anda rancang.

### 3. Terapkan `@JvmStatic`, `@JvmField`, dan `@JvmOverloads` dengan Sengaja

Ketiga anotasi ini adalah tuas utama untuk membuat Kotlin terasa native bagi Java, dan masing-masing memiliki biaya.

- `@JvmStatic` pada anggota companion object menghasilkan metode statis sungguhan pada kelas pembungkusnya. Gunakan untuk metode factory dan konstanta yang benar-benar dipanggil konsumen Java; menerapkannya di mana-mana menggandakan permukaan API yang dihasilkan tanpa manfaat.
- `@JvmField` mengekspos properti sebagai field publik biasa, melewati getter/setter yang dihasilkan. Anotasi ini hanya bekerja pada properti tanpa custom accessor atau delegation, dan ia membekukan field tersebut dalam API biner Anda — perlakukan sebagai keputusan permanen.
- `@JvmOverloads` menghasilkan rantai overload untuk fungsi dengan parameter default. Ini satu-satunya cara Java dapat memanggil `fun render(title: String, size: Int = 14, bold: Boolean = false)` tanpa mengirim semua argumen.

```kotlin
class ReportFormatter @JvmOverloads constructor(
    private val locale: Locale = Locale.getDefault(),
    private val debug: Boolean = false
) {
    companion object {
        @JvmStatic
        fun forEnglish(): ReportFormatter = ReportFormatter(Locale.ENGLISH)
    }

    @JvmOverloads
    fun format(body: String, width: Int = 80, wrap: Boolean = true): String =
        if (wrap) body.chunked(width).joinToString("\n") else body
}
```

Dari Java, kini tersedia `new ReportFormatter()` maupun `new ReportFormatter(locale)`, dan `format(body)` dapat dipanggil tanpa mengirim nilai default.

### 4. Stabilkan Nama Biner dengan `@JvmName` dan `@file:JvmName`

Kotlin melakukan mangling nama pada dua situasi yang penting bagi pemanggil Java: fungsi top-level mendarat di file-class yang dinamai sesuai nama file (`UserUtilsKt`), dan fungsi yang bertabrakan setelah type erasure mendapat sufiks (`filter$default`). Keduanya merusak kode Java begitu seseorang mengganti nama file — dan keduanya diperbaiki dengan anotasi eksplisit, bukan dengan berharap tidak ada yang mengganti nama.

```kotlin
@file:JvmName("StringFormatting")
package com.example.shared.text

fun slugify(input: String): String =
    input.trim().lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
```

Java kini memanggil `StringFormatting.slugify(...)`, dan file dapat diganti nama dengan bebas. Trik yang sama menyelesaikan tabrakan erasure, di mana `@JvmName("parseUsers")` dan `@JvmName("parseOrders")` memungkinkan dua overload hidup berdampingan yang jika tidak akan bertabrakan.

### 5. Jembatani Variance Kotlin dan Wildcard Java Secara Eksplisit

Variance di sisi deklarasi pada Kotlin (`out T`, `in T`) dan wildcard di sisi pemakaian pada Java (`? extends T`, `? super T`) adalah dua pengkodean dari gagasan yang sama, dan kompiler menerjemahkan di antara keduanya. Penerjemahan itu biasanya berhasil, tetapi menghasilkan signature yang terasa aneh bagi pengembang Java, dan kadang menghasilkan signature yang sama sekali tidak dapat dikompilasi dari Java.

Ketika pemanggil Java tidak dapat mengirim `List<Subtype>` di tempat Anda mendeklarasikan `List<Base>`, jawabannya hampir tidak pernah "lakukan cast di Java". Gunakan `@JvmSuppressWildcards` pada tipe parameter untuk menghasilkan `List<Base>` biasa, atau `@JvmWildcard` untuk memaksa wildcard di tempat kompiler menghilangkannya.

```kotlin
interface Repository<out T> {
    // Tanpa anotasi, signature Java menjadi Collection<? extends T>
    fun saveAll(items: Collection<@JvmSuppressWildcards T>): Int
}
```

### 6. Utamakan `fun interface` daripada Interface Metode Tunggal Java

`fun interface` Kotlin dikompilasi menjadi functional interface Java sungguhan, sehingga lambda Java bekerja di call site persis seperti pada `Runnable` atau `Predicate`. Interface reguler dengan satu metode **tidak** memperoleh konversi SAM di sisi Java seperti yang Anda harapkan dari `@FunctionalInterface`; menggunakan `fun interface` adalah perbaikan deklaratifnya.

```kotlin
fun interface RetryPolicy {
    fun shouldRetry(attempt: Int, error: Throwable): Boolean
}

val policy = RetryPolicy { attempt, error ->
    attempt < 3 && error is IOException
}
```

Di sisi Kotlin ini juga mengaktifkan sintaks trailing lambda, sehingga kedua ekosistem memperoleh ergonomi yang mereka harapkan dari deklarasi yang sama.

### 7. Deklarasikan Checked Exception di Batas

Kotlin tidak memiliki checked exception, dan kompiler tidak akan memperingatkan ketika fungsi Kotlin melempar sesuatu yang dianggap checked oleh Java. Pemanggil Java kemudian tidak dapat mengompilasi `try/catch` mereka (karena kompiler menyatakan exception tersebut tidak pernah dilempar) atau diam-diam kehilangan kemampuan menangani mode kegagalan yang terdokumentasi.

Setiap fungsi yang ditujukan untuk Java dan dapat melempar checked exception memerlukan `@Throws`. Ini bukan kosmetik: anotasi tersebut mengubah signature bytecode yang dihasilkan dan karenanya mengubah kontrak sisi Java.

```kotlin
@Throws(IOException::class)
fun exportTo(file: File, rows: List<Row>) {
    file.outputStream().bufferedWriter().use { writer ->
        rows.forEach { writer.write(it.toCsvLine()) }
    }
}
```

### 8. Jauhkan Semantik Khusus Kotlin dari Kontrak Java

Beberapa fitur Kotlin tidak memiliki padanan di Java dan diam-diam menjadi jebakan ketika diekspos langsung:

- **Parameter default** hilang dari Java kecuali dianotasi `@JvmOverloads` — Java hanya melihat metode dengan aritas penuh.
- **`copy` dan `componentN` pada `data class`** dihasilkan tetapi tidak bermakna bagi Java, yang tidak dapat melakukan destructuring.
- **Hierarki sealed** dikompilasi menjadi kelas biasa; Java dapat mengimplementasikan atau mewarisinya kecuali konstruktornya `internal`, dan itulah penegakan yang sebenarnya Anda inginkan.
- **Extension function** adalah metode statis pada file-class, sehingga terbaca sebagai `ExtensionsKt.trimToLength(x)` alih-alih `x.trimToLength()`.
- **Inline class dan value class** di-mangle pada tingkat bytecode dan praktis tidak dapat dipakai dari Java.

Kebiasaan defensifnya: untuk tipe apa pun yang akan dikonsumsi Java, tambahkan adapter kecil di batas alih-alih mengekspos tipe Kotlin secara langsung. Wrapper yang ditulis tangan jauh lebih murah daripada call site yang membingungkan selama setahun.

### 9. Migrasi dari Daun ke Akar dan Bekukan Batasnya

Urutan migrasi menentukan seberapa besar rasa sakit yang Anda serap. Mengonversi kelas daun (tanpa dependen Kotlin, sedikit pemanggil Java) bersifat reversibel dan dapat diuji secara terisolasi. Mengonversi service pusat terlebih dahulu memaksa setiap pemanggil berubah dalam commit yang sama, dan itulah cara "migrasi" berubah menjadi branch enam minggu yang tidak pernah di-merge.

Dua aturan membuat migrasi aman:

1. **Modul dapat dikompilasi dan test suite lulus pada setiap commit.** Kotlin dan Java berdampingan dalam satu source set, jadi tidak ada alasan teknis untuk keadaan antara yang rusak.
2. **Sebuah pemeriksaan statis mencegah Java baru ditambahkan ke paket yang sudah dimigrasikan.** Tanpa gerbang itu, migrasi tidak akan pernah selesai — file terus muncul dalam bahasa yang sedang Anda tinggalkan.

Kompatibilitas biner layak mendapat aturan tersendiri: mengonversi kelas ke Kotlin mengubah API yang dihasilkan (getter menjadi properti, konstruktor mendapat parameter sintetis). Jika kelas tersebut dipublikasikan sebagai library, jalankan validator kompatibilitas biner di CI sebelum publikasi, bukan sesudahnya.

## Langkah Implementasi

### Langkah 1: Petakan Batas Interop

Mulailah dengan mendaftar kelas mana yang menyeberangi batas bahasa dan ke arah mana. Jangan menebak — ukurlah.

```bash
# File Kotlin yang mengimpor kelas Java dari modul yang sama
grep -rl "^import com.example" --include="*.kt" . | head -50

# File Java yang mereferensikan file-class hasil generate Kotlin
grep -rn "Kt\." --include="*.java" . | grep -v "\.class" | head -50

# Hitung file sumber per bahasa untuk mengukur skala migrasi
find . -name "*.kt" -not -path "*/build/*" | wc -l
find . -name "*.java" -not -path "*/build/*" | wc -l
```

Catat batas tersebut dalam dokumen singkat: setiap kelas Kotlin yang memiliki pemanggil Java, setiap kelas Java yang memiliki pemanggil Kotlin, dan setiap titik masuk framework (konstruktor, target `@Inject`, tipe `@Entity`, model serialisasi). Daftar ini adalah backlog migrasi sekaligus sumber setiap item risiko pada langkah berikutnya.

### Langkah 2: Konfigurasi Modul Campuran Java dan Kotlin

Modul campuran tidak memerlukan plugin khusus, tetapi memerlukan tata letak sumber yang disengaja dan keselarasan target JVM. Kotlin dan Java harus dikompilasi ke versi bytecode yang sama atau kompiler Java akan gagal membaca output Kotlin.

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.0.20"
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        // Gagalkan build pada peringatan kompiler di kode interop: biasanya itu cacat nyata
        allWarningsAsErrors.set(true)
        // Hasilkan anotasi JSR-305 untuk konsumen Java
        freeCompilerArgs.add("-Xjvm-default=all")
    }
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

dependencies {
    implementation(kotlin("stdlib"))
    testImplementation(kotlin("test"))
}
```

Dua pengaturan paling penting. `jvmToolchain(21)` menjaga kedua kompiler pada satu target, dan `-Xjvm-default=all` membuat default method pada interface menjadi default method Java sungguhan alih-alih indireksi `DefaultImpls` — yang memang diharapkan pemanggil Java ketika mereka mengimplementasikan interface Kotlin.

### Langkah 3: Perkuat Call Site Java dengan Kontrak Nullability

Cara tercepat menghilangkan risiko platform type adalah membuat sisi Java menyatakan kebenaran. Tambahkan anotasi JSpecify atau JSR-305 pada kelas Java yang dikonsumsi Kotlin; kompiler Kotlin kemudian membaca nullability yang sebenarnya alih-alih turun menjadi platform type.

```java
// Sebelum: Kotlin melihat String! dan tidak dapat membantu
public String findDisplayName(long id) {
    return repository.find(id).map(User::name).orElse(null);
}
```

```java
// Sesudah: Kotlin melihat String? dan memaksa pemeriksaan null
import org.jspecify.annotations.Nullable;

public @Nullable String findDisplayName(long id) {
    return repository.find(id).map(User::name).orElse(null);
}
```

Selanjutnya ubah setiap call site batas menjadi tipe Kotlin eksplisit dan hapus semua `!!` dari kode interop. Audit praktisnya:

```bash
# Temukan asersi non-null di kode yang menyentuh API Java
grep -rn '!!' --include="*.kt" . | grep -v "/build/"
```

Setiap `!!` yang tersisa adalah anotasi yang hilang di sisi Java atau cabang null yang hilang di sisi Kotlin. Perbaiki penyebabnya, bukan asersinya.

### Langkah 4: Bentuk Permukaan API Sisi Java

Untuk setiap kelas Kotlin yang memiliki pemanggil Java, tuliskan signature Java yang dituju sebelum menyentuh anotasi. Lalu terapkan anotasi yang menghasilkan bentuk tersebut.

```kotlin
class CacheClient private constructor(
    private val backend: CacheBackend,
    private val ttlSeconds: Long
) {
    companion object {
        // Factory statis sungguhan untuk Java: CacheClient.create(backend)
        @JvmStatic
        @JvmOverloads
        fun create(backend: CacheBackend, ttlSeconds: Long = 300): CacheClient =
            CacheClient(backend, ttlSeconds)

        // Konstanta yang dapat dibaca Java tanpa noise getter
        @JvmField
        val DEFAULT_REGION: String = "eu-west-1"
    }

    @JvmOverloads
    fun get(key: String, refresh: Boolean = false): String? =
        backend.read(key, refresh)
}
```

Verifikasi hasilnya alih-alih memercayai kode sumber. `javap` menunjukkan persis apa yang akan dilihat Java:

```bash
# Periksa permukaan Java yang dihasilkan dari kelas Kotlin terkompilasi
javap -classpath build/classes/kotlin/main com.example.cache.CacheClient
```

Jika `javap` tidak menampilkan `public static CacheClient create(CacheBackend)`, anotasinya berada di tempat yang salah — paling sering pada companion object alih-alih pada anggotanya.

### Langkah 5: Selesaikan Ketidakcocokan Generik dan Variance

Ketika call site Java gagal dikompilasi terhadap deklarasi Kotlin, baca signature yang dihasilkan terlebih dahulu, lalu putuskan apakah yang diubah adalah deklarasinya atau call site-nya.

```kotlin
class EventBus {
    private val subscribers = mutableListOf<Subscriber>()

    // Pemanggil Java dapat mengirim List<SubscriberImpl> tanpa akrobat wildcard
    fun registerAll(all: List<@JvmSuppressWildcards Subscriber>) {
        subscribers.addAll(all)
    }

    // Paksa wildcard di tempat aturan PECS Java membutuhkannya
    fun publish(event: @JvmWildcard Class<out DomainEvent>) {
        subscribers.forEach { it.onEvent(event) }
    }
}
```

Aturan keputusannya: tekan wildcard pada **parameter koleksi yang Anda maksudkan untuk diisi Java**, dan paksa wildcard pada **posisi konsumen** di mana sistem tipe Java membutuhkan kelenturan. Jangan pernah menutupi ketidakcocokan dengan cast unchecked di Java — itu memindahkan diagnostik waktu kompilasi menjadi `ClassCastException` saat runtime.

### Langkah 6: Buat Kontrak Exception Eksplisit

Audit setiap fungsi Kotlin yang dipanggil dari Java dan melakukan I/O, mem-parsing input tidak tepercaya, atau melakukan refleksi. Masing-masing memerlukan `@Throws` yang mencantumkan persis apa yang boleh ditangkap Java — tidak lebih, tidak kurang, karena mendeklarasikan berlebihan memaksa blok `catch` yang mati.

```kotlin
@Throws(IOException::class, MalformedInputException::class)
fun parseConfig(source: Path): Config {
    val text = try {
        Files.readString(source)
    } catch (e: IOException) {
        throw IOException("Tidak dapat membaca konfigurasi di $source", e)
    }
    return ConfigParser.parse(text) // melempar MalformedInputException
}
```

Jaga sisi Kotlin tetap idiomatik — utamakan mengembalikan `Result<T>` atau tipe error sealed untuk kode khusus Kotlin yang baru — dan sisakan `@Throws` untuk anggota yang benar-benar dikonsumsi Java. Mencampur kedua gaya dalam satu kelas tidak masalah selama anggota yang menghadap Java adalah yang dianotasi.

### Langkah 7: Interop dengan Framework Java Berbasis Refleksi

Framework adalah permukaan paling berisiko karena mereka tidak membaca semantik Kotlin; mereka membaca bytecode. Empat pola menyebabkan sebagian besar kegagalan:

- **Injeksi dependensi melalui konstruktor.** Framework dengan auto-wiring konstruktor tunggal bekerja baik. Framework yang memerlukan konstruktor tanpa argumen membutuhkan `@JvmOverloads` pada konstruktor primer dengan semua parameter default, atau konstruktor sekunder eksplisit.
- **Entitas JPA.** Entitas memerlukan konstruktor tanpa argumen dan properti non-final. Kelas dan properti Kotlin final secara default, sehingga plugin entitas ada justru untuk alasan ini:

```kotlin
// build.gradle.kts
plugins {
    kotlin("plugin.jpa") version "2.0.20"
    kotlin("plugin.noarg") version "2.0.20"
    kotlin("plugin.allopen") version "2.0.20"
}

noArg {
    annotation("jakarta.persistence.Entity")
}
```

- **Deserialisasi Jackson.** Data class dengan nilai default memerlukan `jackson-module-kotlin` agar Jackson memakai konstruktor primer; tanpa itu Jackson jatuh ke refleksi field dan nilai default diabaikan.
- **Target anotasi.** Anotasi Kotlin pada properti mendarat pada parameter konstruktor secara default. Framework persistensi yang membaca field memerlukan target eksplisit: `@field:Column(name = "user_name")`.

```kotlin
@Entity
class Invoice(
    @field:Id @field:GeneratedValue
    var id: Long? = null,
    @field:Column(name = "issued_at", nullable = false)
    var issuedAt: Instant = Instant.now()
)
```

### Langkah 8: Buktikan Batasnya dengan Tes Lintas Bahasa

Unit test yang ditulis dalam Kotlin tidak menguji kontrak sisi Java — mereka memanggil signature Kotlin, yang justru bukan yang berisiko. Tambahkan sekumpulan kecil tes Java yang memanggil batas tersebut seperti konsumen Java: overload konstruktor, factory statis, penghilangan argumen default, checked exception, dan generik.

```java
// src/test/java/com/example/cache/CacheClientJavaInteropTest.java
class CacheClientJavaInteropTest {

    @Test
    void staticFactoryUsesDefaultTtl() {
        CacheClient client = CacheClient.create(new InMemoryCacheBackend());
        assertNotNull(client);
    }

    @Test
    void formatAcceptsPositionalArguments() {
        ReportFormatter formatter = ReportFormatter.forEnglish();
        assertTrue(formatter.format("hello world").contains("hello"));
    }

    @Test
    void checkedExceptionIsCatchable() {
        assertThrows(IOException.class, () -> new ConfigLoader().parseConfig(Path.of("/missing")));
    }
}
```

Jika tes ini tidak dapat dikompilasi, kontrak interop rusak meskipun test suite Kotlin hijau. Sambungkan ke CI sebagai job wajib — tes Java yang gagal dikompilasi adalah deteksi termurah atas perubahan API yang tidak disengaja.

### Langkah 9: Jalankan Migrasi secara Bertahap

Dengan batas yang sudah dipetakan dan diuji, migrasikan dalam kenaikan kecil yang reversibel.

1. **Konversi daun terlebih dahulu.** Pilih kelas tanpa dependen Kotlin dan dengan sedikit pemanggil Java. Konversi dengan converter Java-ke-Kotlin dari IDE, lalu perbaiki kesalahannya — converter itu andal salah pada nullability, state statis, dan generik.
2. **Satu bahasa per commit per paket.** Commit yang menambahkan Kotlin untuk `com.example.legacy.reports` dan menghapus Java-nya mudah ditinjau; commit yang menyentuh lima paket tidak.
3. **Jalankan tes interop Java setelah setiap konversi.** Itu satu-satunya sinyal bahwa permukaan yang dihasilkan masih cocok dengan harapan pemanggil.
4. **Tambahkan gerbang yang mengakhiri migrasi:**

```bash
# Gagalkan build jika Java baru muncul di paket yang sudah dimigrasikan
if grep -rq --include="*.java" "" src/main/java/com/example/reports; then
    echo "Paket yang sudah dimigrasikan masih berisi file Java; konversi atau pindahkan" >&2
    exit 1
fi
```

1. **Validasi kompatibilitas biner sebelum publikasi.** Jika modul adalah library, jalankan validator seperti `binary-compatibility-validator` agar penghapusan API yang tidak disengaja menggagalkan CI alih-alih build konsumen.
2. **Hapus sumber Java hanya setelah** versi Kotlin rilis selama satu siklus. Menyimpannya satu rilis lebih lama tidak merugikan; menghapusnya terlalu dini memaksa rollback.

Ketika file Java terakhir dalam sebuah paket hilang, hapus anotasi JSR-305 dari tetangganya, buang `@JvmStatic` dan `@JvmOverloads` yang tidak lagi memiliki konsumen Java, lalu jalankan kembali seluruh suite. Anotasi interop adalah utang: lunasi segera setelah alasan keberadaannya hilang.
