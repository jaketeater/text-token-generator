import { normalizeText } from "./normalizeText";

export interface TextGroup {
  /** Words in order within a forced-newline paragraph. */
  words: string[];
}

/**
 * Split text into forced newline groups, then whitespace-separated words.
 * Words are never split internally.
 */
export const tokenizeText = (text: string): TextGroup[] => {
  const normalized = normalizeText(text);
  if (normalized.length === 0) {
    return [];
  }

  return normalized.split("\n").map((paragraph) => ({
    words: paragraph.split(" ").filter((word) => word.length > 0),
  }));
};

export const flattenWords = (groups: TextGroup[]): string[] => groups.flatMap((group) => group.words);

export const countForcedMinimumLines = (groups: TextGroup[]): number =>
  groups.reduce((sum, group) => sum + Math.max(1, group.words.length > 0 ? 1 : 0), 0);
