export declare class EntityManager {
    private nextId;
    private entities;
    /** 创建实体 */
    createEntity(): number;
    /** 删除实体 */
    removeEntity(id: number): void;
    /** 是否存在 */
    hasEntity(id: number): boolean;
    /** 获取所有实体 */
    getAllEntities(): number[];
}
