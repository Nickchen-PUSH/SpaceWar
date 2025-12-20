import { Entity } from "./Entity";

/**
 * Represents the camera in the scene as a game entity.
 * By extending Entity, it gains position, rotation, and scale properties,
 * allowing it to be moved and manipulated like any other game object.
 */
export class Camera extends Entity {
  /*
  * Camera projection properties
  * @property {number} fov - Field of view in degrees.
  * @property {number} aspect - Aspect ratio (width / height).
  * @property {number} near - Near clipping plane distance.
  * @property {number} far - Far clipping plane distance.
  */

  public fov: number;
  public aspect: number;
  public near: number;
  public far: number;

  constructor(fov: number = 75, aspect: number = 1, near: number = 0.1, far: number = 1000) {
    super(); // Call the Entity constructor
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }

  /**
   * Updates the camera's aspect ratio.
   * @param width The new width.
   * @param height The new height.
   */
  public resize(width: number, height: number): void {
    this.aspect = width / height;
  }
}