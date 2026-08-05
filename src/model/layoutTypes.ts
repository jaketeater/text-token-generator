export interface TextLineLayout {
  text: string;
  x: number;
  y: number;
  measuredWidth: number;
  availableWidth: number;
  /** Baseline Y in face-local coordinates before final vertical recentering. */
  baselineY: number;
}

export interface GeneratedTextLayout {
  lines: TextLineLayout[];
  requestedTextSize: number;
  effectiveTextSize: number;
  totalHeight: number;
  fits: boolean;
  warnings: string[];
  errors: string[];
}
