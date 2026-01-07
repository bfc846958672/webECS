import type { IFont } from '../../../../interface/font';

type FontData = IFont['font'];

export class InlineLayoutBox {
    // 布局内联盒：由 ascender/descender + 用户指定的 inline line-height 定义
    constructor(
        public minX: number,
        public minY: number,
        public maxX: number,
        public maxY: number
    ) {}

    static fromFont(font: FontData, width: number, scale: number, lineHeightPx: number): InlineLayoutBox {
        const asc = font.metrics?.ascender ?? 0;
        const desc = font.metrics?.descender ?? 0;

        // msdf-atlas: baseline at y=0 in "plane" space (y-up)
        // 设计盒高度：asc - desc（通常 desc 为负数）
        const designHeight = asc - desc;

        // 用户 line-height 是 px，先换算到设计单位（y-up）再做 leading 分配。
        const lineHeight = scale > 0 ? Math.max(0, lineHeightPx) / scale : 0;

        // 把 lineHeight 与 designHeight 的差值（leading）平均分到上下。
        // 注意：leading 允许为负（CSS 中 line-height 可小于字体高度，字形会溢出行盒）。
        const leading = lineHeight - designHeight;
        const halfLeading = leading * 0.5;

        // y-up: topUp = asc + halfLeading; bottomUp = desc - halfLeading
        // 转 y-down：yDown = -yUp
        const topY = -(asc + halfLeading) * scale;
        const bottomY = -(desc - halfLeading) * scale;

        return new InlineLayoutBox(0, topY, width, bottomY);
    }

    get topY(): number {
        return this.minY;
    }

    get middleY(): number {
        return (this.minY + this.maxY) * 0.5;
    }

    get bottomY(): number {
        return this.maxY;
    }
}
