import { booleans, primitives } from "@jscad/modeling";
import type { geometries } from "@jscad/modeling";

import type { CoinParameters } from "../model/coinParameters";

export const getCoinCylinderCenter = (thickness: number): [number, number, number] => [0, 0, thickness / 2];

export const createCenteredCoinCylinder = (
  radius: number,
  thickness: number,
  circleSegments: number,
): geometries.geom3.Geom3 =>
  primitives.cylinder({
    center: getCoinCylinderCenter(thickness),
    height: thickness,
    radius,
    segments: circleSegments,
  });

export const createBorderRing = (parameters: CoinParameters): geometries.geom3.Geom3 => {
  const outerRadius = parameters.diameter / 2;
  const innerRadius = outerRadius - parameters.borderWidth;
  const outerCylinder = createCenteredCoinCylinder(outerRadius, parameters.thickness, parameters.circleSegments);
  const innerCylinder = createCenteredCoinCylinder(innerRadius, parameters.thickness, parameters.circleSegments);

  return booleans.subtract(outerCylinder, innerCylinder);
};
