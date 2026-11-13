<script setup>
// "Can we model this in full?" as one live scene, stepped by clicks:
// 0  the measured series (real pharma sample 3349) with its noise, centred
// 1  the noise clears and it comes apart: Raman (blues) lifts off, fluorescence (oranges) stays beneath
// 2  the observed slides off to the left and the parts settle into their slots: y = s + F
// 3  the fluorescence fans out into its three fluorophores
// 5  everything runs back in order into the measured series; then all but the first 16 frames fade to a ghost
// One scene and one orthographic camera, so occlusion is always physically right; every shape change is a
// morph target blended on the GPU, so nothing is recomputed per frame. The frustum is fitted to the
// projected bounding boxes, so nothing can clip.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import P, { fluorAt, noisyAt } from '../data/pharma-3349.js'
import { useActive } from './useActive.js'

const props = defineProps({ step: { type: Number, default: 0 } })
// 'stage' reports how far the animation has actually got, so the slide's text can follow it rather than the clicks
const emit = defineEmits(['stage'])
const el = ref(null)
let renderer, raf, ro
const active = useActive()

// the component is 1840 x 800 design pixels; the final slots sit 630 px apart, centred 265 px from the top
const DW = 1840, DH = 800, SLOT = 630, ROW = 300, D = 2.9

const VIRIDIS = [[0, [68, 1, 84]], [0.25, [59, 82, 139]], [0.5, [33, 145, 140]], [0.75, [94, 201, 98]], [1, [253, 231, 37]]]
const BLUES = [[0, [222, 235, 247]], [0.35, [158, 202, 225]], [0.65, [66, 146, 198]], [0.85, [33, 113, 181]], [1, [8, 48, 107]]]
const ORANGES = [[0, [255, 245, 235]], [0.3, [253, 208, 162]], [0.6, [241, 105, 19]], [0.85, [166, 54, 3]], [1, [110, 35, 5]]]
const FLUO = [[0, 112, 60], [76, 44, 146], [212, 53, 28]]
function ramp(z, stops) {
  z = Math.min(1, Math.max(0, z))
  let a = stops[0], b = stops[stops.length - 1]
  for (let k = 0; k < stops.length - 1; k++) if (z >= stops[k][0] && z <= stops[k + 1][0]) { a = stops[k]; b = stops[k + 1]; break }
  const u = (z - a[0]) / (b[0] - a[0] || 1)
  return a[1].map((x, k) => x + (b[1][k] - x) * u)
}
const toLin = c => { const o = new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); return [o.r, o.g, o.b] }
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

// each value moves at a steady rate towards its target and is eased when used
const target = { noise: 1, split: 0, layout: 0, fan: 0, few: 0 }
const state = { noise: 1, split: 0, layout: 0, fan: 0, few: 0 }
function aim(s) {
  const back = s >= 5
  target.noise = s >= 1 && !back ? 0 : 1; target.split = s >= 1 && !back ? 1 : 0
  target.layout = s >= 2 && !back ? 1 : 0; target.fan = s >= 3 && !back ? 1 : 0; target.few = back ? 1 : 0
}
aim(props.step)
// a click that arrives while the last move is still running means the speaker is skipping ahead: catch up faster
let hurry = 1
watch(() => props.step, s => { if (Object.keys(target).some(k => Math.abs(target[k] - state[k]) > 0.02)) hurry = 2.6; aim(s) })

onMounted(() => {
  const host = el.value
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setSize(host.clientWidth, host.clientHeight)
  renderer.localClippingEnabled = true
  host.appendChild(renderer.domElement)
  const tagIn = document.createElement('div'); tagIn.className = 'dl-label'; tagIn.textContent = '16 input frames'; host.appendChild(tagIn)
  // axis names for the single measured surface; they fade while it is split into parts
  const AXES = [['Raman shift (cm⁻¹)', [0.05, 0, 0.75], 'translate(-50%, 18px)'], ['Time (s)', [1.14, 0, 0.3], 'translate(52px, 30px)'], ['Intensity', [-1, 0.55, -0.75], 'translate(-100%, -50%) translate(-20px, 0)']]
    .map(([text, at, shift]) => { const d = document.createElement('div'); d.className = 'dl-label dl-axis'; d.textContent = text; host.appendChild(d); return { d, at: new THREE.Vector3(...at), shift } })
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.9))
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-1.5, 3, 2); scene.add(sun)

  // data on the grid
  const T = P.t, NT = T.length, tMax = T[NT - 1], NX = P.raman.length, NV = NX * NT
  let zmax = 0
  for (let i = 0; i < NX; i++) zmax = Math.max(zmax, P.raman[i] + fluorAt(0, i, 0) + fluorAt(1, i, 0) + fluorAt(2, i, 0))
  const S = 0.9 / zmax
  const X = i => -1 + 2 * i / (NX - 1), Zt = j => -0.75 + 1.5 * T[j] / tMax
  const R = new Float32Array(NV), Fk = [0, 1, 2].map(() => new Float32Array(NV)), noisy = new Float32Array(NV)
  for (let j = 0; j < NT; j++) for (let i = 0; i < NX; i++) {
    const v = j * NX + i
    R[v] = P.raman[i] * S
    for (let k = 0; k < 3; k++) Fk[k][v] = fluorAt(k, i, T[j]) * S
    noisy[v] = Math.max(0, noisyAt(j, i) * S)
  }
  const clean = R.map((r, v) => r + Fk[0][v] + Fk[1][v] + Fk[2][v])
  const cum = [Fk[0], Fk[0].map((x, v) => x + Fk[1][v]), Fk[0].map((x, v) => x + Fk[1][v] + Fk[2][v])]
  const peakR = Math.max(...R), peak = Fk.map(f => Math.max(...f))
  const fanBase = [0, peak[0] + 0.08, peak[0] + peak[1] + 0.16]
  const LIFT = 1.0

  const index = []
  for (let j = 0; j < NT - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; index.push(a, c, b, b, c, d) }
  const idx = new THREE.Uint32BufferAttribute(index, 1)
  const posFrom = ys => { const p = new Float32Array(NV * 3); for (let j = 0; j < NT; j++) for (let i = 0; i < NX; i++) { const v = j * NX + i; p[v * 3] = X(i); p[v * 3 + 1] = ys[v]; p[v * 3 + 2] = Zt(j) } return p }
  const normalsOf = p => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setIndex(idx); g.computeVertexNormals(); const n = g.attributes.normal.array; g.dispose(); return n }
  const colsFrom = f => { const c = new Float32Array(NV * 3); for (let v = 0; v < NV; v++) c.set(toLin(f(v)), v * 3); return c }

  // a surface whose base heights morph towards each target height set; colour targets work the same way
  function morphSheet(baseY, targetYs, baseCol, targetCols = []) {
    const g = new THREE.BufferGeometry()
    const bp = posFrom(baseY), bn = normalsOf(bp)
    g.setAttribute('position', new THREE.BufferAttribute(bp, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(bn, 3))
    g.setAttribute('color', new THREE.BufferAttribute(baseCol, 3))
    g.setIndex(idx)
    // the targets below are differences from the base shape
    g.morphTargetsRelative = true
    g.morphAttributes.position = []; g.morphAttributes.normal = []
    for (const ty of targetYs) {
      const tp = posFrom(ty), tn = normalsOf(tp), dp = new Float32Array(NV * 3), dn = new Float32Array(NV * 3)
      for (let q = 0; q < NV * 3; q++) { dp[q] = tp[q] - bp[q]; dn[q] = tn[q] - bn[q] }
      g.morphAttributes.position.push(new THREE.BufferAttribute(dp, 3))
      g.morphAttributes.normal.push(new THREE.BufferAttribute(dn, 3))
    }
    if (targetCols.length) g.morphAttributes.color = targetCols.map(tc => { const d = new Float32Array(NV * 3); for (let q = 0; q < NV * 3; q++) d[q] = tc[q] - baseCol[q]; return new THREE.BufferAttribute(d, 3) })
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, metalness: 0 }))
    m.morphTargetInfluences = new Array(targetYs.length).fill(0)
    return m
  }
  const floor = () => {
    const g = []
    for (let k = 0; k <= 7; k++) { const x = -1 + 2 * k / 7; g.push(x, 0, -0.75, x, 0, 0.75) }
    for (let k = 0; k <= 5; k++) { const z = -0.75 + 1.5 * k / 5; g.push(-1, 0, z, 1, 0, z) }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(g, 3))
    return new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xb1b4b6 }))
  }

  // observed: clean, with the measured noise as a morph target
  const obsCol = colsFrom(v => ramp(clean[v] / 0.9, VIRIDIS))
  const obs = morphSheet(clean, [noisy], obsCol)
  // Raman: starts as the observed surface, morphs to its own shape; the lift is a translation
  const ram = morphSheet(clean, [R], colsFrom(v => ramp(Math.pow(R[v] / peakR, 0.5), BLUES)))
  // fluorescence: three stacked sheets; the top one carries the Raman until the split, and the orange until the fan
  const orange = colsFrom(v => ramp(Math.pow(cum[2][v] / 0.9, 0.8), ORANGES))
  const own = [0, 1, 2].map(k => colsFrom(v => { const u = Math.min(1, Fk[k][v] / peak[k]), w = 0.55 + 0.45 * Math.pow(u, 0.7); return FLUO[k].map(x => 255 + (x - 255) * w) }))
  const flu = [0, 1, 2].map(k => {
    const fanned = Fk[k].map(x => x + fanBase[k])
    if (k < 2) return morphSheet(cum[k], [cum[k], fanned], own[k])
    // colour targets line up with the position targets: none for the Raman carry, the fluorophore's own colour for the fan
    return morphSheet(cum[2], [cum[2].map((x, v) => x + R[v]), fanned], orange, [orange, own[2]])
  })
  const gObs = new THREE.Group(), gRam = new THREE.Group(), gFlu = new THREE.Group()
  gObs.add(obs, floor()); gRam.add(ram, floor()); gFlu.add(...flu, floor())
  scene.add(gObs, gRam, gFlu)
  // the few-frames view: a plane sweeps back from the last frame to the end of the input, cutting the solid surface;
  // what it leaves behind stays as a grey ghost, and a mustard outline marks where the input ends
  const zIn = Zt(P.nInput), TOP = 1.16
  const cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10)
  obs.material.clippingPlanes = [cut]
  const ghost = new THREE.Mesh(obs.geometry, new THREE.MeshStandardMaterial({ color: 0x8f969b, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, roughness: 0.8 }))
  ghost.morphTargetInfluences = [1]; ghost.renderOrder = 2; ghost.visible = false; scene.add(ghost)
  const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-1, 0], [1, 0], [1, TOP], [-1, TOP], [-1, 0]].map(([x, y]) => new THREE.Vector3(x, y, zIn))), new THREE.LineBasicMaterial({ color: 0xd9a400, transparent: true, opacity: 0 }))
  edge.visible = false; scene.add(edge)
  const tagAt = new THREE.Vector3(0, TOP + 0.1, zIn)

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -50, 50)
  const az = -0.6, elev = 0.42
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev))
  const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az))
  cam.position.copy(dir).multiplyScalar(20); cam.lookAt(0, 0, 0); cam.updateMatrixWorld()
  const view = cam.matrixWorldInverse.clone()
  // camera-space extents of a world box
  const extent = (boxes) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
    const p = new THREE.Vector3()
    for (const b of boxes) for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [-0.75, 0.75]) {
      p.set(x, y, z).applyMatrix4(view); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y)
    }
    return { x0, x1, y0, y1 }
  }

  function draw() {
    const W = host.clientWidth, H = host.clientHeight, aspect = W / H
    const n = ease(state.noise), s = ease(state.split), L = ease(state.layout), f = ease(state.fan), w = ease(state.few)
    obs.morphTargetInfluences[0] = n
    ram.morphTargetInfluences[0] = s
    flu.forEach((m, k) => { m.morphTargetInfluences[0] = 1 - s; m.morphTargetInfluences[1] = f; m.visible = k === 2 || f > 0.002 })
    // the lift moves with the shape change; since the fluorescence never reaches LIFT, the Raman always stays above it
    // the Raman stays lifted until the fluorescence has slid clear of it (footprints clear at about 2.5 units apart)
    const settle = ease((L - 0.88) / 0.12)
    const lift = LIFT * s * (1 - settle)
    ram.position.y = lift
    const showObs = s < 0.02 || L > 0.02, showParts = s > 0.005
    obs.visible = showObs; gObs.children[1].visible = showObs
    gRam.visible = gFlu.visible = showParts
    gObs.position.copy(right).multiplyScalar(-D * L)
    // the observed grows into its slot as it moves left, never larger than the gap beside it allows
    const grow = ease((L - 0.5) / 0.5)
    gObs.scale.setScalar(L < 0.02 ? 1 : Math.max(0.001, grow))
    gFlu.position.copy(right).multiplyScalar(D * L)

    // frame: fitted to what is on screen while centred; fixed slot spacing once laid out
    const hF = Math.max(0.9, fanBase[2] * f + peak[2] * f + 0.9 * (1 - f))
    const boxes = []
    if (L < 0.02) {
      if (showObs) boxes.push({ x0: -1, x1: 1, y0: 0, y1: 0.9 + 0.3 * n + 0.14 * w })
      if (showParts) boxes.push({ x0: -1, x1: 1, y0: 0, y1: Math.max(hF, lift + Math.max(peakR, 0.9 * (1 - s)) + 0.02) })
    } else boxes.push({ x0: -1, x1: 1, y0: 0, y1: 0.9 })
    const e = extent(boxes)
    const fitHalfW = Math.max((e.x1 - e.x0) / 2, ((e.y1 - e.y0) / 2) * aspect) * 1.2
    const fitCx = (e.x0 + e.x1) / 2, fitCy = (e.y0 + e.y1) / 2
    const slotHalfW = (D * (W / (SLOT * W / DW))) / 2
    // in the laid-out view the row of objects sits ROW px from the top
    const eL = extent([{ x0: -1, x1: 1, y0: 0, y1: Math.max(0.9, hF) }])
    const slotCy = (eL.y0 + eL.y1) / 2 - (slotHalfW / aspect) * (1 - 2 * ROW / DH)
    const hw = fitHalfW + (slotHalfW - fitHalfW) * L
    const cx = fitCx * (1 - L), cy = fitCy + (slotCy - fitCy) * L
    const hh = hw / aspect
    cam.left = cx - hw; cam.right = cx + hw; cam.top = cy + hh; cam.bottom = cy - hh
    cam.updateProjectionMatrix()
    // few frames: the cut travels over the first 70% of the move, the outline and label follow
    const sweep = ease(w / 0.7), mark = ease((w - 0.55) / 0.45)
    cut.constant = w > 0 ? 0.76 + (zIn - 0.76) * sweep : 10
    ghost.visible = w > 0.001; ghost.material.opacity = 0.15 * sweep; ghost.morphTargetInfluences[0] = n
    edge.visible = mark > 0.001; edge.material.opacity = 0.95 * mark
    const q = tagAt.clone().project(cam)
    tagIn.style.opacity = mark
    tagIn.style.transform = `translate(-50%, -100%) translate(${(q.x + 1) / 2 * W}px, ${(1 - q.y) / 2 * H}px)`
    const axisOn = (1 - Math.min(1, s * 4)) * (1 - L)
    for (const a of AXES) {
      const v = a.at.clone().project(cam)
      a.d.style.opacity = axisOn
      a.d.style.transform = `translate(${(v.x + 1) / 2 * W}px, ${(1 - v.y) / 2 * H}px) ${a.shift}`
    }
    renderer.render(scene, cam)
  }

  let last = performance.now(), first = true, stage = null
  const RATE = { noise: 1.6, split: 0.55, layout: 0.75, fan: 0.6, few: 0.45 }
  // going forward each stage waits for the one before it; going back they undo in the reverse order, a little faster
  const may = (k, up) => ({
    few: up ? state.noise > 0.98 && state.split < 0.02 : true,
    noise: up ? state.split < 0.02 : state.few < 0.02,
    split: up ? state.noise < 0.25 : state.layout < 0.02,
    layout: up ? state.split > 0.98 : state.fan < 0.02,
    fan: up ? state.layout > 0.98 : true,
  })[k]
  const BACK = 1.7
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    let moved = false
    for (const k of ['noise', 'split', 'layout', 'fan', 'few']) {
      const d = target[k] - state[k]
      if (Math.abs(d) < 1e-4) continue
      if (!may(k, d > 0)) continue
      // "back" is whichever direction undoes the forward story: split, layout and fan falling
      const undo = d < 0 && k !== 'noise'
      state[k] += Math.sign(d) * Math.min(Math.abs(d), RATE[k] * (undo ? BACK : 1) * hurry * dt); moved = true
    }
    if (!moved) hurry = 1
    // what the text should show: each stage counts once its motion has visibly landed
    let r = 0
    if (props.step >= 5) r = state.few > 0.55 ? 5 : -1
    else { if (state.split > 0.9) r = 1; if (state.layout > 0.85) r = 2; if (state.fan > 0.6) r = 3; if (r === 3 && props.step >= 4) r = 4 }
    if (r !== stage) { stage = r; emit('stage', r) }
    // redraw every frame while the slide is showing; the geometry work is all on the GPU
    if (active.value || moved || first) { draw(); first = false }
  }
  Object.assign(state, target)
  draw()
  raf = requestAnimationFrame(frame)
  ro = new ResizeObserver(() => { renderer.setSize(host.clientWidth, host.clientHeight); draw() })
  ro.observe(host)
})

onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect(); renderer?.dispose() })
</script>

<template>
  <div ref="el" class="decomp-live" />
</template>

<style>
.decomp-live { position: relative; width: 100%; height: 100%; }
.decomp-live canvas { display: block; width: 100% !important; height: 100% !important; }
.dl-label.dl-axis { font-size: 24px; font-weight: 600; color: var(--ink); }
.dl-label { position: absolute; left: 0; top: 0; opacity: 0; white-space: nowrap; pointer-events: none; font-family: 'Hanken Grotesk', Arial, sans-serif; font-size: 34px; font-weight: 700; color: #7a5a00; }
</style>
