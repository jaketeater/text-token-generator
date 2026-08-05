import type { CoinParameters } from "../model/coinParameters";
import type { GeneratedTextLayout } from "../model/layoutTypes";
import type { PositionedTextLayout } from "../layout/fitTextToCircle";

export type ValidationSeverity = "error" | "warning";

export interface ValidationMessage {
  severity: ValidationSeverity;
  fieldPath: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}

const push = (
  messages: ValidationMessage[],
  severity: ValidationSeverity,
  fieldPath: string,
  code: string,
  message: string,
): void => {
  messages.push({ severity, fieldPath, code, message });
};

const isPositive = (value: number): boolean => Number.isFinite(value) && value > 0;

export const validateCoinParameters = (
  parameters: CoinParameters,
  topLayout?: GeneratedTextLayout | PositionedTextLayout,
  bottomLayout?: GeneratedTextLayout | PositionedTextLayout,
): ValidationResult => {
  const messages: ValidationMessage[] = [];

  if (!isPositive(parameters.diameter)) {
    push(messages, "error", "diameter", "diameter.invalid", "Diameter must be positive.");
  }
  if (!isPositive(parameters.thickness)) {
    push(messages, "error", "thickness", "thickness.invalid", "Thickness must be positive.");
  }
  if (!isPositive(parameters.borderWidth)) {
    push(messages, "error", "borderWidth", "borderWidth.invalid", "Border width must be positive.");
  }
  if (parameters.borderWidth >= parameters.diameter / 2) {
    push(
      messages,
      "error",
      "borderWidth",
      "borderWidth.tooWide",
      "Border width must be less than the coin radius.",
    );
  }

  for (const face of [
    { key: "top", face: parameters.top },
    { key: "bottom", face: parameters.bottom },
  ] as const) {
    if (!isPositive(face.face.depth)) {
      push(messages, "error", `${face.key}.depth`, "depth.invalid", `${face.key} text depth must be positive.`);
    }
    if (face.face.depth >= parameters.thickness) {
      push(
        messages,
        "error",
        `${face.key}.depth`,
        "depth.tooDeep",
        `${face.key} text depth must be less than coin thickness.`,
      );
    }
    if (face.face.text.trim().length === 0) {
      push(messages, "error", `${face.key}.text`, "text.empty", `${face.key} text cannot be empty.`);
    }
    if (!isPositive(face.face.requestedTextSize)) {
      push(messages, "error", `${face.key}.requestedTextSize`, "textSize.invalid", "Text size must be positive.");
    }
    if (!isPositive(face.face.minimumTextSize)) {
      push(messages, "error", `${face.key}.minimumTextSize`, "minTextSize.invalid", "Minimum text size must be positive.");
    }
  }

  if (parameters.top.depth + parameters.bottom.depth >= parameters.thickness) {
    push(
      messages,
      "error",
      "thickness",
      "depth.sumTooLarge",
      "Top depth plus bottom depth must be less than coin thickness.",
    );
  }

  const layouts = [
    { key: "top", layout: topLayout },
    { key: "bottom", layout: bottomLayout },
  ] as const;

  for (const { key, layout } of layouts) {
    if (!layout) {
      continue;
    }
    for (const error of layout.errors) {
      push(messages, "error", `${key}.text`, "layout.error", error);
    }
    for (const warning of layout.warnings) {
      push(messages, "warning", `${key}.text`, "layout.warning", warning);
    }
    if (!layout.fits && layout.errors.length === 0) {
      push(messages, "error", `${key}.text`, "layout.nofit", `${key} text does not fit in the usable circle.`);
    }
    if (layout.fits && layout.effectiveTextSize + 1e-6 < layout.requestedTextSize) {
      push(
        messages,
        "warning",
        `${key}.requestedTextSize`,
        "layout.shrunk",
        `Requested size: ${layout.requestedTextSize.toFixed(2)} mm; effective size: ${layout.effectiveTextSize.toFixed(2)} mm; lines: ${layout.lines.length}.`,
      );
    }
    if (layout.lines.length >= 6) {
      push(
        messages,
        "warning",
        `${key}.text`,
        "layout.manyLines",
        `${key} layout uses many short lines (${layout.lines.length}).`,
      );
    }
  }

  const layerHeight = parameters.layerHeight;
  if (isPositive(layerHeight)) {
    for (const face of [
      { key: "top", depth: parameters.top.depth },
      { key: "bottom", depth: parameters.bottom.depth },
    ] as const) {
      const remainder = Math.abs(face.depth / layerHeight - Math.round(face.depth / layerHeight));
      if (remainder > 0.05) {
        push(
          messages,
          "warning",
          `${face.key}.depth`,
          "depth.layerMismatch",
          `${face.key} text depth is not a multiple of the intended layer height.`,
        );
      }
    }
  }

  if (parameters.top.depth + parameters.bottom.depth > parameters.thickness - 0.4) {
    push(
      messages,
      "warning",
      "thickness",
      "pockets.close",
      "Top and bottom text pockets approach one another closely.",
    );
  }

  if (parameters.curveTolerance < 0.01) {
    push(
      messages,
      "warning",
      "curveTolerance",
      "curve.fine",
      "Selected curve tolerance may produce excessive polygon counts.",
    );
  }

  const errors = messages.filter((message) => message.severity === "error");
  const warnings = messages.filter((message) => message.severity === "warning");

  return {
    valid: errors.length === 0,
    messages,
    errors,
    warnings,
  };
};
