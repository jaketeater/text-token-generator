import opentype from "opentype.js";

import { loadFontSync, setFontForTesting } from "../font/loadFont";
import { opentypeToContours } from "../font/opentypeToContours";

export interface TextPoint {
  x: number;
  y: number;
}

export type TextContour = TextPoint[];

export interface TextContoursResult {
  contours: TextContour[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface TextToContoursOptions {
  textSizeMm?: number;
  curveTolerance?: number;
  font?: opentype.Font;
}

const DEFAULT_TEXT_SIZE_MM = 1;

const emptyBounds = {
  minX: 0,
  minY: 0,
  maxX: 0,
  maxY: 0,
  width: 0,
  height: 0,
};

const boundsForContours = (contours: TextContour[]): TextContoursResult["bounds"] => {
  if (contours.length === 0) {
    return emptyBounds;
  }

  const points = contours.flat();
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

export const textToContours = (text: string, options: TextToContoursOptions = {}): TextContoursResult => {
  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    return { contours: [], bounds: emptyBounds };
  }

  const contours = opentypeToContours(options.font ?? loadFontSync(), trimmedText, {
    textSizeMm: options.textSizeMm ?? DEFAULT_TEXT_SIZE_MM,
    curveTolerance: options.curveTolerance,
  });

  return { contours, bounds: boundsForContours(contours) };
};

export const setTextContoursFontForTesting = setFontForTesting;
