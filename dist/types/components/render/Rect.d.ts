import { IComponent } from '../../ecs/interface/IComponent';
import { RenderComponent } from './RenderComponent.ts';
import { Engine } from '../../ecs/Engine.ts';
/**
 * 矩形组件，仅存储渲染数据
 * 不包含绘制逻辑，系统负责渲染
 */
export declare class Rect extends RenderComponent implements IComponent {
    width: number;
    height: number;
    render: boolean;
    fillStyle: string;
    strokeStyle?: string;
    lineWidth: number;
    alpha: number;
    radius: number;
    constructor(engine: Engine | null, { width, height, fillStyle, strokeStyle, lineWidth, alpha, render, radius, }?: Partial<Rect>);
}
