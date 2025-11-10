import { ISystem } from '../ecs/System.ts';
import { SceneTree } from '../ecs/SceneTree.ts';
import { IProcess } from '../ecs/interface/IRender.ts';
import { Engine } from '../ecs/Engine.ts';
import { IAABB } from '../interface/AABB.ts';
export declare class BoxDebugSystem extends ISystem {
    engine: Engine;
    sceneTree: SceneTree;
    ctx: CanvasRenderingContext2D;
    constructor(engine: Engine, sceneTree: SceneTree);
    processes: IProcess<{
        dirty: boolean;
    }, {
        dirty: boolean;
    }>[];
    protected onInit(): void;
    update(): void;
    drawSelf(entityId: number): void;
    drawTotal(entityId: number): void;
    drawChildren(entityId: number): void;
    draw(aabb: IAABB, color?: string, width?: number): void;
}
