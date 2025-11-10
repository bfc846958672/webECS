import { IComponent } from '../../ecs/interface/IComponent';
import { RenderComponent } from './RenderComponent';
import { Engine } from '../../ecs/Engine';
export declare class Curve extends RenderComponent implements IComponent {
    start: [number, number];
    cp1: [number, number];
    cp2?: [number, number];
    end: [number, number];
    strokeStyle: string;
    lineWidth: number;
    alpha: number;
    render: boolean;
    constructor(engine: Engine | null, opts?: Partial<Curve>);
}
