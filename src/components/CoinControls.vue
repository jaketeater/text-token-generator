<script setup lang="ts">
import type { CoinParameters } from '../model/coinParameters'

const parameters = defineModel<CoinParameters>({ required: true })
</script>

<template>
  <section class="control-group" aria-labelledby="coin-controls-heading">
    <h3 id="coin-controls-heading">Coin</h3>

    <div class="split-fields">
      <label class="field">
        <span>Diameter <small>mm</small></span>
        <input v-model.number="parameters.diameter" type="number" min="1" step="0.1" />
      </label>
      <label class="field">
        <span>Thickness <small>mm</small></span>
        <input v-model.number="parameters.thickness" type="number" min="0.5" step="0.1" />
      </label>
    </div>

    <div class="split-fields">
      <label class="field">
        <span>Border width <small>mm</small></span>
        <input v-model.number="parameters.borderWidth" type="number" min="0.1" step="0.1" />
      </label>
      <label class="field">
        <span>Edge radius <small>mm</small></span>
        <input v-model.number="parameters.edgeRadius" type="number" min="0" step="0.1" />
      </label>
    </div>

    <div class="split-fields">
      <label class="field color-field">
        <span>Body color</span>
        <input v-model="parameters.bodyColor" type="color" />
      </label>
      <label class="field color-field">
        <span>Border color</span>
        <input v-model="parameters.borderColor" type="color" />
      </label>
    </div>

    <div class="split-fields">
      <label class="field">
        <span>Layer height <small>mm</small></span>
        <input v-model.number="parameters.layerHeight" type="number" min="0.05" step="0.05" />
      </label>
      <label class="field">
        <span>Nozzle width <small>mm</small></span>
        <input v-model.number="parameters.nozzleWidth" type="number" min="0.1" step="0.05" />
      </label>
    </div>
    <p class="hint">Layer height and nozzle width are used for warnings only.</p>
  </section>
</template>
