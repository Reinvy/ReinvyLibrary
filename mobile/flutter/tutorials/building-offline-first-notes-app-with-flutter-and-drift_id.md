---
title: "Membangun Aplikasi Catatan Offline-First dengan Flutter dan Drift"
description: "Tutorial berbasis proyek untuk membangun aplikasi catatan offline-first dengan Flutter dan Drift, mencakup persistensi SQLite lokal, pola outbox sinkronisasi, migrasi skema, dan sinkronisasi latar belakang."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Catatan Offline-First dengan Flutter dan Drift

## Ringkasan

Dalam tutorial berbasis proyek ini, Anda akan membangun aplikasi **catatan offline-first** yang lengkap menggunakan Flutter dan **Drift**, pustaka persistensi reaktif yang dibangun di atas SQLite. Berbeda dengan aplikasi tradisional yang bergantung pada koneksi jaringan, aplikasi catatan Anda akan menulis setiap perubahan ke basis data lokal terlebih dahulu, mengantrekan perubahan yang keluar di tabel outbox, dan melakukan sinkronisasi dengan backend REST kapan pun konektivitas tersedia. Sepanjang proses, Anda akan memodelkan skema relasional, menulis dan menguji migrasi skema, mengekspos kueri reaktif sebagai stream, mengimplementasikan mesin sinkronisasi dengan resolusi konflik, serta menambahkan pencarian teks lengkap dengan SQLite FTS5. Pada akhirnya, Anda akan memiliki arsitektur bergaya produksi yang bekerja dengan sempurna dalam mode pesawat dan menyatu dengan bersih ketika jaringan kembali.

## Target Audiens

- Pengembang Flutter yang sudah pernah merilis aplikasi dasar dan ingin menguasai persistensi data lokal.
- Ekspektasi tingkat kemampuan pembaca: **Mahir** (nyaman dengan future dan stream Dart serta siklus hidup widget Flutter).

## Prasyarat

- Flutter SDK 3.x dengan Dart 3.x terpasang.
- Editor kode dengan ekstensi Flutter dan Dart.
- Pengetahuan dasar SQL (tabel, indeks, join).
- Pengalaman dengan Dart asinkron: `Future`, `Stream`, dan `async`/`await`.
- Backend REST yang bisa dituju oleh aplikasi (server mock lokal sudah cukup untuk tutorial ini).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyiapkan Drift di proyek Flutter dengan code generation dan helper `drift_flutter`.
- Memodelkan skema relasional (tabel, kelas data, indeks) menggunakan DSL Dart milik Drift.
- Mengembangkan skema dengan aman melalui migrasi inkremental.
- Mengekspos kueri reaktif sebagai `Stream` sehingga UI memperbarui diri secara otomatis.
- Mengimplementasikan penulisan lokal-first dengan antrean sinkronisasi outbox.
- Membangun mesin sinkronisasi yang mengirim perubahan tertunda dan menarik pembaruan remote.
- Menyelesaikan konflik pembaruan dengan strategi last-write-wins dan tombstone soft-delete.
- Menambahkan pencarian teks lengkap dengan tabel virtual SQLite FTS5.

## Konteks dan Motivasi

Koneksi seluler tidak dapat diandalkan. Pengguna membuka aplikasi di lift, di kereta, dan dalam mode pesawat, dan mereka berharap data tetap tersedia dan dapat diedit di mana pun. Aplikasi client-server tradisional gagal tepat pada momen-momen ini: setiap baca dan tulis membutuhkan jaringan, sehingga koneksi yang terputus menjadi layar yang membeku dan pembaruan yang hilang.

Pendekatan **offline-first** membalikkan ketergantungan ini. Basis data lokal perangkat menjadi sumber kebenaran untuk interaksi langsung pengguna; server hanyalah target sinkronisasi. Penulisan berhasil seketika karena langsung menuju SQLite, dan mesin sinkronisasi latar belakang merekonsiliasi keadaan lokal dengan keadaan remote saat konektivitas kembali. Pola ini menggerakkan aplikasi seluler perusahaan seperti Dropbox, Notion, dan aplikasi pesan apa pun yang memungkinkan Anda membaca dan membalas tanpa sinyal.

Drift adalah fondasi yang ideal untuk pola ini di Flutter. Drift mengompilasi skema Anda menjadi kode Dart yang aman terhadap tipe, memberikan kueri reaktif langsung, dan mempertahankan kekuatan penuh SQLite — termasuk transaksi, indeks, dan FTS5 — melalui API yang bersih. Dalam tutorial ini, Anda akan menggabungkan Drift dengan antrean outbox untuk membangun aplikasi yang cepat, tangguh, dan benar-benar berguna secara offline.

## Konten Inti

### Apa Itu Offline-First?

Offline-first adalah arsitektur data di mana basis data lokal perangkat menjadi penyimpanan utama untuk tindakan pengguna dan server remote disinkronkan secara lambat. Tiga pilarnya adalah:

- **Penulisan lokal-first**: setiap tindakan pengguna langsung tersimpan di perangkat, tanpa round-trip jaringan di jalur kritis.
- **Sinkronisasi**: proses latar belakang mengirim perubahan lokal ke server dan menarik perubahan remote kembali, biasanya saat konektivitas tersedia.
- **Rekonsiliasi**: ketika rekaman yang sama diubah di kedua sisi, strategi deterministik memutuskan versi mana yang menang.

Bandingkan dengan aplikasi online-only, di mana spinner memblokir UI selama permintaan berjalan ke server, dan dengan aplikasi caching-only, di mana cache hanyalah cermin baca-saja yang tidak dapat menerima edit secara offline.

### Anatomi Aplikasi Catatan Local-First

Aplikasi yang akan Anda bangun memiliki empat lapisan:

```text
Lapisan UI        NotesListPage, NoteEditorPage (StreamBuilder di atas stream Drift)
Repository        NotesRepository (penulisan transaksional + antrean outbox)
Mesin Sinkron     SyncService (push outbox, pull remote, rekonsiliasi)
Lapisan Data      Drift database (tabel notes, tags, outbox + indeks FTS5 SQLite)
```

UI tidak pernah berbicara dengan jaringan. UI membaca stream reaktif dari repository dan memanggil metode repository untuk membuat, memperbarui, dan menghapus catatan. Repository adalah satu-satunya komponen yang diizinkan menyentuh basis data, dan mesin sinkronisasi adalah satu-satunya komponen yang diizinkan menyentuh klien HTTP. Pemisahan ini menjaga perilaku offline tetap dapat diuji dan dapat diprediksi.

### Menyiapkan Drift di Proyek Flutter

Buat proyek Flutter baru dan tambahkan paket Drift beserta generator kode waktu-build:

```yaml
dependencies:
  flutter:
    sdk: flutter
  drift: ^2.20.0
  drift_flutter: ^0.2.0
  path_provider: ^2.1.0
  http: ^1.2.0
  connectivity_plus: ^6.0.0
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  drift_dev: ^2.20.0
  build_runner: ^2.4.0
```

`drift_flutter` menyediakan helper `driftDatabase()` siap pakai yang membuka basis data di direktori dokumen aplikasi di Android dan iOS dengan pengaturan bawaan yang masuk akal. Skema yang Anda tulis sebagai kelas Dart dikompilasi oleh `build_runner` menjadi implementasi basis data yang aman terhadap tipe.

Jalankan generator setelah setiap perubahan skema:

```bash
dart run build_runner build --delete-conflicting-outputs
```

### Mendefinisikan Skema dengan Drift

Buat `lib/data/database.dart` dan definisikan tabel sebagai kelas Dart. Aplikasi catatan membutuhkan tabel `notes`, tabel `tags`, tabel join, dan tabel `outbox` yang mencatat operasi sinkronisasi tertunda:

```dart
import 'package:drift/drift.dart';

part 'database.g.dart';

class Notes extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get title => text().withLength(min: 1, max: 200)();
  TextColumn get body => text().withDefault(const Constant(''))();
  BoolColumn get archived => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();

  @override
  List<Set<Column>> get uniqueKeys => [{}];
}

class Tags extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().withLength(min: 1, max: 50).unique()();
}

class NoteTags extends Table {
  IntColumn get noteId => integer().references(Notes, #id)();
  IntColumn get tagId => integer().references(Tags, #id)();

  @override
  Set<Column> get primaryKey => {noteId, tagId};
}

class Outbox extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get noteId => integer().references(Notes, #id)();
  TextColumn get operation => text().withLength(min: 1, max: 20)();
  TextColumn get payload => text().withDefault(const Constant(''))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}
```

Kolom `deletedAt` adalah **tombstone**: menghapus catatan secara offline hanya menetapkan stempel waktu ini alih-alih menghapus baris, sehingga mesin sinkronisasi nantinya dapat memberi tahu server bahwa rekaman telah dihapus. Perhatikan bahwa override `uniqueKeys` sengaja dibiarkan kosong pada contoh ini agar penjelasan tetap terfokus; langkah code generation mengompilasi berkas ini menjadi `database.g.dart` bersama dengan anotasi `@DriftDatabase` yang dideklarasikan pada kelas database di bawah.

### Menjalankan Migrasi

Skema SQLite terus berkembang, dan Drift membuatnya aman dengan strategi migrasi eksplisit. Buka basis data dengan nomor versi dan sediakan `MigrationStrategy`:

```dart
@DriftDatabase(tables: [Notes, Tags, NoteTags, Outbox])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(driftDatabase(name: 'notes_db'));

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) async {
      await m.createAll();
    },
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        await m.addColumn(notes, notes.deletedAt);
      }
    },
    beforeOpen: (details) async {
      await customStatement('PRAGMA foreign_keys = ON');
    },
  );
}
```

Callback `beforeOpen` mengaktifkan penegakan foreign key, yang secara bawaan dimatikan oleh SQLite. Setiap perubahan skema di masa depan harus menaikkan `schemaVersion` dan menambahkan blok `if (from < N)`, sehingga perangkat yang meningkatkan versi dari versi lama mana pun bermigrasi selangkah demi selangkah.

### Menulis Data Access Object Reaktif

Data access object (DAO) mengelompokkan kueri di balik antarmuka yang terfokus dan didaftarkan pada database agar dapat dikomposisikan:

```dart
@DriftAccessor(tables: [Notes, Tags, NoteTags])
class NotesDao extends DatabaseAccessor<AppDatabase> with _$NotesDaoMixin {
  NotesDao(super.db);

  Stream<List<Note>> watchAllNotes() {
    return (select(notes)
          ..where((n) => n.deletedAt.isNull())
          ..orderBy([(n) => OrderingTerm.desc(n.updatedAt)]))
        .watch();
  }

  Stream<List<Note>> searchNotes(String query) {
    final pattern = '%$query%';
    return (select(notes)
          ..where((n) => n.deletedAt.isNull() & n.title.like(pattern))
          ..orderBy([(n) => OrderingTerm.desc(n.updatedAt)]))
        .watch();
  }

  Future<Note?> getNote(int id) {
    return (select(notes)..where((n) => n.id.equals(id))).getSingleOrNull();
  }
}
```

Karena `watch()` mengembalikan `Stream`, setiap perubahan yang dilakukan di dalam transaksi otomatis memancarkan hasil kueri baru. Widget yang dibungkus `StreamBuilder` akan me-render ulang tanpa manajemen state manual.

### Jalur Penulisan Local-First

Repository adalah tempat jaminan offline-first ditegakkan. Membuat catatan harus bersifat atomik: baris catatan dan entri outbox-nya ditulis dalam satu transaksi, sehingga keduanya tidak pernah terpisah:

```dart
class NotesRepository {
  NotesRepository(this._db, this._dao, this._client);

  final AppDatabase _db;
  final NotesDao _dao;
  final http.Client _client;

  Future<Note> createNote(String title, String body) {
    return _db.transaction(() async {
      final now = DateTime.now();
      final id = await _db.into(_db.notes).insert(NotesCompanion.insert(
            title: title,
            body: body,
            createdAt: now,
            updatedAt: now,
          ));
      await _db.into(_db.outbox).insert(OutboxCompanion.insert(
            noteId: id,
            operation: 'create',
            payload: '',
            createdAt: now,
          ));
      return (await _dao.getNote(id))!;
    });
  }

  Future<void> updateNote(Note note, String newTitle, String newBody) {
    return _db.transaction(() async {
      final now = DateTime.now();
      await (_db.update(_db.notes)..where((n) => n.id.equals(note.id))).write(
        NotesCompanion(
          title: Value(newTitle),
          body: Value(newBody),
          updatedAt: Value(now),
        ),
      );
      await _db.into(_db.outbox).insert(OutboxCompanion.insert(
            noteId: note.id,
            operation: 'update',
            payload: '',
            createdAt: now,
          ));
    });
  }

  Future<void> deleteNote(Note note) {
    return _db.transaction(() async {
      final now = DateTime.now();
      await (_db.update(_db.notes)..where((n) => n.id.equals(note.id))).write(
        NotesCompanion(deletedAt: Value(now), updatedAt: Value(now)),
      );
      await _db.into(_db.outbox).insert(OutboxCompanion.insert(
            noteId: note.id,
            operation: 'delete',
            payload: '',
            createdAt: now,
          ));
    });
  }
}
```

Menulis ke basis data lokal hanya membutuhkan milidetik dan tidak pernah memblokir jaringan, sehingga UI tetap responsif bahkan di ujung konektivitas.

### Antrean Sinkronisasi Outbox

Tabel outbox ADALAH kontrak sinkronisasi. Setiap mutasi mengantrekan satu baris operasi, dan mesin sinkronisasi memproses antrean secara berurutan. Pola ini disebut **pola outbox** (transactional outbox): mutasi dan entri antrean berkomitmen bersamaan, yang berarti tidak ada pembaruan yang hilang di antara aplikasi dan server.

Mesin pertama-tama mengirim operasi tertunda, lalu menarik perubahan remote. Penarikan diimplementasikan sebagai GET HTTP sederhana untuk semua yang berubah sejak stempel waktu sinkronisasi terakhir:

```dart
class SyncService {
  SyncService(this._db, this._client);

  final AppDatabase _db;
  final http.Client _client;
  static const _apiBase = 'https://api.example.com/v1/notes';

  Future<void> syncNow() async {
    await _pushOutbox();
    await _pullRemote();
  }

  Future<void> _pushOutbox() async {
    final operations = await _db.select(_db.outbox).get();
    for (final op in operations) {
      final note = await (_db.select(_db.notes)
            ..where((n) => n.id.equals(op.noteId)))
          .getSingleOrNull();
      if (note == null) {
        await (_db.delete(_db.outbox)..where((o) => o.id.equals(op.id))).go();
        continue;
      }
      final response = await _dispatch(op, note);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        await (_db.delete(_db.outbox)..where((o) => o.id.equals(op.id))).go();
      }
    }
  }

  Future<http.Response> _dispatch(Outbox op, Note note) {
    final uri = Uri.parse('$_apiBase/${note.id}');
    switch (op.operation) {
      case 'create':
        return _client.post(
          Uri.parse(_apiBase),
          headers: {'Content-Type': 'application/json'},
          body: _notePayload(note),
        );
      case 'update':
        return _client.put(uri, body: _notePayload(note));
      case 'delete':
        return _client.delete(uri);
      default:
        throw UnsupportedError('Unknown operation: ${op.operation}');
    }
  }

  String _notePayload(Note note) {
    return '{"title": "${note.title}", "body": "${note.body}", '
        '"updated_at": "${note.updatedAt.toIso8601String()}"}';
  }
}
```

Jika pengiriman gagal karena perangkat offline, operasi tetap berada di antrean dan percobaan sinkronisasi berikutnya akan mencoba lagi. Antrean memberikan semantik pengiriman at-least-once secara gratis.

### Strategi Resolusi Konflik

Ketika catatan yang sama diedit di dua perangkat, mesin sinkronisasi harus memilih pemenang. Strategi deterministik paling sederhana adalah **last-write-wins**: bandingkan stempel waktu `updatedAt` dan pertahankan versi yang lebih baru.

Mesin sinkronisasi dapat mendeteksi konflik dengan membandingkan `updated_at` server dengan `updatedAt` lokal sebelum menimpa. Alur yang kuat adalah:

- Tarik rekaman remote.
- Jika tidak ada rekaman lokal (sudah dihapus secara lokal), kirim tombstone.
- Jika `updated_at` remote lebih baru daripada lokal, ganti baris lokal.
- Jika `updated_at` lokal lebih baru, kirim versi lokal ke server.
- Jika stempel waktunya identik, anggap kedua versi sama dan jangan lakukan apa pun.

```dart
Future<void> _pullRemote() async {
  final response = await _client.get(Uri.parse('$_apiBase?since=${_lastSync()}'));
  if (response.statusCode != 200) return;

  final remoteNotes = jsonDecode(response.body) as List<dynamic>;
  for (final raw in remoteNotes) {
    final remote = raw as Map<String, dynamic>;
    final remoteId = remote['id'] as int;
    final remoteUpdated = DateTime.parse(remote['updated_at'] as String);
    final local = await (_db.select(_db.notes)
          ..where((n) => n.id.equals(remoteId)))
        .getSingleOrNull();

    if (local == null) {
      await _db.into(_db.notes).insert(NotesCompanion.insert(
            id: remoteId,
            title: remote['title'] as String,
            body: remote['body'] as String,
            updatedAt: remoteUpdated,
          ));
    } else if (remoteUpdated.isAfter(local.updatedAt)) {
      await (_db.update(_db.notes)..where((n) => n.id.equals(remoteId))).write(
        NotesCompanion(
          title: Value(remote['title'] as String),
          body: Value(remote['body'] as String),
          updatedAt: Value(remoteUpdated),
        ),
      );
    }
  }
  await _db.customStatement('DELETE FROM sync_state WHERE key = "last_sync";');
  await _db.customStatement(
    'INSERT INTO sync_state (key, value) VALUES ("last_sync", '
    '"${DateTime.now().toUtc().toIso8601String()}");',
  );
}
```

Tombstone menangani konflik penghapusan: ketika mesin menemukan baris dengan `deletedAt` yang terisi, ia mengirim `DELETE` ke server, dan rekaman apa pun yang masih diyakini server ada diabaikan selama penarikan.

### Mencari Catatan dengan FTS5

Pencarian berbasis LIKE menurun kualitasnya seiring bertambahnya pustaka. Ekstensi FTS5 SQLite menyediakan pencarian teks lengkap yang sesungguhnya dengan tokenisasi, peringkat, dan kueri prefiks yang cepat. Tambahkan tabel virtual FTS ke skema:

```dart
class NotesFts extends Table {
  TextColumn get title => text()();
  TextColumn get body => text()();
  IntColumn get noteId => integer()();
}
```

dan jaga agar tetap sinkron dengan menyisipkan ulang baris setiap kali catatan berubah. Mengkueri indeks FTS mengembalikan id catatan yang cocok dengan skor relevansi:

```dart
Future<List<int>> ftsSearchIds(String query) async {
  final rows = await customSelect(
    'SELECT noteId FROM notes_fts WHERE notes_fts MATCH ?1 ORDER BY rank',
    variables: [Variable(query)],
  ).get();
  return rows.map((r) => r.read<int>('noteId')).toList();
}
```

Untuk aplikasi catatan, ini memberikan pencarian instan yang toleran terhadap salah ketik bahkan dengan puluhan ribu entri.

## Contoh Kode

### Dependensi Proyek

Tambahkan paket yang tercantum di bagian penyiapan ke `pubspec.yaml`, lalu jalankan `flutter pub get`.

### Berkas Database Lengkap

`lib/data/database.dart` yang lengkap menggabungkan tabel, kelas database, dan strategi migrasi yang ditunjukkan di atas. Setelah menjalankan `build_runner`, `database.g.dart` yang dihasilkan menyediakan `NotesCompanion`, `OutboxCompanion`, serta builder kueri `select/update/delete` yang digunakan di seluruh aplikasi.

### Streaming Drift dengan StreamBuilder

Halaman daftar catatan mengonsumsi stream repository secara langsung:

```dart
class NotesListPage extends StatelessWidget {
  const NotesListPage({super.key, required this.repository});

  final NotesRepository repository;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Notes')),
      body: StreamBuilder<List<Note>>(
        stream: repository.watchAllNotes(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final notes = snapshot.data ?? const [];
          if (notes.isEmpty) {
            return const Center(child: Text('No notes yet.'));
          }
          return ListView.builder(
            itemCount: notes.length,
            itemBuilder: (context, index) {
              final note = notes[index];
              return ListTile(
                title: Text(note.title),
                subtitle: Text(note.body, maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => repository.deleteNote(note),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
```

### Memicu Sinkronisasi

Pemicu paling sederhana adalah tombol, tetapi di produksi Anda akan menggabungkan listener `connectivity_plus`, siklus hidup aplikasi, dan timer percobaan ulang:

```dart
void _setupConnectivityListener() {
  Connectivity().onConnectivityChanged.listen((result) {
    if (result != ConnectivityResult.none) {
      syncService.syncNow();
    }
  });
}
```

## Insight Penting

- **Pola outbox adalah tulang punggung offline-first**: mengkomit mutasi dan entri antreannya dalam satu transaksi menjamin tidak ada pembaruan yang hilang, bahkan jika aplikasi dimatikan di tengah sinkronisasi.
- **Waspadai penyimpangan skema**: setiap kenaikan versi skema membutuhkan blok migrasi; perangkat di lapangan meningkatkan versi dari banyak versi lama, jadi tulis migrasi sebagai langkah inkremental `if (from < N)`, jangan pernah sebagai pembuatan ulang yang merusak.
- **Gunakan tombstone, bukan hard delete**: stempel waktu soft-delete menjaga penghapusan tetap dapat disinkronkan dan dapat dibatalkan; menghapus baris secara permanen saat offline membuat penghapusan tidak mungkin disebarkan ke server dengan andal.
- **Pertimbangan performa**: stream setiap kueri yang berumur panjang alih-alih memoles (polling), dan gunakan FTS5 untuk pencarian — pemindaian `LIKE '%...%'` di atas tabel catatan yang besar pada akhirnya akan menghentikan thread UI.
- **Hindari panggilan jaringan di dalam metode build atau `initState`**: arahkan semua HTTP melalui mesin sinkronisasi agar perilaku offline tetap deterministik dan dapat diuji.

## Langkah Berikutnya

- Baca [Panduan Clean Architecture Flutter](../guides/flutter-clean-architecture-guide.md) untuk melihat bagaimana repository dan lapisan data cocok ke dalam proyek yang lebih besar.
- Jelajahi [Cheatsheet Networking API Flutter](../cheatsheets/flutter-networking-api-cheatsheet.md) untuk pembahasan lebih dalam tentang `http`, Dio, interceptor, dan strategi percobaan ulang.
- Ikuti [Silabus Production Engineering Flutter](../syllabi/flutter-production-engineering-syllabus.md) untuk membawa aplikasi dari prototipe yang berfungsi menjadi produk yang dirilis.
- Pelajari [Panduan Pengujian Flutter](../guides/flutter-testing-guide.md) untuk menambahkan pengujian unit dan widget bagi repository dan mesin sinkronisasi.

## Kesimpulan

Anda telah membangun aplikasi catatan offline-first yang lengkap dengan Flutter dan Drift. Aplikasi menulis secara lokal dengan umpan balik instan, mengantrekan perubahan di outbox, melakukan sinkronisasi dengan backend REST melalui mesin sinkronisasi khusus, menyelesaikan konflik dengan strategi last-write-wins yang deterministik, dan mencari di indeks FTS5. Arsitektur ini — penulisan lokal-first, outbox transaksional, tombstone, dan kueri berstream — adalah fondasi yang sama yang digunakan aplikasi seluler produksi yang harus tetap berguna tanpa koneksi, dan Anda kini dapat menerapkannya ke domain mana pun: pengelola tugas, aplikasi jurnal, pelacak pengeluaran, atau alat pengumpulan data lapangan.
