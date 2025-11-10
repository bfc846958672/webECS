import { ISystem } from "../ecs/System.ts";
import { SceneTree } from "../ecs/SceneTree.ts";
import { IProcess } from "../ecs/interface/IRender.ts";
import { RectRenderer } from './render/RectRenderer.ts'
import { CircleRenderer } from './render/CircleRenderer.ts'
import { ImageRenderer } from './render/ImageRenderer.ts'
import { TransformProcess } from './TransformProcess.ts'
import { Engine } from "../ecs/Engine.ts";
import { BoundingBoxProcess } from './AABB/aabbProcess.ts'
import { PathRenderer } from "./render/PathRenderer.ts";
import { IShareContext } from "../interface/System.ts";
import { PolylineRenderer } from "./render/PolylineRenderer.ts";
import { CurveRenderer } from "./render/CurveRenderer.ts";
export class SceneTreeRenderSystem extends ISystem {

    ctx!: CanvasRenderingContext2D;
    constructor(public engine: Engine, public sceneTree: SceneTree) {
        super(engine, sceneTree);
    }
    processes: IProcess<{ dirty: boolean }, { dirty: boolean }>[] = [];
    protected onInit(): void {
        const canvas = this.ecs.canvas;
        if (!canvas) throw new Error("Canvas not set on ECS");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Cannot get CanvasRenderingContext2D");
        this.ctx = ctx;

        this.processes.push(
            new TransformProcess(),
            new RectRenderer(),
            new CircleRenderer(),
            new ImageRenderer(),
            new PolylineRenderer(),
            new CurveRenderer(),
            new PathRenderer(),
        );
        this.bboxProcess = new BoundingBoxProcess();
    }
    bboxProcess!: BoundingBoxProcess;
    update(): void {
        console.log('渲染')
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        const map = new Map<number | null, IShareContext>();
        // 根节点的父节点的上下文
        map.set(null, { dirty: false } as IShareContext);
        const displayList = this.sceneTree.displayList;
        for (let i = 0; i < displayList.length; i++) {
            const [entityId, parentEntityId] = displayList[i];
            if (!map.has(entityId)) map.set(entityId, {} as IShareContext);
            const context = map.get(entityId)!;
            const parentContext = map.get(parentEntityId)!;
            for (const process of this.processes) {
                if (process.match(this.ecs, entityId)) {
                    process.exec(this, entityId, parentEntityId, context, parentContext);
                }
            }
        }
        for (let i = displayList.length - 1; i >= 0; i--) {
            const [entityId, parentEntityId] = displayList[i];
            const context = map.get(entityId)!;
            const parentContext = map.get(parentEntityId)!;
            this.bboxProcess.exec(this, entityId, parentEntityId, context, parentContext);
        }
    }
}
