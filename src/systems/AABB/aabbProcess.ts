import { ECS } from "../../ecs/ECS.ts";
import { IProcess } from "../../interface/IRender.ts";
import type { ISystem } from "../System.ts";
import { IBoundingBoxStrategy } from "./AABB.ts";
import { CircleBoundingBox } from "./CircleBoundingBox.ts";
import { RectBoundingBox } from "./RectBoundingBox.ts";
import { ImageBoundingBox } from "./ImageBoundingBox.ts";
import { PolylineBoundingBox } from "./PolylineBoundingBox.ts";
import { CurveBoundingBox } from "./CurveBoundingBox.ts";
import { BoundingBoxComponent } from "../../components/BoundingBoxComponent.ts";
import { IAABB } from "../../interface/AABB.ts";
import { IShareContext } from "../../interface/System.ts";
import { PathBoundingBox } from "./PathBoundingBox.ts";
export class BoundingBoxProcess implements IProcess {
    match(_ecs: ECS, _entityId: number) {
        return true
    }
    private strategies: IBoundingBoxStrategy[];
    // 某一组子节点的包围盒，遍历完子节点后 更新
    none: () => IAABB = () => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    constructor() {
        this.strategies = [];
        this.strategies.push(new CircleBoundingBox());
        this.strategies.push(new RectBoundingBox());
        this.strategies.push(new ImageBoundingBox());
        this.strategies.push(new PolylineBoundingBox());
        this.strategies.push(new CurveBoundingBox());
        this.strategies.push(new PathBoundingBox());    
    }
    compute(ecs: ECS, entityId: number) {
        for (const s of this.strategies) {
            if (s.match(ecs, entityId)) {
                const aabb = s.computeAABB(ecs, entityId);
                return aabb;
            }
        }
        return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity } as IAABB;
    }
    exec(system: ISystem, entityId: number, parentEntityId: number | null, context: IShareContext, parentContext: IShareContext | null) {
        let bbox = system.ecs.getComponent(entityId, BoundingBoxComponent);
        if (!bbox) {
            bbox = new BoundingBoxComponent();
            system.ecs.addComponent(entityId, bbox);
        }
        if (!bbox.dirty) return;
        const selfAABB = this.compute(system.ecs, entityId);
        bbox.setSelf(selfAABB);
        bbox.setChildren(context.childrenAABB || this.none());
        bbox.updateTotalAABB();
        if (parentEntityId !== null && parentContext !== null) {
            let parentBBox = system.ecs.getComponent(parentEntityId!, BoundingBoxComponent);
            if (!parentBBox) {
                parentBBox = new BoundingBoxComponent();
                system.ecs.addComponent(parentEntityId!, parentBBox);
            }
            if (!parentContext.childrenAABB) {
                parentContext.childrenAABB = this.none();
            }
            this.merge(parentContext.childrenAABB, bbox.totalAABB);
            parentBBox.dirty = true;
        }
    }
    merge(aabb: IAABB, bbox: IAABB) {
        aabb.minX = Math.min(aabb.minX, bbox.minX);
        aabb.minY = Math.min(aabb.minY, bbox.minY);
        aabb.maxX = Math.max(aabb.maxX, bbox.maxX);
        aabb.maxY = Math.max(aabb.maxY, bbox.maxY);
    }
}