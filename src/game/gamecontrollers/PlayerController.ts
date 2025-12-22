import { Game } from "../../core/Game";
import { Ship } from "../ships/Ship";

export class PlayerController {
  private game: Game;
  private target: Ship | null = null;

  // 控制模式开关
  public useMouseSteering: boolean = true; 
  
  // 鼠标灵敏度
  public mouseSensitivity: number = 0.02;

  constructor(game: Game) {
    this.game = game;
  }

  /**
   * 附身：控制哪艘船
   */
  public possess(ship: Ship) {
    this.target = ship;
  }

  public update(delta: number) {
    if (!this.target) return;

    const input = this.game.getInput();

    // 1. 计算油门 (Throttle)
    // Shift 加速，Ctrl 减速，或者 W/S 前后
    const throttle = input.getAxisVertical("KeyS", "KeyW");
    
    // 2. 计算旋转 (Rotation)
    let pitch = 0;
    let yaw = 0;
    let roll = 0;

    if (this.useMouseSteering) {
      // --- 鼠标模式 (类似 战争雷霆 / 自由枪骑兵) ---
      // 假设 Input 系统有 getMouseDelta (每帧鼠标移动量)
      const mouse = input.getMouseDelta(); 
      
      // 鼠标左右 -> Yaw
      yaw = -mouse.x * this.mouseSensitivity;
      
      // 鼠标上下 -> Pitch
      pitch = -mouse.y * this.mouseSensitivity;
      
      // 键盘 Q/E -> Roll
      roll = input.getAxis("KeyQ", "KeyE");

    } else {
      // --- 纯键盘模式 ---
      pitch = input.getAxisVertical("ArrowDown", "ArrowUp");
      yaw = input.getAxis("ArrowLeft", "ArrowRight");
      roll = input.getAxis("KeyQ", "KeyE");
    }

    // 3. 动作 (Action)
    const isFiring = input.getMouseButton(0) || input.getKey("Space");

    // 4. 发送指令给飞船
    // 注意：这里我们做了一个 clamp (-1 到 1) 限制，防止数值过大
    this.target.setControlInput(
      Math.max(-1, Math.min(1, throttle)),
      Math.max(-1, Math.min(1, pitch)),
      Math.max(-1, Math.min(1, yaw)),
      Math.max(-1, Math.min(1, roll))
    );

    this.target.setFiring(isFiring);
  }
}