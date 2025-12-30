import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Polyline } from "../../components/render/Polyline.ts";
import type { ISystem } from "../../interface/System.ts";
import type { IRenderStrategy } from "../../interface/IRender.ts";

/**
 * 渲染器：负责绘制 Polyline 组件
 */
export class PolylineRenderer implements IRenderStrategy {
    match(ecs: ECS, entityId: number) {
        return ecs.hasComponent(entityId, Polyline);
    }

    render(system: ISystem, entityId: number) {
        const ecs = system.ecs;
        const ctx = ecs.canvas.getContext("2d")!;
        const transform = ecs.getComponent(entityId, Transform)!;
        const polyline = ecs.getComponent(entityId, Polyline)!;
        if (!polyline.render || polyline.points.length < 2) return;

        ctx.save();
        ctx.globalAlpha = polyline.alpha;

        // 设置世界变换矩阵
        const m = transform.worldMatrix;
        ctx.setTransform(
            m[0], // a
            m[1], // b
            m[3], // c
            m[4], // d
            m[6], // e
            m[7]  // f
        );

        ctx.beginPath();

        // 绘制折线路径
        const pts = polyline.points;
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
        }

        // 闭合路径（可选）
        if (polyline.closed) {
            ctx.closePath();
        }

        // 填充（仅在闭合时生效）
        if (polyline.closed && polyline.fillStyle) {
            ctx.fillStyle = polyline.fillStyle;
            ctx.fill();
        }

        // 描边
        if (polyline.strokeStyle && polyline.lineWidth > 0) {
            ctx.strokeStyle = polyline.strokeStyle;
            ctx.lineWidth = polyline.lineWidth;
            ctx.stroke();
        }

        ctx.restore();
    }
}
