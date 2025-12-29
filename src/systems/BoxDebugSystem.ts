import { ISystem } from "./System.ts";
import { SceneTree } from "../scene/SceneTree.ts";
import { IProcess } from "../interface/IRender.ts";
import { Engine } from "../engine/Engine.ts";
import { IShareContext } from "../interface/System.ts";
import { BoundingBoxComponent } from "../main.ts";
import { IAABB } from "../interface/AABB.ts";
export class BoxDebugSystem extends ISystem {

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
    }

    update(): void {
        if (!(this.engine).boxDebug) return;
        // this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        const map = new Map<number | null, IShareContext>();
        // 根节点的父节点的上下文
        map.set(null, { dirty: false } as IShareContext);
        const displayList = this.sceneTree.displayList;
        for (let i = displayList.length - 1; i >= 0; i--) {
            const [entityId, _parentEntityId] = displayList[i];
            if (!map.has(entityId)) map.set(entityId, {} as IShareContext);
            this.drawTotal(entityId);
            // this.drawChildren(entityId);
            this.drawSelf(entityId);
        }
    }
    drawSelf(entityId: number,): void {
        const bbox = this.ecs.getComponent(entityId, BoundingBoxComponent)!;
        if (!bbox) return;
        this.draw(bbox.totalAABB, '#ff0000', 1);
    }
    drawTotal(entityId: number,): void {
        const bbox = this.ecs.getComponent(entityId, BoundingBoxComponent)!;
        if (!bbox) return;
        this.draw(bbox.selfAABB, 'blue', 3);
    }
    drawChildren(entityId: number,): void {
        const bbox = this.ecs.getComponent(entityId, BoundingBoxComponent)!;
        if (!bbox) return;
        this.draw(bbox.childrenAABB, 'green', 2);
    }

    draw(aabb: IAABB, color: string = '#ff0000', width: number = 1): void {
        const ctx = this.ctx;
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(aabb.minX, aabb.minY)
        ctx.lineTo(aabb.maxX, aabb.minY)
        ctx.lineTo(aabb.maxX, aabb.maxY)
        ctx.lineTo(aabb.minX, aabb.maxY)
        ctx.closePath()
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.stroke()
        ctx.restore()
    }
}
