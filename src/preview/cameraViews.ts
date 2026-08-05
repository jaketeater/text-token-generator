export type CameraPreset = "isometric" | "top" | "bottom" | "side";

export interface CameraView {
  readonly position: [number, number, number];
  readonly target: [number, number, number];
  readonly up: [number, number, number];
}

const DISTANCE = 90;

export const CAMERA_VIEWS: Record<CameraPreset, CameraView> = {
  isometric: {
    position: [DISTANCE, -DISTANCE, DISTANCE * 0.72],
    target: [0, 0, 0],
    up: [0, 0, 1],
  },
  top: {
    position: [0, 0, DISTANCE],
    target: [0, 0, 0],
    up: [0, 1, 0],
  },
  bottom: {
    position: [0, 0, -DISTANCE],
    target: [0, 0, 0],
    up: [0, -1, 0],
  },
  side: {
    position: [DISTANCE, 0, 0],
    target: [0, 0, 0],
    up: [0, 0, 1],
  },
};

export const DEFAULT_CAMERA_PRESET: CameraPreset = "isometric";
