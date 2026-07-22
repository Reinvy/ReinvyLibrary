---
title: "Vue.js Animations and Transitions Cheatsheet"
description: "A quick reference guide for Vue.js 3 animations, transitions, and motion effects using the built-in transition system, CSS animations, and third-party libraries."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Vue.js Animations and Transitions Cheatsheet

## Quick Reference Table

| Technique | Directive / Component | Use Case | Trigger |
|-----------|----------------------|----------|---------|
| Single element/component enter/leave | `<Transition>` | Fade, slide, scale for one element | `v-if`, `v-show`, dynamic component |
| List enter/leave/move | `<TransitionGroup>` | Staggered list animations, shuffle | `v-for` with key |
| CSS transition classes | `.v-enter-active`, `.v-leave-active` | Custom timing/easing | Auto-applied by Transition |
| CSS animation classes | `.v-enter-from`, `.v-leave-to` | Keyframe animations | Auto-applied by Transition |
| JavaScript hooks | `@before-enter`, `@enter`, `@after-enter` | GSAP, Anime.js integration | Custom logic in hooks |
| State-driven animation | `computed` + `style` binding | Animated counters, progress bars | Reactive state changes |
| FLIP animation | `TransitionGroup` + `move-class` | Smooth list reordering | List sort/filter |
| Dynamic transition | `:name="transitionName"` | Different transitions per route/state | Conditional binding |

## Common Commands

### Transition Class Naming

```text
v-enter-from    → v-enter-to       (enter start → enter end)
v-enter-active                      (enter duration/easing)
v-leave-from    → v-leave-to       (leave start → leave end)
v-leave-active                      (leave duration/easing)
```

With named transitions, prefix `v-` changes to the transition name:

```text
my-transition-enter-from
my-transition-enter-active
my-transition-enter-to
my-transition-leave-from
my-transition-leave-active
my-transition-leave-to
```

### CSS Transition Properties

```css
/* Transition timing */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

/* Start/end states */
.v-enter-from,
.v-leave-to {
  opacity: 0;
}
```

### CSS Animation Properties

```css
/* Keyframe reference */
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

### Transition Modes

```text
out-in  → Leave current element first, then enter new
in-out  → Enter new element first, then leave current (rarely used)
```

## Code Snippets

### Basic Fade Transition

```vue
<script setup>
import { ref } from 'vue'

const show = ref(true)
</script>

<template>
  <button @click="show = !show">Toggle</button>

  <Transition name="fade">
    <p v-if="show">Hello Vue</p>
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

### Slide and Scale Transition

```vue
<script setup>
import { ref } from 'vue'

const isVisible = ref(false)
</script>

<template>
  <button @click="isVisible = !isVisible">Toggle Panel</button>

  <Transition name="slide-scale">
    <div v-if="isVisible" class="panel">
      <p>Sliding panel content</p>
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

### List Animations with TransitionGroup

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
  <button @click="addItem">Add</button>
  <button @click="shuffleItems">Shuffle</button>

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

/* FLIP animation for shuffle — smooth repositioning */
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

### Route Transitions with Vue Router

```vue
<script setup>
import { ref } from 'vue'

const transitionName = ref('slide-left')

// Detect route depth or direction to choose transition
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

### Custom JavaScript Hooks with GSAP

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
    <div v-if="show" class="gsap-box">GSAP Animation</div>
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

### Animated Counter with requestAnimationFrame

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

### Enter Transition with Staggered Delay

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
  <button @click="show = !show">Toggle List</button>

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

/* Container must be relative for absolute leave positioning */
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

### Modal with Transition

```vue
<script setup>
import { ref } from 'vue'

const isOpen = ref(false)

function openModal() { isOpen.value = true }
function closeModal() { isOpen.value = false }
</script>

<template>
  <button @click="openModal">Open Modal</button>

  <Transition name="modal">
    <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>Modal Title</h3>
        <p>Modal body content goes here.</p>
        <button @click="closeModal">Close</button>
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
