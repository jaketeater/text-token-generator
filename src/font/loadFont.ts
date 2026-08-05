import opentype from "opentype.js";
import dejaVuSansUrl from "../assets/DejaVuSans.ttf?url";

let cachedFont: opentype.Font | undefined;

const parseFont = (buffer: ArrayBuffer): opentype.Font => opentype.parse(buffer);

export const loadFont = async (): Promise<opentype.Font> => {
  if (cachedFont) {
    return cachedFont;
  }

  const response = await fetch(dejaVuSansUrl);
  if (!response.ok) {
    throw new Error(`Unable to load bundled DejaVu Sans font: ${response.status} ${response.statusText}`);
  }

  cachedFont = parseFont(await response.arrayBuffer());
  return cachedFont;
};

export const loadFontSync = (): opentype.Font => {
  if (cachedFont) {
    return cachedFont;
  }

  if (typeof XMLHttpRequest !== "undefined") {
    const request = new XMLHttpRequest();
    request.open("GET", dejaVuSansUrl, false);
    request.overrideMimeType?.("text/plain; charset=x-user-defined");
    request.send();

    if (request.status < 200 || request.status >= 300) {
      throw new Error(`Unable to load bundled DejaVu Sans font: ${request.status}`);
    }

    const bytes = Uint8Array.from(request.responseText, (character) => character.charCodeAt(0) & 0xff);
    cachedFont = parseFont(bytes.buffer);
    return cachedFont;
  }

  throw new Error(
    "Font is not loaded. Call loadFont() in the browser, or setFontForTesting() in Node tests.",
  );
};

export const setFontForTesting = (font: opentype.Font | undefined): void => {
  cachedFont = font;
};
