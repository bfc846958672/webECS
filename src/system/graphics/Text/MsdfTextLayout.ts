import { FontTextCalculator } from './FontTextCalculator';
import { TextureRenderBox } from './box/TextureRenderBox';

export type LayoutBuffers = {
    position: Float32Array; // xyz
    uv: Float32Array; // uv
    page: Float32Array; // page index per-vertex
    index: Uint16Array;
};

export type SingleLineLayout = {
    buffers: LayoutBuffers;
    glyphCount: number;
    indexCount: number;
    width: number;
    textureBox: TextureRenderBox | null;
};

export function layoutSingleLineMsdf(calc: FontTextCalculator, offsetX: number, offsetY: number): SingleLineLayout {
    const whitespace = /\s/;

    const numQuads = calc.quadCount;
    const buffers: LayoutBuffers = {
        position: new Float32Array(numQuads * 4 * 3),
        uv: new Float32Array(numQuads * 4 * 2),
        page: new Float32Array(numQuads * 4),
        index: new Uint16Array(numQuads * 6),
    };
    for (let i = 0; i < numQuads; i++) {
        buffers.index.set([i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 1, i * 4 + 2, i * 4 + 3], i * 6);
    }

    const texW = (calc.images?.[0] as any)?.width || calc.font.atlas?.width || 1;
    const texH = (calc.images?.[0] as any)?.height || calc.font.atlas?.height || 1;
    const yOrigin = calc.font.atlas?.yOrigin || 'bottom';

    const space = calc.getGlyph(32);
    const spaceAdvance = Number.isFinite(space?.advance) ? (space!.advance as number) : 0;

    let penX = 0;
    let j = 0;
    let prev = -1;

    for (const ch of calc.text) {
        const code = ch.codePointAt(0) ?? -1;
        const g = calc.getGlyph(code);

        if (!g) {
            penX += calc.sizePx;
            prev = code;
            continue;
        }

        const adv = Number.isFinite(g.advance) ? (g.advance as number) : spaceAdvance;
        const kern = prev >= 0 && code >= 0 ? calc.getKerningAdvance(prev, code) : 0;

        if (whitespace.test(ch) || !g.planeBounds || !g.atlasBounds) {
            penX += (adv + kern) * calc.scale;
            prev = code;
            continue;
        }

        // planeBounds in "plane" space (y-up). Convert to local y-down.
        const pb = g.planeBounds;
        const left = offsetX + penX + pb.left * calc.scale;
        const right = offsetX + penX + pb.right * calc.scale;
        const top = offsetY + (-pb.top) * calc.scale;
        const bottom = offsetY + (-pb.bottom) * calc.scale;

        buffers.position.set([left, bottom, 0, left, top, 0, right, bottom, 0, right, top, 0], j * 4 * 3);

        // atlasBounds are in pixels.
        // - yOrigin=bottom: v = y/texH
        // - yOrigin=top:    v = 1 - y/texH
        const ab = g.atlasBounds;
        const u0 = ab.left / texW;
        const u1 = ab.right / texW;
        let v0 = ab.bottom / texH;
        let v1 = ab.top / texH;
        if (String(yOrigin).toLowerCase() === 'top') {
            v0 = 1.0 - ab.bottom / texH;
            v1 = 1.0 - ab.top / texH;
            const minV = Math.min(v0, v1);
            const maxV = Math.max(v0, v1);
            v0 = minV;
            v1 = maxV;
        }

        buffers.uv.set([u0, v0, u0, v1, u1, v0, u1, v1], j * 4 * 2);
        buffers.page.set([0, 0, 0, 0], j * 4);

        penX += (adv + kern) * calc.scale;
        prev = code;
        j++;
    }

    buffers.position = buffers.position.subarray(0, j * 4 * 3);
    buffers.uv = buffers.uv.subarray(0, j * 4 * 2);
    buffers.page = buffers.page.subarray(0, j * 4);
    buffers.index = buffers.index.subarray(0, j * 6);

    const textureBox = TextureRenderBox.fromPositions(buffers.position);

    return {
        buffers,
        glyphCount: j,
        indexCount: j * 6,
        width: calc.width,
        textureBox,
    };
}
