import { Scene } from "../scene/Scene";

export interface Renderer {
  /**
   * 初始化渲染器（比如挂载 Canvas 到 DOM）
   */
  init(container: HTMLElement): void;

  /**
   * 核心渲染循环：同步数据 -> 绘制画面
   */
  render(scene: Scene): void;

  /**
   * 处理窗口大小变化
   */
  resize(width: number, height: number): void;
}