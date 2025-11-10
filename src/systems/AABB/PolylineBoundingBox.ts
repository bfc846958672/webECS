import { vec2, mat3 } from "gl-matrix";
import { ECS } from "../../ecs/ECS";
import { Transform } from "../../components/Transform";
import { Polyline } from "../../components/render/Polyline";
import { IBoundingBoxStrategy } from "./AABB";

/**
 * Polyline 包围盒策略
 */
export class PolylineBoundingBox implements IBoundingBoxStrategy {
    match(ecs: ECS, entityId: number) {
        return ecs.hasComponent(entityId, Polyline);
    }

    computeAABB(ecs: ECS, entityId: number) {
        const polyline = ecs.getComponent(entityId, Polyline)!;
        const transform = ecs.getComponent(entityId, Transform)!;
        const m = transform.worldMatrix;

        if (!polyline.points || polyline.points.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        // 将所有点变换到世界坐标
        const worldPoints = polyline.points.map((p) =>
            vec2.transformMat3(vec2.create(), vec2.fromValues(p[0], p[1]), m)
        );

        // 计算 AABB
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
        const polyline = ecs.getComponent(entityId, Polyline)!;
        const transform = ecs.getComponent(entityId, Transform)!;

        if (!polyline.points || polyline.points.length < 2) return false;

        // 世界 -> 局部
        const inv = mat3.create();
        mat3.invert(inv, transform.worldMatrix);
        const local = vec2.fromValues(x, y);
        vec2.transformMat3(local, local, inv);

        const pts = polyline.points;
        const px = local[0], py = local[1];

        if (polyline.closed) {
            // --- 闭合路径：点在多边形内检测（奇偶规则）
            let inside = false;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                const xi = pts[i][0], yi = pts[i][1];
                const xj = pts[j][0], yj = pts[j][1];

                const intersect =
                    yi > py !== yj > py &&
                    px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

                if (intersect) inside = !inside;
            }
            return inside;
        } else {
            // --- 非闭合折线：判断点到线段的最短距离是否小于阈值
            const threshold = 3; // 可根据像素密度调整
            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i], p2 = pts[i + 1];
                if (this.pointToSegmentDistance(px, py, p1[0], p1[1], p2[0], p2[1]) <= threshold)
                    return true;
            }
            return false;
        }
    }

    /** 计算点到线段的最短距离 */
    private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) {
            return Math.hypot(px - x1, py - y1);
        }
        const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        const closestX = x1 + clampedT * dx;
        const closestY = y1 + clampedT * dy;
        return Math.hypot(px - closestX, py - closestY);
    }
}
