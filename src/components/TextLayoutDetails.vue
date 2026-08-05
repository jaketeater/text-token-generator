<script setup lang="ts">
import type { GeneratedTextLayout } from '../model/layoutTypes'

defineProps<{
  topLayout?: GeneratedTextLayout
  bottomLayout?: GeneratedTextLayout
}>()
</script>

<template>
  <section class="layout-details">
    <h3>Text layout</h3>
    <div v-if="topLayout" class="face-layout">
      <h4>Top</h4>
      <p>
        Requested size: {{ topLayout.requestedTextSize.toFixed(2) }} mm ·
        Effective size: {{ topLayout.effectiveTextSize.toFixed(2) }} mm ·
        Lines: {{ topLayout.lines.length }}
      </p>
      <ul>
        <li v-for="(line, index) in topLayout.lines" :key="`top-${index}`">
          “{{ line.text }}” — {{ line.measuredWidth.toFixed(2) }} / {{ line.availableWidth.toFixed(2) }} mm
        </li>
      </ul>
    </div>
    <div v-if="bottomLayout" class="face-layout">
      <h4>Bottom</h4>
      <p>
        Requested size: {{ bottomLayout.requestedTextSize.toFixed(2) }} mm ·
        Effective size: {{ bottomLayout.effectiveTextSize.toFixed(2) }} mm ·
        Lines: {{ bottomLayout.lines.length }}
      </p>
      <ul>
        <li v-for="(line, index) in bottomLayout.lines" :key="`bottom-${index}`">
          “{{ line.text }}” — {{ line.measuredWidth.toFixed(2) }} / {{ line.availableWidth.toFixed(2) }} mm
        </li>
      </ul>
    </div>
  </section>
</template>
