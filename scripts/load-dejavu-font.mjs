#!/usr/bin/env node
import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const FONT_FILES = [
  {
    name: "DejaVuSans.ttf",
    defaultSources: [
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      "/usr/local/share/fonts/dejavu/DejaVuSans.ttf",
    ],
  },
  {
    name: "DejaVuSans-Bold.ttf",
    defaultSources: [
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
      "/usr/local/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    ],
  },
];

const sourceFromArgs = process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length);

const findReadableSource = async (candidates) => {
  for (const candidate of candidates) {
    try {
      const stats = await stat(candidate);
      if (stats.isFile() && stats.size > 0) {
        return candidate;
      }
    } catch {
      // Try the next known location.
    }
  }

  throw new Error(`Unable to find font file. Tried: ${candidates.join(", ")}`);
};

await mkdir(resolve("src/assets"), { recursive: true });

for (const font of FONT_FILES) {
  const destinationPath = resolve("src/assets", font.name);
  const sourceCandidates = sourceFromArgs
    ? [resolve(dirname(sourceFromArgs), font.name)]
    : font.defaultSources;
  const sourcePath = await findReadableSource(sourceCandidates);
  await copyFile(sourcePath, destinationPath);
  console.log(`Loaded ${font.name} from ${sourcePath} into ${destinationPath}.`);
}
