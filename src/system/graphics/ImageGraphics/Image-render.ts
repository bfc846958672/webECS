import { Geometry, Mesh, Program, Camera, Texture } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Image } from '../../../components/render/Image';
import { clamp01 } from '../../../utils/color';

const textureCache = new WeakMap<ImageBitmap, Texture>();
const programCache = new WeakMap<Texture, Program>();
const meshCache = new WeakMap<Texture, Mesh>();

function getOrCreateTexture(gl: WebGL2RenderingContext, bitmap: ImageBitmap): Texture {
	const cached = textureCache.get(bitmap);
	if (cached) return cached;

	const tex = new Texture(gl, {
		image: bitmap,
		target: gl.TEXTURE_2D,
		minFilter: gl.LINEAR,
		magFilter: gl.LINEAR,
		wrapS: gl.CLAMP_TO_EDGE,
		wrapT: gl.CLAMP_TO_EDGE,
		// 这里 flipY=true 可以让 (u,v)=(0,0) 对应图片左上角，
		// 与 Engine 的 2D 正交坐标（top=0,bottom=canvas.height）一致。
		flipY: true,
		premultiplyAlpha: false,
		generateMipmaps: false,
	});

	textureCache.set(bitmap, tex);
	return tex;
}

let geometry: Geometry | null = null; // shared unit quad geometry

function createImageProgram(gl: WebGL2RenderingContext, texture: Texture) {
	const cached = programCache.get(texture);
	if (cached) return cached;

	const vertex = `#version 300 es
		precision highp float;

		in vec2 position;        // unit quad 0..1
		in mat3 aWorldMatrix;    // 2D affine
		in vec2 aSize;           // local width/height
		in vec4 aUVRect;         // u0,v0,u1,v1
		in vec4 aColor;          // rgba (alpha used)

		uniform mat4 projectionMatrix;
		uniform mat4 viewMatrix;

		out vec2 vUv;
		out vec4 vColor;

		void main() {
			vec2 localPos = position * aSize;
			vUv = mix(aUVRect.xy, aUVRect.zw, position);
			vColor = aColor;

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

		in vec2 vUv;
		in vec4 vColor;

		uniform sampler2D uTexture;

		out vec4 fragColor;

		void main() {
			vec4 tex = texture(uTexture, vUv);
			fragColor = tex * vColor;
		}
	`;

	const program = new Program(gl, {
		vertex,
		fragment,
		transparent: true,
		depthTest: false,
		depthWrite: false,
		uniforms: {
			uTexture: { value: texture },
		},
	});

	programCache.set(texture, program);
	return program;
}

export function renderImage(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, image: Image) {
	if (!image || !image.render) return;
	if (!image.bitmap) return;

	const w = Math.max(0, Number(image.width || 0));
	const h = Math.max(0, Number(image.height || 0));
	if (w <= 0 || h <= 0) return;

	const bitmap = image.bitmap;
	const bw = Math.max(1, bitmap.width);
	const bh = Math.max(1, bitmap.height);

	const [clipX, clipY, clipW, clipH] = image.clip || [0, 0, bw, bh];
	const u0 = clipX / bw;
	const v0 = clipY / bh;
	const u1 = (clipX + clipW) / bw;
	const v1 = (clipY + clipH) / bh;

	const texture = getOrCreateTexture(gl, bitmap);
	const program = createImageProgram(gl, texture);

	const unitQuad = new Float32Array([
		0, 0,
		1, 0,
		0, 1,

		1, 0,
		1, 1,
		0, 1,
	]);

	const aWorldMatrix = new Float32Array(transform.worldMatrix);
	const aSize = new Float32Array([w, h]);
	const aUVRect = new Float32Array([u0, v0, u1, v1]);
	const alpha = image.alpha == null ? 1 : clamp01(Number(image.alpha));
	const aColor = new Float32Array([1, 1, 1, alpha]);

	if (!geometry) {
		geometry = new Geometry(gl, {
			position: { data: unitQuad, size: 2 },
			aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
			aSize: { data: aSize, size: 2, instanced: 1, usage: gl.DYNAMIC_DRAW },
			aUVRect: { data: aUVRect, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
			aColor: { data: aColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
		});
		geometry.setInstancedCount(1);
	}

	let mesh = meshCache.get(texture);
	if (!mesh) {
		mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
		meshCache.set(texture, mesh);
	}

	// update per-instance attributes
	geometry.attributes.aWorldMatrix.data = aWorldMatrix;
	geometry.attributes.aWorldMatrix.needsUpdate = true;
	geometry.updateAttribute(geometry.attributes.aWorldMatrix);

	geometry.attributes.aSize.data = aSize;
	geometry.attributes.aSize.needsUpdate = true;
	geometry.updateAttribute(geometry.attributes.aSize);

	geometry.attributes.aUVRect.data = aUVRect;
	geometry.attributes.aUVRect.needsUpdate = true;
	geometry.updateAttribute(geometry.attributes.aUVRect);

	geometry.attributes.aColor.data = aColor;
	geometry.attributes.aColor.needsUpdate = true;
	geometry.updateAttribute(geometry.attributes.aColor);

	geometry.attributes.position.needsUpdate = true;
	geometry.updateAttribute(geometry.attributes.position);

	mesh.draw({ camera });
}
