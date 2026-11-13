<script setup>
// Cover, as light. Real pharma sample 3349 drawn as glowing spectra receding in time on a dark ground:
// a blaze of orange at the back while fluorescence dominates, thinning to the blue Raman spectrum at the front.
// The first 16 frames (1.6 s), all that LUMOS is given, are the white-hot lines at the back.
// Each line is the clean spectrum at one time, on a square-root time axis; a dark surface under the lines hides
// the ones behind, so the shape reads. Bloom gives the glow. Static apart from a slow swing of the camera.
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import P, { cleanAt } from '../data/pharma-3349.js'
import { useActive } from './useActive.js'

const props = defineProps({ tMax: { type: Number, default: 60 }, rows: { type: Number, default: 120 } })
const el = ref(null)
const active = useActive()
let renderer, composer, labels, raf, ro
const BG = 0x05080f
const GRAD = [[0, [255, 150, 40]], [0.3, [255, 80, 50]], [0.62, [150, 90, 220]], [1, [60, 150, 255]]]
const grad = u => { let a = GRAD[0], b = GRAD[GRAD.length - 1]; for (let k = 0; k < GRAD.length - 1; k++) if (u >= GRAD[k][0] && u <= GRAD[k + 1][0]) { a = GRAD[k]; b = GRAD[k + 1]; break } const v = (u - a[0]) / (b[0] - a[0] || 1); return new THREE.Color().setRGB(...a[1].map((x, k) => (x + (b[1][k] - x) * v) / 255), THREE.SRGBColorSpace) }

onMounted(() => {
  const host = el.value
  const W = () => host.clientWidth, H = () => host.clientHeight
  const scene = new THREE.Scene(); scene.background = new THREE.Color(BG)
  const camera = new THREE.PerspectiveCamera(30, W() / H(), 0.05, 60)
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W(), H())
  host.appendChild(renderer.domElement)
  labels = new CSS2DRenderer(); labels.setSize(W(), H())
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' })
  host.appendChild(labels.domElement)

  const NX = P.raman.length, tIn = P.t[P.nInput], NR = props.rows
  let zmax = 0
  for (let i = 0; i < NX; i++) zmax = Math.max(zmax, cleanAt(i, 0))
  const S = 0.85 / zmax
  const X = i => -1.25 + 2.5 * i / (NX - 1)
  const Z = t => -0.9 + 1.8 * Math.sqrt(t / props.tMax)
  const times = Array.from({ length: NR }, (_, k) => props.tMax * (k / (NR - 1)) ** 2)
  const h = (j, i) => cleanAt(i, times[j]) * S

  // dark surface under the lines, so nearer spectra hide the ones behind them
  const pos = new Float32Array(NX * NR * 3), idx = []
  for (let j = 0; j < NR; j++) for (let i = 0; i < NX; i++) pos.set([X(i), h(j, i), Z(times[j])], (j * NX + i) * 3)
  for (let j = 0; j < NR - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; idx.push(a, c, b, b, c, d) }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setIndex(idx)
  scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: BG, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2 })))
  // a dark front face under the Raman, so the block is closed
  const fp = [], fi = []
  for (let i = 0; i < NX; i++) fp.push(X(i), 0, Z(props.tMax), X(i), h(NR - 1, i), Z(props.tMax))
  for (let i = 0; i < NX - 1; i++) { const a = i * 2; fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi)
  scene.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0x0a1630, side: THREE.DoubleSide })))

  const res = new THREE.Vector2(W(), H()), mats = []
  const lineAt = (j, colour, width, opacity) => {
    const p = []
    for (let i = 0; i < NX; i++) p.push(X(i), h(j, i) + 0.0015, Z(times[j]))
    const g = new LineGeometry(); g.setPositions(p)
    const m = new LineMaterial({ color: colour, linewidth: width, transparent: true, opacity, resolution: res }); mats.push(m)
    scene.add(new Line2(g, m))
  }
  for (let j = 0; j < NR - 1; j++) {
    const input = times[j] <= tIn
    // the measured frames are white-hot; after them the colour follows the bleaching
    lineAt(j, input ? new THREE.Color(1, 0.9, 0.74) : grad(j / (NR - 1)), input ? 1.7 : 1.4, input ? 0.6 : 0.42 + 0.3 * (j / (NR - 1)))
  }
  // the Raman spectrum itself: the brightest line, at the front
  lineAt(NR - 1, new THREE.Color(0.72, 0.88, 1), 3.4, 1)

  const label = (html, cls, at, anchor = 0.5) => { const d = document.createElement('div'); d.className = 'cg-label ' + cls; d.innerHTML = html; const o = new CSS2DObject(d); o.position.set(...at); o.center.set(anchor, 0.5); scene.add(o) }
  label('16 frames in', 'in', [1.32, h(0, NX - 1) + 0.02, Z(tIn / 2)], 0)
  label('Raman out', 'out', [1.32, 0.04, Z(props.tMax)], 0)

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.34, 0.55, 0.12)
  composer.addPass(bloom); composer.addPass(new OutputPass())

  // the block sits right of centre, leaving the left for the title
  const tgt = new THREE.Vector3(-1.62, 0.3, 0.25)
  const place = t => {
    const az = -0.72 + 0.1 * Math.sin(t * 0.11), e = 0.34 + 0.02 * Math.sin(t * 0.08), r = 6.6
    camera.position.set(tgt.x + r * Math.sin(az) * Math.cos(e), tgt.y + r * Math.sin(e), tgt.z + r * Math.cos(az) * Math.cos(e))
    camera.lookAt(tgt)
  }
  let t0 = null
  const draw = t => { place(t); composer.render(); labels.render(scene, camera) }
  const frame = now => {
    raf = requestAnimationFrame(frame)
    if (!active.value) return
    if (t0 === null) t0 = now
    draw((now - t0) / 1000)
  }
  draw(0)
  raf = requestAnimationFrame(frame)
  ro = new ResizeObserver(() => {
    camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); composer.setSize(W(), H()); labels.setSize(W(), H())
    res.set(W(), H()); mats.forEach(m => m.resolution.set(W(), H()))
  })
  ro.observe(host)
})
onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect(); renderer?.dispose() })
</script>

<template>
  <div ref="el" class="cover-glow" />
</template>

<style>
.cover-glow { position: relative; width: 100%; height: 100%; background: #05080f; }
.cover-glow canvas { display: block; width: 100% !important; height: 100% !important; }
.cg-label { font-family: 'Space Mono', monospace; font-size: 22px; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
.cg-label.in { color: #ffe9cf; }
.cg-label.out { color: #bfe2ff; }
</style>
