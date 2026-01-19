// src/ecs/RootEntity.ts
import { Engine } from "../engine/Engine.ts";
import { Transform } from "../components/Transform.ts";

export class RootEntity {
    public readonly entityId: number;

    constructor(private engine: Engine) {
        this.entityId = this.engine.ecs.createEntity();
        this.engine.ecs.addComponent(this.entityId, new Transform({ x: 0, y: 0 }));
    }

    /**
     * 获取 Transform 组件
     */
    get transform(): Transform | undefined {
        return this.engine.ecs.getComponent(this.entityId, Transform);
    }
}
