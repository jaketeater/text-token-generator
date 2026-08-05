import { extrusions, transforms } from "@jscad/modeling";

import { contourGroupsToTextGeometry, contoursToTextGeometry } from "../font/textGeometry";
import type { FlatContour } from "../font/flattenBezier";
import type { BottomFlipOrientation, FaceParameters } from "../model/coinParameters";
import type { Geom3 } from "../model/generatedCoin";

export type FaceSide = "top" | "bottom";

/**
 * Bottom-only orientation on the extruded solid so lettering reads after a physical coin flip.
 * Applied in 3D after extrusion to preserve counter topology.
 */
const applyBottomFlip3d = (solid: Geom3, orientation: BottomFlipOrientation = "vertical-axis"): Geom3 => {
  switch (orientation) {
    case "horizontal-axis":
      return transforms.rotateX(Math.PI, solid) as Geom3;
    case "vertical-axis":
    default:
      return transforms.rotateY(Math.PI, solid) as Geom3;
  }
};

export const createFaceTextSolid = (
  face: FaceSide,
  faceParameters: FaceParameters,
  contours: FlatContour[] | FlatContour[][],
  thickness: number,
  contourGroups?: FlatContour[][],
): Geom3 => {
  const groups =
    contourGroups ??
    (Array.isArray(contours[0]) && Array.isArray((contours[0] as FlatContour[])[0])
      ? (contours as FlatContour[][])
      : undefined);

  const text2d =
    groups && groups.length > 0
      ? contourGroupsToTextGeometry(groups)
      : contoursToTextGeometry(contours as FlatContour[]);

  const depth = faceParameters.depth;
  const extruded = extrusions.extrudeLinear({ height: depth }, text2d) as Geom3;

  if (face === "top") {
    return transforms.translateZ(thickness - depth, extruded) as Geom3;
  }

  const oriented = applyBottomFlip3d(extruded, faceParameters.flipOrientation);
  // rotateX/Y(π) maps z → −z; shift back so the insert sits in [0, depth].
  return transforms.translateZ(depth, oriented) as Geom3;
};

export const faceTextZBounds = (
  face: FaceSide,
  depth: number,
  thickness: number,
): readonly [number, number] =>
  face === "top" ? [thickness - depth, thickness] : [0, depth];
