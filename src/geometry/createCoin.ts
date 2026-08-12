import { primitives } from "@jscad/modeling";

import { getFontForFace } from "../font/loadFont";
import { fitTextToCircle, type PositionedTextLayout } from "../layout/fitTextToCircle";
import type { CoinParameters } from "../model/coinParameters";
import { GEOMETRY_EPSILON_MM } from "../model/defaults";
import {
  COIN_PART_IDS,
  COIN_PART_NAMES,
  type CoinPartKey,
  type GeneratedCoin,
  type GeneratedCoinPart,
  type Geom3,
} from "../model/generatedCoin";
import { createBorderRing } from "./createBorderRing";
import { createBodyWithPockets } from "./createBodyWithPockets";
import { createFaceTextSolid } from "./createFaceText";
import { validateCoinParameters } from "./validateGeometry";

const createPart = (
  key: CoinPartKey,
  geometry: Geom3,
  color: string,
  exportShells?: Geom3[],
): GeneratedCoinPart => ({
  id: COIN_PART_IDS[key],
  key,
  name: COIN_PART_NAMES[key],
  color,
  geometry,
  ...(exportShells ? { exportShells } : {}),
});

const layoutRadiusFor = (parameters: CoinParameters): number =>
  parameters.diameter / 2 - parameters.borderWidth - GEOMETRY_EPSILON_MM;

const placeholderSolid = (): Geom3 => primitives.cuboid({ size: [0.01, 0.01, 0.01] }) as Geom3;

export const generateCoin = (parameters: CoinParameters): GeneratedCoin => {
  const layoutRadius = layoutRadiusFor(parameters);

  const topLayout: PositionedTextLayout = fitTextToCircle(parameters.top, {
    layoutRadius,
    curveTolerance: parameters.curveTolerance,
    font: getFontForFace(parameters.top.bold),
  });
  const bottomLayout: PositionedTextLayout = fitTextToCircle(parameters.bottom, {
    layoutRadius,
    curveTolerance: parameters.curveTolerance,
    font: getFontForFace(parameters.bottom.bold),
  });

  const validation = validateCoinParameters(parameters, topLayout, bottomLayout);

  const borderRing = createBorderRing(parameters);
  const { geometry: bodyGeometry, exportShells: bodyShells } = createBodyWithPockets(
    parameters,
    topLayout,
    bottomLayout,
  );

  let topTextGeometry: Geom3 = placeholderSolid();
  let bottomTextGeometry: Geom3 = placeholderSolid();

  if (topLayout.fits && topLayout.contours.length > 0) {
    topTextGeometry = createFaceTextSolid(
      "top",
      parameters.top,
      topLayout.contours,
      parameters.thickness,
      topLayout.contourGroups,
    );
  }

  if (bottomLayout.fits && bottomLayout.contours.length > 0) {
    bottomTextGeometry = createFaceTextSolid(
      "bottom",
      parameters.bottom,
      bottomLayout.contours,
      parameters.thickness,
      bottomLayout.contourGroups,
    );
  }

  const parts = {
    body: createPart("body", bodyGeometry, parameters.bodyColor, bodyShells),
    borderRing: createPart("borderRing", borderRing, parameters.borderColor),
    topText: createPart("topText", topTextGeometry, parameters.top.color),
    bottomText: createPart("bottomText", bottomTextGeometry, parameters.bottom.color),
  };

  const outerRadius = parameters.diameter / 2;
  const innerRadius = outerRadius - parameters.borderWidth;

  return {
    parts,
    topLayout,
    bottomLayout,
    validation,
    bounds: {
      width: parameters.diameter,
      depth: parameters.diameter,
      height: parameters.thickness,
      outerRadius,
      innerRadius,
    },
  };
};

/** Alias matching earlier naming in the codebase. */
export const createCoin = generateCoin;
