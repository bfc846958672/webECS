import { Archetype } from "./Archetype.ts";
import { IComponent } from "./interface/IComponent.ts";

export class ArchetypeManager {
    private entityArchetypeMap: Map<number, Archetype> = new Map();
    private archetypeMap: Map<string, Archetype> = new Map();

    /** 生成组件组合 key */
    private getComponentKey(components: Set<Function>): string {
        return Array.from(components).map(c => c.name).sort().join("|");
    }

    /** 获取或创建 Archetype */
    getOrCreateArchetype(comps: Map<Function, IComponent>): Archetype {
        const key = this.getComponentKey(new Set(comps.keys()));
        let archetype = this.archetypeMap.get(key);
        if (!archetype) {
            archetype = new Archetype(new Set(comps.keys()));
            this.archetypeMap.set(key, archetype);
        }
        return archetype;
    }

    /** 迁移实体到新的 Archetype */
    migrateEntity(entityId: number, comps: Map<Function, IComponent>) {
        const oldArchetype = this.entityArchetypeMap.get(entityId);
        if (oldArchetype) oldArchetype.remove(entityId);

        const newArchetype = this.getOrCreateArchetype(comps);
        newArchetype.add(entityId, comps);
        this.entityArchetypeMap.set(entityId, newArchetype);
    }

    /** 获取实体对应的 Archetype */
    getArchetypeOf(entityId: number): Archetype | undefined {
        return this.entityArchetypeMap.get(entityId);
    }

    /** 查询 Archetypes */
    queryArchetypes(componentClasses: Function[]): Archetype[] {
        const key = this.getComponentKey(new Set(componentClasses));
        const archetype = this.archetypeMap.get(key);
        return archetype ? [archetype] : [];
    }

    /** 删除实体 */
    removeEntity(entityId: number) {
        const archetype = this.entityArchetypeMap.get(entityId);
        if (archetype) archetype.remove(entityId);
        this.entityArchetypeMap.delete(entityId);
    }
}
