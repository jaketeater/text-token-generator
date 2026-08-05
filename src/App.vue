<script setup lang="ts">
const title = 'Text Token Generator'
</script>

<template>
  <main class="app-shell">
    <section class="hero">
      <p class="eyebrow">Vite + Vue 3 + TypeScript</p>
      <h1>{{ title }}</h1>
      <p>
        Start shaping configurable text tokens with controls on the left and a live preview on the right.
      </p>
    </section>

    <section class="workspace" aria-label="Token generator workspace">
      <aside class="panel controls-panel">
        <h2>Controls</h2>
        <p>Placeholder settings for text, typography, dimensions, and export options.</p>
        <button type="button">Add control</button>
      </aside>

      <section class="panel preview-panel">
        <h2>Preview</h2>
        <div class="preview-canvas" aria-label="Preview placeholder">
          <span>Token preview</span>
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
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  gap: 24px;
}

.panel {
  min-height: 420px;
  padding: 28px;
  border: 1px solid rgba(99, 102, 241, 0.14);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
}

.controls-panel button {
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  color: #ffffff;
  background: #4f46e5;
  font-weight: 700;
  cursor: pointer;
}

.preview-panel {
  display: flex;
  flex-direction: column;
}

.preview-canvas {
  display: grid;
  flex: 1;
  min-height: 300px;
  place-items: center;
  border: 2px dashed #c7d2fe;
  border-radius: 22px;
  color: #4f46e5;
  background: linear-gradient(135deg, #ffffff, #eef2ff);
  font-size: clamp(1.5rem, 4vw, 3rem);
  font-weight: 800;
}

@media (max-width: 780px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
