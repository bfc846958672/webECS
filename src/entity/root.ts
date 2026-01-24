// src/ecs/RootEntity.ts
import { Engine } from "../engine/Engine.ts";
import { Transform } from "../components/Transform.ts";
import { EventComponent } from "../components/Event.ts";
import { SceneNode } from "../scene/SceneTree.ts";

export class Root {
    static create(engine: Engine): SceneNode {
        const node = new SceneNode();
        const entityId = node.entityId;
        engine.ecs.addComponent(entityId, new Transform({ x: 0, y: 0 }));
        engine.ecs.addComponent(entityId, new EventComponent());
        return node
    }
}