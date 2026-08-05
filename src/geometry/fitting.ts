import type { CoinFitMode } from "../model/coinParameters";

export interface TextPoint {
  x: number;
  y: number;
}

export interface FitTextOptions {
  points: readonly TextPoint[];
  requestedSize: number;
  usableRadius: number;
  rotationDegrees?: number;
  fitMode: Extract<CoinFitMode, "none" | "shrink-text">;
}

export interface FitTextSuccess {
  ok: true;
  scale: number;
  effectiveSize: number;
  points: TextPoint[];
}

export interface FitTextBlocked {
  ok: false;
  scale: 1;
  effectiveSize: number;
  points: TextPoint[];
  error: {
    code: "text.outsideUsableRadius";
    message: string;
  };
}

export type FitTextResult = FitTextSuccess | FitTextBlocked;

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const getMaxRadius = (points: readonly TextPoint[]): number =>
  points.reduce((maxRadius, point) => Math.max(maxRadius, Math.hypot(point.x, point.y)), 0);

const rotatePoints = (points: readonly TextPoint[], rotationDegrees = 0): TextPoint[] => {
  const radians = degreesToRadians(rotationDegrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return points.map((point) => ({
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }));
};

const scalePoints = (points: readonly TextPoint[], scale: number): TextPoint[] =>
  points.map((point) => ({ x: point.x * scale, y: point.y * scale }));

export const fitTextToUsableRadius = ({
  points,
  requestedSize,
  usableRadius,
  rotationDegrees = 0,
  fitMode,
}: FitTextOptions): FitTextResult => {
  const rotatedPoints = rotatePoints(points, rotationDegrees);
  const maxRadius = getMaxRadius(rotatedPoints);
  const fits = maxRadius <= usableRadius;

  if (fits) {
    return {
      ok: true,
      scale: 1,
      effectiveSize: requestedSize,
      points: rotatedPoints,
    };
  }

  if (fitMode === "none") {
    return {
      ok: false,
      scale: 1,
      effectiveSize: requestedSize,
      points: rotatedPoints,
      error: {
        code: "text.outsideUsableRadius",
        message: "Text extends outside the usable coin radius.",
      },
    };
  }

  const scale = usableRadius / maxRadius;

  return {
    ok: true,
    scale,
    effectiveSize: requestedSize * scale,
    points: scalePoints(rotatedPoints, scale),
  };
};
