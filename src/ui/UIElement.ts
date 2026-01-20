import { vec2 } from "gl-matrix";

/**
 * Base class for all UI elements in the 2D overlay system.
 * Coordinates are typically in "Screen Pixels" relative to the center (0,0).
 * +Y is Up, +X is Right.
 */
export abstract class UIElement {
  public id: string;
  public visible: boolean = true;

  // Generic opacity for visuals that support transparency (UIText, UIRect, etc.).
  // UISprite has its own opacity field and will keep using that.
  public opacity: number = 1.0;
  
  // Transform
  public position: vec2 = vec2.fromValues(0, 0);
  public scale: vec2 = vec2.fromValues(1, 1);
  public rotation: number = 0; // Radians

  // Size (in pixels, unscaled)
  public size: vec2 = vec2.fromValues(100, 100);

  // Hierarchy
  public parent: UIElement | null = null;
  public children: UIElement[] = [];

  // Render properties
  public zIndex: number = 0; // Higher is drawn on top

  constructor() {
    this.id = crypto.randomUUID();
  }

  public setPosition(x: number, y: number): void {
    vec2.set(this.position, x, y);
  }

  public setSize(w: number, h: number): void {
    vec2.set(this.size, w, h);
  }

  public setScale(x: number, y: number): void {
    vec2.set(this.scale, x, y);
  }

  public addChild(child: UIElement): void {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    child.parent = this;
    this.children.push(child);
  }

  public removeChild(child: UIElement): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  public update(delta: number): void {
    if (!this.visible) return;
    
    // Custom update logic per element
    this.onUpdate(delta);

    // Propagate
    for (const child of this.children) {
      child.update(delta);
    }
  }

  protected onUpdate(delta: number): void {
    void delta;
  }
}
