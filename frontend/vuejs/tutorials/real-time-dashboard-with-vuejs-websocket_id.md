---
title: "Membangun Dashboard Real-Time dengan Vue.js dan WebSocket"
description: "Tutorial komprehensif tentang membangun dashboard monitoring real-time dengan Vue.js 3, WebSocket API native, dan Chart.js untuk visualisasi data langsung."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Dashboard Real-Time dengan Vue.js dan WebSocket

## Ringkasan

Tutorial ini memandu Anda dalam membangun dashboard monitoring real-time dengan Vue.js 3 dan WebSocket API native. Anda akan mempelajari cara membuat koneksi WebSocket persisten, mengelola siklus hidup koneksi dengan koneksi ulang otomatis, membangun composable yang dapat digunakan kembali untuk aliran data real-time, dan memvisualisasikan data langsung dengan Chart.js. Pada akhirnya, Anda akan memiliki dashboard fungsional yang menampilkan metrik server langsung, log peristiwa real-time, dan grafik interaktif yang diperbarui tanpa penyegaran halaman.

## Target Audiens

- Pengembang frontend yang berpengalaman dengan Vue.js 3 dan Composition API.
- Pengembang yang tertarik dengan aplikasi web real-time dan komunikasi WebSocket.
- Tingkat menengah hingga mahir — pemahaman tentang manajemen state reaktif dan desain komponen diasumsikan.

## Prasyarat

- Node.js 18+ dan npm terinstal di mesin pengembangan Anda.
- Pengetahuan dasar Vue.js 3, termasuk Composition API (`ref`, `reactive`, `computed`, `watch`, `onMounted`, `onUnmounted`).
- Keakraban dengan scaffolding proyek Vite.
- Server WebSocket yang berjalan untuk pengujian (skrip server contoh disediakan di bagian Contoh Kode).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membangun dan mengelola koneksi WebSocket dari aplikasi Vue.js menggunakan WebSocket API native.
- Membangun composable `useWebSocket` yang dapat digunakan kembali dengan koneksi ulang otomatis, pemantauan heartbeat, dan penanganan pesan berbasis event.
- Mendesain tata letak dashboard modular dengan kartu metrik real-time, panel log peristiwa, dan grafik langsung.
- Mengintegrasikan Chart.js dengan data reaktif Vue untuk pembaruan grafik real-time yang mulus.
- Mengimplementasikan indikator status koneksi dan penanganan kesalahan yang baik untuk gangguan jaringan.
- Menerapkan teknik optimasi kinerja seperti batch requestAnimationFrame dan virtual scrolling untuk aliran data frekuensi tinggi.

## Konteks dan Motivasi

Dashboard real-time mendukung sistem observabilitas dan pemantauan modern — dari metrik infrastruktur server (CPU, memori, tingkat permintaan) hingga platform perdagangan keuangan, skor olahraga langsung, dan umpan sensor IoT. Polling HTTP tradisional menimbulkan latensi, pemborosan bandwidth, dan beban server yang tidak perlu. WebSocket menyediakan saluran komunikasi persisten dupleks penuh di mana server mengirim pembaruan saat terjadi, memungkinkan pengiriman data di bawah 100ms dan pengalaman real-time yang sesungguhnya.

Vue.js 3 Composition API unggul dalam mengelola data real-time karena referensi reaktif (`ref`, `shallowRef`) secara otomatis menyebarkan payload WebSocket melalui pohon komponen tanpa deteksi perubahan manual. Dikombinasikan dengan Chart.js untuk rendering berbasis canvas, Anda dapat membangun dashboard yang menangani ratusan pembaruan per detik sambil mempertahankan rendering 60 FPS yang mulus.

## Konten Inti

### Setup Proyek dengan Vite

Mulai dengan membuat proyek Vue.js 3 baru menggunakan Vite:

```bash
npm create vite@latest realtime-dashboard -- --template vue
cd realtime-dashboard
npm install vue-router@4 chart.js vue-chartjs
```

Ini membuat proyek Vue 3 minimal. Anda akan membangun dashboard sebagai aplikasi halaman tunggal dengan router untuk pengembangan di masa depan, meskipun fitur real-time terkandung dalam satu tampilan dashboard.

### Dasar-Dasar WebSocket

WebSocket API native menyediakan empat event penting:

| Event | Deskripsi |
|-------|-----------|
| `open` | Terjadi saat koneksi berhasil dibuat. |
| `message` | Terjadi saat data diterima dari server. |
| `close` | Terjadi saat koneksi ditutup (baik normal maupun tidak terduga). |
| `error` | Terjadi saat kesalahan koneksi muncul. |

Koneksi WebSocket dasar terlihat seperti ini:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.addEventListener('open', () => {
  console.log('Terhubung');
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'metrics' }));
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Diterima:', data);
});

ws.addEventListener('close', (event) => {
  console.log('Terputus:', event.code, event.reason);
});

ws.addEventListener('error', (error) => {
  console.error('Kesalahan WebSocket:', error);
});
```

Koneksi WebSocket beroperasi melalui `ws://` (tanpa enkripsi) atau `wss://` (dienkripsi melalui TLS). Dalam produksi, selalu gunakan `wss://` untuk mencegah serangan man-in-the-middle pada aliran data Anda.

### Membangun Composable useWebSocket yang Dapat Digunakan Kembali

Composable mengenkapsulasi manajemen siklus hidup WebSocket sehingga komponen tetap deklaratif. Composable harus menangani:

- Pembuatan dan pemutusan koneksi.
- Koneksi ulang otomatis dengan exponential backoff.
- Heartbeat ping/pong untuk mendeteksi koneksi yang mati.
- Pengiriman pesan yang aman tipe melalui pola event emitter.
- Status koneksi reaktif untuk indikator UI.

Buat `src/composables/useWebSocket.js`:

```javascript
import { ref, shallowRef, onMounted, onUnmounted, markRaw } from 'vue';

export function useWebSocket(url, options = {}) {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    onOpen,
    onClose,
    onError,
  } = options;

  const status = ref('disconnected'); // 'connecting' | 'connected' | 'disconnected'
  const lastMessage = shallowRef(null);
  const reconnectAttempts = ref(0);

  let ws = null;
  let heartbeatTimer = null;
  let reconnectTimer = null;
  let isManualClose = false;
  const handlers = new Map();

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    status.value = 'connecting';
    isManualClose = false;
    ws = markRaw(new WebSocket(url));

    ws.addEventListener('open', () => {
      status.value = 'connected';
      reconnectAttempts.value = 0;
      startHeartbeat();
      onOpen?.();

      // Mendaftar ulang saluran yang terdaftar saat koneksi ulang
      handlers.forEach((handler, channel) => {
        ws.send(JSON.stringify({ type: 'subscribe', channel }));
      });
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        lastMessage.value = data;

        // Kirim ke penangan khusus saluran
        const { channel } = data;
        if (channel && handlers.has(channel)) {
          handlers.get(channel)(data);
        }
      } catch (err) {
        console.warn('Gagal mengurai pesan WebSocket:', err);
      }
    });

    ws.addEventListener('close', (event) => {
      status.value = 'disconnected';
      stopHeartbeat();
      onClose?.(event);

      if (!isManualClose && reconnectAttempts.value < maxReconnectAttempts) {
        scheduleReconnect();
      }
    });

    ws.addEventListener('error', (err) => {
      onError?.(err);
    });
  }

  function scheduleReconnect() {
    const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttempts.value), 30000);
    reconnectAttempts.value++;
    reconnectTimer = setTimeout(connect, delay);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function disconnect() {
    isManualClose = true;
    stopHeartbeat();
    clearTimeout(reconnectTimer);
    if (ws) {
      ws.close(1000, 'Putus oleh klien');
      ws = null;
    }
    status.value = 'disconnected';
  }

  function subscribe(channel, handler) {
    handlers.set(channel, handler);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', channel }));
    }
    return () => handlers.delete(channel);
  }

  function unsubscribe(channel) {
    handlers.delete(channel);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }

  function send(data) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
    handlers.clear();
  });

  return {
    status,
    lastMessage,
    reconnectAttempts,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send,
  };
}
```

Keputusan desain utama dalam composable ini:

- **`shallowRef` untuk `lastMessage`**: Reaktivitas dalam tidak diperlukan untuk objek JSON yang masuk — shallowRef menghindari overhead pembungkusan setiap bidang bersarang dalam Proxy secara rekursif.
- **`markRaw` untuk instance WebSocket**: Vue tidak boleh mencoba membuat objek WebSocket native menjadi reaktif. markRaw mengecualikannya dari pelacakan reaktivitas sepenuhnya.
- **Exponential backoff**: Pengali `1.5` mencegah badai koneksi ulang yang cepat sambil menjaga pemulihan tetap cepat setelah kegagalan sementara.
- **Pendaftaran ulang otomatis**: Saat koneksi ulang, composable mengirim ulang langganan untuk semua saluran yang terdaftar, menjaga kontinuitas setelah gangguan jaringan.

### Membangun Tata Letak Dashboard

Buat `src/views/DashboardView.vue` sebagai wadah dashboard utama:

```vue
<script setup>
import { ref, computed } from 'vue';
import MetricCard from '../components/MetricCard.vue';
import LiveChart from '../components/LiveChart.vue';
import EventLog from '../components/EventLog.vue';
import ConnectionStatus from '../components/ConnectionStatus.vue';
import { useWebSocket } from '../composables/useWebSocket.js';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

const {
  status,
  subscribe,
  disconnect,
  connect,
} = useWebSocket(WS_URL, {
  reconnectInterval: 3000,
  maxReconnectAttempts: 20,
  onOpen: () => console.log('Dashboard terhubung'),
});

// State reaktif untuk data dashboard
const metrics = ref({
  cpu: 0,
  memory: 0,
  requestsPerSecond: 0,
  activeConnections: 0,
});

const chartData = ref([]);
const eventLog = ref([]);

// Berlangganan ke saluran real-time
subscribe('metrics', (data) => {
  metrics.value = {
    cpu: data.cpu,
    memory: data.memory,
    requestsPerSecond: data.rps,
    activeConnections: data.connections,
  };
});

subscribe('timeseries', (data) => {
  chartData.value = [...chartData.value.slice(-59), { time: data.time, value: data.value }];
});

subscribe('events', (data) => {
  eventLog.value = [{ id: Date.now(), ...data, timestamp: new Date() }, ...eventLog.value].slice(0, 200);
});

const systemHealth = computed(() => {
  const { cpu, memory } = metrics.value;
  if (cpu < 50 && memory < 60) return 'healthy';
  if (cpu < 80 && memory < 85) return 'warning';
  return 'critical';
});
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>Dashboard Monitor Sistem</h1>
      <ConnectionStatus :status="status" @reconnect="connect" @disconnect="disconnect" />
    </header>

    <section class="metric-grid">
      <MetricCard title="Penggunaan CPU" :value="metrics.cpu" unit="%" :variant="metrics.cpu > 80 ? 'danger' : metrics.cpu > 60 ? 'warning' : 'normal'" />
      <MetricCard title="Penggunaan Memori" :value="metrics.memory" unit="%" :variant="metrics.memory > 85 ? 'danger' : metrics.memory > 70 ? 'warning' : 'normal'" />
      <MetricCard title="Permintaan/dtk" :value="metrics.requestsPerSecond" unit="req/s" variant="info" />
      <MetricCard title="Koneksi Aktif" :value="metrics.activeConnections" unit="conn" variant="info" />
    </section>

    <section class="chart-section">
      <LiveChart :data="chartData" label="Waktu Respons (ms)" />
    </section>

    <section class="events-section">
      <h2>Peristiwa Terbaru</h2>
      <EventLog :events="eventLog" />
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.chart-section {
  margin-bottom: 2rem;
}

.events-section h2 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}
</style>
```

Dashboard berlangganan ke tiga saluran berbeda — `metrics`, `timeseries`, dan `events` — menunjukkan bagaimana satu koneksi WebSocket dapat melayani beberapa aliran data melalui perutean pesan berbasis saluran.

### Komponen Kartu Metrik

Buat `src/components/MetricCard.vue`:

```vue
<script setup>
defineProps({
  title: String,
  value: [Number, String],
  unit: String,
  variant: { type: String, default: 'normal' },
});
</script>

<template>
  <div class="metric-card" :class="`metric-card--${variant}`">
    <h3 class="metric-card__title">{{ title }}</h3>
    <div class="metric-card__value">
      <span class="metric-card__number">{{ typeof value === 'number' ? value.toFixed(1) : value }}</span>
      <span class="metric-card__unit">{{ unit }}</span>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #313244;
  transition: border-color 0.3s;
}

.metric-card--normal { border-color: #313244; }
.metric-card--warning { border-color: #f9e2af; }
.metric-card--danger { border-color: #f38ba8; }
.metric-card--info { border-color: #89b4fa; }

.metric-card__title {
  font-size: 0.85rem;
  color: #a6adc8;
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-card__value {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.metric-card__number {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.metric-card__unit {
  font-size: 0.9rem;
  color: #6c7086;
}
</style>
```

Varian font `tabular-nums` penting untuk dashboard real-time — ini membuat setiap digit memiliki lebar yang sama, mencegah tampilan angka melompat secara visual saat nilai berubah.

### Grafik Real-Time dengan vue-chartjs

Buat `src/components/LiveChart.vue`:

```vue
<script setup>
import { computed, watch, ref } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const props = defineProps({
  data: { type: Array, default: () => [] },
  label: { type: String, default: 'Nilai' },
});

const chartRef = ref(null);

const chartData = computed(() => ({
  labels: props.data.map((d) => d.time),
  datasets: [
    {
      label: props.label,
      data: props.data.map((d) => d.value),
      borderColor: '#89b4fa',
      backgroundColor: 'rgba(137, 180, 250, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 200 },
  scales: {
    x: { display: true, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { display: true, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
  },
  plugins: {
    tooltip: { enabled: true, mode: 'index', intersect: false },
    legend: { display: false },
  },
  interaction: { intersect: false, mode: 'nearest' },
};

watch(() => props.data, () => {
  // Chart.js menangani pembaruan reaktif secara internal saat menggunakan data computed
}, { flush: 'post' });
</script>

<template>
  <div class="live-chart">
    <Line ref="chartRef" :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.live-chart {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #313244;
  height: 300px;
}
</style>
```

Mengatur `pointRadius: 0` menghilangkan titik data, menciptakan garis halus yang cocok untuk data frekuensi tinggi. Durasi animasi 200ms memberikan umpan balik visual tanpa lag.

### Log Peristiwa dengan Virtual Scrolling

Buat `src/components/EventLog.vue`:

```vue
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  events: { type: Array, default: () => [] },
});

const containerRef = ref(null);
let autoScroll = true;

function onScroll() {
  const el = containerRef.value;
  if (!el) return;
  const threshold = 50;
  autoScroll = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
}

watchEffect(() => {
  if (autoScroll && containerRef.value) {
    nextTick(() => {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    });
  }
});
</script>

<script>
import { watchEffect, nextTick } from 'vue';
export default {};
</script>

<template>
  <div ref="containerRef" class="event-log" @scroll="onScroll">
    <div v-for="event in events" :key="event.id" class="event-item" :class="`event-item--${event.level || 'info'}`">
      <span class="event-time">{{ new Date(event.timestamp).toLocaleTimeString() }}</span>
      <span class="event-level">{{ (event.level || 'info').toUpperCase() }}</span>
      <span class="event-message">{{ event.message }}</span>
    </div>
    <div v-if="events.length === 0" class="event-empty">Menunggu peristiwa...</div>
  </div>
</template>

<style scoped>
.event-log {
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 12px;
  padding: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.8rem;
}

.event-item {
  padding: 0.35rem 0.75rem;
  display: flex;
  gap: 0.75rem;
  border-radius: 4px;
}

.event-item:nth-child(odd) {
  background: rgba(255, 255, 255, 0.02);
}

.event-time {
  color: #6c7086;
  flex-shrink: 0;
}

.event-level {
  flex-shrink: 0;
  font-weight: 600;
  min-width: 4.5ch;
}

.event-item--info .event-level { color: #89b4fa; }
.event-item--warn .event-level { color: #f9e2af; }
.event-item--error .event-level { color: #f38ba8; }

.event-message {
  color: #cdd6f4;
  word-break: break-word;
}

.event-empty {
  padding: 2rem;
  text-align: center;
  color: #6c7086;
}
</style>
```

Perilaku gulir otomatis secara cerdas mengikuti peristiwa baru tetapi berhenti saat pengguna menggulir ke atas untuk memeriksa entri historis. Ambang batas `threshold` sebesar 50px mencegah kegagalan saat pengguna berada di dekat bagian bawah.

### Indikator Status Koneksi

Buat `src/components/ConnectionStatus.vue`:

```vue
<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, default: 'disconnected' },
});

const emit = defineEmits(['reconnect', 'disconnect']);

const label = computed(() => {
  switch (props.status) {
    case 'connected': return 'Terhubung';
    case 'connecting': return 'Menghubungkan...';
    default: return 'Terputus';
  }
});

const isConnected = computed(() => props.status === 'connected');
const isConnecting = computed(() => props.status === 'connecting');
</script>

<template>
  <div class="connection-status" :class="`connection-status--${status}`">
    <span class="connection-dot" />
    <span class="connection-label">{{ label }}</span>
    <button
      v-if="status === 'disconnected'"
      class="connection-btn"
      @click="emit('reconnect')"
    >
      Hubungkan Ulang
    </button>
    <button
      v-if="status === 'connected'"
      class="connection-btn connection-btn--outline"
      @click="emit('disconnect')"
    >
      Putuskan
    </button>
  </div>
</template>

<style scoped>
.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.connection-status--connected .connection-dot { background: #a6e3a1; }
.connection-status--connecting .connection-dot { background: #f9e2af; animation: pulse 1s infinite; }
.connection-status--disconnected .connection-dot { background: #f38ba8; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.connection-label {
  font-size: 0.85rem;
  color: #a6adc8;
}

.connection-btn {
  background: #89b4fa;
  color: #1e1e2e;
  border: none;
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  font-weight: 600;
}

.connection-btn--outline {
  background: transparent;
  border: 1px solid #f38ba8;
  color: #f38ba8;
}
</style>
```

### Server WebSocket Contoh untuk Pengujian

Buat `server.js` di root proyek untuk mensimulasikan sumber data:

```javascript
import { createServer } from 'http';

const clients = new Set();

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server metrik WebSocket berjalan\n');
});

server.on('upgrade', (req, socket) => {
  // Menerima upgrade WebSocket
  socket.setKeepAlive(true, 60000);

  // Melakukan handshake pembukaan
  const key = req.headers['sec-websocket-key'];
  const accept = require('crypto')
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  clients.add(socket);
  console.log(`Klien terhubung. Total: ${clients.size}`);

  socket.on('close', () => {
    clients.delete(socket);
    console.log(`Klien terputus. Total: ${clients.size}`);
  });

  socket.on('error', (err) => {
    console.error('Kesalahan soket:', err.message);
    clients.delete(socket);
  });
});

// Siarkan metrik sintetis setiap detik
setInterval(() => {
  const payload = JSON.stringify({
    metrics: {
      cpu: (Math.random() * 100).toFixed(1),
      memory: (30 + Math.random() * 70).toFixed(1),
      rps: Math.floor(100 + Math.random() * 900),
      connections: clients.size,
    },
    timeseries: {
      time: new Date().toLocaleTimeString(),
      value: (50 + Math.random() * 100).toFixed(0),
    },
    events: {
      level: ['info', 'warn', 'error'][Math.floor(Math.random() * 10) > 7 ? Math.floor(Math.random() * 3) : 0],
      message: generateRandomEvent(),
    },
  });

  const frame = Buffer.from(payload);
  const length = frame.length;

  // Bangun frame WebSocket (frame teks, tidak termask untuk server-ke-klien)
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  const message = Buffer.concat([header, frame]);

  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}, 1000);

function generateRandomEvent() {
  const events = [
    'Permintaan berhasil diproses',
    'Cache miss untuk kunci: user_session',
    'Kueri database selesai dalam 45ms',
    'Batas rate mendekati untuk IP 192.168.1.100',
    'Perpanjangan sertifikat TLS dijadwalkan',
    'Pekerjaan latar selesai: email_notification',
    'Lonjakan penggunaan memori terdeteksi di worker-3',
    'Pemeriksaan kesehatan berhasil untuk layanan upstream',
    'Pool koneksi kembali ke baseline',
    'Siklus garbage collection selesai (150ms)',
  ];
  return events[Math.floor(Math.random() * events.length)];
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server metrik mendengarkan di port ${PORT}`);
});
```

Jalankan server dengan `node server.js` dan pastikan `VITE_WS_URL` dashboard mengarah ke port yang sama. Server menghasilkan data CPU, memori, tingkat permintaan, dan peristiwa sintetis setiap detik.

## Contoh Kode

Struktur proyek lengkap setelah mengikuti tutorial ini:

```text
realtime-dashboard/
├── server.js                         # Server metrik WebSocket contoh
├── src/
│   ├── App.vue                       # Komponen root dengan router-view
│   ├── main.js                       # Titik masuk aplikasi
│   ├── router/
│   │   └── index.js                  # Konfigurasi Vue Router
│   ├── composables/
│   │   └── useWebSocket.js           # Composable siklus hidup WebSocket
│   ├── views/
│   │   └── DashboardView.vue         # Tata letak dashboard utama
│   └── components/
│       ├── MetricCard.vue            # Kartu tampilan metrik tunggal
│       ├── LiveChart.vue             # Grafik garis Chart.js real-time
│       ├── EventLog.vue              # Umpan peristiwa yang dapat digulir
│       └── ConnectionStatus.vue      # Indikator koneksi dan kontrol
```

Setiap komponen memiliki satu tanggung jawab, membuat dashboard mudah diperluas — menambahkan jenis metrik baru, varian grafik, atau sumber data hanya memerlukan perubahan kode minimal.

## Insight Penting

- **Gunakan WebSocket API native secara langsung**: Pustaka wrapper menambah bobot bundel dan lapisan abstraksi. API native didukung dengan baik di semua browser modern dan memberikan kontrol penuh atas siklus hidup koneksi, frame biner, dan negosiasi subprotokol.
- **Heartbeat ping mencegah pemutusan diam-diam**: Proksi, load balancer, dan jaringan seluler secara diam-diam memutus koneksi TCP yang tidak aktif. Heartbeat 30 detik memastikan koneksi basi terdeteksi dalam satu interval.
- **Exponential backoff dengan jitter mencegah thundering herd**: Saat server restart, semua klien terhubung ulang secara bersamaan. Menambahkan `Math.random() * 1000` jitter ke perhitungan backoff menyebarkan koneksi ulang dalam jendela waktu, mencegah server kewalahan.
- **shallowRef dibandingkan ref untuk data masuk**: Payload JSON yang masuk harus disimpan dengan `shallowRef` untuk menghindari overhead reaktivitas dalam. Hanya perubahan referensi tingkat atas yang perlu memicu pembaruan — bidang bersarang dibaca, tidak dimutasi.
- **Virtual scrolling untuk log peristiwa volume tinggi**: Merender ribuan node DOM menurunkan frame rate. Batasi log peristiwa pada 200 entri (seperti yang ditunjukkan) atau integrasikan virtual scroller seperti `vue-virtual-scroller` untuk riwayat tak terbatas.
- **Penyesuaian animasi Chart.js sangat penting**: Durasi animasi default 800ms membuat grafik real-time terasa lamban. Kurangi `animation.duration` menjadi 200ms dan atur `pointRadius: 0` untuk menghilangkan pekerjaan rendering yang tidak perlu selama pembaruan frekuensi tinggi.

## Langkah Berikutnya

- Jelajahi pustaka WebSocket sisi server seperti `ws` (Node.js) atau `gorilla/websocket` (Go) untuk backend tingkat produksi yang menangani backpressure, autentikasi, dan penskalaan horizontal dengan Redis Pub/Sub.
- Tambahkan panel dashboard yang dapat dikonfigurasi pengguna menggunakan pustaka tata letak seret dan lepas seperti `vue-grid-layout`.
- Implementasikan persistensi data dengan database time-series (InfluxDB, TimescaleDB) sehingga dashboard dapat menampilkan konteks historis di samping data langsung.
- Pelajari silabus Vue.js untuk jalur pembelajaran terstruktur yang mencakup pola Vue tingkat lanjut.

## Kesimpulan

Anda telah berhasil membangun dashboard monitoring real-time yang fungsional dengan Vue.js 3, WebSocket API native, dan Chart.js. Composable `useWebSocket` menyediakan manajemen koneksi yang dapat digunakan kembali dengan koneksi ulang otomatis, pemantauan heartbeat, dan perutean pesan berbasis saluran. Arsitektur komponen modular — kartu metrik, grafik langsung, log peristiwa, dan indikator status koneksi — menunjukkan cara menyusun aplikasi real-time yang tetap mudah dipelihara seiring pertumbuhan fitur. Fondasi ini berlaku langsung untuk dashboard monitoring produksi, UI perdagangan langsung, alat pengeditan kolaboratif, dan aplikasi apa pun yang memerlukan pengiriman data sub-detik.
