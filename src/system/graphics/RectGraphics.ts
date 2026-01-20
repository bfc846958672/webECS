import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Rect } from "../../components/render/Rect.ts";
import type { ISystem } from "../../interface/System.ts";
import { vec2, mat3 } from "gl-matrix";
import { renderSolidRects } from "./RectGraphics/Rect-solid.ts";
import { renderRoundedRects } from "./RectGraphics/rect-rounded-sdf-pipeline.ts";
import { Graphics } from "../../interface/IRender.ts";

/**
 * Rect 图形模块：同时实现渲染与包围盒计算（支持圆角）
 */
export class RectGraphics extends Graphics {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Rect);
  }

  render(system: ISystem, entityId: number) {
    const ecs = system.ecs;
    const gl = ecs.canvas.getContext("webgl2")!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const rect = ecs.getComponent(entityId, Rect)!;
    if (!rect.render) return;
    // if (rect.radius > 0) {
    renderRoundedRects(gl, this.renderContext!.camera, transform, rect);
    // } else {
    //   renderSolidRects(gl, this.renderContext!.camera, transform, rect);
    // }
  }

  computeAABB(ecs: ECS, entityId: number) {
    const rect = ecs.getComponent(entityId, Rect)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const { width, height } = rect;
    const { pivotX, pivotY } = transform;
    const m = transform.worldMatrix;

    const points = [
      vec2.fromValues(-pivotX, -pivotY),
      vec2.fromValues(width - pivotX, -pivotY),
      vec2.fromValues(width - pivotX, height - pivotY),
      vec2.fromValues(-pivotX, height - pivotY),
    ];
    const worldPoints = points.map((p) => vec2.transformMat3(vec2.create(), p, m));

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
    const rect = ecs.getComponent(entityId, Rect)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const { width, height, radius = 0 } = rect;
    const { pivotX, pivotY } = transform;
    const m = transform.worldMatrix;

    const inv = mat3.create();
    mat3.invert(inv, m);
    const local = vec2.fromValues(x, y);
    vec2.transformMat3(local, local, inv);
    const lx = local[0];
    const ly = local[1];

    if (lx < -pivotX || lx > width - pivotX || ly < -pivotY || ly > height - pivotY) {
      return false;
    }
    if (radius <= 0) return true;

    const corners = [
      [-pivotX + radius, -pivotY + radius],
      [width - pivotX - radius, -pivotY + radius],
      [width - pivotX - radius, height - pivotY - radius],
      [-pivotX + radius, height - pivotY - radius],
    ];
    const cornerChecks = [
      lx < -pivotX + radius && ly < -pivotY + radius,
      lx > width - pivotX - radius && ly < -pivotY + radius,
      lx > width - pivotX - radius && ly > height - pivotY - radius,
      lx < -pivotX + radius && ly > height - pivotY - radius,
    ];
    for (let i = 0; i < 4; i++) {
      if (cornerChecks[i]) {
        const dx = lx - corners[i][0];
        const dy = ly - corners[i][1];
        if (dx * dx + dy * dy > radius * radius) return false;
      }
    }
    return true;
  }
}
