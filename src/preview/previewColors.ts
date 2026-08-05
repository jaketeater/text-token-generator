import type { CoinPartKey } from "../model/generatedCoin";

export const DEFAULT_PART_VISIBILITY: Record<CoinPartKey, boolean> = {
  body: true,
  borderRing: true,
  topText: true,
  bottomText: true,
};

export const hexToRgba = (hex: string): [number, number, number, number] => {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 8 ? normalized.slice(0, 6) : normalized;
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  return [r, g, b, 1];
};
