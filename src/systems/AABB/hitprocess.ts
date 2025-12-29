import { ECS } from "../../ecs/ECS.ts";
import { IProcess } from "../../interface/System.ts";
import type { ISystem } from "../../interface/System.ts";
import { IBoundingBoxStrategy } from "../../interface/AABB.ts";
import { CircleBoundingBox } from "./CircleBoundingBox.ts";
import { RectBoundingBox } from "./RectBoundingBox.ts";
import { ImageBoundingBox } from "./ImageBoundingBox.ts";
import { PolylineBoundingBox } from "./PolylineBoundingBox.ts";
import { CurveBoundingBox } from "./CurveBoundingBox.ts";
import { PathBoundingBox } from "./PathBoundingBox.ts";

import { IShareContext } from "../../interface/System.ts";
export class RenderableHitProcess implements IProcess {
    match(_ecs: ECS, _entityId: number) {
        return true
    }
    private strategies: IBoundingBoxStrategy[];
    // 某一组子节点的包围盒，遍历完子节点后 更新
    constructor() {
        this.strategies = [];
        this.strategies.push(new CircleBoundingBox());
        this.strategies.push(new RectBoundingBox());
        this.strategies.push(new ImageBoundingBox());
        this.strategies.push(new PolylineBoundingBox());
        this.strategies.push(new CurveBoundingBox());
        this.strategies.push(new PathBoundingBox());
    }
    hit(ecs: ECS, entityId: number, x: number, y: number) {
        for (const s of this.strategies) {
            if (s.match(ecs, entityId)) {
                return s.hit(ecs, entityId, x, y);
            }
        }
        return false
    }
    exec(_system: ISystem, _entityId: number, _parentEntityId: number | null, _context: IShareContext, _parentContext: unknown) {
    }
}