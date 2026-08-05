<script setup lang="ts">
import type { ValidationMessage } from '../geometry/validateGeometry'

defineProps<{
  messages: ValidationMessage[]
}>()
</script>

<template>
  <section v-if="messages.length > 0" class="validation-messages" aria-live="polite" aria-label="Validation messages">
    <h3>Validation</h3>
    <ul>
      <li v-for="message in messages" :key="message.code" :class="message.severity">
        <strong>{{ message.severity === 'error' ? 'Error' : 'Warning' }}</strong>
        <span>{{ message.message }}</span>
      </li>
    </ul>
  </section>
</template>
