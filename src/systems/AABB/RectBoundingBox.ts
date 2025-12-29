import { vec2, mat3 } from "gl-matrix";
import { ECS } from "../../ecs/ECS";
import { Transform } from "../../components/Transform";
import { Rect } from "../../components/render/Rect";
import { IBoundingBoxStrategy } from "../../interface/AABB";

/**
 * Rect 包围盒策略（支持圆角矩形）
 */
export class RectBoundingBox implements IBoundingBoxStrategy {
    match(ecs: ECS, entityId: number) {
        return ecs.hasComponent(entityId, Rect);
    }

    computeAABB(ecs: ECS, entityId: number) {
        const rect = ecs.getComponent(entityId, Rect)!;
        const transform = ecs.getComponent(entityId, Transform)!;

        const { width, height } = rect;
        const { pivotX, pivotY } = transform;
        const m = transform.worldMatrix;

        // 四个局部顶点（考虑 pivot）
        const points = [
            vec2.fromValues(-pivotX, -pivotY),
            vec2.fromValues(width - pivotX, -pivotY),
            vec2.fromValues(width - pivotX, height - pivotY),
            vec2.fromValues(-pivotX, height - pivotY),
        ];

        // 变换到世界坐标
        const worldPoints = points.map((p) => vec2.transformMat3(vec2.create(), p, m));

        // 计算AABB
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
        const rect = ecs.getComponent(entityId, Rect)!;
        const transform = ecs.getComponent(entityId, Transform)!;

        const { width, height, radius = 0 } = rect;
        const { pivotX, pivotY } = transform;
        const m = transform.worldMatrix;

        // 将世界坐标反变换回局部空间
        const inv = mat3.create();
        mat3.invert(inv, m);
        const local = vec2.fromValues(x, y);
        vec2.transformMat3(local, local, inv);
        const lx = local[0];
        const ly = local[1];

        // 1. 快速排除矩形外部
        if (lx < -pivotX || lx > width - pivotX || ly < -pivotY || ly > height - pivotY) {
            return false;
        }

        if (radius <= 0) return true; // 普通矩形直接命中

        // 2. 检查四个圆角
        const corners = [
            [-pivotX + radius, -pivotY + radius], // 左上
            [width - pivotX - radius, -pivotY + radius], // 右上
            [width - pivotX - radius, height - pivotY - radius], // 右下
            [-pivotX + radius, height - pivotY - radius], // 左下
        ];

        const cornerChecks = [
            lx < -pivotX + radius && ly < -pivotY + radius, // 左上
            lx > width - pivotX - radius && ly < -pivotY + radius, // 右上
            lx > width - pivotX - radius && ly > height - pivotY - radius, // 右下
            lx < -pivotX + radius && ly > height - pivotY - radius, // 左下
        ];

        for (let i = 0; i < 4; i++) {
            if (cornerChecks[i]) {
                const dx = lx - corners[i][0];
                const dy = ly - corners[i][1];
                if (dx * dx + dy * dy > radius * radius) return false;
            }
        }

        return true;
    }
}
