// EasyUI 库主入口
import { Engine } from "./ecs/Engine.ts";
import * as Components from './components/render/index.ts';




export * from './components/render/index.ts'; // 单独导出每个组件
export { Components }; // 作为命名空间导出所有组件
// 命名导出
export { Engine };

export { loadImageBitmap } from './utils/fetchImage.ts';