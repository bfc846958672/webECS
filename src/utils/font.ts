import { IFont } from '../interface/font.ts';


export class Font {
    font: IFont['font'] | null = null;
    images: HTMLImageElement[] = [];
    pageUrls: string[] = [];

    constructor() { }

    /**
     * 方法1：加载 msdf-atlas json，并设置 this.font。
     * 资源约定：贴图为与 json 同目录的 msdf.png。
     * @param fontUrl
     */
    async loadJson(fontUrl: string): Promise<IFont['font']> {
        if (!fontUrl) throw new Error('Font.loadJson: fontUrl is required');
        const font = (await (await fetch(fontUrl)).json()) as IFont['font'];
        this.font = font;

        const baseUrl = new URL(fontUrl, location.href);
        this.pageUrls = [new URL('msdf.png', baseUrl).toString()];
        return font;
    }

    /**
     * 方法2：加载图片，并设置 this.images
     * @param pageUrls 图片地址数组（通常来自 loadJson 后的 this.pageUrls）
     */
    async loadImages(pageUrls: string[]): Promise<HTMLImageElement[]> {
        if (!Array.isArray(pageUrls) || pageUrls.length === 0) throw new Error('Font.loadImages: pageUrls must be a non-empty array');
        this.images = await Promise.all(pageUrls.map((src) => this._loadImage(src)));
        return this.images;
    }

    /**
     * 一键初始化：先 loadJson(fontUrl)，再按解析出的 this.pageUrls 加载图片。
     * @param fontUrl
     */
    async init(fontUrl: string): Promise<{ font: IFont['font']; images: HTMLImageElement[] }> {
        await this.loadJson(fontUrl);
        await this.loadImages(this.pageUrls);
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
