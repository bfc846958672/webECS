import { ECS } from '../../ecs/ECS.ts';
import { IProcess } from '../../ecs/interface/IRender.ts';
import { ISystem } from '../../ecs/System.ts';
/**
 * 渲染器：负责绘制 Curve 组件（支持二次和三次贝塞尔曲线）
 */
export declare class CurveRenderer implements IProcess {
    match(ecs: ECS, entityId: number): boolean;
    exec(system: ISystem, entityId: number): void;
}
