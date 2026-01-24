import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { IProcess } from "../../interface/System.ts";
import { mat3 } from "gl-matrix";
import { BoundingBoxComponent } from "../../components/BoundingBoxComponent.ts";
import type { ISystem } from "../../interface/System.ts";
import { SceneNode } from "../../scene/SceneTree.ts";

const unit = mat3.create();
export class TransformProcess implements IProcess<{ dirty: boolean }, { dirty: boolean }> {
    match(ecs: ECS, node: SceneNode) {
        return true || ecs.hasComponent(node.entityId, Transform);
    }
    /**
     * 执行渲染逻辑
     */
    exec(system: ISystem, node: SceneNode, _parentNode: SceneNode | null, context: { dirty: boolean }, parentContext: { dirty: boolean } | null) {

        const ecs = system.ecs;
        const transform = ecs.getComponent(node.entityId, Transform)!;
        context.dirty = transform.dirty;
        const needUpdate = context.dirty || (parentContext ? parentContext.dirty : false);
        if (!needUpdate) return;
        // 向未来子节点传递 dirty 标记
        context.dirty = true;
        transform.dirty = false;
        // 标记包围盒
        const boundingBox = system.ecs.getComponent(node.entityId, BoundingBoxComponent);
        if (boundingBox) boundingBox.dirty = true
        this.updateEntityMatrix(system, node);
    }
    updateEntityMatrix(system: ISystem, node: SceneNode) {
        const ecs = system.ecs;
        const transform = ecs.getComponent(node.entityId, Transform)!;

        mat3.identity(transform.localMatrix);

        const px = transform.pivotX;
        const py = transform.pivotY;
        // M=T(position)⋅T(pivot)⋅R⋅S⋅T(−pivot)
        mat3.translate(transform.localMatrix, transform.localMatrix, [transform.x + px, transform.y + py]);
        mat3.rotate(transform.localMatrix, transform.localMatrix, transform.rotation);
        if (transform.skewX !== 0 || transform.skewY !== 0) {
            const skewMat = mat3.fromValues(
                1, Math.tan(transform.skewX), 0,
                Math.tan(transform.skewY), 1, 0,
                0, 0, 1
            );
            mat3.multiply(transform.localMatrix, transform.localMatrix, skewMat);
        }
        // 缩放
        mat3.scale(transform.localMatrix, transform.localMatrix, [transform.scaleX, transform.scaleY]);
        mat3.translate(transform.localMatrix, transform.localMatrix, [-px, -py]);

        // 计算世界矩阵
        const parent = node.parent;
        if (parent != null) {
            const parentTransform = ecs.getComponent(parent.entityId, Transform);
            const parentMatrix = parentTransform?.worldMatrix || unit;
            mat3.multiply(transform.worldMatrix, parentMatrix, transform.localMatrix);
        } else {
            mat3.copy(transform.worldMatrix, transform.localMatrix);
        }
    }
}