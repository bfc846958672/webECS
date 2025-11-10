import { IComponent } from '../../ecs/interface/IComponent';
import { RenderComponent } from './RenderComponent.ts';
import { Engine } from '../../ecs/Engine.ts';
/**
 * Circle（兼容椭圆与圆弧）
 * 若 radiusY 与 radius 相同，则为圆形；否则为椭圆。
 * 可通过 startAngle、endAngle 和 clockwise 绘制圆弧。
 */
export declare class Circle extends RenderComponent implements IComponent {
    render: boolean;
    /** 主半径（x 方向） */
    radius: number;
    /** 次半径（y 方向，默认为 radius） */
    radiusY: number;
    /** 填充颜色 */
    fillStyle: string;
    /** 描边颜色 */
    strokeStyle?: string;
    /** 描边宽度 */
    lineWidth: number;
    /** 透明度 */
    alpha: number;
    /** 椭圆旋转角度（弧度） */
    rotation: number;
    /** 圆弧起始角度（弧度，0 = 3点钟方向） */
    startAngle: number;
    /** 圆弧结束角度（弧度） */
    endAngle: number;
    /** 是否顺时针绘制圆弧（默认为 true） */
    clockwise: boolean;
    constructor(engine: Engine | null, { radius, radiusY, // 可选，不传时自动与 radius 相等
    fillStyle, strokeStyle, lineWidth, alpha, rotation, render, startAngle, endAngle, clockwise, }?: Partial<Circle>);
    /** 是否是圆形（辅助判断） */
    get isCircle(): boolean;
    /** 是否是完整圆或完整椭圆（start = 0, end = 2π） */
    get isFullCircle(): boolean;
}
