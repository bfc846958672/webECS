import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Circle } from "../../components/render/Circle.ts";
import { IProcess } from "../../ecs/interface/IRender.ts";
import type { ISystem } from "../../ecs/System.ts";

/**
 * 渲染器：负责绘制 Circle 组件
 * Canvas API 原生渲染，startAngle/endAngle/clockwise 原样使用
 */
export class CircleRenderer implements IProcess {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Circle);
  }

  exec(system: ISystem, entityId: number) {
    const ecs = system.ecs;
    const ctx = ecs.canvas.getContext("2d")!;
    const transform = ecs.getComponent(entityId, Transform)!;
    const circle = ecs.getComponent(entityId, Circle)!;
    if (!circle.render) return;

    ctx.save();
    ctx.globalAlpha = circle.alpha;

    // 应用世界变换矩阵
    const m = transform.worldMatrix;
    ctx.setTransform(
      m[0], m[1], m[3], m[4], m[6], m[7]
    );

    const { radius, radiusY = radius, rotation = 0, startAngle = 0, endAngle = Math.PI*2, clockwise = false } = circle;
    ctx.beginPath();
    if (radiusY === radius) {
      // 圆 / 圆弧
      ctx.arc(0, 0, radius, startAngle, endAngle, !!clockwise);
    } else {
      // 椭圆 / 椭圆弧
      ctx.ellipse(0, 0, radius, radiusY, rotation, startAngle, endAngle, !!clockwise);
    }

    // 填充
    if (circle.fillStyle) {
      ctx.fillStyle = circle.fillStyle;
      ctx.fill();
    }

    // 描边
    if (circle.strokeStyle && circle.lineWidth > 0) {
      ctx.strokeStyle = circle.strokeStyle;
      ctx.lineWidth = circle.lineWidth;
      ctx.stroke();
    }

    ctx.restore();
  }
}
