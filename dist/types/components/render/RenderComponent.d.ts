import { IComponent } from '../../ecs/interface/IComponent';
import { Engine } from '../../ecs/Engine.ts';
/**
 * 渲染组件，保证实体仅有一个渲染组件
 */
export declare class RenderComponent implements IComponent {
    #private;
    constructor(engine: Engine | null, {}?: Partial<RenderComponent>);
}
