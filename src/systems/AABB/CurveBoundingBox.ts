import { vec2, mat3 } from "gl-matrix";
import { ECS } from "../../ecs/ECS";
import { Transform } from "../../components/Transform";
import { Curve } from "../../components/render/Curve";
import { IBoundingBoxStrategy } from "../../interface/AABB";

/**
 * Curve 包围盒策略
 */
export class CurveBoundingBox implements IBoundingBoxStrategy {
    match(ecs: ECS, entityId: number) {
        return ecs.hasComponent(entityId, Curve);
    }

    computeAABB(ecs: ECS, entityId: number) {
        const curve = ecs.getComponent(entityId, Curve)!;
        const transform = ecs.getComponent(entityId, Transform)!;
        const m = transform.worldMatrix;

        // 采样曲线点
        const points: vec2[] = [];
        const steps = 30; // 分段数，越大越精确
        for (let t = 0; t <= 1; t += 1 / steps) {
            let x: number, y: number;
            if (curve.cp2) {
                // 三次贝塞尔
                const u = 1 - t;
                x = u ** 3 * curve.start[0] +
                    3 * u ** 2 * t * curve.cp1[0] +
                    3 * u * t ** 2 * curve.cp2[0] +
                    t ** 3 * curve.end[0];
                y = u ** 3 * curve.start[1] +
                    3 * u ** 2 * t * curve.cp1[1] +
                    3 * u * t ** 2 * curve.cp2[1] +
                    t ** 3 * curve.end[1];
            } else {
                // 二次贝塞尔
                const u = 1 - t;
                x = u ** 2 * curve.start[0] + 2 * u * t * curve.cp1[0] + t ** 2 * curve.end[0];
                y = u ** 2 * curve.start[1] + 2 * u * t * curve.cp1[1] + t ** 2 * curve.end[1];
            }
            const p = vec2.fromValues(x, y);
            vec2.transformMat3(p, p, m);
            points.push(p);
        }

        // 计算AABB
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

        // 将世界坐标反变换回局部空间
        const inv = mat3.create();
        mat3.invert(inv, m);
        const local = vec2.fromValues(x, y);
        vec2.transformMat3(local, local, inv);

        // 点到曲线距离，使用简单采样法
        const steps = 50;
        let minDist = Infinity;
        for (let t = 0; t <= 1; t += 1 / steps) {
            let px: number, py: number;
            if (curve.cp2) {
                const u = 1 - t;
                px = u ** 3 * curve.start[0] +
                    3 * u ** 2 * t * curve.cp1[0] +
                    3 * u * t ** 2 * curve.cp2[0] +
                    t ** 3 * curve.end[0];
                py = u ** 3 * curve.start[1] +
                    3 * u ** 2 * t * curve.cp1[1] +
                    3 * u * t ** 2 * curve.cp2[1] +
                    t ** 3 * curve.end[1];
            } else {
                const u = 1 - t;
                px = u ** 2 * curve.start[0] + 2 * u * t * curve.cp1[0] + t ** 2 * curve.end[0];
                py = u ** 2 * curve.start[1] + 2 * u * t * curve.cp1[1] + t ** 2 * curve.end[1];
            }
            const dx = local[0] - px;
            const dy = local[1] - py;
            minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
        }

        return minDist <= (curve.lineWidth || 5); // 允许一定像素误差
    }
}
