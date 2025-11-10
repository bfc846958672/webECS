import { ECS } from '../../ecs/ECS';
import { IBoundingBoxStrategy } from './AABB';
/**
 * Rect 包围盒策略（支持圆角矩形）
 */
export declare class RectBoundingBox implements IBoundingBoxStrategy {
    match(ecs: ECS, entityId: number): boolean;
    computeAABB(ecs: ECS, entityId: number): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    hit(ecs: ECS, entityId: number, x: number, y: number): boolean;
}
