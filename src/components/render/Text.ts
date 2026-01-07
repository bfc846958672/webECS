import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";
import { Engine } from "../../engine/Engine.ts";
import type { IFont } from "../../interface/font.ts";
/**
 * 文本组件，仅存储渲染数据
 * 不包含绘制逻辑，系统负责渲染
 */
export class Text extends RenderComponent implements IComponent {
	font: IFont;
	text: string;
	size: number;
	/**
	 * 用户指定的 inline 行高（用于 InlineLayoutBox 计算）
	 * - undefined: 使用默认 1.4（类似 CSS 默认）
	 * - number: 作为 font-size 的倍数（例如 1.2 表示 1.2 * fontSize）
	 * - string: 必须是形如 "20px" 的像素字符串
	 */
	lineHeight?: number | string;
	textAlign: CanvasTextAlign;
	textBaseline: CanvasTextBaseline;
    debug: boolean = false;
	constructor(engine: Engine | null, {
		font,
		text = "",
		size = 16,
		lineHeight = undefined,
		textAlign = "left",
		textBaseline = "alphabetic",
        debug = false
	}: Partial<Text> = {}) {
		super(engine);
		this.font = font! ;
		this.text = text || "";
		this.size = size || 16;
		this.lineHeight = lineHeight;
		this.textAlign = textAlign;
		this.textBaseline = textBaseline;
        this.debug = debug
	}
}
