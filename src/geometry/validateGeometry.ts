import type { CoinParameters, FaceParameters } from "../model/coinParameters";
import { fitTextToCircle, type TextCircleFitDiagnostics, type TextPoint } from "./fitTextToCircle";
import { textToContours } from "./textContours";

export type ValidationSeverity = "error" | "warning";

export interface ValidationMessage {
  severity: ValidationSeverity;
  /** Dot-separated path to the parameter that should receive focus/highlighting in the UI. */
  fieldPath: string;
  /** Stable identifier that lets callers de-duplicate or test for a specific condition. */
  code: string;
  /** User-facing guidance suitable for display by ValidationMessages.vue. */
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}

interface Point2Like {
  x?: number;
  y?: number;
  0?: number;
  1?: number;
}

type TextContour = readonly Point2Like[];
type FaceContourInputs = readonly TextContour[];

export interface GeometryValidationInputs {
  /** Optional top text contours produced by the text-to-outline step. */
  topTextContours?: FaceContourInputs;
  /** Optional bottom text contours produced by the text-to-outline step. */
  bottomTextContours?: FaceContourInputs;
  /** Optional top fit diagnostics produced from the actual generated text contours. */
  topTextFitDiagnostics?: TextCircleFitDiagnostics;
  /** Optional bottom fit diagnostics produced from the actual generated text contours. */
  bottomTextFitDiagnostics?: TextCircleFitDiagnostics;
}

type ParametersWithGeometryInputs = CoinParameters & {
  validation?: CoinParameters["validation"] & GeometryValidationInputs;
};

const MINIMUM_TEXT_SHRINK_RATIO = 0.85;
const POCKET_MEETING_CLEARANCE_MM = 0.4;
const LAYER_HEIGHT_TOLERANCE_MM = 0.001;
const DEFAULT_STROKE_WIDTH_TO_TEXT_SIZE_RATIO = 0.12;

const pushMessage = (
  messages: ValidationMessage[],
  severity: ValidationSeverity,
  fieldPath: string,
  code: string,
  message: string,
): void => {
  messages.push({ severity, fieldPath, code, message });
};

const isPositiveFiniteNumber = (value: number): boolean => Number.isFinite(value) && value > 0;

const formatMm = (value: number): string => `${Number.isInteger(value) ? value : value.toFixed(2)} mm`;

const getUsableTextRadius = (parameters: CoinParameters): number =>
  Math.max(0, parameters.diameter / 2 - parameters.borderWidth);

const getPointCoordinate = (point: Point2Like, axis: "x" | "y"): number | undefined => {
  const tupleIndex = axis === "x" ? 0 : 1;
  const value = point[axis] ?? point[tupleIndex];
  return typeof value === "number" ? value : undefined;
};

const isValidContour = (contour: TextContour): boolean =>
  contour.length >= 3 &&
  contour.every((point) => {
    const x = getPointCoordinate(point, "x");
    const y = getPointCoordinate(point, "y");
    return Number.isFinite(x) && Number.isFinite(y);
  });

const createFaceValidationInputs = (
  parameters: CoinParameters,
  face: FaceParameters,
): { contours: TextPoint[][]; diagnostics: TextCircleFitDiagnostics } => {
  const contours = textToContours(face.text, {
    textSizeMm: face.textSize,
    curveTolerance: parameters.curveTolerance,
  }).contours.map((contour) => contour.map((point) => [point.x, point.y] as TextPoint));
  const fitMode = face.autoFit && parameters.fitMode === "shrink-only" ? "shrink-only" : "fixed";
  const fitted = fitTextToCircle(contours, face.textSize, getUsableTextRadius(parameters), face.rotationDegrees, fitMode);

  return { contours: fitted.contours, diagnostics: fitted.diagnostics };
};

export const withGeometryValidationInputs = (parameters: CoinParameters): CoinParameters & { validation: CoinParameters["validation"] & GeometryValidationInputs } => {
  const top = createFaceValidationInputs(parameters, parameters.topFace);
  const bottom = createFaceValidationInputs(parameters, parameters.bottomFace);

  return {
    ...parameters,
    validation: {
      ...parameters.validation,
      topTextContours: top.contours,
      bottomTextContours: bottom.contours,
      topTextFitDiagnostics: top.diagnostics,
      bottomTextFitDiagnostics: bottom.diagnostics,
    },
  };
};

const addFaceMessages = (
  messages: ValidationMessage[],
  parameters: CoinParameters,
  faceKey: "topFace" | "bottomFace",
  contourField: "topTextContours" | "bottomTextContours",
  diagnosticsField: "topTextFitDiagnostics" | "bottomTextFitDiagnostics",
): void => {
  const face = parameters[faceKey];
  const faceLabel = faceKey === "topFace" ? "Top" : "Bottom";
  const geometryInputs = (parameters as ParametersWithGeometryInputs).validation;
  const diagnostics = geometryInputs?.[diagnosticsField] ?? createFaceValidationInputs(parameters, face).diagnostics;

  if (face.text.trim().length === 0) {
    pushMessage(messages, "error", `${faceKey}.text`, `${faceKey}.text.empty`, `${faceLabel} text cannot be empty.`);
  }

  if (!isPositiveFiniteNumber(face.depth)) {
    pushMessage(messages, "error", `${faceKey}.depth`, `${faceKey}.depth.nonPositive`, `${faceLabel} text depth must be greater than 0 mm.`);
  } else if (Number.isFinite(parameters.thickness) && face.depth > parameters.thickness) {
    pushMessage(messages, "error", `${faceKey}.depth`, `${faceKey}.depth.exceedsThickness`, `${faceLabel} text depth cannot exceed the coin thickness.`);
  }

  if (!isPositiveFiniteNumber(face.textSize)) {
    pushMessage(messages, "error", `${faceKey}.textSize`, `${faceKey}.textSize.nonPositive`, `${faceLabel} text size must be greater than 0 mm.`);
  }

  if (!face.autoFit && !diagnostics.fits) {
    pushMessage(
      messages,
      "error",
      `${faceKey}.textSize`,
      `${faceKey}.text.fixedSizeOverflow`,
      `${faceLabel} text is too wide for the usable coin area. Reduce the text size, shorten the text, or enable auto-fit.`,
    );
  }

  if (face.autoFit && diagnostics.wasShrunk && diagnostics.scale < MINIMUM_TEXT_SHRINK_RATIO) {
    pushMessage(
      messages,
      "warning",
      `${faceKey}.textSize`,
      `${faceKey}.text.shrinkAmount`,
      `${faceLabel} text will shrink to about ${Math.round(diagnostics.scale * 100)}% of its requested size to fit inside the border.`,
    );
  }

  const contours = geometryInputs?.[contourField] ?? diagnostics.transformedContours;
  if (contours.length === 0 || contours.some((contour) => !isValidContour(contour))) {
    pushMessage(
      messages,
      "error",
      `validation.${contourField}`,
      `${faceKey}.textContours.invalid`,
      `${faceLabel} text outlines are empty or invalid. Regenerate the text outlines before creating geometry.`,
    );
  }
};

const addLayerHeightWarning = (messages: ValidationMessage[], fieldPath: string, label: string, depth: number, layerHeight?: number): void => {
  if (!isPositiveFiniteNumber(depth) || !layerHeight || !isPositiveFiniteNumber(layerHeight)) {
    return;
  }

  const nearestLayerMultiple = Math.round(depth / layerHeight) * layerHeight;
  if (Math.abs(depth - nearestLayerMultiple) > LAYER_HEIGHT_TOLERANCE_MM) {
    pushMessage(messages, "warning", fieldPath, `${fieldPath}.layerHeightMismatch`, `${label} depth is not an even multiple of the configured layer height.`);
  }
};

export const validateCoinParameters = (parameters: CoinParameters): ValidationResult => {
  const messages: ValidationMessage[] = [];
  const { layerHeight, nozzleWidth } = parameters.validation ?? {};

  if (!isPositiveFiniteNumber(parameters.diameter)) {
    pushMessage(messages, "error", "diameter", "diameter.nonPositive", "Coin diameter must be greater than 0 mm.");
  }

  if (!isPositiveFiniteNumber(parameters.thickness)) {
    pushMessage(messages, "error", "thickness", "thickness.nonPositive", "Coin thickness must be greater than 0 mm.");
  }

  if (!Number.isFinite(parameters.borderWidth) || parameters.borderWidth <= 0) {
    pushMessage(messages, "error", "borderWidth", "borderWidth.invalid", "Border width must be greater than 0 mm for the separate colored margin.");
  } else if (Number.isFinite(parameters.diameter) && parameters.borderWidth * 2 >= parameters.diameter) {
    pushMessage(messages, "error", "borderWidth", "borderWidth.tooWide", "Border width leaves no usable area for text.");
  }

  addFaceMessages(messages, parameters, "topFace", "topTextContours", "topTextFitDiagnostics");
  addFaceMessages(messages, parameters, "bottomFace", "bottomTextContours", "bottomTextFitDiagnostics");

  if (isPositiveFiniteNumber(parameters.topFace.depth) && isPositiveFiniteNumber(parameters.bottomFace.depth)) {
    const totalDepth = parameters.topFace.depth + parameters.bottomFace.depth;
    if (Number.isFinite(parameters.thickness) && totalDepth >= parameters.thickness) {
      pushMessage(messages, "error", "thickness", "thickness.depthsMeet", "Top and bottom text depths must leave solid material between the faces.");
    } else if (Number.isFinite(parameters.thickness) && parameters.thickness - totalDepth <= POCKET_MEETING_CLEARANCE_MM) {
      pushMessage(messages, "warning", "thickness", "thickness.depthsNearlyMeet", `Top and bottom text pockets leave only ${formatMm(parameters.thickness - totalDepth)} of material between them.`);
    }
  }

  addLayerHeightWarning(messages, "topFace.depth", "Top text", parameters.topFace.depth, layerHeight);
  addLayerHeightWarning(messages, "bottomFace.depth", "Bottom text", parameters.bottomFace.depth, layerHeight);

  if (nozzleWidth && isPositiveFiniteNumber(nozzleWidth)) {
    const minimumTextFeature = Math.min(parameters.topFace.textSize, parameters.bottomFace.textSize) * DEFAULT_STROKE_WIDTH_TO_TEXT_SIZE_RATIO;
    if (minimumTextFeature < nozzleWidth) {
      pushMessage(messages, "warning", "validation.nozzleWidth", "textFeatures.belowNozzleWidth", "Some text strokes may be thinner than the configured nozzle width and may not print cleanly.");
    }

    if (parameters.borderWidth > 0 && parameters.borderWidth < nozzleWidth) {
      pushMessage(messages, "warning", "borderWidth", "borderWidth.belowNozzleWidth", "The border is thinner than the configured nozzle width and may not print cleanly.");
    }
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
