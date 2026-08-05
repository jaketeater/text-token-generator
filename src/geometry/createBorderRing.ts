import { booleans, extrusions, primitives, transforms } from "@jscad/modeling";
import type { geometries } from "@jscad/modeling";

import type { CoinParameters } from "../model/coinParameters";
import type { Geom3 } from "../model/generatedCoin";

/** Tiny radial gap so body and ring do not share a coincident cylindrical face. */
export const BODY_RING_CLEARANCE_MM = 0.003;

export const createCenteredCoinCylinder = (
  radius: number,
  thickness: number,
  segments: number,
): Geom3 =>
  transforms.translateZ(thickness / 2, primitives.cylinder({ radius, height: thickness, segments })) as Geom3;

/**
 * Full-thickness border as an extruded 2D annulus.
 * Prefer this over 3D cylinder-subtract, which produced non-manifold meshes in Orca.
 */
export const createBorderRing = (parameters: CoinParameters): Geom3 => {
  const outerRadius = parameters.diameter / 2;
  const innerRadius = outerRadius - parameters.borderWidth;
  const ringProfile = booleans.subtract(
    primitives.circle({ radius: outerRadius, segments: parameters.circleSegments }),
    primitives.circle({ radius: innerRadius, segments: parameters.circleSegments }),
  ) as geometries.geom2.Geom2;

  return extrusions.extrudeLinear({ height: parameters.thickness }, ringProfile) as Geom3;
};

export const createCenterBody = (parameters: CoinParameters): Geom3 => {
  const innerRadius = parameters.diameter / 2 - parameters.borderWidth;
  const bodyRadius = Math.max(0, innerRadius - BODY_RING_CLEARANCE_MM);
  return createCenteredCoinCylinder(bodyRadius, parameters.thickness, parameters.circleSegments);
};
