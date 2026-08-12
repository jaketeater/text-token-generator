import { booleans, extrusions, geometries, primitives, transforms } from "@jscad/modeling";
import type { geometries as Geometries } from "@jscad/modeling";

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

const quarterArcPoints = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments: number,
): Array<[number, number]> => {
  const points: Array<[number, number]> = [];
  const steps = Math.max(1, segments);
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const angle = startAngle + (endAngle - startAngle) * t;
    points.push([centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)]);
  }
  return points;
};

/**
 * Half-profile in the XY plane for extrudeRotate: X = radial, Y = height.
 * Outer top and bottom corners get quarter-circle fillets of radius R.
 */
export const createFilletedRingProfile = (
  outerRadius: number,
  innerRadius: number,
  thickness: number,
  edgeRadius: number,
  circleSegments: number,
): Geometries.geom2.Geom2 => {
  const filletSegments = Math.max(8, Math.round(circleSegments / 16));
  const points: Array<[number, number]> = [
    [innerRadius, 0],
    [outerRadius - edgeRadius, 0],
    ...quarterArcPoints(
      outerRadius - edgeRadius,
      edgeRadius,
      edgeRadius,
      -Math.PI / 2,
      0,
      filletSegments,
    ),
    [outerRadius, thickness - edgeRadius],
    ...quarterArcPoints(
      outerRadius - edgeRadius,
      thickness - edgeRadius,
      edgeRadius,
      0,
      Math.PI / 2,
      filletSegments,
    ),
    [innerRadius, thickness],
  ];

  return geometries.geom2.fromPoints(points);
};

const createSharpBorderRing = (
  outerRadius: number,
  innerRadius: number,
  thickness: number,
  segments: number,
): Geom3 => {
  const ringProfile = booleans.subtract(
    primitives.circle({ radius: outerRadius, segments }),
    primitives.circle({ radius: innerRadius, segments }),
  ) as Geometries.geom2.Geom2;

  return extrusions.extrudeLinear({ height: thickness }, ringProfile) as Geom3;
};

/**
 * Full-thickness border ring.
 * Sharp annulus when edgeRadius is 0; otherwise a revolved profile with filleted outer rims.
 */
export const createBorderRing = (parameters: CoinParameters): Geom3 => {
  const outerRadius = parameters.diameter / 2;
  const innerRadius = outerRadius - parameters.borderWidth;
  const edgeRadius = parameters.edgeRadius;

  if (!(edgeRadius > 0)) {
    return createSharpBorderRing(
      outerRadius,
      innerRadius,
      parameters.thickness,
      parameters.circleSegments,
    );
  }

  const profile = createFilletedRingProfile(
    outerRadius,
    innerRadius,
    parameters.thickness,
    edgeRadius,
    parameters.circleSegments,
  );

  return extrusions.extrudeRotate({ segments: parameters.circleSegments }, profile) as Geom3;
};

export const createCenterBody = (parameters: CoinParameters): Geom3 => {
  const innerRadius = parameters.diameter / 2 - parameters.borderWidth;
  const bodyRadius = Math.max(0, innerRadius - BODY_RING_CLEARANCE_MM);
  return createCenteredCoinCylinder(bodyRadius, parameters.thickness, parameters.circleSegments);
};
