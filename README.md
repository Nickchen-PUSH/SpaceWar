# SpaceWar

基于 TypeScript + Vite + Three.js 的浏览器 3D 太空射击/飞行小游戏。

## 快速开始

### 环境要求

- Node.js 20+（仓库 CI 使用 Node 20）

### 安装依赖

```bash
npm install
```

### 本地开发（热更新）

```bash
npm run dev
```

### 构建与预览

```bash
npm run build
npm run preview
```

如果你想模拟 GitHub Pages 的相对路径构建（避免资源路径指向 `/assets/...`）：

```bash
GITHUB_PAGES=true npm run build
npm run preview
```

### 测试

```bash
npm test
```

可视化测试界面：

```bash
npm run test:ui
```

## 操作说明（默认）

- 推进/减速：`W` / `S`
- 偏航（左右转向）：`A` / `D`
- 俯仰：`↑` / `↓`
- 滚转：`←` / `→`
- 开火：鼠标左键 或 `Space`
- 切换鼠标操控模式：`M`
	- 鼠标模式：鼠标上下控制俯仰、鼠标左右控制滚转，`A/D` 控制偏航
	- 键盘模式：方向键控制俯仰/滚转，`A/D` 控制偏航

## 部署（GitHub Pages）

- 已支持用 GitHub Actions 自动部署到 GitHub Pages：`.github/workflows/deploy-pages.yml`
- 启用方式：GitHub 仓库 Settings → Pages → Source 选择 “GitHub Actions”
- 每次 push 到 `main` 会自动执行：`npm ci` → `npm run build` → 部署 `dist/`
- 站点地址通常为：`https://<owner>.github.io/<repo>/`

## Docker（可选）

仓库提供了简单的 Nginx 静态站点镜像（多阶段构建）。

```bash
docker build -t spacewar .
docker run --rm -p 8080:80 spacewar
```

然后访问：`http://localhost:8080`

## 项目结构

```text
public/
	models/                   # glTF/GLB 等模型资源
	textures/                 # 环境贴图、UI 贴图等

src/
	core/                     # 引擎核心：主循环、输入、时间、资源、关卡管理
		Game.ts
		Input.ts
		Time.ts
		AssetLoader.ts
		LevelManager.ts

	renderer/                 # 渲染层：Renderer 接口 + Three.js 实现
		Renderer.ts
		TextRenderer.ts
		threejs/
			ThreeRenderer.ts

	scene/                    # 场景数据层：Entity/Scene/Camera 等
		Entity.ts
		Scene.ts
		Camera.ts

	ui/                       # 通用 UI 系统（UIManager + 基础控件）
		UIManager.ts
		UIElement.ts
		UISprite.ts
		UIText.ts

	game/                     # 游戏逻辑：关卡、玩家/敌人控制器、飞船/子弹、特效与 HUD
		levels/
		gamecontrollers/
		cameracontrollers/
		ships/
		objects/
		effects/
		collision/
		ui/

	types/                    # 公共类型
	main.ts                   # 程序入口：加载资源、初始化引擎、进入初始关卡
	style.css
```

## 资源与注意事项

- 运行时静态资源位于 `public/`（Vite 会原样拷贝到构建产物中）。
- 如果你在 GitHub Pages 下遇到资源 404，优先用 `GITHUB_PAGES=true npm run build` 进行验证。
