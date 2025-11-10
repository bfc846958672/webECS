/**
 * 异步加载图片并返回 ImageBitmap
 * @param url 图片地址
 * @param crop 可选裁剪区域：[sx, sy, sw, sh]
 * @param options 可选 createImageBitmap 参数
 */
export async function loadImageBitmap(
  url: string,
  crop?: [number, number, number, number],
  options?: ImageBitmapOptions
): Promise<ImageBitmap> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`Failed to load image: ${url}, status ${response.status}`);
    }

    const blob = await response.blob();

    // 根据是否提供 crop 决定调用方式
    if (crop) {
      const [sx, sy, sw, sh] = crop;
      return await createImageBitmap(blob, sx, sy, sw, sh, options);
    } else {
      return await createImageBitmap(blob, options);
    }
  } catch (err) {
    console.error("loadImageBitmap error:", err);
    throw err;
  }
}
