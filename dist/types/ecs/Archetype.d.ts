import { IComponent } from './interface/IComponent.ts';
/**
 * Archetype：管理一组固定组件组合的实体集合
 * 只负责列式存储和实体的增删
 */
export declare class Archetype {
    /** 实体ID数组 */
    entities: number[];
    /** 组件类型集合（固定） */
    componentTypes: Set<Function>;
    /** 列式存储：组件类型 -> 对应组件实例数组 */
    columns: Map<Function, IComponent[]>;
    constructor(componentTypes: Set<Function>);
    /**
     * 添加实体及对应组件实例
     * @param entityId 实体ID
     * @param components Map<组件类, 组件实例>，必须包含该 Archetype 的所有组件
     */
    add(entityId: number, components: Map<Function, IComponent>): void;
    /**
     * 从 Archetype 移除实体及对应组件实例
     */
    remove(entityId: number): void;
    /**
     * 判断 Archetype 是否包含指定组件集合（子集匹配）
     */
    matches(queryComponents: Function[]): boolean;
    /**
     * 获取实体对应组件实例
     */
    getComponent<T extends IComponent>(entityId: number, componentClass: Function): T | undefined;
}
