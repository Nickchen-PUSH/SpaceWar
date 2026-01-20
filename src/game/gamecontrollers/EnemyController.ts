import { Game } from "../../core/Game";
import { Ship } from "../ships/Ship";
import { vec3, quat } from "gl-matrix";
import { Debug, LogChannel } from "../../core/Debug";
import { Planet } from "@game/objects/Planet";

const EnemyState = {
  Patrol: "Patrol",
  Chase: "Chase",
  Attack: "Attack",
  Evade: "Evade",
} as const;

type EnemyState = (typeof EnemyState)[keyof typeof EnemyState];

type EnemyStateData = {
  state: EnemyState;
  stateTime: number;
  fireCooldown: number;
  patrolTurn: vec3;
  nextPatrolChange: number;
  orbitSign: number;
  nextOrbitChange: number;
};

export class EnemyController {
  private game: Game;
  private target: Ship;
  private enemies: Ship[] = [];
  private enemyStates: Map<string, EnemyStateData> = new Map();

  // =============================
  // 参数调优（可直接调这些数值）
  // =============================
  // 说明：
  // - 距离单位是世界单位（与 Ship/Entity 物理一致，通常可理解为米）。
  // - dot 阈值是余弦值：dot=1 表示正对目标，dot=0 表示正侧方。
  // - throttle/pitch/yaw/roll 是归一化控制输入，范围 [-1, 1]。

  // --- 距离 / 状态切换 ---
  // 目标进入该范围：Patrol -> Chase
  private detectionRange: number = 160;
  // 目标超过该范围：Chase -> Patrol
  private loseRange: number = 360;
  // 足够接近且对准：Chase -> Attack
  private attackRange: number = 120;
  // 认为“过近”的距离：用于触发 Evade 以及接近减速
  private tooCloseRange: number = 40;
  // tooCloseRange 的提前触发倍率（补偿惯性，避免冲脸）
  private tooCloseBuffer: number = 1.35;
  // 进入该范围后开始绕飞/侧切
  private orbitRange: number = 70;

  // --- 朝向阈值（点乘 dot(front, toTarget)） ---
  // dot 超过该值：允许进入 Attack
  private chaseToAttackFacingDot: number = 0.85;
  // dot 超过该值：允许开火
  private fireFacingDot: number = 0.92;
  // 出生安全：在 detectionRange 内且对准到该程度，则初始先 Evade
  private spawnEvadeFacingDot: number = 0.85;
  // 如果已经明显背对目标（dot 小于该值），停止绕飞，优先转回去
  private orbitFacingAwayDot: number = -0.2;

  // --- 时间参数（单位：秒） ---
  // 射击最小间隔
  private fireInterval: number = 0.35;
  // Evade 持续多久后（且距离足够）才考虑回到 Chase
  private evadeDuration: number = 3;
  // Patrol 随机换向间隔 [min, max]
  private patrolChangeMin: number = 1.2;
  private patrolChangeMax: number = 2.6;
  // 绕飞方向（左/右）随机切换间隔 [min, max]
  private orbitChangeMin: number = 1.0;
  private orbitChangeMax: number = 2.2;

  // --- Patrol 行为 ---
  // 巡逻时的固定油门
  private patrolThrottle: number = 0.7;
  // 限制巡逻时的转向幅度，避免“扭来扭去/原地打滚”
  private patrolMaxYaw: number = 0.25;
  private patrolMaxPitch: number = 0.18;
  private patrolMaxRoll: number = 0.35;
  // 使用当前角速度做反馈阻尼，稳定姿态
  private patrolAngularDamping: number = 0.12;

  // --- 绕飞 / 侧切 行为 ---
  // 侧向分量强度：在 orbitRange 边缘较小，靠近 tooCloseRange 时更强
  private orbitStrengthMin: number = 0.18;
  private orbitStrengthMax: number = 0.55;
  // Attack 时主要保持对准，但加入少量侧向漂移
  private attackOrbitStrength: number = 0.05;
  // Attack 时只有在“已经基本对准”时才加侧漂
  private attackOrbitMinFacingDot: number = 0.6;

  // --- 接近时油门控制 ---
  // 将距离映射到油门的尺度（attackRange * scale）
  private approachDistanceScale: number = 1.2;
  // 最小油门：避免敌机看起来“停住不动”
  private minApproachThrottle: number = 0.25;
  // 近距离且对准时的油门上限（减少撞脸）
  private closeAlignedThrottleCap: number = 0.25;
  // 判定“近距离”的倍率：distance < attackRange * factor
  private closeAlignedRangeFactor: number = 0.95;
  // 判定“已对准”的阈值：facingDot > threshold
  private closeAlignedFacingDot: number = 0.6;

  // --- 其他行为系数 ---
  // 出生安全：若出生距离小于 attackRange * factor，则初始先 Evade
  private spawnEvadeDistanceFactor: number = 1.1;
  // Evade -> Chase：evadeDuration 之后且 distance > tooCloseRange * factor
  private evadeReengageDistanceFactor: number = 1.5;

  // --- Planet 避障 ---
  private planetAvoidMargin: number = 140; // extra distance beyond planet radius
  private planetAvoidEmergencyMargin: number = 40;
  private planetAvoidStrength: number = 1.25;

  private readonly worldUp: vec3 = vec3.fromValues(0, 1, 0);

  constructor(game: Game, target: Ship) {
    this.game = game;
    this.target = target;
  }

  public addEnemy(enemy: Ship) {
    this.enemies.push(enemy);

    // 出生安全：如果敌机出生时距离过近或正对玩家，先进入 Evade，避免开局直接撞脸。
    const state = this.createDefaultState();
    const toTarget = vec3.create();
    vec3.subtract(toTarget, this.target.position, enemy.position);
    const distance = vec3.length(toTarget);
    if (distance > 0.0001) {
      vec3.scale(toTarget, toTarget, 1 / distance);
    }
    const facingDot = vec3.dot(enemy.getFront(), toTarget);
    if (
      distance < this.attackRange * this.spawnEvadeDistanceFactor ||
      (distance < this.detectionRange && facingDot > this.spawnEvadeFacingDot)
    ) {
      state.state = EnemyState.Evade;
      state.stateTime = 0;
    }

    this.enemyStates.set(enemy.id, state);
  }

  public removeEnemy(enemy: Ship) {
    this.enemies = this.enemies.filter(e => e.id !== enemy.id);
    this.enemyStates.delete(enemy.id);
  }

  public getEnemies(): readonly Ship[] {
    return this.enemies;
  }

  public getAliveEnemies(): Ship[] {
    return this.enemies.filter(e => e.active && e.visible);
  }

  update(delta: number) {
    if (!this.target.active) return;

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      const state = this.enemyStates.get(enemy.id) ?? this.createDefaultState();
      state.stateTime += delta;
      state.fireCooldown = Math.max(0, state.fireCooldown - delta);

      const toTarget = vec3.create();
      vec3.subtract(toTarget, this.target.position, enemy.position);
      const distance = vec3.length(toTarget);

      if (distance > 0.0001) {
        vec3.scale(toTarget, toTarget, 1 / distance);
      }

      const front = enemy.getFront();
      const facingDot = vec3.dot(front, toTarget);

      // 使用提前缓冲距离触发 Evade，避免惯性导致的冲脸。
      const tooCloseBuffered = this.tooCloseRange * this.tooCloseBuffer;

      switch (state.state) {
        case EnemyState.Patrol: {

          if (distance < tooCloseBuffered) {
            this.changeState(state, EnemyState.Evade);
            break;
          }

          if (distance < this.detectionRange) {
            this.changeState(state, EnemyState.Chase);
            break;
          }

          if (state.stateTime >= state.nextPatrolChange) {
            state.stateTime = 0;
            state.patrolTurn = this.randomPatrolTurn();
            state.nextPatrolChange = this.randomRange(this.patrolChangeMin, this.patrolChangeMax);
          }

          // Patrol 应该表现为“向前飞 + 小幅漂移”。
          // 加入角速度阻尼，避免从其他状态切回 Patrol 时继续打滚。
          const pitchCmd = this.clamp(
            state.patrolTurn[1] - enemy.angularVelocity[0] * this.patrolAngularDamping,
            -this.patrolMaxPitch,
            this.patrolMaxPitch
          );
          const yawCmd = this.clamp(
            state.patrolTurn[0] - enemy.angularVelocity[1] * this.patrolAngularDamping,
            -this.patrolMaxYaw,
            this.patrolMaxYaw
          );
          const rollCmd = this.clamp(
            state.patrolTurn[2] - enemy.angularVelocity[2] * this.patrolAngularDamping,
            -this.patrolMaxRoll,
            this.patrolMaxRoll
          );
          enemy.setControlInput(this.patrolThrottle, pitchCmd, yawCmd, rollCmd);
          enemy.setFiring(false);
          break;
        }
        case EnemyState.Chase: {
          if (distance < this.attackRange && facingDot > this.chaseToAttackFacingDot) {
            this.changeState(state, EnemyState.Attack);
            break;
          }
          if (distance < tooCloseBuffered) {
            this.changeState(state, EnemyState.Evade);
            break;
          }
          if (distance > this.loseRange) {
            this.changeState(state, EnemyState.Patrol);
            break;
          }

          if (state.stateTime >= state.nextOrbitChange) {
            state.stateTime = 0;
            state.orbitSign = Math.random() < 0.5 ? -1 : 1;
            state.nextOrbitChange = this.randomRange(this.orbitChangeMin, this.orbitChangeMax);
          }

          // 近距离且对准时主动降油门，减少撞脸。
          const throttle = this.computeApproachThrottle(distance, facingDot);

          // 在接近目标时做绕飞/侧切，让行为更像 dogfight。
          const desiredDir = this.applyPlanetAvoidance(enemy, this.computeOrbitDesiredDir(toTarget, distance, facingDot, state.orbitSign));
          this.steerTowards(enemy, desiredDir, throttle);
          enemy.setFiring(false);
          break;
        }
        case EnemyState.Attack: {
          if (distance > this.attackRange * this.approachDistanceScale) {
            this.changeState(state, EnemyState.Chase);
            break;
          }
          if (distance < tooCloseBuffered) {
            this.changeState(state, EnemyState.Evade);
            break;
          }

          const throttle = this.computeApproachThrottle(distance, facingDot);
          const desiredDir = this.applyPlanetAvoidance(enemy, this.computeAttackDesiredDir(toTarget, distance, facingDot, state.orbitSign));
          this.steerTowards(enemy, desiredDir, throttle);
          const canFire = facingDot > this.fireFacingDot && state.fireCooldown <= 0;
          if (canFire) {
            state.fireCooldown = this.fireInterval;
          }
          enemy.setFiring(canFire);
          break;
        }
        case EnemyState.Evade: {
          if (
            state.stateTime >= this.evadeDuration &&
            distance > this.tooCloseRange * this.evadeReengageDistanceFactor
          ) {
            this.changeState(state, EnemyState.Chase);
            break;
          }

          const away = vec3.create();
          vec3.scale(away, toTarget, -1);
          // Evade 是强动作：全油门快速拉开距离。
          this.steerTowards(enemy, this.applyPlanetAvoidance(enemy, away), 1);
          enemy.setFiring(false);
          break;
        }
      }

      this.enemyStates.set(enemy.id, state);
    }
  }

  private createDefaultState(): EnemyStateData {
    return {
      state: EnemyState.Patrol,
      stateTime: 0,
      fireCooldown: 0,
      patrolTurn: this.randomPatrolTurn(),
      nextPatrolChange: this.randomRange(this.patrolChangeMin, this.patrolChangeMax),
      orbitSign: Math.random() < 0.5 ? -1 : 1,
      nextOrbitChange: this.randomRange(this.orbitChangeMin, this.orbitChangeMax),
    };
  }

  private changeState(state: EnemyStateData, next: EnemyState) {
    if (state.state === next) return;
    const prev = state.state;
    state.state = next;
    state.stateTime = 0;
    Debug.log(LogChannel.GameLogic, `Enemy state: ${prev} -> ${next}`);
  }

  private steerTowards(enemy: Ship, desiredDirWorld: vec3, throttle: number) {
    const localDir = this.worldToLocalDir(enemy, desiredDirWorld);
    const yaw = this.clamp(localDir[0], -1, 1);
    const pitch = this.clamp(-localDir[1], -1, 1);
    const roll = this.clamp(localDir[0] * 0.6, -1, 1);
    // Debug.log(LogChannel.GameLogic, `Steering localDir: ${localDir}, pitch: ${pitch}, yaw: ${yaw}, roll: ${roll}`);
    enemy.setControlInput(
      this.clamp(throttle, -1, 1),
      pitch,
      yaw,
      roll
    );
  }

  private applyPlanetAvoidance(enemy: Ship, desiredDirWorld: vec3): vec3 {
    const planets = this.game.getScene().entities.filter(e => e.active && e instanceof Planet) as Planet[];
    if (planets.length === 0) return desiredDirWorld;

    // Emergency: if too close to a planet, force fly away.
    for (const p of planets) {
      const toEnemy = vec3.create();
      vec3.subtract(toEnemy, enemy.position, p.position);
      const dist = vec3.length(toEnemy);
      const dangerDist = p.hitRadius + this.planetAvoidEmergencyMargin;
      if (dist > 1e-6 && dist < dangerDist) {
        vec3.scale(toEnemy, toEnemy, 1 / dist);
        return toEnemy;
      }
    }

    const avoid = vec3.create();
    for (const p of planets) {
      const toEnemy = vec3.create();
      vec3.subtract(toEnemy, enemy.position, p.position);
      const dist = vec3.length(toEnemy);
      if (dist < 1e-6) continue;

      const avoidDist = p.hitRadius + this.planetAvoidMargin;
      if (dist >= avoidDist) continue;

      // Quadratic falloff: closer => stronger
      const t = 1 - this.clamp(dist / avoidDist, 0, 1);
      const strength = (t * t) * this.planetAvoidStrength;
      vec3.scale(toEnemy, toEnemy, 1 / dist);
      vec3.scaleAndAdd(avoid, avoid, toEnemy, strength);
    }

    if (vec3.length(avoid) < 1e-6) return desiredDirWorld;

    const combined = vec3.create();
    vec3.add(combined, desiredDirWorld, avoid);
    if (vec3.length(combined) < 1e-6) return desiredDirWorld;
    vec3.normalize(combined, combined);
    return combined;
  }

  private worldToLocalDir(enemy: Ship, direction: vec3): vec3 {
    const inv = quat.create();
    quat.invert(inv, enemy.rotation);
    const localDir = vec3.create();
    vec3.transformQuat(localDir, direction, inv);
    // Debug.log(LogChannel.GameLogic, `World dir: ${direction}, Local dir: ${localDir}`);
    return localDir;
  }

  private randomPatrolTurn(): vec3 {
    return vec3.fromValues(
      this.randomRange(-0.35, 0.35),
      this.randomRange(-0.22, 0.22),
      this.randomRange(-0.28, 0.28)
    );
  }

  private computeApproachThrottle(distance: number, facingDot: number): number {
    // 远距离：全速接近。
    // 近距离且对准：降速避免撞脸。
    // 保持最小油门，避免敌机看起来“停住”。
    const t = this.clamp(
      (distance - this.tooCloseRange) / (this.attackRange * this.approachDistanceScale),
      0,
      1
    );
    let throttle = this.minApproachThrottle + (1 - this.minApproachThrottle) * t;

    if (distance < this.attackRange * this.closeAlignedRangeFactor && facingDot > this.closeAlignedFacingDot) {
      throttle = Math.min(throttle, this.closeAlignedThrottleCap);
    }

    return this.clamp(throttle, -1, 1);
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private computeOrbitDesiredDir(toTarget: vec3, distance: number, facingDot: number, orbitSign: number): vec3 {
    // 距离远：直接朝目标飞。
    if (distance > this.orbitRange || distance < this.tooCloseRange) {
      return toTarget;
    }

    // 如果已经明显背对目标：优先转回来，不做绕飞。
    if (facingDot < this.orbitFacingAwayDot) {
      return toTarget;
    }

    // 计算目标周围的侧向（右方向）向量（世界坐标）。
    // right = up × toTarget
    const right = vec3.create();
    vec3.cross(right, this.worldUp, toTarget);
    const rightLen = vec3.length(right);
    if (rightLen < 1e-4) {
      vec3.set(right, 1, 0, 0);
    } else {
      vec3.scale(right, right, 1 / rightLen);
    }
    vec3.scale(right, right, orbitSign);

    // 越靠近，绕飞越强。
    const closeness = 1 - this.clamp((distance - this.tooCloseRange) / (this.orbitRange - this.tooCloseRange), 0, 1);
    const strength = this.lerp(this.orbitStrengthMin, this.orbitStrengthMax, closeness);

    const desired = vec3.create();
    vec3.scaleAndAdd(desired, toTarget, right, strength);
    vec3.normalize(desired, desired);
    return desired;
  }

  private computeAttackDesiredDir(toTarget: vec3, distance: number, facingDot: number, orbitSign: number): vec3 {
    // Attack 时主要保持对准以便开火，但加入少量侧向运动，
    // 避免直线冲脸，也让动作更灵活。
    if (distance > this.attackRange || facingDot < this.attackOrbitMinFacingDot) {
      return toTarget;
    }

    const right = vec3.create();
    vec3.cross(right, this.worldUp, toTarget);
    const rightLen = vec3.length(right);
    if (rightLen < 1e-4) {
      vec3.set(right, 1, 0, 0);
    } else {
      vec3.scale(right, right, 1 / rightLen);
    }
    vec3.scale(right, right, orbitSign);

    const desired = vec3.create();
    vec3.scaleAndAdd(desired, toTarget, right, this.attackOrbitStrength);
    vec3.normalize(desired, desired);
    return desired;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * this.clamp(t, 0, 1);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

}