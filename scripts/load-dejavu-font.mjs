#!/usr/bin/env node
import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DEFAULT_SOURCE_PATHS = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/local/share/fonts/dejavu/DejaVuSans.ttf",
];
const destinationPath = resolve("src/assets/DejaVuSans.ttf");

const sourceFromArgs = process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length);
const sourceCandidates = sourceFromArgs ? [sourceFromArgs] : DEFAULT_SOURCE_PATHS;

const findReadableSource = async () => {
  for (const candidate of sourceCandidates) {
    try {
      const stats = await stat(candidate);
      if (stats.isFile() && stats.size > 0) {
        return candidate;
      }
    } catch {
      // Try the next known location.
    }
  }

  throw new Error(
    `Unable to find DejaVuSans.ttf. Pass an explicit path with --source=/path/to/DejaVuSans.ttf. Tried: ${sourceCandidates.join(", ")}`,
  );
};

const sourcePath = await findReadableSource();
await mkdir(dirname(destinationPath), { recursive: true });
await copyFile(sourcePath, destinationPath);

console.log(`Loaded DejaVu Sans font from ${sourcePath} into ${destinationPath}.`);
