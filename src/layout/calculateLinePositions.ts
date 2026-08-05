export interface LinePosition {
  index: number;
  centerY: number;
  yMin: number;
  yMax: number;
}

/**
 * Vertically center N lines around Y=0 using glyph height H and line spacing multiplier S.
 * lineAdvance = H * S
 * totalHeight = H + (N - 1) * lineAdvance
 */
export const calculateLinePositions = (
  lineCount: number,
  glyphHeight: number,
  lineSpacing: number,
): { positions: LinePosition[]; totalHeight: number; lineAdvance: number } => {
  if (lineCount <= 0) {
    return { positions: [], totalHeight: 0, lineAdvance: 0 };
  }

  const lineAdvance = glyphHeight * lineSpacing;
  const totalHeight = glyphHeight + (lineCount - 1) * lineAdvance;
  const topCenter = totalHeight / 2 - glyphHeight / 2;

  const positions: LinePosition[] = [];
  for (let index = 0; index < lineCount; index += 1) {
    const centerY = topCenter - index * lineAdvance;
    positions.push({
      index,
      centerY,
      yMin: centerY - glyphHeight / 2,
      yMax: centerY + glyphHeight / 2,
    });
  }

  return { positions, totalHeight, lineAdvance };
};
