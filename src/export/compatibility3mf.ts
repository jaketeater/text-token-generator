import { booleans, primitives, transforms } from "@jscad/modeling";

import { COIN_PART_IDS, COIN_PART_NAMES } from "../model/generatedCoin";
import { create3mfPackage } from "./create3mfPackage";
import { createModelXml, type ModelPart } from "./createModelXml";
import { meshToTriangles } from "./meshToTriangles";

/**
 * Minimal four-part assembled 3MF for Snapmaker Orca compatibility testing.
 * Center cylinder, border ring, top/bottom rectangular inserts under one parent.
 */
export const createCompatibilityTest3mf = (): Uint8Array => {
  const height = 3.5;
  const outerRadius = 19.5;
  const innerRadius = 17.5;
  const segments = 96;

  const body = transforms.translateZ(
    height / 2,
    primitives.cylinder({ radius: innerRadius, height, segments }),
  );
  const borderRing = transforms.translateZ(
    height / 2,
    booleans.subtract(
      primitives.cylinder({ radius: outerRadius, height, segments }),
      primitives.cylinder({ radius: innerRadius, height: height + 0.02, segments }),
    ),
  );
  const topInsert = transforms.translate(
    [0, 0, height - 0.1],
    primitives.cuboid({ size: [10, 4, 0.2] }),
  );
  const bottomInsert = transforms.translate(
    [0, 0, 0.1],
    primitives.cuboid({ size: [10, 4, 0.2] }),
  );

  const parts: ModelPart[] = [
    {
      id: COIN_PART_IDS.body,
      name: COIN_PART_NAMES.body,
      color: "#d1d5db",
      mesh: meshToTriangles(body),
    },
    {
      id: COIN_PART_IDS.borderRing,
      name: COIN_PART_NAMES.borderRing,
      color: "#9ca3af",
      mesh: meshToTriangles(borderRing),
    },
    {
      id: COIN_PART_IDS.topText,
      name: COIN_PART_NAMES.topText,
      color: "#111827",
      mesh: meshToTriangles(topInsert),
    },
    {
      id: COIN_PART_IDS.bottomText,
      name: COIN_PART_NAMES.bottomText,
      color: "#1f2937",
      mesh: meshToTriangles(bottomInsert),
    },
  ];

  return create3mfPackage(createModelXml(parts));
};

export const downloadCompatibilityTest3mf = (): void => {
  const packageData = createCompatibilityTest3mf();
  const blob = new Blob([packageData], { type: "model/3mf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "coin-compatibility-test.3mf";
  link.click();
  URL.revokeObjectURL(url);
};
