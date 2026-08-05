export interface FontPoint {
  x: number;
  y: number;
}

export type FlatContour = FontPoint[];

type LineCommand = { type: "L"; x: number; y: number };
type MoveCommand = { type: "M"; x: number; y: number };
type QuadraticCommand = { type: "Q"; x1: number; y1: number; x: number; y: number };
type CubicCommand = { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number };
type CloseCommand = { type: "Z" };

export type PathCommand = MoveCommand | LineCommand | QuadraticCommand | CubicCommand | CloseCommand;

const midpoint = (a: FontPoint, b: FontPoint): FontPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const distanceToLine = (point: FontPoint, start: FontPoint, end: FontPoint): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / length;
};

const flattenQuadraticSegment = (
  start: FontPoint,
  control: FontPoint,
  end: FontPoint,
  curveTolerance: number,
): FontPoint[] => {
  if (distanceToLine(control, start, end) <= curveTolerance) {
    return [end];
  }

  const startControl = midpoint(start, control);
  const controlEnd = midpoint(control, end);
  const split = midpoint(startControl, controlEnd);

  return [
    ...flattenQuadraticSegment(start, startControl, split, curveTolerance),
    ...flattenQuadraticSegment(split, controlEnd, end, curveTolerance),
  ];
};

const flattenCubicSegment = (
  start: FontPoint,
  control1: FontPoint,
  control2: FontPoint,
  end: FontPoint,
  curveTolerance: number,
): FontPoint[] => {
  const flatness = Math.max(distanceToLine(control1, start, end), distanceToLine(control2, start, end));

  if (flatness <= curveTolerance) {
    return [end];
  }

  const startControl1 = midpoint(start, control1);
  const control1Control2 = midpoint(control1, control2);
  const control2End = midpoint(control2, end);
  const leftControl2 = midpoint(startControl1, control1Control2);
  const rightControl1 = midpoint(control1Control2, control2End);
  const split = midpoint(leftControl2, rightControl1);

  return [
    ...flattenCubicSegment(start, startControl1, leftControl2, split, curveTolerance),
    ...flattenCubicSegment(split, rightControl1, control2End, end, curveTolerance),
  ];
};

export const flattenPathCommand = (
  start: FontPoint,
  command: LineCommand | QuadraticCommand | CubicCommand,
  curveTolerance: number,
): FontPoint[] => {
  const end = { x: command.x, y: command.y };

  if (command.type === "L") {
    return [end];
  }

  if (command.type === "Q") {
    return flattenQuadraticSegment(start, { x: command.x1, y: command.y1 }, end, curveTolerance);
  }

  return flattenCubicSegment(start, { x: command.x1, y: command.y1 }, { x: command.x2, y: command.y2 }, end, curveTolerance);
};
