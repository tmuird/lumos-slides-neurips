<script setup>
// What the spectrometer gives: the dispersed light on the detector (top) and the same thing read out as a
// spectrum (bottom), sharing one wavenumber axis so each bright band sits above its peak.
// Both are drawn from the real Raman spectrum of pharma sample 3349; the detector strip is a rendering of
// that spectrum, not a camera image.
import { computed } from 'vue'
import P from '../data/pharma-3349.js'

const props = defineProps({ step: { type: Number, default: 2 } })
const W = 680, X0 = 70, X1 = 660, SY = 36, SH = 140, PY0 = 262, PY1 = 560
const R = P.raman, n = R.length, max = Math.max(...R)
const x = i => X0 + (X1 - X0) * i / (n - 1)
const wn = i => P.wn[0] + (P.wn[n - 1] - P.wn[0]) * i / (n - 1)
const xw = w => X0 + (X1 - X0) * (w - P.wn[0]) / (P.wn[n - 1] - P.wn[0])
// brightness on the detector: the spectrum on a faint background, gamma-lifted so weak bands still show
const stops = computed(() => Array.from({ length: 176 }, (_, k) => {
  const i = Math.round(k / 175 * (n - 1)), v = Math.round(255 * Math.min(1, 0.06 + 0.94 * Math.pow(R[i] / max, 0.4)))
  return { o: (k / 175 * 100).toFixed(2) + '%', c: `rgb(${v},${v},${v})` }
}))
const line = computed(() => R.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${(PY1 - (PY1 - PY0 - 14) * r / max).toFixed(1)}`).join(''))
// the strongest peaks, for the guides that tie a band to its peak
const peaks = computed(() => {
  const out = []
  for (let i = 3; i < n - 3; i++) if (R[i] > 0.05 * max && R[i] >= R[i - 1] && R[i] >= R[i + 1] && R[i] > R[i - 3] && R[i] > R[i + 3]) out.push(i)
  return out.sort((a, b) => R[b] - R[a]).slice(0, 5)
})
const TICKS = [400, 800, 1200, 1600]
</script>

<template>
  <svg class="spectrum-strip" :class="{ s1: step >= 1, s2: step >= 2 }" :viewBox="`0 0 ${W} 620`" role="img"
    aria-label="A detector strip with bright bands above the Raman spectrum it corresponds to, on a shared wavenumber axis">
    <defs>
      <linearGradient id="ss-bands" x1="0" x2="1" y1="0" y2="0"><stop v-for="s in stops" :key="s.o" :offset="s.o" :stop-color="s.c" /></linearGradient>
      <linearGradient id="ss-fall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.55" /><stop offset="0.3" stop-color="#000" stop-opacity="0" /><stop offset="0.7" stop-color="#000" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity="0.55" /></linearGradient>
      <clipPath id="ss-wipe"><rect class="ss-wipe" :x="X0" :y="SY" :width="X1 - X0" :height="SH" /></clipPath>
    </defs>
    <g class="ss-strip">
      <text :x="X0" :y="SY - 2" class="ss-cap" dy="-8">Detector</text>
      <g clip-path="url(#ss-wipe)">
        <rect :x="X0" :y="SY" :width="X1 - X0" :height="SH" fill="url(#ss-bands)" />
        <rect :x="X0" :y="SY" :width="X1 - X0" :height="SH" fill="url(#ss-fall)" />
      </g>
    </g>
    <g class="ss-plot">
      <line v-for="i in peaks" :key="i" :x1="x(i)" :x2="x(i)" :y1="SY + SH + 6" :y2="PY1 - (PY1 - PY0 - 14) * R[i] / max - 8" class="ss-guide" />
      <text :x="X1" :y="PY0 - 22" class="ss-cap" text-anchor="end">Spectrum</text>
      <line :x1="X0" :x2="X1" :y1="PY1" :y2="PY1" class="ss-axis" /><line :x1="X0" :x2="X0" :y1="PY0 - 8" :y2="PY1" class="ss-axis" />
      <g v-for="t in TICKS" :key="t"><line :x1="xw(t)" :x2="xw(t)" :y1="PY1" :y2="PY1 + 7" class="ss-axis" /><text :x="xw(t)" :y="PY1 + 30" class="ss-tick">{{ t }}</text></g>
      <text :x="(X0 + X1) / 2" :y="PY1 + 58" class="ss-lab">Raman shift (cm⁻¹)</text>
      <text :x="26" :y="(PY0 + PY1) / 2" class="ss-lab" :transform="`rotate(-90 26 ${(PY0 + PY1) / 2})`">Intensity</text>
      <path :d="line" class="ss-line" pathLength="1" />
    </g>
  </svg>
</template>

<style>
.spectrum-strip { width: 100%; height: 100%; font-family: 'Hanken Grotesk', Arial, sans-serif; }
.ss-cap { font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; fill: var(--mute); }
.ss-axis { stroke: var(--ink); stroke-width: 2; }
.ss-tick { font-size: 20px; fill: var(--mute); text-anchor: middle; }
.ss-lab { font-size: 22px; font-weight: 600; fill: var(--ink); text-anchor: middle; }
.ss-guide { stroke: var(--mustard, #f2b705); stroke-width: 2; stroke-dasharray: 4 5; opacity: 0; transition: opacity 0.5s ease 1.5s; }
.ss-line { fill: none; stroke: var(--navy, #12365b); stroke-width: 3; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; }
.ss-strip, .ss-plot { opacity: 0; transition: opacity 0.4s ease; }
.ss-wipe { transform: scaleX(0); transform-box: fill-box; transform-origin: left; }
.s1 .ss-strip { opacity: 1; } .s1 .ss-wipe { transform: scaleX(1); transition: transform 1s ease; }
.s2 .ss-plot { opacity: 1; } .s2 .ss-line { stroke-dashoffset: 0; transition: stroke-dashoffset 1.6s ease; } .s2 .ss-guide { opacity: 0.9; }
</style>
