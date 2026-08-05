<script setup lang="ts">
import { colors, primitives, transforms } from "@jscad/modeling";

const { colorize } = colors;
const { cylinder, cuboid } = primitives;
const { translate } = transforms;
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import type { CoinParameters } from "../model/coinParameters";
import type { CoinPartKey, GeneratedCoin } from "../model/generatedCoin";
import { COIN_PART_NAMES } from "../model/generatedCoin";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";
import type { CameraPreset } from "../preview/cameraViews";
import { DEFAULT_CAMERA_PRESET } from "../preview/cameraViews";
import { createRenderer } from "../preview/createRenderer";
import type { PreviewRenderer, PreviewSolid } from "../preview/createRenderer";
import { colorForRenderer, DEFAULT_PREVIEW_COLORS } from "../preview/previewColors";

const PART_KEYS: CoinPartKey[] = ["body", "borderRing", "topText", "bottomText"];
const EXPLODED_OFFSETS: Record<CoinPartKey, [number, number, number]> = {
  body: [0, 0, -4],
  borderRing: [0, 0, 4],
  topText: [-8, 0, 8],
  bottomText: [8, 0, -8],
};

type GenerateCoin = (parameters: CoinParameters) => GeneratedCoin | Promise<GeneratedCoin>;

const props = withDefaults(defineProps<{
  parameters?: CoinParameters;
  generateCoin?: GenerateCoin;
  debounceMs?: number;
}>(), {
  parameters: () => DEFAULT_COIN_PARAMETERS,
  debounceMs: 250,
});

const canvasHost = ref<HTMLElement | null>(null);
const renderer = ref<PreviewRenderer | null>(null);
const cameraPreset = ref<CameraPreset>(DEFAULT_CAMERA_PRESET);
const exploded = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");
const generatedCoin = ref<GeneratedCoin | null>(null);
const visibleParts = reactive<Record<CoinPartKey, boolean>>({
  body: true,
  borderRing: true,
  topText: true,
  bottomText: true,
});

let debounceId: number | undefined;
let generationId = 0;
let resizeObserver: ResizeObserver | undefined;

const createFallbackCoin = (parameters: CoinParameters): GeneratedCoin => {
  const radius = parameters.diameter / 2;
  const body = cylinder({ radius, height: parameters.thickness, segments: parameters.circleSegments });
  const ring = cylinder({ radius, height: parameters.topFace.depth, segments: parameters.circleSegments });
  const topText = cuboid({ size: [radius, parameters.topFace.textSize, parameters.topFace.depth] });
  const bottomText = cuboid({ size: [radius, parameters.bottomFace.textSize, parameters.bottomFace.depth] });

  return {
    parts: {
      body: { id: "coin-body", name: COIN_PART_NAMES.body, displayName: COIN_PART_NAMES.body, geometry: body, color: parameters.bodyColor, metadata: { id: "coin-body", key: "body", displayName: COIN_PART_NAMES.body } },
      borderRing: { id: "border-ring", name: COIN_PART_NAMES.borderRing, displayName: COIN_PART_NAMES.borderRing, geometry: translate([0, 0, parameters.thickness / 2], ring), color: parameters.borderColor, metadata: { id: "border-ring", key: "borderRing", displayName: COIN_PART_NAMES.borderRing } },
      topText: { id: "top-text", name: COIN_PART_NAMES.topText, displayName: COIN_PART_NAMES.topText, geometry: translate([0, radius / 3, parameters.thickness / 2 + parameters.topFace.depth], topText), color: parameters.topFace.color, metadata: { id: "top-text", key: "topText", displayName: COIN_PART_NAMES.topText } },
      bottomText: { id: "bottom-text", name: COIN_PART_NAMES.bottomText, displayName: COIN_PART_NAMES.bottomText, geometry: translate([0, -radius / 3, -parameters.thickness / 2 - parameters.bottomFace.depth], bottomText), color: parameters.bottomFace.color, metadata: { id: "bottom-text", key: "bottomText", displayName: COIN_PART_NAMES.bottomText } },
    },
  };
};

const solids = computed<PreviewSolid[]>(() => {
  if (!generatedCoin.value) return [];
  return PART_KEYS.filter((key) => visibleParts[key]).map((key) => {
    const part = generatedCoin.value!.parts[key];
    const fallbackColor = DEFAULT_PREVIEW_COLORS[key];
    const geometry = exploded.value ? translate(EXPLODED_OFFSETS[key], part.geometry) : part.geometry;
    return colorize(colorForRenderer(part.color || fallbackColor), geometry);
  });
});

const renderCurrentSolids = () => renderer.value?.render(solids.value);

const regenerate = async () => {
  const id = ++generationId;
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const coin = await (props.generateCoin?.(props.parameters) ?? createFallbackCoin(props.parameters));
    if (id !== generationId) return;
    generatedCoin.value = coin;
    await nextTick();
    renderCurrentSolids();
  } catch (error) {
    if (id !== generationId) return;
    generatedCoin.value = null;
    errorMessage.value = error instanceof Error ? error.message : "Unable to load fonts or generate preview geometry.";
    renderCurrentSolids();
  } finally {
    if (id === generationId) isLoading.value = false;
  }
};

const scheduleRegeneration = () => {
  window.clearTimeout(debounceId);
  debounceId = window.setTimeout(() => void regenerate(), props.debounceMs);
};

const setCameraPreset = (preset: CameraPreset) => {
  cameraPreset.value = preset;
  renderer.value?.setCameraPreset(preset);
};

const resetCamera = () => {
  cameraPreset.value = DEFAULT_CAMERA_PRESET;
  renderer.value?.resetCamera();
};

onMounted(() => {
  if (!canvasHost.value) return;
  renderer.value = createRenderer(canvasHost.value);
  resizeObserver = new ResizeObserver(() => renderer.value?.resize());
  resizeObserver.observe(canvasHost.value);
  void regenerate();
});

onBeforeUnmount(() => {
  window.clearTimeout(debounceId);
  resizeObserver?.disconnect();
  renderer.value?.dispose();
});

watch(() => props.parameters, scheduleRegeneration, { deep: true });
watch([solids, exploded], renderCurrentSolids, { deep: true });
</script>

<template>
  <div class="preview-canvas-shell">
    <div class="preview-toolbar" aria-label="Preview controls">
      <button v-for="preset in ['isometric', 'top', 'bottom', 'side']" :key="preset" type="button" :class="{ active: cameraPreset === preset }" @click="setCameraPreset(preset as CameraPreset)">{{ preset }}</button>
      <button type="button" @click="resetCamera">Reset camera</button>
      <label><input v-model="exploded" type="checkbox" /> Exploded</label>
    </div>

    <div class="part-toggles" aria-label="Part visibility">
      <label v-for="key in PART_KEYS" :key="key"><input v-model="visibleParts[key]" type="checkbox" /> {{ COIN_PART_NAMES[key] }}</label>
    </div>

    <div ref="canvasHost" class="preview-canvas-host" aria-label="3D token preview">
      <div v-if="isLoading" class="preview-status">Generating preview…</div>
      <div v-else-if="errorMessage" class="preview-status error" role="alert">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<style scoped>
.preview-canvas-shell { display: flex; min-height: 420px; flex-direction: column; gap: 0.75rem; }
.preview-toolbar, .part-toggles { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
button { border: 1px solid #c7d2fe; border-radius: 999px; padding: 0.45rem 0.75rem; background: #fff; color: #3730a3; font-weight: 700; cursor: pointer; text-transform: capitalize; }
button.active { color: #fff; background: #4f46e5; }
label { display: inline-flex; gap: 0.35rem; align-items: center; color: #334155; font-size: 0.9rem; font-weight: 700; }
.preview-canvas-host { position: relative; flex: 1; min-height: 320px; overflow: hidden; border: 1px solid #c7d2fe; border-radius: 22px; background: linear-gradient(135deg, #ffffff, #eef2ff); }
.preview-canvas-host :deep(canvas) { display: block; width: 100%; height: 100%; }
.preview-status { position: absolute; inset: 1rem auto auto 1rem; z-index: 1; border-radius: 999px; padding: 0.5rem 0.8rem; color: #3730a3; background: rgba(255,255,255,0.9); font-weight: 800; box-shadow: 0 12px 30px rgba(15,23,42,0.12); }
.preview-status.error { color: #991b1b; }
</style>
