import { ECS } from '../../ecs/ECS.ts';
import { IProcess } from '../../ecs/interface/IRender.ts';
import { ISystem } from '../../ecs/System.ts';
import { IAABB } from '../../interface/AABB.ts';
import { IShareContext } from '../../interface/System.ts';
export declare class BoundingBoxProcess implements IProcess {
    match(_ecs: ECS, _entityId: number): boolean;
    private strategies;
    none: () => IAABB;
    constructor();
    compute(ecs: ECS, entityId: number): IAABB;
    exec(system: ISystem, entityId: number, parentEntityId: number | null, context: IShareContext, parentContext: IShareContext | null): void;
    merge(aabb: IAABB, bbox: IAABB): void;
}
