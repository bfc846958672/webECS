import { ECS } from '../../ecs/ECS.ts';
import { IProcess } from '../../ecs/interface/IRender.ts';
import { ISystem } from '../../ecs/System.ts';
/**
 * 渲染器：负责绘制 Image 组件
 */
export declare class ImageRenderer implements IProcess {
    match(ecs: ECS, entityId: number): boolean;
    exec(system: ISystem, entityId: number): void;
}
