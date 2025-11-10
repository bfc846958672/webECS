import { ECS } from '../../ecs/ECS.ts';
import { IProcess } from '../../ecs/interface/IRender.ts';
import { ISystem } from '../../ecs/System.ts';
import { IShareContext } from '../../interface/System.ts';
export declare class RenderableHitProcess implements IProcess {
    match(_ecs: ECS, _entityId: number): boolean;
    private strategies;
    constructor();
    hit(ecs: ECS, entityId: number, x: number, y: number): boolean;
    exec(_system: ISystem, _entityId: number, _parentEntityId: number | null, _context: IShareContext, _parentContext: unknown): void;
}
