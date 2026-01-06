import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";
import { Engine } from "../../engine/Engine.ts";

/**
 * 文本组件，仅存储渲染数据
 * 不包含绘制逻辑，系统负责渲染
 */
export class Text extends RenderComponent implements IComponent {
	font: string;
	textures: unknown;
	text: string;
	size: number;
	x: number;
	y: number;
	textAlign: CanvasTextAlign;
	textBaseline: CanvasTextBaseline;

	constructor(engine: Engine | null, {
		font = "",
		textures = undefined,
		text = "",
		size = 16,
		x = 0,
		y = 0,
		textAlign = "left",
		textBaseline = "alphabetic",
	}: Partial<Text> = {}) {
		super(engine);
		this.font = font || "";
		this.textures = textures;
		this.text = text || "";
		this.size = size || 16;
		this.x = x || 0;
		this.y = y || 0;
		this.textAlign = textAlign;
		this.textBaseline = textBaseline;
	}
}
