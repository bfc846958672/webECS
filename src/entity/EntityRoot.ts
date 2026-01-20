// src/ecs/RootEntity.ts
import { Engine } from "../engine/Engine.ts";
import { Transform } from "../components/Transform.ts";
import { EventComponent } from "../components/Event.ts";

export class RootEntity {
    public readonly entityId: number;

    constructor(private engine: Engine) {
        this.entityId = this.engine.ecs.createEntity();
        this.engine.ecs.addComponent(this.entityId, new Transform({ x: 0, y: 0 }));
        this.engine.ecs.addComponent(this.entityId, new EventComponent());
    }

    /**
     * 获取 Transform 组件
     */
    get transform(): Transform {
        return this.engine.ecs.getComponent(this.entityId, Transform)!;
    }

    /**
     * 获取 Event 组件
     */
    get event(): EventComponent {
        return this.engine.ecs.getComponent(this.entityId, EventComponent)!;
    }
}