import { ECS } from '../../ecs/ECS';
import { Path } from '../../components/render/Path';
import { IBoundingBoxStrategy } from './AABB';
export declare class PathBoundingBox implements IBoundingBoxStrategy {
    private offscreenCanvas;
    private offscreenCtx;
    constructor();
    match(ecs: ECS, entityId: number): boolean;
    computeAABB(ecs: ECS, entityId: number): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    hit(ecs: ECS, entityId: number, x: number, y: number): boolean;
    private isPointInPath;
    static isPointNearPath(path: Path, x: number, y: number): boolean;
}
