import { Geometry, Mesh, Program, type Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';

let polylineStrokeMiterProgram: Program | null = null;

function getOrCreatePolylineStrokeMiterProgram(gl: WebGL2RenderingContext): Program {
	if (polylineStrokeMiterProgram) return polylineStrokeMiterProgram;

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

	polylineStrokeMiterProgram = new Program(gl, {
		vertex,
		fragment,
		transparent: true,
		cullFace: gl.NONE,
		depthTest: false,
		depthWrite: false,
	});

	return polylineStrokeMiterProgram;
}

export function buildStrokeMeshMiter(
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
	const miterLimit = 4;

	const leftRight: number[] = []; // [lx,ly, rx,ry] per point
	const getPoint = (idx: number) => points[(idx + n) % n];

	for (let i = 0; i < n; i++) {
		let dirPrev: Vec2;
		let dirNext: Vec2;

		if (closed) {
			dirPrev = vec2.normalize(vec2.sub(getPoint(i), getPoint(i - 1)));
			dirNext = vec2.normalize(vec2.sub(getPoint(i + 1), getPoint(i)));
		} else {
			if (i === 0) {
				dirPrev = vec2.normalize(vec2.sub(points[1], points[0]));
				dirNext = dirPrev;
			} else if (i === n - 1) {
				dirPrev = vec2.normalize(vec2.sub(points[n - 1], points[n - 2]));
				dirNext = dirPrev;
			} else {
				dirPrev = vec2.normalize(vec2.sub(points[i], points[i - 1]));
				dirNext = vec2.normalize(vec2.sub(points[i + 1], points[i]));
			}
		}

		const nPrev = vec2.perp(dirPrev);
		const nNext = vec2.perp(dirNext);

		let offset = vec2.mul(nNext, halfW);
		const miter = vec2.normalize(vec2.add(nPrev, nNext));
		const denom = vec2.dot(miter, nNext);
		if (Math.abs(denom) > 1e-6) {
			const miterLen = halfW / denom;
			if (Number.isFinite(miterLen) && Math.abs(miterLen) <= miterLimit * halfW) {
				offset = vec2.mul(miter, miterLen);
			}
		}

		const p = points[i];
		const lpt = vec2.add(p, offset);
		const rpt = vec2.sub(p, offset);
		leftRight.push(lpt[0], lpt[1], rpt[0], rpt[1]);
	}

	const positionsArr: number[] = [];
	for (let i = 0; i < n; i++) {
		const baseIn = i * 4;
		positionsArr.push(leftRight[baseIn + 0], leftRight[baseIn + 1]);
		positionsArr.push(leftRight[baseIn + 2], leftRight[baseIn + 3]);
	}

	const indicesArr: number[] = [];
	const segCount = closed ? n : n - 1;
	for (let i = 0; i < segCount; i++) {
		const j = (i + 1) % n;
		const li = i * 2;
		const ri = i * 2 + 1;
		const lj = j * 2;
		const rj = j * 2 + 1;
		indicesArr.push(li, ri, lj);
		indicesArr.push(lj, ri, rj);
	}

	const vertexCount = positionsArr.length / 2;
	const positions = new Float32Array(positionsArr);
	const useU32 = vertexCount >= 65536;
	type Idx = Uint16Array | Uint32Array;
	const indices: Idx = useU32 ? new Uint32Array(indicesArr) : new Uint16Array(indicesArr);

	const aColor = new Float32Array([strokeColor[0], strokeColor[1], strokeColor[2], strokeColor[3] * alpha]);
	const program = getOrCreatePolylineStrokeMiterProgram(gl);
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
