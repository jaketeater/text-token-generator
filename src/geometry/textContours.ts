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
  lineHeightMm?: number;
}

const DEFAULT_TEXT_SIZE_MM = 1;
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.2;

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

const translateContours = (contours: TextContour[], offsetY: number): TextContour[] =>
  contours.map((contour) => contour.map((point) => ({ x: point.x, y: point.y + offsetY })));

export const textToContours = (text: string, options: TextToContoursOptions = {}): TextContoursResult => {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { contours: [], bounds: emptyBounds };
  }

  const textSizeMm = options.textSizeMm ?? DEFAULT_TEXT_SIZE_MM;
  const lineHeightMm = options.lineHeightMm ?? textSizeMm * DEFAULT_LINE_HEIGHT_MULTIPLIER;
  const font = options.font ?? loadFontSync();
  const firstLineOffsetY = -((lines.length - 1) * lineHeightMm) / 2;
  const contours = lines.flatMap((line, index) => {
    const lineContours = opentypeToContours(font, line, {
      textSizeMm,
      curveTolerance: options.curveTolerance,
    });

    return translateContours(lineContours, firstLineOffsetY + index * lineHeightMm);
  });

  return { contours, bounds: boundsForContours(contours) };
};

export const setTextContoursFontForTesting = setFontForTesting;
