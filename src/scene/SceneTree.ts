
// SceneNode.ts
export class SceneNode {
    public parent: SceneNode | null = null;
    public children: SceneNode[] = [];
    constructor(public entityId: number) { }

    /**
     * 添加子节点
     * @param child SceneNode
     */
    addChild(child: SceneNode) {
        if (child.parent) {
            // 从原父节点移除
            const idx = child.parent.children.indexOf(child);
            if (idx !== -1) child.parent.children.splice(idx, 1);
        }
        child.parent = this;
        this.children.push(child);
    }
    removeChild(child: SceneNode) {
        const index = this.children.indexOf(child);
        if (index === -1) {
            throw new Error(`Cannot remove child: entity ${child.entityId} is not a child of entity ${this.entityId}`);
        }
        this.children.splice(index, 1);
        child.parent = null;
    }

    /**
     * 获取所有后代节点，深度优先顺序
     */
    getDescendants(): SceneNode[] {
        const result: SceneNode[] = [];
        for (const child of this.children) {
            result.push(child);
            result.push(...child.getDescendants());
        }
        return result;
    }
}

/**
 * 场景树管理
 * - 使用单一根节点 rootNode
 * - 所有实体挂在根节点下或其子节点下
 */
export class SceneTree {
    /** 节点映射: entityId -> SceneNode */
    private nodes: Map<number, SceneNode> = new Map();
    /** 隐形根节点 */
    readonly root: SceneNode;

    constructor(public rootEntityId: number) {
        this.root = new SceneNode(rootEntityId);

        this.nodes.set(rootEntityId, this.root);

        // 初始化 displayList，确保只存在 root 时也能遍历到根节点
        this.displayList = this.build();
    }

    /**
     * 添加节点到场景树
     * @param entityId 实体ID
     * @param parentId 可选父节点ID, 默认挂到 rootNode
     */
    add(entityId: number, parentId?: number) {
        this._version++;
        if (!this.nodes.has(entityId)) { this.nodes.set(entityId, new SceneNode(entityId)); }
        if (parentId === undefined) parentId = this.rootEntityId;

        const node = this.nodes.get(entityId)!;
        const parentNode = this.nodes.get(parentId)!;
        parentNode.addChild(node);
        this.displayList = this.build();
    }

    /**
     * 重新设置节点父子关系（会刷新 displayList）
     */
    reparent(entityId: number, parentId?: number) {
        this._version++;
        if (!this.nodes.has(entityId)) this.nodes.set(entityId, new SceneNode(entityId));
        if (parentId === undefined) parentId = this.rootEntityId;
        const parentNode = this.nodes.get(parentId);
        if (!parentNode) throw new Error(`reparent fail, Parent entity ${parentId} not exists`);
        const node = this.nodes.get(entityId)!;
        parentNode.addChild(node);
        this.displayList = this.build();
    }
    remove(entityId: number) {
        if (entityId === this.rootEntityId) {
            throw new Error("Cannot remove root node");
        }
        this._version++;
        const node = this.nodes.get(entityId);
        if (!node) throw new Error(`remove fail, Entity ${entityId} not found`);
        if (node.parent) {
            node.parent.removeChild(node);
        }
        this.displayList = this.build();
    }
    /**
     * 获取节点
     */
    get(entityId: number): SceneNode {
        if (!this.nodes.has(entityId)) {
            this.nodes.set(entityId, new SceneNode(entityId));
        }
        return this.nodes.get(entityId)!;
    }
    has(entityId: number): boolean {
        return this.nodes.has(entityId);
    }
    /**
     * 删除节点（递归删除子节点）
     */
    destory(entityId: number) {
        this._version++;
        const node = this.nodes.get(entityId);
        if (!node) throw new Error(`destory fail, Entity ${entityId} not found`);

        // 递归删除子节点
        const descendants = node.getDescendants();
        for (const desc of descendants) {
            this.nodes.delete(desc.entityId);
        }

        // 从父节点 children 中移除自己
        if (node.parent) {
            const index = node.parent.children.indexOf(node);
            if (index !== -1) node.parent.children.splice(index, 1);
        }

        this.nodes.delete(entityId);
        this.displayList = this.build();
    }

    /**
     * 获取指定节点的父节点
     */
    getParent(entityId: number): SceneNode | null {
        const node = this.nodes.get(entityId);
        return node?.parent || null;
    }

    /**
     * 获取场景树中所有节点
     */
    all(): SceneNode[] {
        return Array.from(this.nodes.values());
    }
    /** 清空所有非根节点 */
    clear() {
        this._version++;
        // 复制 rootNode.children 避免遍历删除时修改数组
        for (const child of this.root.children.slice()) {
            this.destory(child.entityId);
        }
        this.displayList = this.build();
    }

    caches: Array<{ entityId: number; parentEntityId: number | null }> = [];
    version = -1
    _version = 0
    forEach<T = unknown>(
        callback: (entityId: number, parentEntityId: number | null, context: T, parentContext: T | null) => void,
        rootContext?: T,
        reverse = false
    ) {
        if (this.version === this._version && this.caches.length > 0) {
            this.forEachCaches(callback, rootContext, reverse);
            return;
        }
        const newCaches: Array<{ entityId: number; parentEntityId: number | null }> = [];

        const map = new Map<number, T>();
        map.set(this.root.entityId, rootContext ?? ({} as T));
        const visit = (node: SceneNode) => {
            const parentEntityId = node.parent?.entityId ?? null;
            const parentContext = parentEntityId != null ? map.get(parentEntityId)! : null;
            if (!map.has(node.entityId)) map.set(node.entityId, {} as T);
            const context = map.get(node.entityId)!;
            newCaches.push({ entityId: node.entityId, parentEntityId });

            if (!reverse) {
                callback(node.entityId, parentEntityId, context, parentContext);
                for (let i = 0; i < node.children.length; i++) {
                    visit(node.children[i]);
                }
            } else {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    visit(node.children[i]);
                }
                callback(node.entityId, parentEntityId, context, parentContext);
            }

        };
        visit(this.root);
        this.caches = newCaches;
        this.version = this._version;
    }
    forEachCaches<T = unknown>(
        callback: (entityId: number, parentEntityId: number | null, context: T, parentContext: Readonly<T> | null) => void,
        rootContext?: T,
        reverse = false
    ) {
        const map = new Map<number, T>();
        map.set(this.root.entityId, rootContext ?? ({} as T));
        const loop = (entityId: number, parentEntityId: number | null) => {
            const context = map.get(entityId) ?? ({} as T);
            map.set(entityId, context);
            const parentContext = parentEntityId != null ? map.get(parentEntityId)! : null;
            callback(entityId, parentEntityId, context, parentContext ? parentContext as T : null);
        }
        if (reverse) {
            for (let i = this.caches.length - 1; i >= 0; i--) {
                const { entityId, parentEntityId } = this.caches[i];
                loop(entityId, parentEntityId);
            }
        } else {
            for (let i = 0; i < this.caches.length; i++) {
                const { entityId, parentEntityId } = this.caches[i];
                loop(entityId, parentEntityId);
            }
        }
    }
    build() {
        const result: Array<[number, number | null]> = [];
        function visit(node: SceneNode, parent: SceneNode | null) {
            result.push([node.entityId, parent?.entityId ?? null]);
            if (node.children) {
                for (const child of node.children) { visit(child, node); }
            }
        }
        visit(this.root, null);
        return result;
    }
    displayList: Array<[number, number | null]> = []
}
// // 前序遍历：先访问当前节点，再递归遍历每个子节点
// function visit(node, parent) {
//     // 更新当前节点矩阵
//     calcMatrix(node);
//     // 渲染当前节点
//     render(node)
//     const childrenResult = []
//     for (const child of node.children) {
//         const result = visit(child, parent);
//         childrenResult.push(result);
//     }
//     // 根据自身和子节点执行 计算包围盒
//     calcBox(node, childrenResult);
//     return result;
// }