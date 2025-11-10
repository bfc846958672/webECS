/**
 * 异步加载图片并返回 ImageBitmap
 * @param url 图片地址
 * @param crop 可选裁剪区域：[sx, sy, sw, sh]
 * @param options 可选 createImageBitmap 参数
 */
export declare function loadImageBitmap(url: string, crop?: [number, number, number, number], options?: ImageBitmapOptions): Promise<ImageBitmap>;
