import { IComponent } from '../../ecs/interface/IComponent';
import { RenderComponent } from './RenderComponent.ts';
import { Engine } from '../../ecs/Engine.ts';
/**
 * 图片组件，仅存储渲染数据
 * 不包含绘制逻辑，系统负责渲染
 */
export declare class Image extends RenderComponent implements IComponent {
    #private;
    alpha: number;
    render: boolean;
    clip?: [number, number, number, number];
    constructor(engine: Engine | null, params?: Partial<Image>);
    get bitmap(): ImageBitmap | null;
    set bitmap(value: ImageBitmap | null);
    get width(): number;
    set width(value: number);
    get height(): number;
    set height(value: number);
}
