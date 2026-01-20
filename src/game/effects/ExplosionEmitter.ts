import { vec3 } from "gl-matrix";
import { Entity } from "@scene";

/**
 * 简单的爆炸粒子发射器（纯 CPU 更新，Renderer 负责绘制 Points + Sprite）
 */
interface ExplosionParticle {
    position: vec3;
    velocity: vec3;
    life: number;
    age: number;
    size: number;
    alpha: number;
    color: [number, number, number];
    kind?: 'core' | 'spark';
}

export class ExplosionEmitter extends Entity {
    particles: ExplosionParticle[] = [];
    maxParticles: number = 180;
    // 粒子初速度范围（基准）
    private minSpeed = 8;
    protected maxSpeed = 60;

    // 冲击波（用于 Sprite / ring）表现
    public shockAge: number = 0;
    public shockLife: number = 0.6;
    public shockRadius: number = 0;

    constructor() {
        super();
        this.name = "ExplosionEmitter";
        this.meshConfig = null;
        this.visible = true;
        this.active = true;

        // 分成两类粒子：核心大光斑（少量、体积大、慢），火花（多数、细长、快）
        const coreCount = Math.floor(this.maxParticles * 0.18);
        const sparkCount = this.maxParticles - coreCount;

        for (let i = 0; i < coreCount; i++) this.spawnInitialParticle('core');
        for (let i = 0; i < sparkCount; i++) this.spawnInitialParticle('spark');

        this.shockAge = 0;
        this.shockRadius = 0;
    }

    private spawnInitialParticle(kind: 'core' | 'spark' = 'spark') {
        const pPos = vec3.create();

        // random direction biased a bit toward the camera plane is optional; use full sphere
        const dir = vec3.fromValues(
            (Math.random() * 2 - 1),
            (Math.random() * 2 - 1),
            (Math.random() * 2 - 1)
        );
        const len = Math.max(1e-6, Math.hypot(dir[0], dir[1], dir[2]));
        vec3.scale(dir, dir, 1 / len);

        let speed: number;
        let life: number;
        let size: number;
        let color: [number, number, number];

        if (kind === 'core') {
            // 大光团：较慢，寿命更长，尺寸更大，橙->黄
            speed = this.minSpeed * 0.3 + Math.random() * (this.maxSpeed * 0.4);
            life = 0.9 + Math.random() * 1.6;
            size = 0.8 + Math.random() * 1.6;
            color = [1.0, 0.6 + Math.random() * 0.4, 0.05];
        } else {
            // 火花：快速、短命、偏白黄色、尺寸小
            speed = this.maxSpeed * 0.6 + Math.random() * (this.maxSpeed * 0.8);
            life = 0.3 + Math.random() * 0.9;
            size = 0.06 + Math.random() * 0.18;
            color = [1.0, 0.8 + Math.random() * 0.2, 0.4 * Math.random()];
        }

        const vel = vec3.create();
        vec3.scale(vel, dir, speed);

        this.particles.push({
            position: pPos,
            velocity: vel,
            life,
            age: 0,
            size,
            alpha: 1,
            color,
            kind,
        });
    }

    update(delta: number): void {
        if (!this.active) return;

        // update shock
        this.shockAge += delta;
        const shockT = Math.min(1, this.shockAge / this.shockLife);
        // shock radius growth (tuned value)
        this.shockRadius += delta * (30 + 40 * shockT); // world units per second

        let alive = 0;
        for (const p of this.particles) {
            p.age += delta;
            if (p.age >= p.life) {
                p.alpha = 0;
                p.size *= 0.94;
            } else {
                // physics
                p.position[0] += p.velocity[0] * delta;
                p.position[1] += p.velocity[1] * delta;
                p.position[2] += p.velocity[2] * delta;

                // subtle gravity for core / sparks (sparks less affected)
                const gravityScale = p.kind === 'core' ? 0.25 : 0.08;
                p.velocity[1] -= 9.8 * gravityScale * delta;

                // drag (sparks retain more speed)
                const dragFactor = p.kind === 'core' ? 0.92 : 0.86;
                p.velocity[0] *= Math.pow(dragFactor, delta * 60);
                p.velocity[1] *= Math.pow(dragFactor, delta * 60);
                p.velocity[2] *= Math.pow(dragFactor, delta * 60);

                // fade alpha and shrink slightly
                p.alpha = Math.max(0, 1 - p.age / p.life);
                p.size *= p.kind === 'core' ? 0.999 : 0.996;
                alive++;
            }
        }

        // 如果全部粒子死亡，自动销毁 self（交由 Scene 回收机制）
        if (alive === 0) {
            this.destroy();
        }
    }

    public destroy(): void {
        this.active = false;
        this.visible = false;
        this.particles = [];
    }
}