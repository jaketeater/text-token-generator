<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'

import CoinControls from './components/CoinControls.vue'
import FaceControls from './components/FaceControls.vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import PreviewToolbar from './components/PreviewToolbar.vue'
import TextLayoutDetails from './components/TextLayoutDetails.vue'
import ValidationMessages from './components/ValidationMessages.vue'
import { downloadCoin3mf } from './export/export3mf'
import { generateCoin } from './geometry/createCoin'
import { loadFont } from './font/loadFont'
import type { CoinParameters } from './model/coinParameters'
import { DEFAULT_COIN_PARAMETERS } from './model/defaults'
import type { GeneratedCoin, CoinPartKey } from './model/generatedCoin'
import { DEFAULT_PART_VISIBILITY } from './preview/previewColors'
import type { CameraViewName } from './preview/cameraViews'

const parameters = reactive<CoinParameters>(structuredClone(DEFAULT_COIN_PARAMETERS))
const coin = ref<GeneratedCoin | null>(null)
const updating = ref(false)
const fontReady = ref(false)
const visibility = reactive({ ...DEFAULT_PART_VISIBILITY })
const showGuides = ref(false)
const showUsableCircle = ref(true)
const cameraView = ref<CameraViewName>('isometric')
const exploded = computed(() => cameraView.value === 'exploded')

let debounceTimer: ReturnType<typeof setTimeout> | undefined

const regenerate = () => {
  if (!fontReady.value) {
    return
  }
  updating.value = true
  try {
    coin.value = generateCoin(parameters)
  } finally {
    updating.value = false
  }
}

const scheduleRegenerate = () => {
  updating.value = true
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    regenerate()
  }, 250)
}

watch(parameters, () => scheduleRegenerate(), { deep: true })

loadFont()
  .then(() => {
    fontReady.value = true
    regenerate()
  })
  .catch((error: unknown) => {
    console.error(error)
  })

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
})

const hasBlockingErrors = computed(() => (coin.value?.validation.errors.length ?? 1) > 0)
const messages = computed(() => coin.value?.validation.messages ?? [])

const onExport = () => {
  if (!coin.value || hasBlockingErrors.value) {
    return
  }
  downloadCoin3mf(parameters, coin.value)
}

const onSetView = (view: CameraViewName) => {
  cameraView.value = view
}

const onVisibility = (key: CoinPartKey, value: boolean) => {
  visibility[key] = value
}
</script>

<template>
  <div class="app">
    <header class="hero">
      <h1>Poker Chip Generator</h1>
      <p>Browser-only multipart 3MF coins for Snapmaker Orca.</p>
    </header>

    <div class="layout">
      <aside class="sidebar">
        <CoinControls v-model="parameters" />
        <FaceControls v-model="parameters.top" title="Top face" face-name="top" :layout="coin?.topLayout" />
        <FaceControls v-model="parameters.bottom" title="Bottom face" face-name="bottom" :layout="coin?.bottomLayout" />
        <ValidationMessages :messages="messages" />
        <TextLayoutDetails :top-layout="coin?.topLayout" :bottom-layout="coin?.bottomLayout" />
        <p v-if="showGuides || showUsableCircle" class="guide-note">
          Layout guides are preview-only and are not included in the exported 3MF.
          <span v-if="showUsableCircle"> Usable circle radius follows the inner border edge.</span>
        </p>
      </aside>

      <main class="main">
        <PreviewToolbar
          :has-blocking-errors="hasBlockingErrors"
          :updating="updating"
          :visibility="visibility"
          :show-guides="showGuides"
          :show-usable-circle="showUsableCircle"
          @export="onExport"
          @set-view="onSetView"
          @update:visibility="onVisibility"
          @update:show-guides="showGuides = $event"
          @update:show-usable-circle="showUsableCircle = $event"
        />
        <PreviewCanvas
          :coin="coin"
          :visibility="visibility"
          :exploded="exploded"
          :camera-view="cameraView"
          :show-guides="showGuides"
          :show-usable-circle="showUsableCircle"
        />
      </main>
    </div>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  --bg: #e8eef5;
  --panel: #f7fafc;
  --ink: #0f172a;
  --muted: #475569;
  --accent: #0f766e;
  --accent-ink: #ecfdf5;
  --error: #b91c1c;
  --warning: #a16207;
  --line: #cbd5e1;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 40%),
    linear-gradient(160deg, #dbe4ef, var(--bg) 45%, #f3efe6);
  color: var(--ink);
}

.app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem;
}

.hero h1 {
  margin: 0;
  font-family: "Fraunces", "Palatino Linotype", serif;
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: -0.03em;
}

.hero p {
  margin: 0.35rem 0 1.25rem;
  color: var(--muted);
}

.layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 1rem;
}

.sidebar,
.main {
  background: color-mix(in srgb, var(--panel) 92%, white);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1rem;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: calc(100vh - 8rem);
  overflow: auto;
}

.control-group h3,
.layout-details h3,
.validation h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.65rem;
  font-size: 0.9rem;
}

.field input,
.field textarea,
.choice-group input {
  font: inherit;
}

.field input[type='number'],
.field input[type='text'],
.field textarea {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
  background: white;
}

.split-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.color-field input[type='color'] {
  width: 100%;
  height: 2.2rem;
  padding: 0;
  border: none;
  background: transparent;
}

.checkbox-field,
.choice-group label,
.visibility label {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
}

.choice-group {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  margin: 0.5rem 0;
}

.hint,
.guide-note,
.fit-note {
  color: var(--muted);
  font-size: 0.82rem;
}

.preview-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.view-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.view-button,
.export-button {
  border: 1px solid var(--line);
  background: white;
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  text-transform: capitalize;
}

.export-button {
  align-self: flex-start;
  background: var(--accent);
  color: var(--accent-ink);
  border-color: transparent;
  font-weight: 600;
}

.export-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.visibility {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.validation ul,
.layout-details ul {
  margin: 0;
  padding-left: 1.1rem;
}

.validation .error {
  color: var(--error);
}

.validation .warning {
  color: var(--warning);
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    max-height: none;
  }
}
</style>
