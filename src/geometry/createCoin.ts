import { booleans, geometries } from "@jscad/modeling";

import type { CoinParameters, FaceParameters } from "../model/coinParameters";
import {
  COIN_PART_IDS,
  COIN_PART_NAMES,
  type CoinPartKey,
  type GeneratedCoin,
  type GeneratedCoinPart,
  type GeneratedCoinParts,
} from "../model/generatedCoin";
import { createBorderRing, createCenteredCoinCylinder } from "./createBorderRing";
import { createFaceText, type FittedTextContours, type TextContour } from "./createFaceText";
import { fitTextToCircle, type CircleTextFitMode } from "./fitTextToCircle";
import { textToContours } from "./textContours";

const createPart = (
  key: CoinPartKey,
  geometry: geometries.geom3.Geom3,
  color: string,
): GeneratedCoinPart => ({
  id: COIN_PART_IDS[key],
  name: COIN_PART_NAMES[key],
  displayName: COIN_PART_NAMES[key],
  geometry,
  color,
  metadata: {
    id: COIN_PART_IDS[key],
    key,
    displayName: COIN_PART_NAMES[key],
  },
});

const createFittedTextContours = (
  faceParameters: FaceParameters,
  fitMode: CoinParameters["fitMode"],
  usableRadius: number,
): FittedTextContours => {
  const scaledContours = textToContours(faceParameters.text, { textSizeMm: faceParameters.textSize }).contours.map((contour) =>
    contour.map((point) => [point.x, point.y] as const),
  );
  const effectiveFitMode: CircleTextFitMode = faceParameters.autoFit && fitMode === "shrink-only" ? "shrink-only" : "fixed";
  const fittedText = fitTextToCircle(
    scaledContours,
    faceParameters.textSize,
    usableRadius,
    faceParameters.rotationDegrees,
    effectiveFitMode,
  );
  return {
    contours: fittedText.contours,
    requestedSize: fittedText.requestedSize,
    fittedSize: fittedText.fittedSize,
    scale: fittedText.scale,
    diagnostics: fittedText.diagnostics,
  };
};

export const createCoin = (parameters: CoinParameters): GeneratedCoin => {
  const outerRadius = parameters.diameter / 2;
  const innerRadius = outerRadius - parameters.borderWidth;
  const usableRadius = innerRadius;
  const centerCylinder = createCenteredCoinCylinder(innerRadius, parameters.thickness, parameters.circleSegments);
  const topText = createFaceText({
    face: "top",
    faceParameters: parameters.topFace,
    fittedText: createFittedTextContours(parameters.topFace, parameters.fitMode, usableRadius),
    thickness: parameters.thickness,
  });
  const bottomText = createFaceText({
    face: "bottom",
    faceParameters: parameters.bottomFace,
    fittedText: createFittedTextContours(parameters.bottomFace, parameters.fitMode, usableRadius),
    thickness: parameters.thickness,
  });
  const body = booleans.subtract(centerCylinder, topText.geometry, bottomText.geometry) as geometries.geom3.Geom3;

  const parts = {
    body: createPart("body", body, parameters.bodyColor),
    borderRing: createPart("borderRing", createBorderRing(parameters), parameters.borderColor),
    topText,
    bottomText,
  } satisfies GeneratedCoinParts;

  return { parts };
};
