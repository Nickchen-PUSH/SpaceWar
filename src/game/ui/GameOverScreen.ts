import { UIRect, UIText, type UIElement } from "../../ui";
import type { Game } from "../../core/Game";

export class GameOverScreen {
  private readonly game: Game;

  private readonly container: UIElement;
  private readonly background: UIRect;
  private readonly title: UIText;
//   private readonly message: UIText;

  private blinkTime: number = 0;

  constructor(game: Game) {
    this.game = game;

    this.container = new UIRect(0, 0, 0, 0);
    this.container.setPosition(0, 0);

    this.background = new UIRect(0, 0, 0, 0.75);
    this.background.setSize(window.innerWidth, window.innerHeight);
    this.container.addChild(this.background);

    this.title = new UIText("MISSION FAILED", 56);
    this.title.setColor("#ff4d4f");
    this.container.addChild(this.title);

    // this.message = new UIText("Press R to Retry", 28);
    // this.message.setColor("#ffffff");
    // this.container.addChild(this.message);

    this.background.zIndex = -10;
    this.title.zIndex = 0;
    // this.message.zIndex = 1;

    this.game.getUIManager().addElement(this.container);

    this.layout();
    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => {
    this.layout();
  };

  private layout(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.background.setSize(width, height);

    // Center title slightly above center.
    this.title.setPosition(0, 40);
    // this.message.setPosition(0, -40);
  }

  public update(delta: number): void {
    this.blinkTime += delta;
    // const t = (this.blinkTime % 1.0) / 1.0;
    // this.message.visible = t < 0.6;
  }

  public destroy(): void {
    window.removeEventListener("resize", this.onResize);
    this.game.getUIManager().removeElement(this.container);
  }
}
