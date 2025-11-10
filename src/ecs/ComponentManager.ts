/**
 * ComponentManager - 类型安全版
 * 用泛型约束组件类型，移除 any
 */

export class ComponentManager {
    // 每种组件类型对应一个 Map<entityId, component>
    private componentsByType = new Map<Function, Map<number, unknown>>();

    /** 添加组件 */
    addComponent<T extends object>(entityId: number, component: T): void {
        const type = component.constructor;
        let store = this.componentsByType.get(type);
        if (!store) {
            store = new Map<number, T>();
            this.componentsByType.set(type, store);
        }
        (store as Map<number, T>).set(entityId, component);
    }

    /** 移除组件 */
    removeComponent<T extends object>(entityId: number, componentClass: new (...args: any[]) => T): void {
        const store = this.componentsByType.get(componentClass);
        (store as Map<number, T> | undefined)?.delete(entityId);
    }

    /** 获取组件 */
    getComponent<T extends object>(entityId: number, componentClass: new (...args: any[]) => T): T | undefined {
        const store = this.componentsByType.get(componentClass);
        return (store as Map<number, T> | undefined)?.get(entityId);
    }

    /** 获取拥有该组件的所有实体 */
    getEntitiesWithComponent<T extends object>(componentClass: new (...args: any[]) => T): number[] {
        const store = this.componentsByType.get(componentClass);
        return store ? Array.from((store as Map<number, T>).keys()) : [];
    }

    /** 检查实体是否有该组件 */
    hasComponent<T extends object>(entityId: number, componentClass: new (...args: any[]) => T): boolean {
        const store = this.componentsByType.get(componentClass);
        return (store as Map<number, T> | undefined)?.has(entityId) ?? false;
    }
}
