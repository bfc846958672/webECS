import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Point } from "../../components/render/Point.ts";
import type { ISystem } from "../../interface/System.ts";
import { vec2, mat3 } from "gl-matrix";
import { Graphics } from "../../interface/IRender.ts";
import { renderPoint } from "./PointGraphics/Point-render.ts";

export class PointGraphics extends Graphics {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Point);
  }

  render(system: ISystem, entityId: number) {
    const ecs = system.ecs;
    const gl = ecs.canvas.getContext("webgl2")!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const point = ecs.getComponent(entityId, Point)!;
    if (!point.render) return;

    renderPoint(gl, this.renderContext!.camera, transform, point);
  }

  computeAABB(ecs: ECS, entityId: number) {
    const point = ecs.getComponent(entityId, Point)!;
    const transform = ecs.getComponent(entityId, Transform)!;

    const size = Math.max(0, Number(point.size || 0));
    const half = size * 0.5;

    const p = vec2.transformMat3(vec2.create(), vec2.fromValues(0, 0), transform.worldMatrix);

    return { minX: p[0] - half, minY: p[1] - half, maxX: p[0] + half, maxY: p[1] + half };
  }

  hit(ecs: ECS, entityId: number, x: number, y: number): boolean {
    const point = ecs.getComponent(entityId, Point)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const size = Math.max(0, Number(point.size || 0));
    const r = size * 0.5;

    const center = vec2.transformMat3(vec2.create(), vec2.fromValues(0, 0), transform.worldMatrix);
    const dx = x - center[0];
    const dy = y - center[1];
    return dx * dx + dy * dy <= r * r;
  }
}
