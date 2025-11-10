import { ECS } from './ECS.ts';
import { Engine } from './Engine.ts';
import { SceneTree } from './SceneTree.ts';
export declare abstract class ISystem {
    engine: Engine;
    sceneTree: SceneTree;
    ecs: ECS;
    constructor(engine: Engine, sceneTree: SceneTree);
    init(ecs: ECS): void;
    protected onInit(): void;
    abstract update(delta: number): void;
}
/**
 * 系统类构造函数类型
 * T 是 ISystem 的子类
 */
export type ISystemClass<T extends ISystem = ISystem> = new (engine: Engine, sceneTree: SceneTree) => T;
