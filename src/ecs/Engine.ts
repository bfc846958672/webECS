import { ECS } from "./ECS.ts";
import { Ticker } from "./Ticker.ts";
import { SceneTree } from "../ecs/SceneTree";
import { RootEntity } from "./RootEntity.ts";
import { SceneTreeRenderSystem } from "../systems/SceneTreeRenderSystem.ts";
import { PickEntitySystem } from "../systems/PickEntitySystem.ts";
import { IEngine } from "./interface/IEngine.ts";
import { EngineEvent } from "./EngineEvent.ts";
import { BoxDebugSystem } from "../systems/BoxDebugSystem.ts";
import { EventSystem } from "../systems/EventSystem.ts";
export class Engine implements IEngine {
    public boxDebug: boolean = false;
    public ecs: ECS;
    private ticker: Ticker;
    public sceneTree: SceneTree;
    public rootEntity: RootEntity;
    public event: EngineEvent<IEngine>;
    constructor(canvas: HTMLCanvasElement) {
        this.event = new EngineEvent();
        this.ecs = new ECS();
        this.ecs.canvas = canvas;
        this.rootEntity = new RootEntity(this);
        this.sceneTree = new SceneTree(this.rootEntity.entityId);

        // 注册系统
        this.ecs.addSystem(new SceneTreeRenderSystem(this, this.sceneTree));
        this.ecs.addSystem(new BoxDebugSystem(this, this.sceneTree));
        this.ecs.addSystem(new PickEntitySystem(this, this.sceneTree));
        this.ecs.addSystem(new EventSystem(this, this.sceneTree));
        // 绑定 Ticker → ECS
        this.ticker = new Ticker();
        this.ticker.add((dt) => this.ecs.update(dt));
    }
    start() {
        this.ticker.start();
        this.event.emit("start");
    }

    stop() {
        this.ticker.stop();
        this.event.emit("stop");
    }

    /**
     * 在场景树中添加一个实体
     * @param entityId 新实体ID
     * @param parentId 父实体ID, 默认挂到根节点
     */
    add(entityId: number, parentId?: number) {
        if (!this.ecs.hasEntity(entityId)) throw new Error(`Entity ${entityId} not exists`);
        if (parentId && !this.ecs.hasEntity(parentId)) throw new Error(`Parent entity ${parentId} not found`);
        // 检查是否已存在
        if (parentId && !this.sceneTree.has(parentId))
            throw new Error(`Entity ${parentId} not exists`);
        this.sceneTree.add(entityId, parentId);
        // 通知系统添加实体
        this.event.emit("add", entityId);
    }

    /**
     * 将子节点添加到父节点
     */
    setParent(parentId: number, childId: number,) {
        if (!this.ecs.hasEntity(childId)) throw new Error(`Entity ${childId} not exists`);
        if (parentId && !this.ecs.hasEntity(parentId)) throw new Error(`Parent entity ${parentId} not found`);
        // 检查树中是否存在
        if (!this.sceneTree.has(parentId))
            throw new Error(`Entity ${parentId} not exists`);
        const parentNode = this.sceneTree.get(parentId);
        const childNode = this.sceneTree.get(childId);

        parentNode.addChild(childNode);
        // 通知系统设置父节点
        this.event.emit("setParent", parentId, childId);
    }

    /**
     * 删除实体及其子节点
     */
    remove(entityId: number) {
        this.sceneTree.destory(entityId);
        this.ecs.removeEntity(entityId);
        // 通知系统删除实体
        this.event.emit("remove", entityId);
    }

    /**
     * 获取实体的父节点
     */
    getParent(entityId: number) {
        return this.sceneTree.getParent(entityId);
    }

    /**
     * 获取实体对应的 SceneNode
     */
    getNode(entityId: number) {
        return this.sceneTree.get(entityId);
    }

    /**
     * 清空场景树（保留根节点）
     */
    clear() {
        this.sceneTree.clear();
        // 通知系统清空场景树
        this.event.emit("clear");
    }
}
