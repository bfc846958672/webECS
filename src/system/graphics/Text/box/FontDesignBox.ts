import type { IFont } from '../../../../interface/font';

type FontData = IFont['font'];

export class FontDesignBox {
    // 字体设计盒：由 ascender/descender 定义（相对 alphabetic baseline）
    constructor(
        public minX: number,
        public minY: number,
        public maxX: number,
        public maxY: number
    ) {}

    static fromFont(font: FontData, width: number, scale: number): FontDesignBox {
        const asc = font.metrics?.ascender ?? 0;
        const desc = font.metrics?.descender ?? 0;
        const topY = -asc * scale;
        const bottomY = -desc * scale;
        return new FontDesignBox(0, topY, width, bottomY);
    }

    get alphabeticBaselineY(): number {
        return 0;
    }

    get ideographicBaselineY(): number {
        // 这里把中文基线定位到 descender（更贴近字形盒下缘）
        return this.maxY;
    }
}
