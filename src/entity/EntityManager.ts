export class EntityManager {
    private nextId: number = 0;
    private entities: Set<number> = new Set();

    /** 创建实体 */
    create(): number {
        const id = this.nextId++;
        this.entities.add(id);
        return id;
    }

    /** 删除实体 */
    remove(id: number) {
        this.entities.delete(id);
    }

    /** 是否存在 */
    has(id: number): boolean {
        return this.entities.has(id);
    }

    /** 获取所有实体 */
    all(): number[] {
        return Array.from(this.entities);
    }
}

export const entityManager = new EntityManager();