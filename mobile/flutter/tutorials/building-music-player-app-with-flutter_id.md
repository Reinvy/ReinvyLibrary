---
title: "Membangun Aplikasi Pemutar Musik dengan Flutter"
description: "Bangun pemutar musik Flutter yang berjalan di latar belakang dengan just_audio dan audio_service, lengkap dengan UI playlist berbasis queue, state pemutaran reaktif, dan notifikasi media."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Pemutar Musik dengan Flutter

## Ringkasan

Dalam tutorial ini Anda akan membangun aplikasi pemutar musik di Flutter menggunakan `just_audio` untuk decoding dan `audio_service` untuk eksekusi latar belakang serta kontrol di layar kunci. Pemutaran hidup di dalam audio handler berumur panjang, UI hanya merupakan proyeksi tipis dari aliran state-nya, dan queue menjadi sumber data bagi playlist maupun notifikasi media.

## Target Audiens

- Pengembang Flutter yang sudah nyaman dengan widget, `StreamBuilder`, dan Dart async.
- Level yang diharapkan: **Menengah** — sedikit pemahaman tentang file konfigurasi platform diperlukan.

## Prasyarat

- Flutter 3.19+ dengan Dart 3 pada perangkat nyata (emulator mereproduksi audio latar belakang dengan buruk).
- Dua atau tiga berkas audio yang dapat diakses lewat HTTPS, atau dibundel sebagai aset.
- Pengetahuan dasar tentang `AndroidManifest.xml` dan `Info.plist`.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan mampu:

- Menjelaskan mengapa logika pemutaran harus berada di `AudioHandler`, bukan di widget.
- Mengimplementasikan handler yang memiliki player, queue, dan notifikasi.
- Merender progres serta tombol transport dari satu aliran `PlaybackState`.
- Mengonfigurasi Android dan iOS agar audio tetap berjalan saat layar terkunci dan aplikasi berpindah.

## Konteks dan Motivasi

Pengguna tidak menatap aplikasi musik — mereka mengunci ponsel lalu menyimpannya di kantong. Fakta sederhana itu merusak sebagian besar implementasi audio Flutter yang naif: pemutaran terikat pada siklus hidup widget, sehingga mati ketika activity dihancurkan, dan tidak ada notifikasi untuk melanjutkannya.

`audio_service` menyelesaikan ini dengan memindahkan pemutaran ke foreground service di Android dan sesi audio latar belakang di iOS. UI menjadi proyeksi dari state layanan. Inilah arsitektur di balik setiap aplikasi media serius, dan Anda juga mendapatkan kontrol layar kunci, tombol headset, serta metadata Bluetooth secara gratis.

## Konten Inti

### Dua Paket, Dua Tanggung Jawab

`just_audio` adalah mesin audio: ia mendekode sumber, mengekspos `position`, `duration`, dan `playing`, serta memungkinkan pencarian posisi. `audio_service` adalah host siklus hidup: ia menjaga isolate Dart tetap hidup di latar belakang dan mempublikasikan aliran `PlaybackState` serta `MediaItem` yang dirender OS sebagai notifikasi dan widget layar kunci. Gunakan keduanya bersama — jangan pernah memanggil `AudioPlayer.play()` langsung dari widget.

### Handler Adalah Sumber Kebenaran

`MusicHandler` mewarisi `BaseAudioHandler` dan menimpa `play`, `pause`, `seek`, serta metode skip. Setiap tombol memanggil salah satunya; tidak ada komponen lain yang menyentuh player. Handler mendengarkan `playbackEventStream` lalu mempublikasikannya ulang sebagai `PlaybackState`, satu-satunya hal yang diamati UI.

### Playlist, Notifikasi, dan Platform

`audio_service` memelihara `queue` berisi `MediaItem`. Muat URL yang sudah diresolusikan sebagai `AudioSource.uri(..., tag: mediaItem)` agar handler dapat melaporkan metadata trek aktif, lalu hubungkan `skipToQueueItem(index)` ke tile daftar Anda. Notifikasi dihasilkan dari `PlaybackState`: `controls` menentukan tombolnya dan `androidCompactActionIndices` memilih tiga tombol yang tampil saat notifikasi diciutkan. Android 13+ membutuhkan izin runtime `POST_NOTIFICATIONS`, Android 14+ membutuhkan `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, dan `MainActivity` harus mewarisi `AudioServiceActivity` atau service tidak dapat terikat. Di iOS, aktifkan background mode `audio` pada `Info.plist` dan capability Audio di Xcode.

## Contoh Kode

### Audio Handler

Tambahkan `just_audio: ^0.9.40`, `audio_service: ^0.18.15`, `audio_session: ^0.1.21`, dan `permission_handler: ^11.3.1` ke `pubspec.yaml`, lalu daftarkan handler sekali saat startup dengan `AudioService.init(builder: MusicHandler.new, config: const AudioServiceConfig(androidNotificationChannelId: 'com.example.music.playback', androidNotificationChannelName: 'Music playback', androidNotificationOngoing: true))` dan teruskan instance yang dikembalikan ke pohon widget.

```dart
class MusicHandler extends BaseAudioHandler with QueueHandler, SeekHandler {
  MusicHandler() {
    _player.playbackEventStream.listen(_broadcastState,
        onError: (Object error, StackTrace _) => _fail('playback_error', error));
    _player.currentIndexStream.listen((index) {
      if (index != null && index < queue.value.length) mediaItem.add(queue.value[index]);
    });
  }

  final AudioPlayer _player = AudioPlayer();

  Future<void> loadPlaylist(List<MediaItem> items) async {
    if (items.isEmpty) throw ArgumentError('Playlist tidak boleh kosong');
    queue.add(items);
    try {
      await _player.setAudioSources(
        items.map((item) => AudioSource.uri(Uri.parse(item.id), tag: item)).toList(),
        initialIndex: 0,
      );
    } on PlayerException catch (error) {
      _fail('load_failed', error);
      rethrow;
    }
  }

  void _fail(String code, Object error) {
    playbackState.add(playbackState.value.copyWith(errorCode: code, errorMessage: '$error'));
  }

  void _broadcastState(PlaybackEvent event) {
    playbackState.add(playbackState.value.copyWith(
      controls: [MediaControl.skipToPrevious,
        if (_player.playing) MediaControl.pause else MediaControl.play,
        MediaControl.skipToNext],
      androidCompactActionIndices: const [0, 1, 2],
      processingState: const {
        ProcessingState.idle: AudioProcessingState.idle,
        ProcessingState.loading: AudioProcessingState.loading,
        ProcessingState.buffering: AudioProcessingState.buffering,
        ProcessingState.ready: AudioProcessingState.ready,
        ProcessingState.completed: AudioProcessingState.completed,
      }[_player.processingState]!,
      playing: _player.playing,
      updatePosition: _player.position,
      queueIndex: event.currentIndex,
    ));
  }

  @override
  Future<void> play() => _player.play();
  @override
  Future<void> pause() => _player.pause();
  @override
  Future<void> seek(Duration position) => _player.seek(position);
  @override
  Future<void> skipToNext() => _player.seekToNext();
  @override
  Future<void> skipToPrevious() => _player.seekToPrevious();
  @override
  Future<void> skipToQueueItem(int index) => _player.seek(Duration.zero, index: index);
}
```

### Layar Playlist

```dart
class PlaylistScreen extends StatelessWidget {
  const PlaylistScreen({super.key, required this.handler, required this.tracks});

  final MusicHandler handler;
  final List<MediaItem> tracks;

  @override
  Widget build(BuildContext context) => StreamBuilder<MediaItem?>(
        stream: handler.mediaItem,
        builder: (context, snapshot) => ListView.builder(
          itemCount: tracks.length,
          itemBuilder: (context, index) => _tile(tracks[index], snapshot.data),
        ),
      );

  Widget _tile(MediaItem track, MediaItem? current) => ListTile(
        selected: current?.id == track.id,
        leading: Icon(current?.id == track.id ? Icons.graphic_eq : Icons.music_note),
        title: Text(track.title),
        subtitle: Text(track.artist ?? 'Artis tidak diketahui'),
        onTap: () => handler.skipToQueueItem(tracks.indexOf(track)),
      );
}
```

## Insight Penting

- **Jangan pernah memiliki player di dalam widget**: `StatefulWidget` dihancurkan saat rotasi atau ketika activity masuk latar belakang, dan pemutaran ikut mati.
- **`updatePosition` adalah potret, bukan jam**: untuk progress bar yang mulus, berlangganan ke `AudioService.position` yang bertick independen dari perubahan state.
- **Tipe foreground service bersifat wajib**: menghilangkan `foregroundServiceType="mediaPlayback"` memicu `SecurityException` di Android 14 saat runtime, bukan saat build.
- **Konfigurasikan audio focus** dengan `AudioSessionConfiguration.music()` agar panggilan telepon menjeda pemutaran alih-alih bercampur dengan nada dering.

## Langkah Berikutnya

- Cache trek secara offline dengan `dio` dan petakan `MediaItem.id` ke URI berkas lokal.
- Simpan queue dan posisi terakhir agar pemutaran berlanjut setelah cold start.
- Baca [Panduan Aksesibilitas Flutter](../guides/flutter-accessibility-guide_id.md) agar tombol transport dapat digunakan dengan TalkBack dan VoiceOver.

## Kesimpulan

Anda kini memiliki pemutar musik dengan pemisahan bersih antara mesin audio, layanan latar belakang, dan UI. Pemutaran berlanjut saat aplikasi di latar belakang, notifikasi tetap sinkron dengan kontrol di dalam aplikasi, dan queue menjadi sumber data bagi playlist maupun metadata. Struktur ini mudah diskalakan: mengganti `just_audio` dengan backend streaming hanya menyentuh handler, tidak pernah widget.
