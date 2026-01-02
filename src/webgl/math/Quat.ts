import * as QuatFunc from './functions/QuatFunc';
import { Euler } from './Euler';

export class Quat extends Array<number> {
    onChange: () => void;
    _target: this;

    constructor(x = 0, y = 0, z = 0, w = 1) {
        super(x, y, z, w);
        this.onChange = () => {};

        // Keep reference to proxy target to avoid triggering onChange internally
        this._target = this;

        // Return a proxy to trigger onChange when array elements are edited directly
        const triggerProps = ['0', '1', '2', '3'];
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

    get w(): number {
        return this[3];
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

    set w(v: number) {
        this._target[3] = v;
        this.onChange();
    }

    identity(): this {
        QuatFunc.identity(this._target);
        this.onChange();
        return this;
    }

    set(x: number | number[], y?: number, z?: number, w?: number): this {
        if (Array.isArray(x)) return this.copy(x);
        QuatFunc.set(this._target, x, y as number, z as number, w as number);
        this.onChange();
        return this;
    }

    rotateX(a: number): this {
        QuatFunc.rotateX(this._target, this._target, a);
        this.onChange();
        return this;
    }

    rotateY(a: number): this {
        QuatFunc.rotateY(this._target, this._target, a);
        this.onChange();
        return this;
    }

    rotateZ(a: number): this {
        QuatFunc.rotateZ(this._target, this._target, a);
        this.onChange();
        return this;
    }

    inverse(q: Quat = this._target): this {
        QuatFunc.invert(this._target, q);
        this.onChange();
        return this;
    }

    conjugate(q: Quat = this._target): this {
        QuatFunc.conjugate(this._target, q);
        this.onChange();
        return this;
    }

    copy(q: Quat | number[]): this {
        QuatFunc.copy(this._target, q);
        this.onChange();
        return this;
    }

    normalize(q: Quat = this._target): this {
        QuatFunc.normalize(this._target, q);
        this.onChange();
        return this;
    }

    multiply(qA: Quat, qB?: Quat): this {
        if (qB) {
            QuatFunc.multiply(this._target, qA, qB);
        } else {
            QuatFunc.multiply(this._target, this._target, qA);
        }
        this.onChange();
        return this;
    }

    dot(v: Quat): number {
        return QuatFunc.dot(this._target, v);
    }

    fromMatrix3(matrix3: Float32Array): this {
        QuatFunc.fromMat3(this._target, matrix3);
        this.onChange();
        return this;
    }

    fromEuler(euler: Euler, isInternal?: boolean): this {
        QuatFunc.fromEuler(this._target, euler, euler.order);
        // Avoid infinite recursion
        if (!isInternal) this.onChange();
        return this;
    }

    fromAxisAngle(axis: Float32Array, a: number): this {
        QuatFunc.setAxisAngle(this._target, axis, a);
        this.onChange();
        return this;
    }

    slerp(q: Quat, t: number): this {
        QuatFunc.slerp(this._target, this._target, q, t);
        this.onChange();
        return this;
    }

    fromArray(a: number[], o = 0): this {
        this._target[0] = a[o];
        this._target[1] = a[o + 1];
        this._target[2] = a[o + 2];
        this._target[3] = a[o + 3];
        this.onChange();
        return this;
    }

    toArray(a: number[] = [], o = 0): number[] {
        a[o] = this[0];
        a[o + 1] = this[1];
        a[o + 2] = this[2];
        a[o + 3] = this[3];
        return a;
    }
}