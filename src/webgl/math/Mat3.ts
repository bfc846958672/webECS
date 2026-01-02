import * as Mat3Func from './functions/Mat3Func';

export class Mat3 extends Array<number> {
    constructor(m00: number = 1, m01: number = 0, m02: number = 0, m10: number = 0, m11: number = 1, m12: number = 0, m20: number = 0, m21: number = 0, m22: number = 1) {
        super(m00, m01, m02, m10, m11, m12, m20, m21, m22);
        return this;
    }

    set(m00: number | number[], m01?: number, m02?: number, m10?: number, m11?: number, m12?: number, m20?: number, m21?: number, m22?: number): this {
        if (Array.isArray(m00)) return this.copy(m00);
        Mat3Func.set(this, m00, m01 as number, m02 as number, m10 as number, m11 as number, m12 as number, m20 as number, m21 as number, m22 as number);
        return this;
    }

    translate(v: number[], m: Mat3 | number[] = this): this {
        Mat3Func.translate(this, m, v);
        return this;
    }

    rotate(v: number, m: Mat3 | number[] = this): this {
        Mat3Func.rotate(this, m, v);
        return this;
    }

    scale(v: number[], m: Mat3 | number[] = this): this {
        Mat3Func.scale(this, m, v);
        return this;
    }

    multiply(ma: Mat3 | number[], mb?: Mat3 | number[]): this {
        if (mb) {
            Mat3Func.multiply(this, ma, mb);
        } else {
            Mat3Func.multiply(this, this, ma);
        }
        return this;
    }

    identity(): this {
        Mat3Func.identity(this);
        return this;
    }

    copy(m: Mat3 | number[]): this {
        Mat3Func.copy(this, m);
        return this;
    }

    fromMatrix4(m: number[]): this {
        Mat3Func.fromMat4(this, m);
        return this;
    }

    fromQuaternion(q: number[]): this {
        Mat3Func.fromQuat(this, q);
        return this;
    }

    fromBasis(vec3a: number[], vec3b: number[], vec3c: number[]): this {
        this.set(vec3a[0], vec3a[1], vec3a[2], vec3b[0], vec3b[1], vec3b[2], vec3c[0], vec3c[1], vec3c[2]);
        return this;
    }

    inverse(m: Mat3 | number[] = this): this {
        Mat3Func.invert(this, m);
        return this;
    }

    getNormalMatrix(m: number[]): this {
        Mat3Func.normalFromMat4(this, m);
        return this;
    }
}