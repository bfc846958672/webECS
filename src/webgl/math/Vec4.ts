import * as Vec4Func from './functions/Vec4Func';

export class Vec4 extends Array<number> {
    constructor(x: number = 0, y: number = x, z: number = x, w: number = x) {
        super(x, y, z, w);
        return this;
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
        this[0] = v;
    }

    set y(v: number) {
        this[1] = v;
    }

    set z(v: number) {
        this[2] = v;
    }

    set w(v: number) {
        this[3] = v;
    }

    set(x: number | number[], y?: number, z?: number, w?: number): this {
        if (Array.isArray(x)) return this.copy(x);
        Vec4Func.set(this, x, y as number, z as number, w as number);
        return this;
    }

    copy(v: Vec4 | number[]): this {
        Vec4Func.copy(this, v);
        return this;
    }

    normalize(): this {
        Vec4Func.normalize(this, this);
        return this;
    }

    multiply(v: number): this {
        Vec4Func.scale(this, this, v);
        return this;
    }

    dot(v: Vec4 | number[]): number {
        return Vec4Func.dot(this, v);
    }

    fromArray(a: number[], o: number = 0): this {
        this[0] = a[o];
        this[1] = a[o + 1];
        this[2] = a[o + 2];
        this[3] = a[o + 3];
        return this;
    }

    toArray(a: number[] = [], o: number = 0): number[] {
        a[o] = this[0];
        a[o + 1] = this[1];
        a[o + 2] = this[2];
        a[o + 3] = this[3];
        return a;
    }
}