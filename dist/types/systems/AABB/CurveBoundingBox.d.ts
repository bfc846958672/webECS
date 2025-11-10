import { ECS } from '../../ecs/ECS';
import { IBoundingBoxStrategy } from './AABB';
/**
 * Curve 包围盒策略
 */
export declare class CurveBoundingBox implements IBoundingBoxStrategy {
    match(ecs: ECS, entityId: number): boolean;
    computeAABB(ecs: ECS, entityId: number): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    hit(ecs: ECS, entityId: number, x: number, y: number): boolean;
}
