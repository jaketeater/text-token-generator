import type opentype from "opentype.js";

import type { FlatContour, FontPoint } from "../font/flattenBezier";
import { loadFontSync } from "../font/loadFont";
import { measureTextGlyphs, measureWordWidth } from "../font/measureText";
import { opentypeToContours } from "../font/opentypeToContours";
import type { FaceParameters } from "../model/coinParameters";
import type { GeneratedTextLayout, TextLineLayout } from "../model/layoutTypes";
import { calculateChordWidths } from "./calculateChordWidths";
import { calculateLinePositions } from "./calculateLinePositions";
import { flattenWords, tokenizeText } from "./tokenizeText";
import { collectContourPoints, verifyCircularFit } from "./verifyCircularFit";
import { pickBestWrap, wrapGroupsToCircle, type WrapAttempt } from "./wrapWordsToCircle";

export interface FitTextToCircleOptions {
  layoutRadius: number;
  curveTolerance?: number;
  font?: opentype.Font;
  sizeTolerance?: number;
}

export interface PositionedTextLayout extends GeneratedTextLayout {
  contours: FlatContour[];
  /** Per-glyph contour groups for hole-safe geometry conversion. */
  contourGroups: FlatContour[][];
  points: FontPoint[];
  offendingPoints: FontPoint[];
}

const emptyLayout = (requested: number, errors: string[]): PositionedTextLayout => ({
  lines: [],
  requestedTextSize: requested,
  effectiveTextSize: requested,
  totalHeight: 0,
  fits: false,
  warnings: [],
  errors,
  contours: [],
  contourGroups: [],
  points: [],
  offendingPoints: [],
});

const glyphHeightForSize = (font: opentype.Font, textSizeMm: number): number => {
  const ascender = (font.ascender / font.unitsPerEm) * textSizeMm;
  const descender = (font.descender / font.unitsPerEm) * textSizeMm;
  return ascender - descender;
};

const translateContours = (contours: FlatContour[], dx: number, dy: number): FlatContour[] =>
  contours.map((contour) => contour.map((point) => ({ x: point.x + dx, y: point.y + dy })));

const flipContoursY = (contours: FlatContour[]): FlatContour[] =>
  contours.map((contour) => contour.map((point) => ({ x: point.x, y: -point.y })));

const rotateContours = (contours: FlatContour[], degrees: number): FlatContour[] => {
  if (degrees === 0) {
    return contours;
  }
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return contours.map((contour) =>
    contour.map((point) => ({
      x: point.x * cos - point.y * sin,
      y: point.x * sin + point.y * cos,
    })),
  );
};

const boundsOf = (points: FontPoint[]): { minX: number; maxX: number; minY: number; maxY: number } | null => {
  if (points.length === 0) {
    return null;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY };
};

const translateContourGroups = (groups: FlatContour[][], dx: number, dy: number): FlatContour[][] =>
  groups.map((group) => translateContours(group, dx, dy));

const flipContourGroupsY = (groups: FlatContour[][]): FlatContour[][] =>
  groups.map((group) => flipContoursY(group));

const rotateContourGroups = (groups: FlatContour[][], degrees: number): FlatContour[][] =>
  groups.map((group) => rotateContours(group, degrees));

const buildPositionedLayout = (
  wrap: WrapAttempt,
  textSizeMm: number,
  face: FaceParameters,
  layoutRadius: number,
  font: opentype.Font,
  curveTolerance: number,
): PositionedTextLayout | null => {
  const glyphHeight = glyphHeightForSize(font, textSizeMm);
  const { positions, totalHeight } = calculateLinePositions(wrap.lines.length, glyphHeight, face.lineSpacing);
  const lineLayouts: TextLineLayout[] = [];
  let combinedGroups: FlatContour[][] = [];

  for (let index = 0; index < wrap.lines.length; index += 1) {
    const lineText = wrap.lines[index];
    const measured = measureTextGlyphs(lineText, { textSizeMm, curveTolerance, font });
    // Flip opentype Y (down-positive) to coin space (up-positive), then center on target line center.
    const flippedGroups = flipContourGroupsY(measured.glyphGroups);
    const flippedContours = flippedGroups.flat();
    const linePoints = collectContourPoints(flippedContours);
    const lineBounds = boundsOf(linePoints);
    if (!lineBounds) {
      continue;
    }
    const centerX = (lineBounds.minX + lineBounds.maxX) / 2;
    const centerY = (lineBounds.minY + lineBounds.maxY) / 2;
    const centeredGroups = translateContourGroups(flippedGroups, -centerX, positions[index].centerY - centerY);

    combinedGroups = combinedGroups.concat(centeredGroups);
    lineLayouts.push({
      text: lineText,
      x: -((lineBounds.maxX - lineBounds.minX) / 2),
      y: positions[index].centerY,
      measuredWidth: wrap.measuredWidths[index],
      availableWidth: wrap.availableWidths[index],
      baselineY: positions[index].centerY,
    });
  }

  if (combinedGroups.length === 0) {
    return null;
  }

  // Vertical recentering of full block using actual geometric bounds.
  const pointsBefore = collectContourPoints(combinedGroups.flat());
  const blockBounds = boundsOf(pointsBefore);
  if (!blockBounds) {
    return null;
  }
  const blockCenterY = (blockBounds.minY + blockBounds.maxY) / 2;
  combinedGroups = translateContourGroups(combinedGroups, 0, -blockCenterY);
  const adjustedLines = lineLayouts.map((line) => ({
    ...line,
    y: line.y - blockCenterY,
    baselineY: line.baselineY - blockCenterY,
  }));

  const rotatedGroups = rotateContourGroups(combinedGroups, face.rotationDegrees);
  const rotated = rotatedGroups.flat();
  const points = collectContourPoints(rotated);
  const verification = verifyCircularFit(points, layoutRadius);

  if (!verification.fits) {
    return {
      lines: adjustedLines,
      requestedTextSize: face.requestedTextSize,
      effectiveTextSize: textSizeMm,
      totalHeight,
      fits: false,
      warnings: [],
      errors: ["Glyph outlines extend outside the usable text circle."],
      contours: rotated,
      contourGroups: rotatedGroups,
      points,
      offendingPoints: verification.offendingPoints,
    };
  }

  return {
    lines: adjustedLines,
    requestedTextSize: face.requestedTextSize,
    effectiveTextSize: textSizeMm,
    totalHeight,
    fits: true,
    warnings:
      textSizeMm + 1e-6 < face.requestedTextSize
        ? [`Text reduced from ${face.requestedTextSize.toFixed(2)} mm to ${textSizeMm.toFixed(2)} mm to fit.`]
        : [],
    errors: [],
    contours: rotated,
    contourGroups: rotatedGroups,
    points,
    offendingPoints: [],
  };
};

const tryLayoutAtSize = (
  face: FaceParameters,
  textSizeMm: number,
  layoutRadius: number,
  font: opentype.Font,
  curveTolerance: number,
): PositionedTextLayout | null => {
  const groups = tokenizeText(face.text);
  const words = flattenWords(groups);
  if (words.length === 0) {
    return emptyLayout(face.requestedTextSize, ["Text field is empty."]);
  }

  // Overlong word check at this size against maximum chord (diameter).
  const maxWidth = 2 * layoutRadius;
  for (const word of words) {
    const width = measureWordWidth(word, textSizeMm, font);
    if (width > maxWidth + 1e-6) {
      return null;
    }
  }

  const glyphHeight = glyphHeightForSize(font, textSizeMm);
  const minLines = Math.max(groups.filter((g) => g.words.length > 0).length, 1);
  const maxLines = words.length;
  const candidates: WrapAttempt[] = [];

  for (let lineCount = minLines; lineCount <= maxLines; lineCount += 1) {
    const { positions } = calculateLinePositions(lineCount, glyphHeight, face.lineSpacing);
    const chords = calculateChordWidths(positions, layoutRadius);
    if (chords.some((chord) => !chord.possible)) {
      continue;
    }
    const availableWidths = chords.map((chord) => chord.availableWidth);
    const wrap = wrapGroupsToCircle(groups, availableWidths, textSizeMm, font);
    if (wrap) {
      candidates.push(wrap);
    }
  }

  const best = pickBestWrap(candidates);
  if (!best) {
    return null;
  }

  for (const candidate of [...candidates].sort((a, b) => a.score - b.score)) {
    const attempt = buildPositionedLayout(candidate, textSizeMm, face, layoutRadius, font, curveTolerance);
    if (attempt?.fits) {
      return attempt;
    }
  }

  return null;
};

const wordFitsAtMinimum = (face: FaceParameters, layoutRadius: number, font: opentype.Font): string | null => {
  const words = flattenWords(tokenizeText(face.text));
  const maxWidth = 2 * layoutRadius;
  for (const word of words) {
    const width = measureWordWidth(word, face.minimumTextSize, font);
    if (width > maxWidth + 1e-6) {
      return `“${word}” cannot fit at the minimum text size. Shorten the word or insert a space where it may wrap.`;
    }
  }
  return null;
};

export const fitTextToCircle = (
  face: FaceParameters,
  options: FitTextToCircleOptions,
): PositionedTextLayout => {
  const font = options.font ?? loadFontSync();
  const curveTolerance = options.curveTolerance ?? 0.04;
  const sizeTolerance = options.sizeTolerance ?? 0.01;
  const { layoutRadius } = options;

  const trimmed = face.text.trim();
  if (trimmed.length === 0) {
    return emptyLayout(face.requestedTextSize, ["Text field is empty."]);
  }

  const overlong = wordFitsAtMinimum(face, layoutRadius, font);
  if (overlong) {
    return emptyLayout(face.requestedTextSize, [overlong]);
  }

  if (!face.autoShrink) {
    const layout = tryLayoutAtSize(face, face.requestedTextSize, layoutRadius, font, curveTolerance);
    if (!layout || !layout.fits) {
      return emptyLayout(face.requestedTextSize, [
        "Text does not fit inside the usable circle at the requested fixed size.",
      ]);
    }
    return layout;
  }

  // Binary search largest size in [minimum, requested] that fits.
  let low = face.minimumTextSize;
  let high = face.requestedTextSize;
  let best: PositionedTextLayout | null = tryLayoutAtSize(face, high, layoutRadius, font, curveTolerance);

  if (best?.fits) {
    return best;
  }

  best = null;
  while (high - low > sizeTolerance) {
    const mid = (low + high) / 2;
    const candidate = tryLayoutAtSize(face, mid, layoutRadius, font, curveTolerance);
    if (candidate?.fits) {
      best = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }

  // Final check at low end of search.
  if (!best) {
    best = tryLayoutAtSize(face, face.minimumTextSize, layoutRadius, font, curveTolerance);
  }

  if (!best?.fits) {
    return emptyLayout(face.requestedTextSize, [
      "Text cannot fit at the configured minimum font size.",
    ]);
  }

  if (best.effectiveTextSize + 0.05 < face.requestedTextSize * 0.85) {
    best.warnings.push("Text was reduced substantially from the requested size.");
  }

  return best;
};

/** Contours for a single line at a given size (helper for tests). */
export const contoursForLine = (
  text: string,
  textSizeMm: number,
  curveTolerance = 0.04,
  font?: opentype.Font,
): FlatContour[] =>
  opentypeToContours(font ?? loadFontSync(), text, { textSizeMm, curveTolerance });
