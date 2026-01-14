import { UIElement } from "./UIElement";

export class UIManager {
  private roots: UIElement[] = [];

  constructor() {}

  public addElement(element: UIElement): void {
    this.roots.push(element);
  }

  public removeElement(element: UIElement): void {
    const index = this.roots.indexOf(element);
    if (index !== -1) {
      this.roots.splice(index, 1);
    }
  }

  public getElements(): UIElement[] {
    return this.roots;
  }

  public update(delta: number): void {
    for (const root of this.roots) {
      root.update(delta);
    }
  }
}
