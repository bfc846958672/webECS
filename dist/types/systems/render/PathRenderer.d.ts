import { ECS } from '../../ecs/ECS.ts';
import { IProcess } from '../../ecs/interface/IRender.ts';
import { ISystem } from '../../ecs/System.ts';
/**
 * 渲染器：负责绘制 Path 组件（支持 moveTo/lineTo/曲线/arc/arcTo/ellipse）
 */
export declare class PathRenderer implements IProcess {
    match(ecs: ECS, entityId: number): boolean;
    /**
     * 执行渲染逻辑
     */
    exec(system: ISystem, entityId: number): void;
}
