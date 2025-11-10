import { ECS } from '../../ecs/ECS.ts';
import { IBoundingBoxStrategy } from './AABB';
/**
 * Circle / Ellipse 包围盒策略
 * 完整支持圆弧 / 扇形
 */
export declare class CircleBoundingBox implements IBoundingBoxStrategy {
    match(ecs: ECS, entityId: number): boolean;
    /** 计算世界空间下 AABB */
    computeAABB(ecs: ECS, entityId: number): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    /** 命中检测 */
    hit(ecs: ECS, entityId: number, x: number, y: number): boolean;
    /** 完整圆 / 椭圆命中检测 */
    private hitFullCircle;
    /** 圆弧 / 扇形命中检测 */
    private hitArc;
    /** 判断角度是否在弧段内（顺时针或逆时针） */
    private isAngleBetween;
    /** 点是否在多边形内（射线法） */
    private pointInPolygon;
}
