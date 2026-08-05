export interface TextPoint {
  x: number;
  y: number;
}

export type TextContour = TextPoint[];

export interface TextContoursResult {
  contours: TextContour[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

const GLYPH_WIDTH = 1;
const GLYPH_HEIGHT = 1;
const GLYPH_ADVANCE = 1.2;
const SPACE_ADVANCE = 0.6;

const rectangle = (x: number, y: number, width: number, height: number): TextContour => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
  { x, y },
];

const glyphHoleCount = (glyph: string): number => {
  switch (glyph) {
    case "8":
      return 2;
    case "0":
    case "O":
    case "B":
      return 1;
    default:
      return 0;
  }
};

const createGlyphContours = (glyph: string, offsetX: number): TextContour[] => {
  if (glyph === " ") {
    return [];
  }

  const contours = [rectangle(offsetX, 0, GLYPH_WIDTH, GLYPH_HEIGHT)];
  const holeCount = glyphHoleCount(glyph);

  for (let index = 0; index < holeCount; index += 1) {
    const y = holeCount === 1 ? 0.3 : index === 0 ? 0.18 : 0.58;
    contours.push(rectangle(offsetX + 0.3, y, 0.4, 0.24).reverse());
  }

  return contours;
};

const emptyBounds = {
  minX: 0,
  minY: 0,
  maxX: 0,
  maxY: 0,
  width: 0,
  height: 0,
};

export const textToContours = (text: string): TextContoursResult => {
  const contours: TextContour[] = [];
  let cursorX = 0;

  for (const glyph of text) {
    contours.push(...createGlyphContours(glyph, cursorX));
    cursorX += glyph === " " ? SPACE_ADVANCE : GLYPH_ADVANCE;
  }

  if (contours.length === 0) {
    return { contours, bounds: emptyBounds };
  }

  const points = contours.flat();
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    contours,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
};
