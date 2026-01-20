import { Game } from "./Game";
import type { Level } from "../game/levels/level";

export class LevelManager {
  private game: Game;
  private currentLevel: Level | null = null;
  // 可以增加一个 pendingLevel 用于处理异步切换或过场动画
  
  constructor(game: Game) {
    this.game = game;
  }

  /**
   * 切换关卡
   */
  public changeLevel(newLevel: Level) {
    // 1. 清理旧关卡
    if (this.currentLevel) {
      this.currentLevel.onExit();
    }

    // 2. 切换引用
    this.currentLevel = newLevel;

    // 3. 初始化新关卡
    // 把 game 传进去，这样关卡能访问 Scene 和 Input
    this.currentLevel.onEnter(this.game);
  }

  /**
   * 驱动当前关卡 (每帧调用)
   */
  public update(delta: number) {
    if (this.currentLevel) {
      this.currentLevel.onUpdate(this.game, delta); // Pass game instance here
    }
  }

  /**
   * Scene 更新后调用（例如：碰撞检测、后处理逻辑）
   */
  public postUpdate(delta: number) {
    if (this.currentLevel?.onPostUpdate) {
      this.currentLevel.onPostUpdate(this.game, delta);
    }
  }

}