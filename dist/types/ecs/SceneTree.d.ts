export declare class SceneNode {
    entityId: number;
    parent: SceneNode | null;
    children: SceneNode[];
    constructor(entityId: number);
    /**
     * 添加子节点
     * @param child SceneNode
     */
    addChild(child: SceneNode): void;
    removeChild(child: SceneNode): void;
    /**
     * 获取所有后代节点，深度优先顺序
     */
    getDescendants(): SceneNode[];
}
/**
 * 场景树管理
 * - 使用单一根节点 rootNode
 * - 所有实体挂在根节点下或其子节点下
 */
export declare class SceneTree {
    rootEntityId: number;
    /** 节点映射: entityId -> SceneNode */
    private nodes;
    /** 隐形根节点 */
    readonly root: SceneNode;
    constructor(rootEntityId: number);
    /**
     * 添加节点到场景树
     * @param entityId 实体ID
     * @param parentId 可选父节点ID, 默认挂到 rootNode
     */
    add(entityId: number, parentId?: number): void;
    remove(entityId: number): void;
    /**
     * 获取节点
     */
    get(entityId: number): SceneNode;
    has(entityId: number): boolean;
    /**
     * 删除节点（递归删除子节点）
     */
    destory(entityId: number): void;
    /**
     * 获取指定节点的父节点
     */
    getParent(entityId: number): SceneNode | null;
    /**
     * 获取场景树中所有节点
     */
    all(): SceneNode[];
    /** 清空所有非根节点 */
    clear(): void;
    caches: Array<{
        entityId: number;
        parentEntityId: number | null;
    }>;
    version: number;
    _version: number;
    forEach<T = unknown>(callback: (entityId: number, parentEntityId: number | null, context: T, parentContext: T | null) => void, rootContext?: T, reverse?: boolean): void;
    forEachCaches<T = unknown>(callback: (entityId: number, parentEntityId: number | null, context: T, parentContext: Readonly<T> | null) => void, rootContext?: T, reverse?: boolean): void;
    build(): [number, number | null][];
    displayList: Array<[number, number | null]>;
}
