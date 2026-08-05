import type { LinePosition } from "./calculateLinePositions";

export interface ChordWidth {
  lineIndex: number;
  availableWidth: number;
  halfWidth: number;
  yExtreme: number;
  possible: boolean;
}

export const chordHalfWidthAtY = (layoutRadius: number, y: number): number | null => {
  const yAbs = Math.abs(y);
  if (yAbs >= layoutRadius) {
    return null;
  }
  return Math.sqrt(layoutRadius * layoutRadius - yAbs * yAbs);
};

/**
 * Conservative chord width for a line spanning [yMin, yMax]: use the farther extreme from center.
 */
export const calculateChordWidths = (positions: LinePosition[], layoutRadius: number): ChordWidth[] =>
  positions.map((position) => {
    const yExtreme = Math.max(Math.abs(position.yMin), Math.abs(position.yMax));
    const halfWidth = chordHalfWidthAtY(layoutRadius, yExtreme);
    if (halfWidth === null) {
      return {
        lineIndex: position.index,
        availableWidth: 0,
        halfWidth: 0,
        yExtreme,
        possible: false,
      };
    }

    return {
      lineIndex: position.index,
      availableWidth: 2 * halfWidth,
      halfWidth,
      yExtreme,
      possible: true,
    };
  });
