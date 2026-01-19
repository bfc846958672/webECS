import { ISystem } from "../../interface/System.ts";
import { SceneTree } from "../../scene/SceneTree.ts";
import { IProcess } from "../../interface/System.ts";
import { TransformProcess } from '../processor/TransformProcess.ts'
import { Engine } from "../../engine/Engine.ts";
import { BoundingBoxProcess } from '../processor/aabbProcess.ts'
import { IShareContext } from "../../interface/System.ts";
import { RenderProcess } from "../processor/renderProcess.ts";
export class SceneTreeRenderSystem extends ISystem {

    ctx!: CanvasRenderingContext2D;
    constructor(public engine: Engine, public sceneTree: SceneTree) {
        super(engine, sceneTree);
    }
    processes: IProcess<{ dirty: boolean }, { dirty: boolean }>[] = [];
    protected onInit(): void {
        // const canvas = this.ecs.canvas;
        // if (!canvas) throw new Error("Canvas not set on ECS");
        // const ctx = canvas.getContext("2d");
        // if (!ctx) throw new Error("Cannot get CanvasRenderingContext2D");
        // this.ctx = ctx;

        this.bboxProcess = new BoundingBoxProcess();
        this.transformProcess = new TransformProcess();
        this.renderProcess = new RenderProcess(this.engine.renderContext);
    }
    bboxProcess!: BoundingBoxProcess;
    transformProcess!: TransformProcess;
    renderProcess!: RenderProcess;
    update(): void {
        const gl = this.engine.renderContext.renderer.gl as WebGL2RenderingContext;
        gl.clearColor(1, 1, 1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const map = new Map<number | null, IShareContext>();
        // 根节点的父节点的上下文
        map.set(null, { dirty: false } as IShareContext);
        const displayList = this.sceneTree.displayList;
        for (let i = 0; i < displayList.length; i++) {
            const [entityId, parentEntityId] = displayList[i];
            if (!map.has(entityId)) map.set(entityId, {} as IShareContext);
            const context = map.get(entityId)!;
            const parentContext = map.get(parentEntityId)!;
            this.transformProcess.exec(this, entityId, parentEntityId, context, parentContext);
            this.renderProcess.exec(this, entityId);

        }
        for (let i = displayList.length - 1; i >= 0; i--) {
            const [entityId, parentEntityId] = displayList[i];
            const context = map.get(entityId)!;
            const parentContext = map.get(parentEntityId)!;
            this.bboxProcess.exec(this, entityId, parentEntityId, context, parentContext);
        }
    }
}
