import { Renderer } from "../../src/renderer/Renderer";
import { Scene } from "../../src/scene/Scene";

export class MockRenderer implements Renderer {
  public renderCount = 0;
  public lastSceneReceived: Scene | null = null;

  init(container: HTMLElement) {
    // 假装初始化了
    console.log("MockRenderer initialized");
  }

  render(scene: Scene) {
    this.renderCount++;
    this.lastSceneReceived = scene;
    // 这里什么都不画，纯逻辑验证
  }

  resize(w: number, h: number) {
    console.log(`MockRenderer resized to ${w}x${h}`);
  }
  
  // 模拟资源加载接口
  initAssets(loader: any) {}
}