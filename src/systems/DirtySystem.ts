import { ISystem } from "../ecs/System.ts";
import { SceneTree, SceneNode } from "../ecs/SceneTree.ts";
import { Engine } from "../ecs/Engine.ts";
import { BoundingBoxComponent } from "../main.ts";
export class DirtySystem extends ISystem {
    ctx!: CanvasRenderingContext2D;

    constructor(public engine: Engine, public sceneTree: SceneTree) {
        super(engine, sceneTree);
    }
    markBBoxDirty(entityId: number) {
        let node = this.sceneTree.get(entityId) as SceneNode | null;
        // 递归标记父节点的包围盒 dirty， 子节点由矩阵处理器标记
        while (node) {
            let bbox = this.ecs.getComponent(node.entityId, BoundingBoxComponent);
            if (!bbox) {
                bbox = new BoundingBoxComponent();
                this.ecs.addComponent(node.entityId, bbox);
            }
            bbox.dirty = true
            node = node.parent;
        }
    }
    protected onInit(): void {
        this.ecs = this.engine.ecs;
    }

    update(): void {

    }
}
