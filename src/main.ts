import './style.css';
import { Game } from "./core/Game";
import { AssetLoader } from "./core/AssetLoader";
import { ThreeRenderer } from "./renderer";
import { combatLevel } from './game/levels/combatLevel';
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
  loader.add("ship_x-wing", "models/high_poly_x-wing_fighter.glb");
  loader.add("ship_t-fighter", "models/star_wars_tieln_fighter.glb");
  loader.add("sky_galaxy", "textures/environment.hdr");
  loader.add("ship_challenger_v1", "models/ship_challenger_v1.gltf");
  loader.add("crosshair", "textures/crosshair019.png");
  loader.add("crosshair-hit", "textures/crosshair018.png");
  loader.add("white_block", "textures/crosshair026.png")
  loader.add("mav_logo", "textures/mavlogo.png");
  loader.add("meteor_a", "models/meteor_a.glb");
  loader.add("meteor_b", "models/meteor_b.glb");
  loader.add("meteor_c", "models/meteor_c.glb");
  loader.add("meteor_d", "models/meteor_d.glb");
  loader.add("lava_planet", "models/lava_planet.glb");
  loader.add("mercury_planet", "models/mercury_planet.glb");
  loader.add("earth", "models/earth.glb");


  // 设置加载进度回调：更新黑屏加载条 (DOM)
  const loadingBar = document.getElementById("loading-bar");
  const loadingPercent = document.getElementById("loading-percent");
  loader.onProgress = (progress: number) => {
    const percentage = Math.max(0, Math.min(100, Math.round(progress * 100)));
    console.log(`[Loading] ${percentage}%`);
    if (loadingBar) (loadingBar as HTMLElement).style.width = `${percentage}%`;
    if (loadingPercent) loadingPercent.textContent = `${percentage}%`;
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

  const startLevel = new combatLevel();
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