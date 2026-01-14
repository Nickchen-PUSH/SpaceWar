import { UIElement } from "./UIElement";
import { vec4 } from "gl-matrix";

export class UIRect extends UIElement {
  public color: vec4; // RGBA

  constructor(r: number, g: number, b: number, a: number = 1.0) {
    super();
    this.color = vec4.fromValues(r, g, b, a);
  }

  public setColor(r: number, g: number, b: number, a: number = 1.0) {
    vec4.set(this.color, r, g, b, a);
  }
}
