import { Entity } from "./Entity";
import { vec3 } from "gl-matrix";

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
    this.name = "MainCamera";
  }

  public getFront(): vec3 {
    // 纠正camera方向
    const front = vec3.fromValues(0, 0, -1);
    vec3.transformQuat(front, front, this.rotation);
    vec3.normalize(front, front);
    return front;
  }

  protected maxSpeed: number = 100;  // [m/s]
  protected maxAcceleration: number = 20;  // [m/s²]
  protected maxAngularSpeed: number = 10.0;  // [rad/s]
  protected maxAngularAcceleration: vec3 = vec3.fromValues(10, 10, 10);  // [rad/s²] 每个轴的最大角加速度[pitch, yaw, roll]
  
  protected drag: number = 0.5;
  protected angularDrag: number = 0.2;

  /**
   * Updates the camera's aspect ratio.
   * @param width The new width.
   * @param height The new height.
   */
  public resize(width: number, height: number): void {
    this.aspect = width / height;
  }

  public update(delta: number): void {
    // 调用父类的更新逻辑以应用物理模拟
    this.applyPhysics(delta);
  }
}