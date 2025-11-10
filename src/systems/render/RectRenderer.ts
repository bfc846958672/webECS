import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Rect } from "../../components/render/Rect.ts";
import { IProcess } from "../../ecs/interface/IRender.ts";
import type { ISystem } from "../../ecs/System.ts";

/**
 * 渲染器：负责绘制 Rect 组件（支持圆角矩形）
 */
export class RectRenderer implements IProcess {
    match(ecs: ECS, entityId: number) {
        return ecs.hasComponent(entityId, Rect);
    }

    exec(system: ISystem, entityId: number) {
        const ecs = system.ecs;
        const ctx = ecs.canvas.getContext("2d")!;
        const transform = ecs.getComponent(entityId, Transform)!;
        const rect = ecs.getComponent(entityId, Rect)!;
        if (!rect.render) return;

        ctx.save();
        ctx.globalAlpha = rect.alpha;

        const m = transform.worldMatrix;
        ctx.setTransform(
            m[0], // a = m00
            m[1], // b = m10
            m[3], // c = m01
            m[4], // d = m11
            m[6], // e = m20 (平移x)
            m[7]  // f = m21 (平移y)
        );

        // 支持圆角矩形
        const { width, height, radius = 0 } = rect;
        ctx.beginPath();
        if (radius > 0) {
            // 使用 modern Canvas API roundRect（兼容大多数浏览器）
            ctx.roundRect(0, 0, width, height, radius);
        } else {
            ctx.rect(0, 0, width, height);
        }

        if (rect.fillStyle) {
            ctx.fillStyle = rect.fillStyle;
            ctx.fill();
        }

        if (rect.strokeStyle && rect.lineWidth > 0) {
            ctx.strokeStyle = rect.strokeStyle;
            ctx.lineWidth = rect.lineWidth;
            ctx.stroke();
        }

        ctx.restore();
    }
}
