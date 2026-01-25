// src/ecs/RootEntity.ts
import { Engine } from "../engine/Engine.ts";
import { Transform } from "../components/Transform.ts";
import { EventComponent } from "../components/Event.ts";
import { SceneNode } from "../scene/SceneTree.ts";

export class Root {
    static create(engine: Engine): SceneNode {
        const node = new SceneNode();
        const entityId = node.entityId;
        const transform = new Transform({ x: 0, y: 0 })
        const event = new EventComponent();
        engine.ecs.addComponent(entityId, transform);
        engine.ecs.addComponent(entityId, event);
        node.event = event;
        node.transform = transform;
        return node
    }
}