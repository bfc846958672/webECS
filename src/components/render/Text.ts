import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";
import { Engine } from "../../engine/Engine.ts";
import {IFont} from "../../interface/font.ts";
/**
 * 文本组件，仅存储渲染数据
 * 不包含绘制逻辑，系统负责渲染
 */
export class Text extends RenderComponent implements IComponent {
	font: IFont;
	text: string;
	size: number;
	textAlign: CanvasTextAlign;
	textBaseline: CanvasTextBaseline;
    debug: boolean = false;
	constructor(engine: Engine | null, {
		font,
		text = "",
		size = 16,
		textAlign = "left",
		textBaseline = "alphabetic",
        debug = false
	}: Partial<Text> = {}) {
		super(engine);
		this.font = font! ;
		this.text = text || "";
		this.size = size || 16;
		this.textAlign = textAlign;
		this.textBaseline = textBaseline;
        this.debug = debug
	}
}
