import { geometries } from "@jscad/modeling";

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
import { validateCoinParameters, withGeometryValidationInputs } from "./validateGeometry";

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


const WHITE_SPACE = /\s+/u;

const contoursFromText = (text: string, textSize: number): TextContour[] =>
  textToContours(text, { textSizeMm: textSize }).contours.map((contour) =>
    contour.map((point) => [point.x, point.y] as const),
  );

const contoursFitCircle = (contours: readonly TextContour[], usableRadius: number): boolean => {
  if (contours.length === 0) {
    return true;
  }

  return fitTextToCircle(contours, 1, usableRadius, 0, "fixed").diagnostics.fits;
};

const wrapTextForCircle = (text: string, textSize: number, usableRadius: number): string => {
  const words = text.trim().split(WHITE_SPACE).filter((word) => word.length > 0);

  if (words.length <= 1) {
    return words.join("");
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidateLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
    const candidateText = [...lines, candidateLine].join("\n");

    if (contoursFitCircle(contoursFromText(candidateText, textSize), usableRadius)) {
      currentLine = candidateLine;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(word);
      currentLine = "";
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.join("\n");
};

const createFittedTextContours = (
  faceParameters: FaceParameters,
  fitMode: CoinParameters["fitMode"],
  usableRadius: number,
): FittedTextContours => {
  const wrappedText = wrapTextForCircle(faceParameters.text, faceParameters.textSize, usableRadius);
  const scaledContours = contoursFromText(wrappedText, faceParameters.textSize);
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

const BODY_RING_CLEARANCE_MM = 0.003;

export const createCoin = (parameters: CoinParameters): GeneratedCoin => {
  const validationParameters = withGeometryValidationInputs(parameters);
  const validation = validateCoinParameters(validationParameters);
  const outerRadius = parameters.diameter / 2;
  const innerRadius = outerRadius - parameters.borderWidth;
  const usableRadius = innerRadius;
  const bodyRadius = Math.max(0, innerRadius - BODY_RING_CLEARANCE_MM);
  const centerCylinder = createCenteredCoinCylinder(bodyRadius, parameters.thickness, parameters.circleSegments);
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
  const body = centerCylinder;

  const parts = {
    body: createPart("body", body, parameters.bodyColor),
    borderRing: createPart("borderRing", createBorderRing(parameters), parameters.borderColor),
    topText,
    bottomText,
  } satisfies GeneratedCoinParts;

  return { parts, validation };
};
