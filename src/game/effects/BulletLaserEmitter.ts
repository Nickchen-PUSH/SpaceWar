import { vec3, quat } from "gl-matrix";
import { Entity } from "@scene";
import { Bullet } from "../objects/Bullet";
import { Debug, LogChannel } from "../../core/Debug";

interface Particle {
  position: vec3; // 局部坐标
  velocity: vec3;
  lifetime: number;
  alpha: number;   // 用于控制粒子的淡入淡出
}

export class BulletLaserEmitter extends Entity {
  particles: Particle[] = [];
  maxParticles = 800;
  protected rangeZ = 40;

  constructor() {
    super();
    this.name = 'BulletLaserEmitter';
  }

  update(delta: number): void {
    const parent = this.parent as Bullet;
    if (!parent) return;

    // 粒子在局部 Z 轴分布，渲染时由 ThreeRenderer 使用 parent 的 position/rotation 转换到世界空间
    const Speed = vec3.length(parent.velocity);

    // 初始化粒子池
    while (this.particles.length < this.maxParticles) {
      this.spawnInitialParticle();
    }

    const driftSpeed = Math.max(1e-3, Speed) * 1.2;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // 仅沿局部 Z 轴移动（保持 X/Y = 0）
      p.position[2] -= driftSpeed * delta;

      // 当粒子越过近端时循环回尾端（避免瞬间重置到随机导致散布）
      if (p.position[2] <= 0) {
        p.position[2] += this.rangeZ;
        p.alpha = 0; // 重生时从 0 开始淡入
      }

      // alpha 随速度平滑变化
      const targetAlpha = Math.min(1.0, Math.max(0.0, Speed / 100)); // 可根据视觉调节分母
      p.alpha += (targetAlpha - p.alpha) * 0.2;
    }
  }

  private resetParticle(p: Particle) {
    const t = Math.random();
    // 只在局部 Z 轴分布，X/Y 固定为 0
    vec3.set(p.position, 0, 0, t * this.rangeZ);
    vec3.set(p.velocity, 0, 0, 0);
    p.lifetime = 1.0;
    p.alpha = 0;
  }

  private spawnInitialParticle() {
    const t = Math.random();
    const pos = vec3.fromValues(0, 0, t * this.rangeZ);
    const p: Particle = {
      position: pos,
      velocity: vec3.create(),
      lifetime: 1.0,
      alpha: 0
    };
    this.particles.push(p);
  }

  public destroy(): void {
    this.active = false;
    this.visible = false;
    this.particles = [];
  }
}
