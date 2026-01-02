import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Circle } from "../../components/render/Circle.ts";
import type { ISystem } from "../../interface/System.ts";
import { Graphics } from "../../interface/IRender.ts";
import { mat3, vec2 } from "gl-matrix";
import { renderCircle } from "./CircleGraphics/circle-sdf.ts";

/**
 * Circle 图形模块：同时实现渲染与包围盒计算
 */
export class CircleGraphics extends Graphics {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Circle);
  }

  render(system: ISystem, entityId: number) {
    const ecs = system.ecs;
    const gl = ecs.canvas.getContext("webgl2")!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const circle = ecs.getComponent(entityId, Circle)!;
    if (!circle.render) return;

    renderCircle(gl, this.renderContext!.camera, transform, circle);
  }

  computeAABB(ecs: ECS, entityId: number) {
    const circle = ecs.getComponent(entityId, Circle)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const { radius, radiusY = radius, startAngle, endAngle, clockwise } = circle;
    const m = transform.worldMatrix;

    const cx = m[6];
    const cy = m[7];
    const a = m[0], b = m[1], c = m[3], d = m[4];
    const rx = radius * Math.hypot(a, b);
    const ry = radiusY * Math.hypot(c, d);
    const isFull = startAngle === 0 && endAngle === 2 * Math.PI;

    if (isFull) {
      const cosR = Math.cos(0);
      const sinR = Math.sin(0);
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
      const cosR = Math.cos(0);
      const sinR = Math.sin(0);
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
    const { radius, radiusY = radius,} = circle;
    const m = transform.worldMatrix;
    const inv = mat3.create();
    mat3.invert(inv, m);
    const local = vec2.fromValues(x, y);
    vec2.transformMat3(local, local, inv);
    let lx = local[0];
    let ly = local[1];
    const norm = (lx * lx) / (radius * radius) + (ly * ly) / (radiusY * radiusY);
    return norm <= 1;
  }

  private hitArc(ecs: ECS, entityId: number, x: number, y: number): boolean {
    const circle = ecs.getComponent(entityId, Circle)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const { radius, radiusY = radius, startAngle, endAngle, clockwise } = circle;
    const m = transform.worldMatrix;
    const inv = mat3.create();
    mat3.invert(inv, m);
    const local = vec2.fromValues(x, y);
    vec2.transformMat3(local, local, inv);
    let lx = local[0];
    let ly = local[1];

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
