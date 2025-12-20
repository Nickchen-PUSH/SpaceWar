# SpaceWar

## 项目框架
```
src/
│
├── core/                   # [引擎核心] 负责调度，不包含具体游戏玩法
│   ├── Game.ts             # 上帝类：持有各模块，运行主循环
│   ├── Time.ts             # 时间管理 (Delta time)
│   ├── Input.ts            # 输入管理 (键盘/鼠标状态)
│   ├── AssetLoader.ts      # 资源加载 (Fetch, Blob, JSON)
│   └── LevelManager.ts     # 关卡状态机 (负责切换关卡、调用 onEnter/onExit)
│
├── renderer/               # [渲染层] 负责把数据画出来 (View)
│   ├── Renderer.ts         # 接口定义 (定义 init, render, resize)
│   ├── ThreeRenderer.ts    # Three.js 实现 (目前使用)
│   ├── WebGLRenderer.ts    # (未来预留) 原生 WebGL 实现
│   └── WebGPURenderer.ts   # (未来预留) WebGPU 实现
│
├── scene/                  # [数据层] 纯数据对象 (Model)
│   ├── Scene.ts            # 场景容器 (持有 Entities 和 Camera)
│   ├── Camera.ts           # 摄像机数据 (FOV, Position, DirtyFlag)
│   └── Entity.ts           # 实体基类 (Transform, MeshConfig, Children)
│
├── game/                   # [业务逻辑层] 真正的“太空战机”游戏逻辑在这
│   ├── levels/             # 具体的关卡逻辑
│   │   ├── SpaceLevel.ts   # 第一关：太空战斗
│   │   └── MenuLevel.ts    # 主菜单关卡
│   ├── entities/           # 具体的游戏对象行为
│   │   ├── PlayerShip.ts   # 玩家飞船 (处理按键移动)
│   │   ├── Enemy.ts        # 敌人 AI
│   │   └── Bullet.ts       # 子弹逻辑
│   └── GameConfig.ts       # 静态配置 (速度、伤害值、资源路径字典)
│
├── types/                  # [类型定义] 通用接口
│   └── index.ts            # 定义 Level 接口, MeshConfig 接口, Vector3 等
│
├── assets/                 # (如果是 Vite/Webpack，这里通常放代码引用的静态资源)
│
├── main.ts                 # [入口] 组装 Core 和 Game，启动引擎
└── index.html
```

## 分工

成员 A：核心框架 & 主循环（系统层）

关注点：
	•	Game Loop
	•	Input 系统
	•	Scene / Entity 管理
	•	项目结构与代码规范

这是“地基”，一旦不稳，全组都会被拖慢。

⸻

成员 B：渲染与图形学（渲染层）

关注点：
	•	Three.js / WebGL 管线
	•	相机、光照
	•	基础 shader（Phong / Blinn-Phong）
	•	后续“我可以不用 Three.js”的接口设计

这是老师最容易加分的部分。

⸻

成员 C：玩法 & 表现（游戏层）

关注点：
	•	玩家飞船控制
	•	敌人 / 子弹 / 碰撞
	•	场景布置（星空、行星）
	•	Demo 可玩性

这是展示效果的关键。