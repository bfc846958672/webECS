import { ECS } from './ECS.ts';
import { SceneTree } from '../ecs/SceneTree';
import { RootEntity } from './RootEntity.ts';
import { IEngine } from './interface/IEngine.ts';
import { EngineEvent } from './EngineEvent.ts';
export declare class Engine implements IEngine {
    boxDebug: boolean;
    ecs: ECS;
    private ticker;
    sceneTree: SceneTree;
    rootEntity: RootEntity;
    event: EngineEvent<IEngine>;
    constructor(canvas: HTMLCanvasElement);
    start(): void;
    stop(): void;
    /**
     * 在场景树中添加一个实体
     * @param entityId 新实体ID
     * @param parentId 父实体ID, 默认挂到根节点
     */
    add(entityId: number, parentId?: number): void;
    /**
     * 将子节点添加到父节点
     */
    setParent(parentId: number, childId: number): void;
    /**
     * 删除实体及其子节点
     */
    remove(entityId: number): void;
    /**
     * 获取实体的父节点
     */
    getParent(entityId: number): import('../ecs/SceneTree').SceneNode | null;
    /**
     * 获取实体对应的 SceneNode
     */
    getNode(entityId: number): import('../ecs/SceneTree').SceneNode;
    /**
     * 清空场景树（保留根节点）
     */
    clear(): void;
}
