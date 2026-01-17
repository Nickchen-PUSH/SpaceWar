import { Game } from "../../core/Game";
import { Ship } from "../ships/Ship";
import { vec3, quat } from "gl-matrix";
import { Debug, LogChannel } from "../../core/Debug";

enum EnemyState {
  Patrol = "Patrol",
  Chase = "Chase",
  Attack = "Attack",
  Evade = "Evade",
}

type EnemyStateData = {
  state: EnemyState;
  stateTime: number;
  fireCooldown: number;
  patrolTurn: vec3;
  nextPatrolChange: number;
};

export class EnemyController {
  private game: Game;
  private target: Ship;
  private enemies: Ship[] = [];
  private enemyStates: Map<string, EnemyStateData> = new Map();

  private detectionRange: number = 80;
  private attackRange: number = 45;
  private tooCloseRange: number = 15;
  private loseRange: number = 120;

  private fireInterval: number = 0.35;
  private evadeDuration: number = 1.2;
  private patrolChangeMin: number = 1.2;
  private patrolChangeMax: number = 2.6;

  constructor(game: Game, target: Ship) {
    this.game = game;
    this.target = target;
  }

  public addEnemy(enemy: Ship) {
    this.enemies.push(enemy);
    this.enemyStates.set(enemy.id, this.createDefaultState());
  }

  public removeEnemy(enemy: Ship) {
    this.enemies = this.enemies.filter(e => e.id !== enemy.id);
    this.enemyStates.delete(enemy.id);
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

      switch (state.state) {
        case EnemyState.Patrol: {
          if (distance < this.detectionRange) {
            this.changeState(state, EnemyState.Chase);
            break;
          }

          if (state.stateTime >= state.nextPatrolChange) {
            state.stateTime = 0;
            state.patrolTurn = this.randomPatrolTurn();
            state.nextPatrolChange = this.randomRange(this.patrolChangeMin, this.patrolChangeMax);
          }

          enemy.setControlInput(
            0.5,
            this.clamp(state.patrolTurn[1], -0.4, 0.4),
            this.clamp(state.patrolTurn[0], -0.4, 0.4),
            this.clamp(state.patrolTurn[2], -0.5, 0.5)
          );
          enemy.setFiring(false);
          break;
        }
        case EnemyState.Chase: {
          if (distance < this.attackRange && facingDot > 0.85) {
            this.changeState(state, EnemyState.Attack);
            break;
          }
          if (distance < this.tooCloseRange) {
            this.changeState(state, EnemyState.Evade);
            break;
          }
          if (distance > this.loseRange) {
            this.changeState(state, EnemyState.Patrol);
            break;
          }

          this.steerTowards(enemy, toTarget, 1);
          enemy.setFiring(false);
          break;
        }
        case EnemyState.Attack: {
          if (distance > this.attackRange * 1.2) {
            this.changeState(state, EnemyState.Chase);
            break;
          }
          if (distance < this.tooCloseRange) {
            this.changeState(state, EnemyState.Evade);
            break;
          }

          this.steerTowards(enemy, toTarget, 0.8);
          const canFire = facingDot > 0.92 && state.fireCooldown <= 0;
          if (canFire) {
            state.fireCooldown = this.fireInterval;
          }
          enemy.setFiring(canFire);
          break;
        }
        case EnemyState.Evade: {
          if (state.stateTime >= this.evadeDuration && distance > this.tooCloseRange * 1.5) {
            this.changeState(state, EnemyState.Chase);
            break;
          }

          const away = vec3.create();
          vec3.scale(away, toTarget, -1);
          this.steerTowards(enemy, away, 1);
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

    enemy.setControlInput(
      this.clamp(throttle, -1, 1),
      pitch,
      yaw,
      roll
    );
  }

  private worldToLocalDir(enemy: Ship, direction: vec3): vec3 {
    const inv = quat.create();
    quat.invert(inv, enemy.rotation);
    const localDir = vec3.create();
    vec3.transformQuat(localDir, direction, inv);
    return localDir;
  }

  private randomPatrolTurn(): vec3 {
    return vec3.fromValues(
      this.randomRange(-0.5, 0.5),
      this.randomRange(-0.25, 0.25),
      this.randomRange(-0.35, 0.35)
    );
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

}