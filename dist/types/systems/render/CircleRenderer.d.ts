import { ECS } from '../../ecs/ECS.ts';
import { IProcess } from '../../ecs/interface/IRender.ts';
import { ISystem } from '../../ecs/System.ts';
/**
 * 渲染器：负责绘制 Circle 组件
 * Canvas API 原生渲染，startAngle/endAngle/clockwise 原样使用
 */
export declare class CircleRenderer implements IProcess {
    match(ecs: ECS, entityId: number): boolean;
    exec(system: ISystem, entityId: number): void;
}
