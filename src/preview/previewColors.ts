export type RgbaColor = [number, number, number, number];

export const DEFAULT_PREVIEW_COLORS = {
  body: "#d1d5db",
  borderRing: "#9ca3af",
  topText: "#111827",
  bottomText: "#111827",
} as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const hexToRgba = (color: string, fallback: RgbaColor = [0.75, 0.75, 0.75, 1]): RgbaColor => {
  const normalized = color.trim().replace(/^#/, "");
  const hex = normalized.length === 3
    ? normalized.split("").map((character) => `${character}${character}`).join("")
    : normalized;

  if (!/^[\da-f]{6}([\da-f]{2})?$/i.test(hex)) {
    return fallback;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const alpha = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;

  return [clamp01(red), clamp01(green), clamp01(blue), clamp01(alpha)];
};

export const colorForRenderer = (color: string): RgbaColor => hexToRgba(color);
