import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Circle } from "../../components/render/Circle.ts";
import { IBoundingBoxStrategy } from "./AABB";
import { mat3, vec2 } from "gl-matrix";

/**
 * Circle / Ellipse 包围盒策略
 * 完整支持圆弧 / 扇形
 */
export class CircleBoundingBox implements IBoundingBoxStrategy {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Circle);
  }

  /** 计算世界空间下 AABB */
  computeAABB(ecs: ECS, entityId: number) {
    const circle = ecs.getComponent(entityId, Circle)!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const { radius, radiusY = radius, rotation = 0, startAngle, endAngle, clockwise } = circle;
    const m = transform.worldMatrix;

    const cx = m[6];
    const cy = m[7];

    // 提取缩放分量
    const a = m[0], b = m[1], c = m[3], d = m[4];
    const rx = radius * Math.hypot(a, b);
    const ry = radiusY * Math.hypot(c, d);

    const isFull = startAngle === 0 && endAngle === 2 * Math.PI;

    if (isFull) {
      // 完整圆/椭圆
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const halfW = Math.abs(rx * cosR) + Math.abs(ry * sinR);
      const halfH = Math.abs(rx * sinR) + Math.abs(ry * cosR);
      return {
        minX: cx - halfW,
        minY: cy - halfH,
        maxX: cx + halfW,
        maxY: cy + halfH,
      };
    } else {
      // 圆弧/椭圆弧 → 考虑 start/end + 关键角 + 圆心闭合
      const angles = [startAngle, endAngle];
      const criticalAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      for (const a of criticalAngles) {
        if (this.isAngleBetween(a, startAngle, endAngle, clockwise)) angles.push(a);
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

      // 包括圆心闭合
      minX = Math.min(minX, 0);
      minY = Math.min(minY, 0);
      maxX = Math.max(maxX, 0);
      maxY = Math.max(maxY, 0);

      return {
        minX: cx + minX,
        minY: cy + minY,
        maxX: cx + maxX,
        maxY: cy + maxY,
      };
    }
  }

  /** 命中检测 */
  hit(ecs: ECS, entityId: number, x: number, y: number): boolean {
    const circle = ecs.getComponent(entityId, Circle)!;
    const isFull = circle.startAngle === 0 && circle.endAngle === 2 * Math.PI;
    return isFull
      ? this.hitFullCircle(ecs, entityId, x, y)
      : this.hitArc(ecs, entityId, x, y);
  }

  /** 完整圆 / 椭圆命中检测 */
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
      lx = tmpX;
      ly = tmpY;
    }

    const norm = (lx * lx) / (radius * radius) + (ly * ly) / (radiusY * radiusY);
    return norm <= 1;
  }

  /** 圆弧 / 扇形命中检测 */
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
      lx = tmpX;
      ly = tmpY;
    }

    // 归一化椭圆坐标
    const dx = lx / radius;
    const dy = ly / radiusY;
    const distance = Math.hypot(dx, dy);

    // 参数角 t
    let t_p = Math.atan2(dy, dx);
    if (t_p < 0) t_p += 2 * Math.PI;

    const inArc = this.isAngleBetween(t_p, startAngle, endAngle, clockwise);

    // 点在圆弧范围内
    if (distance <= 1 && inArc) return true;

    // Canvas 扇形闭合面积，圆心 + 起点 + 终点
    const startX = radius * Math.cos(startAngle);
    const startY = radiusY * Math.sin(startAngle);
    const endX = radius * Math.cos(endAngle);
    const endY = radiusY * Math.sin(endAngle);

    const polygon = clockwise
      ? [{ x: 0, y: 0 }, { x: startX, y: startY }, { x: endX, y: endY }]
      : [{ x: 0, y: 0 }, { x: endX, y: endY }, { x: startX, y: startY }];

    if (this.pointInPolygon({ x: lx, y: ly }, polygon)) return true;

    return false;
  }

  /** 判断角度是否在弧段内（顺时针或逆时针） */
  private isAngleBetween(angle: number, start: number, end: number, clockwise: boolean) {
    angle = (angle + 2 * Math.PI) % (2 * Math.PI);
    start = (start + 2 * Math.PI) % (2 * Math.PI);
    end = (end + 2 * Math.PI) % (2 * Math.PI);
    return clockwise
      ? ((start - angle + 2 * Math.PI) % (2 * Math.PI)) <= ((start - end + 2 * Math.PI) % (2 * Math.PI))
      : ((angle - start + 2 * Math.PI) % (2 * Math.PI)) <= ((end - start + 2 * Math.PI) % (2 * Math.PI));
  }

  /** 点是否在多边形内（射线法） */
  private pointInPolygon(p: { x: number, y: number }, polygon: { x: number, y: number }[]) {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > p.y) !== (yj > p.y)) &&
                        (p.x < (xj - xi) * (p.y - yi) / (yj - yi + 1e-10) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
