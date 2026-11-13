<script setup>
// The frame being recorded, split into its true parts: constant Raman plus three decaying fluorophores.
// Runs on the same eased clock as the bleaching surface (60 s of bleaching over `duration` seconds), once.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import P, { cleanAt } from '../data/pharma-3349.js'

// the real sample, scaled so the first frame's peak is 1000; noise from the variance model fitted to its measured frames
const K = 999 / Math.max(...P.raman.map((_, i) => cleanAt(i, 0)))
const D = { R: P.raman.map(x => x * K), F: P.F0.map(f => f.map(x => x * K)), lam: P.lam, names: P.names, wn: [400, 1800] }
const sigma = y => Math.sqrt(Math.max(0, P.noise[0] * y / K + P.noise[1])) * K
import { useActive } from './useActive.js'

const props = defineProps({
  duration: { type: Number, default: 12 },
  tMax: { type: Number, default: 60 },
})

const el = ref(null)
const active = useActive()
let raf, ro, t0 = null
watch(active, v => { if (v) t0 = null }, { immediate: true })

const W = 964, H = 482, N = D.R.length
const INK = '#0b0c0c', RAMAN = '#12365b', MUTE = '#505a5f', FC = ['#00703c', '#4c2c92', '#d4351c'] // one distinct colour per fluorophore; Raman is dark blue
const F = "'Hanken Grotesk', Arial, sans-serif", MONO = "'Space Mono', monospace"
let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const rn = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * rnd()) }
const Z = Array.from({ length: N }, rn)
const amp = (k, t) => Math.exp(-D.lam[k] * t)

const L = 70, R0 = 940, T = 92, B0 = 410
const xs = i => L + (R0 - L) * i / (N - 1), ys = v => B0 - (B0 - T) * v / 1000

onMounted(() => {
  const c = document.createElement('canvas')
  el.value.appendChild(c)
  const g = c.getContext('2d')
  let S = 1, K = 1
  const size = () => {
    S = Math.min(2, window.devicePixelRatio || 1) * 1.5
    c.width = el.value.clientWidth * S; c.height = el.value.clientHeight * S; K = el.value.clientWidth / W
  }
  size()
  ro = new ResizeObserver(size); ro.observe(el.value)

  const line = (f, col, w) => {
    g.beginPath()
    for (let i = 0; i < N; i++) { const y = ys(f(i)); i ? g.lineTo(xs(i), y) : g.moveTo(xs(i), y) }
    g.strokeStyle = col; g.lineWidth = w; g.stroke()
  }
  const fill = (f, col) => {
    g.beginPath(); g.moveTo(xs(0), ys(0))
    for (let i = 0; i < N; i++) g.lineTo(xs(i), ys(f(i)))
    g.lineTo(xs(N - 1), ys(0)); g.closePath(); g.globalAlpha = 0.13; g.fillStyle = col; g.fill(); g.globalAlpha = 1
  }
  const txt = (s, x, y, col, al, sz, wt, font) => { g.font = (wt || '') + ' ' + (sz || 22) + 'px ' + (font || F); g.fillStyle = col; g.textAlign = al || 'left'; g.fillText(s, x, y) }

  const draw = (t) => {
    g.setTransform(S * K, 0, 0, S * K, 0, 0); g.clearRect(0, 0, W, H)
    const tot = i => D.R[i] + D.F.reduce((a, f, k) => a + f[i] * amp(k, t), 0)
    g.strokeStyle = 'rgba(11,12,12,.5)'; g.lineWidth = 1.5
    g.beginPath(); g.moveTo(L, T - 10); g.lineTo(L, B0); g.lineTo(R0, B0); g.stroke()
    txt('Raman shift (cm⁻¹)', (L + R0) / 2, B0 + 56, MUTE, 'center')
    for (const v of [400, 800, 1200, 1600]) txt(v, L + (R0 - L) * (v - 400) / 1399, B0 + 28, MUTE, 'center', 20)
    g.save(); g.translate(L - 22, (T + B0) / 2); g.rotate(-Math.PI / 2); txt('Intensity', 0, 0, MUTE, 'center'); g.restore()
    // a noisy frame in grey, then the true parts
    const frameNo = Math.floor(t * 10)
    line(i => { const y = tot(i); return y + sigma(y) * Z[(i * 7 + frameNo * 13) % N] }, '#c9cccd', 1.2)
    D.F.forEach((f, k) => { fill(i => f[i] * amp(k, t), FC[k]); line(i => f[i] * amp(k, t), FC[k], 2.4) })
    line(i => D.R[i], RAMAN, 2.6); line(tot, INK, 2.6)
    // legend, with each fluorophore's remaining fraction
    let lx = L
    ;[['Measured', INK], ['Raman', RAMAN], ...D.names.map((n, k) => [n + ' ' + Math.round(100 * amp(k, t)) + '%', FC[k]])].forEach(([n, col]) => {
      g.fillStyle = col; g.fillRect(lx, 18, 24, 5); txt(n, lx + 32, 28, INK, 'left', 21); lx += 32 + g.measureText(n).width + 30
    })
    txt('t = ' + t.toFixed(1) + ' s', R0, T + 4, INK, 'right', 26, '700', MONO)
  }
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (!active.value) return
    if (t0 === null) t0 = now
    const s = (now - t0) / 1000
    if (s > props.duration + 0.5) return
    const u = Math.min(1, s / props.duration)
    draw(props.tMax * u * u)
  }
  draw(0)
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect() })
</script>

<template>
  <div ref="el" class="bleach-parts" />
</template>

<style>
.bleach-parts { width: 100%; height: 100%; }
.bleach-parts canvas { display: block; width: 100%; height: 100%; }
</style>
