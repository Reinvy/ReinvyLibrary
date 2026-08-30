---
title: "Building an Offline-First Notes App with Flutter and Drift"
description: "A project-based tutorial on building an offline-first notes app with Flutter and Drift, covering local SQLite persistence, the outbox sync pattern, schema migrations, and background synchronization."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building an Offline-First Notes App with Flutter and Drift

## Summary

In this project-based tutorial, you will build a complete **offline-first notes application** using Flutter and **Drift**, a reactive persistence library built on top of SQLite. Unlike a traditional app that depends on a live network connection, your notes app will write every change to a local database first, queue outgoing changes in an outbox table, and synchronize with a REST backend whenever connectivity is available. Along the way you will model a relational schema, write and test schema migrations, expose reactive queries as streams, implement a sync engine with conflict resolution, and add full-text search with SQLite FTS5. By the end you will have a production-style architecture that works flawlessly in airplane mode and merges cleanly when the network returns.

## Target Audience

- Flutter developers who have already shipped a basic app and want to master local data persistence.
- Expected developer level: **Advanced** (comfortable with Dart futures, streams, and Flutter's widget lifecycle).

## Prerequisites

- Flutter SDK 3.x with Dart 3.x installed.
- A code editor with the Flutter and Dart extensions.
- Basic SQL knowledge (tables, indexes, joins).
- Experience with async Dart: `Future`, `Stream`, and `async`/`await`.
- A REST backend you can point the app at (a local mock server is enough for this tutorial).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up Drift in a Flutter project with code generation and the `drift_flutter` helper.
- Model a relational schema (tables, data classes, indexes) using Drift's Dart DSL.
- Evolve the schema safely with incremental migrations.
- Expose reactive queries as `Stream`s so the UI updates automatically.
- Implement local-first writes with an outbox sync queue.
- Build a sync engine that pushes pending changes and pulls remote updates.
- Resolve update conflicts with a last-write-wins strategy and a soft-delete tombstone.
- Add full-text search with SQLite FTS5 virtual tables.

## Context and Motivation

Mobile connections are unreliable. Users open apps in elevators, on trains, and in airplane mode, and they expect their data to be available and editable everywhere. A traditional client-server app fails in exactly these moments: every read and write requires the network, so a dropped connection becomes a frozen screen and a lost update.

The **offline-first** approach inverts this dependency. The device's local database is the source of truth for the user's immediate interactions; the server is just a synchronization target. Writes succeed instantly because they hit SQLite, and a background sync engine reconciles the local state with the remote state when connectivity returns. This pattern powers the mobile apps of companies like Dropbox, Notion, and any messaging app that lets you read and reply with no signal.

Drift is an ideal foundation for this pattern in Flutter. It compiles your schema into type-safe Dart code, gives you reactive queries out of the box, and keeps the full power of SQLite — including transactions, indexes, and FTS5 — available through a clean API. In this tutorial you will combine Drift with an outbox queue to build an app that is fast, resilient, and genuinely useful offline.

## Core Content

### What Is Offline-First?

Offline-first is a data architecture where the local device database is the primary store for user actions and the remote server is synchronized lazily. The three pillars are:

- **Local-first writes**: every user action persists to the device immediately, with no network round-trip in the critical path.
- **Synchronization**: a background process pushes local changes to the server and pulls remote changes back, usually when connectivity is available.
- **Reconciliation**: when the same record was changed on both sides, a deterministic strategy decides which version wins.

Contrast this with online-only apps, where a spinner blocks the UI while a request travels to the server, and with caching-only apps, where the cache is a read-only mirror that cannot accept edits offline.

### Anatomy of a Local-First Notes App

The app you will build has four layers:

```text
UI Layer        NotesListPage, NoteEditorPage (StreamBuilder over Drift streams)
Repository      NotesRepository (transactional writes + outbox enqueue)
Sync Engine     SyncService (push outbox, pull remote, reconcile)
Data Layer      Drift database (notes, tags, outbox tables + SQLite FTS5 index)
```

The UI never talks to the network. It reads reactive streams from the repository and calls repository methods to create, update, and delete notes. The repository is the only component allowed to touch the database, and the sync engine is the only component allowed to touch the HTTP client. This separation keeps the offline behavior testable and predictable.

### Setting Up Drift in a Flutter Project

Create a new Flutter project and add the Drift packages plus the build-time code generator:

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

`drift_flutter` supplies a ready-made `driftDatabase()` helper that opens a database in the app documents directory on Android and iOS with sensible defaults. The schema you write as Dart classes is compiled by `build_runner` into the type-safe database implementation.

Run the generator after every schema change:

```bash
dart run build_runner build --delete-conflicting-outputs
```

### Defining the Schema with Drift

Create `lib/data/database.dart` and define the tables as Dart classes. The notes app needs a `notes` table, a `tags` table, a join table, and an `outbox` table that records pending sync operations:

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

The `deletedAt` column is a **tombstone**: deleting a note offline sets this timestamp instead of removing the row, so the sync engine can later tell the server the record was deleted. Notice the `uniqueKeys` override is intentionally empty in this example to keep the prose focused; the code generation step compiles this file into `database.g.dart` together with the `@DriftDatabase` annotation declared on the database class below.

### Running Migrations

SQLite schemas evolve, and Drift makes that safe with an explicit migration strategy. Open the database with a version number and provide a `MigrationStrategy`:

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

The `beforeOpen` callback turns on foreign key enforcement, which SQLite disables by default. Every future schema change must bump `schemaVersion` and add an `if (from < N)` block, so devices upgrading from any older version migrate step by step.

### Writing Reactive Data Access Objects

Data access objects (DAOs) group queries behind a focused interface and are registered on the database so they can be composed:

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

Because `watch()` returns a `Stream`, any change committed inside a transaction automatically emits a fresh query result. Widgets wrapped in a `StreamBuilder` re-render with zero manual state management.

### The Local-First Write Path

The repository is where the offline-first guarantee is enforced. Creating a note must be atomic: the note row and its outbox entry are written inside a single transaction, so they can never drift apart:

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

Writing to the local database takes milliseconds and never blocks on the network, so the UI stays responsive even at the edge of connectivity.

### The Outbox Sync Queue

The outbox table IS the synchronization contract. Every mutation enqueues an operation row, and the sync engine processes the queue in order. This pattern is called the **outbox pattern** (or transactional outbox): the mutation and the queue entry commit together, which means no update is ever lost between the app and the server.

The engine first pushes pending operations, then pulls remote changes. Pulling is implemented as a plain HTTP GET of everything changed since the last sync timestamp:

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

If the push fails because the device is offline, the operation simply stays in the queue and the next sync attempt retries it. The queue gives the system at-least-once delivery semantics for free.

### Conflict Resolution Strategies

When the same note was edited on two devices, the sync engine must pick a winner. The simplest deterministic strategy is **last-write-wins**: compare the `updatedAt` timestamps and keep the newer version.

The sync engine can detect a conflict by comparing the server's `updated_at` with the local `updatedAt` before overwriting. A robust flow is:

- Pull the remote record.
- If there is no local record (it was deleted locally), push the tombstones.
- If the remote `updated_at` is newer than the local one, replace the local row.
- If the local `updated_at` is newer, push the local version to the server.
- If the timestamps are identical, treat the versions as equal and do nothing.

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

Tombstones handle deletion conflicts: when the engine encounters a row whose `deletedAt` is set, it issues a `DELETE` to the server, and any record the server still believes exists is ignored during pull.

### Searching Notes with FTS5

LIKE-based search degrades as the library grows. SQLite's FTS5 extension provides real full-text search with tokenization, ranking, and fast prefix queries. Add an FTS virtual table to the schema:

```dart
class NotesFts extends Table {
  TextColumn get title => text()();
  TextColumn get body => text()();
  IntColumn get noteId => integer()();
}
```

and keep it in sync by re-inserting rows whenever a note changes. Querying the FTS index returns matching note ids with a relevance score:

```dart
Future<List<int>> ftsSearchIds(String query) async {
  final rows = await customSelect(
    'SELECT noteId FROM notes_fts WHERE notes_fts MATCH ?1 ORDER BY rank',
    variables: [Variable(query)],
  ).get();
  return rows.map((r) => r.read<int>('noteId')).toList();
}
```

For a notes app this gives instant, typo-tolerant search even with tens of thousands of entries.

## Code Examples

### Project Dependencies

Add the packages listed in the setup section to `pubspec.yaml`, then run `flutter pub get`.

### Complete Database File

The full `lib/data/database.dart` combines the tables, the database class, and the migration strategy shown above. After running `build_runner`, the generated `database.g.dart` provides `NotesCompanion`, `OutboxCompanion`, and the `select/update/delete` query builders used everywhere in the app.

### Drift Streaming with StreamBuilder

The notes list page consumes the repository stream directly:

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

### Triggering a Sync

The simplest trigger is a button, but in production you would combine `connectivity_plus` listeners, the app lifecycle, and a retry timer:

```dart
void _setupConnectivityListener() {
  Connectivity().onConnectivityChanged.listen((result) {
    if (result != ConnectivityResult.none) {
      syncService.syncNow();
    }
  });
}
```

## Key Insights

- **The outbox pattern is the backbone of offline-first**: committing the mutation and its queue entry in one transaction guarantees no update is lost, even if the app is killed mid-sync.
- **Watch out for schema drift**: every schema version bump requires a migration block; devices in the field upgrade from many old versions, so write migrations as incremental `if (from < N)` steps, never as destructive recreations.
- **Tombstones over hard deletes**: a soft-delete timestamp keeps deletions syncable and undoable; hard-deleting a row offline makes it impossible to propagate the deletion to the server reliably.
- **Performance consideration**: stream every long-lived query instead of polling, and use FTS5 for search — a `LIKE '%...%'` scan over a large notes table will eventually stall the UI thread.
- **Avoid putting network calls inside build methods or `initState`**: route all HTTP through the sync engine so offline behavior stays deterministic and testable.

## Next Steps

- Read the [Flutter Clean Architecture Guide](../guides/flutter-clean-architecture-guide.md) to see how the repository and data layers fit into a larger project.
- Explore the [Flutter Networking API Cheatsheet](../cheatsheets/flutter-networking-api-cheatsheet.md) for a deeper look at `http`, Dio, interceptors, and retry strategies.
- Follow the [Flutter Production Engineering Syllabus](../syllabi/flutter-production-engineering-syllabus.md) to take the app from working prototype to released product.
- Study the [Flutter Testing Guide](../guides/flutter-testing-guide.md) to add unit and widget tests for the repository and sync engine.

## Conclusion

You have built a complete offline-first notes application with Flutter and Drift. The app writes locally with instant feedback, queues changes in an outbox, synchronizes with a REST backend through a dedicated sync engine, resolves conflicts with a deterministic last-write-wins strategy, and searches an FTS5 index. This architecture — local-first writes, transactional outbox, tombstones, and streamed queries — is the same foundation used by production mobile apps that must remain useful without a connection, and you can now apply it to any domain: task managers, journaling apps, expense trackers, or field-data collection tools.
