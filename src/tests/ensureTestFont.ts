import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import opentype from "opentype.js";

import { setFontsForTesting } from "../font/loadFont";

export const ensureTestFont = (): void => {
  const regular = opentype.parse(
    readFileSync(resolve(process.cwd(), "src/assets/DejaVuSans.ttf")).buffer,
  );
  const bold = opentype.parse(
    readFileSync(resolve(process.cwd(), "src/assets/DejaVuSans-Bold.ttf")).buffer,
  );
  setFontsForTesting(regular, bold);
};
