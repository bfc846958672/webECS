/**
 * ComponentManager - 类型安全版
 * 用泛型约束组件类型，移除 any
 */
export declare class ComponentManager {
    private componentsByType;
    /** 添加组件 */
    addComponent<T extends object>(entityId: number, component: T): void;
    /** 移除组件 */
    removeComponent<T extends object>(entityId: number, componentClass: new (...args: any[]) => T): void;
    /** 获取组件 */
    getComponent<T extends object>(entityId: number, componentClass: new (...args: any[]) => T): T | undefined;
    /** 获取拥有该组件的所有实体 */
    getEntitiesWithComponent<T extends object>(componentClass: new (...args: any[]) => T): number[];
    /** 检查实体是否有该组件 */
    hasComponent<T extends object>(entityId: number, componentClass: new (...args: any[]) => T): boolean;
}
