import type { ECS } from "./ECS.ts";
import { Engine } from "./Engine.ts";
import { SceneTree } from "./SceneTree.ts";

export abstract class ISystem {
    ecs!: ECS;
    constructor(public engine: Engine, public sceneTree: SceneTree) { }
    init(ecs: ECS): void {
        this.ecs = ecs;
        this.onInit();
    }

    protected onInit(): void {
    }
    abstract update(delta: number): void;
}
/**
 * 系统类构造函数类型
 * T 是 ISystem 的子类
 */
export type ISystemClass<T extends ISystem = ISystem> = new (engine: Engine, sceneTree: SceneTree) => T;