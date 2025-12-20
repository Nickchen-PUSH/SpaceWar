import './style.css';
import { Game } from "./core/Game";
import { AssetLoader } from "./core/AssetLoader";
import { ThreeRenderer } from "./renderer";
import { entryLevel } from "./game/levels/entryLevel";
/**
 * 游戏入口函数
 * 负责整个应用的生命周期初始化
 */
async function bootstrap() {
  console.log("🚀 Initializing Space Shooter Engine...");

  // ===========================================
  // 1. 准备资源 (Preload Assets)
  // ===========================================
  const loader = new AssetLoader();

  // 注册资源清单
  // 在实际项目中，这些路径通常指向 public/assets 文件夹
  loader.add("spaceship", "/UltimateSpaceships/Challenger/glTF/Challenger.gltf", "buffer");

  // 设置加载进度回调 (可以在这里更新 DOM 里的进度条)
  loader.onProgress = (progress: number) => {
    const percentage = Math.round(progress * 100);
    console.log(`[Loading] ${percentage}%`);

    // 如果你有 loading DOM 元素：
    // document.getElementById('loading-bar')!.style.width = `${percentage}%`;
  };

  try {
    // 等待所有资源加载完毕 (Async/Await)
    await loader.loadAll();
    console.log("✅ Assets Loaded successfully.");
  } catch (error) {
    console.error("❌ Asset loading failed:", error);
    // 可以在这里弹出一个 alert 或者显示错误页，不要继续执行了
    return;
  }

  // ===========================================
  // 2. 组装引擎 (Assemble Engine)
  // ===========================================

  // 2.1 创建具体的渲染器 (Three.js 实现)
  const renderer = new ThreeRenderer();

  // 2.2 创建核心引擎，注入渲染器和已加载的资源
  const game = new Game(renderer, loader);

  // 2.3 初始化 DOM 和 WebGL 上下文
  try {
    // 这里的 'app' 对应 index.html 里的 <div id="app"></div>
    game.init("app");
  } catch (e) {
    console.error("❌ Engine initialization failed:", e);
    return;
  }

  // ===========================================
  // 3. 注入游戏逻辑 (Inject Game Logic)
  // ===========================================

  // 创建第一关 (太空战斗)
  const startLevel = new entryLevel();

  // 告诉关卡管理器：请切换到这一关
  // 这会触发 entryLevel.onEnter()，里面会生成飞船和敌人
  game.levelManager.changeLevel(startLevel);

  // ===========================================
  // 4. 点火发射 (Ignition)
  // ===========================================

  // 移除 Loading 界面 (如果有的话)
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) loadingScreen.style.display = 'none';

  // 启动主循环
  game.start();

  // (可选) 暴露给 window 用于控制台调试
  (window as any).game = game;
}

// 执行启动
bootstrap().catch((err) => console.error("Fatal Error:", err));