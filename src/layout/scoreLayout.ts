export interface ScoredLayoutCandidate {
  lines: string[];
  unusedRatioSumSquares: number;
  lineCount: number;
}

/**
 * Lower score is better among same font size / same validity.
 * Mild penalty for extra lines; primary metric is sum of unusedRatio².
 */
export const scoreLayout = (
  lines: string[],
  measuredWidths: number[],
  availableWidths: number[],
): ScoredLayoutCandidate => {
  let unusedRatioSumSquares = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const available = availableWidths[index];
    const used = measuredWidths[index];
    if (available <= 0) {
      unusedRatioSumSquares += 1;
      continue;
    }
    const unusedRatio = Math.max(0, (available - used) / available);
    unusedRatioSumSquares += unusedRatio * unusedRatio;
  }

  // Mild penalty for additional lines so circular packing is preferred over tall stacks.
  unusedRatioSumSquares += Math.max(0, lines.length - 1) * 0.02;

  return {
    lines,
    unusedRatioSumSquares,
    lineCount: lines.length,
  };
};

export const compareLayoutScores = (a: ScoredLayoutCandidate, b: ScoredLayoutCandidate): number => {
  if (a.unusedRatioSumSquares !== b.unusedRatioSumSquares) {
    return a.unusedRatioSumSquares - b.unusedRatioSumSquares;
  }
  return a.lineCount - b.lineCount;
};
