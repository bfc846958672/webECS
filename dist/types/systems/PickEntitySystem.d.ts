import { IAABB } from '../interface/AABB.ts';
import { ISystem } from '../ecs/System.ts';
import { BoundingBoxProcess } from './AABB/aabbProcess.ts';
import { RenderableHitProcess } from './AABB/hitprocess.ts';
import { TransformProcess } from './TransformProcess.ts';
export declare class PickEntitySystem extends ISystem {
    ctx: CanvasRenderingContext2D;
    eventEntities: number[];
    bboxProcess: BoundingBoxProcess;
    transformProcess: TransformProcess;
    RenderableHitProcess: RenderableHitProcess;
    protected onInit(): void;
    hitAABB(x: number, y: number, box: IAABB): boolean;
    hitRenderable(x: number, y: number, entityId: number): boolean;
    hitTree(x: number, y: number): number | null;
    pickEntityAt(x: number, y: number): number | null;
    updateTree(): void;
    update(): void;
}
