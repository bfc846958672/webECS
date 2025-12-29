import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Path } from "../../components/render/Path.ts";
import { IProcess } from "../../interface/IRender.ts";
import type { ISystem } from "../System.ts";

/**
 * 渲染器：负责绘制 Path 组件（支持 moveTo/lineTo/曲线/arc/arcTo/ellipse）
 */
export class PathRenderer implements IProcess {
    match(ecs: ECS, entityId: number) {
        return ecs.hasComponent(entityId, Path);
    }

    /**
     * 执行渲染逻辑
     */
    exec(system: ISystem, entityId: number) {
        const ecs = system.ecs;
        const ctx = ecs.canvas.getContext("2d")!;
        const transform = ecs.getComponent(entityId, Transform)!;
        const path = ecs.getComponent(entityId, Path)!;

        if (!path.render || !path.commands.length) return;

        ctx.save();
        ctx.globalAlpha = path.alpha;
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

        for (const cmd of path.commands) {
            switch (cmd.type) {
                case "moveTo":
                    ctx.moveTo(cmd.x, cmd.y);
                    break;
                case "lineTo":
                    ctx.lineTo(cmd.x, cmd.y);
                    break;
                case "quadraticCurveTo":
                    ctx.quadraticCurveTo(cmd.cp[0], cmd.cp[1], cmd.end[0], cmd.end[1]);
                    break;
                case "bezierCurveTo":
                    ctx.bezierCurveTo(cmd.cp1[0], cmd.cp1[1], cmd.cp2[0], cmd.cp2[1], cmd.end[0], cmd.end[1]);
                    break;
                case "arc":
                    ctx.arc(cmd.center[0], cmd.center[1], cmd.radius, cmd.start, cmd.end, !!cmd.counterClockwise);
                    break;
                case "arcTo":
                    ctx.arcTo(cmd.cp1[0], cmd.cp1[1], cmd.cp2[0], cmd.cp2[1], cmd.radius);
                    break;
                case "ellipse":
                    ctx.ellipse(
                        cmd.center[0],
                        cmd.center[1],
                        cmd.radiusX,
                        cmd.radiusY,
                        cmd.rotation ?? 0,
                        cmd.start ?? 0,
                        cmd.end ?? 2 * Math.PI,
                        !!cmd.counterClockwise
                    );
                    break;
                case "close":
                    ctx.closePath();
                    break;
            }
        }

        if (path.fillStyle) {
            ctx.fillStyle = path.fillStyle;
            ctx.fill();
        }

        if (path.strokeStyle && path.lineWidth > 0) {
            ctx.strokeStyle = path.strokeStyle;
            ctx.lineWidth = path.lineWidth;
            ctx.stroke();
        }

        ctx.restore();
    }
}
