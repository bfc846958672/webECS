import { ISystem } from '../ecs/System.ts';
import { SceneTree } from '../ecs/SceneTree.ts';
import { Engine } from '../ecs/Engine.ts';
export declare class DirtySystem extends ISystem {
    engine: Engine;
    sceneTree: SceneTree;
    ctx: CanvasRenderingContext2D;
    constructor(engine: Engine, sceneTree: SceneTree);
    markBBoxDirty(entityId: number): void;
    protected onInit(): void;
    update(): void;
}
