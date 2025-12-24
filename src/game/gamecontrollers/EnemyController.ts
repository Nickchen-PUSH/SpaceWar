import { Game } from "../../core/Game";
import { Ship } from "../ships/Ship";
import { Bullet } from "../Bullet";
import { vec3 } from "gl-matrix";

export class EnemyController {
  private game: Game;
  private target: Ship;
  private fireCooldown: number = 0;

  constructor(game: Game, target: Ship) {
    this.game = game;
    this.target = target;
  }

  update(delta: number) {
    // 你可以在这里添加更多AI逻辑，比如移动、追踪玩家等
  }

}