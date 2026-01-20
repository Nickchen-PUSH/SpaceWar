import { UIRect, UIText, UIElement, UISprite } from "../../ui";
import { Game } from "../../core/Game";

export class StartScreen {
  private container: UIElement;
  private background: UIRect;
  private logo: UISprite;
  private message: UIText;
  private game: Game;

  private blinkTime: number = 0;

  constructor(game: Game) {
    this.game = game;

    // 1. Container (用于整体管理)
    this.container = new UIRect(0, 0, 0, 0);
    this.container.setPosition(0, 0); // 屏幕中心
    
    // 2. 全屏背景 (半透明黑)
    this.background = new UIRect(0, 0, 0, 0.7);
    this.background.setSize(window.innerWidth, window.innerHeight);
    this.container.addChild(this.background);

    // 3. Logo
    this.logo = new UISprite("mav_logo");
    this.container.addChild(this.logo);

    // 4. 文字（闪烁）
    this.message = new UIText("PRESS ANY KEY TO START", 34);
    this.message.setColor("#ffffff");
    this.container.addChild(this.message);

    // Layering
    this.background.zIndex = -10;
    this.logo.zIndex = 0;
    this.message.zIndex = 1;

    // 添加到 UI Manager
    this.game.getUIManager().addElement(this.container);

    // 首次布局 + 监听窗口大小变化
    this.layout();
    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => {
    this.layout();
  };

  private layout() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.background.setSize(width, height);

    // Logo size: keep aspect ratio if we can read the image
    const img = this.game.getLoader().get<HTMLImageElement>("mav_logo");
    const maxLogoWidth = Math.min(720, width * 0.65);
    const logoAspect = img && img.width > 0 && img.height > 0 ? img.width / img.height : 3.2;
    const logoWidth = maxLogoWidth;
    const logoHeight = logoWidth / logoAspect;
    this.logo.setSize(logoWidth, logoHeight);

    // Center logo with a slight upward bias
    this.logo.setPosition(0, Math.min(80, height * 0.12));

    // Prompt under logo
    const promptY = this.logo.position[1] - logoHeight / 2 - 60;
    this.message.setPosition(0, promptY);
  }

  public update(delta: number) {
    // Blink every ~1s
    this.blinkTime += delta;
    const t = (this.blinkTime % 1.0) / 1.0;
    this.message.visible = t < 0.6;
  }

  public destroy() {
    window.removeEventListener("resize", this.onResize);
    this.game.getUIManager().removeElement(this.container);
  }
}
