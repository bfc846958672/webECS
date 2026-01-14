import { Geometry, Mesh, Program, type Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';

let programCache: Program | null = null;

function getProgram(gl: WebGL2RenderingContext) {
	if (programCache) return programCache;

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

			mat4 world = mat4(
				vec4(aWorldMatrix[0][0], aWorldMatrix[0][1], 0.0, 0.0),
				vec4(aWorldMatrix[1][0], aWorldMatrix[1][1], 0.0, 0.0),
				vec4(0.0, 0.0, 1.0, 0.0),
				vec4(aWorldMatrix[2][0], aWorldMatrix[2][1], 0.0, 1.0)
			);

			gl_Position = projectionMatrix * viewMatrix * world * vec4(position, 0.0, 1.0);
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

	programCache = new Program(gl, {
		vertex,
		fragment,
		transparent: true,
		cullFace: gl.NONE,
		depthTest: false,
		depthWrite: false,
	});

	return programCache;
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
	if (points.length < 2 || lineWidth <= 0) return;

	const n = points.length;
	const halfW = lineWidth * 0.5;
	const eps = 1e-6;
	const miterLimit = 4;

	const segCount = closed ? n : n - 1;
	if (segCount <= 0) return;

	const positionsArr: number[] = [];
	const indicesArr: number[] = [];
	const addVertex = (p: Vec2) => {
		const idx = positionsArr.length / 2;
		positionsArr.push(p[0], p[1]);
		return idx;
	};

	const segDir: Vec2[] = [];
	for (let i = 0; i < segCount; i++) {
		const p0 = points[i];
		const p1 = points[(i + 1) % n];
		const d = vec2.sub(p1, p0);
		const l = vec2.len(d);
		segDir.push(l < eps ? ([1, 0] as Vec2) : ([d[0] / l, d[1] / l] as Vec2));
	}

	const joinHasTurn: boolean[] = new Array(n).fill(false);
	const outerIsLeftAt: boolean[] = new Array(n).fill(true);
	const joinInnerIdx: Array<number | null> = new Array(n).fill(null);
	const joinOuterPrevIdx: Array<number | null> = new Array(n).fill(null);
	const joinOuterNextIdx: Array<number | null> = new Array(n).fill(null);

	const joinStart = closed ? 0 : 1;
	const joinEnd = closed ? n : n - 1;
	for (let i = joinStart; i < joinEnd; i++) {
		const prevSeg = closed ? (i - 1 + segCount) % segCount : i - 1;
		const nextSeg = closed ? i % segCount : i;
		const dirPrev = segDir[prevSeg];
		const dirNext = segDir[nextSeg];
		const turn = vec2.cross(dirPrev, dirNext);
		if (Math.abs(turn) < 1e-8) continue;
		joinHasTurn[i] = true;
		const outerIsLeft = turn < 0;
		outerIsLeftAt[i] = outerIsLeft;

		const p = points[i];
		const nPrev = vec2.perp(dirPrev);
		const nNext = vec2.perp(dirNext);

		const outerPrev = outerIsLeft ? vec2.add(p, vec2.mul(nPrev, halfW)) : vec2.sub(p, vec2.mul(nPrev, halfW));
		const outerNext = outerIsLeft ? vec2.add(p, vec2.mul(nNext, halfW)) : vec2.sub(p, vec2.mul(nNext, halfW));

		const innerPrev = outerIsLeft ? vec2.sub(p, vec2.mul(nPrev, halfW)) : vec2.add(p, vec2.mul(nPrev, halfW));
		const innerNext = outerIsLeft ? vec2.sub(p, vec2.mul(nNext, halfW)) : vec2.add(p, vec2.mul(nNext, halfW));
		let inner = vec2.intersectLines(innerPrev, dirPrev, innerNext, dirNext);
		if (!inner) {
			inner = innerNext;
		} else {
			const dist = vec2.len(vec2.sub(inner, p));
			if (!Number.isFinite(dist) || dist > miterLimit * halfW) inner = innerNext;
		}

		joinInnerIdx[i] = addVertex(inner);
		joinOuterPrevIdx[i] = addVertex(outerPrev);
		joinOuterNextIdx[i] = addVertex(outerNext);
	}

	// Build segment quads using join-aware endpoints
	const segV: Array<{ sL: number; sR: number; eL: number; eR: number }> = new Array(segCount);
	for (let s = 0; s < segCount; s++) {
		const i0 = s;
		const i1 = (s + 1) % n;
		const p0 = points[i0];
		const p1 = points[i1];
		const dir = segDir[s];
		const nn = vec2.perp(dir);

		let sL: number;
		let sR: number;
		if (!closed && s === 0) {
			sL = addVertex(vec2.add(p0, vec2.mul(nn, halfW)));
			sR = addVertex(vec2.sub(p0, vec2.mul(nn, halfW)));
		} else if (joinHasTurn[i0] && joinInnerIdx[i0] != null && joinOuterNextIdx[i0] != null) {
			const outerIsLeft = outerIsLeftAt[i0];
			const outerIdx = joinOuterNextIdx[i0] as number;
			const innerIdx = joinInnerIdx[i0] as number;
			sL = outerIsLeft ? outerIdx : innerIdx;
			sR = outerIsLeft ? innerIdx : outerIdx;
		} else {
			sL = addVertex(vec2.add(p0, vec2.mul(nn, halfW)));
			sR = addVertex(vec2.sub(p0, vec2.mul(nn, halfW)));
		}

		let eL: number;
		let eR: number;
		if (!closed && s === segCount - 1) {
			eL = addVertex(vec2.add(p1, vec2.mul(nn, halfW)));
			eR = addVertex(vec2.sub(p1, vec2.mul(nn, halfW)));
		} else if (joinHasTurn[i1] && joinInnerIdx[i1] != null && joinOuterPrevIdx[i1] != null) {
			const outerIsLeft = outerIsLeftAt[i1];
			const outerIdx = joinOuterPrevIdx[i1] as number;
			const innerIdx = joinInnerIdx[i1] as number;
			eL = outerIsLeft ? outerIdx : innerIdx;
			eR = outerIsLeft ? innerIdx : outerIdx;
		} else {
			eL = addVertex(vec2.add(p1, vec2.mul(nn, halfW)));
			eR = addVertex(vec2.sub(p1, vec2.mul(nn, halfW)));
		}

		segV[s] = { sL, sR, eL, eR };
		indicesArr.push(sL, sR, eL);
		indicesArr.push(eL, sR, eR);
	}

	// Fill the outer bevel face to prevent corner gaps
	for (let i = joinStart; i < joinEnd; i++) {
		if (!joinHasTurn[i]) continue;
		const inner = joinInnerIdx[i];
		const outerPrev = joinOuterPrevIdx[i];
		const outerNext = joinOuterNextIdx[i];
		if (inner == null || outerPrev == null || outerNext == null) continue;
		indicesArr.push(outerPrev, outerNext, inner);
	}

	// --------- 上传 GPU ---------
	const posArr = new Float32Array(positionsArr);
	const idxArr =
		posArr.length / 2 >= 65536
			? new Uint32Array(indicesArr)
			: new Uint16Array(indicesArr);

	const geometry = new Geometry(gl, {
		position: { data: posArr, size: 2 },
		aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1 },
		aColor: {
			data: new Float32Array([
				strokeColor[0],
				strokeColor[1],
				strokeColor[2],
				strokeColor[3] * alpha,
			]),
			size: 4,
			instanced: 1,
		},
	});

	geometry.setIndex({ data: idxArr, size: 1 });
	geometry.setInstancedCount(1);

	const mesh = new Mesh(gl, {
		geometry,
		program: getProgram(gl),
		frustumCulled: false,
	});

	mesh.draw({ camera });
}
