import type { IFont } from '../../../../interface/font';

type FontData = IFont['font'];

export class FontDesignBox {
    // 字体设计盒：由 ascender/descender 定义（相对 alphabetic baseline）
    constructor(
        public minX: number,
        public minY: number,
        public maxX: number,
        public maxY: number,
        private readonly ascender: number,
        private readonly descender: number,
        private readonly emSize: number,
        private readonly scale: number
    ) {}

    static fromFont(font: FontData, width: number, scale: number): FontDesignBox {
        const asc = font.metrics?.ascender ?? 0;
        const desc = font.metrics?.descender ?? 0;
        const emSize = font.metrics?.emSize ?? 1;
        const topY = -asc * scale;
        const bottomY = -desc * scale;
        const minY = Math.min(topY, bottomY);
        const maxY = Math.max(topY, bottomY);
        return new FontDesignBox(0, minY, width, maxY, asc, desc, emSize, scale);
    }

    get alphabeticBaselineY(): number {
        return 0;
    }

    get middleY(): number {
        // （在常见字体数据里 descender<0，这等价于 baseline + (ascender - |descender|) / 2）
        // 引擎本地坐标为 y-down，所以取负并乘 scale。
        return -((this.ascender + this.descender) / 2) * this.scale;
    }

    get ideographicBaselineY(): number {
        // 浏览器里 ideographic baseline 通常比 alphabetic baseline 略向下。
        // 这里用工程近似：downOffset ≈ 0.12em。
        // 注意：本引擎坐标为 y-down，所以“向下”是 +。
        const fontSizePx = this.scale * this.emSize;
        return this.alphabeticBaselineY + 0.1 * fontSizePx;
    }
}
