import { RenderComponent } from '../components/render/RenderComponent.ts';
import { IComponent, ComponentConstructor } from './interface/IComponent.ts';
type IComponentClass = ComponentConstructor<IComponent>;
export declare class EntityComponentManager {
    private renderMap;
    private map;
    private componentEntityMap;
    getComponentsMap(entityId: number): Map<IComponentClass, IComponent> | undefined;
    isRenderComponent(component: IComponent): component is RenderComponent;
    addComponent(entityId: number, component: IComponent): void;
    removeEntity(entityId: number): void;
    removeComponent(entityId: number, componentClass: IComponentClass): void;
    getComponent<T extends IComponent>(entityId: number, componentClass: ComponentConstructor<T>): T | undefined;
    getComponents(entityId: number): Map<IComponentClass, IComponent> | undefined;
    hasComponent(entityId: number, componentClass: IComponentClass): boolean;
    /** 新增方法：根据组件实例获取所属实体ID */
    getEntityIdByComponent(component: IComponent): number | undefined;
}
export {};
