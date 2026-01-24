// import { RenderComponent } from "../components/render/RenderComponent.ts";
import { IAABB } from "../../interface/AABB.ts";
import { SceneNode } from "../../scene/SceneTree.ts";
import { ISystem } from "../../interface/System.ts";
import { BoundingBoxComponent } from "../../components/BoundingBoxComponent.ts";
import { BoundingBoxProcess } from '../processor/aabbProcess.ts'


import { TransformProcess } from '../processor/TransformProcess.ts'
import { IShareContext } from "../../interface/System.ts";
export class PickEntitySystem extends ISystem {
    ctx!: CanvasRenderingContext2D;
    eventEntities: number[] = [];
    bboxProcess!: BoundingBoxProcess;
    transformProcess!: TransformProcess;
    protected onInit(): void {
        this.transformProcess = new TransformProcess();
        this.bboxProcess = new BoundingBoxProcess();
    }
    hitAABB(x: number, y: number, box: IAABB) {
        return x >= box.minX && y >= box.minY && x <= box.maxX && y <= box.maxY;
    }
    hitRenderable(x: number, y: number, entityId: number) {
        return this.bboxProcess.hit(this.ecs, entityId, x, y);
    }
    hitTree(x: number, y: number) {
        const tree = this.sceneTree;
        const visitHit = (node: SceneNode): SceneNode | null => {
            if (node === null) return null;
            const bbox = this.ecs.getComponent(node.entityId, BoundingBoxComponent)!;
            if (!this.hitAABB(x, y, bbox.totalAABB)) return null;

            // 逆序遍历子节点（后渲染的在前面）
            for (let i = node.children.length - 1; i >= 0; i--) {
                const hit = visitHit(node.children[i]);
                if (hit) return hit;
            }
            // 再检测自身包围盒
            if (this.hitAABB(x, y, bbox.selfAABB) && this.hitRenderable(x, y, node.entityId)) {
                return node;
            }
            return null
        }
        const node = visitHit(tree);
        return node 
    }
    pickEntityAt(x: number, y: number) {
        this.updateTree();
        return this.hitTree(x, y);
    }

    updateTree() {
        const map = new Map<SceneNode | null, IShareContext>();
        // 根节点的父节点的上下文
        map.set(null, { dirty: false } as IShareContext);
        const displayList = this.sceneTree.displayList;
        for (let i = 0; i < displayList.length; i++) {
            const [node, parentNode] = displayList[i];
            if (!map.has(node)) map.set(node, {} as IShareContext);
            const context = map.get(node)!;
            const parentContext = map.get(parentNode)!;
            this.transformProcess.exec(this, node, parentNode, context, parentContext);
        }
        for (let i = displayList.length - 1; i >= 0; i--) {
            const [node, parentNode] = displayList[i];
            const context = map.get(node)!;
            const parentContext = map.get(parentNode)!;
            this.bboxProcess.exec(this, node, parentNode, context, parentContext);
        }
    }
    update() { }
}