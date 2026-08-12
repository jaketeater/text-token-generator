import opentype from "opentype.js";
import dejaVuSansUrl from "../assets/DejaVuSans.ttf?url";
import dejaVuSansBoldUrl from "../assets/DejaVuSans-Bold.ttf?url";

export type FontWeight = "regular" | "bold";

const cachedFonts: Partial<Record<FontWeight, opentype.Font>> = {};

const fontUrlFor = (weight: FontWeight): string =>
  weight === "bold" ? dejaVuSansBoldUrl : dejaVuSansUrl;

const parseFont = (buffer: ArrayBuffer): opentype.Font => opentype.parse(buffer);

const loadFontWeight = async (weight: FontWeight): Promise<opentype.Font> => {
  const cached = cachedFonts[weight];
  if (cached) {
    return cached;
  }

  const response = await fetch(fontUrlFor(weight));
  if (!response.ok) {
    throw new Error(
      `Unable to load bundled DejaVu Sans ${weight} font: ${response.status} ${response.statusText}`,
    );
  }

  const font = parseFont(await response.arrayBuffer());
  cachedFonts[weight] = font;
  return font;
};

/** Load regular and bold DejaVu Sans. */
export const loadFonts = async (): Promise<void> => {
  await Promise.all([loadFontWeight("regular"), loadFontWeight("bold")]);
};

/** Load regular DejaVu Sans (also available via loadFonts). */
export const loadFont = async (): Promise<opentype.Font> => loadFontWeight("regular");

export const loadFontSync = (bold = false): opentype.Font => {
  const weight: FontWeight = bold ? "bold" : "regular";
  const cached = cachedFonts[weight];
  if (cached) {
    return cached;
  }

  if (typeof XMLHttpRequest !== "undefined") {
    const request = new XMLHttpRequest();
    request.open("GET", fontUrlFor(weight), false);
    request.overrideMimeType?.("text/plain; charset=x-user-defined");
    request.send();

    if (request.status < 200 || request.status >= 300) {
      throw new Error(`Unable to load bundled DejaVu Sans ${weight} font: ${request.status}`);
    }

    const bytes = Uint8Array.from(request.responseText, (character) => character.charCodeAt(0) & 0xff);
    const font = parseFont(bytes.buffer);
    cachedFonts[weight] = font;
    return font;
  }

  throw new Error(
    "Font is not loaded. Call loadFonts() in the browser, or setFontsForTesting() in Node tests.",
  );
};

export const getFontForFace = (bold: boolean): opentype.Font => loadFontSync(bold);

export const setFontForTesting = (font: opentype.Font | undefined): void => {
  if (font === undefined) {
    delete cachedFonts.regular;
    return;
  }
  cachedFonts.regular = font;
};

export const setFontsForTesting = (
  regular: opentype.Font | undefined,
  bold?: opentype.Font | undefined,
): void => {
  if (regular === undefined) {
    delete cachedFonts.regular;
  } else {
    cachedFonts.regular = regular;
  }
  if (bold === undefined) {
    delete cachedFonts.bold;
  } else {
    cachedFonts.bold = bold;
  }
};
