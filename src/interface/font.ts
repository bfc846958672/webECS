export type MsdfFontJson = {
    atlas: {
        type: 'msdf' | 'sdf' | 'mtsdf' | string;
        distanceRange: number;
        distanceRangeMiddle?: number;
        size: number;
        width: number;
        height: number;
        yOrigin?: 'bottom' | 'top' | string;
    };
    metrics: {
        emSize: number;
        lineHeight: number;
        ascender: number;
        descender: number;
        underlineY?: number;
        underlineThickness?: number;
    };
    glyphs: Array<{
        unicode: number;
        advance: number;
        planeBounds?: {
            left: number;
            bottom: number;
            right: number;
            top: number;
        };
        atlasBounds?: {
            left: number;
            bottom: number;
            right: number;
            top: number;
        };
    }>;
    kerning?: Array<{
        unicode1?: number;
        unicode2?: number;
        left?: number;
        right?: number;
        advance: number;
    }>;
};

export interface IFont {
    /** 字体度量与字形信息（msdf-atlas 格式：atlas/metrics/glyphs/kerning） */
    font: MsdfFontJson;
    /** 与 font 对应的贴图（当前资源约定：与 json 同目录的 msdf.png） */
    images: HTMLImageElement[];
}
