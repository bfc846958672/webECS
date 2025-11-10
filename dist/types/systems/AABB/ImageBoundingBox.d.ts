import { ECS } from '../../ecs/ECS';
import { IBoundingBoxStrategy } from './AABB';
/**
 * Image 包围盒策略
 */
export declare class ImageBoundingBox implements IBoundingBoxStrategy {
    match(ecs: ECS, entityId: number): boolean;
    /**
     * 计算图片的世界包围盒（考虑变换矩阵）
     */
    computeAABB(ecs: ECS, entityId: number): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    /**
     * 命中检测：判断点击点 (x, y) 是否落在图片内部（考虑旋转、缩放、平移）
     */
    hit(ecs: ECS, entityId: number, x: number, y: number): boolean;
}
