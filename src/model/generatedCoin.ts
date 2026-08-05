import type { geometries } from "@jscad/modeling";

export const COIN_PART_IDS = {
  body: "coin-body",
  borderRing: "border-ring",
  topText: "top-text",
  bottomText: "bottom-text",
} as const;

export const COIN_PART_NAMES = {
  body: "Coin Body",
  borderRing: "Border Ring",
  topText: "Top Text",
  bottomText: "Bottom Text",
} as const;

export type CoinPartKey = keyof typeof COIN_PART_IDS;
export type CoinPartId = (typeof COIN_PART_IDS)[CoinPartKey];
export type CoinPartName = (typeof COIN_PART_NAMES)[CoinPartKey];

export interface CoinPartMetadata {
  /** Stable identifier shared by preview, export, and 3MF generation. */
  id: CoinPartId;
  /** Semantic part key for programmatic grouping. */
  key: CoinPartKey;
  /** Human-readable display name. */
  displayName: CoinPartName;
  /** Additional generator/export metadata. */
  [key: string]: unknown;
}

export interface GeneratedCoinPart {
  id: CoinPartId;
  name: CoinPartName;
  displayName: CoinPartName;
  geometry: geometries.geom3.Geom3;
  color: string;
  metadata: CoinPartMetadata;
}

export type GeneratedCoinParts = {
  [Key in CoinPartKey]: GeneratedCoinPart & {
    id: (typeof COIN_PART_IDS)[Key];
    name: (typeof COIN_PART_NAMES)[Key];
    displayName: (typeof COIN_PART_NAMES)[Key];
    metadata: CoinPartMetadata & {
      id: (typeof COIN_PART_IDS)[Key];
      key: Key;
      displayName: (typeof COIN_PART_NAMES)[Key];
    };
  };
};

export interface GeneratedCoin {
  parts: GeneratedCoinParts;
}
