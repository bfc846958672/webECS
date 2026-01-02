import * as Mat4Func from './functions/Mat4Func';

export interface PerspectiveParams {
    fov?: number;
    aspect?: number;
    near?: number;
    far?: number;
}

export interface OrthogonalParams {
    left: number;
    right: number;
    bottom: number;
    top: number;
    near: number;
    far: number;
}

export class Mat4 extends Array<number> {
    constructor(
        m00: number = 1,
        m01: number = 0,
        m02: number = 0,
        m03: number = 0,
        m10: number = 0,
        m11: number = 1,
        m12: number = 0,
        m13: number = 0,
        m20: number = 0,
        m21: number = 0,
        m22: number = 1,
        m23: number = 0,
        m30: number = 0,
        m31: number = 0,
        m32: number = 0,
        m33: number = 1
    ) {
        super(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33);
        return this;
    }

    get x(): number {
        return this[12];
    }

    get y(): number {
        return this[13];
    }

    get z(): number {
        return this[14];
    }

    get w(): number {
        return this[15];
    }

    set x(v: number) {
        this[12] = v;
    }

    set y(v: number) {
        this[13] = v;
    }

    set z(v: number) {
        this[14] = v;
    }

    set w(v: number) {
        this[15] = v;
    }

    set(m00: number | number[], m01?: number, m02?: number, m03?: number, m10?: number, m11?: number, m12?: number, m13?: number, m20?: number, m21?: number, m22?: number, m23?: number, m30?: number, m31?: number, m32?: number, m33?: number): this {
        if (Array.isArray(m00)) return this.copy(m00);
        Mat4Func.set(this, m00, m01 as number, m02 as number, m03 as number, m10 as number, m11 as number, m12 as number, m13 as number, m20 as number, m21 as number, m22 as number, m23 as number, m30 as number, m31 as number, m32 as number, m33 as number);
        return this;
    }

    translate(v: number[], m: Mat4 | number[] = this): this {
        Mat4Func.translate(this, m, v);
        return this;
    }

    rotate(v: number, axis: number[], m: Mat4 | number[] = this): this {
        Mat4Func.rotate(this, m, v, axis);
        return this;
    }

    scale(v: number | number[], m: Mat4 | number[] = this): this {
        Mat4Func.scale(this, m, typeof v === 'number' ? [v, v, v] : v);
        return this;
    }

    add(ma: Mat4 | number[], mb?: Mat4 | number[]): this {
        if (mb) Mat4Func.add(this, ma, mb);
        else Mat4Func.add(this, this, ma);
        return this;
    }

    sub(ma: Mat4 | number[], mb?: Mat4 | number[]): this {
        if (mb) Mat4Func.subtract(this, ma, mb);
        else Mat4Func.subtract(this, this, ma);
        return this;
    }

    multiply(ma: number | Mat4 | number[], mb?: Mat4 | number[]): this {
        if (typeof ma === 'number') {
            Mat4Func.multiplyScalar(this, this, ma);
        } else if (mb) {
            Mat4Func.multiply(this, ma, mb);
        } else {
            Mat4Func.multiply(this, this, ma);
        }
        return this;
    }

    identity(): this {
        Mat4Func.identity(this);
        return this;
    }

    copy(m: Mat4 | number[]): this {
        Mat4Func.copy(this, m);
        return this;
    }

    fromPerspective(params: PerspectiveParams = {}): this {
        Mat4Func.perspective(this, params.fov, params.aspect, params.near, params.far);
        return this;
    }

    fromOrthogonal(params: OrthogonalParams): this {
        Mat4Func.ortho(this, params.left, params.right, params.bottom, params.top, params.near, params.far);
        return this;
    }

    fromQuaternion(q: number[]): this {
        Mat4Func.fromQuat(this, q);
        return this;
    }

    setPosition(v: number[]): this {
        this.x = v[0];
        this.y = v[1];
        this.z = v[2];
        return this;
    }

    inverse(m: Mat4 | number[] = this): this {
        Mat4Func.invert(this, m);
        return this;
    }

    compose(q: number[], pos: number[], scale: number[]): this {
        Mat4Func.compose(this, q, pos, scale);
        return this;
    }

    decompose(q: number[], pos: number[], scale: number[]): this {
        Mat4Func.decompose(this, q, pos, scale);
        return this;
    }

    getRotation(q: number[]): this {
        Mat4Func.getRotation(q, this);
        return this;
    }

    getTranslation(pos: number[]): this {
        Mat4Func.getTranslation(pos, this);
        return this;
    }

    getScaling(scale: number[]): this {
        Mat4Func.getScaling(scale, this);
        return this;
    }

    getMaxScaleOnAxis(): number {
        return Mat4Func.getMaxScaleOnAxis(this);
    }

    lookAt(eye: number[], target: number[], up: number[]): this {
        Mat4Func.targetTo(this, eye, target, up);
        return this;
    }

    determinant(): number {
        return Mat4Func.determinant(this);
    }

    fromArray(a: number[], o: number = 0): this {
        this[0] = a[o];
        this[1] = a[o + 1];
        this[2] = a[o + 2];
        this[3] = a[o + 3];
        this[4] = a[o + 4];
        this[5] = a[o + 5];
        this[6] = a[o + 6];
        this[7] = a[o + 7];
        this[8] = a[o + 8];
        this[9] = a[o + 9];
        this[10] = a[o + 10];
        this[11] = a[o + 11];
        this[12] = a[o + 12];
        this[13] = a[o + 13];
        this[14] = a[o + 14];
        this[15] = a[o + 15];
        return this;
    }

    toArray(a: number[] = [], o: number = 0): number[] {
        a[o] = this[0];
        a[o + 1] = this[1];
        a[o + 2] = this[2];
        a[o + 3] = this[3];
        a[o + 4] = this[4];
        a[o + 5] = this[5];
        a[o + 6] = this[6];
        a[o + 7] = this[7];
        a[o + 8] = this[8];
        a[o + 9] = this[9];
        a[o + 10] = this[10];
        a[o + 11] = this[11];
        a[o + 12] = this[12];
        a[o + 13] = this[13];
        a[o + 14] = this[14];
        a[o + 15] = this[15];
        return a;
    }
}