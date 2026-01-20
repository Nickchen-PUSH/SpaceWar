import { vec3 } from "gl-matrix";
import { Entity } from "@scene";
import { Ship } from "../ships/Ship";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * A lightweight thruster flame effect entity.
 *
 * NOTE: This entity is meant to be added to the Scene as a normal entity,
 * while having its `parent` set to a Ship (same pattern as TrailParticleEmitter).
 * Rendering is handled as a special-case in ThreeRenderer.
 */
export class ThrusterFlame extends Entity {
  public engineOffsets: vec3[];

  /** Base visual width in world units (scaled by intensity). */
  public baseWidth: number = 0.25;

  /** Max flame length in world units. */
  public maxLength: number = 3.0;

  /** Computed intensity in [0,1]. Renderer uses this. */
  public intensity: number = 0;

  private smoothing: number = 10; // higher = snappier response

  constructor(engineOffsets: vec3[] = [vec3.fromValues(0, 0, -2)]) {
    super();
    this.name = "ThrusterFlame";
    this.engineOffsets = engineOffsets;

    // This entity renders via renderer special-case, not via meshConfig.
    this.meshConfig = null;
  }

  public update(delta: number): void {
    const parentShip = this.parent as Ship;
    if (!parentShip) return;

    // Prefer direct input (snappy), then fallback to speed.
    const throttle01 = parentShip.getForwardThrottle01();

    const speed = vec3.length(parentShip.velocity);
    const speed01 = clamp01(speed / 80); // heuristic; tweak per feel

    const target = clamp01(throttle01 * 0.8 + speed01 * 0.2);

    // Exponential smoothing; stable under varying delta.
    const t = 1 - Math.exp(-this.smoothing * delta);
    this.intensity += (target - this.intensity) * t;

    // Always follow the ship transform for convenience (not strictly required).
    vec3.copy(this.position, parentShip.position);
    // rotation is quat; but Entity.rotation is quat; Ship.rotation is quat.
    // Copy by array for gl-matrix quat.
    this.rotation[0] = parentShip.rotation[0];
    this.rotation[1] = parentShip.rotation[1];
    this.rotation[2] = parentShip.rotation[2];
    this.rotation[3] = parentShip.rotation[3];
  }
}
