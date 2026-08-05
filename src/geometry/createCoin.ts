import { booleans } from "@jscad/modeling";
import type { geometries } from "@jscad/modeling";

import type { CoinFitMode, CoinParameters, FaceParameters } from "../model/coinParameters";
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
import { fitTextToCircle, type TextPoint } from "./fitTextToCircle";
import { textToContours } from "./textContours";

type Geom3 = geometries.geom3.Geom3;

type FaceKey = "topFace" | "bottomFace";

const getUsableRadius = (parameters: CoinParameters): number =>
  Math.max(0, parameters.diameter / 2 - parameters.borderWidth);

const getSupportedFitMode = (fitMode: CoinFitMode): Extract<CoinFitMode, "none" | "shrink-text"> =>
  fitMode === "none" ? "none" : "shrink-text";

const scaleContour = (contour: readonly { x: number; y: number }[], textSize: number): TextContour =>
  contour.map((point) => [point.x * textSize, point.y * textSize]);

const transformContourPoints = (
  contours: readonly TextContour[],
  fittedPoints: readonly TextPoint[],
): TextContour[] => {
  let cursor = 0;

  return contours.map((contour) =>
    contour.map(() => {
      const point = fittedPoints[cursor];
      cursor += 1;
      return point;
    }),
  );
};

const createFittedTextContours = (
  faceParameters: FaceParameters,
  parameters: CoinParameters,
): FittedTextContours => {
  const rawContours = textToContours(faceParameters.text.trim()).contours;
  const requestedSizeContours = rawContours.map((contour) => scaleContour(contour, faceParameters.textSize));
  const flattenedPoints = requestedSizeContours.flat();
  const fitResult = fitTextToCircle(
    flattenedPoints,
    faceParameters.textSize,
    getUsableRadius(parameters),
    faceParameters.rotationDegrees,
    getSupportedFitMode(parameters.fitMode),
  );

  return {
    contours: transformContourPoints(requestedSizeContours, fitResult.points),
    requestedSize: faceParameters.textSize,
    fittedSize: fitResult.effectiveSize,
  };
};

const createTextInsertSolid = (parameters: CoinParameters, faceKey: FaceKey): GeneratedCoinPart => {
  const face = faceKey === "topFace" ? "top" : "bottom";
  const faceParameters = parameters[faceKey];
  const fittedText = createFittedTextContours(faceParameters, parameters);

  return createFaceText({
    face,
    faceParameters,
    fittedText,
    thickness: parameters.thickness,
  });
};

const createPart = (
  key: CoinPartKey,
  geometry: Geom3,
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

export const generateCoin = (parameters: CoinParameters): GeneratedCoin => {
  const rawCenterBody = createCenteredCoinCylinder(getUsableRadius(parameters), parameters.thickness, parameters.circleSegments);
  const borderRing = createBorderRing(parameters);
  const topText = createTextInsertSolid(parameters, "topFace");
  const bottomText = createTextInsertSolid(parameters, "bottomFace");
  const body = booleans.subtract(rawCenterBody, topText.geometry, bottomText.geometry);

  const parts = {
    body: createPart("body", body, parameters.bodyColor),
    borderRing: createPart("borderRing", borderRing, parameters.borderColor),
    topText,
    bottomText,
  } satisfies GeneratedCoinParts;

  return { parts };
};

export const createCoin = generateCoin;
