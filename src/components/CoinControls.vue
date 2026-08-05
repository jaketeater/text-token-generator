<script setup lang="ts">
import type { CoinParameters } from '../model/coinParameters'

const parameters = defineModel<CoinParameters>({ required: true })
</script>

<template>
  <section class="control-group" aria-labelledby="coin-controls-heading">
    <h3 id="coin-controls-heading">Coin</h3>

    <label class="field">
      <span>Diameter <small>mm</small></span>
      <input v-model.number="parameters.diameter" type="number" min="0" step="0.1" />
    </label>

    <label class="field">
      <span>Thickness <small>mm</small></span>
      <input v-model.number="parameters.thickness" type="number" min="0" step="0.1" />
    </label>

    <label class="field">
      <span>Border width <small>mm</small></span>
      <input v-model.number="parameters.borderWidth" type="number" min="0" step="0.1" />
    </label>

    <div class="color-row">
      <label class="field color-field">
        <span>Body color</span>
        <input v-model="parameters.bodyColor" type="color" />
      </label>

      <label class="field color-field">
        <span>Border color</span>
        <input v-model="parameters.borderColor" type="color" />
      </label>
    </div>

    <details class="advanced-controls">
      <summary>Advanced geometry</summary>

      <label class="field">
        <span>Circle segments</span>
        <input v-model.number="parameters.circleSegments" type="number" min="12" step="1" />
      </label>

      <label class="field">
        <span>Curve tolerance <small>mm</small></span>
        <input v-model.number="parameters.curveTolerance" type="number" min="0.001" step="0.001" />
      </label>
    </details>
  </section>
</template>
