import earcut from 'earcut';
import { Geometry, Mesh, Program, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Curve } from '../../../components/render/Curve';
import { clamp01, parseColorStyle } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';

function sanitizePoints(points: Vec2[]): Vec2[] {
	if (points.length < 2) return points;
	const out: Vec2[] = [];
	for (const p of points) {
		if (out.length === 0 || !vec2.nearlyEqual(out[out.length - 1], p)) out.push(p);
	}
	return out;
}

function sampleCurve(curve: Curve, steps: number): Vec2[] {
	const out: Vec2[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const u = 1 - t;
		let x: number;
		let y: number;
		if (curve.cp2) {
			x =
				u ** 3 * curve.start[0] +
				3 * u ** 2 * t * curve.cp1[0] +
				3 * u * t ** 2 * curve.cp2[0] +
				t ** 3 * curve.end[0];
			y =
				u ** 3 * curve.start[1] +
				3 * u ** 2 * t * curve.cp1[1] +
				3 * u * t ** 2 * curve.cp2[1] +
				t ** 3 * curve.end[1];
		} else {
			x = u ** 2 * curve.start[0] + 2 * u * t * curve.cp1[0] + t ** 2 * curve.end[0];
			y = u ** 2 * curve.start[1] + 2 * u * t * curve.cp1[1] + t ** 2 * curve.end[1];
		}
		out.push([x, y]);
	}
	return sanitizePoints(out);
}

function buildFillMesh(points: Vec2[]) {
	if (points.length < 3) return null;

	const flat: number[] = [];
	for (const p of points) flat.push(p[0], p[1]);

	const tri = earcut(flat);
	if (!tri || tri.length < 3) return null;

	const positions = new Float32Array(flat);
	const useU32 = points.length >= 65536;
	const indices = useU32 ? new Uint32Array(tri) : new Uint16Array(tri);
	return { positions, indices };
}

function buildStrokeMeshMiter(points: Vec2[], lineWidth: number) {
	const n = points.length;
	if (n < 2 || lineWidth <= 0) return null;

	const halfW = lineWidth * 0.5;
	const miterLimit = 4;
	const leftRight: number[] = []; // [lx,ly, rx,ry] per point

	for (let i = 0; i < n; i++) {
		let dirPrev: Vec2;
		let dirNext: Vec2;

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
	for (let i = 0; i < n - 1; i++) {
		const j = i + 1;
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
	const indices = useU32 ? new Uint32Array(indicesArr) : new Uint16Array(indicesArr);
	return { positions, indices };
}

function createSolidColorProgram(gl: WebGL2RenderingContext) {
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

	return new Program(gl, {
		vertex,
		fragment,
		transparent: true,
		depthTest: false,
		depthWrite: false,
	});
}

export function renderCurve(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, curve: Curve) {
	if (!curve || !curve.render) return;

	// 采样精度：越大越平滑，但顶点越多
	const steps = curve.cp2 ? 80 : 60;
	const sampled = sampleCurve(curve, steps);
	if (sampled.length < 2) return;

	const alpha = curve.alpha == null ? 1 : clamp01(Number(curve.alpha));
	const world = new Float32Array(transform.worldMatrix);

	const program = createSolidColorProgram(gl);

	// Fill: 约定为“用曲线作为边界并自动用 end->start 闭合”的填充
	if (curve.fill) {
		const fillColor = parseColorStyle(curve.fill);
		const aColor = new Float32Array([fillColor[0], fillColor[1], fillColor[2], fillColor[3] * alpha]);

		const fillMesh = buildFillMesh(sampled);
		if (fillMesh) {
			const geometry = new Geometry(gl, {
				position: { data: fillMesh.positions, size: 2 },
				index: { data: fillMesh.indices },
				aWorldMatrix: { data: world, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
				aColor: { data: aColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
			});
			geometry.setInstancedCount(1);
			const mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
			mesh.draw({ camera });
		}
	}

	// Stroke
	if (curve.strokeStyle && curve.lineWidth > 0) {
		const strokeColor = parseColorStyle(curve.strokeStyle);
		const aColor = new Float32Array([strokeColor[0], strokeColor[1], strokeColor[2], strokeColor[3] * alpha]);
		const strokeMesh = buildStrokeMeshMiter(sampled, Math.max(0, Number(curve.lineWidth || 0)));
		if (strokeMesh) {
			const geometry = new Geometry(gl, {
				position: { data: strokeMesh.positions, size: 2 },
				index: { data: strokeMesh.indices },
				aWorldMatrix: { data: world, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
				aColor: { data: aColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
			});
			geometry.setInstancedCount(1);
			const mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
			mesh.draw({ camera });
		}
	}
}
