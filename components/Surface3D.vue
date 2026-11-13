<script setup>
// A bleaching series as a lit 3D surface: wavenumber across, time towards the viewer, intensity up.
// mode picks what is drawn (the total, the constant Raman, or the decaying fluorescence);
// grow > 0 records the series row by row over that many seconds once the slide opens.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { coverSeries } from '../data/cover-series.js'
import { useActive } from './useActive.js'

const props = defineProps({
  series: { type: Object, default: () => coverSeries },
  mode: { type: String, default: 'total' },
  grow: { type: Number, default: 0 },
  // rows are sampled at t = tMax * u^rowPower, so a power above 1 puts more rows where the fast decays happen
  rowPower: { type: Number, default: 1 },
  showClock: { type: Boolean, default: true },
  // resample each spectrum this many times more finely (Catmull-Rom), for a smoother surface
  upsample: { type: Number, default: 1 },
  // drag to rotate, scroll to zoom, double-click to reset
  interactive: { type: Boolean, default: false },
  orbit: { type: Boolean, default: true },
  // opening camera move, in seconds: the camera dollies in from high and wide, then the orbit (if any) takes over
  intro: { type: Number, default: 0 },
  az: { type: Number, default: -0.55 },
  tMax: { type: Number, default: 10 },
  rows: { type: Number, default: 48 },
  labels: { type: Boolean, default: true },
  radius: { type: Number, default: 4.9 },
})

const el = ref(null)
const clock = ref('')
const active = useActive()
let renderer, labels, raf, ro, t0 = null

// Observed surfaces: deep navy through blue to pale sky at the peaks, in the deck's secondary colour.
const MUSTARD = [[0, [10, 26, 48]], [0.3, [18, 54, 91]], [0.6, [46, 104, 168]], [0.8, [110, 164, 218]], [1, [214, 232, 248]]]
// The Raman alone is mostly flat, so it gets a sequential blue from pale to dark, as in the paper.
const BLUES = [[0, [222, 235, 247]], [0.35, [158, 202, 225]], [0.65, [66, 146, 198]], [0.85, [33, 113, 181]], [1, [8, 48, 107]]]
function colour(z, stops) {
  let a = stops[0], b = stops[stops.length - 1]
  for (let k = 0; k < stops.length - 1; k++)
    if (z >= stops[k][0] && z <= stops[k + 1][0]) { a = stops[k]; b = stops[k + 1]; break }
  const u = (z - a[0]) / (b[0] - a[0] || 1)
  return a[1].map((x, k) => (x + (b[1][k] - x) * u) / 255)
}

// heights are normalised by the total at t = 0, so the three modes share one scale
// Catmull-Rom resampling of a spectrum to k times as many points, clamped at zero
function resample(a, k) {
  if (k <= 1) return a
  const n = a.length, out = []
  const at = i => a[Math.max(0, Math.min(n - 1, i))]
  for (let j = 0; j <= (n - 1) * k; j++) {
    const x = j / k, i = Math.floor(x), u = x - i
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const v = 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
    out.push(Math.max(0, v))
  }
  return out
}

function grid() {
  const R = resample(props.series.R, props.upsample), F = props.series.F.map(f => resample(f, props.upsample)), lam = props.series.lam
  const NX = R.length, NT = props.rows
  const at = (i, t, m) => {
    let r = R[i], f = 0
    for (let k = 0; k < F.length; k++) f += F[k][i] * Math.exp(-lam[k] * t)
    return m === 'raman' ? r : m === 'fluor' ? f : r + f
  }
  let zmax = 0
  for (let i = 0; i < NX; i++) zmax = Math.max(zmax, at(i, 0, 'total'))
  const Z = [], S = [], times = []
  for (let j = 0; j < NT; j++) {
    const t = props.tMax * Math.pow(j / (NT - 1), props.rowPower)
    times.push(t)
    Z.push(Array.from({ length: NX }, (_, i) => at(i, t, props.mode) / zmax))
    // fraction of the height that is Raman, which sets the hue
    S.push(Array.from({ length: NX }, (_, i) => {
      if (props.mode !== 'total') return props.mode === 'raman' ? 1 : 0
      const r = at(i, t, 'raman'), f = at(i, t, 'fluor')
      return r / (r + f + 1e-9)
    }))
  }
  return { NX, NT, Z, S, times }
}

function label(text, pos, cls = '') {
  const d = document.createElement('div')
  d.className = 'surf-label ' + cls
  d.textContent = text
  const o = new CSS2DObject(d)
  o.position.set(...pos)
  return o
}

onMounted(() => {
  const host = el.value
  const W = () => host.clientWidth, H = () => host.clientHeight
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, W() / H(), 0.1, 50)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setSize(W(), H())
  host.appendChild(renderer.domElement)
  labels = new CSS2DRenderer()
  labels.setSize(W(), H())
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' })
  host.appendChild(labels.domElement)

  // surface: x = wavenumber, y = intensity, z = time (t = 0 at the back); indices run row by row so a draw range reveals time
  const { NX, NT, Z, S, times } = grid()
  // colour by height relative to this panel's own peak, so the Raman ridges read as clearly as the total
  const zTop = Math.max(...Z.map(r => Math.max(...r)))
  const X = i => -1 + 2 * i / (NX - 1), T = j => -0.75 + 1.5 * times[j] / props.tMax
  const pos = new Float32Array(NX * NT * 3), col = new Float32Array(NX * NT * 3), idx = []
  for (let j = 0; j < NT; j++) for (let i = 0; i < NX; i++) {
    const p = (j * NX + i) * 3, z = Z[j][i]
    pos[p] = X(i); pos[p + 1] = z * 0.9; pos[p + 2] = T(j)
    const [r, g, b] = props.mode === 'raman' ? colour(Math.pow(z / zTop, 0.6), BLUES) : colour(Math.pow(z, 1.3), MUSTARD)
    const lin = new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace) // three expects linear vertex colours
    col.set([lin.r, lin.g, lin.b], p)
  }
  for (let j = 0; j < NT - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1
    idx.push(a, c, b, b, c, d)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, metalness: 0 })))

  // the frame being recorded, drawn as an ink line along the newest row
  const front = new THREE.BufferGeometry()
  front.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NX * 3), 3))
  const frontLine = new THREE.Line(front, new THREE.LineBasicMaterial({ color: 0x0b0c0c }))
  frontLine.visible = props.grow > 0
  scene.add(frontLine)

  const g = []
  for (let k = 0; k <= 7; k++) { const x = -1 + 2 * k / 7; g.push(x, 0, -0.75, x, 0, 0.75) }
  for (let k = 0; k <= 5; k++) { const z = -0.75 + 1.5 * k / 5; g.push(-1, 0, z, 1, 0, z) }
  const gg = new THREE.BufferGeometry()
  gg.setAttribute('position', new THREE.Float32BufferAttribute(g, 3))
  scene.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xb1b4b6 })))

  // softer ambient and a stronger key light keep the colours saturated and the relief readable
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.9))
  const sun = new THREE.DirectionalLight(0xffffff, 1.4)
  sun.position.set(-1.5, 3, 2)
  scene.add(sun)

  if (props.labels) {
    scene.add(label('400', [-1, 0, 0.92]), label('1800', [1, 0, 0.92]), label('Raman shift (cm⁻¹)', [0, 0, 1.12], 'axis'))
    scene.add(label('0 s', [1.14, 0, -0.75]), label(props.tMax + ' s', [1.16, 0, 0.75]), label('Time', [1.3, 0, 0], 'axis'))
    scene.add(label('Intensity', [-1.18, 0.45, -0.75], 'axis'))
  }

  const target = new THREE.Vector3(0.05, 0.25, 0.1)
  const place = (t) => {
    let az, e, r
    if (props.intro > 0 && t < props.intro) {
      const u = t / props.intro, k = 1 - Math.pow(1 - u, 3)
      az = props.az - 0.8 * (1 - k); e = 0.5 + 0.55 * (1 - k); r = props.radius * (1 + 0.8 * (1 - k))
    } else {
      const s = t - props.intro
      az = props.az + (props.orbit ? 0.3 * Math.sin(s * 0.22) : 0); e = 0.5 + (props.orbit ? 0.04 * Math.sin(s * 0.15) : 0); r = props.radius
    }
    camera.position.set(target.x + r * Math.sin(az) * Math.cos(e), target.y + r * Math.sin(e), target.z + r * Math.cos(az) * Math.cos(e))
    camera.lookAt(target)
  }
  const reveal = (t) => {
    if (!(props.grow > 0)) return
    // eased playback: simulated time runs slowly at first so the fast decays can be seen
    const u = Math.min(1, Math.max(0, t / props.grow)), sim = props.tMax * u * u
    let J = 0
    while (J < NT - 1 && times[J + 1] <= sim) J++
    geo.setDrawRange(0, J * (NX - 1) * 6)
    const fp = front.attributes.position
    for (let i = 0; i < NX; i++) fp.setXYZ(i, X(i), Z[J][i] * 0.9 + 0.004, T(J))
    fp.needsUpdate = true
    clock.value = 't = ' + sim.toFixed(1) + ' s'
  }
  let controls = null
  if (props.interactive) {
    place(0)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(target)
    Object.assign(controls, { enablePan: false, enableDamping: true, dampingFactor: 0.08, minDistance: 2.5, maxDistance: 9, minPolarAngle: 0.15, maxPolarAngle: Math.PI / 2 - 0.02 })
    controls.saveState()
    renderer.domElement.addEventListener('dblclick', () => controls.reset())
    renderer.domElement.style.cursor = 'grab'
  }
  const draw = (t) => {
    if (controls) controls.update(); else place(t)
    reveal(t); renderer.render(scene, camera); labels.render(scene, camera)
  }

  watch(active, v => { if (v) t0 = null }, { immediate: true })
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (!active.value) return
    if (t0 === null) t0 = now
    const t = (now - t0) / 1000
    // a still surface only needs drawing once it has finished
    // a still, non-interactive surface only needs drawing until it has finished
    if (!props.interactive && !props.orbit && props.grow > 0 && t > Math.max(props.grow, props.intro) + 0.5) return
    if (!props.interactive && !props.orbit && !(props.grow > 0) && t > 0.5) return
    draw(t)
  }
  draw(0)
  raf = requestAnimationFrame(frame)

  ro = new ResizeObserver(() => {
    camera.aspect = W() / H(); camera.updateProjectionMatrix()
    renderer.setSize(W(), H()); labels.setSize(W(), H())
    draw(t0 === null ? 0 : (performance.now() - t0) / 1000)
  })
  ro.observe(host)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  renderer?.dispose()
})
</script>

<template>
  <div ref="el" class="surface3d">
    <div v-if="grow > 0 && showClock" class="surf-clock">{{ clock }}</div>
  </div>
</template>

<style>
.surface3d { position: relative; width: 100%; height: 100%; }
.surface3d canvas { display: block; width: 100% !important; height: 100% !important; }
.surf-label { font-family: 'Hanken Grotesk', Arial, sans-serif; font-size: 22px; color: var(--mute); white-space: nowrap; }
.surf-label.axis { font-size: 24px; color: var(--ink); font-weight: 600; }
.surf-clock { position: absolute; left: 12px; top: 6px; z-index: 2; font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: var(--ink); }
</style>
