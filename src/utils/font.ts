import { IFont } from '../interface/font.ts';


export class Font {
    font: IFont['font'] | null = null;
    images: HTMLImageElement[] = [];
    pageUrls: string[] = [];

    constructor() { }

    /**
     * 方法1：加载 msdf-atlas json，并设置 this.font。
     * 资源约定：贴图为与 json 同目录的 atlas.png。
     * @param fontUrl
     */
    async loadJson(fontUrl: string): Promise<IFont['font']> {
        if (!fontUrl) throw new Error('Font.loadJson: fontUrl is required');
        const font = (await (await fetch(fontUrl)).json()) as IFont['font'];
        this.font = font;
        return font;
    }

    /**
     * 方法2：加载图片，并设置 this.images
     * @param imageUrls 图片地址数组（通常来自 loadJson 后的 this.pageUrls）
     */
    async loadImages(imageUrls: string[]): Promise<HTMLImageElement[]> {
        this.pageUrls = imageUrls;
        if (!Array.isArray(imageUrls) || imageUrls.length === 0) throw new Error('Font.loadImages: imageUrls must be a non-empty array');
        this.images = await Promise.all(imageUrls.map((src) => this._loadImage(src)));
        return this.images;
    }

    /**
     * @param fontUrl
     * @param imageUrls 
     */
    async init(fontUrl: string, imageUrls: string[]): Promise<{ font: IFont['font']; images: HTMLImageElement[] }> {
        await Promise.all([
            this.loadJson(fontUrl),
            this.loadImages(imageUrls),
        ])
        return { font: this.font!, images: this.images };
    }

    private _loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();

            // 仅当跨域时才设置 crossOrigin，避免在一些环境下无意触发 CORS 约束。
            try {
                const abs = new URL(src, location.href);
                if (abs.origin !== location.origin) img.crossOrigin = 'anonymous';
            } catch (e) {
                console.error(e);
            }

            img.decoding = 'async';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }
}
