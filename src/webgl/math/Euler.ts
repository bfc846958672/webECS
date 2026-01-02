import * as EulerFunc from './functions/EulerFunc';
import { Mat4 } from './Mat4';
import { Quat } from './Quat';

const tmpMat4 = /* @__PURE__ */ new Mat4();

export class Euler extends Array<number> {
    order: string;
    onChange: () => void;
    _target: this;

    constructor(x = 0, y = x, z = x, order: 'XYZ' | 'YXZ' | 'ZXY' | 'XZY' | 'YZX' | 'ZYX' = 'YXZ') {
        super(x, y, z);
        this.order = order;
        this.onChange = () => {};

        // Keep reference to proxy target to avoid triggering onChange internally
        this._target = this;

        // Return a proxy to trigger onChange when array elements are edited directly
        const triggerProps = ['0', '1', '2'];
        const proxy = new Proxy(this, {
            set(target, property, value): boolean {
                const success = Reflect.set(target, property, value);
                if (success && triggerProps.includes(property as string)) target.onChange();
                return success;
            },
        });

        return proxy;
    }

    get x(): number {
        return this[0];
    }

    get y(): number {
        return this[1];
    }

    get z(): number {
        return this[2];
    }

    set x(v: number) {
        this._target[0] = v;
        this.onChange();
    }

    set y(v: number) {
        this._target[1] = v;
        this.onChange();
    }

    set z(v: number) {
        this._target[2] = v;
        this.onChange();
    }

    set(x: number | number[]): this {
        if (Array.isArray(x)) return this.copy(x);
        this._target[0] = x;
        this._target[1] = x;
        this._target[2] = x;
        this.onChange();
        return this;
    }
    
    setxyz(x: number, y: number, z: number): this {
        this._target[0] = x;
        this._target[1] = y;
        this._target[2] = z;
        this.onChange();
        return this;
    }

    copy(v: Euler | number[]): this {
        this._target[0] = v[0];
        this._target[1] = v[1];
        this._target[2] = v[2];
        this.onChange();
        return this;
    }

    reorder(order: 'XYZ' | 'YXZ' | 'ZXY' | 'XZY' | 'YZX' | 'ZYX'): this {
        this._target.order = order;
        this.onChange();
        return this;
    }

    fromRotationMatrix(m: Mat4, order: string = this.order): this {
        EulerFunc.fromRotationMatrix(this._target, m, order);
        this.onChange();
        return this;
    }

    fromQuaternion(q: Quat, order: string = this.order, isInternal?: boolean): this {
        tmpMat4.fromQuaternion(q);
        this._target.fromRotationMatrix(tmpMat4, order);
        // Avoid infinite recursion
        if (!isInternal) this.onChange();
        return this;
    }

    fromArray(a: number[], o = 0): this {
        this._target[0] = a[o];
        this._target[1] = a[o + 1];
        this._target[2] = a[o + 2];
        return this;
    }

    toArray(a: number[] = [], o = 0): number[] {
        a[o] = this[0];
        a[o + 1] = this[1];
        a[o + 2] = this[2];
        return a;
    }
}