import { Geometry, Mesh, Program, Texture, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Text } from '../../../components/render/Text';
import type { IFont, MsdfFontJson } from '../../../interface/font';
import type { IAABB } from '../../../interface/AABB';
import { renderBaselineDebugLines, type DebugBaselineLine } from './text-baseline-debug';

type FontData = IFont['font'];
type TextAlign = CanvasTextAlign;
type TextBaseline = CanvasTextBaseline;

/**
 * 把 \n/\r 等控制字符转成空格，做“单行渲染”（不支持换行）。
 * 参考 canvas fillText：控制字符不产生换行效果。
 */
export function sanitizeSingleLineText(text: unknown): string {
    if (text == null) return '';
    return String(text).replace(/[\u0000-\u001F]/g, ' ');
}

function parseMsdfGlyphs(font: MsdfFontJson): Map<number, MsdfGlyph> {
    const glyphs = new Map<number, MsdfGlyph>();
    for (const g of font?.glyphs || []) glyphs.set(g.unicode, g);
    return glyphs;
}

type MsdfGlyph = MsdfFontJson['glyphs'][number];
type MsdfKerningPair = NonNullable<MsdfFontJson['kerning']>[number];

function computeMsdfDesignScale(font: MsdfFontJson, sizePx: number): number {
    const em = font?.metrics?.emSize || 1;
    return sizePx / em;
}

function getLocalAnchorX(totalWidth: number, textAlign: TextAlign): number {
    const align = textAlign || 'left';
    if (align === 'center') return totalWidth * 0.5;
    if (align === 'right') return totalWidth;
    return 0;
}

function getLineTopBottomY(font: FontData, sizePx: number) {
    const scale = computeMsdfDesignScale(font, sizePx);
    const asc = font.metrics?.ascender ?? 0;
    const lineHeight = font.metrics?.lineHeight ?? asc;
    // msdf-atlas: baseline at y=0 in "plane" space (y-up)
    // Convert to local y-down: yDown = -yUp
    // 行盒：使用 ascender + lineHeight
    const topY = -asc * scale;
    const bottomY = (lineHeight - asc) * scale;
    return { topY, bottomY };
}

function getIdeographicBaselineY(font: FontData, sizePx: number): number {
    const scale = computeMsdfDesignScale(font, sizePx);
    const desc = font.metrics?.descender ?? 0;
    // ideographic：更贴近字形盒的下缘（使用 descender），区别于 bottom(行盒底部)
    return -desc * scale;
}

function getLocalAnchorY(font: FontData, sizePx: number, textBaseline: TextBaseline): number {
    const baseline = textBaseline || 'alphabetic';
    const { topY, bottomY } = getLineTopBottomY(font, sizePx);
    if (baseline === 'top') return topY;
    if (baseline === 'middle') return (topY + bottomY) * 0.5;
    if (baseline === 'bottom') return bottomY;
    if (baseline === 'ideographic') return getIdeographicBaselineY(font, sizePx);
    return 0; // alphabetic
}

type BaselineName = "alphabetic" | "bottom" | "ideographic" | "middle" | "top";

function getBaselineLocalY(font: FontData, sizePx: number, baseline: BaselineName): number {
    const { topY, bottomY } = getLineTopBottomY(font, sizePx);
    if (baseline === "top") return topY;
    if (baseline === "middle") return (topY + bottomY) * 0.5;
    if (baseline === "bottom") return bottomY;
    if (baseline === "ideographic") return getIdeographicBaselineY(font, sizePx);
    return 0;
}

type LayoutBuffers = {
    position: Float32Array; // xyz
    uv: Float32Array;       // uv
    page: Float32Array;     // page index per-vertex
    index: Uint16Array;
};

type SingleLineLayout = {
    buffers: LayoutBuffers;
    glyphCount: number;
    indexCount: number;
    width: number;
    topY: number;
    bottomY: number;
};

function buildKerningMap(pairs: MsdfKerningPair[] | undefined): Map<number, Map<number, number>> {
    const map = new Map<number, Map<number, number>>();
    if (!Array.isArray(pairs)) return map;
    for (const k of pairs) {
        const left = (k as any).unicode1 ?? (k as any).left;
        const right = (k as any).unicode2 ?? (k as any).right;
        const adv = (k as any).advance;
        if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(adv)) continue;
        const inner = map.get(left) ?? new Map<number, number>();
        inner.set(right, adv);
        map.set(left, inner);
    }
    return map;
}

function getKerningAdvance(kerning: Map<number, Map<number, number>>, left: number, right: number): number {
    return kerning.get(left)?.get(right) ?? 0;
}

function countMsdfQuadsAndWidth(font: MsdfFontJson, text: string, sizePx: number) {
    const cleanText = sanitizeSingleLineText(text);
    const glyphs = parseMsdfGlyphs(font);
    const kerning = buildKerningMap(font.kerning);
    const scale = computeMsdfDesignScale(font, sizePx);
    const whitespace = /\s/;

    const space = glyphs.get(32);
    const spaceAdvance = Number.isFinite(space?.advance) ? (space!.advance as number) : 0;

    let width = 0;
    let quads = 0;
    let prev = -1;
    for (const ch of cleanText) {
        const code = ch.codePointAt(0) ?? -1;
        const g = glyphs.get(code);
        const adv = Number.isFinite(g?.advance) ? (g!.advance as number) : spaceAdvance;
        const kern = prev >= 0 && code >= 0 ? getKerningAdvance(kerning, prev, code) : 0;

        if (!whitespace.test(ch) && g?.planeBounds && g?.atlasBounds) quads++;

        if (code >= 0) prev = code;
        width += (adv + kern) * scale;
    }
    return { quads, width, scale };
}

function layoutSingleLineTextMsdf(font: MsdfFontJson, images: HTMLImageElement[], text: string, sizePx: number, offsetX: number, offsetY: number): SingleLineLayout {
    const cleanText = sanitizeSingleLineText(text);
    const glyphs = parseMsdfGlyphs(font);
    const kerning = buildKerningMap(font.kerning);
    const whitespace = /\s/;

    const { quads: numQuads, width: totalWidth, scale } = countMsdfQuadsAndWidth(font, cleanText, sizePx);

    const buffers: LayoutBuffers = {
        position: new Float32Array(numQuads * 4 * 3),
        uv: new Float32Array(numQuads * 4 * 2),
        page: new Float32Array(numQuads * 4),
        index: new Uint16Array(numQuads * 6),
    };
    for (let i = 0; i < numQuads; i++) {
        buffers.index.set([i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 1, i * 4 + 2, i * 4 + 3], i * 6);
    }

    const texW = (images?.[0] as any)?.width || font.atlas?.width || 1;
    const texH = (images?.[0] as any)?.height || font.atlas?.height || 1;
    const yOrigin = font.atlas?.yOrigin || 'bottom';

    const space = glyphs.get(32);
    const spaceAdvance = Number.isFinite(space?.advance) ? (space!.advance as number) : 0;

    let penX = 0;
    let j = 0;
    let prev = -1;

    for (const ch of cleanText) {
        const code = ch.codePointAt(0) ?? -1;
        const g = glyphs.get(code);
        const adv = Number.isFinite(g?.advance) ? (g!.advance as number) : spaceAdvance;
        const kern = prev >= 0 && code >= 0 ? getKerningAdvance(kerning, prev, code) : 0;

        if (!g) {
            penX += sizePx;
            prev = code;
            continue;
        }

        if (whitespace.test(ch) || !g.planeBounds || !g.atlasBounds) {
            penX += (adv + kern) * scale;
            prev = code;
            continue;
        }

        // planeBounds in "plane" space (y-up). Convert to local y-down.
        const pb = g.planeBounds;
        const left = offsetX + penX + pb.left * scale;
        const right = offsetX + penX + pb.right * scale;
        const top = offsetY + (-pb.top) * scale;
        const bottom = offsetY + (-pb.bottom) * scale;

        buffers.position.set(
            [left, bottom, 0, left, top, 0, right, bottom, 0, right, top, 0],
            j * 4 * 3
        );

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
            // ensure v0 <= v1
            const minV = Math.min(v0, v1);
            const maxV = Math.max(v0, v1);
            v0 = minV;
            v1 = maxV;
        }
        buffers.uv.set([u0, v0, u0, v1, u1, v0, u1, v1], j * 4 * 2);
        buffers.page.set([0, 0, 0, 0], j * 4);

        penX += (adv + kern) * scale;
        prev = code;
        j++;
    }

    buffers.position = buffers.position.subarray(0, j * 4 * 3);
    buffers.uv = buffers.uv.subarray(0, j * 4 * 2);
    buffers.page = buffers.page.subarray(0, j * 4);
    buffers.index = buffers.index.subarray(0, j * 6);

    const { topY, bottomY } = getLineTopBottomY(font, sizePx);
    return {
        buffers,
        glyphCount: j,
        indexCount: j * 6,
        width: totalWidth,
        topY: topY + offsetY,
        bottomY: bottomY + offsetY,
    };
}

function layoutSingleLineText(font: FontData, images: HTMLImageElement[], text: string, sizePx: number, offsetX: number, offsetY: number): SingleLineLayout {
    return layoutSingleLineTextMsdf(font, images, text, sizePx, offsetX, offsetY);
}

function createMsdfShaderSource(pages: number) {
    const vertex = `#version 300 es
        precision highp float;

        in vec2 uv;
        in vec3 position;
        in float page;
        in mat3 aWorldMatrix;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;

        out vec2 vUv;
        out float vPage;

        void main() {
            vUv = uv;
            vPage = page;
            mat4 worldMatrix4 = mat4(
                vec4(aWorldMatrix[0][0], aWorldMatrix[0][1], 0.0, 0.0),
                vec4(aWorldMatrix[1][0], aWorldMatrix[1][1], 0.0, 0.0),
                vec4(0.0, 0.0, 1.0, 0.0),
                vec4(aWorldMatrix[2][0], aWorldMatrix[2][1], 0.0, 1.0)
            );
            gl_Position = projectionMatrix * viewMatrix * worldMatrix4 * vec4(position, 1.0);
        }
    `;

    const samplerUniforms = Array.from({ length: pages }, (_, i) => `uniform sampler2D tMap${i};`).join('\n');
    const sampleByPage = (() => {
        const lines: string[] = [];
        lines.push('int p = int(floor(vPage + 0.5));');
        for (let i = 0; i < pages; i++) {
            const head = i === 0 ? 'if' : 'else if';
            lines.push(`${head} (p == ${i}) tex = texture(tMap${i}, vUv).rgb;`);
        }
        lines.push('else tex = texture(tMap0, vUv).rgb;');
        return lines.join('\n');
    })();

    const fragment = `#version 300 es
        precision highp float;

        ${samplerUniforms}

        in vec2 vUv;
        in float vPage;

        out vec4 fragColor;

        void main() {
            vec3 tex;
            ${sampleByPage}

            float signedDist = max(min(tex.r, tex.g), min(max(tex.r, tex.g), tex.b)) - 0.5;
            float d = fwidth(signedDist);
            float alpha = smoothstep(-d, d, signedDist);
            if (alpha < 0.01) discard;
            fragColor = vec4(0.0, 0.0, 0.0, alpha);
        }
    `;

    return { vertex, fragment };
}

const textureCache = new WeakMap<HTMLImageElement, Texture>();
const programCache = new Map<number, Program>();

function getOrCreateTexture(gl: WebGL2RenderingContext, image: HTMLImageElement): Texture {
    const cached = textureCache.get(image);
    if (cached) return cached;
    const tex = new Texture(gl, {
        image,
        target: gl.TEXTURE_2D,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        flipY: true,
        premultiplyAlpha: false,
        generateMipmaps: false,
    });
    textureCache.set(image, tex);
    return tex;
}

function getOrCreateProgram(gl: WebGL2RenderingContext, pages: number, textures: Texture[]): Program {
    const cached = programCache.get(pages);
    if (cached) {
        for (let i = 0; i < pages; i++) {
            const key = `tMap${i}`;
            if (cached.uniforms[key]) cached.uniforms[key].value = textures[i];
        }
        return cached;
    }

    const { vertex, fragment } = createMsdfShaderSource(pages);
    const uniforms: Record<string, { value: any }> = {};
    for (let i = 0; i < pages; i++) uniforms[`tMap${i}`] = { value: textures[i] };
    const program = new Program(gl, {
        vertex,
        fragment,
        uniforms,
        transparent: true,
        cullFace: 0 as any,
        depthTest: false,
        depthWrite: false,
    });
    programCache.set(pages, program);
    return program;
}


export function measureTextLocalAABB(textComp: Text): IAABB | null {
    const fontWrap = textComp.font;
    const font = fontWrap?.font;
    const images = fontWrap?.images;
    if (!font || !images || images.length === 0) return null;

    const sizePx = Math.max(0, Number(textComp.size || 0));
    const cleanText = sanitizeSingleLineText(textComp.text);

    // width 需要走一次 layout（空白也推进），这里只做一次轻量布局取 width
    const layout = layoutSingleLineText(font, images, cleanText, sizePx, 0, 0);
    const anchorX = getLocalAnchorX(layout.width, textComp.textAlign);
    const anchorY = getLocalAnchorY(font, sizePx, textComp.textBaseline);
    const { topY, bottomY } = getLineTopBottomY(font, sizePx);

    // local 原点为“锚点”（由 textAlign/textBaseline 决定）
    const minX = -anchorX;
    const maxX = layout.width - anchorX;
    const minY = topY - anchorY;
    const maxY = bottomY - anchorY;

    return { minX, minY, maxX, maxY };
}

export function renderText(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, textComp: Text) {
    const fontWrap = textComp.font;
    const font = fontWrap?.font;
    const images = fontWrap?.images;
    if (!font || !images || images.length === 0) return;

    const text = sanitizeSingleLineText(textComp.text);
    const sizePx = Math.max(0, Number(textComp.size || 0));
    if (sizePx <= 0) return;

    const textures = images.map((img) => getOrCreateTexture(gl, img));
    const program = getOrCreateProgram(gl, textures.length, textures);

    // 对齐/基线：Text 不再有 x/y，位置由 Transform.worldMatrix 决定。
    // 这里仅把对齐/基线 anchor 偏移 bake 进顶点。
    const tmpLayout = layoutSingleLineText(font, images, text, sizePx, 0, 0);
    const anchorX = getLocalAnchorX(tmpLayout.width, textComp.textAlign);
    const anchorY = getLocalAnchorY(font, sizePx, textComp.textBaseline);
    const offsetX = -anchorX;
    const offsetY = -anchorY;

    const layout = layoutSingleLineText(font, images, text, sizePx, offsetX, offsetY);
    if (layout.glyphCount <= 0) return;

    const aWorldMatrix = new Float32Array(transform.worldMatrix);
    const geometry = new Geometry(gl, {
        position: { size: 3, data: layout.buffers.position },
        uv: { size: 2, data: layout.buffers.uv },
        page: { size: 1, data: layout.buffers.page },
        aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
        index: { data: layout.buffers.index },
    });
    geometry.setInstancedCount(1);
    geometry.setDrawRange(0, layout.indexCount);

    const mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
    mesh.draw({ camera });

    if (textComp.debug) {
        const lines: DebugBaselineLine[] = [
            { y: getBaselineLocalY(font, sizePx, 'top'), color: [1, 0, 0, 1] },
            { y: getBaselineLocalY(font, sizePx, 'middle'), color: [0, 1, 0, 1] },
            { y: getBaselineLocalY(font, sizePx, 'alphabetic'), color: [0, 0.6, 1, 1] },
            { y: getBaselineLocalY(font, sizePx, 'ideographic'), color: [1, 0.6, 0, 1] },
            { y: getBaselineLocalY(font, sizePx, 'bottom'), color: [1, 0, 1, 1] },
        ];
        renderBaselineDebugLines(gl, camera, transform, tmpLayout.width, anchorX, anchorY, lines);
    }
}