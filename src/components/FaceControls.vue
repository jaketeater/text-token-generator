<script setup lang="ts">
import type { FaceParameters } from '../model/coinParameters'
import type { GeneratedTextLayout } from '../model/layoutTypes'

defineProps<{
  title: string
  faceName: 'top' | 'bottom'
  layout?: GeneratedTextLayout
}>()

const face = defineModel<FaceParameters>({ required: true })
</script>

<template>
  <section class="control-group" :aria-labelledby="`${faceName}-face-controls-heading`">
    <h3 :id="`${faceName}-face-controls-heading`">{{ title }}</h3>

    <label class="field">
      <span>Text</span>
      <textarea v-model="face.text" rows="3" />
    </label>

    <div class="split-fields">
      <label class="field">
        <span>Text height <small>mm</small></span>
        <input v-model.number="face.requestedTextSize" type="number" min="0.5" step="0.1" />
      </label>
      <label class="field">
        <span>Depth <small>mm</small></span>
        <input v-model.number="face.depth" type="number" min="0.05" step="0.05" />
      </label>
    </div>

    <div class="split-fields">
      <label class="field color-field">
        <span>Text color</span>
        <input v-model="face.color" type="color" />
      </label>
      <label class="field">
        <span>Rotation <small>deg</small></span>
        <input v-model.number="face.rotationDegrees" type="number" step="1" />
      </label>
    </div>

    <div class="split-fields">
      <label class="field">
        <span>Line spacing</span>
        <input v-model.number="face.lineSpacing" type="number" min="0.8" step="0.05" />
      </label>
      <label class="field">
        <span>Min text size <small>mm</small></span>
        <input v-model.number="face.minimumTextSize" type="number" min="0.5" step="0.1" />
      </label>
    </div>

    <label class="checkbox-field">
      <input v-model="face.autoShrink" type="checkbox" />
      <span>Automatic shrink-to-fit</span>
    </label>

    <fieldset v-if="faceName === 'bottom'" class="choice-group">
      <legend>Coin-flip orientation</legend>
      <label>
        <input v-model="face.flipOrientation" type="radio" value="horizontal-axis" />
        Flip over horizontal axis
      </label>
      <label>
        <input v-model="face.flipOrientation" type="radio" value="vertical-axis" />
        Flip over vertical axis
      </label>
    </fieldset>

    <p v-if="layout" class="fit-note">
      Requested {{ layout.requestedTextSize.toFixed(2) }} mm ·
      Effective {{ layout.effectiveTextSize.toFixed(2) }} mm ·
      Lines {{ layout.lines.length }}
    </p>
  </section>
</template>
