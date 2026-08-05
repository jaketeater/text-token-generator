/** Normalize line endings and collapse ordinary whitespace while preserving newlines. */
export const normalizeText = (text: string): string => {
  const unified = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return unified
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
};
