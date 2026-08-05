export const BOTTOM_FLIP_ORIENTATIONS = ["horizontal-axis", "vertical-axis"] as const;

export type BottomFlipOrientation = (typeof BOTTOM_FLIP_ORIENTATIONS)[number];

export interface FaceParameters {
  text: string;
  requestedTextSize: number;
  minimumTextSize: number;
  depth: number;
  color: string;
  lineSpacing: number;
  rotationDegrees: number;
  autoShrink: boolean;
  /** Bottom face only: physical flip convention when viewing underside. */
  flipOrientation?: BottomFlipOrientation;
}

export interface CoinParameters {
  diameter: number;
  thickness: number;
  borderWidth: number;

  bodyColor: string;
  borderColor: string;

  nozzleWidth: number;
  layerHeight: number;

  top: FaceParameters;
  bottom: FaceParameters;

  circleSegments: number;
  curveTolerance: number;
}
