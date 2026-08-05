import { booleans, geometries, primitives, text, transforms } from "@jscad/modeling";

import type { CoinParameters, FaceParameters } from "../model/coinParameters";
import { COIN_PART_IDS, COIN_PART_NAMES, type CoinPartKey, type GeneratedCoin, type GeneratedCoinPart } from "../model/generatedCoin";

const TEXT_STROKE_WIDTH_RATIO = 0.12;
const MIN_TEXT_STROKE_WIDTH = 0.08;

type Geom3 = geometries.geom3.Geom3;
type Point2 = [number, number];
type TextSegment = Point2[];

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const createCylinder = (radius: number, height: number, segments: number): Geom3 =>
  primitives.cylinder({ radius, height, segments, center: [0, 0, 0] });

const getTextSegments = (face: FaceParameters): TextSegment[] => text.vectorText({ x: 0, y: 0, height: face.textSize }, face.text.trim()) as TextSegment[];

const getBounds = (segments: TextSegment[]): { minX: number; maxX: number; minY: number; maxY: number } => {
  const points = segments.flat();

  return points.reduce(
    (bounds, [x, y]) => ({
      minX: Math.min(bounds.minX, x),
      maxX: Math.max(bounds.maxX, x),
      minY: Math.min(bounds.minY, y),
      maxY: Math.max(bounds.maxY, y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
};

const createStrokeSolid = (start: Point2, end: Point2, strokeWidth: number, depth: number, z: number): Geom3 | undefined => {
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length <= 0) {
    return undefined;
  }

  return transforms.translate(
    [(x1 + x2) / 2, (y1 + y2) / 2, z],
    transforms.rotateZ(Math.atan2(dy, dx), primitives.cuboid({ size: [length, strokeWidth, depth] })),
  );
};

const createTextInsertSolid = (
  face: FaceParameters,
  usableRadius: number,
  depth: number,
  z: number,
  faceKey: "topFace" | "bottomFace",
): Geom3 => {
  const segments = getTextSegments(face);
  if (segments.length === 0) {
    return geometries.geom3.create();
  }

  const bounds = getBounds(segments);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const maxSize = Math.max(width, height);
  const availableSize = usableRadius * 2;
  const fitScale = face.autoFit && maxSize > availableSize ? availableSize / maxSize : 1;
  const strokeWidth = Math.max(MIN_TEXT_STROKE_WIDTH, face.textSize * TEXT_STROKE_WIDTH_RATIO);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const strokes = segments.flatMap((segment) =>
    segment.slice(1).flatMap((point, index) => {
      const previousPoint = segment[index];
      const solid = createStrokeSolid(previousPoint, point, strokeWidth, depth, z);
      return solid ? [solid] : [];
    }),
  );

  const textSolid = strokes.length > 0 ? booleans.union(strokes) : geometries.geom3.create();
  const centered = transforms.translate([-centerX, -centerY, 0], textSolid);
  const scaled = fitScale === 1 ? centered : transforms.scale([fitScale, fitScale, 1], centered);
  const bottomFlipDegrees = faceKey === "bottomFace" && face.bottomTextOrientation === "flipped" ? 180 : 0;

  return transforms.rotateZ(degreesToRadians(face.rotationDegrees + bottomFlipDegrees), scaled);
};

const createPart = (key: CoinPartKey, geometry: Geom3, color: string): GeneratedCoinPart => ({
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
  const outerRadius = parameters.diameter / 2;
  const centerRadius = outerRadius - parameters.borderWidth;
  const topZ = (parameters.thickness - parameters.topFace.depth) / 2;
  const bottomZ = (-parameters.thickness + parameters.bottomFace.depth) / 2;
  const fullCylinder = createCylinder(outerRadius, parameters.thickness, parameters.circleSegments);
  const rawCenterBody = createCylinder(centerRadius, parameters.thickness, parameters.circleSegments);
  const borderRing = booleans.subtract(fullCylinder, rawCenterBody);
  const topText = createTextInsertSolid(parameters.topFace, centerRadius, parameters.topFace.depth, topZ, "topFace");
  const bottomText = createTextInsertSolid(parameters.bottomFace, centerRadius, parameters.bottomFace.depth, bottomZ, "bottomFace");
  const body = booleans.subtract(rawCenterBody, topText, bottomText);

  return {
    parts: {
      body: createPart("body", body, parameters.bodyColor),
      borderRing: createPart("borderRing", borderRing, parameters.borderColor),
      topText: createPart("topText", topText, parameters.topFace.color),
      bottomText: createPart("bottomText", bottomText, parameters.bottomFace.color),
    },
  };
};
