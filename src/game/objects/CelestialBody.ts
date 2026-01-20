import { Entity } from "@scene";
import type { MeshConfig } from "@scene";
import { vec3, quat } from "gl-matrix";

export type SpinSpace = "world" | "local";

export interface CelestialBodyOptions {
  position?: vec3;
  rotation?: quat;
  scale?: number | vec3;

  velocity?: vec3;
  angularVelocity?: vec3;

  drag?: number;
  angularDrag?: number;

  hitRadius?: number;

  spinAxis?: vec3;
  spinSpeed?: number; // rad/s
  spinSpace?: SpinSpace;

  /** If set, auto-despawn when distance to origin exceeds this value. */
  maxDistanceFromOrigin?: number;

  /** Mark as static (no integration). */
  isStatic?: boolean;
}

const DEFAULT_SPIN_AXIS = vec3.fromValues(0, 1, 0);
const TEMP_VEC3 = vec3.create();
const TEMP_QUAT = quat.create();

/**
 * “星体”基类：用于行星/陨石/小天体等。
 *
 * 设计目标：
 * - 复用通用属性（mesh、碰撞半径、速度、自转/角速度）
 * - 不依赖 `Entity.applyPhysics` 的“只能向前”约束
 * - 提供最小但够用的生命周期管理（越界自动销毁）
 */
export abstract class CelestialBody extends Entity {
  public hitRadius: number;

  protected spinAxis: vec3;
  protected spinSpeed: number;
  protected spinSpace: SpinSpace;

  protected maxDistanceFromOrigin?: number;

  constructor(name: string, meshConfig: MeshConfig | null, options: CelestialBodyOptions = {}) {
    super();
    this.name = name;

    this.meshConfig = meshConfig;
    this.visible = true;

    this.isStatic = options.isStatic ?? false;

    this.drag = options.drag ?? 1;
    this.angularDrag = options.angularDrag ?? 1;

    this.hitRadius = options.hitRadius ?? 5;

    this.spinAxis = vec3.clone(options.spinAxis ?? DEFAULT_SPIN_AXIS);
    if (vec3.length(this.spinAxis) < 1e-6) {
      vec3.copy(this.spinAxis, DEFAULT_SPIN_AXIS);
    }
    vec3.normalize(this.spinAxis, this.spinAxis);

    this.spinSpeed = options.spinSpeed ?? 0;
    this.spinSpace = options.spinSpace ?? "world";

    this.maxDistanceFromOrigin = options.maxDistanceFromOrigin;

    if (options.position) vec3.copy(this.position, options.position);
    if (options.rotation) quat.copy(this.rotation, options.rotation);
    if (options.scale !== undefined) this.setScale(options.scale);

    if (options.velocity) vec3.copy(this.velocity, options.velocity);
    if (options.angularVelocity) vec3.copy(this.angularVelocity, options.angularVelocity);
  }

  /** 子类可覆写：在积分前调整速度/状态等。 */
  protected onUpdate(_delta: number): void {
    void _delta;
  }

  /** 子类可覆写：用于判定何时自动销毁。 */
  protected shouldDespawn(): boolean {
    if (this.maxDistanceFromOrigin === undefined) return false;
    return vec3.length(this.position) > this.maxDistanceFromOrigin;
  }

  /** 默认销毁：仅隐藏+停用（ThreeRenderer 会清掉渲染对象）。 */
  public destroy(): void {
    this.active = false;
    this.visible = false;

    for (const child of this.children) {
      if (typeof (child as any).destroy === "function") {
        (child as any).destroy();
      } else {
        child.active = false;
        child.visible = false;
      }
    }
  }

  public setSpin(axis: vec3, speed: number, space: SpinSpace = "world"): void {
    vec3.copy(this.spinAxis, axis);
    if (vec3.length(this.spinAxis) < 1e-6) {
      vec3.copy(this.spinAxis, DEFAULT_SPIN_AXIS);
    }
    vec3.normalize(this.spinAxis, this.spinAxis);
    this.spinSpeed = speed;
    this.spinSpace = space;
  }

  public override update(delta: number): void {
    if (!this.active) return;

    this.onUpdate(delta);

    // 静态星体：不做平移/角速度积分，但依然允许执行自转（spinSpeed）
    this.integrateKinematics(delta);

    if (this.shouldDespawn()) {
      this.destroy();
      return;
    }

    for (const child of this.children) {
      child.update(delta);
    }
  }

  private integrateKinematics(delta: number): void {
    if (!this.isStatic) {
      // --- linear ---
      vec3.scale(this.velocity, this.velocity, Math.pow(this.drag, delta));
      vec3.scaleAndAdd(this.position, this.position, this.velocity, delta);

      // --- angular (vector) ---
      vec3.scale(this.angularVelocity, this.angularVelocity, Math.pow(this.angularDrag, delta));
      const angularSpeed = vec3.length(this.angularVelocity);
      if (angularSpeed > 1e-6) {
        vec3.scale(TEMP_VEC3, this.angularVelocity, 1 / angularSpeed);
        quat.setAxisAngle(TEMP_QUAT, TEMP_VEC3, angularSpeed * delta);
        quat.multiply(this.rotation, this.rotation, TEMP_QUAT);
      }
    }

    // --- spin (axis + scalar) ---
    if (Math.abs(this.spinSpeed) > 1e-6) {
      const angle = this.spinSpeed * delta;
      if (this.spinSpace === "world") {
        this.rotateOnWorldAxis(this.spinAxis, angle);
      } else {
        quat.setAxisAngle(TEMP_QUAT, this.spinAxis, angle);
        quat.multiply(this.rotation, this.rotation, TEMP_QUAT);
      }
    }
  }
}
