import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Line } from "../../components/render/Line.ts";
import type { ISystem } from "../../interface/System.ts";
import { vec2, mat3 } from "gl-matrix";
import { Graphics } from "../../interface/IRender.ts";
import { renderLine } from "./LineGraphics/Line-render.ts";

export class LineGraphics extends Graphics {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Line);
  }

  render(system: ISystem, entityId: number) {
    const ecs = system.ecs;
    const gl = ecs.canvas.getContext("webgl2")!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const line = ecs.getComponent(entityId, Line)!;
    if (!line.render || !line.points || line.points.length < 2) return;

    renderLine(gl, this.renderContext!.camera, transform, line);
  }

  computeAABB(ecs: ECS, entityId: number) {
    const line = ecs.getComponent(entityId, Line)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const m = transform.worldMatrix;

    if (!line.points || line.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    const worldPoints = line.points.map((p) =>
      vec2.transformMat3(vec2.create(), vec2.fromValues(p[0], p[1]), m)
    );

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of worldPoints) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }

    return { minX, minY, maxX, maxY };
  }

  hit(ecs: ECS, entityId: number, x: number, y: number): boolean {
    const line = ecs.getComponent(entityId, Line)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    if (!line.points || line.points.length < 2) return false;

    const inv = mat3.create();
    mat3.invert(inv, transform.worldMatrix);
    const local = vec2.fromValues(x, y);
    vec2.transformMat3(local, local, inv);

    const px = local[0];
    const py = local[1];

    const threshold = 3;
    for (let i = 0; i < line.points.length - 1; i++) {
      const p1 = line.points[i];
      const p2 = line.points[i + 1];
      if (this.pointToSegmentDistance(px, py, p1[0], p1[1], p2[0], p2[1]) <= threshold) return true;
    }
    return false;
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      return Math.hypot(px - x1, py - y1);
    }
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));
    const closestX = x1 + clampedT * dx;
    const closestY = y1 + clampedT * dy;
    return Math.hypot(px - closestX, py - closestY);
  }
}
