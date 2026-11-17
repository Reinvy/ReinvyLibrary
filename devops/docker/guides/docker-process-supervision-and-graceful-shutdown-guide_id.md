---
title: "Panduan Supervisi Proses dan Graceful Shutdown Kontainer Docker"
description: "Panduan praktis untuk memahami semantik siklus hidup kontainer: tugas PID 1, propagasi sinyal, init shim, reaping zombie, urutan drain, dan verifikasi shutdown."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Supervisi Proses dan Graceful Shutdown Kontainer Docker

## Pendahuluan

Kontainer bukan mesin virtual berukuran kecil. Kontainer adalah pohon proses dengan batas namespace, dan proses pertama di pohon itu menerima tanggung jawab PID 1 dari kernel: ia menerima sinyal yang dikirim runtime, ia mewarisi proses yatim dari semua yang berjalan di bawahnya, dan kode keluarnya menjadi kode keluar kontainer. Sebagian besar insiden produksi yang terlihat seperti "kontainer mengabaikan redeploy lalu dibunuh setelah sepuluh detik" atau "deploy menghilangkan request yang sedang berjalan" sebenarnya bukan masalah jaringan atau orkestrasi. Itu masalah PID 1.

Panduan ini membahas sisi siklus hidup dalam operasi kontainer: bagaimana proses yang Anda kirim menjadi PID 1, bagaimana SIGTERM sampai ke proses tersebut, mengapa kode keluar 137 terus muncul di dasbor Anda, dan bagaimana membuat shutdown berurutan alih-alih mendadak. Materi ini melengkapi panduan berbasis image di pustaka ini. Panduan optimasi image membuat image kecil dan panduan BuildKit membuat build cepat; panduan ini membuat kontainer yang berjalan berperilaku benar ketika scheduler memutuskan sudah waktunya berhenti.

Pola kegagalannya mudah dijelaskan. `docker stop` mengirim sinyal stop, menunggu sepuluh detik secara default, lalu mengirim SIGKILL. Jika proses Anda tidak pernah menerima sinyal pertama, atau menerimanya tetapi terus bekerja, kontainer mati di tengah request. Orkestrator tetap melaporkan stop yang berhasil, jadi tidak ada alert yang muncul. Hanya 502 dan file setengah tertulis yang memberi tahu Anda apa yang terjadi.

## Praktik Terbaik

### Gunakan bentuk exec untuk ENTRYPOINT dan CMD

`CMD node server.js` adalah bentuk shell: Docker membungkusnya menjadi `/bin/sh -c "node server.js"`. Shell bisa menggantikan dirinya dengan perintah tersebut, tetapi tidak wajib, dan begitu Anda menambahkan wrapper seperti `npm start`, pipeline shell, atau rangkaian `&&`, proses yang disinyal kernel adalah wrapper-nya, bukan aplikasi Anda. Bentuk exec (`CMD ["node", "server.js"]`) membuat binary Anda menjadi PID 1 tanpa ambiguitas. Untuk skrip entrypoint, aturan yang sama berlaku di baris terakhir: gunakan `exec "$@"` agar skrip digantikan, bukan berdiri di atas proses sebenarnya.

### Berikan PID 1 kepada proses yang mampu menjadi PID 1

PID 1 memiliki dua tugas tambahan: ia harus me-reap anak yang diadopsi ulang, dan ia mengabaikan sinyal yang tidak memiliki handler — kernel tidak menerapkan disposisi sinyal default kepada PID 1. Aplikasi yang tidak pernah memanggil `wait()` pada anaknya akan menumpuk zombie. Aplikasi yang tidak pernah memasang handler SIGTERM sederhananya tidak akan mati karena SIGTERM. Jika proses Anda tidak bisa melakukan keduanya, sisipkan init minimal: `docker run --init`, `init: true` di Compose, atau `tini`/`dumb-init` sebagai entrypoint. Shim tersebut meneruskan sinyal ke anak dan me-reap apa pun yang menjadi yatim.

### Tangani SIGTERM secara eksplisit dan keluar dengan sengaja

Graceful shutdown adalah fitur aplikasi, bukan flag Docker. Saat SIGTERM datang, berhenti menerima pekerjaan baru, selesaikan atau checkpoint pekerjaan yang sedang berjalan, flush buffer, tutup listener, lalu keluar dengan status yang disengaja. Pasang handler sedini mungkin — sebelum port dibuka — agar stop saat fase startup tidak berakhir dengan SIGKILL. Pasang juga untuk SIGINT supaya `docker run -it` dan Ctrl+C berperilaku sama seperti di produksi.

### Ubah STOPSIGNAL hanya jika Anda menguasai kedua sisi

`STOPSIGNAL SIGQUIT` sah ketika runtime Anda memang memperlakukan SIGQUIT sebagai drain yang graceful, dan menjadi jebakan ketika dipakai untuk membungkam proses yang mengabaikan SIGTERM. Sinyal yang dikirim Docker dan sinyal yang ditangani proses Anda harus sinyal yang sama. Dokumentasikan pilihan itu tepat di samping handler-nya.

### Sesuaikan timeout stop dengan waktu drain nyata, bukan dengan nilai default

Grace period default adalah sepuluh detik di Docker dan tiga puluh detik di Kubernetes. Keduanya tidak tahu berapa lama request terpanjang, flush batch, atau drain koneksi Anda. Ukur p99 shutdown lalu setel `--stop-timeout`, `stop_grace_period` pada Compose, dan `terminationGracePeriodSeconds` sedikit di atas angka itu. Timeout yang lebih pendek daripada drain menjamin pemotongan; timeout yang jauh lebih panjang hanya memperlambat rollout.

### Drain trafik sebelum proses berhenti melayani

SIGTERM dan deregistrasi load balancer tidak terkoordinasi. Kontainer bisa dihapus dari endpoint satu atau dua detik setelah sinyal tiba, artinya request tetap datang sementara proses sudah menolak. Jadikan readiness gagal lebih dulu, tunggu jeda deregistrasi, baru berhenti melayani. Di Kubernetes itu berupa `preStop` sleep atau pembalikan readiness secara eksplisit; di Compose dan Swarm itu berupa health check yang dipadukan dengan entrypoint yang sadar-drain.

### Jangan mensupervisi banyak proses tanpa menyatakannya

Satu proses per kontainer adalah default karena membuat sinyal dan kode keluar tidak ambigu. Ketika Anda benar-benar butuh beberapa proses (loop cron di samping web server, aplikasi plus pengirim log), gunakan supervisor sungguhan seperti s6-overlay atau supervisord, nyatakan sebagai PID 1, konfigurasikan agar meneruskan SIGTERM ke anak dalam urutan kebalikan urutan start, dan putuskan kode keluar anak mana yang harus menghentikan kontainer. `command: sh -c "a & b"` bukan supervisor; itu pabrik proses yatim.

### Flush log sebelum keluar dan kirim ke stdout

Log yang masih buffer di userspace mati bersama proses. Flush logger di dalam handler shutdown dan tulis ke stdout/stderr agar logging driver yang dikonfigurasi menangkap baris terakhir. Shutdown yang tidak meninggalkan jejak di log tidak bisa dibedakan dari crash.

### Uji shutdown seperti Anda menguji request

Kirim SIGTERM ke kontainer yang berjalan dan pastikan tiga hal: proses keluar dalam anggaran waktu, request yang sedang berjalan selesai, dan kode keluar sesuai yang Anda maksud. Ini hanya butuh satu skrip dan menangkap seluruh kelas regresi yang dibahas panduan ini, termasuk yang diperkenalkan oleh refactor yang membungkus binary dalam launcher.

## Langkah Implementasi

### Langkah 1: Cari tahu apa yang sebenarnya menjadi PID 1

Mulai dari observasi, bukan asumsi. Periksa pohon proses kontainer yang berjalan dan baca command line PID 1 persis seperti yang dilihat kernel.

```bash
# Tampilan dari host terhadap pohon proses kontainer
docker top my-app -o pid,ppid,stat,cmd

# Command line PID 1, langsung dari procfs kontainer
docker exec my-app cat /proc/1/cmdline | tr '\0' ' '
docker exec my-app sh -c 'ps -o pid,ppid,stat,comm -p 1'

# Sinyal apa yang akan dikirim runtime, dan berapa lama ia menunggu
docker inspect my-app \
  --format 'stopSignal={{.Config.StopSignal}} timeout={{.Config.StopTimeout}} cmd={{json .Config.Cmd}} entrypoint={{json .Config.Entrypoint}}'
```

Jika output menunjukkan `sh` atau `npm` alih-alih binary Anda, sisa panduan ini berlaku langsung. Jika output menunjukkan binary Anda tetapi shutdown tetap bermasalah, maka handler atau timeout-nya yang menjadi penyebab.

### Langkah 2: Ubah bentuk shell menjadi bentuk exec

Tulis ulang definisi proses agar binary menjadi hal pertama yang dijalankan kernel. Ini perubahan satu baris dengan efek besar.

```dockerfile
# Sebelum: PID 1 adalah shell, dan `npm` berada di antara shell dan node
CMD npm start

# Sesudah: node sendiri yang menjadi PID 1
CMD ["node", "server.js"]

# Sesudah, ketika launcher memang dibutuhkan: pertahankan launcher dalam bentuk exec
ENTRYPOINT ["node", "server.js"]
```

Koreksi yang sama berlaku untuk file Compose, yang diam-diam mewarisi bentuk shell ketika `command` berupa string biasa.

```yaml
services:
  app:
    image: registry.example.com/app:1.8.3
    # Sebelum: berjalan lewat /bin/sh -c dan menyisakan shell di pohon proses
    # command: npm start

    # Sesudah: array argv yang benar
    command: ["node", "server.js"]
    init: true
    stop_grace_period: 25s
```

### Langkah 3: Tambahkan init shim ketika aplikasi tidak bisa menjalankan tugas PID 1

Jika image dimulai dengan skrip shell, launcher JVM, atau proses apa pun yang melahirkan anak berumur pendek, tambahkan init kecil alih-alih menulis ulang aplikasi. Shim tersebut me-reap zombie dan meneruskan sinyal.

```dockerfile
# Opsi A: init versi pin sebagai entrypoint, dengan perintah asli sebagai argumen
FROM docker.io/library/alpine:3.20

RUN apk add --no-cache tini=0.19.0-r3
COPY ./app /usr/local/bin/app

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/app"]
```

```bash
# Opsi B: biarkan runtime menyuntikkan init — tanpa mengubah image
docker run --init --rm -p 3000:3000 registry.example.com/app:1.8.3

# Pastikan tini adalah PID 1 dan aplikasi menjadi anaknya
docker top app-check -o pid,ppid,stat,cmd
```

Compose mengekspos sakelar yang sama sebagai `init: true` (ditunjukkan pada Langkah 2). Kubernetes tidak punya flag init per pod, sehingga shim di level image adalah pilihan yang portabel di sana.

### Langkah 4: Implementasikan handler shutdown di aplikasi

Handler perlu melakukan empat hal secara berurutan: berhenti menerima pekerjaan, menyelesaikan pekerjaan saat ini, melepaskan resource, lalu keluar. Contoh HTTP di bawah memakai Node.js dan Go karena keduanya menyediakan primitif yang dibutuhkan tanpa supervisor.

```javascript
// server.js — graceful shutdown dengan batas waktu keras
import http from 'node:http';

const server = http.createServer(app);
const SHUTDOWN_BUDGET_MS = 20000;

let shuttingDown = false;

server.listen(3000, () => {
  console.log(JSON.stringify({ event: 'listening', port: 3000 }));
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ event: 'shutdown_started', signal }));

  // Berhenti menerima koneksi baru segera agar probe berubah merah
  server.close(async () => {
    try {
      await db.flush();
      await db.close();
      await cache.quit();
      console.log(JSON.stringify({ event: 'shutdown_complete' }));
      process.exit(0);
    } catch (error) {
      console.error(JSON.stringify({ event: 'shutdown_failed', message: error.message }));
      process.exit(1);
    }
  });

  // Lepaskan soket keep-alive yang menganggur agar close() selesai dalam waktu wajar
  server.closeIdleConnections();

  // Batas waktu keras: jangan biarkan grace period berakhir dengan SIGKILL
  const deadline = setTimeout(() => {
    console.error(JSON.stringify({ event: 'shutdown_deadline_exceeded' }));
    server.closeAllConnections();
    process.exit(1);
  }, SHUTDOWN_BUDGET_MS);
  deadline.unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({ event: 'uncaught_exception', message: error.message }));
  shutdown('uncaughtException');
});
```

```go
// main.go — shutdown berbasis context dengan tenggat eksplisit
package main

import (
    "context"
    "errors"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    srv := &http.Server{Addr: ":3000", Handler: newRouter()}

    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
    defer stop()

    go func() {
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            slog.Error("listen gagal", "err", err)
            os.Exit(1)
        }
    }()
    slog.Info("mendengarkan", "port", 3000)

    <-ctx.Done()
    slog.Info("shutdown dimulai")

    // Anggaran ini harus lebih pendek daripada grace period orkestrator
    drainCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
    defer cancel()

    if err := srv.Shutdown(drainCtx); err != nil {
        slog.Error("graceful shutdown gagal", "err", err)
        os.Exit(1)
    }
    slog.Info("shutdown selesai")
}
```

### Langkah 5: Perbaiki skrip entrypoint agar menyerahkan kendali

Entrypoint shell yang berakhir dengan `node server.js` tetap hidup sebagai induk, dan kernel terus mengirim sinyal ke shell tersebut. Akhiri skrip dengan `exec` agar shell digantikan oleh proses sebenarnya.

```bash
#!/bin/sh
set -eu

# Tunggu dependensi tanpa meninggalkan supervisor di belakang
until pg_isready -h "${DB_HOST}" -p 5432 >/dev/null 2>&1; do
  echo "menunggu basis data"
  sleep 1
done

# exec menggantikan shell ini, sehingga aplikasi menjadi PID 1 dan menerima SIGTERM
exec "$@"
```

Dengan `ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]` dan `CMD ["node", "server.js"]`, argumen tiba sebagai `"$@"` dan `exec` di baris akhir menghilangkan wrapper.

### Langkah 6: Selaraskan grace period di setiap lapisan

Setiap lapisan yang dapat memaksa stop punya timeout sendiri. Nilainya harus menurun, dengan tenggat internal aplikasi paling pendek dan tenggat kill runtime paling panjang, jika tidak lapisan di atas akan memotong shutdown yang sebenarnya berjalan benar.

```text
| Lapisan                        | Pengaturan                                        | Nilai yang disarankan    |
|--------------------------------|---------------------------------------------------|--------------------------|
| Tenggat internal aplikasi      | timer handler / context shutdown                   | 20s                      |
| Docker Engine                  | docker stop --timeout / docker run --stop-timeout  | 25s                      |
| Docker Compose                 | stop_grace_period                                  | 25s                      |
| Docker Swarm service           | stop_grace_period                                  | 25s                      |
| Pod Kubernetes                 | terminationGracePeriodSeconds                      | 30s                      |
| Deregistrasi load balancer     | target group deregistration delay                  | 5-10s (di dalam anggaran pod) |
```

```yaml
# compose.yaml — pengaturan yang penting untuk stop yang bersih
services:
  app:
    image: registry.example.com/app:1.8.3
    command: ["node", "server.js"]
    init: true
    stop_signal: SIGTERM
    stop_grace_period: 25s
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 5s
      timeout: 2s
      retries: 3
      start_period: 10s
```

### Langkah 7: Drain trafik sebelum proses berhenti melayani

Urutan yang menghindari request hilang adalah: tandai tidak siap, tunggu load balancer menyadarinya, baru matikan. Di Kubernetes gerbang readiness bisa dibalik oleh hook `preStop`; di Compose dan Docker biasa, health check plus drain di level entrypoint menghasilkan urutan yang sama.

```yaml
# Potongan deployment Kubernetes — readiness lebih dulu, baru shutdown
spec:
  terminationGracePeriodSeconds: 40
  containers:
    - name: app
      image: registry.example.com/app:1.8.3
      readinessProbe:
        httpGet:
          path: /ready
          port: 3000
        periodSeconds: 2
      lifecycle:
        preStop:
          exec:
            # 1. berhenti melaporkan siap, 2. beri waktu LB untuk deregistrasi
            command: ["/bin/sh", "-c", "curl -fsS -X POST localhost:3000/drain && sleep 8"]
```

Endpoint `/drain` harus membuat `/ready` mengembalikan 503 sementara `/health` tetap 200, sehingga kontainer dikeluarkan dari endpoint tetapi tidak di-restart. Pemisahan itulah inti dari membedakan liveness dan readiness.

### Langkah 8: Verifikasi perilaku shutdown, jangan hanya percaya manifest

Jalankan kontainer, kirim sinyal yang sebenarnya, lalu ukur. Skrip ini gagal dengan jelas ketika kode keluar 137 (SIGKILL setelah timeout) atau ketika proses menghabiskan seluruh anggaran waktu.

```bash
#!/usr/bin/env bash
set -euo pipefail

IMAGE="registry.example.com/app:1.8.3"
CONTAINER="shutdown-check-$$"
BUDGET_MS=25000

docker run -d --name "${CONTAINER}" --init -p 0:3000 "${IMAGE}" >/dev/null
sleep 3

# Sisipkan satu request panjang agar pemotongan bisa terlihat
START_MS=$(date +%s%3N)
docker exec "${CONTAINER}" node -e "fetch('http://localhost:3000/slow').then(r => console.log(r.status))" &
INFLIGHT=$!

STOP_START_MS=$(date +%s%3N)
docker stop --timeout $((BUDGET_MS / 1000)) "${CONTAINER}" >/dev/null
STOP_END_MS=$(date +%s%3N)

EXIT_CODE=$(docker inspect "${CONTAINER}" --format '{{.State.ExitCode}}')
ELAPSED_MS=$((STOP_END_MS - STOP_START_MS))

echo "exit_code=${EXIT_CODE} elapsed_ms=${ELAPSED_MS} inflight_elapsed_ms=$((STOP_END_MS - START_MS))"
docker logs "${CONTAINER}" 2>&1 | tail -n 5 || true
docker rm -f "${CONTAINER}" >/dev/null

if [ "${EXIT_CODE}" -eq 137 ]; then
  echo "GAGAL: kontainer dibunuh SIGKILL — grace period sudah habis" >&2
  exit 1
fi
if [ "${ELAPSED_MS}" -ge "${BUDGET_MS}" ]; then
  echo "GAGAL: shutdown menghabiskan seluruh anggaran waktu" >&2
  exit 1
fi
echo "LULUS: shutdown selesai dalam ${ELAPSED_MS}ms dengan kode keluar ${EXIT_CODE}"
wait "${INFLIGHT}" || true
```

Kode keluar memberi tahu jalur mana yang ditempuh, dan nilainya layak dihafal karena muncul di `docker ps -a`, log Compose, dan sebagian besar dasbor orkestrator.

```text
| Kode keluar | Arti                                                       | Biasanya menunjukkan                              |
|-------------|------------------------------------------------------------|---------------------------------------------------|
| 0           | Proses keluar normal                                       | Handler selesai dan keluar dengan sengaja         |
| 1           | Kesalahan aplikasi                                         | Handler menemui error atau anggaran waktu habis    |
| 143         | 128 + 15 — dihentikan SIGTERM tanpa handler                | Tidak ada handler shutdown sama sekali            |
| 137         | 128 + 9 — dibunuh SIGKILL                                  | Grace period habis; drain terlalu lambat          |
| 139         | 128 + 11 — segmentation fault                              | Crash, bukan masalah shutdown                     |
| 255         | Shell atau launcher keluar dengan status error             | Skrip entrypoint salah atau binary tidak ada      |
```

### Langkah 9: Supervisi secara sadar ketika kontainer harus menjalankan beberapa proses

Ketika proses mirip sidecar harus berbagi kontainer, serahkan PID 1 kepada supervisor dan buat perilaku sinyalnya eksplisit. s6-overlay adalah pilihan umum karena semantik shutdown-nya berurutan dan terdokumentasi.

```dockerfile
# s6-overlay mengelola banyak proses dan meneruskan SIGTERM dalam urutan kebalikan start
FROM docker.io/library/debian:12-slim

ARG S6_OVERLAY_VERSION=3.1.6.2
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz \
 && tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz \
 && rm -f /tmp/s6-overlay-*.tar.xz

COPY ./s6/services/app/run /etc/s6-overlay/s6-rc.d/app/run
COPY ./s6/services/app/finish /etc/s6-overlay/s6-rc.d/app/finish

ENTRYPOINT ["/init"]
```

```bash
# Skrip run layanan s6 — gunakan exec agar proses yang disupervisi menerima sinyal
#!/command/execlineb -P
foreground { echo "memulai aplikasi" }
exec node /usr/local/bin/server.js
```

Skrip `finish` adalah hook untuk urusan terakhir: flush, unggah checkpoint final, atau catat status keluar. Apa pun supervisor-nya, pastikan lewat `docker top` bahwa ia adalah PID 1 dan anak-anaknya mati dalam urutan yang Anda harapkan.

## Insight Penting

- Semantik PID 1 adalah akar dari hampir semua laporan "kontainer mengabaikan shutdown". Kernel tidak memberi aksi sinyal default kepada PID 1, sehingga aplikasi tanpa handler benar-benar tidak bisa dihentikan secara graceful oleh SIGTERM.
- Kode keluar 137 adalah hasil pengukuran, bukan pesan error: ia menyatakan drain memakan waktu lebih lama daripada grace period. Perbaiki aritmetika anggaran waktu sebelum memperbaiki handler.
- `exec` di skrip shell adalah kata paling berdampak dalam panduan ini. Ia mengubah rantai tiga proses menjadi satu proses yang bisa disinyal runtime secara langsung.
- Init shim itu murah. `--init` hanya menambah beberapa ratus kilobyte dan menghapus satu kelas bug zombie serta penerusan sinyal; hampir tidak ada alasan untuk tidak memakainya.
- Drain adalah operasi dua fase: jadilah tidak siap, baru berhenti. Proses yang berhenti melayani sebelum load balancer berhenti merutekan ke sana akan menghilangkan request, seberapa pun rapi handler-nya.
- Readiness dan liveness harus menjawab pertanyaan berbeda. Tidak ada yang memaksa pemisahan itu sejelas shutdown yang perlu tetap hidup selama drain.
- Timeout harus menurun di setiap lapisan di atas aplikasi. Handler 20 detik yang benar di balik timeout stop default 10 detik adalah handler 10 detik.
- Verifikasi dengan sinyal sungguhan. Membaca manifest tidak bisa memberi tahu apakah redeploy menghilangkan request; uji SIGTERM terotomasi bisa, dan tempatnya di CI berdampingan dengan pemindaian image.
