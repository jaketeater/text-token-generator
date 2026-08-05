import { booleans, extrusions, primitives } from "@jscad/modeling";
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
  const ringProfile = booleans.subtract(
    primitives.circle({ radius: outerRadius, segments: parameters.circleSegments }),
    primitives.circle({ radius: innerRadius, segments: parameters.circleSegments }),
  ) as geometries.geom2.Geom2;

  return extrusions.extrudeLinear({ height: parameters.thickness }, ringProfile) as geometries.geom3.Geom3;
};
