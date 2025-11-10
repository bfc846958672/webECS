export interface IEngine {
    start: () => void;
    stop: () => void;
    add: (entityId: number, parentId?: number) => void;
    setParent: (parentId: number, childId: number) => void;
    remove: (entityId: number) => void;
    clear: () => void;
}
