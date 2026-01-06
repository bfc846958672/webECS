import { ECS } from "../../ecs/ECS.ts";
import { Transform } from "../../components/Transform.ts";
import { Text } from "../../components/render/Text.ts";
import type { ISystem } from "../../interface/System.ts";
import { Graphics } from "../../interface/IRender.ts";
import { mat3, vec2 } from "gl-matrix";
import { renderText, measureTextLocalAABB } from "./Text/text-render.ts";

/**
 * Text 图形模块：WebGL MSDF 文本渲染 + AABB/命中检测
 * - 当前实现为“单行文本”（与 text-render.ts 一致）
 */
export class TextGraphics extends Graphics {
	match(ecs: ECS, entityId: number) {
		return ecs.hasComponent(entityId, Text);
	}

	render(system: ISystem, entityId: number) {
		const ecs = system.ecs;
		const gl = ecs.canvas.getContext("webgl2")!;
		const transform = ecs.getComponent(entityId, Transform)!;
		const text = ecs.getComponent(entityId, Text)!;
		if (!text) return;
		if (!text.font || !text.font.images || text.font.images.length === 0) return;
		renderText(gl, this.renderContext!.camera, transform, text);
	}

	computeAABB(ecs: ECS, entityId: number) {
		const text = ecs.getComponent(entityId, Text)!;
		const transform = ecs.getComponent(entityId, Transform)!;
		const local = measureTextLocalAABB(text);
		if (!local) {
			return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
		}

		const m = transform.worldMatrix;
		const points = [
			vec2.fromValues(local.minX, local.minY),
			vec2.fromValues(local.maxX, local.minY),
			vec2.fromValues(local.maxX, local.maxY),
			vec2.fromValues(local.minX, local.maxY),
		];
		const worldPts = points.map(p => {
			const wp = vec2.create();
			vec2.transformMat3(wp, p, m);
			return wp;
		});

		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const p of worldPts) {
			if (p[0] < minX) minX = p[0];
			if (p[1] < minY) minY = p[1];
			if (p[0] > maxX) maxX = p[0];
			if (p[1] > maxY) maxY = p[1];
		}
		return { minX, minY, maxX, maxY };
	}

	hit(ecs: ECS, entityId: number, x: number, y: number): boolean {
		const text = ecs.getComponent(entityId, Text)!;
		const transform = ecs.getComponent(entityId, Transform)!;
		const local = measureTextLocalAABB(text);
		if (!local) return false;

		const inv = mat3.create();
		mat3.invert(inv, transform.worldMatrix);
		const p = vec2.fromValues(x, y);
		vec2.transformMat3(p, p, inv);
		const lx = p[0];
		const ly = p[1];

		return lx >= local.minX && lx <= local.maxX && ly >= local.minY && ly <= local.maxY;
	}
}
