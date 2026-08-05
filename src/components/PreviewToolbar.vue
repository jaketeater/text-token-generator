<script setup lang="ts">
defineProps<{
  hasBlockingErrors: boolean
}>()

defineEmits<{
  export: []
}>()
</script>

<template>
  <div class="preview-toolbar">
    <div>
      <h2>Preview</h2>
      <p>Live layout summary before generating the 3MF file.</p>
    </div>
    <button type="button" class="export-button" :disabled="hasBlockingErrors" @click="$emit('export')">
      Download multipart 3MF
    </button>
  </div>
</template>
