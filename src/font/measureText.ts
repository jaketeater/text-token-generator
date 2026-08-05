import type opentype from "opentype.js";

import { loadFontSync } from "./loadFont";
import { opentypeToContours } from "./opentypeToContours";
import type { FlatContour } from "./flattenBezier";
import { effectiveCurveTolerance } from "./textGeometry";

export interface MeasureTextOptions {
  textSizeMm: number;
  curveTolerance?: number;
  font?: opentype.Font;
}

export interface MeasuredText {
  width: number;
  height: number;
  ascent: number;
  descent: number;
  contours: FlatContour[];
}

export interface MeasuredGlyph {
  char: string;
  /** Contours for this glyph alone, positioned at its advance origin (OpenType Y-down). */
  contours: FlatContour[];
  /** Left bearing / x offset of this glyph's origin within the line. */
  xOffset: number;
  advanceWidth: number;
}

export interface MeasuredTextGlyphs {
  width: number;
  height: number;
  ascent: number;
  descent: number;
  /** One contour group per non-space glyph, already translated by kerning-aware advances. */
  glyphGroups: FlatContour[][];
  glyphs: MeasuredGlyph[];
  /** Flattened contours for bounding-box / circle-fit checks. */
  contours: FlatContour[];
}

export const measureText = (text: string, options: MeasureTextOptions): MeasuredText => {
  const glyphs = measureTextGlyphs(text, options);
  return {
    width: glyphs.width,
    height: glyphs.height,
    ascent: glyphs.ascent,
    descent: glyphs.descent,
    contours: glyphs.contours,
  };
};

/**
 * Measure a line glyph-by-glyph with kerning so counters can be classified per letter.
 */
export const measureTextGlyphs = (text: string, options: MeasureTextOptions): MeasuredTextGlyphs => {
  const font = options.font ?? loadFontSync();
  const size = options.textSizeMm;
  const ascender = (font.ascender / font.unitsPerEm) * size;
  const descender = (font.descender / font.unitsPerEm) * size;

  if (text.length === 0) {
    return {
      width: 0,
      height: 0,
      ascent: ascender,
      descent: descender,
      glyphGroups: [],
      glyphs: [],
      contours: [],
    };
  }

  const opentypeGlyphs = font.stringToGlyphs(text);
  const glyphs: MeasuredGlyph[] = [];
  const glyphGroups: FlatContour[][] = [];
  let x = 0;

  for (let index = 0; index < opentypeGlyphs.length; index += 1) {
    const glyph = opentypeGlyphs[index];
    const char = glyph.unicode !== undefined ? String.fromCodePoint(glyph.unicode) : "";
    const advance = glyph.advanceWidth !== undefined ? (glyph.advanceWidth / font.unitsPerEm) * size : 0;

    let kern = 0;
    if (index < opentypeGlyphs.length - 1) {
      kern = (font.getKerningValue(glyph, opentypeGlyphs[index + 1]) / font.unitsPerEm) * size;
    }

    if (char === " " || char.length === 0 || glyph.unicode === 32) {
      x += advance + kern;
      continue;
    }

    const rawContours = opentypeToContours(font, char, {
      textSizeMm: size,
      curveTolerance: effectiveCurveTolerance(size, options.curveTolerance),
    });
    const translated = rawContours.map((contour) =>
      contour.map((point) => ({ x: point.x + x, y: point.y })),
    );

    glyphs.push({
      char,
      contours: translated,
      xOffset: x,
      advanceWidth: advance,
    });
    if (translated.length > 0) {
      glyphGroups.push(translated);
    }

    x += advance + kern;
  }

  const width = font.getAdvanceWidth(text, size, { kerning: true });

  return {
    width,
    height: ascender - descender,
    ascent: ascender,
    descent: descender,
    glyphGroups,
    glyphs,
    contours: glyphGroups.flat(),
  };
};

export const measureWordWidth = (word: string, textSizeMm: number, font?: opentype.Font): number => {
  const resolved = font ?? loadFontSync();
  return resolved.getAdvanceWidth(word, textSizeMm, { kerning: true });
};

export const measureSpaceWidth = (textSizeMm: number, font?: opentype.Font): number =>
  measureWordWidth(" ", textSizeMm, font);
