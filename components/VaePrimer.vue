<script setup>
// Encoder -> q(z | x) in latent space -> one sample at a time -> decoder -> the Raman spectrum it implies.
// Eight samples are drawn, one every 1.1 s once the slide opens, then the picture holds.
// Output curves: four posterior Raman samples for one Glasgow spectrum, spread widened 4x about their mean for illustration.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Tex from './Tex.vue'
import DAT from '../data/vae-samples.js'
import { useActive } from './useActive.js'

const el = ref(null)
const active = useActive()
let raf, ro, t0 = null
watch(active, v => { if (v) t0 = null }, { immediate: true })

const W = 1390, H = 560, NS = 8, EVERY = 1.1, FLY = 0.45
const INK = '#0b0c0c', LAT = '#7a5a00', RAMAN = '#12365b', MUTE = '#505a5f', BLOCK = '#ecebe6'
const F = "'Hanken Grotesk', Arial, sans-serif"
const MU = [1, 0.7], SG = [0.36, 0.22], NX = DAT[0].length

// layout, in the component's own 1390 x 560 coordinates
const cy = H / 2 + 20, LX = 250, S = 440, LY = cy - S / 2, ox = LX + S / 2, oy = cy, sc = S / 6
const P = (a, b) => [ox + a * sc, oy - b * sc]
const DL = LX + S + 40, DR = DL + 180, OL = DR + 50, OR = W - 20, OT = cy - 170, OB = cy + 150
const [mx, my] = P(MU[0], MU[1])
// where the maths labels sit, as percentages of the box
const at = (x, y) => ({ left: (x / W * 100) + '%', top: (y / H * 100) + '%' })
const MATH = [
  { src: 'p(z)', pre: 'prior ', style: at(LX, LY + S - 34), cls: 'mute' },
  { src: 'q_\\phi(z \\mid x)', style: at(mx - 28, my - SG[1] * sc * 2 - 62), cls: 'lat' },
  { src: 'z_1', style: at(LX + S - 34, oy + 4), cls: 'mute' },
  { src: 'z_2', style: at(ox + 10, LY - 4), cls: 'mute' },
]

let seed = 3
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const rn = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }
const EPS = Array.from({ length: NS }, () => [rn(), rn()])

onMounted(() => {
  const c = document.createElement('canvas')
  el.value.prepend(c)
  const g = c.getContext('2d')
  let D = 1, K = 1
  const size = () => {
    D = Math.min(2, window.devicePixelRatio || 1) * 1.5
    c.width = el.value.clientWidth * D; c.height = el.value.clientHeight * D; K = el.value.clientWidth / W
  }
  size()
  ro = new ResizeObserver(size); ro.observe(el.value)

  const txt = (s, x, y, col, al, sz, wt) => { g.font = (wt || '') + ' ' + (sz || 24) + 'px ' + F; g.fillStyle = col; g.textAlign = al || 'center'; g.fillText(s, x, y) }
  const trap = (L, R, hl, hr, label) => {
    g.beginPath(); g.moveTo(L, cy - hl); g.lineTo(R, cy - hr); g.lineTo(R, cy + hr); g.lineTo(L, cy + hl); g.closePath()
    g.fillStyle = BLOCK; g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'miter'; g.stroke()
    txt(label, (L + R) / 2, cy + 11, INK, 'center', 32, '700')
  }
  const zpos = e => P(MU[0] + e[0] * SG[0], MU[1] + e[1] * SG[1])
  const curve = (r, w, al) => {
    g.beginPath()
    r.forEach((v, i) => { const X = OL + 8 + i / (NX - 1) * (OR - OL - 8), Y = OB - v / 999 * (OB - OT); i ? g.lineTo(X, Y) : g.moveTo(X, Y) })
    g.strokeStyle = RAMAN; g.globalAlpha = al; g.lineWidth = w; g.stroke(); g.globalAlpha = 1
  }

  const draw = (t) => {
    g.setTransform(D * K, 0, 0, D * K, 0, 0); g.clearRect(0, 0, W, H)
    trap(20, 200, 170, 90, 'Encoder')
    txt('Latent space', ox, LY - 26, INK, 'center', 32, '700')
    g.strokeStyle = 'rgba(11,12,12,.25)'; g.lineWidth = 1.5
    g.beginPath(); g.moveTo(LX, oy); g.lineTo(LX + S, oy); g.moveTo(ox, LY); g.lineTo(ox, LY + S); g.stroke()
    for (const r of [1, 2]) { g.setLineDash([7, 6]); g.strokeStyle = 'rgba(80,90,95,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(ox, oy, r * sc, 0, 7); g.stroke(); g.setLineDash([]) }
    for (const [k, a] of [[2, '26'], [1, '4D']]) {
      g.beginPath(); g.ellipse(mx, my, k * SG[0] * sc, k * SG[1] * sc, 0, 0, 7)
      g.fillStyle = LAT + a; g.fill(); g.strokeStyle = LAT; g.lineWidth = 2.6; g.stroke()
    }
    trap(DL, DR, 90, 170, 'Decoder')
    txt('Raman spectrum', (OL + OR) / 2, LY - 26, INK, 'center', 32, '700')
    g.strokeStyle = 'rgba(11,12,12,.5)'; g.lineWidth = 1.5
    g.beginPath(); g.moveTo(OL, OB); g.lineTo(OR, OB); g.moveTo(OL, OB); g.lineTo(OL, OT); g.stroke()
    txt('Raman shift', (OL + OR) / 2, OB + 34, MUTE, 'center', 22)
    g.save(); g.translate(OL - 16, (OT + OB) / 2); g.rotate(-Math.PI / 2); txt('Intensity', 0, 0, MUTE, 'center', 22); g.restore()
    txt('spread exaggerated for illustration', OR, OT - 8, MUTE, 'right', 20)

    const n = Math.min(NS, Math.floor(t / EVERY) + 1)
    for (let s = 0; s < n; s++) {
      const age = t - s * EVERY, [zx, zy] = zpos(EPS[s]), newest = s === n - 1
      g.beginPath(); g.arc(zx, zy, newest ? 8 : 6, 0, 7); g.fillStyle = `rgba(11,12,12,${newest ? 1 : 0.45})`; g.fill()
      if (newest && age < 0.5) { g.beginPath(); g.arc(zx, zy, 8 + 30 * age, 0, 7); g.strokeStyle = `rgba(11,12,12,${1 - 2 * age})`; g.lineWidth = 2; g.stroke() }
      if (newest && age < FLY) { const u = age / FLY; g.beginPath(); g.arc(zx + (DL - zx) * u, zy + (cy - zy) * u, 6, 0, 7); g.fillStyle = INK; g.fill() }
      if (age >= FLY) curve(DAT[s % DAT.length], newest ? 3 : 1.5, newest ? 1 : 0.3)
    }
  }
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (!active.value) return
    if (t0 === null) t0 = now
    const t = (now - t0) / 1000
    if (t > NS * EVERY + 1) return
    draw(t)
  }
  draw(-1)
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect() })
</script>

<template>
  <div ref="el" class="vae-primer">
    <span v-for="(m, k) in MATH" :key="k" class="vae-math" :class="m.cls" :style="m.style">{{ m.pre }}<Tex :src="m.src" /></span>
  </div>
</template>

<style>
.vae-primer { position: relative; width: 100%; height: 100%; }
.vae-primer canvas { display: block; width: 100%; height: 100%; }
.vae-math { position: absolute; font-size: 26px; white-space: nowrap; color: var(--mute); font-family: 'Hanken Grotesk', Arial, sans-serif; }
.vae-math.lat { color: var(--mustard-edge); font-weight: 700; font-size: 30px; }
</style>
