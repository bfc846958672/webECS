const EPSILON = 0.000001;

export type mat3 = number[];
export type vec2 = number[];
export type vec3 = number[];

export function create(): mat3 {
    const out = new Array(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
}

/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
export function copy(out: mat3, a: mat3): mat3 {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
}

/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */
export function identity(out: mat3): mat3 {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
}

/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to translate
 * @param {vec2} v vector to translate by
 * @returns {mat3} out
 */
export function translate(out: mat3, a: mat3, v: vec2): mat3 {
    let a00 = a[0], a01 = a[0 + 1], a02 = a[0 + 2];
    let a10 = a[1 * 3 + 0], a11 = a[1 * 3 + 1], a12 = a[1 * 3 + 2];
    let a20 = a[2 * 3 + 0], a21 = a[2 * 3 + 1], a22 = a[2 * 3 + 2];
    let v0 = v[0], v1 = v[1];

    out[0] = a00;
    out[1] = a01;
    out[2] = a02;

    out[3] = a10;
    out[4] = a11;
    out[5] = a12;

    out[6] = a00 * v0 + a10 * v1 + a20;
    out[7] = a01 * v0 + a11 * v1 + a21;
    out[8] = a02 * v0 + a12 * v1 + a22;
    return out;
}

/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */
export function rotate(out: mat3, a: mat3, rad: number): mat3 {
    let a00 = a[0], a01 = a[0 + 1], a02 = a[0 + 2];
    let a10 = a[1 * 3 + 0], a11 = a[1 * 3 + 1], a12 = a[1 * 3 + 2];
    let a20 = a[2 * 3 + 0], a21 = a[2 * 3 + 1], a22 = a[2 * 3 + 2];

    let s = Math.sin(rad);
    let c = Math.cos(rad);

    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;

    out[3] = a00 * -s + a10 * c;
    out[4] = a01 * -s + a11 * c;
    out[5] = a02 * -s + a12 * c;

    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
}

/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 */
export function scale(out: mat3, a: mat3, v: vec2): mat3 {
    let v0 = v[0], v1 = v[1];

    out[0] = a[0] * v0;
    out[1] = a[0 + 1] * v0;
    out[2] = a[0 + 2] * v0;

    out[3] = a[1 * 3 + 0] * v1;
    out[4] = a[1 * 3 + 1] * v1;
    out[5] = a[1 * 3 + 2] * v1;

    out[6] = a[2 * 3 + 0];
    out[7] = a[2 * 3 + 1];
    out[8] = a[2 * 3 + 2];
    return out;
}

/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */
export function multiply(out: mat3, a: mat3, b: mat3): mat3 {
    let a00 = a[0], a01 = a[0 + 1], a02 = a[0 + 2];
    let a10 = a[1 * 3 + 0], a11 = a[1 * 3 + 1], a12 = a[1 * 3 + 2];
    let a20 = a[2 * 3 + 0], a21 = a[2 * 3 + 1], a22 = a[2 * 3 + 2];

    let b0 = b[0], b1 = b[1], b2 = b[2];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22;

    b0 = b[3]; b1 = b[4]; b2 = b[5];
    out[3] = b0 * a00 + b1 * a10 + b2 * a20;
    out[4] = b0 * a01 + b1 * a11 + b2 * a21;
    out[5] = b0 * a02 + b1 * a12 + b2 * a22;

    b0 = b[6]; b1 = b[7]; b2 = b[8];
    out[6] = b0 * a00 + b1 * a10 + b2 * a20;
    out[7] = b0 * a01 + b1 * a11 + b2 * a21;
    out[8] = b0 * a02 + b1 * a12 + b2 * a22;
    return out;
}

/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */
export function set(out: mat3, m00: number, m01: number, m02: number, m10: number, m11: number, m12: number, m20: number, m21: number, m22: number): mat3 {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m10;
    out[4] = m11;
    out[5] = m12;
    out[6] = m20;
    out[7] = m21;
    out[8] = m22;
    return out;
}

/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
export function invert(out: mat3, a: mat3): mat3 | null {
    let a00 = a[0], a01 = a[1], a02 = a[2];
    let a10 = a[3], a11 = a[4], a12 = a[5];
    let a20 = a[6], a21 = a[7], a22 = a[8];

    let b01 = a22 * a11 - a12 * a21;
    let b11 = -a22 * a10 + a12 * a20;
    let b21 = a21 * a10 - a11 * a20;

    // Calculate the determinant
    let det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
}

/**
 * Calculates a 3x3 matrix from the given mat4
 *
 * @param {mat3} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat3} out
 */
export function fromMat4(out: mat3, a: number[]): mat3 {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
}

/**
 * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
 *
 * @param {mat3} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat3} out
 */
export function normalFromMat4(out: mat3, a: number[]): mat3 | null {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

    return out;
}

/**
 * Calculates a 3x3 matrix from the given quaternion
 *
 * @param {mat3} out the receiving matrix
 * @param {quat} q Quaternion to create matrix from
 * @returns {mat3} out
 */
export function fromQuat(out: mat3, q: number[]): mat3 {
    let x = q[0], y = q[1], z = q[2], w = q[3];
    let x2 = x + x, y2 = y + y, z2 = z + z;
    let xx = x * x2, xy = x * y2, xz = x * z2;
    let yy = y * y2, yz = y * z2, zz = z * z2;
    let wx = w * x2, wy = w * y2, wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = xy + wz;
    out[2] = xz - wy;

    out[3] = xy - wz;
    out[4] = 1 - xx - zz;
    out[5] = yz + wx;

    out[6] = xz + wy;
    out[7] = yz - wx;
    out[8] = 1 - xx - yy;
    return out;
}