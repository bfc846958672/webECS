import { mat3, vec2 } from 'gl-matrix';
import { ECS } from '../../ecs/ECS';
import { IAABB } from '../../interface/AABB';
export interface IBoundingBoxStrategy {
    match(ecs: ECS, entityId: number): boolean;
    computeAABB(ecs: ECS, entityId: number): IAABB;
    hit(ecs: ECS, entityId: number, x: number, y: number): boolean;
}
/**
 * 工具函数：用矩阵变换点
 */
export declare function transformPoint(out: vec2, m: mat3, x: number, y: number): vec2;
