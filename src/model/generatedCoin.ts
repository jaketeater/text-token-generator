import type { geometries } from "@jscad/modeling";

import type { ValidationResult } from "../geometry/validateGeometry";
import type { GeneratedTextLayout } from "./layoutTypes";

export type Geom3 = geometries.geom3.Geom3;

export const COIN_PART_KEYS = ["body", "borderRing", "topText", "bottomText"] as const;
export type CoinPartKey = (typeof COIN_PART_KEYS)[number];

export const COIN_PART_IDS: Record<CoinPartKey, number> = {
  body: 10,
  borderRing: 11,
  topText: 12,
  bottomText: 13,
};

export const COIN_PART_NAMES: Record<CoinPartKey, string> = {
  body: "Coin Body",
  borderRing: "Border Ring",
  topText: "Top Text",
  bottomText: "Bottom Text",
};

export const PARENT_OBJECT_ID = 20;
export const PARENT_OBJECT_NAME = "Poker Chip";

export interface GeneratedCoinPart {
  id: number;
  key: CoinPartKey;
  name: string;
  color: string;
  geometry: Geom3;
  /**
   * Optional closed shells for export. When present, each shell is triangulated
   * separately and concatenated so JSCAD generalize cannot weld coplanar interfaces.
   */
  exportShells?: Geom3[];
}

export interface GeneratedCoinParts {
  body: GeneratedCoinPart;
  borderRing: GeneratedCoinPart;
  topText: GeneratedCoinPart;
  bottomText: GeneratedCoinPart;
}

export interface GeneratedCoin {
  parts: GeneratedCoinParts;
  topLayout: GeneratedTextLayout;
  bottomLayout: GeneratedTextLayout;
  validation: ValidationResult;
  bounds: {
    width: number;
    depth: number;
    height: number;
    outerRadius: number;
    innerRadius: number;
  };
}
