import type { CoinParameters, FaceParameters } from "./coinParameters";

export const DEFAULT_TOP_FACE_PARAMETERS: FaceParameters = {
  text: "TOKEN",
  textSize: 6.5,
  depth: 0.2,
  color: "#111827",
  rotationDegrees: 0,
  autoFit: true,
};

export const DEFAULT_BOTTOM_FACE_PARAMETERS: FaceParameters = {
  text: "TEXT TOKEN",
  textSize: 3.25,
  depth: 0.2,
  color: "#111827",
  rotationDegrees: 0,
  autoFit: true,
  bottomTextOrientation: "left-to-right",
};

export const DEFAULT_COIN_PARAMETERS: CoinParameters = {
  diameter: 39,
  thickness: 3.5,
  borderWidth: 2,
  bodyColor: "#d1d5db",
  borderColor: "#9ca3af",
  topFace: DEFAULT_TOP_FACE_PARAMETERS,
  bottomFace: DEFAULT_BOTTOM_FACE_PARAMETERS,
  fitMode: "shrink-only",
  circleSegments: 128,
  curveTolerance: 0.01,
};
