---
title: "Tutorial Logging dan Monitoring Docker"
description: "Tutorial langsung tentang implementasi logging terpusat dengan Docker logging driver, Loki, dan Promtail, serta pengumpulan metrik kontainer dengan cAdvisor, Prometheus, dan Grafana."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial Logging dan Monitoring Docker

## Ringkasan

Tutorial ini memandu Anda dalam menyiapkan pipeline logging dan monitoring yang komprehensif untuk kontainer Docker. Anda akan mempelajari cara mengonfigurasi driver logging Docker, mengirim log kontainer ke instance Loki terpusat menggunakan Promtail, mengumpulkan metrik tingkat kontainer dengan cAdvisor dan Prometheus, serta memvisualisasikan semuanya dalam dashboard Grafana. Pada akhirnya, Anda akan memiliki tumpukan observabilitas yang siap produksi yang berjalan berdampingan dengan aplikasi Docker Anda.

## Target Audiens

- DevOps engineer, backend developer, dan platform engineer yang mengelola kontainer Docker.
- Developer tingkat menengah yang nyaman dengan Docker Compose dan operasi baris perintah Linux dasar.

## Prasyarat

- Docker Engine 20.10+ dan Docker Compose v2 terinstal di mesin Anda.
- Pemahaman dasar tentang kontainer Docker, image, dan sintaks Compose.
- Port 3000, 9090, 9091, dan 9095 tersedia di host Anda untuk Grafana, Prometheus, cAdvisor, dan Loki.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Mengonfigurasi driver logging Docker (json-file, local, fluentd, dan gelf) per-kontainer dan secara global.
- Mengirim log kontainer ke instance Loki terpusat menggunakan Promtail dengan penemuan multi-instance.
- Menyebarkan cAdvisor untuk mengekspos metrik sumber daya kontainer secara real-time (CPU, memori, jaringan, disk).
- Mengumpulkan metrik cAdvisor dengan Prometheus dan menulis kueri promQL untuk pemantauan kontainer.
- Membangun dashboard Grafana yang menggabungkan log aplikasi dan metrik infrastruktur.
- Menyiapkan alerting berbasis health check menggunakan event Docker dan notifikasi webhook.

## Konteks dan Motivasi

Dalam lingkungan Docker produksi, kontainer bersifat sementara dan dapat diskalakan secara horizontal — pendekatan SSH-dan-tail tradisional menjadi tidak mungkin dilakukan. Ketika sebuah kontainer crash, lognya akan hilang kecuali sudah dikirim ke penyimpanan terpusat. Demikian pula, lonjakan CPU dan memori dari satu kontainer yang bermasalah dapat menurunkan kinerja layanan di sekitarnya, dan tanpa metrik Anda beroperasi secara buta.

Pipeline observabilitas yang tepat memecahkan tiga masalah:

- **Sentralisasi log**: semua stream stdout/stderr kontainer dikumpulkan di satu penyimpanan yang dapat dicari, terlepas dari host mana kontainer tersebut berjalan.
- **Pengumpulan metrik**: penggunaan sumber daya per-kontainer ditangkap dan disimpan untuk analisis tren, perencanaan kapasitas, dan penskalaan otomatis.
- **Alerting**: pola anomali memicu notifikasi sebelum menjadi kegagalan.

Tutorial ini membangun tumpukan observabilitas open-source yang ringan dan berfungsi baik untuk workstation developer tunggal maupun deployment multi-node berbasis Docker Swarm atau Compose.

## Konten Inti

### Memahami Driver Logging Docker

Docker menangkap stream stdout dan stderr dari proses kontainer (PID 1) dan mengarahkannya melalui **logging driver**. Driver menentukan di mana data log disimpan dan dalam format apa.

| Driver | Kasus Penggunaan | Kelebihan | Kekurangan |
|--------|------------------|-----------|------------|
| `json-file` | Default; debugging host tunggal | Tanpa konfigurasi, `docker logs` berfungsi | Tidak ada rotasi secara default, file besar |
| `local` | Produksi host tunggal | Kompresi dan rotasi bawaan | Format biner kustom, tidak dapat dibaca manusia |
| `syslog` | Infrastruktur syslog lama | Terintegrasi dengan server syslog yang ada | UDP dapat kehilangan pesan saat beban tinggi |
| `fluentd` | Pengiriman log ke aggregator | Buffer, routing berbasis tag, set plugin output yang luas | Memerlukan daemon Fluentd yang berjalan |
| `gelf` | Graylog Extended Log Format | JSON terstruktur, pesan terpotong untuk payload besar | Memerlukan Graylog atau penerima yang kompatibel |
| `awslogs` | AWS CloudWatch | Integrasi AWS asli | Khusus AWS, tanpa fallback lokal |
| `journald` | Host berbasis systemd | Terintegrasi dengan jurnal systemd | Ketergantungan systemd, format biner |

Secara default, Docker menggunakan `json-file` tanpa rotasi, yang dapat menyebabkan satu kontainer yang verbose memenuhi disk host. Untuk deployment produksi, beralihlah ke driver dengan rotasi atau aggregator log jarak jauh.

#### Mengonfigurasi Driver Logging

Atur driver logging secara global di `/etc/docker/daemon.json`:

```json
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Atau per-kontainer (atau per-service di Compose) untuk kontrol yang lebih terperinci:

```yaml
services:
  app:
    image: my-app:latest
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "5"
```

> **Insight penting**: Selalu konfigurasi `max-size` dan `max-file` untuk driver `json-file` dan `local`. Tanpa rotasi, kontainer yang menulis 1 MB/s log akan menghabiskan 86 GB per hari.

### Menyiapkan Loki untuk Penyimpanan Log Terpusat

Loki adalah sistem agregasi log yang dapat diskalakan secara horizontal dan ketersediaan tinggi, terinspirasi oleh Prometheus. Tidak seperti Elasticsearch, Loki **mengindeks label (metadata) daripada teks log lengkap**, menjadikannya secara signifikan lebih murah untuk dioperasikan untuk beban kerja container-native.

Buat file `docker-compose.observability.yml` untuk tumpukan monitoring:

```yaml
services:
  loki:
    image: grafana/loki:3.0
    ports:
      - "9095:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml
    networks:
      - observability

  promtail:
    image: grafana/promtail:3.0
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/log:/var/log:ro
      - ./promtail-config.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - observability
    depends_on:
      - loki

volumes:
  loki-data:

networks:
  observability:
    driver: bridge
```

#### Konfigurasi Loki (`loki-config.yaml`)

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  wal:
    dir: /loki/wal

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/compactor
  retention_enabled: true

limits_config:
  retention_period: 168h
```

Konfigurasi ini menyediakan retensi log 7 hari dengan format indeks TSDB dan penyimpanan sistem file lokal — cocok untuk pengembangan dan deployment skala kecil.

#### Konfigurasi Promtail (`promtail-config.yaml`)

Promtail menemukan file log di disk, melampirkan label, dan mendorongnya ke Loki. Insight kritisnya adalah bahwa Docker menyimpan log kontainer di `/var/lib/docker/containers/<container-id>/<container-id>-json.log` saat menggunakan driver `json-file`.

```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    static_configs:
      - targets: ["localhost"]
        labels:
          job: "docker-logs"
          __path__: /var/lib/docker/containers/*/*-json.log
    pipeline_stages:
      - json:
          expressions:
            log: log
            stream: stream
            attrs: attrs
            tag: attrs.tag
      - labels:
          stream:
          tag:
      - regex:
          expression: "^(?P<time>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2})"
          source: "log"
        action: timestamp
        format: RFC3339
```

Tahap pipeline JSON mem-parsing format log terstruktur Docker dan mengekstrak stream (stdout/stderr) dan tag (nama kontainer) sebagai label gaya Prometheus, memungkinkan pemfilteran cepat di Grafana.

### Mengumpulkan Metrik Kontainer dengan cAdvisor

cAdvisor (Container Advisor) adalah alat open-source Google untuk memantau penggunaan sumber daya dan karakteristik kinerja dari kontainer yang berjalan. Ini mengekspos metrik Prometheus di `/metrics`.

Tambahkan cAdvisor ke tumpukan observabilitas:

```yaml
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  ports:
    - "9091:8080"
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
    - /dev/disk/:/dev/disk:ro
  devices:
    - /dev/kmsg
  privileged: true
  networks:
    - observability
```

> **Catatan keamanan**: cAdvisor memerlukan akses ke jalur sistem host (`/rootfs`, `/var/run`, `/sys`) dan berjalan dalam mode privileged untuk mengumpulkan metrik dari subsistem cgroups dan namespaces. Dalam produksi, batasi cAdvisor ke node monitoring khusus.

cAdvisor mengekspos metrik seperti:
- `container_cpu_usage_seconds_total` — waktu CPU kumulatif
- `container_memory_working_set_bytes` — working-set memori saat ini
- `container_network_receive_bytes_total` — RX jaringan kumulatif
- `container_fs_usage_bytes` — penggunaan sistem file

### Konfigurasi Scrape Prometheus

Tambahkan Prometheus ke tumpukan untuk mengumpulkan data dari cAdvisor:

```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus-config.yaml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  networks:
    - observability

volumes:
  prometheus-data:
```

Konfigurasi Prometheus (`prometheus-config.yaml`):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
    metrics_path: /metrics
    relabel_configs:
      - source_labels: [__name__]
        regex: "container_(cpu|memory|network|fs|disk).*"
        action: keep
```

`relabel_configs` memfilter hanya metrik tingkat kontainer, tidak termasuk metrik tingkat host cAdvisor.

### Visualisasi dengan Grafana

Tambahkan Grafana dengan Prometheus dan Loki sebagai sumber data yang sudah dikonfigurasi sebelumnya:

```yaml
grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
  volumes:
    - grafana-data:/var/lib/grafana
    - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
  networks:
    - observability
  depends_on:
    - prometheus
    - loki

volumes:
  grafana-data:
```

Sediakan sumber data secara otomatis melalui `grafana-datasources.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
```

### Event Docker dan Alerting Berbasis Health Check

Docker mengeluarkan event melalui `docker events` untuk perubahan siklus hidup kontainer (start, stop, die, health_status). Gabungkan dengan penerima webhook untuk notifikasi mendekati real-time:

```bash
docker events --format '{{json .}}' \
  | jq -r 'select(.Type == "container" and .Action == "die") | .Actor.Attributes.name + " exited with status " + .Actor.Attributes.exitCode' \
  | while read -r alert; do
      curl -X POST -H "Content-Type: application/json" \
        -d "{\"text\": \"Container alert: $alert\"}" \
        https://hooks.slack.com/services/YOUR/WEBHOOK/URL
    done
```

Untuk health check, tentukan instruksi `HEALTHCHECK` di Dockerfile Anda:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

Grafana kemudian dapat memberikan alert pada metrik dari Prometheus. Misalnya, aturan alert "CPU tinggi":

```promql
rate(container_cpu_usage_seconds_total{name!=""}[5m]) > 0.8
```

Ketika kueri ini mengembalikan hasil untuk kontainer mana pun, kontainer tersebut menggunakan lebih dari 80% CPU rata-rata selama 5 menit terakhir.

## Contoh Kode

### Tumpukan Observabilitas Lengkap (`docker-compose.observability.yml`)

```yaml
services:
  loki:
    image: grafana/loki:3.0
    ports:
      - "9095:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml
    networks:
      - observability

  promtail:
    image: grafana/promtail:3.0
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/log:/var/log:ro
      - ./promtail-config.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - observability
    depends_on:
      loki:
        condition: service_started

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "9091:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    devices:
      - /dev/kmsg
    privileged: true
    networks:
      - observability

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus-config.yaml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - observability

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
      - grafana-data:/var/lib/grafana
    networks:
      - observability
    depends_on:
      - prometheus

volumes:
  loki-data:
  prometheus-data:
  grafana-data:

networks:
  observability:
    driver: bridge
```

### Integrasi Docker Compose dengan Layanan Aplikasi

Gabungkan tumpukan aplikasi Anda dengan tumpukan observabilitas menggunakan jaringan bersama:

```yaml
services:
  app:
    build: ./app
    ports:
      - "8080:8080"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - observability

networks:
  observability:
    external: true
```

Buat jaringan `observability` terlebih dahulu:

```bash
docker network create observability
```

Kemudian jalankan setiap tumpukan secara mandiri:

```bash
docker compose -f docker-compose.observability.yml up -d
docker compose -f docker-compose.app.yml up -d
```

### Menguji Pengiriman Log

Hasilkan contoh baris log untuk memverifikasi pipeline:

```bash
docker run --rm --log-opt tag="test-logger" \
  alpine sh -c 'for i in $(seq 1 20); do echo "{\"message\":\"log entry $i\",\"level\":\"info\",\"app\":\"test\"}" && sleep 1; done'
```

Kueri Loki melalui HTTP API:

```bash
curl -s "http://localhost:9095/loki/api/v1/query_range" \
  --data-urlencode 'query={tag="test-logger"}' \
  --data-urlencode 'limit=5' \
  | jq '.data.result[0].values[] | .[1]' 
```

Anda akan melihat 20 entri log yang dikembalikan sebagai string JSON mentah.

## Insight Penting

- **Selalu konfigurasi rotasi log**: Tanpa `max-size` dan `max-file`, driver `json-file` default Docker tidak pernah merotasi log, yang menyebabkan insiden disk penuh di produksi.
- **Pilih driver log yang tepat untuk skala Anda**: Untuk setup host tunggal, `local` dengan kompresi bawaan sudah cukup. Untuk deployment multi-host, gunakan `fluentd` atau `gelf` untuk mengirim log ke luar host.
- **Simpan log dan metrik secara terpisah**: Loki menangani log dengan murah dengan hanya mengindeks label; Prometheus menangani data metrik kardinalitas tinggi. Hindari menempatkan teks log ke dalam nilai label Prometheus.
- **cAdvisor adalah alat pengembangan, bukan solusi produksi**: Di Kubernetes, gunakan metrics-server. Di Docker Swarm, gunakan swarmprom atau endpoint metrik bawaan Docker.
- **Batasi kecepatan pengiriman log**: Konfigurasi `batchwait` dan `batchsize` Promtail untuk menghindari membebani Loki selama lonjakan log dari kontainer yang verbose.
- **Amankan tumpukan observabilitas Anda**: Jangan pernah mengekspos Prometheus, Loki, atau Grafana ke internet publik tanpa otentikasi. Gunakan otentikasi reverse proxy (OAuth2 Proxy, Authelia) atau otentikasi bawaan Grafana.

## Langkah Berikutnya

- Jelajahi pemantauan mode Docker Swarm dengan proyek `swarmprom` untuk tumpukan monitoring yang siap untuk klaster.
- Pelajari tentang OpenTelemetry untuk pelacakan terdistribusi di seluruh aplikasi Docker multi-layanan.
- Baca Silabus Kontainerisasi Docker untuk jalur pembelajaran terstruktur selama 12 minggu yang mencakup fundamental Docker hingga deployment produksi.

## Kesimpulan

Dalam tutorial ini, Anda membangun pipeline observabilitas Docker yang lengkap menggunakan alat open-source: Promtail mengirimkan log kontainer ke Loki untuk penyimpanan log terpusat, cAdvisor mengekspos metrik kontainer yang dikumpulkan oleh Prometheus, dan Grafana menyatukan semuanya dengan dashboard yang terpadu. Anda juga mempelajari cara mengonfigurasi driver logging Docker, menyiapkan alerting berbasis health check, dan mengintegrasikan tumpukan monitoring dengan layanan aplikasi Anda. Fondasi ini dapat diskalakan dari workstation developer tunggal hingga klaster Docker Swarm multi-node, memastikan Anda tidak pernah kehilangan visibilitas ke dalam beban kerja kontainer Anda.
