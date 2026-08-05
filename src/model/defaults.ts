import type { CoinParameters, FaceParameters } from "./coinParameters";

export const DEFAULT_TOP_FACE: FaceParameters = {
  text: "TOKEN",
  requestedTextSize: 6.5,
  minimumTextSize: 2.5,
  depth: 0.2,
  color: "#111827",
  lineSpacing: 1.15,
  rotationDegrees: 0,
  autoShrink: true,
};

export const DEFAULT_BOTTOM_FACE: FaceParameters = {
  text: "TEXT TOKEN",
  requestedTextSize: 4.25,
  minimumTextSize: 1.5,
  depth: 0.2,
  color: "#111827",
  lineSpacing: 1,
  rotationDegrees: 0,
  autoShrink: true,
  flipOrientation: "vertical-axis",
};

export const DEFAULT_COIN_PARAMETERS: CoinParameters = {
  diameter: 39,
  thickness: 3.5,
  borderWidth: 2,
  bodyColor: "#d1d5db",
  borderColor: "#9ca3af",
  nozzleWidth: 0.4,
  layerHeight: 0.2,
  top: DEFAULT_TOP_FACE,
  bottom: DEFAULT_BOTTOM_FACE,
  circleSegments: 128,
  curveTolerance: 0.04,
};

export const GEOMETRY_EPSILON_MM = 0.01;
