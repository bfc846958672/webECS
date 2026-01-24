import type { ECS } from "../ecs/ECS.ts";
import { Engine } from "../engine/Engine.ts";
import { SceneNode } from "../scene/SceneTree.ts";
import { IAABB } from "./AABB.ts";

export interface IShareContext { 
    dirty: boolean,
    childrenAABB?: IAABB,
}


export interface IProcess<TContext = IShareContext, TParentContext = IShareContext> {
    match: (ecs: ECS, node: SceneNode) => boolean;
    /** 判断该渲染器是否能处理此实体 */
    /** 渲染该实体 */
    exec: (system: ISystem, node: SceneNode, parentNode: SceneNode | null, context: TContext, parentContext: TParentContext | null) => void;
}export abstract class ISystem {
    ecs!: ECS;
    constructor(public engine: Engine, public sceneTree: SceneNode) { }
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
export type ISystemClass<T extends ISystem = ISystem> = new (engine: Engine, sceneTree: SceneNode) => T;
