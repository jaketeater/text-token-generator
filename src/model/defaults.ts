import type { CoinParameters, FaceParameters } from "./coinParameters";

export const DEFAULT_TOP_FACE: FaceParameters = {
  text: "TOKEN",
  requestedTextSize: 6.5,
  minimumTextSize: 2.5,
  depth: 0.4,
  color: "#ffffff",
  lineSpacing: 1.15,
  rotationDegrees: 0,
  autoShrink: true,
  bold: true,
};

export const DEFAULT_BOTTOM_FACE: FaceParameters = {
  text: "TEXT TOKEN",
  requestedTextSize: 6,
  minimumTextSize: 1.5,
  depth: 0.4,
  color: "#ffffff",
  lineSpacing: 1,
  rotationDegrees: 0,
  autoShrink: true,
  bold: false,
  flipOrientation: "vertical-axis",
};

export const DEFAULT_COIN_PARAMETERS: CoinParameters = {
  diameter: 50,
  thickness: 3.5,
  borderWidth: 2,
  edgeRadius: 1,
  bodyColor: "#000000",
  borderColor: "#ff0000",
  nozzleWidth: 0.4,
  layerHeight: 0.2,
  top: DEFAULT_TOP_FACE,
  bottom: DEFAULT_BOTTOM_FACE,
  circleSegments: 128,
  curveTolerance: 0.04,
};

export const GEOMETRY_EPSILON_MM = 0.01;
