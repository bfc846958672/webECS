import { ECS } from '../../ecs/ECS.ts';
import { IProcess } from '../../ecs/interface/IRender.ts';
import { ISystem } from '../../ecs/System.ts';
/**
 * 渲染器：负责绘制 Rect 组件（支持圆角矩形）
 */
export declare class RectRenderer implements IProcess {
    match(ecs: ECS, entityId: number): boolean;
    exec(system: ISystem, entityId: number): void;
}
