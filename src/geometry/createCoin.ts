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

const getCenterRadius = (parameters: CoinParameters): number =>
  Math.max(0, parameters.diameter / 2 - parameters.borderWidth);

const getBooleanFitMode = (fitMode: CoinFitMode): Extract<CoinFitMode, "none" | "shrink-text"> =>
  fitMode === "none" ? "none" : "shrink-text";

const scaleContourToRequestedSize = (
  contour: readonly { x: number; y: number }[],
  textSize: number,
): TextContour => contour.map((point) => [point.x * textSize, point.y * textSize]);

const rebuildContoursFromFittedPoints = (
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
  const requestedContours = textToContours(faceParameters.text.trim()).contours.map((contour) =>
    scaleContourToRequestedSize(contour, faceParameters.textSize),
  );
  const flattenedPoints = requestedContours.flat();
  const fitResult = fitTextToCircle(
    flattenedPoints,
    faceParameters.textSize,
    getCenterRadius(parameters),
    faceParameters.rotationDegrees,
    getBooleanFitMode(parameters.fitMode),
  );

  return {
    contours: rebuildContoursFromFittedPoints(requestedContours, fitResult.points),
    requestedSize: faceParameters.textSize,
    fittedSize: fitResult.effectiveSize,
  };
};

const createTextInsertSolid = (parameters: CoinParameters, faceKey: FaceKey): GeneratedCoinPart => {
  const faceParameters = parameters[faceKey];

  return createFaceText({
    face: faceKey === "topFace" ? "top" : "bottom",
    faceParameters,
    fittedText: createFittedTextContours(faceParameters, parameters),
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
  const rawCenterBody = createCenteredCoinCylinder(getCenterRadius(parameters), parameters.thickness, parameters.circleSegments);
  const borderRing = createBorderRing(parameters);
  const topText = createTextInsertSolid(parameters, "topFace");
  const bottomText = createTextInsertSolid(parameters, "bottomFace");
  const recessedBody = booleans.subtract(rawCenterBody, topText.geometry, bottomText.geometry);

  const parts = {
    body: createPart("body", recessedBody, parameters.bodyColor),
    borderRing: createPart("borderRing", borderRing, parameters.borderColor),
    topText,
    bottomText,
  } satisfies GeneratedCoinParts;

  return { parts };
};

export const createCoin = generateCoin;
