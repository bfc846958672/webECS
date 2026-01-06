import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Image } from "../../components/render/Image.ts";
import type { ISystem } from "../../interface/System.ts";
import { mat3, vec2 } from "gl-matrix";
import { Graphics } from "../../interface/IRender.ts";
import { renderImage } from "./ImageGraphics/Image-render.ts";
import { debug } from "console";

/**
 * Image 图形模块：同时实现渲染与包围盒计算
 */
export class ImageGraphics extends Graphics {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Image);
  }

  render(system: ISystem, entityId: number) {
    const ecs = system.ecs;
    const gl = ecs.canvas.getContext("webgl2")!;

    const transform = ecs.getComponent(entityId, Transform)!;
    const image = ecs.getComponent(entityId, Image)!;
    if (!image.render) return;
    if (!image.bitmap) return; // 没有纹理就不画

    renderImage(gl, this.renderContext!.camera, transform, image);
  }

  /** 计算图片的世界包围盒（考虑变换矩阵） */
  computeAABB(ecs: ECS, entityId: number) {
    const img = ecs.getComponent(entityId, Image)!;
    const transform = ecs.getComponent(entityId, Transform)!;

    const { width, height } = img;
    const m = transform.worldMatrix; // mat3

    // 图片四个顶点（局部坐标）
    const points = [
      vec2.fromValues(0, 0),
      vec2.fromValues(width, 0),
      vec2.fromValues(0, height),
      vec2.fromValues(width, height),
    ];

    // 转换到世界坐标
    const worldPts = points.map(p => {
      const wp = vec2.create();
      vec2.transformMat3(wp, p, m);
      return wp;
    });

    // 求最小包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of worldPts) {
      if (p[0] < minX) minX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] > maxY) maxY = p[1];
    }

    return { minX, minY, maxX, maxY };
  }

  /** 命中检测：判断点击点 (x, y) 是否落在图片内部 */
  hit(ecs: ECS, entityId: number, x: number, y: number): boolean {
    const img = ecs.getComponent(entityId, Image)!;
    const transform = ecs.getComponent(entityId, Transform)!;

    const { width, height } = img;
    const m = transform.worldMatrix;

    // 逆矩阵，把世界坐标转回本地坐标
    const inv = mat3.create();
    mat3.invert(inv, m);

    const local = vec2.fromValues(x, y);
    vec2.transformMat3(local, local, inv);

    const lx = local[0];
    const ly = local[1];

    // 检查是否在 [0, width] × [0, height] 内
    return lx >= 0 && lx <= width && ly >= 0 && ly <= height;
  }
}
