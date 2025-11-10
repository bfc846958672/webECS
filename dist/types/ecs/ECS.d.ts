import { EntityManager } from './EntityManager.ts';
import { ComponentManager } from './ComponentManager.ts';
import { ISystem, ISystemClass } from './System.ts';
import { IComponent, ComponentConstructor } from './interface/IComponent.ts';
import { ECSEvent } from './ECSEvent.ts';
export declare class ECS {
    #private;
    canvas: HTMLCanvasElement;
    event: ECSEvent<import('./ECSEvent.ts').ECSEventMap>;
    entities: EntityManager;
    components: ComponentManager;
    private systems;
    ComponentRegistry: Map<string, Function>;
    private entityComponents;
    private archetypeManager;
    addSystem(system: ISystem): void;
    getSystem<T extends ISystem>(systemClass: ISystemClass<T>): T;
    hasEntity(entityId: number): boolean;
    createEntity(): number;
    removeEntity(entityId: number): void;
    update(delta: number): void;
    addComponent(entityId: number, component: IComponent): void;
    removeComponent(entityId: number, componentClass: ComponentConstructor<IComponent>): void;
    getComponent<T extends IComponent>(entityId: number, componentClass: ComponentConstructor<T>): T | undefined;
    getComponents(entityId: number): Map<new (engine: import('./Engine.ts').Engine | null, props?: Partial<IComponent> | undefined) => IComponent, IComponent> | undefined;
    hasComponent<T extends IComponent>(entityId: number, componentClass: ComponentConstructor<T>): boolean;
    /** 返回拥有指定组件组合的实体列表 */
    getEntitiesWith(components: ComponentConstructor<IComponent>[]): number[];
    getEntityIdByComponent(component: IComponent): number | undefined;
}
