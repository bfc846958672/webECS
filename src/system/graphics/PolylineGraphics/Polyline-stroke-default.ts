import { Geometry, Mesh, Program, type Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';

let polylineStrokeDefaultProgram: Program | null = null;

function getOrCreatePolylineStrokeDefaultProgram(gl: WebGL2RenderingContext): Program {
	if (polylineStrokeDefaultProgram) return polylineStrokeDefaultProgram;

	const vertex = `#version 300 es
		precision highp float;

		in vec2 position;
		in mat3 aWorldMatrix;
		in vec4 aColor;

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

	polylineStrokeDefaultProgram = new Program(gl, {
		vertex,
		fragment,
		transparent: true,
		cullFace: gl.NONE,
		depthTest: false,
		depthWrite: false,
	});

	return polylineStrokeDefaultProgram;
}

// default join: render each segment independently, no join stitching at vertices
export function buildStrokeMeshDefault(
	gl: WebGL2RenderingContext,
	camera: Camera,
	aWorldMatrix: Float32Array,
	points: Vec2[],
	strokeColor: RGBA,
	alpha: number,
	lineWidth: number,
	closed: boolean
) {
	const n = points.length;
	if (n < 2 || lineWidth <= 0) return;

	const halfW = lineWidth * 0.5;
	const eps = 1e-6;

	const segCount = closed ? n : n - 1;
	const positionsArr: number[] = [];
	const indicesArr: number[] = [];

	for (let i = 0; i < segCount; i++) {
		const p0 = points[i];
		const p1 = points[(i + 1) % n];
		const d = vec2.sub(p1, p0);
		const l = vec2.len(d);
		const dir: Vec2 = l < eps ? [1, 0] : ([d[0] / l, d[1] / l] as Vec2);
		const nn = vec2.perp(dir);
		const offset = vec2.mul(nn, halfW);

		const sL = vec2.add(p0, offset);
		const sR = vec2.sub(p0, offset);
		const eL = vec2.add(p1, offset);
		const eR = vec2.sub(p1, offset);

		const base = positionsArr.length / 2;
		positionsArr.push(sL[0], sL[1], sR[0], sR[1], eL[0], eL[1], eR[0], eR[1]);
		indicesArr.push(base + 0, base + 1, base + 2);
		indicesArr.push(base + 2, base + 1, base + 3);
	}

	const vertexCount = positionsArr.length / 2;
	const positions = new Float32Array(positionsArr);
	const useU32 = vertexCount >= 65536;
	const indices = useU32 ? new Uint32Array(indicesArr) : new Uint16Array(indicesArr);

	const aColor = new Float32Array([strokeColor[0], strokeColor[1], strokeColor[2], strokeColor[3] * alpha]);
	const program = getOrCreatePolylineStrokeDefaultProgram(gl);
	const geometry = new Geometry(gl, {
		position: { data: positions, size: 2, usage: gl.DYNAMIC_DRAW },
		aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
		aColor: { data: aColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
	});
	geometry.setIndex({ data: indices, size: 1 });
	geometry.setInstancedCount(1);

	const mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
	mesh.draw({ camera });
}
