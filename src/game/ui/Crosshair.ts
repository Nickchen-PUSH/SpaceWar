import { UISprite } from "../../ui";
import { Game } from "../../core/Game";

export class Crosshair {
  private sprite: UISprite;
  private game: Game;

  constructor(game: Game) {
    this.game = game;

    // 创建准心精灵
    // "crosshair" 是我们在 AssetLoader 中注册的 ID
    this.sprite = new UISprite("crosshair");

    // 设置初始大小 (例如 64x64 像素)
    this.sprite.setSize(64, 64);

    // 居中显示 (0, 0 是屏幕中心)
    this.sprite.setPosition(0, 0);

    // 稍微透明一点
    this.sprite.opacity = 0.8;

    // 添加到 UI 管理器
    this.game.getUIManager().addElement(this.sprite);
  }

  public update(delta: number): void {
    void delta;
    // 可以在这里添加准心动态效果，比如射击时扩散、随鼠标微动等
    // 目前保持静态居中
  }

  public destroy(): void {
    this.game.getUIManager().removeElement(this.sprite);
  }
}
