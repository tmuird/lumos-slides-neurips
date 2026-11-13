<script setup>
// Rayleigh and Raman scattering for water (Stokes) and benzene (anti-Stokes), stepped by slide clicks.
// step 1-3: water's incident, Rayleigh and Raman photons; step 4-6: the same for benzene.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({ step: { type: Number, default: 0 } })
const el = ref(null)
let raf, ro

const W = 1760, H = 780, OX = 80, OY = 110
const INK = '#0b0c0c', GRN = '#1dbf4e', RED = '#e5262b', YEL = '#f2b300'
const SF = "'Hanken Grotesk', Arial, sans-serif", MF = "Georgia, 'Times New Roman', serif"
const E = x => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x))

// [from, to, wavelength in px, colour]; red is longest (loses energy), yellow shortest (gains energy)
const PHOTONS = [
  [[100, 345], [566, 352], 30, GRN], [[628, 410], [602, 735], 30, GRN], [[575, 395], [318, 742], 40, RED],
  [[968, 412], [1360, 384], 30, GRN], [[1556, 508], [1625, 735], 30, GRN], [[1404, 506], [1135, 742], 22, YEL],
]
const IN = [['λ', 'laser']], EQ = [['λ', 'scatter'], ' = ', ['λ', 'laser']], NE = [['λ', 'scatter'], ' ≠ ', ['λ', 'laser']]
const LABELS = [
  [273, 250, 'Incident light', IN], [720, 785, 'Rayleigh scattering (elastic)', EQ], [290, 785, 'Raman scattering (inelastic)', NE],
  [1164, 300, 'Incident light', IN], [1650, 785, 'Rayleigh scattering (elastic)', EQ], [1140, 785, 'Raman scattering (inelastic)', NE],
]

// when each photon (and benzene, at step 4) was revealed; null while hidden
const started = Array(7).fill(null)
function sync(step, now) {
  for (let k = 0; k < 6; k++) {
    if (step >= k + 1) { if (started[k] === null) started[k] = now }
    else started[k] = null
  }
  if (step >= 4) { if (started[6] === null) started[6] = now } else started[6] = null
}
watch(() => props.step, s => sync(s, performance.now()))

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
  sync(props.step, performance.now() - 5000)

  function wave(A, B, lam, col, p) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath()
    const s1 = Math.max(0, p * L - 18)
    for (let s = 0; s <= s1; s += 2) {
      const w = 11 * Math.sin(2 * Math.PI * s / lam) * Math.min(1, (s1 - s) / 30 + 0.25)
      const x = A[0] + ux * s - uy * w, y = A[1] + uy * s + ux * w
      s ? g.lineTo(x, y) : g.moveTo(x, y)
    }
    g.stroke()
    if (p > 0.04) {
      const x = A[0] + ux * p * L, y = A[1] + uy * p * L
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - ux * 24 - uy * 11, y - uy * 24 + ux * 11); g.lineTo(x - ux * 24 + uy * 11, y - uy * 24 - ux * 11); g.closePath(); g.fill()
    }
  }
  function atom(x, y, r, f, t) {
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = f; g.fill(); g.lineWidth = 3; g.strokeStyle = '#111'; g.stroke()
    if (t) { g.fillStyle = '#fff'; g.font = '700 32px ' + SF; g.textAlign = 'center'; g.fillText(t, x, y + 11) }
  }
  function bond(a, b) {
    g.strokeStyle = '#111'; g.lineWidth = 26; g.lineCap = 'butt'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke()
    g.strokeStyle = '#7a7a7a'; g.lineWidth = 20; g.stroke()
  }
  function label(x, y, t, m, al) {
    if (al <= 0) return
    g.globalAlpha = al; g.fillStyle = INK; g.textAlign = 'left'
    g.font = '600 26px ' + SF; g.fillText(t, x - g.measureText(t).width / 2, y)
    const P = m.map(q => {
      if (typeof q === 'string') { g.font = '30px ' + MF; return g.measureText(q).width }
      g.font = 'italic 34px ' + MF; const a = g.measureText(q[0]).width; g.font = '22px ' + MF; return a + g.measureText(q[1]).width + 2
    })
    let X = x - P.reduce((a, b) => a + b, 0) / 2
    m.forEach((q, i) => {
      if (typeof q === 'string') { g.font = '30px ' + MF; g.fillText(q, X, y + 46) }
      else { g.font = 'italic 34px ' + MF; g.fillText(q[0], X, y + 46); const a = g.measureText(q[0]).width; g.font = '22px ' + MF; g.fillText(q[1], X + a + 2, y + 54) }
      X += P[i]
    })
    g.globalAlpha = 1
  }

  const frame = (now) => {
    g.setTransform(D * K, 0, 0, D * K, 0, 0); g.clearRect(0, 0, W, H); g.translate(-OX, -OY)
    const prog = k => (started[k] === null ? 0 : E((now - started[k]) / 1100))
    // water, always shown
    const O = [618, 361], H1 = [503, 281], H2 = [730, 277]
    bond(O, H1); bond(O, H2); atom(...H1, 31, '#fafafa'); atom(...H2, 31, '#fafafa'); atom(...O, 44, '#ff8798')
    // benzene with a substituent R, from step 4
    const ba = prog(6)
    if (ba > 0) {
      g.globalAlpha = ba
      const C = [1500, 355], V = []
      for (let k = 0; k < 6; k++) { const q = Math.PI / 3 * k - 2 * Math.PI / 3; V.push([C[0] + 124 * Math.cos(q), C[1] + 124 * Math.sin(q)]) }
      for (let k = 0; k < 6; k++) bond(V[k], V[(k + 1) % 6])
      const Rp = [V[1][0] + 70, V[1][1] - 84]; bond(V[1], Rp)
      V.forEach(v => atom(...v, 37, '#555'))
      atom(...Rp, 28, '#e2e2e2', 'R')
      g.globalAlpha = 1
    }
    PHOTONS.forEach(([A, B, lam, col], k) => { const p = prog(k); if (p > 0) wave(A, B, lam, col, p) })
    LABELS.forEach(([x, y, t, m], k) => label(x, y, t, m, prog(k)))
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect() })
</script>

<template>
  <div ref="el" class="raman-effect" />
</template>

<style>
.raman-effect { width: 100%; height: 100%; }
.raman-effect canvas { display: block; width: 100%; height: 100%; }
</style>
