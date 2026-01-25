import { entityManager } from "../entity/EntityManager";
import { EventComponent } from "../components/Event.ts";
import { Transform } from "../components/Transform.ts";

// SceneNode.ts
export class SceneNode {
    parent: SceneNode | null = null;
    children: SceneNode[] = [];
    entityId: number;
    event?: EventComponent = undefined;
    transform?: Transform = undefined;
    constructor() {
        this.entityId = entityManager.create();
    }
    add(child: SceneNode) {
        if (child.parent) {
            // 从原父节点移除
            const idx = child.parent.children.indexOf(child);
            if (idx !== -1) child.parent.children.splice(idx, 1);
        }
        child.parent = this;
        this.children.push(child);
    }
    remove(child: SceneNode) {
        const index = this.children.indexOf(child);
        if (index === -1) {
            throw new Error(`Cannot remove child: entity ${child.entityId} is not a child of entity ${this.entityId}`);
        }
        this.children.splice(index, 1);
        child.parent = null;
    }
    clear() {
        for (const child of this.children) {
            child.parent = null;
        }
        this.children = [];
    }

    contain(node: SceneNode): boolean {
        for (const child of this.children) {
            if (child === node) return true;
            if (child.contain(node)) return true;
        }
        return false;
    }
    /**
     * 获取所有后代节点，深度优先顺序
     */
    getDescendants(): SceneNode[] {
        const result: SceneNode[] = [];
        for (const child of this.children) {
            result.push(child);
            result.push(...child.getDescendants());
        }
        return result;
    }

    get displayList(): Array<[SceneNode, SceneNode | null]> {
        const result: Array<[SceneNode, SceneNode | null]> = [];
        function visit(node: SceneNode, parent: SceneNode | null) {
            result.push([node, parent ?? null]);
            if (node.children) {
                for (const child of node.children) { visit(child, node); }
            }
        }
        visit(this, null);
        return result;
    }
}