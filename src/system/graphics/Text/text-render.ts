import { Geometry, Mesh, Program, Texture, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Text } from '../../../components/render/Text';
import type { IFont } from '../../../interface/font';
import type { IAABB } from '../../../interface/AABB';
import { renderBaselineDebugLines, type DebugBaselineLine, type DebugRect } from './text-baseline-debug';
import { FontTextCalculator } from './FontTextCalculator';
import { layoutSingleLineMsdf } from './MsdfTextLayout';

type FontData = IFont['font'];
type TextAlign = CanvasTextAlign;
type TextBaseline = CanvasTextBaseline;


function getLocalAnchorX(totalWidth: number, textAlign: TextAlign): number {
    const align = textAlign || 'left';
    if (align === 'center') return totalWidth * 0.5;
    if (align === 'right') return totalWidth;
    return 0;
}


function getLocalAnchorY(calc: FontTextCalculator, textBaseline: TextBaseline): number {
    const baseline = (textBaseline || 'alphabetic') as any;
    return calc.getBaselineLocalY(baseline);
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
    if (!fontWrap?.font || !fontWrap?.images || fontWrap.images.length === 0) return null;

    const calc = new FontTextCalculator(fontWrap, textComp);
    if (calc.sizePx <= 0) return null;

    const anchorX = getLocalAnchorX(calc.width, textComp.textAlign);
    const anchorY = getLocalAnchorY(calc, textComp.textBaseline);

    // local 原点为“锚点”（由 textAlign/textBaseline 决定）
    const minX = -anchorX;
    const maxX = calc.width - anchorX;
    const minY = calc.inlineBox.minY - anchorY;
    const maxY = calc.inlineBox.maxY - anchorY;

    return { minX, minY, maxX, maxY };
}

export function renderText(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, textComp: Text) {
    const fontWrap = textComp.font;
    if (!fontWrap?.font || !fontWrap?.images || fontWrap.images.length === 0) return;

    const calc = new FontTextCalculator(fontWrap, textComp);
    if (calc.sizePx <= 0) return;

    const textures = calc.images.map((img) => getOrCreateTexture(gl, img));
    const program = getOrCreateProgram(gl, textures.length, textures);

    // 对齐/基线：Text 不再有 x/y，位置由 Transform.worldMatrix 决定。
    // 这里仅把对齐/基线 anchor 偏移 bake 进顶点。
    const anchorX = getLocalAnchorX(calc.width, textComp.textAlign);
    const anchorY = getLocalAnchorY(calc, textComp.textBaseline);
    const offsetX = -anchorX;
    const offsetY = -anchorY;

    const layout = layoutSingleLineMsdf(calc, offsetX, offsetY);
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
        // 需求：渲染“字体设计盒”和“布局内联盒”，以及设计盒里的英文/中文基线。
        const rects: DebugRect[] = [
            // 设计盒（asc/desc）
            {
                minX: calc.designBox.minX,
                minY: calc.designBox.minY,
                maxX: calc.designBox.maxX,
                maxY: calc.designBox.maxY,
                color: [0, 0.8, 1, 1],
            },
            // 内联盒（asc + lineHeight）
            {
                minX: calc.inlineBox.minX,
                minY: calc.inlineBox.minY,
                maxX: calc.inlineBox.maxX,
                maxY: calc.inlineBox.maxY,
                color: [1, 0, 1, 1],
            },
        ];

        const lines: DebugBaselineLine[] = [
            // 英文基线：alphabetic
            { y: calc.designBox.alphabeticBaselineY, color: [0, 0.6, 1, 1] },
            // 中文基线：ideographic（使用 descender）
            { y: calc.designBox.ideographicBaselineY, color: [1, 0.6, 0, 1] },
        ];

        renderBaselineDebugLines(gl, camera, transform, calc.width, anchorX, anchorY, lines, rects);
    }
}