import { Geometry, Mesh, Program, type Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';
import { computeSegmentQuad, type SegmentQuad } from './utils';

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

function intersectOffsetLines(p1: Vec2, v1: Vec2, n1: Vec2, v2: Vec2, n2: Vec2, halfW: number): Vec2 | null {
	const a1 = vec2.add(p1, vec2.mul(n1, halfW));
	const a2 = vec2.add(p1, vec2.mul(n2, halfW));
	return vec2.intersectLines(a1, v1, a2, v2);
}

// miter join: use intersection of both offset sides at vertex
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

	const eps = 1e-6;
	const halfW = lineWidth * 0.5;
	// miterLimit: miterLength / halfW
	// 典型值为 4（SVG 默认），越小越容易回退到 bevel
	const miterLimit = 4;

	// 1) build per-segment quads
	const rects: SegmentQuad[] = [];
	const segCount = closed ? n : n - 1;
	for (let i = 0; i < segCount; i++) {
		const a = points[i];
		const b = points[(i + 1) % n];
		const quad = computeSegmentQuad(a, b, lineWidth);
		if (quad) rects.push(quad);
	}
	if (rects.length === 0) return;

	// 2) stitch joins by replacing end/start vertices with miter intersections
	const bevels: Vec2[] = [];
	const startIndex = closed ? 0 : 1;
	const endIndex = closed ? n : n - 1;
	for (let i = startIndex; i < endIndex; i++) {
		const i0 = i - 1 < 0 ? n - 1 : i - 1;
		const i1 = i;
		const i2 = i + 1 === n ? 0 : i + 1;

		const p0 = points[i0];
		const p1 = points[i1];
		const p2 = points[i2];

		const v1raw = vec2.sub(p1, p0);
		const v2raw = vec2.sub(p2, p1);
		const v1len = vec2.len(v1raw);
		const v2len = vec2.len(v2raw);
		if (v1len < eps || v2len < eps) continue;
		const v1 = vec2.mul(v1raw, 1 / v1len);
		const v2 = vec2.mul(v2raw, 1 / v2len);

		const cross = v1[0] * v2[1] - v1[1] * v2[0];
		if (Math.abs(cross) < 1e-6) continue;

		const left1 = vec2.leftNormal(v1);
		const left2 = vec2.leftNormal(v2);
		const right1 = vec2.rightNormal(v1);
		const right2 = vec2.rightNormal(v2);

		const prevSegIndex = i - 1 < 0 ? rects.length - 1 : i - 1;
		const nextSegIndex = i;
		const prevQuad = rects[prevSegIndex];
		const nextQuad = rects[nextSegIndex];

		if (cross > 0) {
			// 左转：left side = inner, right side = outer
			const leftJoin = intersectOffsetLines(p1, v1, left1, v2, left2, halfW);
			const rightJoin = intersectOffsetLines(p1, v1, right1, v2, right2, halfW);
			if (!leftJoin || !rightJoin) continue;

			// 外侧 miter 过长则回退到 bevel（补一个三角形）
			const miterLen = vec2.len(vec2.sub(rightJoin, p1));
			if (miterLen / Math.max(halfW, eps) > miterLimit) {
				// inner side 仍使用交点，outer side 保持原矩形端点，追加 bevel 三角形
				prevQuad.le = leftJoin;
				nextQuad.ls = leftJoin;
				bevels.push(leftJoin, nextQuad.rs, prevQuad.re);
				continue;
			}

			// miter：两侧都用交点
			prevQuad.le = leftJoin;
			nextQuad.ls = leftJoin;
			prevQuad.re = rightJoin;
			nextQuad.rs = rightJoin;
		} else {
			// 右转：right side = inner, left side = outer
			const rightJoin = intersectOffsetLines(p1, v1, right1, v2, right2, halfW);
			const leftJoin = intersectOffsetLines(p1, v1, left1, v2, left2, halfW);
			if (!leftJoin || !rightJoin) continue;

			// 外侧 miter 过长则回退到 bevel（补一个三角形）
			const miterLen = vec2.len(vec2.sub(leftJoin, p1));
			if (miterLen / halfW > miterLimit) {
				prevQuad.re = rightJoin;
				nextQuad.rs = rightJoin;
				bevels.push(rightJoin, prevQuad.le, nextQuad.ls);
				continue;
			}

			// miter：两侧都用交点
			prevQuad.re = rightJoin;
			nextQuad.rs = rightJoin;
			prevQuad.le = leftJoin;
			nextQuad.ls = leftJoin;
		}
	}

	// 3) GPU buffers (same layout as bevel/round: ls, rs, re, le)
	const positionsArr: number[] = [];
	const indicesArr: number[] = [];
	let vertexCount = 0;
	for (let i = 0; i < rects.length; i++) {
		const r = rects[i];
		const base = vertexCount;
		positionsArr.push(r.ls[0], r.ls[1], r.rs[0], r.rs[1], r.re[0], r.re[1], r.le[0], r.le[1]);
		indicesArr.push(base + 0, base + 1, base + 2);
		indicesArr.push(base + 0, base + 2, base + 3);
		vertexCount += 4;
	}

	// bevel fallback（三角形补角）
	for (let i = 0; i < bevels.length; i += 3) {
		const base = vertexCount;
		const p0 = bevels[i];
		const p1 = bevels[i + 1];
		const p2 = bevels[i + 2];
		positionsArr.push(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]);
		indicesArr.push(base + 0, base + 1, base + 2);
		vertexCount += 3;
	}

	const positions = new Float32Array(positionsArr);
	const useU32 = vertexCount >= 65536;
	const indices = useU32 ? new Uint32Array(indicesArr) : new Uint16Array(indicesArr);

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
