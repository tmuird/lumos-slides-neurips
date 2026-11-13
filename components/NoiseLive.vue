<script setup>
// Shot noise on a synthetic spectrum: the same Raman measured alone and on a fluorescent baseline
// (baseline then subtracted), as the photon count at the strongest band rises from 10 to 10,000 once.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useActive } from './useActive.js'

const el = ref(null)
const active = useActive()
let raf, ro, t0 = null

const W = 1180, H = 640, NP = 520, RISE = 8.5
const INK = '#0b0c0c', MUTE = '#505a5f', RAMAN = '#12365b', BLUE = '#eba600', BLUE_TEXT = '#c46f00', GRID = '#e6e4dd'
const F = "'Hanken Grotesk', Arial, sans-serif", MONO = "'Space Mono', monospace"

// Lorentzian Raman bands [centre, height, width] and Gaussian fluorescence [centre, width, height]
const PEAKS = [[720, .35, 7], [785, .45, 8], [1003, 1, 4.5], [1095, .3, 9], [1250, .35, 16], [1340, .45, 13], [1450, .65, 15], [1585, .25, 9], [1655, .75, 18]]
const FL = [[1700, 650, 6], [1150, 500, 4], [900, 900, 2.5]]
let seed = 11
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const rn = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }
const R = [], B = [], z1 = [], z2 = []
let bmax = 0
for (let i = 0; i < NP; i++) {
  const v = 500 + 1300 * i / (NP - 1)
  let r = 0, b = 0
  for (const [c, h, w] of PEAKS) r += h * w * w / ((v - c) ** 2 + w * w)
  for (const [c, w, h] of FL) b += h * Math.exp(-0.5 * ((v - c) / w) ** 2)
  R.push(r); B.push(b); bmax = Math.max(bmax, b); z1.push(rn()); z2.push(rn())
}
for (let i = 0; i < NP; i++) B[i] = B[i] / bmax * 5
const iPk = R.indexOf(Math.max(...R))

const L = 86, RM = 28, T = 96, BM = 70
const xs = i => L + (W - L - RM) * i / (NP - 1)
const fmt = n => Math.round(n).toLocaleString('en-GB')

watch(active, v => { if (v) t0 = null }, { immediate: true })

onMounted(() => {
  const c = document.createElement('canvas')
  el.value.appendChild(c)
  const g = c.getContext('2d')
  let D = 1, K = 1
  const size = () => {
    D = Math.min(2, window.devicePixelRatio || 1) * 1.5
    c.width = el.value.clientWidth * D; c.height = el.value.clientHeight * D
    K = el.value.clientWidth / W
  }
  size()
  ro = new ResizeObserver(size); ro.observe(el.value)

  const trace = (vals, off, color, lw, dash) => {
    const h = H - T - BM, sy = v => T + h - (v + off + 0.9) / 4.5 * h
    g.beginPath()
    for (let i = 0; i < NP; i++) { const y = Math.max(T - 6, Math.min(H - BM + 6, sy(vals[i]))); i ? g.lineTo(xs(i), y) : g.moveTo(xs(i), y) }
    g.strokeStyle = color; g.lineWidth = lw; g.setLineDash(dash || []); g.stroke(); g.setLineDash([])
  }
  const draw = (s) => {
    const u = Math.min(1, s / RISE), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, N = Math.pow(10, 1 + 3 * e)
    g.setTransform(D * K, 0, 0, D * K, 0, 0); g.clearRect(0, 0, W, H)
    g.strokeStyle = GRID; g.lineWidth = 1
    for (let k = 0; k <= 13; k++) { const x = L + (W - L - RM) * k / 13; g.beginPath(); g.moveTo(x, T); g.lineTo(x, H - BM); g.stroke() }
    const a = [], b = []
    for (let i = 0; i < NP; i++) { a.push(R[i] + Math.sqrt(R[i] / N + 1e-4 / N) * z1[i]); b.push(R[i] + Math.sqrt((R[i] + B[i]) / N) * z2[i]) }
    trace(R, 1.85, INK, 1.4, [4, 5]); trace(b, 1.85, BLUE, 1.8); trace(R, 0, INK, 1.4, [4, 5]); trace(a, 0, RAMAN, 1.8)
    g.font = '24px ' + F; g.fillStyle = MUTE; g.textAlign = 'center'
    for (const v of [600, 800, 1000, 1200, 1400, 1600, 1800]) g.fillText(v, L + (W - L - RM) * (v - 500) / 1300, H - BM + 34)
    g.fillText('Raman shift (cm⁻¹)', L + (W - L - RM) / 2, H - 8)
    const hh = H - T - BM
    g.textAlign = 'left'; g.font = '600 24px ' + F
    // trace labels on a white backing, so the noisy traces never run through them
    const tag = (s, x, y, col) => { const w = g.measureText(s).width; g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(x - 6, y - 24, w + 12, 32); g.fillStyle = col; g.fillText(s, x, y) }
    tag('On a fluorescent baseline, baseline removed', L + 8, T + 28, BLUE_TEXT)
    tag('Raman alone', L + 8, T + hh - (1.85 + 0.9) / 4.5 * hh + 44, RAMAN)
    const snr = Math.sqrt(N * R[iPk]), snrb = N * R[iPk] / Math.sqrt(N * (R[iPk] + B[iPk]))
    g.fillStyle = INK; g.font = '700 30px ' + MONO; g.fillText(fmt(N), L, 46)
    const w = g.measureText(fmt(N)).width
    g.font = '30px ' + F; g.fillText(' photons at the strongest band', L + w, 46)
    g.font = '24px ' + MONO; g.textAlign = 'right'
    g.fillStyle = RAMAN; g.fillText('SNR ' + snr.toFixed(1), W - RM - 190, 46)
    g.fillStyle = BLUE_TEXT; g.fillText('SNR ' + snrb.toFixed(1), W - RM, 46)
  }
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (!active.value) return
    if (t0 === null) t0 = now
    const s = (now - t0) / 1000
    if (s > RISE + 0.5) return
    draw(s)
  }
  draw(0)
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect() })
</script>

<template>
  <div ref="el" class="noise-live" />
</template>

<style>
.noise-live { width: 100%; height: 100%; }
.noise-live canvas { display: block; width: 100%; height: 100%; }
</style>
