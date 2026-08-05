export const COIN_FIT_MODES = ["none", "shrink-text", "wrap-text"] as const;

export type CoinFitMode = (typeof COIN_FIT_MODES)[number];

export const BOTTOM_TEXT_ORIENTATIONS = ["upright", "flipped"] as const;

export type BottomTextOrientation = (typeof BOTTOM_TEXT_ORIENTATIONS)[number];

export interface FaceParameters {
  /** Text engraved or embossed on this coin face. */
  text: string;
  /** Text height in millimeters before auto-fit scaling. */
  textSize: number;
  /** Raised or recessed text depth in millimeters. */
  depth: number;
  /** Display/export color for text generated from this face. */
  color: string;
  /** Clockwise rotation for this face's text, in degrees. */
  rotationDegrees: number;
  /** Allows text generation to scale this face down to fit inside the usable coin area. */
  autoFit: boolean;
  /** Bottom-only orientation flag so bottom text can be mirrored/flipped for coin handling. */
  bottomTextOrientation?: BottomTextOrientation;
}

export interface CoinPrintValidationInputs {
  /** Optional slicer layer height in millimeters for manufacturability warnings. */
  layerHeight?: number;
  /** Optional printer nozzle width in millimeters for manufacturability warnings. */
  nozzleWidth?: number;
}

export interface CoinParameters {
  /** Overall coin diameter in millimeters. */
  diameter: number;
  /** Overall coin thickness in millimeters. */
  thickness: number;
  /** Raised border ring width in millimeters. */
  borderWidth: number;
  /** Display/export color for the main coin body. */
  bodyColor: string;
  /** Display/export color for the raised border ring. */
  borderColor: string;
  /** Parameters used to generate the top face text. */
  topFace: FaceParameters;
  /** Parameters used to generate the bottom face text. */
  bottomFace: FaceParameters;
  /** Global fitting strategy used by preview and export generation. */
  fitMode: CoinFitMode;
  /** Number of radial segments used when approximating circles. */
  circleSegments: number;
  /** Curve simplification tolerance in millimeters. */
  curveTolerance: number;
  /** Optional printer inputs used only for validation warnings. */
  validation?: CoinPrintValidationInputs;
}
