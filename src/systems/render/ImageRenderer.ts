import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Image } from "../../components/render/Image.ts";
import type { ISystem } from "../../interface/System.ts";
import type { IRenderStrategy } from "../../interface/IRender.ts";

/**
 * 渲染器：负责绘制 Image 组件
 */
export class ImageRenderer implements IRenderStrategy {

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
}
