import { UIElement } from "./UIElement";

export class UISprite extends UIElement {
  public textureId: string;
  public opacity: number = 1.0;
  
  /**
   * @param textureId The ID of the texture asset loaded via AssetLoader
   */
  constructor(textureId: string) {
    super();
    this.textureId = textureId;
  }
}
