import type { CoinFitMode } from "../model/coinParameters";

export type TextPoint = readonly [number, number];

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
  fitMode: CoinFitMode;
  requestedSize: number;
  effectiveSize: number;
  appliedScale: number;
  usableRadius: number;
  requiredRadius: number;
  overflowRadius: number;
  fits: boolean;
  wasShrunk: boolean;
  boundsBeforeCentering: TextBounds | null;
  boundsAfterTransform: TextBounds | null;
  error?: FixedModeFitError;
}

export interface TextCircleFitResult {
  requestedSize: number;
  effectiveSize: number;
  appliedScale: number;
  points: TextPoint[];
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
  points.reduce((maximumRadius, [x, y]) => Math.max(maximumRadius, Math.sqrt(x * x + y * y)), 0);

const buildFixedModeError = (requestedSize: number, usableRadius: number, requiredRadius: number): FixedModeFitError => ({
  code: "text.fixedSizeOverflow",
  message: "Text does not fit inside the usable circle at the requested fixed size.",
  requestedSize,
  usableRadius,
  requiredRadius,
});

export const fitTextToCircle = (
  flattenedTextPoints: readonly TextPoint[],
  requestedSize: number,
  usableRadius: number,
  rotationDegrees: number,
  fitMode: CoinFitMode,
): TextCircleFitResult => {
  const boundsBeforeCentering = getBounds(flattenedTextPoints);
  const centerX = boundsBeforeCentering?.centerX ?? 0;
  const centerY = boundsBeforeCentering?.centerY ?? 0;
  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const centeredRotatedPoints = flattenedTextPoints.map<TextPoint>(([x, y]) => {
    const centeredX = x - centerX;
    const centeredY = y - centerY;

    return [centeredX * cos - centeredY * sin, centeredX * sin + centeredY * cos];
  });

  const requiredRadiusBeforeScale = getMaximumRadius(centeredRotatedPoints);
  const shouldShrink = fitMode === "shrink-text" && requiredRadiusBeforeScale > usableRadius && usableRadius >= 0;
  const appliedScale = shouldShrink ? usableRadius / requiredRadiusBeforeScale : 1;
  const transformedPoints = centeredRotatedPoints.map<TextPoint>(([x, y]) => [x * appliedScale, y * appliedScale]);
  const requiredRadius = getMaximumRadius(transformedPoints);
  const fits = requiredRadius <= usableRadius;
  const effectiveSize = requestedSize * appliedScale;
  const error = !fits && fitMode === "none" ? buildFixedModeError(requestedSize, usableRadius, requiredRadius) : undefined;

  return {
    requestedSize,
    effectiveSize,
    appliedScale,
    points: transformedPoints,
    diagnostics: {
      fitMode,
      requestedSize,
      effectiveSize,
      appliedScale,
      usableRadius,
      requiredRadius,
      overflowRadius: Math.max(0, requiredRadius - usableRadius),
      fits,
      wasShrunk: appliedScale < 1,
      boundsBeforeCentering,
      boundsAfterTransform: getBounds(transformedPoints),
      error,
    },
  };
};
