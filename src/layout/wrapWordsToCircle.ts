import type opentype from "opentype.js";

import { measureSpaceWidth, measureWordWidth } from "../font/measureText";
import type { TextGroup } from "./tokenizeText";
import { compareLayoutScores, scoreLayout } from "./scoreLayout";

export interface WrapAttempt {
  lines: string[];
  measuredWidths: number[];
  availableWidths: number[];
  score: number;
}

const measureLineWidth = (words: string[], textSizeMm: number, font: opentype.Font): number => {
  if (words.length === 0) {
    return 0;
  }
  const space = measureSpaceWidth(textSizeMm, font);
  let width = 0;
  for (let index = 0; index < words.length; index += 1) {
    width += measureWordWidth(words[index], textSizeMm, font);
    if (index < words.length - 1) {
      width += space;
    }
  }
  return width;
};

/**
 * Dynamic programming: assign consecutive words to N lines without exceeding chord widths.
 * Returns best scoring complete assignment, or null if impossible.
 */
export const wrapWordsToLines = (
  words: string[],
  availableWidths: number[],
  textSizeMm: number,
  font: opentype.Font,
): WrapAttempt | null => {
  const lineCount = availableWidths.length;
  const wordCount = words.length;

  if (lineCount === 0) {
    return wordCount === 0
      ? { lines: [], measuredWidths: [], availableWidths: [], score: 0 }
      : null;
  }

  if (wordCount === 0) {
    return null;
  }

  // dp[wordIndex][lineIndex] = best previous break end word exclusive for this line start
  // We store reconstruction: parent[w][L] = startWordIndex for line L ending before w on next line...
  // State: after placing words[0..w) into lines[0..L)
  type Cell = { score: number; breaks: number[] } | null;
  const dp: Cell[][] = Array.from({ length: wordCount + 1 }, () => Array.from({ length: lineCount + 1 }, () => null));
  dp[0][0] = { score: 0, breaks: [] };

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    for (let start = 0; start <= wordCount; start += 1) {
      const previous = dp[start][lineIndex];
      if (!previous) {
        continue;
      }

      // Must assign at least one word to this line if words remain, except we require all lines used when wrapping to exact count.
      for (let end = start + 1; end <= wordCount; end += 1) {
        // Remaining lines after this one (including current being filled): lineCount - lineIndex
        const remainingLines = lineCount - lineIndex;
        const remainingWords = wordCount - start;
        if (remainingWords < remainingLines) {
          break;
        }
        const wordsAfterThisLine = wordCount - end;
        const linesAfter = lineCount - lineIndex - 1;
        if (wordsAfterThisLine < linesAfter) {
          continue;
        }
        if (linesAfter === 0 && end !== wordCount) {
          continue;
        }

        const segment = words.slice(start, end);
        const width = measureLineWidth(segment, textSizeMm, font);
        if (width > availableWidths[lineIndex] + 1e-6) {
          // Longer segments only get wider.
          break;
        }

        const measuredSoFar = [...previous.breaks.map((_, i) => 0)]; // placeholder unused
        void measuredSoFar;

        const candidateBreaks = [...previous.breaks, end];
        // Temporary score using current partial lines — finalize when complete.
        const next = dp[end][lineIndex + 1];
        const provisionalScore = previous.score + Math.max(0, availableWidths[lineIndex] - width);
        if (!next || provisionalScore < next.score) {
          dp[end][lineIndex + 1] = { score: provisionalScore, breaks: candidateBreaks };
        }
      }
    }
  }

  const complete = dp[wordCount][lineCount];
  if (!complete) {
    return null;
  }

  const lines: string[] = [];
  const measuredWidths: number[] = [];
  let cursor = 0;
  for (const end of complete.breaks) {
    const segment = words.slice(cursor, end);
    lines.push(segment.join(" "));
    measuredWidths.push(measureLineWidth(segment, textSizeMm, font));
    cursor = end;
  }

  const scored = scoreLayout(lines, measuredWidths, availableWidths);
  return {
    lines,
    measuredWidths,
    availableWidths: [...availableWidths],
    score: scored.unusedRatioSumSquares,
  };
};

/**
 * Wrap within forced groups, then concatenate lines. Each group may occupy one or more lines.
 * For a target total line count, distribute extra wrap lines across groups.
 */
export const wrapGroupsToCircle = (
  groups: TextGroup[],
  availableWidths: number[],
  textSizeMm: number,
  font: opentype.Font,
): WrapAttempt | null => {
  const nonEmpty = groups.filter((group) => group.words.length > 0);
  if (nonEmpty.length === 0) {
    return null;
  }

  const totalLines = availableWidths.length;
  if (totalLines < nonEmpty.length) {
    return null;
  }

  // Distribute line budgets: each group gets at least 1 line; extras to groups with more words.
  const budgets = nonEmpty.map(() => 1);
  let remaining = totalLines - nonEmpty.length;
  while (remaining > 0) {
    let bestIndex = 0;
    let bestCapacity = -1;
    for (let index = 0; index < nonEmpty.length; index += 1) {
      const capacity = nonEmpty[index].words.length - budgets[index];
      if (capacity > bestCapacity) {
        bestCapacity = capacity;
        bestIndex = index;
      }
    }
    if (bestCapacity <= 0) {
      break;
    }
    budgets[bestIndex] += 1;
    remaining -= 1;
  }

  if (budgets.reduce((a, b) => a + b, 0) !== totalLines) {
    return null;
  }

  const allLines: string[] = [];
  const allMeasured: number[] = [];
  const allAvailable: number[] = [];
  let widthOffset = 0;

  for (let groupIndex = 0; groupIndex < nonEmpty.length; groupIndex += 1) {
    const budget = budgets[groupIndex];
    const widths = availableWidths.slice(widthOffset, widthOffset + budget);
    const attempt = wrapWordsToLines(nonEmpty[groupIndex].words, widths, textSizeMm, font);
    if (!attempt) {
      return null;
    }
    allLines.push(...attempt.lines);
    allMeasured.push(...attempt.measuredWidths);
    allAvailable.push(...attempt.availableWidths);
    widthOffset += budget;
  }

  const scored = scoreLayout(allLines, allMeasured, allAvailable);
  return {
    lines: allLines,
    measuredWidths: allMeasured,
    availableWidths: allAvailable,
    score: scored.unusedRatioSumSquares,
  };
};

export const pickBestWrap = (candidates: WrapAttempt[]): WrapAttempt | null => {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((a, b) =>
    compareLayoutScores(
      { lines: a.lines, unusedRatioSumSquares: a.score, lineCount: a.lines.length },
      { lines: b.lines, unusedRatioSumSquares: b.score, lineCount: b.lines.length },
    ),
  )[0];
};
