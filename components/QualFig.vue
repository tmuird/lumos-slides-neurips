<script setup>
// Qualitative comparison (paper Figure 3) from the vector source. The input series are there from the start;
// the recovered spectra are then drawn in, one method at a time: ground truth, SavGol + iModPoly, RADAR, LUMOS.
import { onMounted, ref, watch, nextTick } from 'vue'
import raw from '../figures/fig3.svg?raw'
import { useActive } from './useActive.js'

const host = ref(null), shown = ref(false)
const active = useActive()
// which method a stroke colour belongs to, in drawing order
const order = c => {
  const [r, g, b] = c.match(/\d+/g).map(Number)
  if (r < 60 && g < 60 && b < 60) return 0          // ground truth, black
  if (g > r && g > b) return 1                       // SavGol + iModPoly, teal
  if (r > 200 && g > 140) return 2                   // RADAR, yellow
  return 3                                           // LUMOS, orange-red
}

let built = false
function build() {
  built = true
  const svg = host.value.querySelector('svg')
  const mid = svg.viewBox.baseVal.height * 0.45
  for (const ax of svg.querySelectorAll('g[id^="axes_"]')) {
    if (ax.getBBox().y < mid * 0.6) continue // top row: the inputs stay as they are
    for (const p of ax.querySelectorAll(':scope > g[id^="line2d_"] path')) {
      const cs = getComputedStyle(p)
      if (cs.stroke === 'none' || cs.fill !== 'none') continue
      const len = p.getTotalLength()
      if (len < 40) continue
      p.classList.add('qf-line')
      p.style.strokeDasharray = len
      p.style.setProperty('--len', len)
      p.style.transitionDelay = (0.4 + order(cs.stroke) * 0.9) + 's'
    }
  }
}
// SVG measurements are zero while a slide is preloaded but hidden, so build on first show
onMounted(() => {
  watch(active, async v => {
    shown.value = false
    if (!v) return
    await nextTick()
    requestAnimationFrame(() => { if (!built) build(); requestAnimationFrame(() => (shown.value = true)) })
  }, { immediate: true })
})
</script>

<template>
  <div ref="host" class="qual-fig" :class="{ shown }" v-html="raw" />
</template>

<style>
.qual-fig { width: 100%; height: 100%; }
.qual-fig svg { width: 100%; height: 100%; }
.qf-line { stroke-dashoffset: var(--len); }
.qual-fig.shown .qf-line { stroke-dashoffset: 0; transition: stroke-dashoffset 1.1s ease; }
</style>
