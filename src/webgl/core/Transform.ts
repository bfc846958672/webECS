import { Vec3 } from '../math/Vec3';
import { Quat } from '../math/Quat';
import { Mat4 } from '../math/Mat4';
import { Euler } from '../math/Euler';

export class Transform {
    parent: Transform | null;
    children: Transform[];
    visible: boolean;
    matrix: Mat4;
    worldMatrix: Mat4;
    matrixAutoUpdate: boolean;
    worldMatrixNeedsUpdate: boolean;
    position: Vec3;
    quaternion: Quat;
    scale: Vec3;
    rotation: Euler;
    up: Vec3;

    constructor() {
        this.parent = null;
        this.children = [];
        this.visible = true;

        this.matrix = new Mat4();
        this.worldMatrix = new Mat4();
        this.matrixAutoUpdate = true;
        this.worldMatrixNeedsUpdate = false;

        this.position = new Vec3();
        this.quaternion = new Quat();
        this.scale = new Vec3(1);
        this.rotation = new Euler();
        this.up = new Vec3(0, 1, 0);

        // @ts-ignore - private property access
        this.rotation._target.onChange = () => this.quaternion.fromEuler(this.rotation, true);
        // @ts-ignore - private property access
        this.quaternion._target.onChange = () => this.rotation.fromQuaternion(this.quaternion, undefined, true);
    }

    setParent(parent: Transform | null, notifyParent: boolean = true): void {
        if (this.parent && parent !== this.parent) this.parent.removeChild(this, false);
        this.parent = parent;
        if (notifyParent && parent) parent.addChild(this, false);
    }

    addChild(child: Transform, notifyChild: boolean = true): void {
        if (!~this.children.indexOf(child)) this.children.push(child);
        if (notifyChild) child.setParent(this, false);
    }

    removeChild(child: Transform, notifyChild: boolean = true): void {
        if (!!~this.children.indexOf(child)) this.children.splice(this.children.indexOf(child), 1);
        if (notifyChild) child.setParent(null, false);
    }

    updateMatrixWorld(force: boolean = false): void {
        if (this.matrixAutoUpdate) this.updateMatrix();
        if (this.worldMatrixNeedsUpdate || force) {
            if (this.parent === null) this.worldMatrix.copy(this.matrix);
            else this.worldMatrix.multiply(this.parent.worldMatrix, this.matrix);
            this.worldMatrixNeedsUpdate = false;
            force = true;
        }

        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i].updateMatrixWorld(force);
        }
    }

    updateMatrix(): void {
        this.matrix.compose(this.quaternion, this.position, this.scale);
        this.worldMatrixNeedsUpdate = true;
    }

    traverse(callback: (node: Transform) => boolean | void): void {
        // Return true in callback to stop traversing children
        if (callback(this)) return;
        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i].traverse(callback);
        }
    }

    decompose(): void {
        // @ts-ignore - private property access
        this.matrix.decompose(this.quaternion._target, this.position, this.scale);
        this.rotation.fromQuaternion(this.quaternion);
    }

    lookAt(target: Vec3, invert: boolean = false): void {
        if (invert) this.matrix.lookAt(this.position, target, this.up);
        else this.matrix.lookAt(target, this.position, this.up);
        // @ts-ignore - private property access
        this.matrix.getRotation(this.quaternion._target);
        this.rotation.fromQuaternion(this.quaternion);
    }
}