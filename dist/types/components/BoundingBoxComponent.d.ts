import { IComponent } from '../ecs/interface/IComponent';
import { IAABB } from '../interface/AABB';
/**
 * BoundingBoxComponent
 * 维护三类包围盒：
 * - selfAABB: 当前节点自身图形
 * - childrenAABB: 所有子节点包围盒
 * - totalAABB: self + children
 */
export declare class BoundingBoxComponent implements IComponent {
    selfAABB: IAABB;
    childrenAABB: IAABB;
    totalAABB: IAABB;
    dirty: boolean;
    constructor();
    reset(): void;
    setSelf(aabb: IAABB): void;
    setChildren(aabb: IAABB): void;
    updateTotalAABB(): void;
    hitTest(px: number, py: number, type?: "self" | "children" | "total"): boolean;
    merge(a1: IAABB, a2: IAABB): void;
}
