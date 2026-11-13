<script setup>
// "Inferring the unknowns with a VAE" as one 3D scene the camera travels through, stepped by clicks.
// 0  the measured input flows into the encoder; the posterior q(z | x) rises over the latent plane, above the prior
// 1  samples z = mu + sigma * eps are drawn one at a time; each is decoded into physical parameters
//    (Raman peak intensities alpha, decay rates lambda, abundances w), and the Raman s = sum_j alpha_j V_j is rebuilt
// 2  at inference LUMOS decodes the mean: z = mu gives the sample's true parameters and Raman
//
// Probabilistic honesty: eps ~ N(0, I) by Box-Muller; the decoder is a fixed smooth map with theta(mu) = truth,
// so every spectrum shown is a push-forward of the Gaussian posterior. The decoder is illustrative, not the trained
// network, and the posterior spread is exaggerated so the variation is visible.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import katex from 'katex'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import P, { noisyAt } from '../data/pharma-3349.js'
import { useActive } from './useActive.js'

const props = defineProps({ step: { type: Number, default: 0 } })
const el = ref(null)
const active = useActive()
let renderer, labels, raf, ro

const INK = 0x0b0c0c, BLOCK = 0xecebe6, NAVY = 0x12365b, MUST = 0xf2b705, MEDGE = 0x7a5a00
const FC = [0x00703c, 0x4c2c92, 0xd4351c]
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const tex = s => katex.renderToString(s, { throwOnError: false })

// seeded randomness so the talk is the same every time
let seed = 20261113
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }

// --- the sample, its Raman split into peaks, and a fixed decoder -----------------------------------------------
const NX = P.raman.length, R = P.raman
// peaks: local maxima of the true Raman above 8% of its maximum
const Rmax = Math.max(...R), peaks = []
for (let i = 2; i < NX - 2; i++) if (R[i] > 0.08 * Rmax && R[i] >= R[i - 1] && R[i] >= R[i + 1] && R[i] >= R[i - 2] && R[i] >= R[i + 2]) peaks.push(i)
// peak shapes V_j: a soft partition of the Raman between peaks, so sum_j alpha*_j V_j is exactly the true Raman
const wid = 6
const share = peaks.map(p => R.map((_, i) => Math.exp(-0.5 * ((i - p) / wid) ** 2)))
const norm = R.map((_, i) => share.reduce((a, s) => a + s[i], 0) || 1)
const alphaTrue = peaks.map(p => R[p])
const V = peaks.map((p, j) => R.map((r, i) => (r * share[j][i] / norm[i]) / alphaTrue[j]))
// any Raman intensity not near a peak stays as a fixed remainder, so the rebuild at the mean is exact
const remainder = R.map((r, i) => r - peaks.reduce((a, p, j) => a + alphaTrue[j] * V[j][i], 0))
// posterior over a 2D latent (prior N(0, I)); the decoder is log-linear in z - mu with fixed random directions
const MU = [0.55, 0.35], SIG = [0.32, 0.2]
const dirs = n => Array.from({ length: n }, () => [gauss() * 0.9, gauss() * 0.9])
const gA = dirs(peaks.length), gL = dirs(3), gW = dirs(3)
function decode(z) {
  const d = [(z[0] - MU[0]) / SIG[0], (z[1] - MU[1]) / SIG[1]]
  const lin = g => g[0] * d[0] + g[1] * d[1]
  return {
    alpha: alphaTrue.map((a, j) => a * Math.exp(0.22 * lin(gA[j]))),
    lambda: P.lam.map((l, k) => l * Math.exp(0.18 * lin(gL[k]))),
    w: P.w.map((w, k) => w * Math.exp(0.18 * lin(gW[k]))),
  }
}
const raman = th => R.map((_, i) => remainder[i] + th.alpha.reduce((a, al, j) => a + al * V[j][i], 0))
const NS = 8
const samples = Array.from({ length: NS }, () => { const e = [gauss(), gauss()]; return [MU[0] + SIG[0] * e[0], MU[1] + SIG[1] * e[1]] })

// --- state machine driven by clicks ------------------------------------------------------------------------------
let stepT0 = 0, curStep = -1
watch(() => props.step, s => { curStep = s; stepT0 = performance.now() })

onMounted(() => {
  const host = el.value
  const W = () => host.clientWidth, H = () => host.clientHeight
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, W() / H(), 0.05, 100)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setSize(W(), H())
  host.appendChild(renderer.domElement)
  labels = new CSS2DRenderer(); labels.setSize(W(), H())
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' })
  host.appendChild(labels.domElement)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe8e4dc, 1.7))
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-2, 4, 3); scene.add(key)
  const label = (html, cls, pos) => { const d = document.createElement('div'); d.className = 'vs-label ' + cls; d.innerHTML = html; const o = new CSS2DObject(d); o.position.set(...pos); scene.add(o); return d }

  // a surface from a height function over (i, j) on a w x d footprint at (cx, cz)
  function sheet(nx, nz, h, colour, cx, cz, w, d, mat = 'lambert') {
    const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), idx = []
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const p = (j * nx + i) * 3, y = h(i, j)
      pos.set([cx - w / 2 + w * i / (nx - 1), y, cz - d / 2 + d * j / (nz - 1)], p)
      const c = colour(i, j, y); col.set([c.r, c.g, c.b], p)
    }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, e = c + 1; idx.push(a, c, b, b, c, e) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
    const m = new THREE.Mesh(g, mat === 'lambert' ? new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }) : new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false }))
    scene.add(m); return m
  }
  const floorGrid = (cx, cz, w, d, nx, nz) => {
    const g = []
    for (let k = 0; k <= nx; k++) { const x = cx - w / 2 + w * k / nx; g.push(x, 0, cz - d / 2, x, 0, cz + d / 2) }
    for (let k = 0; k <= nz; k++) { const z = cz - d / 2 + d * k / nz; g.push(cx - w / 2, 0, z, cx + w / 2, 0, z) }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(g, 3))
    const l = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xd6d8d9 })); scene.add(l); return l
  }
  // a trapezoidal block (encoder or decoder), tapering along x
  function block(cx, w, h0, h1, d) {
    const g = new THREE.BufferGeometry()
    const x0 = cx - w / 2, x1 = cx + w / 2, y = 0.75
    const v = [[x0, y - h0 / 2, -d / 2], [x0, y + h0 / 2, -d / 2], [x0, y + h0 / 2, d / 2], [x0, y - h0 / 2, d / 2], [x1, y - h1 / 2, -d / 2], [x1, y + h1 / 2, -d / 2], [x1, y + h1 / 2, d / 2], [x1, y - h1 / 2, d / 2]]
    const f = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [1, 5, 6], [1, 6, 2], [0, 3, 7], [0, 7, 4]]
    g.setAttribute('position', new THREE.Float32BufferAttribute(f.flat().flatMap(k => v[k]), 3)); g.computeVertexNormals()
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: BLOCK })); scene.add(m)
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: INK })); scene.add(e)
    return [m, e]
  }

  // 1  input: the 16 measured frames, every fourth wavenumber
  const STR = 4, nxIn = Math.floor((NX - 1) / STR) + 1
  let inMax = 0
  for (let j = 0; j < 16; j++) for (let i = 0; i < NX; i += STR) inMax = Math.max(inMax, noisyAt(j, i))
  const input = sheet(nxIn, 16, (i, j) => Math.max(0, noisyAt(j, i * STR)) / inMax * 0.8,
    (i, j, y) => { const v = 0.3 + 0.5 * y / 0.8; return new THREE.Color(v, v, v * 1.02) }, -5.0, 0, 1.8, 1.0)
  floorGrid(-5.0, 0, 1.8, 1.0, 6, 4)
  label(tex('x'), 'math', [-5.0, 1.15, 0]); label('Input: 16 frames', 'cap', [-5.0, -0.25, 0.75])

  // 2  encoder
  block(-3.15, 0.9, 1.3, 0.55, 0.8)
  label('Encoder', 'block', [-3.15, 0.75, 0.45])
  label(tex('q_\\phi(z \\mid x)'), 'math', [-3.15, 1.65, 0])

  // 3  latent plane: prior rings, posterior hill, samples
  const LC = -0.9, LS = 0.42 // centre, world units per latent unit
  const lx = z => LC + z * LS
  const ring = (r, col, op) => { const pts = Array.from({ length: 97 }, (_, k) => new THREE.Vector3(LC + r * LS * Math.cos(k / 96 * 6.2832), 0.002, r * LS * Math.sin(k / 96 * 6.2832))); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op })); scene.add(l); return l }
  ring(1, 0x505a5f, 0.6); ring(2, 0x505a5f, 0.35)
  const ax = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(LC - 2.4 * LS, 0, 0), new THREE.Vector3(LC + 2.4 * LS, 0, 0), new THREE.Vector3(LC, 0, -2.4 * LS), new THREE.Vector3(LC, 0, 2.4 * LS)])
  scene.add(new THREE.LineSegments(ax, new THREE.LineBasicMaterial({ color: 0xb1b4b6 })))
  // the posterior density as a hill over the plane (axis 1 along x, axis 2 along z)
  // the hill only covers mu +- 3 sigma, so the prior rings stay clear; latent axis 1 runs along x, axis 2 along z
  const NH = 61, HH = 0.4
  const dens = (a, b) => Math.exp(-0.5 * (((a - MU[0]) / SIG[0]) ** 2 + ((b - MU[1]) / SIG[1]) ** 2))
  const ha = i => MU[0] - 3 * SIG[0] + 6 * SIG[0] * i / (NH - 1), hb = j => MU[1] - 3 * SIG[1] + 6 * SIG[1] * j / (NH - 1)
  const hill = sheet(NH, NH, () => 0, (i, j) => { const v = dens(ha(i), hb(j)); return new THREE.Color().setRGB(0.95, 0.72 + 0.2 * (1 - v), 0.02 + 0.8 * (1 - v), THREE.SRGBColorSpace) }, lx(MU[0]), MU[1] * LS, 6 * SIG[0] * LS, 6 * SIG[1] * LS, 'basic')
  const hillPos = hill.geometry.attributes.position
  const setHill = k => { for (let j = 0; j < NH; j++) for (let i = 0; i < NH; i++) hillPos.setY(j * NH + i, HH * k * dens(ha(i), hb(j))); hillPos.needsUpdate = true }
  setHill(0)
  label(tex('p(z) = \\mathcal{N}(0, I)'), 'mathsm', [LC - 0.95, 0.02, 0.95])
  label('Latent', 'block', [LC, -0.25, 1.15])
  const dotGeo = new THREE.SphereGeometry(0.035, 16, 12)
  const dots = samples.map(() => { const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: INK })); m.visible = false; scene.add(m); return m })
  const muDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), new THREE.MeshBasicMaterial({ color: MEDGE })); muDot.position.set(lx(MU[0]), HH + 0.03, MU[1] * LS); muDot.visible = false; scene.add(muDot)
  const lMu = label(tex('\\mu'), 'math', [lx(MU[0]) + 0.12, HH + 0.25, MU[1] * LS])

  // 4  decoder
  block(1.35, 0.9, 0.55, 1.3, 0.8)
  label('Decoder', 'block', [1.35, 0.75, 0.45])
  label(tex('p_\\theta(x \\mid z)'), 'math', [1.35, 1.65, 0])

  // 5  decoded parameters as bars: alpha (navy, one per peak), lambda and w (one per fluorophore)
  const barGeo = new THREE.BoxGeometry(1, 1, 1); barGeo.translate(0, 0.5, 0)
  const groups = []
  const barGroup = (n, x0, w, colour, z) => {
    const bars = Array.from({ length: n }, (_, k) => { const m = new THREE.Mesh(barGeo, new THREE.MeshLambertMaterial({ color: colour(k) })); m.position.set(x0 + (k + 0.5) * w / n, 0, z); m.scale.set(w / n * 0.7, 0.001, 0.12); scene.add(m); return m })
    floorGrid(x0 + w / 2, z, w, 0.3, 1, 1)
    groups.push(bars); return bars
  }
  const aBars = barGroup(peaks.length, 2.25, 1.3, () => NAVY, -0.45)
  const lBars = barGroup(3, 2.25, 0.55, k => FC[k], 0.25)
  const wBars = barGroup(3, 3.0, 0.55, k => FC[k], 0.25)
  label(tex('\\alpha_j'), 'math', [2.9, 0.95, -0.45]); label(tex('\\lambda_k'), 'math', [2.52, -0.12, 0.6]); label(tex('w_k'), 'math', [3.27, -0.12, 0.6])
  label('Physical parameters', 'cap', [2.9, -0.5, 0.75])
  const aT = peaks.map((_, j) => alphaTrue[j]), lT = P.lam, wT = P.w
  const barH = { a: v => 0.75 * v / Rmax, l: v => 0.55 * Math.log1p(v * 4) / Math.log1p(4 * Math.max(...lT) * 1.6), w: v => 0.55 * v / (Math.max(...wT) * 1.6) }
  const setBars = th => {
    aBars.forEach((b, j) => b.scale.setY(Math.max(0.001, barH.a(th.alpha[j]))))
    lBars.forEach((b, k) => b.scale.setY(Math.max(0.001, barH.l(th.lambda[k]))))
    wBars.forEach((b, k) => b.scale.setY(Math.max(0.001, barH.w(th.w[k]))))
  }

  // 6  Raman output: s(nu) extruded over time (constant), rebuilt from the decoded peaks; earlier samples as ghost lines
  const RX = 5.35, RW = 2.0, RD = 1.0, NZ = 12
  const rs = R.map(r => r / Rmax * 0.75)
  const BLUES = [[0, [222, 235, 247]], [0.35, [158, 202, 225]], [0.65, [66, 146, 198]], [0.85, [33, 113, 181]], [1, [8, 48, 107]]]
  const blues = z => { z = Math.min(1, Math.max(0, z)); let a = BLUES[0], b = BLUES[4]; for (let k = 0; k < 4; k++) if (z >= BLUES[k][0] && z <= BLUES[k + 1][0]) { a = BLUES[k]; b = BLUES[k + 1]; break } const u = (z - a[0]) / (b[0] - a[0] || 1); return new THREE.Color().setRGB(...a[1].map((x, k) => (x + (b[1][k] - x) * u) / 255), THREE.SRGBColorSpace) }
  const ram = sheet(NX, NZ, (i) => 0.001, (i) => blues(Math.pow(rs[i] / 0.75, 0.5)), RX, 0, RW, RD)
  const rPos = ram.geometry.attributes.position
  const setRaman = (spec, k) => { for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) rPos.setY(j * NX + i, Math.max(0.001, spec[i] / Rmax * 0.75 * k)); rPos.needsUpdate = true; ram.geometry.computeVertexNormals() }
  floorGrid(RX, 0, RW, RD, 7, 4)
  label(tex('s(\\nu) = \\sum_j \\alpha_j V_j(\\nu)'), 'math', [RX, 1.15, 0]); label('Raman, rebuilt', 'cap', [RX, -0.5, 0.75])
  const ghostMat = new THREE.LineBasicMaterial({ color: NAVY, transparent: true, opacity: 0.28 })
  const ghosts = samples.map(z => {
    const s = raman(decode(z))
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(s.map((v, i) => new THREE.Vector3(RX - RW / 2 + RW * i / (NX - 1), v / Rmax * 0.75 + 0.003, RD / 2 + 0.02))), ghostMat)
    l.visible = false; scene.add(l); return l
  })

  // flow: particles from the input through the encoder onto the posterior; a spark carries each sample onwards
  const NPART = 70
  const partGeo = new THREE.BufferGeometry(); partGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NPART * 3), 3))
  const parts = new THREE.Points(partGeo, new THREE.PointsMaterial({ color: 0x505a5f, size: 0.035, transparent: true, opacity: 0.8 })); scene.add(parts)
  const pOff = Array.from({ length: NPART }, () => [rnd(), (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.6])
  const flowAt = (u, o) => { // input centre -> encoder -> posterior mean
    const x = -5.0 + (lx(MU[0]) + 5.0) * u, y = 0.45 + 0.35 * Math.sin(Math.PI * u) * (1 - u) + o[1] * (1 - u)
    return [x, Math.max(0.05, y), o[2] * (1 - u) + MU[1] * LS * u]
  }
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: MUST })); spark.visible = false; scene.add(spark)
  const sparkPath = (z, u) => { // z on the plane -> decoder -> bars -> Raman
    const pts = [[lx(z[0]), HH, z[1] * LS], [1.35, 0.75, 0], [2.6, 0.5, 0], [RX, 0.6, 0]]
    const s = u * 3, k = Math.min(2, Math.floor(s)), v = ease(s - k)
    return pts[k].map((a, q) => a + (pts[k + 1][q] - a) * v)
  }

  // camera: a framing per step, eased between them
  const VIEWS = [{ cx: 0.1, w: 13.6 }, { cx: 0.1, w: 13.0 }, { cx: 0.1, w: 13.0 }]
  let camFrom = { ...VIEWS[0] }, camTo = { ...VIEWS[0] }, camT0 = 0
  const VF = 30 * Math.PI / 180
  const placeCam = (v) => {
    const aspect = W() / H(), hf = 2 * Math.atan(Math.tan(VF / 2) * aspect)
    const dist = (v.w / 2) / Math.tan(hf / 2) * 1.12
    const az = -0.18, e = 0.42, tgt = new THREE.Vector3(v.cx, 0.55, 0)
    camera.position.set(tgt.x + dist * Math.sin(az) * Math.cos(e), tgt.y + dist * Math.sin(e), tgt.z + dist * Math.cos(az) * Math.cos(e))
    camera.lookAt(tgt)
  }

  // per-step timelines; t is seconds since the step began
  let lastStep = -2
  const draw = (now) => {
    const step = curStep < 0 ? props.step : curStep
    if (step !== lastStep) { camFrom = { ...(lastStep < 0 ? VIEWS[Math.min(2, step)] : camTo) }; camTo = VIEWS[Math.min(2, step)]; camT0 = now; lastStep = step }
    const t = (now - stepT0) / 1000
    const cu = ease((now - camT0) / 1800)
    placeCam({ cx: camFrom.cx + (camTo.cx - camFrom.cx) * cu, w: camFrom.w + (camTo.w - camFrom.w) * cu })

    // posterior and flow
    const hillK = step >= 1 ? 1 : ease((t - 1.2) / 1.6)
    setHill(hillK)
    const pp = partGeo.attributes.position
    const flowing = step === 0 && t < 4.5
    parts.visible = flowing
    if (flowing) for (let k = 0; k < NPART; k++) { const u = ((t * 0.35 + pOff[k][0]) % 1); pp.setXYZ(k, ...flowAt(u, pOff[k])) }
    pp.needsUpdate = true

    // sampling: one sample every 1.5 s; its spark reaches the bars at 2/3 and the Raman at the end
    if (step >= 1) {
      const PER = 1.5
      const n = step >= 2 ? NS : Math.min(NS, Math.floor(t / PER) + 1)
      const cur = step >= 2 ? -1 : n - 1, u = step >= 2 ? 1 : Math.min(1, (t - cur * PER) / 1.1)
      samples.forEach((z, k) => { dots[k].visible = k < n; dots[k].position.set(lx(z[0]), 0.025 + HH * dens(z[0], z[1]), z[1] * LS) })
      ghosts.forEach((g, k) => { g.visible = k < (cur < 0 ? NS : cur) })
      if (step === 1 && cur >= 0) {
        spark.visible = u < 1; spark.position.set(...sparkPath(samples[cur], u))
        const th = decode(samples[cur])
        if (u > 0.55) setBars(th)
        if (u > 0.9) setRaman(raman(th), 1)
        if (t < 0.3) setRaman(raman(th), 0.001)
      }
      if (step >= 2) {
        // the mean: decoded bold; ghosts stay faint behind
        const k2 = ease(t / 1.2)
        spark.visible = false
        muDot.visible = true; muDot.scale.setScalar(0.4 + 0.6 * k2)
        const th = decode(MU)
        setBars(th); setRaman(raman(th), 1)
      } else muDot.visible = false
    } else {
      dots.forEach(d => (d.visible = false)); ghosts.forEach(g => (g.visible = false)); spark.visible = false; muDot.visible = false
      setBars({ alpha: aT.map(() => 0), lambda: [0, 0, 0], w: [0, 0, 0] }); setRaman(R, 0.001)
    }
    lMu.style.opacity = step >= 2 ? 1 : 0
    renderer.render(scene, camera); labels.render(scene, camera)
  }

  stepT0 = performance.now(); curStep = props.step
  const frame = (now) => { raf = requestAnimationFrame(frame); if (active.value) draw(now) }
  draw(performance.now())
  raf = requestAnimationFrame(frame)
  ro = new ResizeObserver(() => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); labels.setSize(W(), H()); draw(performance.now()) })
  ro.observe(host)
})

onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect(); renderer?.dispose() })
</script>

<template>
  <div ref="el" class="vae-scene" />
</template>

<style>
.vae-scene { position: relative; width: 100%; height: 100%; }
.vae-scene canvas { display: block; width: 100% !important; height: 100% !important; }
.vs-label { font-family: 'Hanken Grotesk', Arial, sans-serif; white-space: nowrap; color: var(--ink); }
.vs-label.block { font-size: 24px; font-weight: 700; }
.vs-label.cap { font-size: 20px; font-weight: 600; color: var(--mute); }
.vs-label.note { font-size: 16px; color: var(--mute); }
.vs-label.math { font-size: 26px; }
.vs-label.mathsm { font-size: 20px; color: var(--mute); }
</style>
