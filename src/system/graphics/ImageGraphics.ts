import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Image } from "../../components/render/Image.ts";
import type { ISystem } from "../../interface/System.ts";
import { mat3, vec2 } from "gl-matrix";
import { Graphics } from "../../interface/IRender.ts";

/**
 * Image 图形模块：同时实现渲染与包围盒计算
 */
export class ImageGraphics extends Graphics {
  match(ecs: ECS, entityId: number) {
    return ecs.hasComponent(entityId, Image);
  }

  render(system: ISystem, entityId: number) {
    const ecs = system.ecs;
    const ctx = ecs.canvas.getContext("2d")!;

    const transform = ecs.getComponent(entityId, Transform)!;
    const image = ecs.getComponent(entityId, Image)!;
    if (!image.render) return;
    if (!image.bitmap) return; // 没有纹理就不画

    ctx.save();
    ctx.globalAlpha = image.alpha;
    const [clipX, clipY, clipW, clipH] = image.clip || [0, 0, image.bitmap.width, image.bitmap.height];
    // 应用世界矩阵
    const m = transform.worldMatrix;
    ctx.setTransform(
      m[0], // a = m00
      m[1], // b = m10
      m[3], // c = m01
      m[4], // d = m11
      m[6], // e = m20
      m[7]  // f = m21
    );
    // 绘制图片，缩放到指定大小
    ctx.drawImage(
      image.bitmap,
      clipX, clipY,
      clipW, clipH,

      0, 0,                       // 目标起点
      image.width,                // 目标宽
      image.height                // 目标高
    );

    ctx.restore();
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
