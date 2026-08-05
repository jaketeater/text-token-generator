export type CameraViewName = "isometric" | "top" | "bottom" | "side" | "exploded" | "reset";

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
}

export const cameraViews = (radius: number, thickness: number): Record<CameraViewName, CameraPose> => {
  const distance = radius * 3.2;
  return {
    isometric: {
      position: [distance * 0.75, -distance * 0.75, distance * 0.65],
      target: [0, 0, thickness / 2],
      up: [0, 0, 1],
    },
    top: {
      position: [0, 0, distance],
      target: [0, 0, thickness / 2],
      up: [0, 1, 0],
    },
    bottom: {
      // View from underneath so bottom lettering reads correctly.
      position: [0, 0, -distance],
      target: [0, 0, thickness / 2],
      up: [0, 1, 0],
    },
    side: {
      position: [distance, 0, thickness / 2],
      target: [0, 0, thickness / 2],
      up: [0, 0, 1],
    },
    exploded: {
      position: [distance * 0.9, -distance * 0.9, distance * 0.8],
      target: [0, 0, thickness / 2],
      up: [0, 0, 1],
    },
    reset: {
      position: [distance * 0.75, -distance * 0.75, distance * 0.65],
      target: [0, 0, thickness / 2],
      up: [0, 0, 1],
    },
  };
};

export const explodedPartOffsets = (thickness: number): Record<string, [number, number, number]> => ({
  body: [0, 0, 0],
  borderRing: [0, 0, 0],
  topText: [0, 0, thickness * 1.8],
  bottomText: [0, 0, -thickness * 1.8],
});
