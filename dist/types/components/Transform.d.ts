import { IComponent } from '../ecs/interface/IComponent';
import { mat3 } from 'gl-matrix';
import { Engine } from '../ecs/Engine.ts';
export declare class Transform implements IComponent {
    #private;
    localMatrix: mat3;
    worldMatrix: mat3;
    dirty: boolean;
    constructor(engine: Engine | null, params?: Partial<Transform>);
    get x(): number;
    set x(v: number);
    get y(): number;
    set y(v: number);
    get scaleX(): number;
    set scaleX(v: number);
    get scaleY(): number;
    set scaleY(v: number);
    get rotation(): number;
    set rotation(v: number);
    get skewX(): number;
    set skewX(v: number);
    get skewY(): number;
    set skewY(v: number);
    get pivotX(): number;
    set pivotX(v: number);
    get pivotY(): number;
    set pivotY(v: number);
}
