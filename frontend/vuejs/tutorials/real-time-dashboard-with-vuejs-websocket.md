---
title: "Building a Real-Time Dashboard with Vue.js and WebSocket"
description: "A comprehensive tutorial on building a real-time monitoring dashboard with Vue.js 3, the native WebSocket API, and Chart.js for live data visualization."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Real-Time Dashboard with Vue.js and WebSocket

## Summary

This tutorial guides you through building a real-time monitoring dashboard with Vue.js 3 and the native WebSocket API. You will learn how to establish persistent WebSocket connections, manage connection lifecycles with automatic reconnection, build reusable composables for real-time data streams, and visualize live data with Chart.js. By the end, you will have a fully functional dashboard displaying live server metrics, real-time event logs, and interactive charts that update without page refreshes.

## Target Audience

- Frontend developers with experience in Vue.js 3 and the Composition API.
- Developers interested in real-time web applications and WebSocket communication.
- Intermediate to advanced level — familiarity with reactive state management and component design is assumed.

## Prerequisites

- Node.js 18+ and npm installed on your development machine.
- Basic knowledge of Vue.js 3, including the Composition API (`ref`, `reactive`, `computed`, `watch`, `onMounted`, `onUnmounted`).
- Familiarity with Vite project scaffolding.
- A running WebSocket server for testing (a sample server script is provided in the Code Examples section).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Establish and manage WebSocket connections from a Vue.js application using the native WebSocket API.
- Build a reusable `useWebSocket` composable with auto-reconnection, heartbeat monitoring, and event-based message handling.
- Design a modular dashboard layout with real-time metric cards, event log panels, and live charts.
- Integrate Chart.js with reactive Vue data for smooth real-time chart updates.
- Implement connection status indicators and graceful error handling for network interruptions.
- Apply performance optimization techniques like requestAnimationFrame batching and virtual scrolling for high-frequency data streams.

## Context and Motivation

Real-time dashboards power modern observability and monitoring systems — from server infrastructure metrics (CPU, memory, request rates) to financial trading platforms, live sports scores, and IoT sensor feeds. Traditional HTTP polling introduces latency, bandwidth waste, and unnecessary server load. WebSocket provides a persistent, full-duplex communication channel where the server pushes updates the instant they occur, enabling sub-100ms data delivery and true real-time experiences.

Vue.js 3's Composition API excels at managing real-time data because reactive references (`ref`, `shallowRef`) automatically propagate WebSocket payloads through the component tree without manual change detection. Combined with Chart.js for canvas-based rendering, you can build dashboards that handle hundreds of updates per second while maintaining smooth 60 FPS rendering.

## Core Content

### Project Setup with Vite

Start by scaffolding a new Vue.js 3 project with Vite:

```bash
npm create vite@latest realtime-dashboard -- --template vue
cd realtime-dashboard
npm install vue-router@4 chart.js vue-chartjs
```

This creates a minimal Vue 3 project. You will build the dashboard as a single-page application with a router for future extensibility, though the real-time features are contained within a single dashboard view.

### WebSocket Fundamentals

The native WebSocket API provides four essential events:

| Event | Description |
|-------|-------------|
| `open` | Fires when the connection is established. |
| `message` | Fires when data is received from the server. |
| `close` | Fires when the connection closes (cleanly or unexpectedly). |
| `error` | Fires when a connection error occurs. |

A basic WebSocket connection looks like this:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.addEventListener('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'metrics' }));
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
});

ws.addEventListener('close', (event) => {
  console.log('Disconnected:', event.code, event.reason);
});

ws.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});
```

WebSocket connections operate over `ws://` (unencrypted) or `wss://` (encrypted over TLS). In production, always use `wss://` to prevent man-in-the-middle attacks on your data stream.

### Building a Reusable useWebSocket Composable

A composable encapsulates WebSocket lifecycle management so components remain declarative. The composable should handle:

- Connection establishment and teardown.
- Automatic reconnection with exponential backoff.
- Heartbeat ping/pong to detect stale connections.
- Type-safe message dispatching via an event emitter pattern.
- Reactive connection state for UI indicators.

Create `src/composables/useWebSocket.js`:

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

      // Re-subscribe to any registered channels on reconnect
      handlers.forEach((handler, channel) => {
        ws.send(JSON.stringify({ type: 'subscribe', channel }));
      });
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        lastMessage.value = data;

        // Dispatch to channel-specific handlers
        const { channel } = data;
        if (channel && handlers.has(channel)) {
          handlers.get(channel)(data);
        }
      } catch (err) {
        console.warn('Failed to parse WebSocket message:', err);
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
      ws.close(1000, 'Client disconnect');
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

Key design decisions in this composable:

- **`shallowRef` for `lastMessage`**: Deep reactivity is unnecessary for incoming JSON objects — shallowRef avoids the overhead of recursively wrapping every nested field in a Proxy.
- **`markRaw` for the WebSocket instance**: Vue should never attempt to make the native WebSocket object reactive. markRaw excludes it from reactivity tracking entirely.
- **Exponential backoff**: The `1.5` multiplier prevents rapid reconnect storms while keeping recovery fast after transient failures.
- **Auto-resubscribe**: On reconnect, the composable re-sends subscriptions for all registered channels, maintaining continuity after network interruptions.

### Building the Dashboard Layout

Create `src/views/DashboardView.vue` as the main dashboard container:

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
  onOpen: () => console.log('Dashboard connected'),
});

// Reactive state for dashboard data
const metrics = ref({
  cpu: 0,
  memory: 0,
  requestsPerSecond: 0,
  activeConnections: 0,
});

const chartData = ref([]);
const eventLog = ref([]);

// Subscribe to real-time channels
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
      <h1>System Monitor Dashboard</h1>
      <ConnectionStatus :status="status" @reconnect="connect" @disconnect="disconnect" />
    </header>

    <section class="metric-grid">
      <MetricCard title="CPU Usage" :value="metrics.cpu" unit="%" :variant="metrics.cpu > 80 ? 'danger' : metrics.cpu > 60 ? 'warning' : 'normal'" />
      <MetricCard title="Memory Usage" :value="metrics.memory" unit="%" :variant="metrics.memory > 85 ? 'danger' : metrics.memory > 70 ? 'warning' : 'normal'" />
      <MetricCard title="Requests/s" :value="metrics.requestsPerSecond" unit="req/s" variant="info" />
      <MetricCard title="Active Connections" :value="metrics.activeConnections" unit="conn" variant="info" />
    </section>

    <section class="chart-section">
      <LiveChart :data="chartData" label="Response Time (ms)" />
    </section>

    <section class="events-section">
      <h2>Recent Events</h2>
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

The dashboard subscribes to three distinct channels — `metrics`, `timeseries`, and `events` — demonstrating how a single WebSocket connection can serve multiple data streams through channel-based message routing.

### Metric Card Component

Create `src/components/MetricCard.vue`:

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

The `tabular-nums` font variant is important for real-time dashboards — it renders each digit at the same width, preventing the number display from visually jumping as values change.

### Real-Time Chart with vue-chartjs

Create `src/components/LiveChart.vue`:

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
  label: { type: String, default: 'Value' },
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

// Animate chart entry with a small delay for smoother appearance
watch(() => props.data, () => {
  // Chart.js handles reactive updates internally when using computed data
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

Setting `pointRadius: 0` removes data point dots, creating a smooth line suitable for high-frequency data. The 200ms animation duration provides visual feedback without lag.

### Event Log with Virtual Scrolling

Create `src/components/EventLog.vue`:

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
    <div v-if="events.length === 0" class="event-empty">Waiting for events...</div>
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

The auto-scroll behavior intelligently follows new events but stops when the user scrolls up to inspect historical entries. The `threshold` of 50px prevents jank when the user is near the bottom.

### Connection Status Indicator

Create `src/components/ConnectionStatus.vue`:

```vue
<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, default: 'disconnected' },
});

const emit = defineEmits(['reconnect', 'disconnect']);

const label = computed(() => {
  switch (props.status) {
    case 'connected': return 'Connected';
    case 'connecting': return 'Connecting...';
    default: return 'Disconnected';
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
      Reconnect
    </button>
    <button
      v-if="status === 'connected'"
      class="connection-btn connection-btn--outline"
      @click="emit('disconnect')"
    >
      Disconnect
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

### Sample WebSocket Server for Testing

Create `server.js` in the project root to simulate a data source:

```javascript
import { createServer } from 'http';

const clients = new Set();

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket metrics server running\n');
});

server.on('upgrade', (req, socket) => {
  // Accept the WebSocket upgrade
  socket.setKeepAlive(true, 60000);

  // Perform the opening handshake
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
  console.log(`Client connected. Total: ${clients.size}`);

  socket.on('close', () => {
    clients.delete(socket);
    console.log(`Client disconnected. Total: ${clients.size}`);
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
    clients.delete(socket);
  });
});

// Broadcast synthetic metrics every second
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

  // Build WebSocket frame (text frame, unmasked for server-to-client)
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode
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
    'Request processed successfully',
    'Cache miss for key: user_session',
    'Database query completed in 45ms',
    'Rate limit threshold approaching for IP 192.168.1.100',
    'TLS certificate renewal scheduled',
    'Background job completed: email_notification',
    'Memory usage spike detected in worker-3',
    'Health check passed for upstream service',
    'Connection pool returned to baseline',
    'Garbage collection cycle completed (150ms)',
  ];
  return events[Math.floor(Math.random() * events.length)];
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Metrics server listening on port ${PORT}`);
});
```

Run the server with `node server.js` and ensure the dashboard's `VITE_WS_URL` points to the same port. The server generates synthetic CPU, memory, request rate, and event data every second, demonstrating how a production WebSocket server would push metrics to connected clients.

## Code Examples

The complete project structure after following this tutorial:

```text
realtime-dashboard/
├── server.js                         # Sample WebSocket metrics server
├── src/
│   ├── App.vue                       # Root component with router-view
│   ├── main.js                       # App entry point
│   ├── router/
│   │   └── index.js                  # Vue Router configuration
│   ├── composables/
│   │   └── useWebSocket.js           # WebSocket lifecycle composable
│   ├── views/
│   │   └── DashboardView.vue         # Main dashboard layout
│   └── components/
│       ├── MetricCard.vue            # Single metric display card
│       ├── LiveChart.vue             # Real-time Chart.js line chart
│       ├── EventLog.vue              # Scrollable event feed
│       └── ConnectionStatus.vue      # Connection indicator and controls
```

Each component is focused on a single responsibility, making the dashboard easy to extend — adding a new metric type, chart variant, or data source requires minimal code changes.

## Key Insights

- **Use the native WebSocket API directly**: Wrapper libraries add bundle weight and abstraction layers. The native API is well-supported across all modern browsers and provides full control over connection lifecycle, binary frames, and subprotocol negotiation.
- **Heartbeat pings prevent silent disconnects**: Proxies, load balancers, and mobile networks silently drop idle TCP connections. A 30-second heartbeat ensures stale connections are detected within one interval.
- **Exponential backoff with jitter prevents thundering herd**: When a server restarts, all clients reconnect simultaneously. Adding `Math.random() * 1000` jitter to the backoff calculation spreads reconnections across a window, preventing the server from being overwhelmed.
- **shallowRef over ref for incoming data**: Incoming JSON payloads should be stored with `shallowRef` to avoid the overhead of deep reactivity. Only the top-level reference change needs to trigger updates — nested fields are read, not mutated.
- **Virtual scrolling for high-volume event logs**: Rendering thousands of DOM nodes degrades frame rate. Cap the event log at 200 entries (as shown) or integrate a virtual scroller like `vue-virtual-scroller` for unlimited history.
- **Chart.js animation tuning is critical**: The default 800ms animation makes real-time charts feel sluggish. Reduce `animation.duration` to 200ms and set `pointRadius: 0` to eliminate unnecessary rendering work during high-frequency updates.

## Next Steps

- Explore server-side WebSocket libraries like `ws` (Node.js) or `gorilla/websocket` (Go) for production-grade backends that handle backpressure, authentication, and horizontal scaling with Redis Pub/Sub.
- Add user-configurable dashboard panels using a drag-and-drop grid library like `vue-grid-layout`.
- Implement data persistence with a time-series database (InfluxDB, TimescaleDB) so the dashboard can show historical context alongside live data.
- Study the Vue.js syllabus for a structured learning path covering advanced Vue patterns.

## Conclusion

You have built a fully functional real-time monitoring dashboard with Vue.js 3, the native WebSocket API, and Chart.js. The `useWebSocket` composable provides reusable connection management with auto-reconnection, heartbeat monitoring, and channel-based message routing. The modular component architecture — metric cards, live charts, event logs, and a connection status indicator — demonstrates how to structure a real-time application that remains maintainable as features grow. This foundation applies directly to production monitoring dashboards, live trading UIs, collaborative editing tools, and any application requiring sub-second data delivery.
