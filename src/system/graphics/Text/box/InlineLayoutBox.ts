import type { IFont } from '../../../../interface/font';

type FontData = IFont['font'];

export class InlineLayoutBox {
    // 布局内联盒：由 ascender + lineHeight 定义（字体文件的 lineHeight）
    constructor(
        public minX: number,
        public minY: number,
        public maxX: number,
        public maxY: number
    ) {}

    static fromFont(font: FontData, width: number, scale: number): InlineLayoutBox {
        const asc = font.metrics?.ascender ?? 0;
        const lineHeight = font.metrics?.lineHeight ?? asc;
        const topY = -asc * scale;
        const bottomY = (lineHeight - asc) * scale;
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
