import { ISystem } from "../../interface/System.ts";
import { SceneNode } from "../../scene/SceneTree.ts";
import { Engine } from "../../engine/Engine.ts";

/** 前置打点系统：在每帧开始记录时间戳（可扩展为多个标签） */
export class PreLogSystem extends ISystem {
  /** 用于跨系统打点的时间戳 */
  public timingMarks: Map<string, number> = new Map();
  /** 由后置系统写入的最近一次测量（ms） */
  public lastMeasureMs?: number;

  constructor(public engine: Engine, public sceneTree: SceneNode) {
    super(engine, sceneTree);
  }

  protected onInit(): void {
    // 初始化已在字段声明中完成
  }

  update(): void {
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    // 使用固定键名，后置系统会以此为基准计算耗时
    this.timingMarks.set('frame-start', now);
    // 每帧开始时清除上次测量
    this.lastMeasureMs = undefined;
  }
}
