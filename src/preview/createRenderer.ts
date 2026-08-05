import { cameras, drawCommands, entitiesFromSolids, prepareRender } from "@jscad/regl-renderer";
import type { geometries } from "@jscad/modeling";
import type { CameraPreset, CameraView } from "./cameraViews";
import { CAMERA_VIEWS, DEFAULT_CAMERA_PRESET } from "./cameraViews";

export type PreviewSolid = geometries.geom3.Geom3;

export interface PreviewRenderer {
  readonly camera: Record<string, unknown>;
  render(solids: PreviewSolid[]): void;
  setCameraPreset(preset: CameraPreset): void;
  resetCamera(): void;
  resize(): void;
  dispose(): void;
}

const applyCameraView = (camera: Record<string, unknown>, view: CameraView): void => {
  camera.position = [...view.position];
  camera.target = [...view.target];
  camera.up = [...view.up];
  cameras.perspective.update(camera as never, camera as never);
};

const createBaseEntities = () => [
  {
    visuals: { drawCmd: "drawGrid", show: true },
    size: [90, 90],
    ticks: [10, 2],
  },
  {
    visuals: { drawCmd: "drawAxis", show: true },
    size: 45,
  },
];

export const createRenderer = (container: HTMLElement): PreviewRenderer => {
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  const camera = { ...cameras.perspective.defaults } as Record<string, unknown>;

  cameras.perspective.setProjection(camera as never, camera as never, { width, height });
  applyCameraView(camera, CAMERA_VIEWS[DEFAULT_CAMERA_PRESET]);

  const options = {
    glOptions: { container },
    camera,
    drawCommands: {
      drawAxis: drawCommands.drawAxis,
      drawGrid: drawCommands.drawGrid,
      drawLines: drawCommands.drawLines,
      drawMesh: drawCommands.drawMesh,
    },
    entities: createBaseEntities(),
  };

  const renderScene = prepareRender(options);

  const renderer: PreviewRenderer = {
    camera,
    render(solids) {
      options.entities = [...createBaseEntities(), ...entitiesFromSolids({}, ...solids)];
      renderScene(options);
    },
    setCameraPreset(preset) {
      applyCameraView(camera, CAMERA_VIEWS[preset]);
      renderScene(options);
    },
    resetCamera() {
      this.setCameraPreset(DEFAULT_CAMERA_PRESET);
    },
    resize() {
      const nextWidth = Math.max(container.clientWidth, 1);
      const nextHeight = Math.max(container.clientHeight, 1);
      cameras.perspective.setProjection(camera as never, camera as never, { width: nextWidth, height: nextHeight });
      cameras.perspective.update(camera as never, camera as never);
      renderScene(options);
    },
    dispose() {
      container.querySelectorAll("canvas").forEach((canvas) => canvas.remove());
    },
  };

  renderer.render([]);
  return renderer;
};
