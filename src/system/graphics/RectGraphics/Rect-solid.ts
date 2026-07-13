import { Geometry, Program, Mesh, Camera } from '../../../webgl/index';
import { Rect } from '../../../components/render/Rect';
import { Transform } from '../../../components/Transform';
import { parseColorStyle } from '../../../utils/color';

const unitQuad = new Float32Array([
    0, 0,
    1, 0,
    0, 1,

    1, 0,
    1, 1,
    0, 1,
]);

let program: Program | null = null;
let geometry: Geometry | null = null;
let mesh: Mesh | null = null;

// Pre-allocated per-instance attribute arrays
let aRectData = new Float32Array(4);
let aWorldMatrixData = new Float32Array(9);
let aColorData = new Float32Array(4);
let aStrokeColorData = new Float32Array(4);
let aLineWidthData = new Float32Array(1);

export function renderSolidRects(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, rect: Rect) {
    const alpha = rect.alpha == null ? 1 : Math.max(0, Math.min(1, Number(rect.alpha)));
    const fill = parseColorStyle(rect.fillStyle);
    const stroke = rect.strokeStyle ? parseColorStyle(rect.strokeStyle) : [0, 0, 0, 0];
    aRectData[0] = 0;
    aRectData[1] = 0;
    aRectData[2] = rect.width || 0;
    aRectData[3] = rect.height || 0;

    aWorldMatrixData.set(transform.worldMatrix);
    aColorData[0] = fill[0];
    aColorData[1] = fill[1];
    aColorData[2] = fill[2];
    aColorData[3] = fill[3] * alpha;
    aStrokeColorData[0] = stroke[0];
    aStrokeColorData[1] = stroke[1];
    aStrokeColorData[2] = stroke[2];
    aStrokeColorData[3] = stroke[3] * alpha;
    aLineWidthData[0] = Math.max(0, Number(rect.lineWidth || 0));

    if (!program) {
        const vertex = `#version 300 es
        precision highp float;

        // Unit quad (0..1) in local space
        in vec2 position;

        // Per-instance: x, y, w, h in pixels (top-left origin)
        in vec4 aRect;
        // Per-instance: 2D world transform matrix (column-major)
        in mat3 aWorldMatrix;
        // Per-instance: RGBA (0..1)
        in vec4 aColor;
        // Per-instance: stroke RGBA (0..1)
        in vec4 aStrokeColor;
        // Per-instance: stroke width in pixels
        in float aLineWidth;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;

        out vec2 vLocalPos;
        out vec2 vSize;
        out vec4 vColor;
        out vec4 vStrokeColor;
        out float vLineWidth;

        void main() {
            vSize = aRect.zw;
            vec2 localPos = position * vSize;
            vLocalPos = localPos;
            vColor = aColor;
            vStrokeColor = aStrokeColor;
            vLineWidth = aLineWidth;

            // Embed 2D affine mat3 into a 4x4 matrix to match the camera's mat4 pipeline.
            // GLSL matrices are column-major: m[col][row]. Translation lives in aWorldMatrix[2].xy.
            mat4 worldMatrix4 = mat4(
                vec4(aWorldMatrix[0][0], aWorldMatrix[0][1], 0.0, 0.0),
                vec4(aWorldMatrix[1][0], aWorldMatrix[1][1], 0.0, 0.0),
                vec4(0.0, 0.0, 1.0, 0.0),
                vec4(aWorldMatrix[2][0], aWorldMatrix[2][1], 0.0, 1.0)
            );
            gl_Position = projectionMatrix * viewMatrix * worldMatrix4 * vec4(localPos, 0.0, 1.0);
        }
    `;

        const fragment = `#version 300 es
        precision highp float;

        in vec2 vLocalPos;
        in vec2 vSize;
        in vec4 vColor;
        in vec4 vStrokeColor;
        in float vLineWidth;
        out vec4 fragColor;

        // pixels per world-unit (includes DPR) - set from JS each frame
        uniform float uPixelScale;

        float sdBox(vec2 p, vec2 halfSize) {
            vec2 q = abs(p) - halfSize;
            return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        }

        void main() {
            vec2 halfSize = max(0.5 * vSize - vec2(0.5), vec2(0.0));
            vec2 p = vLocalPos - 0.5 * vSize;
            float d = sdBox(p, halfSize);

            // convert distance to pixel units for stable AA regardless of zoom
            float d_px = d * uPixelScale;
            // AA width in pixel units (uPixelScale-only version, no derivatives)
            float aa_px = 0.5;
            float lw_px = clamp(vLineWidth, 0.0, min(halfSize.x, halfSize.y) * uPixelScale);

            float alphaOuter = 1.0 - smoothstep(0.0, aa_px, d_px);
            float alphaInner = 1.0 - smoothstep(0.0, aa_px, d_px + lw_px);
            float alphaStrokeMask = max(0.0, alphaOuter - alphaInner);

            float fillA = vColor.a * alphaInner;
            float strokeA = vStrokeColor.a * alphaStrokeMask;
            float outA = fillA + strokeA;
            if (outA < 1e-6) {
                fragColor = vec4(0.0);
                return;
            }

            vec3 outRgb = (vColor.rgb * fillA + vStrokeColor.rgb * strokeA) / outA;
            fragColor = vec4(outRgb, outA);
        }
    `;

        program = new Program(gl, {
            vertex,
            fragment,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });

        geometry = new Geometry(gl, {
            position: { data: unitQuad, size: 2 },
            aRect: { data: aRectData, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aWorldMatrix: { data: aWorldMatrixData, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aColor: { data: aColorData, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aStrokeColor: { data: aStrokeColorData, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aLineWidth: { data: aLineWidthData, size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
        });
        geometry.setInstancedCount(1);

        mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
    }

    // Update attributes and mark for upload
    geometry!.attributes.aRect.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aRect);

    geometry!.attributes.aWorldMatrix.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aWorldMatrix);

    geometry!.attributes.aColor.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aColor);

    geometry!.attributes.aStrokeColor.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aStrokeColor);

    geometry!.attributes.aLineWidth.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aLineWidth);

    // position is static unitQuad, ensure uploaded
    geometry!.attributes.position.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.position);

    // update pixel scale uniform so AA is stable under camera zoom
    if (program) {
        const pixelScale = (camera.right !== undefined && camera.left !== undefined)
            ? (gl.canvas.width) * (camera.zoom || 1) / (camera.right - camera.left)
            : 1.0;
        program.uniforms.uPixelScale = { value: pixelScale };
    }

    mesh!.draw({ camera });
}