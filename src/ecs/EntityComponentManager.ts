import { RenderComponent } from "../components/render/RenderComponent.ts";
import { IComponent, ComponentConstructor } from "../components/IComponent.ts";
type IComponentClass = ComponentConstructor<IComponent>;
export class EntityComponentManager {
    // 保证只有一个渲染组件
    private renderMap = new Map<number, IComponentClass>();
    // 实体 ==> 组件映射表
    private map = new Map<number, Map<IComponentClass, IComponent>>();
    // 新增：组件实例 ==> 实体映射
    private componentEntityMap = new Map<IComponent, number>();
    getComponentsMap(entityId: number): Map<IComponentClass, IComponent> | undefined {
        return this.map.get(entityId);
    }
    getRenderComponent(entityId: number): RenderComponent | undefined {
        const renderClass = this.renderMap.get(entityId);
        if (renderClass) {
            return this.map.get(entityId)!.get(renderClass) as RenderComponent;
        }
        return undefined;
    }
    isRenderComponent(component: IComponent) {
        return component instanceof RenderComponent;
    }
    addComponent(entityId: number, component: IComponent) {
        if (!this.map.has(entityId)) {
            this.map.set(entityId, new Map());
        }
        const components = this.map.get(entityId)!;
        const componentClass = component.constructor as IComponentClass;

        // 如果是渲染组件，保证唯一
        if (this.isRenderComponent(component)) {
            const renderClass = this.renderMap.get(entityId);
            if (renderClass) {
                const oldComp = components.get(renderClass);
                if (oldComp) this.componentEntityMap.delete(oldComp); //  删除旧映射
                components.delete(renderClass);
            }
            this.renderMap.set(entityId, componentClass);
        }

        components.set(componentClass, component);
        this.componentEntityMap.set(component, entityId); // 新增映射
    }

    removeEntity(entityId: number) {
        const comps = this.map.get(entityId);
        if (comps) {
            for (const comp of comps.values()) {
                this.componentEntityMap.delete(comp);
            }
        }
        this.map.delete(entityId);
        this.renderMap.delete(entityId);
    }

    removeComponent(entityId: number, componentClass: IComponentClass) {
        if (componentClass === RenderComponent) {
            this.renderMap.delete(entityId);
        }
        const comps = this.map.get(entityId);
        if (!comps) return;

        const instance = comps.get(componentClass);
        if (instance) this.componentEntityMap.delete(instance); // 删除映射
        comps.delete(componentClass);

        if (comps.size === 0) {
            this.map.delete(entityId);
        }
    }

    getComponent<T extends IComponent>(entityId: number, componentClass: ComponentConstructor<T>): T | undefined {
        return this.map.get(entityId)?.get(componentClass) as T | undefined;
    }

    getComponents(entityId: number) {
        return this.map.get(entityId);
    }

    hasComponent(entityId: number, componentClass: IComponentClass): boolean {
        return this.map.get(entityId)?.has(componentClass) ?? false;
    }

    /** 新增方法：根据组件实例获取所属实体ID */
    getEntityIdByComponent(component: IComponent) {
        return this.componentEntityMap.get(component);
    }
}
