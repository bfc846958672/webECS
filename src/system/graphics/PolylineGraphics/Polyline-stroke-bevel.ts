import { Geometry, Mesh, Program, type Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';

let polylineStrokeBevelProgram: Program | null = null;

function getOrCreatePolylineStrokeBevelProgram(gl: WebGL2RenderingContext): Program {
	if (polylineStrokeBevelProgram) return polylineStrokeBevelProgram;

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

	polylineStrokeBevelProgram = new Program(gl, {
		vertex,
		fragment,
		transparent: true,
		cullFace: gl.NONE,
		depthTest: false,
		depthWrite: false,
	});

	return polylineStrokeBevelProgram;
}

export function buildStrokeMeshBevel(
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
	const miterLimit = 4;

	const segCount = closed ? n : n - 1;
	const segDir: Vec2[] = [];
	for (let i = 0; i < segCount; i++) {
		const p0 = points[i];
		const p1 = points[(i + 1) % n];
		const d = vec2.sub(p1, p0);
		const l = vec2.len(d);
		segDir.push(l < eps ? [1, 0] : ([d[0] / l, d[1] / l] as Vec2));
	}

	const addVertex = (positionsArr: number[], p: Vec2) => {
		const idx = positionsArr.length / 2;
		positionsArr.push(p[0], p[1]);
		return idx;
	};

	const positionsArr: number[] = [];
	const indicesArr: number[] = [];

	// For each segment we store indices of its 4 verts
	const segV: Array<{ sL: number; sR: number; eL: number; eR: number }> = new Array(segCount);
	// For each join point i (interior), remember which side is outer
	const outerIsLeftAt: boolean[] = new Array(n).fill(true);

	const computeJoinAtPoint = (i: number) => {
		const p = points[i];
		if (!closed) {
			if (i === 0) {
				const dir = segDir[0];
				const nn = vec2.perp(dir);
				return { left: vec2.add(p, vec2.mul(nn, halfW)), right: vec2.sub(p, vec2.mul(nn, halfW)) };
			}
			if (i === n - 1) {
				const dir = segDir[segCount - 1];
				const nn = vec2.perp(dir);
				return { left: vec2.add(p, vec2.mul(nn, halfW)), right: vec2.sub(p, vec2.mul(nn, halfW)) };
			}
		}

		const prevSeg = closed ? (i - 1 + segCount) % segCount : i - 1;
		const nextSeg = closed ? i % segCount : i;
		const dirPrev = segDir[prevSeg];
		const dirNext = segDir[nextSeg];
		const nPrev = vec2.perp(dirPrev);
		const nNext = vec2.perp(dirNext);
		const turn = vec2.cross(dirPrev, dirNext);

		if (Math.abs(turn) < 1e-8) {
			return { left: vec2.add(p, vec2.mul(nNext, halfW)), right: vec2.sub(p, vec2.mul(nNext, halfW)) };
		}

		const outerIsLeft = turn > 0;
		outerIsLeftAt[i] = outerIsLeft;
		const outerPrev = outerIsLeft ? vec2.add(p, vec2.mul(nPrev, halfW)) : vec2.sub(p, vec2.mul(nPrev, halfW));
		const outerNext = outerIsLeft ? vec2.add(p, vec2.mul(nNext, halfW)) : vec2.sub(p, vec2.mul(nNext, halfW));

		const innerPrev = outerIsLeft ? vec2.sub(p, vec2.mul(nPrev, halfW)) : vec2.add(p, vec2.mul(nPrev, halfW));
		const innerNext = outerIsLeft ? vec2.sub(p, vec2.mul(nNext, halfW)) : vec2.add(p, vec2.mul(nNext, halfW));
		let inner = vec2.intersectLines(innerPrev, dirPrev, innerNext, dirNext);
		if (!inner) {
			inner = innerNext;
		} else {
			const d = vec2.len(vec2.sub(inner, p));
			if (!Number.isFinite(d) || d > miterLimit * halfW) inner = innerNext;
		}

		// Return a single left/right pair at the join point as a stable shared endpoint.
		if (outerIsLeft) {
			// left is outer, right is inner
			return { left: outerNext, right: inner, inner };
		}
		// right is outer, left is inner
		return { left: inner, right: outerNext, inner };
	};

	// Precompute join data at each point
	const joinData: any[] = new Array(n);
	for (let i = 0; i < n; i++) joinData[i] = computeJoinAtPoint(i);

	// Build segment quads using join endpoints
	for (let s = 0; s < segCount; s++) {
		const i0 = s;
		const i1 = (s + 1) % n;
		const p0 = points[i0];
		const p1 = points[i1];

		let sLeft: Vec2;
		let sRight: Vec2;
		if (!closed && s === 0) {
			const nn = vec2.perp(segDir[0]);
			sLeft = vec2.add(p0, vec2.mul(nn, halfW));
			sRight = vec2.sub(p0, vec2.mul(nn, halfW));
		} else {
			sLeft = joinData[i0].left;
			sRight = joinData[i0].right;
		}

		let eLeft: Vec2;
		let eRight: Vec2;
		if (!closed && s === segCount - 1) {
			const nn = vec2.perp(segDir[segCount - 1]);
			eLeft = vec2.add(p1, vec2.mul(nn, halfW));
			eRight = vec2.sub(p1, vec2.mul(nn, halfW));
		} else {
			const jd = joinData[i1];
			const prevSeg = closed ? (i1 - 1 + segCount) % segCount : i1 - 1;
			const nextSeg = closed ? i1 % segCount : i1;
			const dirPrev = segDir[prevSeg];
			const dirNext = segDir[nextSeg];
			const nPrev = vec2.perp(dirPrev);
			const turn = vec2.cross(dirPrev, dirNext);
			if (Math.abs(turn) < 1e-8) {
				const nn = vec2.perp(segDir[s]);
				eLeft = vec2.add(p1, vec2.mul(nn, halfW));
				eRight = vec2.sub(p1, vec2.mul(nn, halfW));
			} else {
				const outerIsLeft = turn > 0;
				const outerPrev = outerIsLeft ? vec2.add(p1, vec2.mul(nPrev, halfW)) : vec2.sub(p1, vec2.mul(nPrev, halfW));
				const inner = jd.inner as Vec2;
				if (outerIsLeft) {
					eLeft = outerPrev;
					eRight = inner;
				} else {
					eLeft = inner;
					eRight = outerPrev;
				}
			}
		}

		const base = positionsArr.length / 2;
		segV[s] = {
			sL: addVertex(positionsArr, sLeft),
			sR: addVertex(positionsArr, sRight),
			eL: addVertex(positionsArr, eLeft),
			eR: addVertex(positionsArr, eRight),
		};
		indicesArr.push(base + 0, base + 1, base + 2);
		indicesArr.push(base + 2, base + 1, base + 3);
	}

	// Fill joins (outer side) so bevel is visible and width is consistent
	const joinStart = closed ? 0 : 1;
	const joinEnd = closed ? n : n - 1;
	for (let i = joinStart; i < joinEnd; i++) {
		const prevSeg = closed ? (i - 1 + segCount) % segCount : i - 1;
		const nextSeg = closed ? i % segCount : i;
		const dirPrev = segDir[prevSeg];
		const dirNext = segDir[nextSeg];
		const turn = vec2.cross(dirPrev, dirNext);
		if (Math.abs(turn) < 1e-8) continue;
		const outerIsLeft = turn > 0;

		const prev = segV[prevSeg];
		const next = segV[nextSeg];
		const outerPrevIdx = outerIsLeft ? prev.eL : prev.eR;
		const innerIdx = outerIsLeft ? prev.eR : prev.eL;
		const outerNextIdx = outerIsLeft ? next.sL : next.sR;

		indicesArr.push(outerPrevIdx, outerNextIdx, innerIdx);
	}

	const vertexCount = positionsArr.length / 2;
	const positions = new Float32Array(positionsArr);
	const useU32 = vertexCount >= 65536;
	const indices = useU32 ? new Uint32Array(indicesArr) : new Uint16Array(indicesArr);

	const aColor = new Float32Array([strokeColor[0], strokeColor[1], strokeColor[2], strokeColor[3] * alpha]);
	const program = getOrCreatePolylineStrokeBevelProgram(gl);
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
