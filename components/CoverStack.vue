<script setup>
// Cover: the problem in one plot, from real pharma sample 3349. Static from the first frame, slowly rotating.
// Blue, opaque: the Raman spectrum, constant in time. This is what we want.
// Orange, translucent: the clean measurement (Raman + fluorescence), bleaching down onto the Raman over a minute.
// Charcoal: the first 16 frames (1.6 s), all that LUMOS is given. One smooth surface throughout: the noise is
// shown on the decomposition slide, not mixed in here.
// Time uses a square-root axis with explicit ticks, so the short input stays readable beside the full bleach.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import P, { cleanAt, noisyAt } from '../data/pharma-3349.js'
import { useActive } from './useActive.js'

const props = defineProps({
  tMax: { type: Number, default: 60 },
  zoom: { type: Number, default: 1 }, // >1 brings the camera closer, for a wide stage
})

const el = ref(null)
const active = useActive()
let renderer, labels, raf, ro, t0 = null
watch(active, v => { if (v) t0 = null }, { immediate: true })

const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const easeOut = x => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3))
// orange (fluorescence) to blue (Raman), turning through red-violet so it never passes through grey
const GRAD = [[0, [255, 128, 20]], [0.33, [238, 62, 58]], [0.66, [136, 72, 176]], [1, [16, 86, 178]]]
function grad(u) {
  let a = GRAD[0], b = GRAD[GRAD.length - 1]
  for (let k = 0; k < GRAD.length - 1; k++) if (u >= GRAD[k][0] && u <= GRAD[k + 1][0]) { a = GRAD[k]; b = GRAD[k + 1]; break }
  const v = (u - a[0]) / (b[0] - a[0] || 1)
  return new THREE.Color().setRGB(...a[1].map((x, k) => (x + (b[1][k] - x) * v) / 255), THREE.SRGBColorSpace)
}

onMounted(() => {
  const host = el.value
  const W = () => host.clientWidth, H = () => host.clientHeight
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, W() / H(), 0.05, 60)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setSize(W(), H())
  host.appendChild(renderer.domElement)
  labels = new CSS2DRenderer()
  labels.setSize(W(), H())
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' })
  host.appendChild(labels.domElement)

  const NX = P.raman.length, nIn = P.nInput, tIn = P.t[nIn]
  let zmax = 0
  for (let i = 0; i < NX; i++) zmax = Math.max(zmax, cleanAt(i, 0))
  const S = 0.8 / zmax
  const X = i => -1 + 2 * i / (NX - 1)
  const Z = t => -0.75 + 1.5 * Math.sqrt(t / props.tMax) // square-root time axis

  // a surface over rows of times; vertex colours from colour(row, height); rows are revealed in order with a draw range
  function surface(times, height, colour, flat = false, opacity = 1) {
    const n = times.length, pos = new Float32Array(NX * n * 3), col = new Float32Array(NX * n * 3), idx = []
    for (let j = 0; j < n; j++) for (let i = 0; i < NX; i++) {
      const p = (j * NX + i) * 3, h = height(j, i)
      pos.set([X(i), h, Z(times[j])], p)
      const c = colour(j, h); col.set([c.r, c.g, c.b], p)
    }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; idx.push(a, c, b, b, c, d) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx)
    g.computeVertexNormals()
    // matte: no specular sheen
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: flat, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }))
    m.userData.per = (NX - 1) * 6; m.userData.rows = n
    scene.add(m); return m
  }
  const shade = (c, h, lo) => { const k = lo + (1 - lo) * Math.min(1, h / 0.8); const m = 0.7 + 0.3 * k; return new THREE.Color(c.r * m, c.g * m, c.b * m) }

  // input: the 16 measured frames and the boundary frame, as a grey surface with its noise
  const inT = P.t.slice(0, nIn + 1)
  // the input region of the same clean surface, in charcoal
  const inH = (j, i) => cleanAt(i, inT[j]) * S
  const input = surface(inT, inH, (j, h) => { const v = 0.07 + 0.2 * Math.min(1, h / 0.8); return new THREE.Color(v, v, v * 1.06) })
  // rows evenly spaced on the square-root axis, from 0 to tMax
  const NR = 160
  const s0 = Math.sqrt(tIn / props.tMax)
  const outT = Array.from({ length: NR }, (_, k) => props.tMax * (s0 + (1 - s0) * k / (NR - 1)) ** 2)
  // the Raman alone: what is left once every fluorophore has bleached; identical at every time
  const ramanH = Array.from({ length: NX }, (_, i) => cleanAt(i, 1e6) * S), ramanMax = Math.max(...ramanH)
  const BLUE = [[0, [158, 202, 225]], [0.4, [66, 146, 198]], [1, [8, 48, 107]]], ORANGE = [[0, [253, 174, 107]], [0.5, [241, 105, 19]], [1, [166, 54, 3]]]
  const ramp = (u, st) => { u = Math.min(1, Math.max(0, u)); let a = st[0], b = st[st.length - 1]; for (let k = 0; k < st.length - 1; k++) if (u >= st[k][0] && u <= st[k + 1][0]) { a = st[k]; b = st[k + 1]; break } const v = (u - a[0]) / (b[0] - a[0] || 1); return new THREE.Color().setRGB(...a[1].map((x, k) => (x + (b[1][k] - x) * v) / 255), THREE.SRGBColorSpace) }
  // the clean series from the end of the input: orange while fluorescence dominates, blue once only the Raman is left
  const totalH = (j, i) => cleanAt(i, outT[j]) * S
  const total = surface(outT, totalH, (j, h) => shade(grad(j / (NR - 1)), h, 0.35))
  // closed into a solid: a blue front face, which is the Raman spectrum itself, and a side face along time
  function wall(n, at, colour) {
    const pos = new Float32Array(n * 6), col = new Float32Array(n * 6), idx = []
    for (let k = 0; k < n; k++) { const [x, y, z] = at(k), c = colour(k, y); pos.set([x, 0, z, x, y, z], k * 6); col.set([c.r * 0.8, c.g * 0.8, c.b * 0.8, c.r, c.g, c.b], k * 6) }
    for (let k = 0; k < n - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
    scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })))
  }
  wall(NX, i => [X(i), totalH(NR - 1, i), Z(props.tMax)], (i, h) => ramp(Math.sqrt(h / ramanMax), BLUE))
  wall(NR, j => [-1, totalH(j, 0), Z(outT[j])], j => grad(j / (NR - 1)).multiplyScalar(0.85))
  wall(NR, j => [1, totalH(j, NX - 1), Z(outT[j])], j => grad(j / (NR - 1)).multiplyScalar(0.85))
  // the Raman spectrum, drawn as a bold black outline along the front edge
  const tip = []
  for (let i = 0; i < NX; i++) tip.push(X(i), totalH(NR - 1, i) + 0.002, Z(props.tMax) + 0.002)
  const tipGeo = new LineGeometry(); tipGeo.setPositions(tip)
  const tipMat = new LineMaterial({ color: 0x0b0c0c, linewidth: 4.5, resolution: new THREE.Vector2(W(), H()) })
  scene.add(new Line2(tipGeo, tipMat))
  const GREY = new THREE.Color(0.2, 0.2, 0.21)
  wall(nIn + 1, j => [-1, inH(j, 0), Z(inT[j])], () => GREY.clone()); wall(nIn + 1, j => [1, inH(j, NX - 1), Z(inT[j])], () => GREY.clone())

  // the end of the input, floor and ticks
  const top = 0.95
  const edge = new THREE.BufferGeometry().setFromPoints([[-1, 0], [1, 0], [1, top], [-1, top], [-1, 0]].map(([x, y]) => new THREE.Vector3(x, y, Z(tIn))))
  const frameLine = new THREE.Line(edge, new THREE.LineBasicMaterial({ color: 0xd9a400, transparent: true, opacity: 0.9 }))
  scene.add(frameLine)
  const g = []
  for (let k = 0; k <= 7; k++) { const x = -1 + 2 * k / 7; g.push(x, 0, -0.75, x, 0, 0.75) }
  const TICKS = [0, 10, 30, props.tMax]
  for (const t of TICKS) g.push(-1, 0, Z(t), 1, 0, Z(t))
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(g, 3))
  scene.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xd6d8d9, transparent: true, opacity: 0.6 })))
  // soft, mostly ambient light: shape from a gentle key, no hard highlights
  // a warm key from the front left for relief across the ridges, a cool rim from behind, and less flat ambient
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4c8, 1.15))
  const key = new THREE.DirectionalLight(0xfff4e6, 2.0); key.position.set(-2.2, 2.6, 2.4); scene.add(key)
  const rim = new THREE.DirectionalLight(0xdbe8ff, 0.7); rim.position.set(2, 1.5, -2.5); scene.add(rim)
  // a soft contact shadow so the block sits on the page
  const cv = document.createElement('canvas'); cv.width = cv.height = 256
  const cx = cv.getContext('2d'), gr = cx.createRadialGradient(128, 128, 20, 128, 128, 128)
  gr.addColorStop(0, 'rgba(20,24,40,0.34)'); gr.addColorStop(0.6, 'rgba(20,24,40,0.14)'); gr.addColorStop(1, 'rgba(20,24,40,0)')
  cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.05, -0.004, 0.08); scene.add(shadow)

  const label = (html, cls, pos, anchor = 0.5) => { const d = document.createElement('div'); d.className = 'cs-label ' + cls; d.innerHTML = html; const o = new CSS2DObject(d); o.position.set(...pos); o.center.set(anchor, 0.5); scene.add(o); return d }
  label('400', 'tick', [-0.92, 0, 0.92]); label('1800', 'tick', [0.92, 0, 0.92]); label('Raman shift (cm⁻¹)', 'axis', [0, 0, 1.12])
  // at this angle a 0 s label would sit behind the tall back edge, so the time labels start at 10 s
  TICKS.filter(t => t > 0).forEach(t => label(t + ' s', 'tick', [1.3, 0, Z(t)]))
  label('Intensity', 'axis', [-1.0, top + 0.09, -0.75])
  label('16 input frames', 'input', [0.2, top + 0.09, Z(tIn / 2)])
  label('Fluorescence,<br>bleaching away', 'fluo', [1.14, 0.52, Z(2.5)], 0); label('Raman', 'raman', [-1.22, 0.02, Z(props.tMax) - 0.02], 1)

  // camera: a slow rotation at a fixed distance
  const VF = 32 * Math.PI / 180
  const fitDist = () => {
    const aspect = W() / H(), hf = 2 * Math.atan(Math.tan(VF / 2) * aspect)
    // a slightly smaller sphere than the full box: the corners never reach the frame edge at these angles
    return 0.88 * Math.sqrt(1.4 ** 2 + (top / 2 + 0.25) ** 2 + 1.0 ** 2) / Math.sin(Math.min(VF, hf) / 2)
  }
  const tgt = new THREE.Vector3(0.05, top * 0.4, 0)
  const place = (t) => {
    const az = -0.785 + 0.12 * Math.sin(t * 0.12)
    const e = 0.36 + 0.03 * Math.sin(t * 0.09)
    const r = fitDist() / props.zoom
    camera.position.set(tgt.x + r * Math.sin(az) * Math.cos(e), tgt.y + r * Math.sin(e), tgt.z + r * Math.cos(az) * Math.cos(e))
    camera.lookAt(tgt)
  }
  const draw = (t) => { place(t); renderer.render(scene, camera); labels.render(scene, camera) }
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (!active.value) return
    if (t0 === null) t0 = now
    draw((now - t0) / 1000)
  }
  draw(0)
  raf = requestAnimationFrame(frame)
  ro = new ResizeObserver(() => {
    camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); labels.setSize(W(), H()); tipMat.resolution.set(W(), H())
  })
  ro.observe(host)
})

onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect(); renderer?.dispose() })
</script>

<template>
  <div ref="el" class="cover-stack" />
</template>

<style>
.cover-stack { position: relative; width: 100%; height: 100%; }
.cover-stack canvas { display: block; width: 100% !important; height: 100% !important; }
.cs-label { font-family: 'Hanken Grotesk', Arial, sans-serif; white-space: nowrap; }
.cs-label.tick { font-size: 20px; color: var(--mute); }
.cs-label.axis { font-size: 22px; font-weight: 600; color: var(--ink); }
.cs-label.input { font-size: 24px; font-weight: 700; color: #505a5f; }
.cs-label.raman { font-size: 26px; font-weight: 700; color: var(--ink); }
.cs-label.fluo { font-size: 26px; font-weight: 700; color: #c2500a; line-height: 1.15; }
</style>
