<script setup>
// Shot noise made visible: photons fall into wavenumber bins and the spectrum builds up as a histogram.
// Top: the Raman on a fluorescent baseline (baseline then subtracted); bottom: the same Raman alone.
// Both get the same photons at the strongest Raman band, rising from 10 to 1,000 once; the baseline row
// receives far more photons, and its Raman stays buried in their noise.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useActive } from './useActive.js'

const el = ref(null)
const active = useActive()
let raf, ro, t0 = null

const W = 1180, H = 640, NP = 260, RISE = 8.5, CAP = 70
const INK = '#0b0c0c', MUTE = '#505a5f', RAMAN = '#12365b', FLUO = '#eba600', FLUO_TEXT = '#c46f00', GRID = '#e6e4dd'
const F = "'Hanken Grotesk', Arial, sans-serif", MONO = "'Space Mono', monospace"

// Lorentzian Raman bands [centre, height, width] and Gaussian fluorescence [centre, width, height]
const PEAKS = [[720, .35, 7], [785, .45, 8], [1003, 1, 4.5], [1095, .3, 9], [1250, .35, 16], [1340, .45, 13], [1450, .65, 15], [1585, .25, 9], [1655, .75, 18]]
const FL = [[1700, 650, 6], [1150, 500, 4], [900, 900, 2.5]]
const R = [], B = []
let bmax = 0
for (let i = 0; i < NP; i++) {
  const v = 500 + 1300 * i / (NP - 1)
  let r = 0, b = 0
  for (const [c, h, w] of PEAKS) r += h * w * w / ((v - c) ** 2 + w * w)
  for (const [c, w, h] of FL) b += h * Math.exp(-0.5 * ((v - c) / w) ** 2)
  R.push(r); B.push(b); bmax = Math.max(bmax, b)
}
const rmax = Math.max(...R)
for (let i = 0; i < NP; i++) { R[i] /= rmax; B[i] = B[i] / bmax * 5 }
const iPk = R.indexOf(1)

let seed = 11
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }
function poisson(l) {
  if (l <= 0) return 0
  if (l > 30) return Math.max(0, Math.round(l + Math.sqrt(l) * gauss()))
  let k = 0, p = 1; const L = Math.exp(-l)
  do { k++; p *= rnd() } while (p > L)
  return k - 1
}

const L = 86, RM = 28, ROWS = [{ top: 92, bot: 318 }, { top: 382, bot: 572 }]
const xs = i => L + (W - L - RM) * (i + 0.5) / NP
// 10 to 1,000 photons: by 1,000 the gap between the rows is plain, beyond it both look clean
const photons = N => Math.pow(10, 1 + 2 * N)

// state: cumulative counts per bin, the photon budget so far, and the falling particles
let Cr, Cb, Nprev, drops
function reset() { Cr = new Float64Array(NP); Cb = new Float64Array(NP); Nprev = 0; drops = []; seed = 11 }
reset()
watch(active, v => { if (v) { t0 = null; reset() } }, { immediate: true })

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

  // the spectrum of a row: true Raman maps to 80% of the row height
  const ry = (row, v) => { const { top, bot } = ROWS[row]; return Math.max(top - 4, Math.min(bot + 4, bot - (bot - top) * 0.8 * v)) }
  const trace = (row, f, col, lw, dash) => {
    g.beginPath()
    for (let i = 0; i < NP; i++) { const y = ry(row, f(i)); i ? g.lineTo(xs(i), y) : g.moveTo(xs(i), y) }
    g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []); g.stroke(); g.setLineDash([])
  }
  const tag = (s, x, y, col) => { g.font = '600 24px ' + F; const w = g.measureText(s).width; g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(x - 6, y - 24, w + 12, 32); g.fillStyle = col; g.fillText(s, x, y) }

  let last = null
  const step = (s, dt) => {
    const u = Math.min(1, s / RISE), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, N = photons(e)
    const dN = Math.max(0, N - Nprev); Nprev = N
    if (dN > 0 && u < 1) {
      // arrivals this frame, and how many of them to draw as falling particles (the same thinning for both rows)
      let tot = 0
      const ar = [], ab = []
      for (let i = 0; i < NP; i++) { const a = poisson(dN * R[i]), b = poisson(dN * (R[i] + B[i])); Cr[i] += a; Cb[i] += b; ar.push(a); ab.push(b); tot += b }
      const thin = Math.min(1, CAP / Math.max(1, tot))
      for (let i = 0; i < NP; i++) {
        for (const [row, n] of [[0, ab[i]], [1, ar[i]]]) {
          const k = poisson(n * thin)
          for (let q = 0; q < k; q++) drops.push({ row, i, x: xs(i) + (rnd() - 0.5) * 3, y: ROWS[row].top - 30 - rnd() * 40 })
        }
      }
    }
    // particles fall to the current height of their bin and vanish there
    const v = 1100 * dt
    for (const d of drops) d.y += v
    drops = drops.filter(d => d.y < ry(d.row, d.row ? Cr[d.i] / Math.max(1, N) : (Cb[d.i] - N * B[d.i]) / Math.max(1, N)))
    return N
  }
  const draw = (N) => {
    g.setTransform(D * K, 0, 0, D * K, 0, 0); g.clearRect(0, 0, W, H)
    g.strokeStyle = GRID; g.lineWidth = 1
    for (let k = 0; k <= 13; k++) { const x = L + (W - L - RM) * k / 13; g.beginPath(); g.moveTo(x, ROWS[0].top - 20); g.lineTo(x, ROWS[1].bot); g.stroke() }
    // particles first, so the traces sit over them
    for (const d of drops) {
      g.strokeStyle = d.row ? 'rgba(18,54,91,.55)' : 'rgba(235,166,0,.6)'; g.lineWidth = 2
      g.beginPath(); g.moveTo(d.x, d.y - 12); g.lineTo(d.x, d.y); g.stroke()
    }
    const n = Math.max(1, N)
    trace(0, i => R[i], INK, 1.3, [4, 5]); trace(1, i => R[i], INK, 1.3, [4, 5])
    if (Nprev > 0) {
      trace(0, i => (Cb[i] - N * B[i]) / n, FLUO, 1.8)
      trace(1, i => Cr[i] / n, RAMAN, 1.8)
    }
    g.font = '24px ' + F; g.fillStyle = MUTE; g.textAlign = 'center'
    for (const v of [600, 800, 1000, 1200, 1400, 1600, 1800]) g.fillText(v, L + (W - L - RM) * (v - 500) / 1300, ROWS[1].bot + 34)
    g.fillText('Raman shift (cm⁻¹)', L + (W - L - RM) / 2, H - 6)
    g.textAlign = 'left'
    tag('On a fluorescent baseline, baseline removed', L + 8, ROWS[0].top + 4, FLUO_TEXT)
    tag('Raman alone', L + 8, ROWS[1].top + 4, RAMAN)
    const snr = Math.sqrt(N * R[iPk]), snrb = N * R[iPk] / Math.sqrt(N * (R[iPk] + B[iPk]))
    g.fillStyle = INK; g.font = '700 30px ' + MONO; g.fillText(Math.round(N).toLocaleString('en-GB'), L, 40)
    const w = g.measureText(Math.round(N).toLocaleString('en-GB')).width
    g.font = '30px ' + F; g.fillText(' photons at the strongest band', L + w, 40)
    g.font = '24px ' + MONO; g.textAlign = 'right'
    g.fillStyle = RAMAN; g.fillText('SNR ' + snr.toFixed(1), W - RM - 190, 40)
    g.fillStyle = FLUO_TEXT; g.fillText('SNR ' + snrb.toFixed(1), W - RM, 40)
    g.textAlign = 'left'
  }
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (!active.value) return
    if (t0 === null) { t0 = now; last = now }
    const s = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now
    if (s > RISE + 1 && drops.length === 0) return
    draw(step(s, dt))
  }
  draw(0)
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect() })
</script>

<template>
  <div ref="el" class="photon-rain" />
</template>

<style>
.photon-rain { width: 100%; height: 100%; }
.photon-rain canvas { display: block; width: 100%; height: 100%; }
</style>
