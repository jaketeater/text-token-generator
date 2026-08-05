import { booleans, extrusions, geometries, primitives, transforms } from "@jscad/modeling";
import type { geometries as Geometries } from "@jscad/modeling";

import { contourGroupsToTextGeometry, contoursToTextGeometry } from "../font/textGeometry";
import type { FlatContour } from "../font/flattenBezier";
import type { BottomFlipOrientation, CoinParameters } from "../model/coinParameters";
import type { Geom3 } from "../model/generatedCoin";
import type { PositionedTextLayout } from "../layout/fitTextToCircle";
import { BODY_RING_CLEARANCE_MM, createCenterBody } from "./createBorderRing";

const textLayoutToGeom2 = (layout: PositionedTextLayout): Geometries.geom2.Geom2 | null => {
  if (!layout.fits || layout.contours.length === 0) {
    return null;
  }

  if (layout.contourGroups && layout.contourGroups.length > 0) {
    return contourGroupsToTextGeometry(layout.contourGroups);
  }

  return contoursToTextGeometry(layout.contours as FlatContour[]);
};

/** Match createFaceTextSolid bottom flip footprint (rotateX/Y π → mirror in XY). */
const orientBottomText2d = (
  text2d: Geometries.geom2.Geom2,
  orientation: BottomFlipOrientation = "vertical-axis",
): Geometries.geom2.Geom2 => {
  switch (orientation) {
    case "horizontal-axis":
      return transforms.mirrorY(text2d) as Geometries.geom2.Geom2;
    case "vertical-axis":
    default:
      return transforms.mirrorX(text2d) as Geometries.geom2.Geom2;
  }
};

const combineShells = (shells: Geom3[]): Geom3 =>
  geometries.geom3.create(shells.flatMap((shell) => geometries.geom3.toPolygons(shell))) as Geom3;

/**
 * Build the coin body as stacked extruded plates with 2D text holes for pockets.
 *
 * JSCAD's 3D subtract/union of text from a cylinder leaves open edges after
 * triangulation. Each plate is manifold on its own; export meshes shells
 * separately then concatenates so the 3MF stays closed.
 */
export const createBodyWithPockets = (
  parameters: CoinParameters,
  topLayout: PositionedTextLayout,
  bottomLayout: PositionedTextLayout,
): { geometry: Geom3; exportShells: Geom3[] } => {
  const topText2d = textLayoutToGeom2(topLayout);
  const bottomText2dRaw = textLayoutToGeom2(bottomLayout);
  const bottomText2d = bottomText2dRaw
    ? orientBottomText2d(bottomText2dRaw, parameters.bottom.flipOrientation)
    : null;

  if (!topText2d && !bottomText2d) {
    const geometry = createCenterBody(parameters);
    return { geometry, exportShells: [geometry] };
  }

  const bodyRadius = Math.max(
    0,
    parameters.diameter / 2 - parameters.borderWidth - BODY_RING_CLEARANCE_MM,
  );
  const disk = primitives.circle({
    radius: bodyRadius,
    segments: parameters.circleSegments,
  });

  const topDepth = parameters.top.depth;
  const bottomDepth = parameters.bottom.depth;
  const coreHeight = Math.max(parameters.thickness - topDepth - bottomDepth, 0.01);

  const topProfile = (
    topText2d ? booleans.subtract(disk, topText2d) : disk
  ) as Geometries.geom2.Geom2;
  const bottomProfile = (
    bottomText2d ? booleans.subtract(disk, bottomText2d) : disk
  ) as Geometries.geom2.Geom2;

  const bottomPlate = extrusions.extrudeLinear(
    { height: bottomDepth },
    bottomProfile,
  ) as Geom3;
  const core = transforms.translateZ(
    bottomDepth,
    extrusions.extrudeLinear({ height: coreHeight }, disk),
  ) as Geom3;
  const topPlate = transforms.translateZ(
    parameters.thickness - topDepth,
    extrusions.extrudeLinear({ height: topDepth }, topProfile),
  ) as Geom3;

  const exportShells = [bottomPlate, core, topPlate];
  return { geometry: combineShells(exportShells), exportShells };
};
