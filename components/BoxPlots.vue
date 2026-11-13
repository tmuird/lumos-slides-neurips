<script setup>
// Per-sample metric distributions on the Human cells test set, straight from the paper's vector figure
// (appendix Figure 8). Each chosen panel is lifted out of the figure and enlarged; the methods then appear one
// column at a time, LUMOS last.
import { onMounted, ref, watch, nextTick } from 'vue'
import raw from '../figures/distributions.svg?raw'
import { useActive } from './useActive.js'

const props = defineProps({ axes: { type: Array, default: () => ['axes_2', 'axes_5'] }, columns: { type: Number, default: 9 } })
const src = ref(null), row = ref(null), shown = ref(false)
const active = useActive()
const NS = 'http://www.w3.org/2000/svg'

let built = false
function build() {
  built = true
  for (const id of props.axes) {
    const g = src.value.querySelector('#bx-' + id)
    if (!g) continue
    const plot = g.querySelector(':scope > g[id^="bx-patch_"]').getBBox() // the axes background: the plot area
    for (const el of g.children) {
      if (el.id.startsWith('bx-matplotlib.axis') || el.id.startsWith('bx-text')) continue
      const b = el.getBBox()
      // the background and the spines span the plot; everything else belongs to one method's column
      if (b.width > plot.width * 0.5 || b.height > plot.height * 0.97) continue
      const col = Math.min(props.columns - 1, Math.max(0, Math.floor((b.x + b.width / 2 - plot.x) / plot.width * props.columns)))
      el.classList.add('bx-part')
      el.style.transitionDelay = (0.3 + col * 0.2 + (col === props.columns - 1 ? 0.35 : 0)) + 's'
    }
    const bb = g.getBBox(), pad = 3
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${bb.width + 2 * pad} ${bb.height + 2 * pad}`)
    svg.appendChild(g)
    row.value.appendChild(svg)
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
  <div class="box-plots" :class="{ shown }">
    <div ref="src" class="bx-src" v-html="raw" />
    <div ref="row" class="bx-row" />
  </div>
</template>

<style>
.box-plots { position: relative; width: 100%; height: 100%; }
.bx-src { position: absolute; left: 0; top: 0; width: 1433px; height: 0; overflow: hidden; pointer-events: none; }
.bx-row { width: 100%; height: 100%; display: flex; gap: 40px; }
.bx-row svg { flex: 1 1 0; min-width: 0; height: 100%; }
.bx-part { opacity: 0; transition: opacity 0.45s ease; }
.box-plots.shown .bx-part { opacity: 1; }
</style>
