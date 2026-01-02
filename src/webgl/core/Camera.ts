import { Transform } from './Transform';
import { Mat4 } from '../math/Mat4';
import { Vec3 } from '../math/Vec3';

const tempMat4 = /* @__PURE__ */ new Mat4();
const tempVec3a = /* @__PURE__ */ new Vec3();
const tempVec3b = /* @__PURE__ */ new Vec3();

export class Camera extends Transform {
    near: number;
    far: number;
    fov: number;
    aspect: number;
    left?: number;
    right?: number;
    bottom?: number;
    top?: number;
    zoom: number;
    projectionMatrix: Mat4;
    viewMatrix: Mat4;
    projectionViewMatrix: Mat4;
    worldPosition: Vec3;
    type: 'perspective' | 'orthographic';
    frustum?: Array<Vec3 & { constant: number }>;

    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext | undefined, {
        near = 0.1,
        far = 100,
        fov = 45,
        aspect = 1,
        left,
        right,
        bottom,
        top,
        zoom = 1
    }: {
        near?: number,
        far?: number,
        fov?: number,
        aspect?: number,
        left?: number,
        right?: number,
        bottom?: number,
        top?: number,
        zoom?: number
    } = {}) {
        super();

        this.near = near;
        this.far = far;
        this.fov = fov;
        this.aspect = aspect;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
        this.zoom = zoom;

        this.projectionMatrix = new Mat4();
        this.viewMatrix = new Mat4();
        this.projectionViewMatrix = new Mat4();
        this.worldPosition = new Vec3();

        // Use orthographic if left/right set, else default to perspective camera
        this.type = left || right ? 'orthographic' : 'perspective';

        if (this.type === 'orthographic') this.orthographic();
        else this.perspective();
    }

    perspective({
        near = this.near,
        far = this.far,
        fov = this.fov,
        aspect = this.aspect
    }: {
        near?: number,
        far?: number,
        fov?: number,
        aspect?: number
    } = {}): this {
        this.near = near;
        this.far = far;
        this.fov = fov;
        this.aspect = aspect;
        this.projectionMatrix.fromPerspective({ fov: fov * (Math.PI / 180), aspect, near, far });
        this.type = 'perspective';
        return this;
    }

    orthographic({
        near = this.near,
        far = this.far,
        left = this.left || -1,
        right = this.right || 1,
        bottom = this.bottom || -1,
        top = this.top || 1,
        zoom = this.zoom,
    }: {
        near?: number,
        far?: number,
        left?: number,
        right?: number,
        bottom?: number,
        top?: number,
        zoom?: number
    } = {}): this {
        this.near = near;
        this.far = far;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
        this.zoom = zoom;
        left /= zoom;
        right /= zoom;
        bottom /= zoom;
        top /= zoom;
        this.projectionMatrix.fromOrthogonal({ left, right, bottom, top, near, far });
        this.type = 'orthographic';
        return this;
    }

    updateMatrixWorld(): this {
        super.updateMatrixWorld();
        this.viewMatrix.inverse(this.worldMatrix);
        this.worldMatrix.getTranslation(this.worldPosition);

        // used for sorting
        this.projectionViewMatrix.multiply(this.projectionMatrix, this.viewMatrix);
        return this;
    }

    updateProjectionMatrix(): this {
        if (this.type === 'perspective') {
            return this.perspective();
        } else {
            return this.orthographic();
        }
    }

    lookAt(target: Vec3): this {
        super.lookAt(target, true);
        return this;
    }

    // Project 3D coordinate to 2D point
    project(v: Vec3): this {
        v.applyMatrix4(this.viewMatrix);
        v.applyMatrix4(this.projectionMatrix);
        return this;
    }

    // Unproject 2D point to 3D coordinate
    unproject(v: Vec3): this {
        v.applyMatrix4(tempMat4.inverse(this.projectionMatrix));
        v.applyMatrix4(this.worldMatrix);
        return this;
    }

    updateFrustum(): void {
        if (!this.frustum) {
            this.frustum = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()].map(v => ({
                ...v,
                constant: 0
            })) as Array<Vec3 & { constant: number }>;
        }

        const m = this.projectionViewMatrix;
        this.frustum[0].set(m[3] - m[0], m[7] - m[4], m[11] - m[8]);
        this.frustum[0].constant = m[15] - m[12]; // -x
        this.frustum[1].set(m[3] + m[0], m[7] + m[4], m[11] + m[8]);
        this.frustum[1].constant = m[15] + m[12]; // +x
        this.frustum[2].set(m[3] + m[1], m[7] + m[5], m[11] + m[9]);
        this.frustum[2].constant = m[15] + m[13]; // +y
        this.frustum[3].set(m[3] - m[1], m[7] - m[5], m[11] - m[9]);
        this.frustum[3].constant = m[15] - m[13]; // -y
        this.frustum[4].set(m[3] - m[2], m[7] - m[6], m[11] - m[10]);
        this.frustum[4].constant = m[15] - m[14]; // +z (far)
        this.frustum[5].set(m[3] + m[2], m[7] + m[6], m[11] + m[10]);
        this.frustum[5].constant = m[15] + m[14]; // -z (near)

        for (let i = 0; i < 6; i++) {
            const invLen = 1.0 / this.frustum[i].distance();
            this.frustum[i].multiply(invLen);
            this.frustum[i].constant *= invLen;
        }
    }

    frustumIntersectsMesh(node: { geometry: any, worldMatrix?: Mat4 }, worldMatrix?: Mat4): boolean {
        if (!worldMatrix) worldMatrix = node.worldMatrix as Mat4;
        // If no position attribute, treat as frustumCulled false
        if (!node.geometry.attributes.position) return true;

        if (!node.geometry.bounds || node.geometry.bounds.radius === Infinity) {
            node.geometry.computeBoundingSphere();
        }

        if (!node.geometry.bounds) return true;

        const center = tempVec3a;
        center.copy(node.geometry.bounds.center);
        center.applyMatrix4(worldMatrix);

        const radius = node.geometry.bounds.radius * worldMatrix.getMaxScaleOnAxis();

        return this.frustumIntersectsSphere(center, radius);
    }

    frustumIntersectsSphere(center: Vec3, radius: number): boolean {
        if (!this.frustum) return true;
        const normal = tempVec3b;

        for (let i = 0; i < 6; i++) {
            const plane = this.frustum[i];
            const distance = normal.copy(plane).dot(center) + plane.constant;
            if (distance < -radius) return false;
        }
        return true;
    }
}