---
title: "Cheat Sheet Observabilitas Redis"
description: "Perintah dan konfigurasi untuk memeriksa Redis saat berjalan dengan INFO, SLOWLOG, MONITOR, LATENCY, dan keyspace notification, plus metrik exporter dan ambang alert untuk dashboard produksi."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Observabilitas Redis

## Tabel Referensi Cepat

| Aksi | Perintah | Deskripsi |
|------|----------|-----------|
| Identitas server dan uptime | `INFO server` | Versi, mode, run_id, uptime, config file |
| Klien dan koneksi terblokir | `INFO clients` | Klien terhubung, klien terblokir, maxclients |
| Penggunaan memori | `INFO memory` | `used_memory`, `used_memory_rss`, `maxmemory`, fragmentasi |
| Status persistensi | `INFO persistence` | Status save terakhir, kondisi RDB/AOF, waktu fork |
| Trafik dan hit rate | `INFO stats` | Ops/detik, hits, misses, eviction, key kedaluwarsa |
| Kesehatan replikasi | `INFO replication` | Role, offset replika, status master link |
| Biaya per perintah | `INFO commandstats` | Jumlah panggilan dan mikrodetik per perintah |
| Persentil latensi | `INFO latencystats` | p50/p99/p99.9 per perintah (Redis 7+) |
| Ukuran keyspace | `INFO keyspace` | Jumlah key, expires, dan rata-rata TTL per database |
| Log query lambat | `SLOWLOG GET 10` | Sepuluh entri terakhir di atas ambang yang dikonfigurasi |
| Bersihkan slow log | `SLOWLOG RESET` | Hapus semua entri setelah perubahan tuning |
| Aliran perintah langsung | `MONITOR` | Hanya untuk debug, menurunkan throughput secara signifikan |
| Lonjakan latensi | `LATENCY LATEST` | Sampel terakhir per kelas event latensi |
| Riwayat latensi | `LATENCY HISTORY fork` | Sampel bertimestamp untuk satu event |
| Reset data latensi | `LATENCY RESET` | Hapus semua event yang dilacak |
| Diagnosis latensi | `LATENCY DOCTOR` | Saran yang mudah dibaca atas lonjakan terdeteksi |
| Aktifkan notifikasi | `CONFIG SET notify-keyspace-events KEA` | Channel keyspace dan keyevent, semua kelas |
| Berlangganan event | `PSUBSCRIBE __keyevent@0__:*` | Konsumsi semua event di database 0 |
| Pemindaian key besar | `redis-cli --bigkeys` | Sampel keyspace untuk key terbesar per tipe |
| Tampilan statistik langsung | `redis-cli --stat` | Ringkasan bergulir key, memori, klien, ops |
| Status cluster | `CLUSTER INFO` | Status cluster, slot terisi, node dikenal |

**Ambang alert yang layak dipakai sebagai titik awal**

| Sinyal | Warning | Critical |
|--------|---------|----------|
| `redis_up` | — | `== 0` selama 1m |
| Memori terhadap `maxmemory` | `> 0.85` | `> 0.95` |
| Laju key ter-evict | `> 0/d` selama 5m | `> 100/d` selama 5m |
| Koneksi ditolak | `> 0/d` | `> 1/d` |
| Klien terhubung / `maxclients` | `> 0.75` | `> 0.90` |
| Rasio hit keyspace | `< 0.90` | `< 0.75` |
| Durasi p99 perintah | `> 10ms` | `> 50ms` |
| Pertumbuhan slow log | `> 10/menit` | `> 100/menit` |
| `rdb_last_bgsave_status` | — | `!= ok` |

## Perintah Umum

### Triase cepat

```bash
# Ringkasan sekali jalan: versi, memori, klien, trafik, eviction
redis-cli INFO server | grep -E 'redis_version|uptime_in_seconds'
redis-cli INFO memory | grep -E 'used_memory_human|maxmemory_human|mem_fragmentation_ratio'
redis-cli INFO stats  | grep -E 'instantaneous_ops_per_sec|keyspace_hits|keyspace_misses|evicted_keys'
redis-cli INFO clients | grep -E 'connected_clients|blocked_clients|maxclients'

# Hit ratio dalam satu baris (hits / (hits + misses))
redis-cli INFO stats | awk -F: '/keyspace_hits/ { h = $2 } /keyspace_misses/ { m = $2 }
  END { if (h + m > 0) printf "hit ratio: %.3f\n", h / (h + m); else print "belum ada pembacaan" }'
```

### Tuning slow log

```bash
# Catat perintah lebih lambat dari 5 ms, simpan 256 entri terakhir
redis-cli CONFIG SET slowlog-log-slower-than 5000
redis-cli CONFIG SET slowlog-max-len 256
redis-cli SLOWLOG GET 10
redis-cli SLOWLOG RESET
redis-cli SLOWLOG LEN

# Simpan konfigurasi agar restart tidak mengembalikannya diam-diam
redis-cli CONFIG REWRITE
```

### Pemantauan latensi

```bash
# Lacak setiap event yang memblokir server 10 ms atau lebih
redis-cli CONFIG SET latency-monitor-threshold 10
redis-cli LATENCY LATEST
redis-cli LATENCY HISTORY command
redis-cli LATENCY DOCTOR
redis-cli LATENCY RESET

# Probe round-trip dari sisi klien dan tampilan server langsung
redis-cli --latency -h 127.0.0.1 -p 6379
redis-cli --stat
```

### Keyspace notification

```bash
# Aktifkan key event dan channel keyspace untuk semua kelas
redis-cli CONFIG SET notify-keyspace-events KEA
redis-cli CONFIG GET notify-keyspace-events

# Pantau key kedaluwarsa dan ter-evict di database 2
redis-cli PSUBSCRIBE '__keyevent@2__:expired' '__keyevent@2__:evicted'
```

### MONITOR, dipakai dengan hati-hati

```bash
# Hanya untuk debug: setiap perintah diteruskan ke klien ini
timeout 5 redis-cli MONITOR | head -n 50
```

## Potongan Kode

### redis.conf untuk observabilitas

```ini
# Query lambat di atas 10 ms, simpan 512 entri
slowlog-log-slower-than 10000
slowlog-max-len 512

# Lacak event blocking 20 ms atau lebih
latency-monitor-threshold 20

# Keyspace notification: keyspace + keyevent, semua kelas
notify-keyspace-events KEA
```

### Menjalankan redis_exporter

```bash
docker run -d --name redis-exporter -p 9121:9121 \
  -e REDIS_ADDR=redis://:rahasia@redis-primary:6379 \
  oliver006/redis_exporter:v1.58.0

curl -s http://localhost:9121/metrics | grep -E '^redis_(up|memory_used_bytes|evicted_keys_total)'
```

### Aturan alert Prometheus

```yaml
groups:
  - name: redis-observability
    rules:
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis {{ $labels.instance }} tidak dapat dijangkau"
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis {{ $labels.instance }} melewati 85% maxmemory"
      - alert: RedisSlowCommands
        expr: histogram_quantile(0.99, sum by (le) (rate(redis_commands_duration_seconds_bucket[5m]))) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Latensi p99 perintah di atas 50 ms pada {{ $labels.instance }}"
```
