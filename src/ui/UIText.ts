import { UIElement } from "./UIElement";
import { vec4 } from "gl-matrix";

export class UIText extends UIElement {
  public text: string = "";
  public fontSize: number = 24;
  public fontName: string = "Arial";
  public color: string = "#ffffff";
  public canvas: HTMLCanvasElement;
  public isDirty: boolean = true; // 标记是否需要重新生成纹理

  constructor(text: string, fontSize: number = 24) {
    super();
    this.text = text;
    this.fontSize = fontSize;
    this.canvas = document.createElement("canvas");
    this.redraw();
  }

  public setText(text: string) {
    if (this.text !== text) {
      this.text = text;
      this.redraw();
    }
  }

  public setColor(color: string) {
    if (this.color !== color) {
      this.color = color;
      this.redraw();
    }
  }

  private redraw() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    // 1. 测量文字
    ctx.font = `${this.fontSize}px ${this.fontName}`;
    const metrics = ctx.measureText(this.text);
    const width = Math.ceil(metrics.width);
    const height = Math.ceil(this.fontSize * 1.2); // 稍微留点行高

    // 2. 调整 Canvas 大小
    // 注意：修改 canvas 尺寸会清空内容
    if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
    } else {
        ctx.clearRect(0, 0, width, height);
    }

    // 3. 绘制文字
    ctx.font = `${this.fontSize}px ${this.fontName}`;
    ctx.fillStyle = this.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, 0, height / 2);

    // 4. 更新 UIElement 的尺寸以匹配文字
    this.setSize(width, height);

    this.isDirty = true;
  }
}
