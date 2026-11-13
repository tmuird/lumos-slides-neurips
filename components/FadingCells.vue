<script setup>
// The unbleached micrograph fades over the bleached one, following the bleaching sample's total fluorescence.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import P from '../data/pharma-3349.js'
import { useActive } from './useActive.js'

const top = ref(null)
const active = useActive()
let raf, t0 = null
// each fluorophore's total over all wavenumbers, from the real sample
const area = P.F0.map(f => f.reduce((a, b) => a + b, 0))
const S = area.reduce((a, b) => a + b, 0)
const level = t => area.reduce((a, x, k) => a + x * Math.exp(-P.lam[k] * t), 0) / S
watch(active, v => { if (v) t0 = null }, { immediate: true })

onMounted(() => {
  top.value.style.opacity = 1
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (!active.value) return
    if (t0 === null) t0 = now
    // same eased clock as the bleaching surface: 60 s of bleaching over 12 s
    const u = Math.min(1, (now - t0) / 12000)
    top.value.style.opacity = level(60 * u * u)
  }
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="fading-cells">
    <img src="/img/cells-after.jpg" alt="Fluorescently labelled cells after bleaching, much dimmer">
    <img ref="top" src="/img/cells-before.jpg" alt="The same cells before bleaching">
  </div>
</template>

<style>
.fading-cells { position: relative; width: 100%; height: 100%; }
.fading-cells img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
</style>
