import { Time } from "./Time";
import { Input } from "./Input";
import { Scene } from "../scene/Scene";
import { LevelManager } from "./LevelManager";
import type { Renderer } from "../renderer/Renderer"; // 使用 type 避免运行时依赖
import type { AssetLoader } from "./AssetLoader";
import { UIManager } from "../ui/UIManager";

export class Game {
  // --- 核心系统 ---
  // 时间管理 (Delta Time, Elapsed Time)
  private time: Time;
  // 输入管理 (Keyboard, Mouse)
  private input: Input;
  // 渲染器 (Three.js / WebGL / WebGPU 的抽象接口)
  private renderer: Renderer;
  // 资源加载器 (保存已加载的 JSON, ArrayBuffer, Image)
  private loader: AssetLoader;
  // 关卡管理器 (负责切换关卡、运行当前关卡逻辑)
  public levelManager: LevelManager;
  // UI 管理器
  public uiManager: UIManager;

  // --- 数据容器 ---
  // 场景数据 (Entities, Camera) - 它是纯数据，不含游戏业务逻辑
  private scene: Scene;

  // --- 运行状态 ---
  private running: boolean = false;
  private container: HTMLElement | null = null;
  private animationFrameId: number | null = null;

  /**
   * 构造函数：依赖注入
   * @param renderer 具体渲染器的实例
   * @param loader 包含已加载资源的加载器
   */
  constructor(renderer: Renderer, loader: AssetLoader) {
    this.renderer = renderer;
    this.loader = loader;

    // 初始化基础子系统
    this.time = new Time();
    this.input = new Input();
    this.scene = new Scene();
    this.uiManager = new UIManager();
    
    // 初始化关卡管理器，将 Game 自身传进去，方便关卡访问 Scene/Input
    this.levelManager = new LevelManager(this);
  }

  /**
   * 初始化引擎环境
   * 注意：这里不运行游戏，只搭建舞台
   * @param containerId DOM 容器的 ID
   */
  public init(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`[Game] Container element '#${containerId}' not found.`);
    }
    this.container = container;

    // 1. 初始化输入监听 (绑定到 document 或 canvas)
    this.input.init(); // 假设 Input 类有 init 方法绑定 window 事件

    // 2. 初始化渲染器 (创建 Canvas, Context)
    this.renderer.init(container);

    // 3. 注入资源给渲染器 (关键步骤: Render Proxy 模式)
    // 渲染器需要用 raw data 生成 GPU 资源 (Texture, Mesh, VAO)
    // 这里的类型检查是为了安全，确保 renderer 实现了 initAssets
    if ('initAssets' in this.renderer) {
      (this.renderer as any).initAssets(this.loader);
    }

    // 4. 监听窗口大小变化
    window.addEventListener("resize", this.onResize);
    
    // 5. 初始触发一次 Resize 确保画面正确
    setTimeout(() => this.onResize(), 0);
  }

  /**
   * 启动主循环
   */
  public start(): void {
    if (this.running) return;
    
    console.log("🚀 Game Engine Started");
    this.running = true;
    this.time.reset();
    
    // 开始循环
    this.loop(0);
  }

  /**
   * 停止主循环
   */
  public stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 销毁游戏实例 (用于 SPA 页面切换时清理)
   */
  public destroy(): void {
    this.stop();
    window.removeEventListener("resize", this.onResize);
    this.input.dispose(); // 假设 Input 有清理监听的方法
    // this.renderer.dispose(); // 如果渲染器有清理方法
    
    if (this.container && this.container.innerHTML) {
        this.container.innerHTML = '';
    }
  }

  // =========================================
  //  核心主循环 (Game Loop)
  // =========================================
  private loop = (timestamp: number) => {
    if (!this.running) return;

    // 1. 更新时间
    this.time.update(timestamp);

    // 2. 更新逻辑 (Game Logic)
    // LevelManager 负责驱动具体的游戏规则 (刷怪、积分、剧情)
    this.levelManager.update(this.time.delta);
    
    // UI 逻辑更新
    this.uiManager.update(this.time.delta);

    // 3. 更新物理/世界 (Physics / World)
    // Scene 负责驱动所有实体的移动、动画、矩阵更新
    this.scene.update(this.time.delta);

    // 4. 渲染 (Rendering)
    // Renderer 读取 Scene 数据并绘制一帧
    this.renderer.render(this.scene, this.uiManager);

    // 5. 输入后处理 (Input Post-process)
    // 清除“本帧刚按下”的状态，防止连续触发
    this.input.clearFrame();

    // 请求下一帧
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // =========================================
  //  事件处理
  // =========================================
  private onResize = () => {
    if (!this.container) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // 1. 通知渲染器调整画布大小 (Canvas resolution)
    this.renderer.resize(width, height);

    // 2. 通知场景里的相机调整宽高比 (Aspect Ratio)
    this.scene.mainCamera.resize(width, height);
  };

  // =========================================
  //  Getters (供 Level 使用)
  // =========================================
  
  public getScene(): Scene {
    return this.scene;
  }

  public getInput(): Input {
    return this.input;
  }

  public getTime(): Time {
    return this.time;
  }
  
  public getLoader(): AssetLoader {
    return this.loader;
  }
  
  public getRenderer(): Renderer {
    return this.renderer;
  }

  public getUIManager(): UIManager {
    return this.uiManager;
  }
}