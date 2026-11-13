<script setup>
// Error reduction of LUMOS against the best non-learning or unsupervised method, per dataset and metric (paper Table 1).
// Bars grow in row by row when the slide opens.
import { ref, watch } from 'vue'
import { useActive } from './useActive.js'

const METRICS = ['PSNR', 'SI-PSNR', 'Pearson r', 'Spectral angle']
const ROWS = [
  { name: 'Human cells', v: [12, 29, 40, 19], real: true },
  { name: 'Wheat', v: [48, 63, 67, 41] },
  { name: 'Pharma', v: [67, 57, 40, 42] },
  { name: 'Cancer', v: [77, 44, 53, 52] },
  { name: 'RRUFF', v: [36, 29, 50, 24] },
]
const X0 = 330, COL = 360, BAR = 240, H0 = 112, RH = 75
const y = k => (k === 0 ? H0 : H0 + 145 + (k - 1) * RH)

const shown = ref(false)
const active = useActive()
watch(active, v => {
  shown.value = false
  if (v) requestAnimationFrame(() => requestAnimationFrame(() => (shown.value = true)))
}, { immediate: true })
</script>

<template>
  <svg class="results-grid" :class="{ shown }" viewBox="0 0 1760 540" role="img"
    aria-label="Error reduction of LUMOS against the best comparable method for five datasets and four metrics">
    <g class="lbl">
      <text x="0" y="86">REAL</text>
      <text x="0" y="228">SIMULATED</text>
    </g>
    <line x1="0" y1="48" x2="1760" y2="48" class="rule-ink" />
    <line x1="0" y1="190" x2="1760" y2="190" class="rule-dash" />
    <text v-for="(m, j) in METRICS" :key="m" :x="X0 + j * COL" y="30" class="head">{{ m }}</text>
    <g v-for="(r, k) in ROWS" :key="r.name">
      <text x="0" :y="y(k) + 28" class="name">{{ r.name }}</text>
      <g v-for="(v, j) in r.v" :key="j">
        <rect :x="X0 + j * COL" :y="y(k)" :width="BAR" height="36" class="track" />
        <rect :x="X0 + j * COL" :y="y(k)" :width="BAR * v / 100" height="36" class="bar"
          :style="{ transitionDelay: (0.25 + k * 0.15) + 's' }" />
        <text :x="X0 + j * COL + BAR + 14" :y="y(k) + 28" class="val">{{ v }}%</text>
      </g>
    </g>
  </svg>
</template>

<style>
.results-grid { width: 100%; height: 100%; font-family: 'Hanken Grotesk', Arial, sans-serif; }
.results-grid .lbl text { font-size: 22px; font-weight: 700; letter-spacing: 0.12em; fill: var(--mute); }
.results-grid .rule-ink { stroke: var(--ink); stroke-width: 2; }
.results-grid .rule-dash { stroke: var(--rule); stroke-width: 2; stroke-dasharray: 6 6; }
.results-grid .head { font-size: 28px; font-weight: 700; fill: var(--ink); }
.results-grid .name { font-size: 30px; fill: var(--ink); }
.results-grid .track { fill: var(--paper-2); }
.results-grid .bar { fill: var(--navy); transform-box: fill-box; transform-origin: left; transform: scaleX(0); transition: transform 0.7s cubic-bezier(.2, .7, .2, 1); }
.results-grid.shown .bar { transform: scaleX(1); }
.results-grid .val { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; fill: var(--ink); }
</style>
