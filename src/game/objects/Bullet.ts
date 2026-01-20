import { Entity } from "@scene";
import { vec3, quat } from "gl-matrix";
import type { Game } from "../../core/Game.ts";
import type { Ship } from "../ships/Ship.ts";
import { BulletLaserEmitter } from "../effects/BulletLaserEmitter.ts";
import { Debug, LogChannel } from "../../core/Debug.ts";

export class Bullet extends Entity {
  private lifeTime = 2.0;  // 存活时间
  private age = 0;  // 当前存活时间

  private damage = 10;  // 伤害值
  public hitRadius = 5.0;  // 攻击范围
  private owner: Ship;  // 发射者

  private traveled = 0;  // 已飞行距离
  private maxRange = 1000;  // 最大飞行距离

  protected game: Game;

  constructor(
    position: vec3,
    direction: vec3,
    owner: Ship,
    game: Game,
    damage: number = 10
  ) {
    super();
    this.name = "Bullet";

    this.owner = owner;
    this.game = game;
    
    // 子弹是动态实体，但不参与复杂物理
    this.isStatic = false;
    // 渲染设置
    this.meshConfig = null;
    this.visible = true;
    
    vec3.copy(this.position, position);
    
    // ===== 初始高速 =====
    this.maxSpeed = 300;
    const bulletSpeed = 300;
    const dir = vec3.create();
  
    this.damage = damage;
    vec3.normalize(dir, direction);
    vec3.scale(this.velocity, dir, bulletSpeed);
    
    // 新增：使子弹局部 +Z 对齐 velocity（保证粒子局部Z变换后朝向正确）
    if (vec3.length(this.velocity) > 1e-6) {
      const rotQuat = quat.create();
      quat.rotationTo(rotQuat, vec3.fromValues(0, 0, 1), dir);
      quat.normalize(rotQuat, rotQuat);
      quat.copy(this.rotation, rotQuat);
    }

    this.setScale(0.08);

    // ===== 子弹激光粒子 =====
    const laser = new BulletLaserEmitter();
    laser.parent = this;
    this.children.push(laser);
  }

  update(delta: number): void {
    if (!this.active) return;

    // 1. 使用 Entity 自带的速度 / 阻力 / 位移逻辑
    super.update(delta);

    // 2. 累计飞行距离
    const speed = vec3.length(this.velocity);
    this.traveled += speed * delta;

    // 3. 生命周期
    this.age += delta;
    if (this.age > this.lifeTime || this.traveled > this.maxRange) {
      this.destroy();
      return;
    }

    // 4. 碰撞检测
    this.checkHit();

    // 5. 子节点
    for (const child of this.children) {
      child.update(delta);
    }

    // Debug.log(LogChannel.GameLogic, `Bullet position: ${this.position[0].toFixed(2)}, ${this.position[1].toFixed(2)}, ${this.position[2].toFixed(2)}`);
    // Debug.log(LogChannel.GameLogic, `Bullet velocity: ${this.velocity[0].toFixed(2)}, ${this.velocity[1].toFixed(2)}, ${this.velocity[2].toFixed(2)}`);
  }

  private checkHit(): void {
    const scene = this.game.getScene();
    if (!scene) return;

    for (const shipId of scene.ships) {
      if (shipId === this.owner.id) continue;

      const target = scene.entities.find(e => e.id === shipId);
      if (!target || !target.active) continue;

      const dist = vec3.distance(this.position, target.position);
      if (dist < this.hitRadius + (target as any).hitRadius) {
        (target as any).takeDamage(this.damage);
        Debug.log(LogChannel.System, "Hit!");

        this.destroy();
        return;
      }
    }
  }

  private destroy(): void {
    this.active = false;
    this.visible = false;
    // 递归销毁所有子节点
    for (const child of this.children) {
      const anyChild = child as any;
      if (typeof anyChild.destroy === "function") {
        anyChild.destroy();
      } else {
        child.active = false;
        child.visible = false;
      }
    }
  }
}
