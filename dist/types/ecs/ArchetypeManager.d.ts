import { Archetype } from './Archetype.ts';
import { IComponent } from './interface/IComponent.ts';
export declare class ArchetypeManager {
    private entityArchetypeMap;
    private archetypeMap;
    /** 生成组件组合 key */
    private getComponentKey;
    /** 获取或创建 Archetype */
    getOrCreateArchetype(comps: Map<Function, IComponent>): Archetype;
    /** 迁移实体到新的 Archetype */
    migrateEntity(entityId: number, comps: Map<Function, IComponent>): void;
    /** 获取实体对应的 Archetype */
    getArchetypeOf(entityId: number): Archetype | undefined;
    /** 查询 Archetypes */
    queryArchetypes(componentClasses: Function[]): Archetype[];
    /** 删除实体 */
    removeEntity(entityId: number): void;
}
