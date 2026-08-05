<script setup lang="ts">
import type { ValidationMessage } from '../geometry/validateGeometry'

defineProps<{
  messages: ValidationMessage[]
}>()
</script>

<template>
  <section v-if="messages.length > 0" class="validation" aria-live="polite">
    <h3>Validation</h3>
    <ul>
      <li
        v-for="(message, index) in messages"
        :key="`${message.code}-${index}`"
        :class="message.severity"
      >
        {{ message.message }}
      </li>
    </ul>
  </section>
</template>
