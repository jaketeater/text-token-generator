<script setup lang="ts">
import { computed, reactive } from 'vue'
import CoinControls from './components/CoinControls.vue'
import FaceControls from './components/FaceControls.vue'
import PreviewToolbar from './components/PreviewToolbar.vue'
import ValidationMessages from './components/ValidationMessages.vue'
import { downloadCompatibilityTest3mf } from './export/export3mf'
import { validateCoinParameters } from './geometry/validateGeometry'
import { DEFAULT_COIN_PARAMETERS } from './model/defaults'
import type { CoinParameters, FaceParameters } from './model/coinParameters'

const title = 'Text Token Generator'
const averageCharacterWidthToTextSizeRatio = 0.62

const coinParameters = reactive<CoinParameters>(structuredClone(DEFAULT_COIN_PARAMETERS))

const validationResult = computed(() => validateCoinParameters(coinParameters))
const hasBlockingErrors = computed(() => validationResult.value.errors.length > 0)

const usableTextDiameter = computed(() => Math.max(0, coinParameters.diameter - coinParameters.borderWidth * 2))

const getFittedTextSize = (face: FaceParameters): number => {
  if (!face.autoFit) {
    return face.textSize
  }

  const estimatedTextWidth = face.text.trim().length * face.textSize * averageCharacterWidthToTextSizeRatio
  if (estimatedTextWidth <= 0 || estimatedTextWidth <= usableTextDiameter.value) {
    return face.textSize
  }

  return face.textSize * (usableTextDiameter.value / estimatedTextWidth)
}

const fittedTopTextSize = computed(() => getFittedTextSize(coinParameters.topFace))
const fittedBottomTextSize = computed(() => getFittedTextSize(coinParameters.bottomFace))

const previewStyle = computed(() => ({
  '--coin-body-color': coinParameters.bodyColor,
  '--coin-border-color': coinParameters.borderColor,
  '--coin-border-width': `${Math.max(4, coinParameters.borderWidth * 6)}px`,
}))
</script>

<template>
  <main class="app-shell">
    <section class="hero">
      <p class="eyebrow">Vite + Vue 3 + TypeScript</p>
      <h1>{{ title }}</h1>
      <p>
        Shape configurable text tokens with controls on the left and a live preview summary on the right.
      </p>
    </section>

    <section class="workspace" aria-label="Token generator workspace">
      <aside class="panel controls-panel">
        <h2>Controls</h2>
        <CoinControls v-model="coinParameters" />
        <FaceControls
          v-model="coinParameters.topFace"
          title="Top face"
          face-name="top"
          :fitted-text-size="fittedTopTextSize"
        />
        <FaceControls
          v-model="coinParameters.bottomFace"
          title="Bottom face"
          face-name="bottom"
          :fitted-text-size="fittedBottomTextSize"
        />
      </aside>

      <section class="panel preview-panel">
        <PreviewToolbar :has-blocking-errors="hasBlockingErrors" @export="downloadCompatibilityTest3mf" />
        <ValidationMessages :messages="validationResult.messages" />

        <div class="preview-canvas" aria-label="Preview placeholder">
          <div class="coin-preview" :style="previewStyle">
            <span
              class="preview-text top-text"
              :style="{ color: coinParameters.topFace.color, transform: `rotate(${coinParameters.topFace.rotationDegrees}deg)`, fontSize: `${Math.max(12, fittedTopTextSize * 4)}px` }"
            >
              {{ coinParameters.topFace.text || 'Top text' }}
            </span>
            <span
              class="preview-text bottom-text"
              :class="coinParameters.bottomFace.bottomTextOrientation"
              :style="{ color: coinParameters.bottomFace.color, transform: `rotate(${coinParameters.bottomFace.rotationDegrees}deg)`, fontSize: `${Math.max(10, fittedBottomTextSize * 3)}px` }"
            >
              {{ coinParameters.bottomFace.text || 'Bottom text' }}
            </span>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  color: #172033;
  background: #eef3f8;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.app-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 48px 0;
}

.hero {
  margin-bottom: 32px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #4f46e5;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 12px;
  font-size: clamp(2.25rem, 8vw, 5rem);
  line-height: 0.95;
}

.hero p:last-child {
  max-width: 720px;
  color: #4b5563;
  font-size: 1.125rem;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.panel {
  min-height: 420px;
  padding: 28px;
  border: 1px solid rgba(99, 102, 241, 0.14);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
}

.controls-panel {
  display: grid;
  gap: 22px;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

:deep(.control-group) {
  display: grid;
  gap: 14px;
  padding-top: 18px;
  border-top: 1px solid #e5e7eb;
}

:deep(.control-group h3) {
  margin: 0;
  color: #312e81;
}

:deep(.field) {
  display: grid;
  gap: 6px;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 700;
}

:deep(.field small) {
  color: #6b7280;
  font-weight: 600;
}

:deep(input[type='number']),
:deep(input[type='text']) {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 12px;
  color: #111827;
  background: #ffffff;
  font: inherit;
}

:deep(input[type='color']) {
  width: 100%;
  height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 4px;
  background: #ffffff;
}

:deep(.color-row),
:deep(.split-fields) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

:deep(.advanced-controls) {
  display: grid;
  gap: 12px;
}

:deep(.advanced-controls[open]) {
  padding-top: 4px;
}

:deep(summary) {
  color: #4f46e5;
  font-weight: 800;
  cursor: pointer;
}

:deep(.choice-group) {
  display: grid;
  gap: 8px;
  margin: 0;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;
}

:deep(.choice-group legend) {
  padding: 0 4px;
  color: #374151;
  font-weight: 800;
}

:deep(.choice-group label) {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #4b5563;
}

:deep(.fit-note) {
  margin: -4px 0 0;
  border-radius: 12px;
  padding: 10px 12px;
  color: #92400e;
  background: #fef3c7;
  font-size: 0.88rem;
  font-weight: 700;
}

:deep(.preview-toolbar) {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

:deep(.preview-toolbar p) {
  margin-bottom: 0;
  color: #6b7280;
}

.export-button {
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  color: #ffffff;
  background: #111827;
  font-weight: 800;
  cursor: pointer;
}

.export-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

:deep(.validation-messages) {
  border-radius: 18px;
  padding: 16px;
  background: #f8fafc;
}

:deep(.validation-messages h3) {
  margin: 0 0 10px;
}

:deep(.validation-messages ul) {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

:deep(.validation-messages li) {
  display: grid;
  gap: 2px;
  border-left: 4px solid;
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
}

:deep(.validation-messages .error) {
  border-color: #dc2626;
}

:deep(.validation-messages .warning) {
  border-color: #f59e0b;
}

.preview-canvas {
  display: grid;
  flex: 1;
  min-height: 440px;
  place-items: center;
  border: 2px dashed #c7d2fe;
  border-radius: 22px;
  background: linear-gradient(135deg, #ffffff, #eef2ff);
}

.coin-preview {
  display: grid;
  width: min(72vw, 430px);
  aspect-ratio: 1;
  place-items: center;
  border: var(--coin-border-width) solid var(--coin-border-color);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 28%, #ffffff80, transparent 28%), var(--coin-body-color);
  box-shadow: inset 0 8px 24px #ffffff70, inset 0 -18px 40px #11182720, 0 24px 60px #0f172a24;
}

.preview-text {
  max-width: 78%;
  overflow: hidden;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.top-text {
  align-self: end;
}

.bottom-text {
  align-self: start;
}

.bottom-text.flipped {
  scale: -1;
}

@media (max-width: 780px) {
  .workspace,
  :deep(.preview-toolbar) {
    grid-template-columns: 1fr;
  }

  .workspace {
    display: grid;
  }

  :deep(.preview-toolbar) {
    display: grid;
  }
}
</style>
