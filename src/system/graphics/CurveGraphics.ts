import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Curve } from "../../components/render/Curve.ts";
import type { ISystem } from "../../interface/System.ts";
import type { IRenderStrategy } from "../../interface/IRender.ts";
import type { IBoundingBoxStrategy } from "../../interface/AABB.ts";
import { vec2, mat3 } from "gl-matrix";

/**
 * Curve 图形模块：同时实现渲染与包围盒/命中检测
 */
export class CurveGraphics implements IRenderStrategy, IBoundingBoxStrategy {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Curve);
  }

  render(system: ISystem, entityId: number) {
    const ecs = system.ecs;
    const ctx = ecs.canvas.getContext("2d")!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const curve = ecs.getComponent(entityId, Curve)!;
    if (!curve.render) return;

    ctx.save();
    ctx.globalAlpha = curve.alpha;
    const m = transform.worldMatrix;
    ctx.setTransform(m[0], m[1], m[3], m[4], m[6], m[7]);

    ctx.beginPath();
    ctx.moveTo(curve.start[0], curve.start[1]);
    if (curve.cp2) {
      ctx.bezierCurveTo(curve.cp1[0], curve.cp1[1], curve.cp2[0], curve.cp2[1], curve.end[0], curve.end[1]);
    } else {
      ctx.quadraticCurveTo(curve.cp1[0], curve.cp1[1], curve.end[0], curve.end[1]);
    }
    if (curve.strokeStyle && curve.lineWidth > 0) {
      ctx.strokeStyle = curve.strokeStyle;
      ctx.lineWidth = curve.lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  computeAABB(ecs: ECS, entityId: number) {
    const curve = ecs.getComponent(entityId, Curve)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const m = transform.worldMatrix;
    const points: vec2[] = [];
    const steps = 30;
    for (let t = 0; t <= 1; t += 1 / steps) {
      let x: number, y: number;
      if (curve.cp2) {
        const u = 1 - t;
        x = u ** 3 * curve.start[0] + 3 * u ** 2 * t * curve.cp1[0] + 3 * u * t ** 2 * curve.cp2[0] + t ** 3 * curve.end[0];
        y = u ** 3 * curve.start[1] + 3 * u ** 2 * t * curve.cp1[1] + 3 * u * t ** 2 * curve.cp2[1] + t ** 3 * curve.end[1];
      } else {
        const u = 1 - t;
        x = u ** 2 * curve.start[0] + 2 * u * t * curve.cp1[0] + t ** 2 * curve.end[0];
        y = u ** 2 * curve.start[1] + 2 * u * t * curve.cp1[1] + t ** 2 * curve.end[1];
      }
      const p = vec2.fromValues(x, y);
      vec2.transformMat3(p, p, m);
      points.push(p);
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }
    return { minX, minY, maxX, maxY };
  }

  hit(ecs: ECS, entityId: number, x: number, y: number): boolean {
    const curve = ecs.getComponent(entityId, Curve)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const m = transform.worldMatrix;
    const inv = mat3.create();
    mat3.invert(inv, m);
    const local = vec2.fromValues(x, y);
    vec2.transformMat3(local, local, inv);
    const steps = 50;
    let minDist = Infinity;
    for (let t = 0; t <= 1; t += 1 / steps) {
      let px: number, py: number;
      if (curve.cp2) {
        const u = 1 - t;
        px = u ** 3 * curve.start[0] + 3 * u ** 2 * t * curve.cp1[0] + 3 * u * t ** 2 * curve.cp2[0] + t ** 3 * curve.end[0];
        py = u ** 3 * curve.start[1] + 3 * u ** 2 * t * curve.cp1[1] + 3 * u * t ** 2 * curve.cp2[1] + t ** 3 * curve.end[1];
      } else {
        const u = 1 - t;
        px = u ** 2 * curve.start[0] + 2 * u * t * curve.cp1[0] + t ** 2 * curve.end[0];
        py = u ** 2 * curve.start[1] + 2 * u * t * curve.cp1[1] + t ** 2 * curve.end[1];
      }
      const dx = local[0] - px;
      const dy = local[1] - py;
      minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
    }
    return minDist <= (curve.lineWidth || 5);
  }
}
