import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import opentype from "opentype.js";

import { setFontForTesting } from "../font/loadFont";

export const ensureTestFont = (): void => {
  const buffer = readFileSync(resolve(process.cwd(), "src/assets/DejaVuSans.ttf")).buffer;
  setFontForTesting(opentype.parse(buffer));
};
