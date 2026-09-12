---
title: "Layanan Background Android dengan WorkManager"
description: "Tutorial tingkat lanjut tentang pekerjaan background di Android dengan WorkManager — membandingkannya dengan Services dan AlarmManager, lalu membangun OneTimeWorkRequest, PeriodicWorkRequest, constraints, chaining, kebijakan retry, unique work, dan contoh CoroutineWorker."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Layanan Background Android dengan WorkManager

## Ringkasan

Tutorial ini membahas eksekusi background di Android dengan WorkManager, solusi modern dari Jetpack untuk pekerjaan yang dapat ditunda namun dijamin dijalankan. Anda akan membangun worker sinkronisasi upload foto yang bertahan dari restart aplikasi, menghormati batasan baterai, mencoba ulang dengan backoff eksponensial, dan merangkai tugas yang saling bergantung — menggunakan coroutine Kotlin dari awal hingga akhir.

## Target Audiens

- Pengembang Android yang telah membuat aplikasi dasar dan kini membutuhkan pemrosesan background yang andal.
- Tingkat mahir. Diperlukan pemahaman tentang coroutine Kotlin, ViewModel, dan pustaka Jetpack.

## Prasyarat

- Android Studio dengan API level 21+ (WorkManager membutuhkan 14+, tetapi 21+ membuka lebih banyak fitur).
- Kotlin 1.9+, kotlinx-coroutines, dan `androidx.work:work-runtime-ktx` (2.9+) ditambahkan ke modul.
- Pengetahuan dasar coroutine dan injeksi dependensi (Hilt atau DI manual).
- Perangkat atau emulator untuk menguji perilaku background (pengujian mode Doze adalah nilai tambah).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menentukan kapan memakai WorkManager alih-alih Service atau AlarmManager.
- Mengonfigurasi OneTimeWorkRequest dan PeriodicWorkRequest dengan benar.
- Melampirkan constraints (jaringan, pengisian daya, baterai tidak rendah) pada permintaan kerja.
- Merangkai pekerjaan yang saling bergantung dengan `beginWith` dan `Then`.
- Menetapkan kebijakan retry dengan `BackoffPolicy.EXPONENTIAL` dan `BackoffPolicy.LINEAR`.
- Mengantrekan unique work agar sebuah pekerjaan tidak pernah berjalan dua kali bersamaan.
- Mengimplementasikan `CoroutineWorker` dengan kode ramah suspend.

## Konteks dan Motivasi

Android memiliki tiga cara lama untuk menjalankan pekerjaan background — `Service`, `JobScheduler`, dan `AlarmManager` — dan masing-masing memiliki kelemahan serius. `Service` biasa menjaga proses tetap hidup sampai dibunuh, menguras baterai dan sangat dibatasi di Android modern (foreground service kini wajib menampilkan notifikasi). `AlarmManager` dibuat untuk alarm presisi seperti pengingat kalender; memanggil jaringan dari alarm setiap beberapa menit akan membuat aplikasi dibatasi pada mode Doze. `JobScheduler` memang kuat tetapi verbose dan hanya tersedia di API 21+.

WorkManager menyelesaikan masalah nyata: *eksekusi yang dijamin namun dapat ditunda*. Jika worker upload Anda mati di tengah jalan karena ponsel memasuki Doze, WorkManager menjadwalkannya ulang secara otomatis. WorkManager menghormati constraint sistem, bertahan dari kematian proses, dan menyimpan pekerjaan tertunda di basis datanya sendiri — itulah sebabnya Google menonaktifkan GCMNetworkManager dan merekomendasikan migrasi dari Firebase JobDispatcher ke WorkManager.

## Konten Inti

### WorkManager vs Services vs AlarmManager

| Alat | Terbaik untuk | Jaminan | Membangunkan perangkat? | API level |
|------|---------------|---------|-------------------------|-----------|
| `Service` (foreground) | Tugas jangka panjang yang terlihat pengguna (musik, navigasi) | Proses bisa dibunuh | Wajib notifikasi | 1+ |
| `AlarmManager` | Alarm presisi dan kejadian kritis waktu (pengingat) | Tetap berjalan saat Doze bila memakai `setExactAndAllowWhileIdle` | Ya (boros baterai) | 1+ |
| `JobScheduler` | Pekerjaan batch yang sadar kondisi sistem | Bertahan dari reboot | Di-batch, hormati Doze | 21+ |
| WorkManager | Pekerjaan yang dijamin dan dapat ditunda (sinkronisasi, upload, ekspor) | Tersimpan di DB sendiri, dijadwalkan ulang otomatis | Dihormati oleh Doze | 14+ (14-22 via Firebase) |

### OneTimeWorkRequest vs PeriodicWorkRequest

`OneTimeWorkRequest` berjalan tepat satu kali (mungkin dicoba ulang). `PeriodicWorkRequest` berjalan berulang dengan interval minimum 15 menit — interval itu hanyalah *minimum*; sistem boleh menunda eksekusi demi menghemat baterai. Pekerjaan periodik tidak dapat dirangkai, dan perilaku retry-nya dibatasi, sehingga tugas berulang jangka panjang lebih baik dinyatakan sebagai one-time worker yang mengantrekan dirinya sendiri lagi.

### Constraints

Constraints membatasi eksekusi berdasarkan kondisi perangkat: `NetworkType.CONNECTED`, `BatteryNotLow`, `Charging`, `StorageNotLow`, dan `RequiresDeviceIdle`. Menerapkan `NetworkType.CONNECTED` pada worker upload berarti pekerjaan menunggu — selamanya bila perlu — hingga jaringan tersedia, alih-alih langsung gagal.

### Chaining, Unique Work, dan Backoff

Chaining membuat graf berarah: `beginWith(workA).then(workB)` menjalankan B hanya jika A berhasil. Unique work (`enqueueUniqueWork`) menjamin hanya satu instance dari rantai bernama yang ada — penting untuk pekerjaan seperti "sinkronkan semua pesanan" yang tidak boleh berjalan bersamaan. Saat gagal, backoff menentukan kapan percobaan ulang terjadi; `BackoffPolicy.EXPONENTIAL` dengan `setBackoffCriteria` menggandakan jeda pada setiap percobaan.

## Contoh Kode

Definisikan `CoroutineWorker` yang mengunggah foto:

```kotlin
package com.example.syncapp.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import java.io.File

class PhotoUploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val photoPath = inputData.getString(KEY_PHOTO_PATH)
            ?: return Result.failure() // tidak ada data — gagal cepat
        return try {
            setProgress(workDataOf("remote_id" to uploadPhoto(File(photoPath))))
            Result.success()
        } catch (e: NetworkTimeoutException) {
            Result.retry() // sementara — dicoba ulang via kebijakan backoff
        } catch (e: IOException) {
            if (runAttemptCount < MAX_ATTEMPTS) Result.retry() else Result.failure()
        } catch (e: Exception) {
            Result.failure()
        }
    }

    private suspend fun uploadPhoto(file: File): String {
        // Panggilan API asli di sini (Retrofit/Ktor); disimulasikan agar contoh berdiri sendiri
        delay(2_000)
        if (file.length() > 25_000_000) throw IOException("File terlalu besar")
        return "img_${System.currentTimeMillis()}"
    }

    companion object {
        const val KEY_PHOTO_PATH = "photo_path"
        private const val MAX_ATTEMPTS = 3
    }
}
```

Antrekan one-time work dengan constraints dan backoff:

```kotlin
class PhotoSyncViewModel : ViewModel() {
    private val workManager = WorkManager.getInstance(application)

    fun uploadPhoto(photo: File) {
        val request = OneTimeWorkRequestBuilder<PhotoUploadWorker>()
            .setInputData(workDataOf(PhotoUploadWorker.KEY_PHOTO_PATH to photo.absolutePath))
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .setRequiresBatteryNotLow(true)
                    .build()
            )
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                OneTimeWorkRequest.MIN_BACKOFF_MILLIS
            )
            .build()
        workManager.enqueueUniqueWork(
            "upload_${photo.name}",
            ExistingWorkPolicy.REPLACE,
            request
        )
    }
}
```

Pekerjaan periodik dengan interval minimum 15 menit:

```kotlin
val periodic = PeriodicWorkRequestBuilder<PhotoUploadWorker>(15, TimeUnit.MINUTES)
    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
    .build()

workManager.enqueueUniquePeriodicWork("nightly_sync", ExistingPeriodicWorkPolicy.UPDATE, periodic)
```

Merangkai tiga langkah yang saling bergantung:

```kotlin
workManager
    .beginWith(OneTimeWorkRequestBuilder<DownloadAssetWorker>().build())
    .then(OneTimeWorkRequestBuilder<ProcessAssetWorker>().build())
    .then(OneTimeWorkRequestBuilder<UploadAssetWorker>().build())
    .enqueue()
```

## Insight Penting

- Utamakan WorkManager kecuali tugasnya terlihat pengguna (foreground `Service`) atau butuh waktu presisi (`AlarmManager`). WorkManager tidak pernah menjamin *kapan* pekerjaan berjalan — ia menjamin *bahwa* pekerjaan itu berjalan.
- `PeriodicWorkRequest` memiliki minimum keras 15 menit, dan itupun hanya petunjuk, bukan kontrak. Untuk ritme presisi, antrekan ulang one-time worker dari dalam eksekusi sebelumnya.
- `Result.retry()` adalah respons tepat untuk kegagalan sementara; `Result.failure()` membuang pekerjaan secara permanen. Mengembalikan `Result.success()` dengan data parsial diam-diam menghilangkan pekerjaan.
- Gunakan `ExistingWorkPolicy.APPEND_OR_REPLACE` atau `REPLACE` bersama `enqueueUniqueWork` untuk mencegah duplikasi eksekusi konkuren dari pekerjaan logis yang sama.
- Selalu kirim input via `inputData` dan baca di dalam `doWork()` — jangan pernah menyimpan referensi `Context` atau Activity dalam worker; proses bisa dibunuh dan dibuat ulang di sekitar worker Anda.

## Langkah Berikutnya

- Pelajari `ListenableWorker` untuk kode async non-coroutine dan `WorkerFactory` untuk injeksi Hilt.
- Pelajari migrasi ke foreground service saat tugas menjadi terlihat pengguna (misalnya notifikasi progres unduhan).

## Kesimpulan

Anda kini tahu cara memilih antara WorkManager, Services, dan AlarmManager, serta cara menyusun pekerjaan one-time dan periodik dengan constraints, chaining, retry, dan jaminan keunikan. Contoh `CoroutineWorker` memberi Anda titik awal yang layak produksi — ganti stub upload dengan panggilan API asli Anda dan pipeline sinkronisasi menjadi benar-benar andal melintasi kematian proses, reboot, dan batasan baterai.
