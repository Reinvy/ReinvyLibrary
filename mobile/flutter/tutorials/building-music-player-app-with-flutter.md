---
title: "Building a Music Player App with Flutter"
description: "Build a background-capable Flutter music player with just_audio and audio_service, including a queue-driven playlist UI, reactive playback state, and media notifications."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Music Player App with Flutter

## Summary

In this tutorial you will build a music player in Flutter using `just_audio` for decoding and `audio_service` for background execution and lock-screen controls. Playback lives in a long-lived audio handler, the UI is a thin projection of its state stream, and the queue drives both the playlist and the media notification.

## Target Audience

- Flutter developers comfortable with widgets, `StreamBuilder`, and async Dart.
- Expected developer level: **Intermediate** — some exposure to platform configuration files is assumed.

## Prerequisites

- Flutter 3.19+ with Dart 3 on a working device (emulators reproduce background audio poorly).
- Two or three audio files reachable over HTTPS, or bundled as assets.
- Basic knowledge of `AndroidManifest.xml` and `Info.plist`.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain why playback logic belongs in an `AudioHandler` rather than in a widget.
- Implement a handler that owns the player, the queue, and the notification.
- Render progress and transport controls from a single `PlaybackState` stream.
- Configure Android and iOS so audio survives screen lock and app switching.

## Context and Motivation

Users do not stare at a music app — they lock the phone and put it in a pocket. That single fact breaks most naive Flutter audio implementations: playback is tied to a widget's lifecycle, so it dies when the activity is destroyed, and there is no notification to resume it from.

`audio_service` solves this by moving playback into a foreground service on Android and a background audio session on iOS. The UI becomes a projection of the service state. This is the architecture behind every serious media app, and it also gives you lock-screen controls, headset buttons, and Bluetooth metadata for free.

## Core Content

### Two Packages, Two Responsibilities

`just_audio` is an audio engine: it decodes a source, exposes `position`, `duration`, and `playing`, and lets you seek. `audio_service` is a lifecycle host: it keeps a Dart isolate alive in the background and publishes `PlaybackState` and `MediaItem` streams that the OS renders as a notification and a lock-screen widget. Use them together — never call `AudioPlayer.play()` from a widget.

### The Handler Is the Source of Truth

`MusicHandler` extends `BaseAudioHandler` and overrides `play`, `pause`, `seek`, and the skip methods. Every button calls one of those; nothing else touches the player. The handler listens to `playbackEventStream` and republishes it as `PlaybackState`, the only thing the UI observes.

### Playlists, Notifications, and Platforms

`audio_service` maintains a `queue` of `MediaItem`s. Load resolved URLs as `AudioSource.uri(..., tag: mediaItem)` so the handler can report metadata for the current track, and wire `skipToQueueItem(index)` to your list tiles. The notification is generated from `PlaybackState`: `controls` chooses the buttons and `androidCompactActionIndices` picks the three shown when collapsed. Android 13+ needs the runtime `POST_NOTIFICATIONS` permission, Android 14+ needs `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, and `MainActivity` must extend `AudioServiceActivity` or the service cannot bind. On iOS, enable the `audio` background mode in `Info.plist` and the Audio capability in Xcode.

## Code Examples

### The Audio Handler

Add `just_audio: ^0.9.40`, `audio_service: ^0.18.15`, `audio_session: ^0.1.21`, and `permission_handler: ^11.3.1` to `pubspec.yaml`, then register the handler once at startup with `AudioService.init(builder: MusicHandler.new, config: const AudioServiceConfig(androidNotificationChannelId: 'com.example.music.playback', androidNotificationChannelName: 'Music playback', androidNotificationOngoing: true))` and pass the returned instance down the widget tree.

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
    if (items.isEmpty) throw ArgumentError('Playlist must not be empty');
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

### The Playlist Screen

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
        subtitle: Text(track.artist ?? 'Unknown artist'),
        onTap: () => handler.skipToQueueItem(tracks.indexOf(track)),
      );
}
```

## Key Insights

- **Never own the player inside a widget**: a `StatefulWidget` is destroyed on rotation or when the activity is backgrounded, taking playback with it.
- **`updatePosition` is a snapshot, not a clock**: for a smooth progress bar subscribe to `AudioService.position`, which ticks independently of state changes.
- **Foreground service types are mandatory**: omitting `foregroundServiceType="mediaPlayback"` throws a `SecurityException` on Android 14 at runtime, not at build time.
- **Configure audio focus** with `AudioSessionConfiguration.music()` so a call pauses playback instead of mixing with the ringtone.

## Next Steps

- Cache tracks offline with `dio` and map `MediaItem.id` to a local file URI.
- Persist the last queue and position so playback resumes after a cold start.
- Read the [Flutter Accessibility Guide](../guides/flutter-accessibility-guide.md) to make the transport controls usable with TalkBack and VoiceOver.

## Conclusion

You now have a music player with a clean split between the audio engine, the background service, and the UI. Playback continues when the app is backgrounded, the notification stays in sync with the in-app controls, and the queue drives both the playlist and the metadata. That structure scales: swapping `just_audio` for a streaming backend touches the handler only, never the widgets.
