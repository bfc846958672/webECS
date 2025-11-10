import { ISystem } from '../ecs/System.ts';
import { SceneTree } from '../ecs/SceneTree.ts';
import { IProcess } from '../ecs/interface/IRender.ts';
import { Engine } from '../ecs/Engine.ts';
import { BoundingBoxProcess } from './AABB/aabbProcess.ts';
export declare class SceneTreeRenderSystem extends ISystem {
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
    bboxProcess: BoundingBoxProcess;
    update(): void;
}
