import { vec3 } from 'gl-matrix';
import { Entity } from "../../scene/Entity";
import { Ship } from '../ships/Ship';

interface Particle {
  position: vec3; // 局部坐标
  velocity: vec3; 
  lifetime: number;
  alpha: number;   // 新增：用于控制粒子的淡入淡出
}

export class TrailParticleEmitter extends Entity {
  particles: Particle[] = [];
  maxParticles = 5000; 
  
  protected rangeZ = 150; 
  private spreadX = 60; 
  private spreadY = 40;

  constructor() {
    super();
    this.name = 'TrailParticleEmitter';
  }

  update(delta: number): void {
    const parentShip = this.parent as Ship;
    if (!parentShip) return;

    // 获取飞船当前速度
    const shipSpeed = parentShip.velocity ? vec3.length(parentShip.velocity) : 0;

    // 1. 初始化粒子池
    if (this.particles.length < this.maxParticles) {
      for (let i = 0; i < this.maxParticles - this.particles.length; i++) {
        this.spawnInitialParticle();
      }
    }

    // 2. 更新粒子
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // --- 关键改进：粒子流速完全取决于飞船速度 ---
      // 这里的 1.2 是感官系数，可以根据需要调整。
      // 如果 shipSpeed 为 0，driftSpeed 就是 0，粒子会停在原地。
      const driftSpeed = shipSpeed * 1.2; 
      
      p.position[2] -= driftSpeed * delta; 

      // 3. 动态控制透明度 (Alpha)
      // 如果飞船太慢，粒子应该变透明，避免停留在屏幕上像灰尘
      const targetAlpha = shipSpeed > 5 ? 1.0 : shipSpeed / 5.0;
      p.alpha += (targetAlpha - p.alpha) * 0.1; // 平滑过渡

      // 4. 边界循环
      if (p.position[2] < -50) {
        // 只有在飞船移动时才重置到前方，否则粒子就在后方待命
        if (shipSpeed > 0.1) {
          this.resetParticle(p);
        }
      }
    }
  }

  private resetParticle(p: Particle) {
    p.position[0] = (Math.random() - 0.5) * this.spreadX;
    p.position[1] = (Math.random() - 0.5) * this.spreadY;
    p.position[2] = 100 + Math.random() * 50; 
    p.lifetime = 1.0;
  }

  private spawnInitialParticle() {
    const p: Particle = {
      position: vec3.fromValues(
        (Math.random() - 0.5) * this.spreadX,
        (Math.random() - 0.5) * this.spreadY,
        Math.random() * this.rangeZ - 50 
      ),
      velocity: vec3.create(),
      lifetime: 1.0,
      alpha: 0
    };
    this.particles.push(p);
  }
}