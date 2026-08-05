import { cameras, drawCommands, entitiesFromSolids, prepareRender } from "@jscad/regl-renderer";
import type { geometries } from "@jscad/modeling";

import { cameraViews, type CameraPose, type CameraViewName } from "./cameraViews";
import { hexToRgba } from "./previewColors";

export type PreviewSolid = geometries.geom3.Geom3;

export interface ColoredSolid {
  geometry: PreviewSolid;
  color: string;
}

export interface PreviewRenderer {
  readonly camera: Record<string, unknown>;
  render(solids: ColoredSolid[]): void;
  setCameraView(view: CameraPose): void;
  setCameraByName(name: CameraViewName, radius: number, thickness: number): void;
  resize(): void;
  dispose(): void;
}

const applyCameraView = (camera: Record<string, unknown>, view: CameraPose): void => {
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
  applyCameraView(camera, cameraViews(19.5, 3.5).isometric);

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
      // Color must be passed into entitiesFromSolids; assigning visuals.color afterward
      // is ignored and leaves the default cyan meshColor ([0, 0.6, 1, 1]).
      const solidEntities = solids.flatMap((solid) =>
        entitiesFromSolids({ color: hexToRgba(solid.color) }, solid.geometry),
      );
      options.entities = [...createBaseEntities(), ...solidEntities];
      renderScene(options);
    },
    setCameraView(view) {
      applyCameraView(camera, view);
      renderScene(options);
    },
    setCameraByName(name, radius, thickness) {
      this.setCameraView(cameraViews(radius, thickness)[name]);
    },
    resize() {
      const nextWidth = Math.max(container.clientWidth, 1);
      const nextHeight = Math.max(container.clientHeight, 1);
      cameras.perspective.setProjection(camera as never, camera as never, {
        width: nextWidth,
        height: nextHeight,
      });
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
