import type { CoinFitMode } from "../model/coinParameters";

export type TextPoint = readonly [number, number];
export type TextContour = readonly TextPoint[];
export type CircleTextFitMode = Extract<CoinFitMode, "fixed" | "shrink-only">;

export interface TextBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface FixedModeFitError {
  code: "text.fixedSizeOverflow";
  message: string;
  requestedSize: number;
  usableRadius: number;
  requiredRadius: number;
}

export interface TextCircleFitDiagnostics {
  fitMode: CircleTextFitMode;
  requestedSize: number;
  fittedSize: number;
  effectiveSize: number;
  scale: number;
  appliedScale: number;
  usableRadius: number;
  requiredRadius: number;
  overflowRadius: number;
  fits: boolean;
  wasShrunk: boolean;
  fitErrors: FixedModeFitError[];
  transformedContours: TextPoint[][];
  boundsBeforeCentering: TextBounds | null;
  boundsAfterTransform: TextBounds | null;
  error?: FixedModeFitError;
}

export interface TextCircleFitResult {
  requestedSize: number;
  fittedSize: number;
  effectiveSize: number;
  scale: number;
  appliedScale: number;
  points: TextPoint[];
  contours: TextPoint[][];
  diagnostics: TextCircleFitDiagnostics;
}

const EMPTY_BOUNDS: TextBounds | null = null;

const getBounds = (points: readonly TextPoint[]): TextBounds | null => {
  if (points.length === 0) {
    return EMPTY_BOUNDS;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
};

const getMaximumRadius = (points: readonly TextPoint[]): number =>
  points.reduce((maximumRadius, [x, y]) => Math.max(maximumRadius, Math.hypot(x, y)), 0);

const buildFixedModeError = (requestedSize: number, usableRadius: number, requiredRadius: number): FixedModeFitError => ({
  code: "text.fixedSizeOverflow",
  message: "Text does not fit inside the usable circle at the requested fixed size.",
  requestedSize,
  usableRadius,
  requiredRadius,
});

const normalizeContours = (contoursOrPoints: readonly TextContour[] | readonly TextPoint[]): TextPoint[][] => {
  if (contoursOrPoints.length === 0) {
    return [];
  }

  const firstEntry = contoursOrPoints[0];
  if (Array.isArray(firstEntry) && typeof firstEntry[0] === "number") {
    return [(contoursOrPoints as readonly TextPoint[]).map((point) => [point[0], point[1]])];
  }

  return (contoursOrPoints as readonly TextContour[]).map((contour) => contour.map((point) => [point[0], point[1]]));
};

export const fitTextToCircle = (
  flattenedTextContours: readonly TextContour[] | readonly TextPoint[],
  requestedSize: number,
  usableRadius: number,
  rotationDegrees: number,
  fitMode: CircleTextFitMode,
): TextCircleFitResult => {
  const sourceContours = normalizeContours(flattenedTextContours);
  const flattenedTextPoints = sourceContours.flat();
  const boundsBeforeCentering = getBounds(flattenedTextPoints);
  const centerX = boundsBeforeCentering?.centerX ?? 0;
  const centerY = boundsBeforeCentering?.centerY ?? 0;
  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const centeredRotatedContours = sourceContours.map((contour) => contour.map<TextPoint>(([x, y]) => {
    const centeredX = x - centerX;
    const centeredY = y - centerY;

    return [centeredX * cos - centeredY * sin, centeredX * sin + centeredY * cos];
  }));
  const centeredRotatedPoints = centeredRotatedContours.flat();
  const rmax = getMaximumRadius(centeredRotatedPoints);
  const shouldShrink = fitMode === "shrink-only" && rmax > usableRadius && usableRadius >= 0;
  const scale = shouldShrink && rmax > 0 ? usableRadius / rmax : 1;
  const transformedContours = centeredRotatedContours.map((contour) => contour.map<TextPoint>(([x, y]) => [x * scale, y * scale]));
  const transformedPoints = transformedContours.flat();
  const requiredRadius = getMaximumRadius(transformedPoints);
  const fits = requiredRadius <= usableRadius + 1e-10;
  const fittedSize = requestedSize * scale;
  const fixedModeError = !fits && fitMode === "fixed" ? buildFixedModeError(requestedSize, usableRadius, requiredRadius) : undefined;
  const fitErrors = fixedModeError ? [fixedModeError] : [];

  return {
    requestedSize,
    fittedSize,
    effectiveSize: fittedSize,
    scale,
    appliedScale: scale,
    points: transformedPoints,
    contours: transformedContours,
    diagnostics: {
      fitMode,
      requestedSize,
      fittedSize,
      effectiveSize: fittedSize,
      scale,
      appliedScale: scale,
      usableRadius,
      requiredRadius,
      overflowRadius: Math.max(0, requiredRadius - usableRadius),
      fits,
      wasShrunk: scale < 1,
      fitErrors,
      transformedContours,
      boundsBeforeCentering,
      boundsAfterTransform: getBounds(transformedPoints),
      error: fixedModeError,
    },
  };
};
