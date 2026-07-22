---
title: "Cheat Sheet Animasi dan Transisi Vue.js"
description: "Panduan referensi cepat untuk animasi, transisi, dan efek gerakan Vue.js 3 menggunakan sistem transisi bawaan, animasi CSS, dan library pihak ketiga."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Animasi dan Transisi Vue.js

## Tabel Referensi Cepat

| Teknik | Directive / Komponen | Kasus Penggunaan | Pemicu |
|--------|---------------------|------------------|--------|
| Transisi elemen/komponen tunggal | `<Transition>` | Fade, slide, scale untuk satu elemen | `v-if`, `v-show`, komponen dinamis |
| Transisi daftar (masuk/keluar/pindah) | `<TransitionGroup>` | Animasi daftar bertahap, pengacakan | `v-for` dengan key |
| Kelas transisi CSS | `.v-enter-active`, `.v-leave-active` | Timing/easing kustom | Diterapkan otomatis oleh Transition |
| Kelas animasi CSS | `.v-enter-from`, `.v-leave-to` | Animasi keyframe | Diterapkan otomatis oleh Transition |
| Hook JavaScript | `@before-enter`, `@enter`, `@after-enter` | Integrasi GSAP, Anime.js | Logika kustom di hook |
| Animasi berbasis state | `computed` + `style` binding | Penghitung animasi, progress bar | Perubahan state reaktif |
| Animasi FLIP | `TransitionGroup` + `move-class` | Pengurutan ulang daftar yang halus | Sortir/filter daftar |
| Transisi dinamis | `:name="transitionName"` | Transisi berbeda per rute/state | Binding kondisional |

## Perintah Umum

### Penamaan Kelas Transisi

```text
v-enter-from    → v-enter-to       (mulai masuk → akhir masuk)
v-enter-active                      (durasi/easing masuk)
v-leave-from    → v-leave-to       (mulai keluar → akhir keluar)
v-leave-active                      (durasi/easing keluar)
```

Dengan transisi bernama, awalan `v-` berubah menjadi nama transisi:

```text
my-transition-enter-from
my-transition-enter-active
my-transition-enter-to
my-transition-leave-from
my-transition-leave-active
my-transition-leave-to
```

### Properti Transisi CSS

```css
/* Timing transisi */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

/* State awal/akhir */
.v-enter-from,
.v-leave-to {
  opacity: 0;
}
```

### Properti Animasi CSS

```css
/* Referensi keyframe */
.v-enter-active {
  animation: bounce-in 0.5s;
}
.v-leave-active {
  animation: bounce-in 0.5s reverse;
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
```

### Mode Transisi

```text
out-in  → Keluarkan elemen saat ini dulu, lalu masuk elemen baru
in-out  → Masukkan elemen baru dulu, lalu keluarkan elemen saat ini (jarang digunakan)
```

## Potongan Kode

### Transisi Fade Dasar

```vue
<script setup>
import { ref } from 'vue'

const show = ref(true)
</script>

<template>
  <button @click="show = !show">Toggle</button>

  <Transition name="fade">
    <p v-if="show">Halo Vue</p>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### Transisi Slide dan Scale

```vue
<script setup>
import { ref } from 'vue'

const isVisible = ref(false)
</script>

<template>
  <button @click="isVisible = !isVisible">Toggle Panel</button>

  <Transition name="slide-scale">
    <div v-if="isVisible" class="panel">
      <p>Konten panel geser</p>
    </div>
  </Transition>
</template>

<style scoped>
.slide-scale-enter-active {
  transition: all 0.3s ease-out;
}

.slide-scale-leave-active {
  transition: all 0.2s ease-in;
}

.slide-scale-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.slide-scale-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

.panel {
  background: #f0f0f0;
  padding: 20px;
  border-radius: 8px;
  margin-top: 10px;
}
</style>
```

### Animasi Daftar dengan TransitionGroup

```vue
<script setup>
import { ref } from 'vue'

const items = ref([1, 2, 3, 4, 5])
let nextId = 6

function addItem() {
  items.value.push(nextId++)
}

function removeItem(index) {
  items.value.splice(index, 1)
}

function shuffleItems() {
  items.value = items.value.sort(() => Math.random() - 0.5)
}
</script>

<template>
  <button @click="addItem">Tambah</button>
  <button @click="shuffleItems">Acak</button>

  <TransitionGroup name="list" tag="ul" class="list">
    <li v-for="(item, index) in items" :key="item" class="list-item">
      {{ item }}
      <button @click="removeItem(index)">✕</button>
    </li>
  </TransitionGroup>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Animasi FLIP untuk pengacakan — reposisi yang halus */
.list-move {
  transition: transform 0.4s ease;
}

.list-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  margin: 4px 0;
  background: #e8f4f8;
  border-radius: 4px;
}
</style>
```

### Transisi Rute dengan Vue Router

```vue
<script setup>
import { ref } from 'vue'

const transitionName = ref('slide-left')
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <Transition :name="transitionName" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </router-view>
</template>

<style>
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
```

### Hook JavaScript Kustom dengan GSAP

```vue
<script setup>
import { ref } from 'vue'
import gsap from 'gsap'

const show = ref(true)

function onBeforeEnter(el) {
  gsap.set(el, { scale: 0, opacity: 0 })
}

function onEnter(el, done) {
  gsap.to(el, {
    scale: 1,
    opacity: 1,
    duration: 0.5,
    ease: 'back.out(1.7)',
    onComplete: done
  })
}

function onLeave(el, done) {
  gsap.to(el, {
    scale: 0,
    opacity: 0,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: done
  })
}
</script>

<template>
  <button @click="show = !show">Animate</button>

  <Transition
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @leave="onLeave"
    :css="false"
  >
    <div v-if="show" class="gsap-box">Animasi GSAP</div>
  </Transition>
</template>

<style scoped>
.gsap-box {
  width: 200px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 8px;
  text-align: center;
}
</style>
```

### Penghitung Animasi dengan requestAnimationFrame

```vue
<script setup>
import { ref, watch } from 'vue'

const count = ref(0)
const target = ref(1000)
const displayValue = ref(0)

function animateCounter(from, to, duration = 1000) {
  const start = performance.now()
  const difference = to - from

  function update(currentTime) {
    const elapsed = currentTime - start
    const progress = Math.min(elapsed / duration, 1)
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    displayValue.value = Math.round(from + difference * eased)

    if (progress < 1) {
      requestAnimationFrame(update)
    }
  }

  requestAnimationFrame(update)
}

watch(target, (newVal, oldVal) => {
  animateCounter(oldVal || 0, newVal)
})
</script>

<template>
  <h1>{{ displayValue.toLocaleString() }}</h1>
  <input type="range" v-model.number="target" min="0" max="10000" />
</template>
```

### Transisi Masuk dengan Jeda Bertahap

```vue
<script setup>
import { ref } from 'vue'

const items = ref([
  { id: 1, text: 'Item A' },
  { id: 2, text: 'Item B' },
  { id: 3, text: 'Item C' },
  { id: 4, text: 'Item D' }
])

const show = ref(true)

function getDelay(index) {
  return { transitionDelay: `${index * 100}ms` }
}
</script>

<template>
  <button @click="show = !show">Toggle Daftar</button>

  <TransitionGroup name="stagger" tag="ul" v-if="show">
    <li
      v-for="(item, index) in items"
      :key="item.id"
      :style="getDelay(index)"
      class="stagger-item"
    >
      {{ item.text }}
    </li>
  </TransitionGroup>
</template>

<style scoped>
.stagger-enter-active {
  transition: all 0.4s ease;
}

.stagger-leave-active {
  transition: all 0.3s ease;
  position: absolute;
}

.stagger-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.stagger-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Kontainer harus relative untuk positioning absolute saat keluar */
ul { position: relative; }

.stagger-item {
  padding: 10px;
  margin: 4px 0;
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
```

### Modal dengan Transisi

```vue
<script setup>
import { ref } from 'vue'

const isOpen = ref(false)

function openModal() { isOpen.value = true }
function closeModal() { isOpen.value = false }
</script>

<template>
  <button @click="openModal">Buka Modal</button>

  <Transition name="modal">
    <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>Judul Modal</h3>
        <p>Isi badan modal di sini.</p>
        <button @click="closeModal">Tutup</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content {
  transform: scale(0.9) translateY(20px);
}

.modal-leave-to .modal-content {
  transform: scale(0.9) translateY(20px);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  min-width: 400px;
  transition: all 0.3s ease;
}
</style>
```
