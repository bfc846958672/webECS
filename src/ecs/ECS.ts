import { EntityManager } from "../entity/EntityManager.ts";
import { ComponentManager } from "./ComponentManager.ts";
import type { ISystem, ISystemClass } from "../systems/System.ts";
import { IComponent, ComponentConstructor } from "../components/IComponent.ts";
import { ComponentRegistry } from "./registry/ComponentRegistry.ts";
import { ArchetypeManager } from "../archetype/ArchetypeManager.ts";
import { EntityComponentManager } from "../entity/EntityComponentManager.ts";
export class ECS {
    public canvas!: HTMLCanvasElement;  // 挂载 Canvas
    public entities = new EntityManager();
    public components = new ComponentManager();
    private systems: ISystem[] = [];
    public ComponentRegistry = ComponentRegistry;
    // 简单 Map：实体ID -> 组件名 -> 组件实例
    private entityComponents = new EntityComponentManager();

    private archetypeManager = new ArchetypeManager();

    #system: Map<ISystemClass, ISystem> = new Map();
    addSystem(system: ISystem) {
        system.init(this);
        this.systems.push(system);
        this.#system.set(system.constructor as ISystemClass, system);
    }
    getSystem<T extends ISystem>(systemClass: ISystemClass<T>): T {
        return this.#system.get(systemClass) as T;
    }
    hasEntity(entityId: number) {
        return this.entities.has(entityId);
    }
    createEntity() {
        const entityId = this.entities.create();
        return entityId;
    }
    removeEntity(entityId: number) {
        if (!this.hasEntity(entityId)) throw new Error(`Entity ${entityId} not exists`);
        this.entities.remove(entityId);
        this.entityComponents.removeEntity(entityId);
        this.archetypeManager.removeEntity(entityId);
    }
    update(delta: number) {
        for (const sys of this.systems) sys.update(delta);
    }
    addComponent(entityId: number, component: IComponent) {
        if (!this.hasEntity(entityId)) throw new Error(`Entity ${entityId} not exists`);
        // 1️⃣ 检查组件是否注册
        const name = Reflect.getMetadata("component:name", component.constructor);
        if (!this.ComponentRegistry.has(name)) {
            throw new Error(`Component "${name}" is not standard component!`);
        }
        this.entityComponents.addComponent(entityId, component);
        const comps = this.entityComponents.getComponentsMap(entityId)!;
        this.archetypeManager.migrateEntity(entityId, comps);

    }
    removeComponent(entityId: number, componentClass: ComponentConstructor<IComponent>) {
        if (!this.hasEntity(entityId)) throw new Error(`Entity ${entityId} not exists`);
        this.entityComponents.removeComponent(entityId, componentClass);
        const comps = this.entityComponents.getComponentsMap(entityId);

        if (comps && comps.size > 0) {
            this.archetypeManager.migrateEntity(entityId, comps);
        } else {
            this.archetypeManager.removeEntity(entityId);
        }
    }


    // ------------------ 查询组件 ------------------
    getComponent<T extends IComponent>(entityId: number, componentClass: ComponentConstructor<T>): T | undefined {
        return this.entityComponents.getComponent<T>(entityId, componentClass);
    }
    getComponents(entityId: number) {
        return this.entityComponents.getComponents(entityId);
    }
    hasComponent<T extends IComponent>(entityId: number, componentClass: ComponentConstructor<T>): boolean {
        return this.entityComponents.hasComponent(entityId, componentClass);
    }

    /** 返回拥有指定组件组合的实体列表 */
    getEntitiesWith(components: ComponentConstructor<IComponent>[]): number[] {
        const archetypes = this.archetypeManager.queryArchetypes(components);
        const result: number[] = [];
        for (const arch of archetypes) {
            result.push(...arch.entities);
        }
        return result;
    }
   
    getEntityIdByComponent(component: IComponent) {
        return this.entityComponents.getEntityIdByComponent(component);
    }
}


