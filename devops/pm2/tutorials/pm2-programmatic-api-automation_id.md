---
title: "Membangun Alat Otomasi dengan PM2 Programmatic API"
description: "Tutorial lanjutan tentang menanamkan manajemen proses PM2 ke dalam alat otomasi Node.js Anda sendiri — menghubungkan ke daemon, membaca status proses, mengontrol aplikasi secara terprogram, mengonsumsi event bus, serta membangun CLI khusus, pembantu deployment, dan skrip alerting."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Alat Otomasi dengan PM2 Programmatic API

## Ringkasan

CLI `pm2` hanyalah ujung gunung es PM2 yang terlihat. Di balik setiap perintah yang Anda ketik berjalan sebuah API Node.js — `pm2.connect()`, `pm2.list()`, `pm2.start()`, `pm2.launchBus()` — yang berbicara dengan daemon yang sama melalui Unix socket. Tutorial ini mengajarkan Anda cara menanamkan API tersebut ke dalam perangkat Anda sendiri: CLI khusus yang mengoperasikan sekumpulan proses, skrip deployment dengan verifikasi health check, bot pemberi peringatan restart, dan dashboard internal yang membaca status proses secara langsung. Pada akhirnya, Anda akan membangun modul otomasi yang dapat digunakan ulang dan sebuah alat CLI yang mengelola PM2 sepenuhnya melalui kode, tanpa pernah memanggil biner CLI.

## Target Audiens

- Insinyur DevOps dan SRE yang mengotomasi manajemen proses Node.js di produksi.
- Pengembang backend yang ingin membangun perangkat internal di sekitar PM2 (bot deployment, dashboard monitoring, skrip operasional).
- Tingkat mahir: mengasumsikan pengetahuan kerja tentang dasar-dasar PM2 (`start`, `stop`, `list`, file ecosystem) dan keterampilan Node.js yang mumpuni.

## Prasyarat

- Node.js 18+ dan npm terinstal.
- PM2 terinstal global (`npm install -g pm2`) dan setidaknya satu aplikasi yang dikelola olehnya.
- Pengalaman dasar dengan perintah CLI PM2 dan file konfigurasi ecosystem.
- Pemahaman tentang callback Node.js dan pola async/await.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menghubungkan skrip Node.js ke daemon PM2 dan mengelola siklus hidup koneksi dengan benar.
- Membaca status proses secara real-time secara terprogram dengan `pm2.list()`, `pm2.jlist()`, dan `pm2.describe()`.
- Menjalankan, menghentikan, me-restart, me-reload, melakukan scaling, dan menghapus aplikasi sepenuhnya dari kode.
- Menggunakan operasi idempoten (`startOrRestart`, `startOrReload`) untuk menulis otomasi deployment yang aman.
- Berlangganan ke event bus PM2 dan bereaksi terhadap restart, baris log, dan sinyal proses secara real-time.
- Mengirim sinyal dan pesan khusus ke proses individual dari perangkat Anda.
- Membangun alat CLI praktis yang membungkus API terprogram dengan penanganan error dan penghentian yang bersih.

## Konteks dan Motivasi

Menskripkan PM2 dengan mengurai keluaran CLI itu rapuh. Bentuk keluaran `pm2 jlist` berubah antar versi, `pm2 list` adalah tabel yang dibuat untuk mata manusia, dan membuat subproses untuk setiap operasi itu lambat serta boros. Lebih buruk lagi, skrip CLI tidak punya cara menerima event — Anda bisa melakukan polling, tetapi tidak bisa mendengarkan.

API terprogram PM2 memecahkan semua ini. Paket npm `pm2` adalah kode yang sama yang menggerakkan CLI, berbicara dengan daemon yang sama melalui socket IPC-nya. Skrip Anda menjadi warga kelas satu dalam sistem manajemen proses: ia dapat memeriksa status JSON yang tepat, melakukan operasi atomik, dan berlangganan event bus real-time yang aktif ketika proses dimulai, berhenti, crash, atau mengeluarkan output log.

Penggunaan dunia nyata meliputi: bot deployment yang menjalankan `startOrReload` dan menunggu listener sebelum melaporkan keberhasilan; daemon alerting yang mengawasi event `process:exception` dan menghubungi insinyur yang on-call; CLI admin internal yang memungkinkan staf dukungan me-restart layanan tanpa akses SSH; dan agen telemetri yang mengirim snapshot `pm2.jlist()` ke penyimpanan metrik setiap menit.

## Konten Inti

### 1. API Terprogram versus CLI

Modul npm `pm2` mengekspos API tipis bergaya callback di atas protokol RPC daemon. Semua yang bisa dilakukan CLI, bisa dilakukan modul; CLI itu sendiri dibangun di atasnya. Perbedaan utamanya adalah data yang Anda terima: CLI memformat hasil untuk manusia, sementara modul mengembalikan JSON mentah yang bisa Anda proses secara terprogram.

```javascript
const pm2 = require('pm2');

// Daemon yang sama, proses yang sama — hanya diakses dari kode
pm2.list((err, list) => {
  if (err) { console.error(err); return; }
  console.log(`Mengelola ${list.length} proses`);
  pm2.disconnect();
});
```

Modul ini tersedia sebagai `pm2` di npm. Ketika Anda menginstal PM2 secara global, modul tersebut dapat digunakan oleh skrip Anda jika Anda me-require-nya dari jalur global, tetapi pendekatan yang lebih bersih untuk perangkat adalah dependensi lokal di proyek Anda sendiri.

### 2. Daemon PM2 dan Koneksi IPC

PM2 menjalankan God daemon — sebuah proses latar yang terlepas — yang menjadi sumber kebenaran tunggal untuk status proses. Skrip Anda tidak mengelola proses secara langsung; ia mengirim permintaan RPC ke daemon melalui Unix socket (biasanya `~/.pm2/pub.sock`), dan daemon melakukan operasi lalu membalas.

Arsitektur ini memiliki konsekuensi penting bagi pembuat perangkat:

- Daemon mungkin tidak berjalan. Modul ini **tidak** memulai daemon secara otomatis seperti yang dilakukan CLI — Anda harus memanggil `pm2.connect()` dan menangani error untuk kasus daemon mati.
- Banyak klien dapat terhubung ke daemon yang sama secara bersamaan. CLI Anda, dashboard kolega Anda, dan antarmuka web berbagi tampilan status proses yang sama.
- Setiap koneksi terpisah. Anda bertanggung jawab menutupnya ketika skrip selesai, jika tidak proses dapat menggantung menunggu socket ditutup.
- Operasi bersifat asinkron. Anda selalu menerima hasil melalui callback (atau promise yang Anda tulis sendiri), tidak pernah melalui nilai kembalian.

### 3. Mengelola Siklus Hidup Koneksi

`pm2.connect()` menjalin koneksi. Ia menerima objek opsi dan callback. Opsi yang paling berguna adalah:

- `noDaemonMode: true` — memulai daemon baru (atau menggunakan yang sudah berjalan) bahkan jika PM2 belum pernah dijalankan; berguna untuk otomasi yang berjalan di mesin yang belum pernah meluncurkan PM2.
- `max_retries` — berapa kali modul mencoba ulang koneksi sebelum menyerah (default bervariasi antar versi; atur secara eksplisit untuk otomasi yang andal).

```javascript
pm2.connect({ max_retries: 3 }, (err) => {
  if (err) {
    console.error('Gagal terhubung ke daemon PM2:', err.message);
    process.exit(1);
  }
  // ... bekerja dengan API ...
});
```

Panggil `pm2.disconnect()` ketika program Anda selesai. Pola yang berguna untuk skrip sekali jalan: lakukan semua pekerjaan, lalu putuskan koneksi di dalam callback terakhir. Untuk perangkat berjalan lama (listener event bus, server dashboard), putuskan koneksi di handler shutdown Anda (`SIGINT`/`SIGTERM`) agar proses keluar dengan bersih.

### 4. Membaca Status Proses

Tiga panggilan mencakup hampir semua kebutuhan baca Anda:

- `pm2.list(cb)` — mengembalikan array objek proses, masing-masing dengan `name`, `pm_id`, `status`, `restart_time`, `unstable_restarts`, dan objek `pm2_env` yang berisi environment yang ter-resolve, tanggal pembuatan, dan konfigurasi.
- `pm2.jlist(cb)` — data yang sama dengan `list`, tetapi sebagai string JSON. Berguna ketika Anda ingin mengalirkan tepat satu blob JSON ke suatu tempat tanpa khawatir konversi array.
- `pm2.describe(nameOrId, cb)` — informasi terperinci untuk satu proses, termasuk jalur log, interpreter, dan metadata versioning yang disimpan PM2 saat deploy.

Pola otomasi yang umum adalah membangun pencarian dari nama ke proses:

```javascript
function findProcess(name) {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) { reject(err); return; }
      resolve(list.find((p) => p.name === name) || null);
    });
  });
}
```

Dengan objek proses di tangan, Anda dapat membaca `status` (`online`, `stopped`, `errored`, `launching`), `restart_time` untuk mendeteksi crash loop, dan `pm2_env.pm_uptime` untuk stempel waktu mulai proses.

### 5. Mengontrol Proses Secara Terprogram

Permukaan kontrol mencerminkan CLI:

- `pm2.start(scriptOrConfig, options, cb)` — menjalankan skrip, atau objek konfigurasi ecosystem, dengan override per aplikasi.
- `pm2.restart(nameOrId, cb)` — menghentikan lalu menjalankan proses (downtime singkat).
- `pm2.reload(nameOrId, cb)` — restart bergulir tanpa downtime; hanya berfungsi untuk aplikasi dalam mode cluster.
- `pm2.stop(nameOrId, cb)` / `pm2.delete(nameOrId, cb)` — menghentikan, atau menghentikan dan menghapus dari daftar proses.
- `pm2.scale(name, number, cb)` — mengubah ukuran jumlah instance cluster.
- `pm2.refresh` / `pm2.reset` — mereset penghitung restart.

Menjalankan dari sebuah objek memberi Anda kekuatan ecosystem penuh tanpa file konfigurasi:

```javascript
pm2.start({
  name: 'api',
  script: 'dist/server.js',
  instances: 'max',
  exec_mode: 'cluster',
  env: { NODE_ENV: 'production', PORT: 3000 },
  max_memory_restart: '500M',
}, (err, apps) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`Menjalankan ${apps.length} instance api`);
  pm2.disconnect();
});
```

`pm2.start()` juga dapat menerima string jalur ke file ecosystem, yang menjaga konfigurasi yang dapat dibaca mesin di repositori Anda sementara logika otomasi hidup di perangkat Anda.

```javascript
pm2.start('/opt/myapp/ecosystem.config.js', (err) => {
  if (err) {
    console.error('Gagal memuat file ecosystem:', err.message);
    process.exit(1);
  }
  console.log('Aplikasi dijalankan dari file ecosystem');
  pm2.disconnect();
});
```

### 6. Operasi Idempoten: startOrRestart dan startOrReload

Perangkat deployment membutuhkan operasi yang melakukan hal yang benar baik aplikasi sedang berjalan maupun tidak. Menjalankan `pm2.delete` pada proses yang tidak ada menghasilkan error; me-restart proses yang terhenti berhasil, tetapi cold start lebih bersih. API menyediakan dua operasi idempoten:

- `pm2.startOrRestart(config, cb)` — jika proses dengan nama yang dikonfigurasi ada, restart dengan konfigurasi (yang mungkin diperbarui); jika tidak, mulai dari awal.
- `pm2.startOrReload(config, cb)` — sama, tetapi menggunakan reload tanpa downtime ketika aplikasi sudah ada dan berjalan dalam mode cluster.

Dua panggilan ini adalah tulang punggung deploy otomatis yang aman: satu perintah membawa aplikasi baru online dan memperbarui aplikasi yang ada, tanpa logika percabangan di sisi Anda.

```javascript
pm2.startOrReload({
  name: 'worker',
  script: 'dist/worker.js',
  instances: 2,
  exec_mode: 'cluster',
  env: { NODE_ENV: 'production' },
}, (err, apps) => {
  if (err) { console.error('Deploy gagal:', err.message); process.exit(1); }
  console.log('Worker online dan mutakhir');
  pm2.disconnect();
});
```

### 7. Event Bus: Menerima Event Real-Time

Event bus (`pm2.launchBus()`) adalah tempat API terprogram menjadi jauh lebih kuat daripada shell scripting. Ia memberi Anda aliran event yang dipancarkan daemon:

- `process:event` — transisi siklus hidup, dengan `data.process.pm2_env.status` menunjukkan status baru dan `event` menamai pemicunya (misalnya, `online`, `exit`, `restart`).
- `log:out` dan `log:err` — baris stdout/stderr dari proses terkelola mana pun.
- `error` — error tingkat daemon (misalnya, crash proses) dengan `data.process.name` mengidentifikasi aplikasi.
- `pm2:kill` — dipicu ketika daemon itu sendiri dimatikan.
- `human:event` — event khusus yang Anda pancarkan dari kode aplikasi melalui `pm2.sendDataToProcessId` atau emitter `@pm2/io`.

Daemon pemberi peringatan restart hanya beberapa baris:

```javascript
const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) { console.error(err); process.exit(1); }

  pm2.launchBus((busErr, bus) => {
    if (busErr) { console.error(busErr); process.exit(1); }

    bus.on('process:event', (data) => {
      if (data.event === 'restart' || data.event === 'exit') {
        const name = data.process.name;
        const status = data.process.pm2_env.status;
        console.log(`[ALERT] ${name} → ${data.event} (status: ${status})`);
      }
    });

    bus.on('log:err', (data) => {
      console.error(`[${data.process.name}]`, data.data.trim());
    });
  });
});
```

Perhatikan bahwa objek bus mirip EventEmitter: Anda dapat memasang banyak listener, dan Anda harus melepas atau memutuskan koneksi ketika perangkat Anda dimatikan.

### 8. Mengirim Sinyal dan Pesan ke Proses

Terkadang otomasi harus berinteraksi dengan proses, bukan sekadar mengelolanya. Ada dua mekanisme:

- `pm2.sendSignalToProcessName(signal, name, cb)` — mengirimkan sinyal POSIX (misalnya, `SIGUSR1` untuk rotasi log, `SIGTERM` untuk drain yang anggun) ke setiap instance aplikasi bernama.
- `pm2.sendDataToProcessId(id, data, cb)` — mengirim objek arbitrer ke proses tertentu, di mana handler `process.on('message')` milik aplikasi dapat menerimanya.

Yang kedua sangat kuat untuk alur kerja operasional — memberi tahu worker untuk menguras antreannya, membersihkan cache, atau memuat ulang konfigurasi tanpa me-restartnya:

```javascript
// sisi otomasi
pm2.sendDataToProcessId(3, {
  type: 'process:msg',
  data: { action: 'reload-config' },
  topic: 'config-reload',
}, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('Pesan terkirim ke proses 3');
  pm2.disconnect();
});
```

```javascript
// sisi aplikasi
process.on('message', (msg) => {
  if (msg.data && msg.data.action === 'reload-config') {
    loadConfig(); // logika khusus aplikasi Anda
  }
});
```

### 9. Shutdown yang Anggun dan Pembersihan dalam Alat Otomasi

Alat otomasi berjalan lama harus membersihkan koneksi PM2-nya ketika berhenti, atau proses akan menggantung sampai socket timeout berlaku. Pola yang kokoh adalah membungkus pekerjaan Anda dalam fungsi yang mengembalikan promise, lalu memutuskan koneksi di jalur ala `finally` — dan memasang handler sinyal untuk alat interaktif:

```javascript
async function main() {
  await connect();
  try {
    // ... pekerjaan otomasi ...
  } finally {
    pm2.disconnect();
  }
}

process.on('SIGINT', () => {
  console.log('\nMenerima SIGINT, memutuskan koneksi...');
  pm2.disconnect();
  process.exit(0);
});
```

Untuk skrip sekali jalan, selalu putuskan koneksi sebelum keluar; untuk alat bergaya daemon, putuskan koneksi di handler shutdown dan biarkan event loop mengalir secara alami.

### 10. Membangun Alat Otomasi Nyata: Anatomi dan Pola

Alat otomasi produksi yang dibangun di atas API biasanya melapiskan empat perhatian:

1. **Pembungkus koneksi** — `connect()` yang mengembalikan promise, menerapkan `max_retries`, dan gagal dengan lantang serta pesan yang jelas tentang status daemon.
2. **Fungsi domain** — pembungkus tipis seperti `getStatus('api')` atau `deployApp(config)` yang menyembunyikan plumbing callback di balik promise dan menyertakan verifikasi (misalnya, periksa `status === 'online'` setelah restart).
3. **Verifikasi** — jangan pernah percaya callback operasi saja; setelah deploy, polling `pm2.list()` sampai proses melaporkan `online` dengan `restart_time` yang baru, atau gagalkan proses.
4. **Permukaan runtime** — CLI (commander/yargs) atau listener event bus yang menggerakkan fungsi domain.

Contoh kerja lengkap ada di bagian Contoh Kode: sebuah CLI `pm2ops` yang dapat menampilkan status, memberi peringatan pada restart, dan melakukan deployment terverifikasi.

## Contoh Kode

### Skrip 1: Pembungkus Manajer Proses Minimal

Pembungkus berbasis promise untuk panggilan yang paling umum. Simpan sebagai `pm2api.js`:

```javascript
const pm2 = require('pm2');

const CONNECT_OPTIONS = { max_retries: 3 };

function connect() {
  return new Promise((resolve, reject) => {
    pm2.connect(CONNECT_OPTIONS, (err) => err ? reject(err) : resolve());
  });
}

function call(method, ...args) {
  return new Promise((resolve, reject) => {
    pm2[method](...args, (err, result) => err ? reject(err) : resolve(result));
  });
}

function disconnect() {
  return new Promise((resolve) => pm2.disconnect(() => resolve()));
}

module.exports = { connect, call, disconnect };
```

Penggunaan — skrip sekali jalan yang mencantumkan semua proses dalam tabel yang dapat dibaca mesin:

```javascript
const api = require('./pm2api');

(async () => {
  try {
    await api.connect();
    const list = await api.call('list');
    for (const proc of list) {
      const env = proc.pm2_env;
      console.log(`${proc.name.padEnd(20)} ${env.status.padEnd(10)} ` +
        `restarts=${env.restart_time} pid=${proc.pid || '-'}`);
    }
  } catch (err) {
    console.error('Otomasi gagal:', err.message);
    process.exitCode = 1;
  } finally {
    await api.disconnect();
  }
})();
```

### Skrip 2: Membaca Status JSON dengan jlist

Agen monitoring yang menambahkan snapshot JSON ke file log setiap menit. String `jlist` sudah berbentuk JSON, jadi ia ditulis langsung ke file:

```javascript
const fs = require('fs');
const pm2 = require('pm2');

const SNAPSHOT_FILE = '/var/log/pm2-snapshots.jsonl';

pm2.connect({ max_retries: 3 }, (err) => {
  if (err) { console.error(err); process.exit(1); }

  const snapshot = () => {
    pm2.jlist((jlistErr, json) => {
      if (jlistErr) { console.error(jlistErr); return; }
      fs.appendFileSync(SNAPSHOT_FILE, `${json}\n`);
      console.log(`Snapshot ditulis (${new Date().toISOString()})`);
    });
  };

  snapshot();
  const timer = setInterval(snapshot, 60_000);

  process.on('SIGTERM', () => {
    clearInterval(timer);
    pm2.disconnect();
    process.exit(0);
  });
});
```

### Skrip 3: Peringatan pada Restart dengan launchBus

Listener yang menandai crash loop — lebih dari tiga restart dalam sepuluh menit — dan menulis entri peringatan:

```javascript
const pm2 = require('pm2');

const restartWindow = new Map(); // name -> [timestamp]

pm2.connect({ max_retries: 3 }, (err) => {
  if (err) { console.error(err); process.exit(1); }

  pm2.launchBus((busErr, bus) => {
    if (busErr) { console.error(busErr); process.exit(1); }

    bus.on('process:event', (data) => {
      if (data.event !== 'restart') return;
      const name = data.process.name;
      const now = Date.now();

      const timestamps = (restartWindow.get(name) || []).filter(
        (t) => now - t < 600_000
      );
      timestamps.push(now);
      restartWindow.set(name, timestamps);

      if (timestamps.length > 3) {
        console.error(`[CRASH LOOP] ${name} restart ${timestamps.length} ` +
          `kali dalam 10 menit terakhir`);
        // Pasang integrasi pager/chat Anda di sini
      }
    });
  });
});
```

### Skrip 4: Pembantu Deployment Tanpa Downtime

Fungsi deploy yang digunakan oleh CI: bangun artefak terlebih dahulu, lalu `startOrReload`, kemudian verifikasi inkarnasi baru online. Langkah verifikasi melakukan polling sampai `restart_time` proses berubah menjadi lebih baru dari snapshot pra-deploy:

```javascript
const pm2 = require('pm2');

const DEPLOY_CONFIG = {
  name: 'api',
  script: 'dist/server.js',
  instances: 'max',
  exec_mode: 'cluster',
  env: { NODE_ENV: 'production' },
};

function currentRestartTime(name) {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) { reject(err); return; }
      const proc = list.find((p) => p.name === name);
      resolve(proc ? proc.pm2_env.restart_time : -1);
    });
  });
}

async function deploy() {
  await new Promise((resolve, reject) => {
    pm2.connect({ max_retries: 3 }, (err) => err ? reject(err) : resolve());
  });

  try {
    const before = await currentRestartTime('api');

    await new Promise((resolve, reject) => {
      pm2.startOrReload(DEPLOY_CONFIG, (err) => err ? reject(err) : resolve());
    });

    // Polling sampai restart terjadi, dengan batas keras 30 detik
    for (let i = 0; i < 30; i++) {
      const after = await currentRestartTime('api');
      if (after !== -1 && after !== before) {
        console.log('Deploy terverifikasi: api menjalankan versi baru');
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('Waktu habis menunggu proses baru online');
  } finally {
    pm2.disconnect();
  }
}

deploy().catch((err) => {
  console.error('Deploy gagal:', err.message);
  process.exit(1);
});
```

### Skrip 5: Alat CLI Kecil dengan Commander

Menghubungkan pembungkus ke dalam CLI yang dapat digunakan. Instal `commander` secara lokal terlebih dahulu (`npm install commander`), lalu `pm2ops.js` ini:

```javascript
const { Command } = require('commander');
const pm2 = require('pm2');
const program = new Command();

program
  .name('pm2ops')
  .description('Perangkat operasional yang dibangun di atas API terprogram PM2');

program
  .command('status <name>')
  .description('Menampilkan status langsung dari satu proses terkelola')
  .action(async (name) => {
    pm2.connect({ max_retries: 3 }, async (err) => {
      if (err) { console.error(err); process.exit(1); }
      pm2.describe(name, (describeErr, procs) => {
        if (describeErr || !procs || procs.length === 0) {
          console.error(`Tidak ada proses bernama ${name}`);
          process.exitCode = 1;
        } else {
          const p = procs[0];
          console.log(`${p.name}: ${p.pm2_env.status} (pid ${p.pid}, ` +
            `restarts ${p.pm2_env.restart_time})`);
        }
        pm2.disconnect();
      });
    });
  });

program
  .command('graceful-reload <name>')
  .description('Me-reload aplikasi tanpa downtime (wajib mode cluster)')
  .action((name) => {
    pm2.connect({ max_retries: 3 }, (err) => {
      if (err) { console.error(err); process.exit(1); }
      pm2.reload(name, (reloadErr) => {
        if (reloadErr) {
          console.error(`Reload gagal: ${reloadErr.message}`);
          process.exitCode = 1;
        } else {
          console.log(`${name} di-reload secara anggun`);
        }
        pm2.disconnect();
      });
    });
  });

program.parse(process.argv);
```

Jalankan dengan `node pm2ops.js status api` atau `node pm2ops.js graceful-reload api`. CLI berbagi daemon dan daftar proses yang sama dengan perintah `pm2` di terminal Anda, sehingga Anda dapat mencampur keduanya dengan bebas.

### Skrip 6: Menangani Kegagalan Daemon dengan Anggun

Kegagalan otomasi yang paling umum adalah daemon yang tidak ada — misalnya, server di-reboot sebelum `pm2 startup` dikonfigurasi. Pembungkus yang mendeteksi hal ini dan melaporkan pesan yang dapat ditindaklanjuti manusia:

```javascript
const pm2 = require('pm2');
const { execFileSync } = require('child_process');

function ensureDaemon() {
  return new Promise((resolve, reject) => {
    pm2.connect({ max_retries: 1 }, (err) => {
      if (!err) { resolve(); return; }

      try {
        // CLI akan memulai daemon jika tidak ada
        execFileSync('pm2', ['ping'], { stdio: 'pipe' });
        pm2.connect({ max_retries: 3 }, (retryErr) => {
          retryErr ? reject(retryErr) : resolve();
        });
      } catch (startErr) {
        reject(new Error(
          'Daemon PM2 tidak tersedia dan tidak dapat dimulai otomatis. ' +
          'Jalankan "pm2 startup" sekali untuk memasang layanan boot.'
        ));
      }
    });
  });
}

(async () => {
  try {
    await ensureDaemon();
    console.log('Terhubung ke daemon PM2');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    pm2.disconnect();
  }
})();
```

## Insight Penting

- Jangan pernah mem-parse keluaran CLI dalam otomasi. API terprogram mengembalikan JSON terstruktur (`list`, `jlist`, `describe`) yang stabil dan lengkap; tabel manusia CLI adalah antarmuka yang tidak stabil untuk dijadikan skrip.
- Selalu panggil `pm2.disconnect()`. Skrip sekali jalan menggantung atau keluar terlambat, dan alat berjalan lama membocorkan socket, ketika koneksi dibiarkan terbuka. Putuskan koneksi di blok `finally` atau di handler sinyal Anda.
- Utamakan `startOrRestart`/`startOrReload` daripada `start` plus percabangan. Keduanya idempoten: cold start untuk aplikasi baru, pembaruan untuk aplikasi yang ada, tanpa logika `if berjalan` dari Anda sendiri.
- Verifikasi, jangan berasumsi. Callback operasi terpicu tidak berarti proses sehat. Polling `pm2.list()` untuk `status === 'online'` dan `restart_time` yang baru setelah deploy.
- Tangani kasus daemon yang hilang secara eksplisit. API terprogram tidak memulai daemon secara otomatis; deteksi kegagalan koneksi dan laporkan remediasi `pm2 startup` alih-alih gagal diam-diam.
- Event bus adalah keunggulan Anda atas shell script. Event `process:event`, `log:err`, dan `error` memberi Anda kesadaran real-time atas crash dan restart yang hanya bisa didekati oleh polling.
- Gunakan satu daemon, banyak klien. CLI, dashboard, dan skrip CI Anda semua terhubung ke daemon yang sama, sehingga status tetap konsisten — tetapi ingat bahwa operasi kontrol yang bersamaan dapat bersaing, jadi jaga agar deploy terserialisasi per aplikasi.

## Langkah Berikutnya

- Perdalam pemahaman Anda tentang event bus dan metrik khusus dengan tutorial PM2 Application Monitoring and Observability.
- Jelajahi arsitektur God daemon dan mesin status proses dalam silabus Advanced PM2 Internals and Production Reliability.
- Gabungkan perangkat ini dengan panduan Process Lifecycle untuk membangun otomasi deployment yang menghormati shutdown yang anggun dan sinyal readiness.
- Pertimbangkan untuk membungkus fungsi domain Anda dalam pipeline CI/CD yang layak menggunakan pola deployment GitHub Actions.

## Kesimpulan

API terprogram PM2 mengubah manajemen proses yang berpusat pada terminal menjadi platform yang dapat Anda bangun. Anda sekarang tahu cara menghubungkan ke daemon, membaca dan mengontrol proses dengan data terstruktur, menerima event siklus hidup dan log secara real-time, dan mengemas semuanya menjadi otomasi idempoten yang terverifikasi. Pola-pola di sini — pembungkus promise, loop verifikasi, alerting event bus, pemutusan koneksi yang anggun — langsung terbawa ke perangkat produksi, baik itu bot deploy, CLI internal, atau agen observability. Mulailah dengan `pm2.connect()` dan satu fungsi domain; seluruh platform terbuka dari sana.
