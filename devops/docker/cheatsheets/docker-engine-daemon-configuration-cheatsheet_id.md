---
title: "Cheat Sheet Konfigurasi dan Administrasi Daemon Docker Engine"
description: "Referensi cepat untuk mengonfigurasi daemon Docker: kunci daemon.json, perbedaan reload dan restart, perubahan storage driver dan data-root, registry mirror, akses jarak jauh TLS, context, mode rootless, dan metrik engine."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Konfigurasi dan Administrasi Daemon Docker Engine

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Tampilkan konfigurasi efektif | `docker info` | Gabungan flag daemon dan `daemon.json` sebagaimana dibaca saat start |
| Cetak satu nilai hasil resolusi | `docker info --format '{{.DockerRootDir}}'` | Akses satu field kondisi daemon yang sedang berjalan, aman untuk skrip |
| Validasi file konfigurasi kandidat | `sudo dockerd --validate --config-file /etc/docker/daemon.json` | Mengurai file tanpa menyentuh engine yang sedang berjalan |
| Terapkan subset yang bisa di-reload | `sudo systemctl reload docker` | Mengirim SIGHUP; hanya kunci log, registry, dan label yang berlaku |
| Restart engine | `sudo systemctl restart docker` | Diperlukan untuk perubahan storage-driver, data-root, userns, dan TLS |
| Ikuti log daemon | `journalctl -u docker -f` | Error sisi engine tidak pernah muncul di log container |
| Pindahkan data root | `"data-root": "/data/docker"` | Memindahkan image, container, volume, dan build cache |
| Batasi pool bridge default | `"default-address-pools": [{"base": "10.201.0.0/16", "size": 24}]` | Mencegah Docker memakai `172.17.0.0/16` di setiap host |
| Tambahkan pull-through mirror | `"registry-mirrors": ["https://mirror.internal"]` | Memangkas latensi pull pertama dan mengurangi beban Docker Hub |
| Izinkan registry HTTP biasa | `"insecure-registries": ["registry.lab:5000"]` | Mengizinkan registry tanpa sertifikat TLS yang valid |
| Pertahankan container saat restart | `"live-restore": true` | Container tetap berjalan ketika daemon di-upgrade |
| Remap user namespace container | `"userns-remap": "default"` | Root di container dipetakan ke rentang UID host tanpa hak istimewa |
| Selaraskan cgroup driver | `"exec-opts": ["native.cgroupdriver=systemd"]` | Wajib untuk semua versi Kubernetes yang masih didukung |
| Buka metrik engine | `"metrics-addr": "127.0.0.1:9323"` | Endpoint Prometheus untuk gauge container, image, dan build cache |
| Buat context jarak jauh | `docker context create prod --docker "host=tcp://engine:2376"` | Endpoint engine bernama, tanpa mengulang flag `-H` |
| Jalankan satu perintah pada context | `docker --context prod ps` | Menimpa context aktif hanya untuk satu pemanggilan |
| Jalankan engine tanpa root | `dockerd-rootless-setuptool.sh install` | Mode rootless dengan unit systemd milik user |
| Kunci versi API | `DOCKER_API_VERSION=1.43 docker ps` | Menjaga klien atau SDK lama tetap bekerja dengan engine baru |

## Perintah Umum

### Memeriksa Konfigurasi Efektif

```bash
# Semua yang berhasil diresolusi daemon, termasuk default yang dipilih sendiri
docker info

# Field tertentu, aman untuk skrip dan probe monitoring
docker info --format 'root={{.DockerRootDir}} driver={{.Driver}} cgroup={{.CgroupDriver}}'

# Apa yang akan dibaca engine pada start berikutnya
sudo cat /etc/docker/daemon.json

# Tolak file yang salah sebelum restart menjatuhkan seluruh fleet
sudo dockerd --validate --config-file /etc/docker/daemon.json

# Lihat baris perintah sebenarnya yang dipakai unit, termasuk drop-in
systemctl cat docker
```

`docker info` adalah satu-satunya sumber kebenaran: kunci yang ada di `daemon.json` tetapi diabaikan engine tampak sama di disk dengan kunci yang benar-benar diterapkan. Selalu bandingkan file dengan keluaran langsung setelah perubahan.

### Reload Versus Restart

`systemctl reload docker` mengirim SIGHUP. Daemon membaca ulang daftar kunci yang diizinkan saja; sisanya diabaikan tanpa peringatan sampai restart penuh.

```text
| kunci daemon.json            | reload | restart | Catatan                        |
|------------------------------|--------|---------|--------------------------------|
| registry-mirrors             | ya     | ya      | Berlaku untuk pull berikutnya  |
| insecure-registries          | ya     | ya      | Berlaku untuk pull berikutnya  |
| log-driver / log-opts        | ya     | ya      | Hanya container baru           |
| labels, debug, experimental  | ya     | ya      | Murah untuk diubah             |
| live-restore                 | tidak  | ya      | Dibaca saat daemon start       |
| data-root                    | tidak  | ya      | Path diresolusi sekali         |
| storage-driver               | tidak  | ya      | Butuh image store kosong       |
| userns-remap                 | tidak  | ya      | Membatalkan layer yang ada     |
| hosts / tlsverify / tlscert  | tidak  | ya      | Setup socket terjadi saat boot |
```

```bash
# Terapkan subset yang bisa di-reload tanpa menghentikan satu container pun
sudo systemctl reload docker

# Buktikan daemon sudah memakai nilai tersebut
docker info --format '{{json .RegistryConfig.Mirrors}}'

# Restart penuh: container berhenti kecuali live-restore aktif
sudo systemctl restart docker

# Pastikan semua container kembali dan flag sudah aktif
docker ps --format '{{.Names}} {{.Status}}'
docker info --format 'live-restore={{.LiveRestoreEnabled}}'
```

### Storage Driver dan Data Root

```bash
# Driver aktif dan direktori yang menyimpan seluruh layer
docker info --format 'root={{.DockerRootDir}} driver={{.Driver}}'

# Hentikan beban kerja dan engine sebelum memindahkan store
sudo systemctl stop docker
sudo rsync -aHAX /var/lib/docker/ /data/docker/

# Arahkan engine ke lokasi baru di /etc/docker/daemon.json
# { "data-root": "/data/docker" }
sudo systemctl start docker

# Verifikasi isi store ikut berpindah
docker images --format '{{.Repository}}:{{.Tag}}' | wc -l
```

Mengganti `storage-driver` tidak memigrasikan apa pun — driver baru dimulai dengan store kosong, jadi ekspor lebih dulu jika image tidak bisa di-pull ulang.

```bash
# Arsipkan semua image bertag sebelum berganti driver
mkdir -p /backup/images
for img in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>'); do
  docker save "$img" -o "/backup/images/$(echo "$img" | tr '/:' '__').tar"
done

# Pulihkan setelah pergantian
for tar in /backup/images/*.tar; do docker load -i "$tar"; done
```

### Registry Mirror, Proxy, dan Insecure Registry

```json
{
  "registry-mirrors": ["https://mirror.internal.example.com"],
  "insecure-registries": ["registry.lab:5000"],
  "max-concurrent-downloads": 6,
  "max-concurrent-uploads": 6
}
```

Proxy HTTP untuk pull image bukan kunci `daemon.json` — environment unit systemd adalah satu-satunya tempat daemon membacanya.

```bash
# /etc/systemd/system/docker.service.d/http-proxy.conf
# [Service]
# Environment="HTTP_PROXY=http://proxy.internal:3128"
# Environment="NO_PROXY=localhost,127.0.0.1,.internal"
sudo systemctl daemon-reload
sudo systemctl restart docker

# Pastikan mirror benar-benar melayani pull
docker pull alpine:3.20
```

### Akses Jarak Jauh dan TLS

```json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
  "tlsverify": true,
  "tlscacert": "/etc/docker/tls/ca.pem",
  "tlscert": "/etc/docker/tls/server-cert.pem",
  "tlskey": "/etc/docker/tls/server-key.pem"
}
```

Unit systemd dari paket sudah meneruskan `-H fd://` pada baris perintahnya, dan `-H` eksplisit selalu menang atas `hosts` di file konfigurasi. Pada host systemd, tambahkan listener lewat drop-in, bukan lewat `daemon.json`.

```bash
# /etc/systemd/system/docker.service.d/tcp.conf
# [Service]
# ExecStart=
# ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2376 --tlsverify \
#   --tlscacert=/etc/docker/tls/ca.pem \
#   --tlscert=/etc/docker/tls/server-cert.pem \
#   --tlskey=/etc/docker/tls/server-key.pem
sudo systemctl daemon-reload
sudo systemctl restart docker

# Uji dari mesin klien
docker --tlsverify \
  --tlscacert ca.pem --tlscert cert.pem --tlskey key.pem \
  -H tcp://engine.internal:2376 version
```

Listener `tcp://0.0.0.0:2375` tanpa autentikasi berarti root di host bagi siapa pun yang bisa menjangkau port tersebut. Tidak ada jalan tengah: pakai TLS dengan sertifikat klien, atau transport SSH.

### Context

```bash
# Daftarkan engine sekali, lalu berpindah tanpa mengedit konfigurasi manual
docker context create staging --docker "host=ssh://deploy@staging.internal"
docker context create prod --docker "host=tcp://engine.prod:2376"

docker context ls
docker context use staging
docker --context default ps
docker context inspect staging --format '{{.Endpoints.docker.Host}}'

# Hapus context yang tidak dipakai lagi
docker context rm staging
```

### Mode Rootless

```bash
# Pasang daemon milik user (tanpa root, tanpa socket di /var/run)
dockerd-rootless-setuptool.sh install

systemctl --user enable --now docker
docker context use rootless

# Daemon meletakkan socket-nya di $XDG_RUNTIME_DIR
docker info --format '{{.SecurityOptions}}'
echo "$DOCKER_HOST"
```

Rootless tidak bisa mengikat port privileged, tidak bisa me-mount sembarang path host, dan `--network host` digantikan perilaku `slirp4netns` atau `pasta`. Perlakukan ini sebagai alat isolasi per pengembang, bukan pengganti engine produksi.

### Metrik dan Log Engine

```bash
# /etc/docker/daemon.json: { "metrics-addr": "127.0.0.1:9323" }
curl -s http://127.0.0.1:9323/metrics | grep -c '^docker_'

# Masalah tingkat daemon: konfigurasi salah, kegagalan driver, OOM pada daemon
journalctl -u docker --since "30 min ago" -p warning

# Event daemon terstruktur, tanpa mengurai log teks
docker events --filter type=daemon --since 1h
```

## Potongan Kode

### Baseline daemon.json untuk Produksi

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" },
  "data-root": "/data/docker",
  "live-restore": true,
  "default-address-pools": [
    { "base": "10.201.0.0/16", "size": 24 }
  ],
  "registry-mirrors": ["https://mirror.internal.example.com"],
  "exec-opts": ["native.cgroupdriver=systemd"],
  "default-ulimits": {
    "nofile": { "Name": "nofile", "Hard": 65536, "Soft": 65536 }
  },
  "metrics-addr": "127.0.0.1:9323"
}
```

Driver `json-file` tanpa batas adalah penyebab paling umum disk penuh pada host Docker, dan `default-address-pools` adalah solusi ketika dua host memiliki jaringan bridge yang bertabrakan begitu keduanya di-peer.

### Drop-in systemd untuk Flag yang Tidak Bisa Diatur daemon.json

```ini
# /etc/systemd/system/docker.service.d/override.conf
[Service]
Environment="HTTP_PROXY=http://proxy.internal:3128"
Environment="NO_PROXY=localhost,127.0.0.1,.internal"
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
LimitNOFILE=1048576
```

Baris `ExecStart=` yang kosong wajib ada: tanpa mengosongkan nilai warisan, systemd menambahkan perintah Anda ke perintah bawaan paket dan engine start dengan flag ganda yang gagal diurai.

### Urutan Upgrade Engine Tanpa Downtime

```bash
# 1. Pastikan live-restore aktif, jika tidak setiap restart mematikan beban kerja
docker info --format '{{.LiveRestoreEnabled}}'

# 2. Kosongkan node dari beban kerja baru (Swarm; sesuaikan dengan orchestrator Anda)
docker node update --availability drain "$(docker info --format '{{.Swarm.NodeID}}')"

# 3. Upgrade paket, lalu restart dengan binary baru
sudo apt-get install --only-upgrade docker-ce
sudo systemctl restart docker

# 4. Verifikasi tidak ada yang mati dan versi API tetap sama
docker ps --format '{{.Names}} {{.Status}}'
docker version --format '{{.Server.APIVersion}}'

# 5. Kembalikan node ke layanan
docker node update --availability active "$(docker info --format '{{.Swarm.NodeID}}')"
```

### Konfigurasi Scrape Prometheus untuk Engine

```yaml
scrape_configs:
  - job_name: docker-engine
    static_configs:
      - targets: ["engine-01.internal:9323", "engine-02.internal:9323"]
    metrics_path: /metrics
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

Ikat `metrics-addr` ke antarmuka privat atau loopback dan scrape melalui jalur yang sama amannya dengan API — endpoint ini mengekspos jumlah image, jumlah container, dan ukuran cache yang menggambarkan bentuk deployment Anda.

### userns-remap dan Izin Bind Mount

```bash
# Aktifkan remap (semua image yang ada harus di-pull ulang setelahnya)
# /etc/docker/daemon.json: { "userns-remap": "default" }
sudo systemctl restart docker

# Rentang ID subordinate yang akan dipakai kernel
grep dockremap /etc/subuid /etc/subgid

# Root container kini 100000 + UID di host, sehingga bind mount milik
# root host tidak lagi bisa ditulis dari dalam container
ls -ld /srv/appdata
sudo chown -R 165536:165536 /srv/appdata

# Pastikan namespace aktif
docker run --rm alpine:3.20 id
```
