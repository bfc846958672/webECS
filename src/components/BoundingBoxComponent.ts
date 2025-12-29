import { Component } from "../ecs/decorators/Component";
import { IComponent } from "./IComponent";
import { IAABB } from "../interface/AABB";

/**
 * BoundingBoxComponent
 * 维护三类包围盒：
 * - selfAABB: 当前节点自身图形
 * - childrenAABB: 所有子节点包围盒
 * - totalAABB: self + children
 */
@Component("BoundingBoxComponent")
export class BoundingBoxComponent implements IComponent {
    // 当前节点自身图形包围盒
    selfAABB: IAABB = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    childrenAABB: IAABB = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    totalAABB: IAABB = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    dirty: boolean = true;
    constructor() { }
    reset() {
        this.selfAABB = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        this.childrenAABB = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        this.totalAABB = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    }
    // 设置自身 AABB
    setSelf(aabb: IAABB) {
        this.selfAABB.minX = aabb.minX;
        this.selfAABB.minY = aabb.minY;
        this.selfAABB.maxX = aabb.maxX;
        this.selfAABB.maxY = aabb.maxY;
        this.dirty = true; 
    }

    // 设置子节点 AABB
    setChildren(aabb: IAABB) {
        this.childrenAABB.minX = aabb.minX;
        this.childrenAABB.minY = aabb.minY;
        this.childrenAABB.maxX = aabb.maxX;
        this.childrenAABB.maxY = aabb.maxY;
        this.dirty = true; 
    }

    // 计算总包围盒（self + children）
    updateTotalAABB() {
        this.totalAABB = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        this.merge(this.totalAABB, this.selfAABB);
        this.merge(this.totalAABB, this.childrenAABB);
        this.dirty = false;
    }

    // 命中检测（可以选择 self / children / total）
    hitTest(px: number, py: number, type: "self" | "children" | "total" = "total"): boolean {
        let box: IAABB;
        switch (type) {
            case "self": box = this.selfAABB; break;
            case "children": box = this.childrenAABB; break;
            case "total": box = this.totalAABB; break;
        }
        return px >= box.minX && py >= box.minY && px <= box.maxX && py <= box.maxY;
    }
    merge(a1: IAABB, a2: IAABB) {
        a1.minX = Math.min(a1.minX, a2.minX);
        a1.minY = Math.min(a1.minY, a2.minY);
        a1.maxX = Math.max(a1.maxX, a2.maxX);
        a1.maxY = Math.max(a1.maxY, a2.maxY);
    }
}
