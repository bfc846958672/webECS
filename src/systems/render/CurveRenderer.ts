import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Curve } from "../../components/render/Curve.ts";
import { IProcess } from "../../ecs/interface/IRender.ts";
import type { ISystem } from "../../ecs/System.ts";

/**
 * 渲染器：负责绘制 Curve 组件（支持二次和三次贝塞尔曲线）
 */
export class CurveRenderer implements IProcess {
    match(ecs: ECS, entityId: number) {
        return ecs.hasComponent(entityId, Curve);
    }

    exec(system: ISystem, entityId: number) {
        const ecs = system.ecs;
        const ctx = ecs.canvas.getContext("2d")!;
        const transform = ecs.getComponent(entityId, Transform)!;
        const curve = ecs.getComponent(entityId, Curve)!;

        if (!curve.render) return;

        ctx.save();
        ctx.globalAlpha = curve.alpha;

        const m = transform.worldMatrix;
        ctx.setTransform(
            m[0], // a = m00
            m[1], // b = m10
            m[3], // c = m01
            m[4], // d = m11
            m[6], // e = m20 (平移x)
            m[7]  // f = m21 (平移y)
        );

        ctx.beginPath();
        ctx.moveTo(curve.start[0], curve.start[1]);

        if (curve.cp2) {
            // 三次贝塞尔曲线
            ctx.bezierCurveTo(
                curve.cp1[0], curve.cp1[1],
                curve.cp2[0], curve.cp2[1],
                curve.end[0], curve.end[1]
            );
        } else {
            // 二次贝塞尔曲线
            ctx.quadraticCurveTo(
                curve.cp1[0], curve.cp1[1],
                curve.end[0], curve.end[1]
            );
        }

        if (curve.strokeStyle && curve.lineWidth > 0) {
            ctx.strokeStyle = curve.strokeStyle;
            ctx.lineWidth = curve.lineWidth;
            ctx.stroke();
        }

        ctx.restore();
    }
}
