import { UIRect, UIText, UIElement } from "../../ui";
import { Game } from "../../core/Game";

export class StartScreen {
  private container: UIElement;
  private background: UIRect;
  private message: UIText;
  private game: Game;

  constructor(game: Game) {
    this.game = game;

    // 1. Container (用于整体管理)
    this.container = new UIRect(0, 0, 0, 0);
    this.container.setPosition(0, 0); // 屏幕中心
    
    // 2. 全屏背景 (半透明黑)
    this.background = new UIRect(0, 0, 0, 0.7);
    this.background.setSize(window.innerWidth, window.innerHeight);
    this.container.addChild(this.background);

    // 3. 文字
    this.message = new UIText("Press any key to START", 40);
    this.message.setColor("#ffffff");
    this.message.setPosition(0, 0); // 居中
    this.container.addChild(this.message);

    // 添加到 UI Manager
    this.game.getUIManager().addElement(this.container);

    // 监听窗口大小变化以调整背景
    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => {
    this.background.setSize(window.innerWidth, window.innerHeight);
  }

  public destroy() {
    window.removeEventListener("resize", this.onResize);
    this.game.getUIManager().removeElement(this.container);
  }
}
