<script setup lang="ts">
import type { CameraViewName } from '../preview/cameraViews'
import type { CoinPartKey } from '../model/generatedCoin'

defineProps<{
  hasBlockingErrors: boolean
  updating: boolean
  visibility: Record<CoinPartKey, boolean>
  showGuides: boolean
  showUsableCircle: boolean
}>()

const emit = defineEmits<{
  export: []
  'set-view': [view: CameraViewName]
  'update:visibility': [key: CoinPartKey, value: boolean]
  'update:showGuides': [value: boolean]
  'update:showUsableCircle': [value: boolean]
}>()

const views: CameraViewName[] = ['isometric', 'top', 'bottom', 'side', 'exploded', 'reset']
</script>

<template>
  <div class="preview-toolbar">
    <div>
      <h2>Preview</h2>
      <p v-if="updating">Updating model…</p>
      <p v-else>Live multipart coin preview.</p>
    </div>

    <div class="view-buttons">
      <button
        v-for="view in views"
        :key="view"
        type="button"
        class="view-button"
        @click="emit('set-view', view)"
      >
        {{ view }}
      </button>
    </div>

    <div class="visibility">
      <label v-for="(visible, key) in visibility" :key="key">
        <input
          type="checkbox"
          :checked="visible"
          @change="emit('update:visibility', key as CoinPartKey, ($event.target as HTMLInputElement).checked)"
        />
        {{ key }}
      </label>
      <label>
        <input
          type="checkbox"
          :checked="showGuides"
          @change="emit('update:showGuides', ($event.target as HTMLInputElement).checked)"
        />
        Layout guides
      </label>
      <label>
        <input
          type="checkbox"
          :checked="showUsableCircle"
          @change="emit('update:showUsableCircle', ($event.target as HTMLInputElement).checked)"
        />
        Usable text circle
      </label>
    </div>

    <button
      type="button"
      class="export-button"
      :disabled="hasBlockingErrors || updating"
      @click="emit('export')"
    >
      Export Multipart 3MF
    </button>
  </div>
</template>
