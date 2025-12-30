import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Circle } from "../../components/render/Circle.ts";
import type { ISystem } from "../../interface/System.ts";
import type { IRenderStrategy } from "../../interface/IRender.ts";
import type { IBoundingBoxStrategy } from "../../interface/AABB.ts";
import { mat3, vec2 } from "gl-matrix";

/**
 * Circle 图形模块：同时实现渲染与包围盒计算
 */
export class CircleGraphics implements IRenderStrategy, IBoundingBoxStrategy {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Circle);
  }

  render(system: ISystem, entityId: number) {
    const ecs = system.ecs;
    const ctx = ecs.canvas.getContext("2d")!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const circle = ecs.getComponent(entityId, Circle)!;
    if (!circle.render) return;

    ctx.save();
    ctx.globalAlpha = circle.alpha;

    const m = transform.worldMatrix;
    ctx.setTransform(m[0], m[1], m[3], m[4], m[6], m[7]);

    const { radius, radiusY = radius, rotation = 0, startAngle = 0, endAngle = Math.PI * 2, clockwise = false } = circle;
    ctx.beginPath();
    if (radiusY === radius) {
      ctx.arc(0, 0, radius, startAngle, endAngle, !!clockwise);
    } else {
      ctx.ellipse(0, 0, radius, radiusY, rotation, startAngle, endAngle, !!clockwise);
    }

    if (circle.fillStyle) {
      ctx.fillStyle = circle.fillStyle;
      ctx.fill();
    }
    if (circle.strokeStyle && circle.lineWidth > 0) {
      ctx.strokeStyle = circle.strokeStyle;
      ctx.lineWidth = circle.lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  computeAABB(ecs: ECS, entityId: number) {
    const circle = ecs.getComponent(entityId, Circle)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const { radius, radiusY = radius, rotation = 0, startAngle, endAngle, clockwise } = circle;
    const m = transform.worldMatrix;

    const cx = m[6];
    const cy = m[7];
    const a = m[0], b = m[1], c = m[3], d = m[4];
    const rx = radius * Math.hypot(a, b);
    const ry = radiusY * Math.hypot(c, d);
    const isFull = startAngle === 0 && endAngle === 2 * Math.PI;

    if (isFull) {
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const halfW = Math.abs(rx * cosR) + Math.abs(ry * sinR);
      const halfH = Math.abs(rx * sinR) + Math.abs(ry * cosR);
      return { minX: cx - halfW, minY: cy - halfH, maxX: cx + halfW, maxY: cy + halfH };
    } else {
      const angles = [startAngle, endAngle];
      const criticalAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      for (const a of criticalAngles) {
        if (this.isAngleBetween(a, startAngle, endAngle, !!clockwise)) angles.push(a);
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      for (const angle of angles) {
        const px = rx * Math.cos(angle);
        const py = ry * Math.sin(angle);
        const rxRot = px * cosR - py * sinR;
        const ryRot = px * sinR + py * cosR;
        minX = Math.min(minX, rxRot);
        minY = Math.min(minY, ryRot);
        maxX = Math.max(maxX, rxRot);
        maxY = Math.max(maxY, ryRot);
      }
      minX = Math.min(minX, 0);
      minY = Math.min(minY, 0);
      maxX = Math.max(maxX, 0);
      maxY = Math.max(maxY, 0);
      return { minX: cx + minX, minY: cy + minY, maxX: cx + maxX, maxY: cy + maxY };
    }
  }

  hit(ecs: ECS, entityId: number, x: number, y: number): boolean {
    const circle = ecs.getComponent(entityId, Circle)!;
    const isFull = circle.startAngle === 0 && circle.endAngle === 2 * Math.PI;
    return isFull ? this.hitFullCircle(ecs, entityId, x, y) : this.hitArc(ecs, entityId, x, y);
  }

  private hitFullCircle(ecs: ECS, entityId: number, x: number, y: number): boolean {
    const circle = ecs.getComponent(entityId, Circle)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const { radius, radiusY = radius, rotation = 0 } = circle;
    const m = transform.worldMatrix;
    const inv = mat3.create();
    mat3.invert(inv, m);
    const local = vec2.fromValues(x, y);
    vec2.transformMat3(local, local, inv);
    let lx = local[0];
    let ly = local[1];
    if (rotation !== 0) {
      const cosR = Math.cos(-rotation);
      const sinR = Math.sin(-rotation);
      const tmpX = lx * cosR - ly * sinR;
      const tmpY = lx * sinR + ly * cosR;
      lx = tmpX; ly = tmpY;
    }
    const norm = (lx * lx) / (radius * radius) + (ly * ly) / (radiusY * radiusY);
    return norm <= 1;
  }

  private hitArc(ecs: ECS, entityId: number, x: number, y: number): boolean {
    const circle = ecs.getComponent(entityId, Circle)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const { radius, radiusY = radius, rotation = 0, startAngle, endAngle, clockwise } = circle;
    const m = transform.worldMatrix;
    const inv = mat3.create();
    mat3.invert(inv, m);
    const local = vec2.fromValues(x, y);
    vec2.transformMat3(local, local, inv);
    let lx = local[0];
    let ly = local[1];
    if (rotation !== 0) {
      const cosR = Math.cos(-rotation);
      const sinR = Math.sin(-rotation);
      const tmpX = lx * cosR - ly * sinR;
      const tmpY = lx * sinR + ly * cosR;
      lx = tmpX; ly = tmpY;
    }
    const dx = lx / radius;
    const dy = ly / radiusY;
    const distance = Math.hypot(dx, dy);
    let t_p = Math.atan2(dy, dx);
    if (t_p < 0) t_p += 2 * Math.PI;
    const inArc = this.isAngleBetween(t_p, startAngle, endAngle, !!clockwise);
    if (distance <= 1 && inArc) return true;
    const startX = radius * Math.cos(startAngle);
    const startY = radiusY * Math.sin(startAngle);
    const endX = radius * Math.cos(endAngle);
    const endY = radiusY * Math.sin(endAngle);
    const polygon = clockwise
      ? [{ x: 0, y: 0 }, { x: startX, y: startY }, { x: endX, y: endY }]
      : [{ x: 0, y: 0 }, { x: endX, y: endY }, { x: startX, y: startY }];
    return this.pointInPolygon({ x: lx, y: ly }, polygon);
  }

  private isAngleBetween(angle: number, start: number, end: number, clockwise: boolean) {
    angle = (angle + 2 * Math.PI) % (2 * Math.PI);
    start = (start + 2 * Math.PI) % (2 * Math.PI);
    end = (end + 2 * Math.PI) % (2 * Math.PI);
    return clockwise
      ? ((start - angle + 2 * Math.PI) % (2 * Math.PI)) <= ((start - end + 2 * Math.PI) % (2 * Math.PI))
      : ((angle - start + 2 * Math.PI) % (2 * Math.PI)) <= ((end - start + 2 * Math.PI) % (2 * Math.PI));
  }

  private pointInPolygon(p: { x: number, y: number }, polygon: { x: number, y: number }[]) {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi + 1e-10) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
