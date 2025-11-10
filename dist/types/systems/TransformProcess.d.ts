import { ECS } from '../ecs/ECS.ts';
import { IProcess } from '../ecs/interface/IRender.ts';
import { ISystem } from '../ecs/System.ts';
export declare class TransformProcess implements IProcess<{
    dirty: boolean;
}, {
    dirty: boolean;
}> {
    match(ecs: ECS, entityId: number): boolean;
    /**
     * 执行渲染逻辑
     */
    exec(system: ISystem, entityId: number, _parentEntityId: number | null, context: {
        dirty: boolean;
    }, parentContext: {
        dirty: boolean;
    } | null): void;
    updateEntityMatrix(system: ISystem, entityId: number): void;
}
