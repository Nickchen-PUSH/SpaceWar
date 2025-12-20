import type { Vector3 } from "../types"; // 假设我们在 types/index.ts 定义了 Vector3

import { Entity } from "./Entity";

/**
 * Represents the camera in the scene as a game entity.
 * By extending Entity, it gains position, rotation, and scale properties,
 * allowing it to be moved and manipulated like any other game object.
 */
export class Camera extends Entity {
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