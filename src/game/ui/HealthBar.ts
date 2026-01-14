import { UIRect, UIElement } from "../../ui";
import { Game } from "../../core/Game";
import { Ship } from "../ships/Ship";
import { vec4 } from "gl-matrix";

export class HealthBar {
  private container: UIElement;
  private background: UIRect;
  private fill: UIRect;
  private game: Game;
  private target: Ship | null = null;
  
  // 尺寸配置
  private width: number = 200;
  private height: number = 20;
  private padding: number = 2;

  constructor(game: Game) {
    this.game = game;

    // 1. 容器 (用于定位)
    this.container = new UIRect(0, 0, 0, 0); // 透明容器
    // 默认放到左下角。注意：(0,0)是屏幕中心。
    // 左下角大概是 (-screenW/2 + margin, -screenH/2 + margin)
    // 我们在 update 中动态计算位置，或者这里先设置一个初始值
    this.container.visible = false; 

    // 2. 背景框 (黑色半透明)
    this.background = new UIRect(0.1, 0.1, 0.1, 0.8);
    this.background.setSize(this.width + this.padding * 2, this.height + this.padding * 2);
    this.container.addChild(this.background);

    // 3. 血条填充 (绿色)
    this.fill = new UIRect(0.2, 0.8, 0.2, 1.0);
    this.fill.setSize(this.width, this.height);
    this.container.addChild(this.fill);

    // 添加到 UI Manager
    this.game.getUIManager().addElement(this.container);
  }

  public setTarget(ship: Ship) {
    this.target = ship;
    this.container.visible = true;
  }

  public update(delta: number) {
    if (!this.target) return;

    // 1. 更新血条长度
    const healthPct = Math.max(0, this.target.health / this.target.maxHealth);
    
    // 颜色随血量变化 (绿 -> 黄 -> 红)
    if (healthPct > 0.6) {
      this.fill.setColor(0.2, 0.8, 0.2, 1.0); // Green
    } else if (healthPct > 0.3) {
      this.fill.setColor(0.8, 0.8, 0.2, 1.0); // Yellow
    } else {
      this.fill.setColor(0.8, 0.2, 0.2, 1.0); // Red
    }

    // 2. 缩放与对齐
    // 注意：默认 UIElement 锚点是中心。如果 scale X，它是从中心缩放。
    // 为了让它看起来是从左往右缩减，我们需要调整 x 坐标。
    // 原始宽度 W，缩放 S。新宽度 W*S。
    // 原始左边缘 L = -W/2。
    // 新中心 C = L + (W*S)/2 = -W/2 + W*S/2 = W/2 * (S - 1)
    
    this.fill.setScale(healthPct, 1);
    this.fill.setPosition( (this.width / 2) * (healthPct - 1), 0 );

    // 3. 屏幕定位 (响应窗口大小变化)
    // 放到左下角
    const renderer = this.game.getRenderer();
    if ('uiCamera' in renderer) {
       // @ts-ignore
       const cam = (renderer as any).uiCamera as THREE.OrthographicCamera;
       if (cam) {
           const left = cam.left;
           const bottom = cam.bottom;
           // 留 20px 边距
           this.container.setPosition(left + this.width/2 + 30, bottom + this.height/2 + 30);
       }
    }
  }

  public destroy() {
    this.game.getUIManager().removeElement(this.container);
  }
}
