<script setup>
// UMAP of each quantity LUMOS extracts (paper Figure 5), re-laid as a 3 x 2 grid from the vector figure.
// The panels arrive one at a time, in the order they are talked through.
import { onMounted, ref, watch, nextTick } from 'vue'
import raw from '../figures/umap.svg?raw'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useActive } from './useActive.js'

const tex = s => katex.renderToString(s, { throwOnError: false })
const PANELS = [
  { id: 'axes_1', name: 'Input' }, { id: 'axes_2', name: 'Raman' }, { id: 'axes_3', name: 'Latent ' + tex('\\mu') },
  { id: 'axes_4', name: 'Decay rates ' + tex('\\lambda') }, { id: 'axes_5', name: 'Abundances ' + tex('w') }, { id: 'axes_6', name: 'Physics ' + tex('(\\lambda + w)') },
]
const KEY = [['MCF-7', '#1f77b4'], ['bone', '#ff7f0e'], ['cartilage', '#2ca02c'], ['stem', '#d62728']]
const src = ref(null), cells = ref([]), shown = ref(false)
const active = useActive()
const NS = 'http://www.w3.org/2000/svg'

let built = false
function build() {
  built = true
  PANELS.forEach((p, k) => {
    const g = src.value.querySelector('#um-' + p.id)
    if (!g) return
    // the figure's own titles are replaced by the slide's
    g.querySelectorAll('g[id^="um-text_"]').forEach(t => t.remove())
    const bb = g.getBBox(), pad = 1
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${bb.width + 2 * pad} ${bb.height + 2 * pad}`)
    svg.appendChild(g)
    cells.value[k].appendChild(svg)
  })
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
  <div class="umap-grid" :class="{ shown }">
    <div ref="src" class="um-src" v-html="raw" />
    <div class="um-key"><span v-for="[n, c] in KEY" :key="n"><i :style="{ background: c }" />{{ n }}</span></div>
    <div class="um-cells">
      <div v-for="(p, k) in PANELS" :key="p.id" class="um-cell" :style="{ transitionDelay: (0.2 + k * 0.45) + 's' }">
        <p v-html="p.name" />
        <div :ref="el => (cells[k] = el)" class="um-plot" />
      </div>
    </div>
  </div>
</template>

<style>
.umap-grid { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; gap: 14px; }
.um-src { position: absolute; left: 0; top: 0; width: 1200px; height: 0; overflow: hidden; pointer-events: none; }
.um-key { display: flex; justify-content: center; gap: 44px; font-size: 28px; }
.um-key span { display: flex; align-items: center; gap: 12px; }
.um-key i { width: 22px; height: 22px; border-radius: 50%; display: block; }
.um-cells { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 18px 50px; }
.um-cell { min-height: 0; display: flex; flex-direction: column; gap: 6px; opacity: 0; transform: translateY(18px); transition: opacity 0.6s ease, transform 0.6s ease; }
.umap-grid.shown .um-cell { opacity: 1; transform: none; }
.um-cell p { text-align: center; font-size: 30px; font-weight: 700; }
.um-plot { flex: 1; min-height: 0; }
.um-plot svg { width: 100%; height: 100%; }
</style>
