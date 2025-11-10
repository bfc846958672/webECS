# 🧩 WebECS — 基于 ECS 架构的 Web Canvas 渲染引擎

> 一款使用 TypeScript 构建的 **ECS（Entity-Component-System）架构 Web 渲染引擎**，目前支持 Canvas 渲染，未来将扩展至 WebGL / WebGPU。

---

## ✨ 特性亮点

-  **ECS 架构设计**
  - 实体（Entity）、组件（Component）、系统（System）分离，结构清晰、易扩展、易调优。
-  **Canvas 渲染封装**
  - 渲染组件 API 基于原生 Canvas API 封装，保持灵活性与简洁性。
-  **场景树系统**
  - 支持层级结构的场景组织与渲染。
-  **事件系统**
  - 提供实体级别的事件响应（如点击、鼠标移动等）。
-  **TypeScript 开发**
  - 类型安全、智能提示完善、开发体验友好。

---

## 📦 目录结构

```
E:\game\webECS\src
│
├── components                 # 各种组件定义
│   ├── BoundingBoxComponent.ts
│   ├── Event.ts
│   ├── render/                # 渲染相关组件
│   │   ├── Circle.ts
│   │   ├── Curve.ts
│   │   ├── Image.ts
│   │   ├── Path.ts
│   │   ├── Polyline.ts
│   │   ├── Rect.ts
│   │   └── RenderComponent.ts
│   └── Transform.ts
│
├── ecs                        # ECS 核心模块
│   ├── ECS.ts
│   ├── Engine.ts
│   ├── EntityManager.ts
│   ├── ComponentManager.ts
│   ├── System.ts
│   ├── SceneTree.ts
│   ├── registry/
│   ├── interface/
│   └── ...
│
├── systems                    # 系统逻辑
│   ├── AABB/                  # 碰撞盒相关系统
│   ├── render/                # 渲染系统
│   ├── BoxDebugSystem.ts
│   ├── DirtySystem.ts
│   ├── EventSystem.ts
│   ├── PickEntitySystem.ts
│   ├── SceneTreeRenderSystem.ts
│   └── TransformProcess.ts
│
├── interface/                 # 通用接口
│
├── utils/                     # 工具函数
│
├── fetchImage.ts              # 资源加载
│
└── main.ts                    # 入口文件
```

---

##  快速开始

### 1️⃣ 安装依赖


```bash
pnpm install
```

### 2️⃣ 构建项目

```bash
npm run build
```

构建后生成的文件位于 `dist/` 目录下。

### 3️⃣ 运行 Demo

```html
<script type="module">
  import { Engine, Components, loadImageBitmap } from './dist/web-ecs.es.js';
  import { Tween, Easing } from 'https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js';

  const canvas = document.getElementById("game-canvas");
  const engine = new Engine(canvas);

  // 创建实体
  const c1 = engine.ecs.createEntity();
  engine.ecs.addComponent(c1, new Components.Transform(engine, { x: 210, y: 210 }));
  engine.ecs.addComponent(c1, new Components.EventComponent(engine));
  engine.ecs.addComponent(c1, new Components.Circle(engine, { radius: 132, fillStyle: "green" }));

  // 绑定点击事件
  const event = engine.ecs.getComponent(c1, Components.EventComponent);
  event.on('click', e => console.log('click', e));

  // 启用调试盒
  engine.boxDebug = true;
  engine.add(c1);
  engine.start();

  // 动画示例（使用 Tween.js）
  const circle = engine.ecs.getComponent(c1, Components.Circle);
  const transform = engine.ecs.getComponent(c1, Components.Transform);
  const tween1 = new Tween(circle)
    .to({ radius: 200 }, 1000)
    .easing(Easing.Quadratic.InOut)
    .onUpdate(() => { transform.dirty = true; });

  const tween2 = new Tween(transform)
    .to({ x: 400, y: 400 }, 1000)
    .easing(Easing.Quadratic.InOut)
    .onUpdate(() => { transform.dirty = true; });

  engine.ticker.add(() => {
    tween1.update(performance.now());
    tween2.update(performance.now());
  });
</script>
```

---

## 🧠 架构设计

```
Entity —— Component —— System
```

| 模块 | 描述 |
|------|------|
| **Entity** | 画布中所有对象的抽象标识 |
| **Component** | 用于定义实体的属性和行为数据（例如：Transform、Render、Event 等） |
| **System** | 负责具体逻辑与更新（例如：渲染、事件分发、AABB 计算等） |

ECS 的解耦设计让引擎具有极高的灵活性与可扩展性。

---

##  当前功能

- ✅ Canvas 渲染管线  
- ✅ AABB 计算与调试盒系统  
- ✅ 事件分发与拾取系统  
- ✅ 场景树渲染系统  
- ✅ Tween 动画兼容  

---

## 🔭 未来规划

| 模块 | 状态 | 描述 |
|------|------|------|
|  高级渲染特效 | 🚧 计划中 | 滤镜、阴影、模糊等特效支持 |
|  WebGL / WebGPU 支持 | 🚧 计划中 | 实现跨渲染后端能力 |
|  粒子系统 | 🚧 计划中 | 粒子组件与系统 |
|  资源管理系统 | 🚧 计划中 | 纹理等相关资源统一管理 |

---

## 🧰 技术栈

- **TypeScript**
- **Canvas API**
- **ECS 架构模式**

---

欢迎提出问题交流或提交 PR 🙌  

---

## 📄 License

MIT License © 2025  
Authored by **boomboomboom4**
