<script setup lang="ts">
import type { FaceParameters } from '../model/coinParameters'
import type { TextCircleFitDiagnostics } from '../geometry/fitTextToCircle'

defineProps<{
  title: string
  faceName: 'top' | 'bottom'
  fitDiagnostics?: TextCircleFitDiagnostics
}>()

const face = defineModel<FaceParameters>({ required: true })
</script>

<template>
  <section class="control-group" :aria-labelledby="`${faceName}-face-controls-heading`">
    <h3 :id="`${faceName}-face-controls-heading`">{{ title }}</h3>

    <label class="field">
      <span>Text</span>
      <input v-model="face.text" type="text" />
    </label>

    <div class="split-fields">
      <label class="field">
        <span>Size <small>mm</small></span>
        <input v-model.number="face.textSize" type="number" min="0" step="0.1" />
      </label>

      <label class="field">
        <span>Depth <small>mm</small></span>
        <input v-model.number="face.depth" type="number" min="0" step="0.05" />
      </label>
    </div>

    <p v-if="fitDiagnostics !== undefined && (fitDiagnostics.wasShrunk || fitDiagnostics.fitErrors.length > 0)" class="fit-note">
      Requested {{ fitDiagnostics.requestedSize.toFixed(2) }} mm; fitted {{ fitDiagnostics.fittedSize.toFixed(2) }} mm.
      <span v-if="fitDiagnostics.fitErrors.length > 0">Fixed size exceeds usable radius.</span>
    </p>

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

    <fieldset class="choice-group">
      <legend>Fit behavior</legend>
      <label>
        <input v-model="face.autoFit" type="radio" :value="true" />
        Shrink only when needed
      </label>
      <label>
        <input v-model="face.autoFit" type="radio" :value="false" />
        Fixed size
      </label>
    </fieldset>

    <fieldset v-if="faceName === 'bottom'" class="choice-group">
      <legend>Bottom orientation</legend>
      <label>
        <input v-model="face.bottomTextOrientation" type="radio" value="flipped" />
        Flip for underside
      </label>
      <label>
        <input v-model="face.bottomTextOrientation" type="radio" value="upright" />
        Keep upright
      </label>
    </fieldset>
  </section>
</template>
