import { extrusions, geometries, transforms } from "@jscad/modeling";

import { contoursToTextGeometry } from "../font/textGeometry";
import type { BottomTextOrientation, FaceParameters } from "../model/coinParameters";
import { COIN_PART_IDS, COIN_PART_NAMES, type GeneratedCoinPart } from "../model/generatedCoin";

export type FaceTextFace = "top" | "bottom";

export type Point2 = readonly [number, number] | { readonly x: number; readonly y: number };

export type TextContour = readonly Point2[];

export interface FittedTextContours {
  /** Fitted text contours in millimeters, centered/aligned by the text fitting step. */
  contours: readonly TextContour[];
  /** Text size originally requested by the user before fitting. */
  requestedSize: number;
  /** Text size after fitting was applied. */
  fittedSize: number;
  /** Scale applied by the circle fitting step. */
  scale: number;
  /** Diagnostics from fitting the real flattened text contours to the usable circle. */
  diagnostics: import("./fitTextToCircle").TextCircleFitDiagnostics;
}

export interface CreateFaceTextInput {
  face: FaceTextFace;
  faceParameters: FaceParameters;
  fittedText: FittedTextContours;
  thickness: number;
}

export interface FaceTextMetadata {
  face: FaceTextFace;
  requestedSize: number;
  fittedSize: number;
  scale: number;
  depth: number;
  zBounds: readonly [number, number];
}

export type FaceTextPart = GeneratedCoinPart & {
  metadata: GeneratedCoinPart["metadata"] & FaceTextMetadata;
};

type Geom2 = geometries.geom2.Geom2;
type Geom3 = geometries.geom3.Geom3;

const pointToFontPoint = (point: Point2): { x: number; y: number } => {
  if (Array.isArray(point)) {
    return { x: point[0], y: point[1] };
  }

  return { x: point.x, y: point.y };
};

const applyBottomReadabilityMirror = (text: Geom2): Geom2 => transforms.mirrorX(text) as Geom2;

const applyBottomFlipOrientation = (text: Geom2, orientation: BottomTextOrientation = "left-to-right"): Geom2 => {
  switch (orientation) {
    case "top-to-bottom":
      return transforms.rotateX(Math.PI, text) as Geom2;
    case "left-to-right":
    default:
      return transforms.rotateY(Math.PI, text) as Geom2;
  }
};

const createTopTextGeometry = (text: Geom2, depth: number, thickness: number): Geom3 => {
  const extruded = extrusions.extrudeLinear({ height: depth }, text) as Geom3;
  return transforms.translateZ(thickness - depth, extruded) as Geom3;
};

const createBottomTextGeometry = (text: Geom2, depth: number, orientation?: BottomTextOrientation): Geom3 => {
  const mirroredText = applyBottomReadabilityMirror(text);
  const orientedText = applyBottomFlipOrientation(mirroredText, orientation);
  return extrusions.extrudeLinear({ height: depth }, orientedText) as Geom3;
};

export const createFaceText = ({
  face,
  faceParameters,
  fittedText,
  thickness,
}: CreateFaceTextInput): FaceTextPart => {
  const depth = faceParameters.depth;
  const text2d = contoursToTextGeometry(fittedText.contours.map((contour) => contour.map(pointToFontPoint)));
  const geometry = face === "top"
    ? createTopTextGeometry(text2d, depth, thickness)
    : createBottomTextGeometry(text2d, depth, faceParameters.bottomTextOrientation);
  const key = face === "top" ? "topText" : "bottomText";
  const zBounds = face === "top" ? [thickness - depth, thickness] as const : [0, depth] as const;

  return {
    id: COIN_PART_IDS[key],
    name: COIN_PART_NAMES[key],
    displayName: COIN_PART_NAMES[key],
    geometry,
    color: faceParameters.color,
    metadata: {
      id: COIN_PART_IDS[key],
      key,
      displayName: COIN_PART_NAMES[key],
      face,
      requestedSize: fittedText.requestedSize,
      fittedSize: fittedText.fittedSize,
      scale: fittedText.scale,
      depth,
      zBounds,
    },
  };
};
