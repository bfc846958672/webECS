import { Geometry, Mesh, Program, Texture, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Text } from '../../../components/render/Text';
import type { IFont } from '../../../interface/font';
import type { IAABB } from '../../../interface/AABB';

type BMFont = IFont['font'];
type BMFontChar = BMFont['chars'][number];
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

function parseFontGlyphs(font: BMFont): Record<string, BMFontChar> {
    const glyphs: Record<string, BMFontChar> = Object.create(null);
    for (const d of font?.chars || []) glyphs[d.char] = d;
    return glyphs;
}

function computeDesignScale(font: BMFont, sizePx: number): number {
    const baseline = font?.common?.base || 1;
    const designSize = (font?.info && font.info.size) || baseline || 1;
    return sizePx / designSize;
}

function getLocalAnchorX(totalWidth: number, textAlign: TextAlign): number {
    const align = textAlign || 'left';
    if (align === 'center') return totalWidth * 0.5;
    if (align === 'right') return totalWidth;
    return 0;
}

function getLineTopBottomY(font: BMFont, sizePx: number) {
    const scale = computeDesignScale(font, sizePx);
    const base = font?.common?.base || 0;
    const lineHeight = font?.common?.lineHeight || base;
    // alphabetic baseline at local y=0
    const topY = -base * scale;
    const bottomY = (lineHeight - base) * scale;
    return { topY, bottomY };
}

function getLocalAnchorY(font: BMFont, sizePx: number, textBaseline: TextBaseline): number {
    const baseline = textBaseline || 'alphabetic';
    const { topY, bottomY } = getLineTopBottomY(font, sizePx);
    if (baseline === 'top') return topY;
    if (baseline === 'middle') return (topY + bottomY) * 0.5;
    if (baseline === 'bottom') return bottomY;
    if (baseline === 'ideographic') return bottomY;
    return 0; // alphabetic
}

type BaselineName = "alphabetic" | "bottom" | "ideographic" | "middle" | "top";

function getBaselineLocalY(font: BMFont, sizePx: number, baseline: BaselineName): number {
    const { topY, bottomY } = getLineTopBottomY(font, sizePx);
    if (baseline === "top") return topY;
    if (baseline === "middle") return (topY + bottomY) * 0.5;
    if (baseline === "bottom") return bottomY;
    if (baseline === "ideographic") return bottomY;
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

function getPageSizesFromImages(font: BMFont, images: HTMLImageElement[]): Array<{ w: number; h: number }> {
    const fallbackW = font?.common?.scaleW || 1;
    const fallbackH = font?.common?.scaleH || 1;
    return images.map((img) => ({
        w: (img as any)?.width || fallbackW,
        h: (img as any)?.height || fallbackH,
    }));
}

function layoutSingleLineText(font: BMFont, images: HTMLImageElement[], text: string, sizePx: number, offsetX: number, offsetY: number): SingleLineLayout {
    const glyphs = parseFontGlyphs(font);
    const whitespace = /\s/;
    const cleanText = sanitizeSingleLineText(text);
    const scale = computeDesignScale(font, sizePx);

    const base = font?.common?.base || 0;
    const pageSizes = getPageSizesFromImages(font, images);
    const fallbackW = font?.common?.scaleW || 1;
    const fallbackH = font?.common?.scaleH || 1;

    const numQuads = cleanText.replace(/\s/g, '').length;
    const buffers: LayoutBuffers = {
        position: new Float32Array(numQuads * 4 * 3),
        uv: new Float32Array(numQuads * 4 * 2),
        page: new Float32Array(numQuads * 4),
        index: new Uint16Array(numQuads * 6),
    };

    for (let i = 0; i < numQuads; i++) {
        buffers.index.set([i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 1, i * 4 + 2, i * 4 + 3], i * 6);
    }

    let penX = 0;
    let j = 0;

    for (let i = 0; i < cleanText.length; i++) {
        const ch = cleanText[i];
        const glyph = glyphs[ch] || glyphs[' '];
        if (!glyph) {
            penX += sizePx;
            continue;
        }

        if (whitespace.test(ch)) {
            penX += (glyph.xadvance || 0) * scale;
            continue;
        }

        const x = offsetX + penX + (glyph.xoffset || 0) * scale;
        // yoffset is relative to line top; baseline at 0 => topY = (yoffset - base) * scale
        const topYDown = ((glyph.yoffset || 0) - base) * scale;
        const y = offsetY + topYDown;

        const w = (glyph.width || 0) * scale;
        const h = (glyph.height || 0) * scale;

        // yDown coordinate system
        buffers.position.set(
            [x, y + h, 0, x, y, 0, x + w, y + h, 0, x + w, y, 0],
            j * 4 * 3
        );

        const page = Number.isFinite(glyph.page) ? glyph.page : Number(glyph.page) || 0;
        const texW = pageSizes?.[page]?.w || fallbackW;
        const texH = pageSizes?.[page]?.h || fallbackH;

        const u = (glyph.x || 0) / texW;
        const uw = (glyph.width || 0) / texW;
        const v = 1.0 - (glyph.y || 0) / texH;
        const vh = (glyph.height || 0) / texH;
        buffers.uv.set([u, v - vh, u, v, u + uw, v - vh, u + uw, v], j * 4 * 2);
        buffers.page.set([page, page, page, page], j * 4);

        penX += (glyph.xadvance || 0) * scale;
        j++;
    }

    buffers.position = buffers.position.subarray(0, j * 4 * 3);
    buffers.uv = buffers.uv.subarray(0, j * 4 * 2);
    buffers.page = buffers.page.subarray(0, j * 4);
    buffers.index = buffers.index.subarray(0, j * 6);

    const { topY, bottomY } = getLineTopBottomY(font, sizePx);
    return { buffers, glyphCount: j, indexCount: j * 6, width: penX, topY: topY + offsetY, bottomY: bottomY + offsetY };
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
let debugLineProgram: Program | null = null;

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

function getOrCreateDebugLineProgram(gl: WebGL2RenderingContext): Program {
    if (debugLineProgram) return debugLineProgram;

    const vertex = `#version 300 es
        precision highp float;

        in vec2 position;
        in vec4 aColor;
        in mat3 aWorldMatrix;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;

        out vec4 vColor;

        void main() {
            vColor = aColor;
            mat4 worldMatrix4 = mat4(
                vec4(aWorldMatrix[0][0], aWorldMatrix[0][1], 0.0, 0.0),
                vec4(aWorldMatrix[1][0], aWorldMatrix[1][1], 0.0, 0.0),
                vec4(0.0, 0.0, 1.0, 0.0),
                vec4(aWorldMatrix[2][0], aWorldMatrix[2][1], 0.0, 1.0)
            );
            gl_Position = projectionMatrix * viewMatrix * worldMatrix4 * vec4(position, 0.0, 1.0);
        }
    `;

    const fragment = `#version 300 es
        precision highp float;
        in vec4 vColor;
        out vec4 fragColor;
        void main() {
            fragColor = vColor;
        }
    `;

    debugLineProgram = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        cullFace: 0 as any,
        depthTest: false,
        depthWrite: false,
    });

    return debugLineProgram;
}

function renderBaselineDebugLines(
    gl: WebGL2RenderingContext,
    camera: Camera,
    transform: Transform,
    font: BMFont,
    sizePx: number,
    width: number,
    anchorX: number,
    anchorY: number,
) {
    const x0 = -anchorX;
    const x1 = width - anchorX;

    const baselines: Array<{ name: BaselineName; color: [number, number, number, number] }> = [
        { name: "top", color: [1, 0, 0, 1] },
        { name: "middle", color: [0, 1, 0, 1] },
        { name: "alphabetic", color: [0, 0.6, 1, 1] },
        { name: "ideographic", color: [1, 0.6, 0, 1] },
        { name: "bottom", color: [1, 0, 1, 1] },
    ];

    const positions: number[] = [];
    const colors: number[] = [];
    for (const b of baselines) {
        const y = getBaselineLocalY(font, sizePx, b.name) - anchorY;
        positions.push(x0, y, x1, y);
        colors.push(...b.color, ...b.color);
    }

    const program = getOrCreateDebugLineProgram(gl);
    const aWorldMatrix = new Float32Array(transform.worldMatrix);
    const geometry = new Geometry(gl, {
        position: { data: new Float32Array(positions), size: 2, usage: gl.DYNAMIC_DRAW },
        aColor: { data: new Float32Array(colors), size: 4, usage: gl.DYNAMIC_DRAW },
        aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
    });
    geometry.setInstancedCount(1);
    const mesh = new Mesh(gl, { geometry, program, mode: gl.LINES, frustumCulled: false });
    mesh.draw({ camera });
}

export function measureTextLocalAABB(textComp: Text): IAABB | null {
    const fontWrap = textComp.font;
    const bmfont = fontWrap?.font;
    const images = fontWrap?.images;
    if (!bmfont || !images || images.length === 0) return null;

    const sizePx = Math.max(0, Number(textComp.size || 0));
    const cleanText = sanitizeSingleLineText(textComp.text);

    // width 需要走一次 layout（空白也推进），这里只做一次轻量布局取 width
    const layout = layoutSingleLineText(bmfont, images, cleanText, sizePx, 0, 0);
    const anchorX = getLocalAnchorX(layout.width, textComp.textAlign);
    const anchorY = getLocalAnchorY(bmfont, sizePx, textComp.textBaseline);
    const { topY, bottomY } = getLineTopBottomY(bmfont, sizePx);

    // local 原点为“锚点”（由 textAlign/textBaseline 决定）
    const minX = -anchorX;
    const maxX = layout.width - anchorX;
    const minY = topY - anchorY;
    const maxY = bottomY - anchorY;

    return { minX, minY, maxX, maxY };
}

export function renderText(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, textComp: Text) {
    const fontWrap = textComp.font;
    const bmfont = fontWrap?.font;
    const images = fontWrap?.images;
    if (!bmfont || !images || images.length === 0) return;

    const text = sanitizeSingleLineText(textComp.text);
    const sizePx = Math.max(0, Number(textComp.size || 0));
    if (sizePx <= 0) return;

    const textures = images.map((img) => getOrCreateTexture(gl, img));
    const program = getOrCreateProgram(gl, textures.length, textures);

    // 对齐/基线：Text 不再有 x/y，位置由 Transform.worldMatrix 决定。
    // 这里仅把对齐/基线 anchor 偏移 bake 进顶点。
    const tmpLayout = layoutSingleLineText(bmfont, images, text, sizePx, 0, 0);
    const anchorX = getLocalAnchorX(tmpLayout.width, textComp.textAlign);
    const anchorY = getLocalAnchorY(bmfont, sizePx, textComp.textBaseline);
    const offsetX = -anchorX;
    const offsetY = -anchorY;

    const layout = layoutSingleLineText(bmfont, images, text, sizePx, offsetX, offsetY);
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
        renderBaselineDebugLines(gl, camera, transform, bmfont, sizePx, tmpLayout.width, anchorX, anchorY);
    }
}