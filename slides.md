---
title: LUMOS
info: Unsupervised Physics Informed Decomposition of Incomplete Time-Resolved Spectroscopy. NeurIPS 2026.
canvasWidth: 1920
aspectRatio: 16/9
colorSchema: light
routerMode: hash
transition: fade
highlighter: shiki
fonts:
  sans: Hanken Grotesk
  serif: Hanken Grotesk
  mono: Space Mono
  weights: '400,600,700'
  provider: google
layout: default
class: cover
---

<script setup>
import CoverGlow from './components/CoverGlow.vue'
</script>

<div class="glow-stage"><CoverGlow /></div>

<div class="glow-text">
  <span class="tag">NeurIPS 2026</span>
  <h1>Unsupervised Physics Informed Decomposition of Incomplete Time-Resolved Spectroscopy</h1>
  <p class="glow-sub"><b>LUMOS</b>: Latent Un-Mixing of partially Observed Spectra</p>
  <div class="glow-authors">
    <p><b>Tom Muir</b>, Qifeng Liu, Mohammadrahim Kazemzadeh, William Mills, Aleš Leonardis, Huabing Yin, Alexander Krull</p>
    <p class="glow-aff">University of Birmingham · University of Glasgow</p>
  </div>
</div>

<style>
.cover { padding: 0 !important; background: #05080f !important; }
.glow-stage { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
.glow-text { position: absolute; left: 80px; top: 0; width: 800px; height: 1080px; display: flex; flex-direction: column; justify-content: center; gap: 26px; color: #f3f2f1; }
.glow-text .tag { align-self: flex-start; margin: 0; }
.glow-text h1 { font-size: 62px; line-height: 1.08; font-weight: 700; color: #fff; }
.glow-sub { font-size: 28px; color: #e6e4df; }
.glow-authors { display: flex; flex-direction: column; gap: 8px; font-size: 22px; border-top: 2px solid rgba(255, 255, 255, 0.55); padding-top: 20px; color: #d8d6d2; }
.glow-aff { color: #a9adb0; font-size: 20px; }
</style>

<!--
- LUMOS: unsupervised decomposition of short Raman bleaching series
- Each line: the spectrum at one moment, time running towards us (real pharmaceutical sample)
- Orange: fluorescence, bleaching away over about a minute
- White lines at the back: all we measure, the first 16 frames, 1.6 s
- Bright blue line at the front: the Raman spectrum we want
-->

---
layout: default
class: cover
disabled: true
---

<div class="cover-text">
  <span class="tag">NeurIPS 2026</span>
  <h1>Unsupervised Physics Informed Decomposition of Incomplete Time-Resolved Spectroscopy</h1>
  <p class="cover-sub"><b>LUMOS</b>: Latent Un-Mixing of partially Observed Spectra</p>
  <div class="cover-authors">
    <p><b>Tom Muir</b>, Qifeng Liu, Mohammadrahim Kazemzadeh, William Mills, Aleš Leonardis, Huabing Yin, Alexander Krull</p>
    <p class="caption">University of Birmingham · University of Glasgow</p>
  </div>
</div>

<div class="cover-surface">
  <CoverStack :zoom="1.16" />
  <p class="caption">Pharmaceutical test sample: the Raman signal (black outline) sits under fluorescence that takes about a minute to bleach away. LUMOS recovers it from the first 16 frames (dark), 1.6 s. Square-root time axis; noise not shown.</p>
</div>

<style>
.cover { padding: 0 !important; }
.cover-text { position: absolute; left: 80px; top: 0; width: 820px; height: 1080px; display: flex; flex-direction: column; justify-content: center; gap: 28px; }
.cover-text .tag { align-self: flex-start; margin: 0; }
.cover-text h1 { font-size: 68px; line-height: 1.08; font-weight: 700; }
.cover-sub { font-size: 30px; }
.cover-authors { display: flex; flex-direction: column; gap: 8px; font-size: 24px; border-top: 2px solid var(--ink); padding-top: 20px; }
.cover-surface { position: absolute; left: 880px; top: 70px; width: 1010px; height: 920px; }
.cover-surface .caption { position: absolute; bottom: -10px; width: 100%; text-align: center; }
.cover-legend { position: absolute; bottom: 95px; width: 100%; display: flex; justify-content: center; gap: 18px; font-size: 24px; font-weight: 700; }
.cover-legend b { color: var(--ink); } .cover-legend .k0 { color: #00703c; } .cover-legend .k1 { color: #4c2c92; } .cover-legend .k2 { color: #d4351c; } .cover-legend .k3 { color: #12365b; }
</style>

<!--
- LUMOS: unsupervised decomposition of short Raman bleaching series
- Black outline at the front: the Raman spectrum we want
- Orange: fluorescence on top of it, bleaching away over about a minute
- Dark: all we measure, the first 16 frames, 1.6 s (noisy in reality, next slide)
- Goal: recover the black outline from the dark part
-->

---
clicks: 7
disabled: true
---

<div class="head"><span class="tag">Background</span><h2>What is the Raman effect?</h2></div>

<div class="raman-stage">
  <RamanEffect :step="$clicks" />
</div>

<img v-click="7" class="raman-eq" src="/img/raman-shift-eq.png" alt="Raman shift equals the inverse laser wavelength minus the inverse scattered wavelength">

<style>
.raman-stage { position: absolute; left: 150px; top: 175px; width: 1619px; height: 718px; }
.raman-eq { position: absolute; left: 546px; top: 893px; width: 828px; height: 172px; object-fit: contain; }
</style>

<!--
- Click: laser photon hits water
- Click: most scatter elastically, Rayleigh, same colour
- Click: a tiny fraction inelastic, Raman; red, loses energy to the bond
- Click: benzene; click: Rayleigh; click: yellow photon gains energy from the bond
- Click: shift = bond vibration energy
-->

---

<div class="head"><span class="tag">Background</span><h2>Raman spectroscopy</h2></div>

<img class="spec-instrument" src="/img/spectrometer.png" alt="Spectrometer: laser, filter, grating and CCD detector">
<script setup>
import SpectrumStrip from './components/SpectrumStrip.vue'
</script>

<div class="spec-strip"><SpectrumStrip :step="$clicks" /></div>

<div v-click="3" class="spec-text">
  <p>Measure and plot Raman shifts</p>
  <p>Different molecules have unique sets of chemical bonds</p>
  <p>The Raman spectrum acts as a biological fingerprint for the sample</p>
</div>

<div class="spec-problems">
  <p v-click="4" class="eyebrow">Two problems</p>
  <div v-click="4" class="problem"><span class="num">1</span><div><p class="name">Fluorescence</p><p>A background far stronger than the Raman</p></div></div>
  <div v-click="5" class="problem"><span class="num">2</span><div><p class="name">Noise</p><p>The Raman signal is weak, so shot noise swamps it</p></div></div>
</div>

<p class="caption spec-source">Instrument diagram: Schmid and Dariz, Heritage 2019, 2, 1662–1683. Detector strip and spectrum: the Raman spectrum of pharmaceutical test sample 3349; the strip is a rendering of that spectrum, not a camera image.</p>

<style>
.spec-instrument { position: absolute; left: 80px; top: 230px; width: 448px; height: 660px; object-fit: contain; }
.spec-strip { position: absolute; left: 560px; top: 250px; width: 690px; height: 630px; }
.spec-text { position: absolute; left: 1290px; top: 230px; width: 550px; display: flex; flex-direction: column; gap: 14px; }
.spec-problems { position: absolute; left: 1290px; top: 600px; width: 550px; display: flex; flex-direction: column; gap: 22px; }
.problem { display: flex; gap: 22px; align-items: flex-start; }
.problem .num { flex: none; width: 64px; height: 64px; background: var(--neutral); border: 2px solid var(--ink); font-size: 40px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.problem .name { font-size: 40px; font-weight: 700; line-height: 1.1; }
.problem p:not(.name) { font-size: 26px; }
.spec-source { position: absolute; left: 80px; top: 960px; width: 1760px; }
</style>

<!--
- Filter out Rayleigh, grating onto CCD
- Click: light spread across the detector, bright bands
- Click: read out as a spectrum; each band is a peak
- Peaks = chemical fingerprint
- Two problems: fluorescence, noise
-->

---
disabled: true
---

<div class="head"><span class="tag">The problem</span><h2>Fluorescence</h2></div>

<img v-click="1" class="fl-photo fl-left" src="/img/jellyfish.jpg" alt="Fluorescent jellyfish">
<img v-click="2" class="fl-photo fl-right" src="/img/micrograph.webp" alt="Fluorescence micrograph of an osteosarcoma cell">
<p v-click="2" class="caption fl-credit">Source: Howard Vindin</p>

<div class="fl-plot fl-left-plot">
  <img v-click="3" src="/img/obs1.webp" alt="Observed spectrum">
  <img v-click="4" src="/img/obs2.webp" alt="Observed spectrum with the fluorescence baseline">
  <img v-click="5" src="/img/obs3.webp" alt="Observed spectrum, fluorescence baseline and true Raman">
</div>
<div class="fl-plot fl-right-plot">
  <img v-click="6" src="/img/fluorophores.webp" alt="Individual fluorophore components summing to the baseline">
</div>

<style>
.fl-photo { position: absolute; top: 240px; height: 300px; object-fit: contain; }
.fl-left { left: calc(80px + (848px - 452px) / 2); width: 452px; }
.fl-right { left: calc(992px + (848px - 385px) / 2); width: 385px; }
.fl-credit { position: absolute; left: 992px; width: 848px; top: 548px; text-align: center; }
.fl-plot { position: absolute; top: 590px; width: 848px; height: 470px; }
.fl-plot img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.fl-left-plot { left: 80px; }
.fl-right-plot { left: 992px; }
</style>

<!--
- Whisper at a loud concert
- Far stronger than Raman
- Many fluorophores, additive
- Varies by sample, bleaches over time
- Baseline = sum of fluorophores
-->

---
clicks: 2
disabled: true
---

<div class="head"><span class="tag">The problem</span><h2>Noise</h2></div>

<div class="noise-stage"><PhotonRain /></div>

<div class="noise-text">
  <p class="name">Shot noise</p>
  <p>Photons arrive as a Poisson count, so the variance equals the signal.</p>
  <div class="noise-eq">

$$\mathrm{SNR} = \frac{N}{\sqrt{N}} = \sqrt{N}$$

  </div>
  <p v-click="1">The signal is Raman <i>plus</i> fluorescence, so most of the noise comes from the baseline.</p>
  <div v-click="2" class="callout"><p>Same Raman photons, more noise. Subtracting the baseline afterwards cannot remove its noise.</p></div>
</div>

<p class="caption noise-cap">Synthetic spectrum. Each streak is a photon landing in its bin (a sample is drawn). Dashed: the true Raman. Both rows get the same photons at the strongest band, rising from 10 to 1,000.</p>

<style>
.noise-stage { position: absolute; left: 80px; top: 200px; width: 1180px; height: 640px; }
.noise-text { position: absolute; left: 1320px; top: 210px; width: 520px; display: flex; flex-direction: column; gap: 22px; }
.noise-text .name { font-size: 40px; font-weight: 700; line-height: 1.1; }
.noise-eq { font-size: 26px; margin: -10px 0; }
.noise-eq .katex-display { margin: 0; text-align: left; }
.noise-eq .katex-display > .katex { text-align: left; }
.noise-cap { position: absolute; left: 80px; top: 860px; width: 1180px; }
</style>

<!--
- Poisson: variance = signal, SNR = √N
- Photons rain into bins; the spectrum builds as a histogram
- Top row gets far more photons: the baseline's
- Counter: photons at the strongest band, rising once
- Dashed: true Raman
- Blue: Raman alone; mustard: same Raman on a baseline, baseline subtracted
- Mustard always noisier, its SNR lags (top right)
- Click: the baseline adds photons, so adds noise
- Click: subtracting removes the baseline, not its noise
-->

---
disabled: true
---

<div class="head"><span class="tag">Background</span><h2>Raman bleaching</h2></div>

<div class="rb-text">
  <p>A way to remove the fluorescence background: keep the laser on and let it destroy the fluorophores.</p>
  <p>Raman scattering absorbs no photons, so the Raman stays constant through time.</p>
</div>

<div class="rb-cells"><FadingCells /></div>
<div class="rb-cells-text">
  <p>Fluorescent labels in cells fade the same way under the laser.</p>
  <p class="caption">The image fades from before to after bleaching, following this sample's total fluorescence.</p>
</div>

<div class="rb-surface"><Surface3D :series="bleach" :grow="12" :t-max="60" :rows="200" :row-power="2" :upsample="1" :show-clock="false" :orbit="false" interactive :az="-0.5" :radius="4.9" /></div>
<div class="rb-parts"><BleachParts :duration="12" :t-max="60" /></div>
<p class="caption rb-note">Simulated pharmaceutical sample, 60 s of bleaching shown in 12 s. LUMOS sees only the first 1.6 s.</p>

<script setup>
import { series as bleach } from './data/pharma-3349.js'
</script>

<style>
.rb-text { position: absolute; left: 80px; top: 230px; width: 800px; display: flex; flex-direction: column; gap: 18px; }
.rb-cells { position: absolute; left: 940px; top: 200px; width: 280px; height: 280px; }
.rb-cells-text { position: absolute; left: 1260px; top: 210px; width: 580px; display: flex; flex-direction: column; gap: 16px; }
.rb-surface { position: absolute; left: 40px; top: 470px; width: 880px; height: 600px; }
.rb-parts { position: absolute; left: 940px; top: 530px; width: 900px; height: 450px; }
.rb-note { position: absolute; left: 940px; top: 990px; width: 900px; }
</style>

<!--
- Laser destroys fluorophores over time
- Raman does not bleach
- Plays once: 60 s of bleaching in 12 s, slow at first
- Left: series being recorded, simulated pharma sample
- Right: the current frame split into its true parts
- mRuby3 gone in 2 s; SYFP2 takes about a minute
- Raman constant throughout
- LUMOS sees only the first 1.6 s
- Surface: drag to rotate, scroll to zoom, double-click to reset
-->

---
clicks: 3
disabled: true
---

<div class="head"><span class="tag">Background</span><h2>Modelling photobleaching</h2></div>

<div class="pb-text">
  <p v-click="1">Photobleaching follows first-order kinetics: the rate of bleaching is proportional to what remains.</p>
  <div v-click="2" class="pb-row"><p>So each fluorophore decays exponentially</p><span class="pb-eq"><Tex src="N(t) = N_0\, e^{-\lambda t}" /></span></div>
</div>

<div v-click="3" class="pb-fig pb-left">
  <img src="/img/bleach-fit.png" alt="A three-exponential fit to real bleaching data">
  <p class="pb-eq"><Tex src="I(t) = \sum_i A_i\, e^{-\lambda_i t} + c" /></p>
</div>
<div v-click="3" class="pb-fig pb-right">
  <img src="/img/bleach-components.webp" alt="The individual fluorophore components summing to the baseline">
  <p class="caption">One exponential per fluorophore, each with its own spectrum</p>
</div>

<style>
.pb-text { position: absolute; left: 80px; top: 230px; width: 1700px; display: flex; flex-direction: column; gap: 22px; }
.pb-row { display: flex; align-items: center; gap: 28px; }
.pb-eq { font-size: 34px; }
.pb-fig { position: absolute; top: 420px; width: 840px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.pb-fig img { width: 100%; height: 500px; object-fit: contain; }
.pb-left { left: 80px; }
.pb-right { left: 1000px; }
</style>

<!--
- First-order kinetics: rate ∝ what remains, so exponential
- λ = decay rate
- Real data: a sum of exponentials fits almost perfectly (R² 0.9998)
- One per fluorophore
-->

---
clicks: 5
---

<div class="head"><span class="tag">Method</span><h2>Can we model this in full?</h2></div>

<script setup>
import { ref } from 'vue'
const mfStage = ref(0)
</script>

<div class="mf-live"><DecompositionLive :step="$clicks" @stage="v => mfStage = v" /></div>

<div :class="{ 'mf-off': !(mfStage >= 2 && mfStage < 5) }" class="mf-sym" style="left: 40px"><Tex src="y(\nu, t)" /></div>
<div :class="{ 'mf-off': !(mfStage >= 2 && mfStage < 5) }" class="mf-op" style="left: 605px">=</div>
<div :class="{ 'mf-off': !(mfStage >= 2 && mfStage < 5) }" class="mf-sym" style="left: 670px"><Tex src="\underbrace{s(\nu)}_{\text{Raman}}" /></div>
<div :class="{ 'mf-off': !(mfStage >= 2 && mfStage < 5) }" class="mf-op" style="left: 1235px">+</div>
<div :class="{ 'mf-off': !(mfStage >= 2 && mfStage < 5) }" class="mf-sym" style="left: 1300px"><Tex src="\underbrace{F(\nu, t)}_{\text{Fluorescence}}" /></div>

<div :class="{ 'mf-off': !(mfStage >= 3 && mfStage < 5) }" class="mf-legend"><span class="k0">SYFP2</span><span class="k1">mRuby3</span><span class="k2">TagRFP</span></div>
<div :class="{ 'mf-off': !(mfStage >= 3 && mfStage < 5) }" class="mf-eq"><Tex src="F(\nu, t) = \sum_{i=1}^{N} w_i\, B_i(\nu)\, e^{-\lambda_i t}" :display="true" /></div>
<div :class="{ 'mf-off': !(mfStage >= 4 && mfStage < 5) }" class="mf-defs">
  <div><p><Tex src="N" /> : number of fluorophores</p><p><Tex src="s" /> : Raman signal (fixed)</p></div>
  <div><p><Tex src="B_i" /> : fluorophore spectra</p><p><Tex src="w_i" /> : weight / abundance</p><p><Tex src="\lambda_i" /> : decay rate</p></div>
</div>
<p :class="{ 'mf-off': mfStage < 5 }" class="mf-few">LUMOS is given only the first few frames: here 16 of 160.</p>
<p class="caption mf-cap">Pharmaceutical test sample 3349: simulated bleaching of a real Raman spectrum. The dataset holds 10 s; the last 6 s continue it with the same noise model.</p>

<style>
.mf-live { position: absolute; left: 40px; top: 150px; width: 1840px; height: 800px; }
.mf-sym { position: absolute; top: 690px; width: 580px; display: flex; justify-content: center; font-size: 46px; }
.mf-op { position: absolute; top: 675px; width: 60px; text-align: center; font-size: 72px; font-weight: 700; }
.mf-legend { position: absolute; left: 1300px; top: 170px; width: 580px; display: flex; justify-content: center; gap: 28px; font-size: 24px; font-weight: 700; }
.mf-legend .k0 { color: #00703c; } .mf-legend .k1 { color: #4c2c92; } .mf-legend .k2 { color: #d4351c; }
.mf-defs { position: absolute; left: 80px; top: 870px; width: 1000px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 30px; }
.mf-defs > div { display: flex; flex-direction: column; gap: 6px; }
.mf-eq { position: absolute; left: 1150px; top: 860px; width: 700px; font-size: 40px; }
.mf-eq .katex-display { margin: 0; }
.mf-few { position: absolute; left: 80px; top: 930px; width: 1760px; text-align: center; font-size: 38px; font-weight: 700; }
.mf-sym, .mf-op, .mf-legend, .mf-eq, .mf-defs, .mf-few { transition: opacity 0.45s ease; }
.mf-off { opacity: 0; }
.mf-cap { position: absolute; left: 80px; top: 1030px; width: 1760px; }
</style>

<!--
- Opens on the measured series, noise and all
- Click: noise clears, it comes apart: Raman lifts off, fluorescence beneath
- Click: input slides left, y = s + F
- Click: fluorescence fans into its three fluorophores
- Click: definitions
- Click: it all runs back into the measurement; then only the first few frames stay solid, the rest is never given to LUMOS
- Here 16 frames; on the real cells 16 of the roughly 150 to 200 recorded
- Observed = constant Raman + decaying fluorescence
- Same simulated sample as before, true parts
- Each fluorophore: spectrum, abundance, decay rate
- N is a hyperparameter
- All unknown per sample, no labels
-->

---
disabled: true
---

<div class="head"><span class="tag">Method</span><h2>LUMOS sees only the first 16 frames</h2></div>

<div class="ff-stage"><CoverStack :zoom="1.45" /></div>
<p class="caption ff-cap">Pharmaceutical test sample 3349. Grey: the 16 noisy frames given to LUMOS (1.6 s). Colour: the clean series to 60 s on a square-root time axis, orange while fluorescence dominates, blue as it converges to the Raman alone.</p>

<style>
.ff-stage { position: absolute; left: 160px; top: 150px; width: 1600px; height: 820px; }
.ff-cap { position: absolute; left: 80px; top: 985px; width: 1760px; text-align: center; }
</style>

<!--
- Grey: all LUMOS is given, 16 noisy frames, 1.6 s
- Full bleaching takes about a minute
- Colour: what has to be inferred, down to the Raman alone
- Same input in training and at inference
-->

---
class: dark
disabled: true
---

<div class="dark-body">
  <h1>How do we learn what we never observe?</h1>
  <p v-click>We only measure the frames <Tex src="x" />. The Raman, fluorescence and decay rates are hidden. LUMOS uses just the first few frames, in training and at inference.</p>
</div>

<!--
- Pose it, pause
- Only frames; everything we want is hidden
- Few frames is a choice: never needs full bleaching
- Unsupervised: hidden causes z that rebuild x
- VAE: probabilistic, z is a distribution
-->

---

<div class="head"><span class="tag">Method</span><h2>Inferring the unknowns with a VAE</h2></div>

<p class="vae-in-label">Input <Tex src="x" /></p>
<img class="vae-in" src="/img/vae-input.svg" alt="Input: the first frames of a noisy bleaching series as a grey surface over time and wavenumber">
<div class="vae-stage"><VaePrimer /></div>

<style>
.vae-in-label { position: absolute; left: 30px; top: 395px; width: 440px; text-align: center; font-size: 32px; font-weight: 700; }
.vae-in { position: absolute; left: 30px; top: 440px; width: 440px; height: 420px; object-fit: contain; }
.vae-stage { position: absolute; left: 470px; top: 335px; width: 1390px; height: 560px; }
.vae-def { position: absolute; top: 780px; width: 540px; display: flex; flex-direction: column; gap: 10px; }
.vae-def .name { font-size: 34px; font-weight: 700; }
</style>

<!--
- Samples drawn one at a time, eight then it holds
- Latent z: the hidden causes
- Decoder = likelihood: what we would measure given z
- Encoder approximates the posterior; train on the ELBO
- Spread exaggerated for clarity, not LUMOS's real posterior
-->

---
clicks: 7
disabled: true
---

<div class="head"><span class="tag">Method</span><h2>Model architecture</h2></div>

<div class="arch">
  <img v-click="1" src="/img/arch-paper-1.png" alt="Input: an incomplete bleaching series">
  <img v-click="2" src="/img/arch-paper-2.png" alt="CNN encoder into the latent code">
  <img v-click="3" src="/img/arch-paper-3.png" alt="Decoder outputs peak intensities, decay rates and abundances">
  <img v-click="4" src="/img/arch-paper-4.png" alt="Raman peaks give the Raman spectrum, with L1 regularisation">
  <img v-click="5" src="/img/arch-paper-5.png" alt="Fluorophore spectra give the sum of decaying fluorophores">
  <img v-click="6" src="/img/arch-paper-6.png" alt="Noise model, reconstruction and the reconstruction and KL losses">
</div>

<div class="arch-steps">
  <p v-click="1">Given an incomplete Raman photobleaching time series</p>
  <p v-click="2">Map to latent space via a CNN encoder</p>
  <p v-click="3">Sample from the latent space and decode into parameters</p>
  <p v-click="4">Reconstruct using the learnt parameters</p>
  <p v-click="7">Train on the residual between reconstruction and input, plus regularisation</p>
</div>

<div class="arch-eq">
  <span v-click="6" class="lhs"><Tex src="\hat y_{\nu,\tau} =" /></span>
  <div v-click="4" class="box raman"><div class="frame"><Tex src="\Delta t \sum_{j=1}^{m} \alpha^j\, V^j_\nu" :display="true" /></div><p class="lbl">Raman peaks</p></div>
  <span v-click="5" class="plus">+</span>
  <div v-click="5" class="box fluor"><div class="frame"><Tex src="\sum_{k=1}^{K} w^k\, B^k_\nu \int_{t_\tau}^{t_{\tau+1}} e^{-t\lambda^k}\, \mathrm{d}t" :display="true" /></div><p class="lbl">Fluorophore spectra</p></div>
</div>
<p v-click="7" class="arch-loss"><Tex src="\mathcal{L} = \mathcal{L}_{\mathrm{rec}} + \mathcal{L}_{\mathrm{KL}} + \rho\, \mathcal{L}_{\mathrm{reg}}" /></p>

<style>
.arch { position: absolute; left: 80px; top: 170px; width: 1760px; height: 416px; }
.arch img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.arch-steps { position: absolute; left: 80px; top: 640px; width: 900px; display: flex; flex-direction: column; gap: 22px; font-size: 32px; }
.arch-eq { position: absolute; left: 1000px; top: 630px; width: 880px; display: flex; align-items: flex-start; gap: 18px; font-size: 30px; }
.arch-eq .lhs { margin-top: 50px; }
.arch-eq .plus { margin-top: 44px; font-size: 44px; }
.arch-eq .box { display: flex; flex-direction: column; align-items: center; }
.arch-eq .frame { padding: 8px 18px; border: 3px solid; }
.arch-eq .frame .katex-display { margin: 0; }
.arch-eq .lbl { margin-top: 10px; font-size: 26px; }
.arch-eq .box.raman .frame { border-color: #ec846c; }
.arch-eq .box.raman .lbl { color: #c04d34; }
.arch-eq .box.fluor .frame { border-color: #6cc46e; }
.arch-eq .box.fluor .lbl { color: #3d8a40; }
.arch-loss { position: absolute; left: 1060px; top: 880px; font-size: 34px; }
</style>

<!--
- Short series in
- CNN encoder to a latent distribution
- Decoder: peak intensities, decay rates, abundances
- Physics rebuilds the series: Raman peaks + decaying fluorophores
- Loss: reconstruction + KL + L1 on the Raman
- Peak shapes, fluorophore spectra, noise model: shared, learnt
-->

---

<div class="head"><span class="tag">Results</span><h2>Real human cells: best and most consistent</h2></div>

<script setup>
import BoxPlots from './components/BoxPlots.vue'
</script>

<div class="bx"><BoxPlots /></div>
<p class="caption bx-cap">Human cells test set (54 measured series). Each dot is one sample; boxes show the median and interquartile range. Higher is better. LUMOS never sees a clean spectrum; the fine-tuned RADAR baselines are supervised.</p>

<style>
.bx { position: absolute; left: 80px; top: 200px; width: 1760px; height: 775px; }
.bx-cap { position: absolute; left: 80px; top: 990px; width: 1760px; }
</style>

<!--
- Real measured cells, not simulation
- Each dot one test sample, two metrics
- Methods appear left to right; LUMOS last: highest median, tightest box
- Beats the supervised fine-tuned RADAR too, without ever seeing a clean spectrum
- Simulated datasets in the paper: same picture against unsupervised methods
-->

---
disabled: true
---

<div class="head"><span class="tag">Results</span><h2>Lower error on every dataset and metric</h2></div>

<p class="res-sub">How much LUMOS reduces error compared with the best method that also never sees ground truth.</p>
<div class="res-grid"><ResultsGrid /></div>
<p class="caption res-cap">From Table 1, against the best non-learning or unsupervised method for each metric, with its better input (sum of the first 16 frames, or the last frame). PSNR and SI-PSNR: reduction in mean squared error. Pearson: reduction in 1 − r, from two-decimal values, so approximate. Spectral angle: reduction in angle.</p>

<style>
.res-sub { position: absolute; left: 80px; top: 220px; width: 1760px; }
.res-grid { position: absolute; left: 80px; top: 300px; width: 1760px; height: 540px; }
.res-cap { position: absolute; left: 80px; top: 880px; width: 1760px; }
</style>

<!--
- Every cell is a win over the best comparable method
- Four metrics, same story
- Real cells: 12 to 40%, depending on metric
- Up to 77% on simulated data
- Next: against supervised
-->

---
clicks: 2
disabled: true
---

<div class="head"><span class="tag">Results</span><h2>Finding peaks in real cells</h2></div>

<p class="vs-sub">Supervised RADAR was fine-tuned on this dataset's reference spectra. LUMOS never sees one.</p>
<img class="vs-pr" src="/img/pr-curve.png" alt="Precision-recall curves for peak detection on Human Cells: LUMOS lies above every baseline, AP 0.377 against 0.296 for the best unsupervised method and 0.213 for supervised RADAR">

<div class="vs-stat" style="top: 300px">
  <p class="eyebrow">Average precision over supervised RADAR</p>
  <p class="big">+77%</p>
  <p class="caption">0.377 vs 0.213; +27% over the best unsupervised method</p>
</div>
<div v-click="1" class="vs-stat" style="top: 540px">
  <p class="eyebrow">Best F1 over supervised RADAR</p>
  <p class="big">+36%</p>
  <p class="caption">0.529 vs 0.390; +14% over the best unsupervised method</p>
</div>
<div v-click="2" class="callout vs-note"><p>Also ahead of supervised RADAR on all four spectral metrics, e.g. Pearson 0.94 vs 0.89.</p></div>

<p class="caption vs-cap">Human cells test set. A strict task: peaks count only within 5 cm⁻¹ of the reference, and no method reaches 0.4 average precision. Gains are relative to the best variant of each method (Appendix Figure 9). Supervised RADAR is stronger on simulated RRUFF and Wheat.</p>

<style>
.vs-sub { position: absolute; left: 80px; top: 220px; width: 1760px; }
.vs-pr { position: absolute; left: 80px; top: 280px; width: 800px; height: 655px; object-fit: contain; }
.vs-stat { position: absolute; left: 980px; width: 860px; display: flex; flex-direction: column; gap: 6px; }
.vs-stat .big { font-size: 120px; font-weight: 700; line-height: 1; }
.vs-note { position: absolute; left: 980px; top: 790px; width: 860px; }
.vs-cap { position: absolute; left: 80px; top: 960px; width: 1760px; }
</style>

<!--
- Peak finding: what users do with the spectrum
- LUMOS curve above every baseline
- Hard task, every method scores low
- AP +77% over supervised RADAR
- Click: F1
- Click: spectral metrics too
-->

---

<div class="head"><span class="tag">Results</span><h2>Qualitative comparison</h2></div>

<script setup>
import QualFig from './components/QualFig.vue'
</script>

<div class="qf"><QualFig /></div>
<p class="caption qf-cap">One representative test sample per dataset. Top: the 16 input frames. Bottom: recovered Raman spectra against the ground truth (GT). Human cells are real measurements; the other four are simulated.</p>

<style>
.qf { position: absolute; left: 80px; top: 200px; width: 1760px; height: 743px; }
.qf-cap { position: absolute; left: 80px; top: 975px; width: 1760px; }
</style>

<!--
- One sample per dataset; human cells real, the rest simulated
- Top: what goes in; bottom: what comes out
- Lines draw in: ground truth, classical, supervised RADAR, then LUMOS
- LUMOS tracks the ground truth, without the high-frequency noise
-->

---

<div class="head"><span class="tag">Results</span><h2>The physics parameters group cell types</h2></div>

<script setup>
import UmapGrid from './components/UmapGrid.vue'
</script>

<div class="ug"><UmapGrid /></div>
<p class="caption ug-cap">UMAP (a 2D map that places similar samples close together) of each quantity LUMOS extracts from the Human cells data, coloured by cell type. MCF-7 is a breast cancer cell line.</p>

<style>
.ug { position: absolute; left: 180px; top: 190px; width: 1560px; height: 790px; }
.ug-cap { position: absolute; left: 80px; top: 995px; width: 1760px; }
</style>

<!--
- Four cell types; MCF-7 = breast cancer line
- Input: types mixed
- Raman and latent: some structure
- Decay rates and abundances: tight groups; bone separates
- Biology from the decomposition, no labels
- An indication, not a classifier
-->

---
clicks: 2
disabled: true
---

<div class="head"><span class="tag">Summary</span><h2>LUMOS in one slide</h2></div>

<div class="flow">
  <div class="fbox"><p class="t">Short, incomplete bleaching series</p><p class="caption">First 16 frames, 1.6 s, noisy</p></div>
  <div class="arrow" />
  <div class="fbox key"><p class="t big">LUMOS</p><p>Physics-constrained VAE, trained without ground truth</p></div>
  <div class="arrow" />
  <div class="fbox"><p class="t">Clean Raman spectrum</p><p class="t">Fluorophores and their decay rates</p><p class="t">A model of the measurement noise</p></div>
</div>

<div v-click="1" class="stats">
  <div><p class="big">63%</p><p>lower error than the best comparable method, at most (SI-PSNR); lower on all five datasets, 29% on real cells</p></div>
  <div><p class="big">1.8×</p><p>the peak-finding average precision of supervised RADAR on real cells</p></div>
  <div><p class="big">8×</p><p>less acquisition time: 8 frames beat the baselines given 64</p></div>
</div>

<div v-click="2" class="callout sum-note"><p>The fluorescence decay is itself informative: learnt decay rates and abundances group cell types.</p></div>

<p class="caption sum-cap">63%: simulated Wheat, Table 1 SI-PSNR. 1.8×: average precision 0.377 vs 0.213, Human cells. 8×: Cancer, Table 3.</p>

<style>
.flow { position: absolute; left: 80px; top: 210px; width: 1760px; height: 210px; display: grid; grid-template-columns: 1fr 80px 1fr 80px 1.25fr; align-items: stretch; gap: 20px; }
.fbox { border: 3px solid var(--ink); padding: 24px 28px; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.fbox .t { font-size: 30px; font-weight: 700; line-height: 1.2; }
.fbox.key { background: var(--navy); color: #fff; border-color: var(--navy); }
.fbox .big { font-size: 48px; }
.flow .arrow { align-self: center; height: 4px; background: var(--ink); position: relative; }
.flow .arrow::after { content: ''; position: absolute; right: -2px; top: -12px; border-left: 22px solid var(--ink); border-top: 14px solid transparent; border-bottom: 14px solid transparent; }
.stats { position: absolute; left: 80px; top: 480px; width: 1760px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; }
.stats > div { border-top: 4px solid var(--ink); padding-top: 18px; display: flex; flex-direction: column; gap: 10px; }
.stats .big { font-size: 110px; font-weight: 700; line-height: 1; }
.stats p:not(.big) { font-size: 28px; }
.sum-note { position: absolute; left: 80px; top: 830px; width: 1760px; }
.sum-cap { position: absolute; left: 80px; top: 970px; width: 1760px; }
</style>

<!--
- Few frames in, three things out
- No ground truth at any point
- Click: the numbers
- Click: decay is signal, not just nuisance
-->

---
class: dark
---

<div class="dark-body">
  <h1>Thank you</h1>
  <p>Unsupervised Physics Informed Decomposition of Incomplete Time-Resolved Spectroscopy</p>
  <p class="small">Tom Muir, Qifeng Liu, Mohammadrahim Kazemzadeh, William Mills, Aleš Leonardis, Huabing Yin, Alexander Krull<br>University of Birmingham · University of Glasgow</p>
  <div class="ty-find">
    <div class="ty-qr"><img src="/img/qr-code.svg" alt="QR code for the LUMOS code repository"><div><p class="ty-k">Code</p><p class="ty-v">github.com/krulllab/LUMOS</p></div></div>
    <div class="ty-qr"><img src="/img/qr-data.svg" alt="QR code for the human cell dataset"><div><p class="ty-k">Data</p><p class="ty-v">github.com/krulllab/LUMOS#data</p></div></div>
  </div>
  <p class="ty-poster"><span class="ty-k">Poster</span> Session 5 · Hall C1 · Friday</p>
</div>

<style>
.ty-find { display: flex; gap: 70px; margin-top: 6px; }
.ty-qr { display: flex; align-items: center; gap: 26px; }
.ty-qr img { width: 170px; height: 170px; }
.ty-qr div { display: flex; flex-direction: column; gap: 8px; }
.dark-body .ty-k { font-family: 'Space Mono', monospace; font-size: 22px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mustard); }
.dark-body .ty-v { font-size: 30px; color: #fff; }
.dark-body .ty-poster { font-size: 32px; color: #fff; display: flex; align-items: baseline; gap: 24px; }
</style>

<!--
- Thanks for listening
- Code and the human cell dataset are on GitHub: two QR codes
- Poster: Session 5, Hall C1, Friday
-->

---
disabled: true
---

<div class="head"><span class="tag">Backup</span><h2>What RADAR is given</h2></div>

<p class="ri-sub">Real inputs carry far less Raman than RADAR's training data. Summing fixes the noise mismatch, not the Raman one.</p>
<img class="ri" src="/img/radar-inputs.png" alt="Three panels normalised to 0 to 1 as RADAR does. Sum of 16 frames: Raman is 9 percent of the height, noise 0.017. Last frame: Raman 12 percent, noise 0.073. RADAR training spectrum: Raman 39 percent, noise 0.018.">
<p class="caption ri-cap">One Human cells test spot (stem cell); grey is the input, orange the reference Raman. Figures are medians over 64 test spots and 3,000 spectra from RADAR's own generator, after RADAR's min-max normalisation. Noise is a robust per-channel estimate.</p>

<style>
.ri-sub { position: absolute; left: 80px; top: 220px; width: 1760px; }
.ri { position: absolute; left: 80px; top: 290px; width: 1760px; height: 643px; object-fit: contain; }
.ri-cap { position: absolute; left: 80px; top: 950px; width: 1760px; }
</style>

<!--
- Backup: why RADAR prefers the last frame
- Training: Raman about 40% of height, low noise
- Sum: right noise, too little Raman
- Last: slightly more Raman, 4x the noise
- Neither explains Last winning on its own
-->
