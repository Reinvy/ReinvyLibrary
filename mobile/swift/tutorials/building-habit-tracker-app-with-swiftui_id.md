---
title: "Membangun Aplikasi Pelacak Kebiasaan dengan SwiftUI"
description: "Membangun pelacak kebiasaan dengan SwiftUI: model SwiftData, check-in idempoten, logika streak yang dapat diuji, pengingat lokal, grafik Swift Charts, dan sinkronisasi CloudKit."
category: "mobile"
technology: "swift"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Pelacak Kebiasaan dengan SwiftUI

## Ringkasan

Tutorial ini membangun aplikasi pelacak kebiasaan untuk iOS dengan SwiftUI dan SwiftData: dua model, jalur check-in yang idempoten, perhitungan streak murni, pengingat per kebiasaan, serta ringkasan Swift Charts yang selalu sesuai dengan datanya.

## Target Audiens

- Pengembang iOS yang sudah memahami dasar SwiftUI dan ingin aplikasi berbasis persistensi, bukan daftar tugas biasa.
- Tingkat menengah: nyaman dengan property wrapper, `async/await`, dan pratinjau Xcode.

## Prasyarat

- Xcode 15 atau lebih baru dengan target iOS 17+ (SwiftData memerlukan SDK iOS 17).
- Pemahaman Swift struct, closure, serta `@State` / `@Environment`.

## Tujuan Pembelajaran

- Mendefinisikan model SwiftData dengan relasi cascade yang tetap valid pada skema CloudKit.
- Menempatkan logika streak di struct murni agar bisa diuji tanpa basis data.
- Mengubah status penyelesaian harian secara idempoten dan menyimpannya dengan aman.
- Menjadwalkan satu pengingat berulang per kebiasaan dan menampilkan grafik tujuh hari terakhir.

## Konteks dan Motivasi

Aplikasi pelacak kebiasaan terlihat sepele sampai tiga kebutuhan muncul: penyelesaian harus idempoten per hari kalender, streak harus bertahan melewati tengah malam dan perubahan zona waktu, dan progres harus terbaca tanpa membuka setiap kebiasaan. Ketiganya keputusan pemodelan data, bukan urusan tampilan. SwiftData menyediakan relasinya, Swift Charts menyediakan ringkasannya, dan `StreakCalculator` murni menyediakan kemudahan pengujian.

## Konten Inti

### Memodelkan kebiasaan dan penyelesaian

Sebuah `Habit` memiliki daftar `Completion` dengan aturan cascade, dan setiap baris menyimpan hari yang sudah dinormalkan lewat `startOfDay`, sehingga perbandingan tidak bergantung pada jam saat pengguna menekan tombol.

### Menghitung streak

Streak adalah rentetan hari berurutan yang selesai dan berakhir hari ini, atau berakhir kemarin agar angkanya tidak kembali ke nol pada tengah malam sebelum pengguna check-in pagi. Jaga tetap murni: `Set<Date>`, `Calendar` yang disuntikkan, dan tanggal `asOf` eksplisit.

### Menjadwalkan pengingat

`UNCalendarNotificationTrigger` berulang dengan satu identifier stabil per kebiasaan membuat pengeditan pengingat menggantikan permintaan yang tertunda, bukan menumpuk duplikat.

### Memvisualisasikan progres

Bangun data grafik langsung dari daftar penyelesaian; penghitung tersimpan terpisah adalah duplikasi state yang akan melenceng saat penghapusan cascade pertama terjadi.

### Sinkronisasi dengan iCloud

CloudKit membutuhkan flag `ModelConfiguration` dan entitlement, serta melarang unique constraint: setiap properti tersimpan wajib punya nilai default dan relasi harus opsional.

## Contoh Kode

Model, perhitungan streak, dan satu-satunya jalur penulisan data:

```swift
import SwiftData

@Model
final class Habit {
    var title: String = ""
    @Relationship(deleteRule: .cascade, inverse: \Completion.habit)
    var completions: [Completion] = []
}

@Model
final class Completion {
    var day: Date = Date()
    var habit: Habit?
}

struct StreakCalculator {
    var calendar: Calendar = .current

    func currentStreak(days: Set<Date>, asOf today: Date = .now) -> Int {
        var streak = 0
        var cursor = calendar.startOfDay(for: today)
        if !days.contains(cursor), let yesterday = calendar.date(byAdding: .day, value: -1, to: cursor) {
            cursor = yesterday
        }
        while days.contains(cursor) {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = calendar.startOfDay(for: previous)
        }
        return streak
    }
}

extension Habit {
    func toggle(on date: Date = Date(), in context: ModelContext) throws {
        let day = Calendar.current.startOfDay(for: date)
        if let existing = completions.first(where: { $0.day == day }) {
            context.delete(existing)
        } else {
            let entry = Completion()
            entry.day = day
            entry.habit = self
            context.insert(entry)
        }
        do { try context.save() } catch { context.rollback(); throw error }
    }
}
```

```swift
import UserNotifications

func scheduleReminder(habitID: UUID, title: String, hour: Int) async throws {
    let id = "habit-\(habitID.uuidString)"
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [id])
    let content = UNMutableNotificationContent()
    content.title = "Waktunya \(title)"
    let trigger = UNCalendarNotificationTrigger(
        dateMatching: DateComponents(hour: hour), repeats: true)
    try await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
}
```

```swift
import SwiftUI
import Charts

struct DayStat: Identifiable {
    let id: Date
    let count: Int
}

struct WeeklyProgressChart: View {
    let stats: [DayStat]

    var body: some View {
        Chart(stats) { stat in
            BarMark(x: .value("Hari", stat.id, unit: .day), y: .value("Selesai", stat.count))
        }
    }
}
```

```swift
func testStreakEndingYesterday() {
    let today = Date(timeIntervalSince1970: 1_772_000_000)
    let days = Set([-1, -2, -3].map { today.addingTimeInterval(86_400 * Double($0)) })
    XCTAssertEqual(StreakCalculator().currentStreak(days: days, asOf: today), 3)
}
```

## Insight Penting

- Normalkan setiap penyelesaian ke `startOfDay` saat menulis; membandingkan timestamp mentah membuat pengecekan "hari yang sama" bergantung zona waktu.
- Jangan panggil `Date()` atau `Calendar.current` di dalam fungsi streak; suntikkan dari luar agar pengujian tidak gagal saat pergantian DST.
- CloudKit melarang unique constraint, jadi lakukan deduplikasi di kode seperti pada `toggle`, bukan dengan `@Attribute(.unique)`.

## Langkah Berikutnya

- Tambahkan kalender heat-map yang dibangun dari pipeline `DayStat` yang sama.
- Tampilkan streak hari ini lewat WidgetKit dan sebuah App Intent.

## Kesimpulan

Anda kini memiliki pelacak kebiasaan dengan lapisan data sungguhan: dua model SwiftData dengan relasi cascade, `toggle` yang idempoten, fungsi streak murni yang teruji, satu pengingat berulang per kebiasaan, dan skema yang siap CloudKit. Pelajaran strukturalnya lebih penting daripada tampilannya — logika di luar view dapat diuji, dipakai ulang di widget, dan dipindahkan ke sinkronisasi tanpa ditulis ulang.
