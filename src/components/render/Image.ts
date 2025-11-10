import { Component } from "../../ecs/decorators/Component";
import { IComponent } from "../../ecs/interface/IComponent";
import { RenderComponent } from "./RenderComponent.ts";
import { Engine } from "../../ecs/Engine.ts";

/**
 * 图片组件，仅存储渲染数据
 * 不包含绘制逻辑，系统负责渲染
 */
@Component("Image")
export class Image extends RenderComponent implements IComponent {
    #bitmap: ImageBitmap | null = null;  // 私有 bitmap
    #width: number = 0;                   // 私有宽度
    #height: number = 0;                  // 私有高度
    alpha: number = 1.0;                  // 透明度
    render: boolean = true;               // 是否渲染
    clip?: [number, number, number, number] = undefined; // 裁剪区域 [x, y, w, h]
    constructor(engine: Engine | null, params: Partial<Image> = {}) {
        super(engine);
        if (params.clip !== undefined) this.clip = params.clip;
        if (params.bitmap !== undefined) this.bitmap = params.bitmap;
        if (params.width !== undefined) this.width = params.width;
        if (params.height !== undefined) this.height = params.height;
        if (params.alpha !== undefined) this.alpha = params.alpha;
        if (params.render !== undefined) this.render = params.render;
    }
    get bitmap(): ImageBitmap | null {
        return this.#bitmap;
    }
    set bitmap(value: ImageBitmap | null) {
        this.#bitmap = value;
        // 如果 width/height 未设置，则默认取 bitmap 尺寸
        if (value && this.#width === 0) this.#width = value.width;
        if (value && this.#height === 0) this.#height = value.height;
    }

    get width(): number {
        return this.#width;
    }
    set width(value: number) {
        this.#width = value;
    }

    get height(): number {
        return this.#height;
    }
    set height(value: number) {
        this.#height = value;
    }
}