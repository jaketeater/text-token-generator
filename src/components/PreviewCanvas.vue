<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { transforms } from '@jscad/modeling'

import type { GeneratedCoin, CoinPartKey } from '../model/generatedCoin'
import { GEOMETRY_EPSILON_MM } from '../model/defaults'
import { explodedPartOffsets, type CameraViewName } from '../preview/cameraViews'
import { createRenderer, type ColoredSolid, type PreviewRenderer } from '../preview/createRenderer'
import { buildLayoutGuides } from '../preview/layoutGuides'
import type { PositionedTextLayout } from '../layout/fitTextToCircle'

const props = defineProps<{
  coin: GeneratedCoin | null
  visibility: Record<CoinPartKey, boolean>
  exploded: boolean
  cameraView: CameraViewName
  showGuides: boolean
  showUsableCircle: boolean
}>()

const container = ref<HTMLElement | null>(null)
let renderer: PreviewRenderer | null = null

const guides = computed(() => {
  if (!props.coin) {
    return null
  }
  const layoutRadius = props.coin.bounds.innerRadius - GEOMETRY_EPSILON_MM
  const top = props.coin.topLayout as PositionedTextLayout
  return buildLayoutGuides(top, layoutRadius, top.points ?? [], top.offendingPoints ?? [])
})

const buildSolids = (): ColoredSolid[] => {
  if (!props.coin) {
    return []
  }

  const offsets = props.exploded
    ? explodedPartOffsets(props.coin.bounds.height)
    : { body: [0, 0, 0], borderRing: [0, 0, 0], topText: [0, 0, 0], bottomText: [0, 0, 0] }

  const entries: Array<{ key: CoinPartKey; part: typeof props.coin.parts.body }> = [
    { key: 'body', part: props.coin.parts.body },
    { key: 'borderRing', part: props.coin.parts.borderRing },
    { key: 'topText', part: props.coin.parts.topText },
    { key: 'bottomText', part: props.coin.parts.bottomText },
  ]

  return entries
    .filter(({ key }) => props.visibility[key])
    .map(({ key, part }) => {
      const offset = offsets[key] as [number, number, number]
      const geometry =
        offset[0] === 0 && offset[1] === 0 && offset[2] === 0
          ? part.geometry
          : (transforms.translate(offset, part.geometry) as typeof part.geometry)
      return { geometry, color: part.color }
    })
}

const renderNow = () => {
  if (!renderer || !props.coin) {
    return
  }
  renderer.setCameraByName(
    props.cameraView === 'reset' ? 'isometric' : props.cameraView,
    props.coin.bounds.outerRadius,
    props.coin.bounds.height,
  )
  renderer.render(buildSolids())
}

onMounted(() => {
  if (!container.value) {
    return
  }
  renderer = createRenderer(container.value)
  renderNow()
  window.addEventListener('resize', onResize)
})

const onResize = () => renderer?.resize()

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  renderer?.dispose()
  renderer = null
})

watch(
  () => [props.coin, props.visibility, props.exploded, props.cameraView],
  () => renderNow(),
  { deep: true },
)
</script>

<template>
  <div class="preview-wrap">
    <div ref="container" class="preview-canvas" />
    <svg
      v-if="coin && (showGuides || showUsableCircle) && guides"
      class="guide-overlay"
      viewBox="-20 -20 40 40"
      aria-hidden="true"
    >
      <circle
        v-if="showUsableCircle"
        cx="0"
        cy="0"
        :r="guides.usableCircleRadius"
        fill="none"
        stroke="#38bdf8"
        stroke-width="0.15"
        stroke-dasharray="0.6 0.4"
      />
      <template v-if="showGuides">
        <line
          v-for="(chord, index) in guides.lineChords"
          :key="`chord-${index}`"
          :x1="-chord.halfWidth"
          :x2="chord.halfWidth"
          :y1="-chord.y"
          :y2="-chord.y"
          stroke="#fbbf24"
          stroke-width="0.12"
        />
        <rect
          v-if="guides.boundingBox"
          :x="guides.boundingBox.minX"
          :y="-guides.boundingBox.maxY"
          :width="guides.boundingBox.maxX - guides.boundingBox.minX"
          :height="guides.boundingBox.maxY - guides.boundingBox.minY"
          fill="none"
          stroke="#a78bfa"
          stroke-width="0.1"
        />
        <circle
          v-for="(point, index) in guides.offendingPoints"
          :key="`offend-${index}`"
          :cx="point.x"
          :cy="-point.y"
          r="0.2"
          fill="#ef4444"
        />
      </template>
    </svg>
  </div>
</template>

<style scoped>
.preview-wrap {
  position: relative;
  width: 100%;
  min-height: 420px;
}

.preview-canvas {
  width: 100%;
  min-height: 420px;
  height: 100%;
  background: #0f172a;
  border-radius: 12px;
  overflow: hidden;
}

.guide-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.9;
}
</style>
