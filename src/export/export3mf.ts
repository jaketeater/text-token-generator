import type { GeneratedCoin } from "../model/generatedCoin";
import type { CoinParameters } from "../model/coinParameters";
import { generateCoin } from "../geometry/createCoin";
import { create3mfPackage } from "./create3mfPackage";
import { createModelXml, type ModelPart } from "./createModelXml";
import { meshShellsToTriangles, meshToTriangles } from "./meshToTriangles";

export { createCompatibilityTest3mf, downloadCompatibilityTest3mf } from "./compatibility3mf";

const DEFAULT_EXPORT_FILE_NAME = "poker-chip.3mf";

const partMesh = (part: GeneratedCoin["parts"][keyof GeneratedCoin["parts"]]) =>
  part.exportShells && part.exportShells.length > 0
    ? meshShellsToTriangles(part.exportShells)
    : meshToTriangles(part.geometry);

export const createCoinModelParts = (coin: GeneratedCoin): ModelPart[] => [
  {
    id: coin.parts.body.id,
    name: coin.parts.body.name,
    color: coin.parts.body.color,
    mesh: partMesh(coin.parts.body),
  },
  {
    id: coin.parts.borderRing.id,
    name: coin.parts.borderRing.name,
    color: coin.parts.borderRing.color,
    mesh: partMesh(coin.parts.borderRing),
  },
  {
    id: coin.parts.topText.id,
    name: coin.parts.topText.name,
    color: coin.parts.topText.color,
    mesh: partMesh(coin.parts.topText),
  },
  {
    id: coin.parts.bottomText.id,
    name: coin.parts.bottomText.name,
    color: coin.parts.bottomText.color,
    mesh: partMesh(coin.parts.bottomText),
  },
];

export const createCoin3mf = (coinOrParameters: GeneratedCoin | CoinParameters): Uint8Array => {
  const coin = "parts" in coinOrParameters ? coinOrParameters : generateCoin(coinOrParameters);

  if (coin.validation.errors.length > 0) {
    throw new Error(
      `Cannot export invalid coin geometry: ${coin.validation.errors.map((error) => error.message).join(" ")}`,
    );
  }

  return create3mfPackage(createModelXml(createCoinModelParts(coin)));
};

const sanitizeFilenamePart = (value: string): string => {
  const sanitized = value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/[-_.]+$/g, "");

  return sanitized || "blank";
};

export const createCoin3mfFilename = (parameters: CoinParameters): string => {
  const topText = sanitizeFilenamePart(parameters.top.text);
  const bottomText = sanitizeFilenamePart(parameters.bottom.text);
  const fileName = `coin-${topText}-${bottomText}.3mf`;
  return fileName === "coin-blank-blank.3mf" ? DEFAULT_EXPORT_FILE_NAME : fileName;
};

export const downloadCoin3mf = (parameters: CoinParameters, coin?: GeneratedCoin): void => {
  const packageData = createCoin3mf(coin ?? parameters);
  const blob = new Blob([packageData], { type: "model/3mf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = createCoin3mfFilename(parameters);
  link.click();
  URL.revokeObjectURL(url);
};

export { create3mfPackage } from "./create3mfPackage";
export { createModelXml } from "./createModelXml";
export { meshShellsToTriangles, meshToTriangles } from "./meshToTriangles";
