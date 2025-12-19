export class Time {
  /**
   * 上一帧到这一帧经过的时间（秒）
   * 用于物理移动计算：position += speed * time.delta
   */
  public delta: number = 0;

  /**
   * 游戏启动后的总运行时间（秒）
   * 用于着色器动画 (Uniforms) 或周期性逻辑 (Math.sin)
   */
  public elapsed: number = 0;

  /**
   * 时间流逝倍率
   * 1.0 = 正常速度
   * 0.5 = 慢动作 (子弹时间)
   * 0.0 = 暂停逻辑 (但不暂停渲染)
   * 2.0 = 两倍速
   */
  public timeScale: number = 1.0;

  /**
   * 总帧数
   */
  public frameCount: number = 0;

  // --- 内部状态 ---
  private lastTime: number = 0;
  
  // 最大 Delta 限制 (0.1秒 = 10FPS)
  // 防止浏览器卡顿或切后台回来时 delta 变得巨大，导致物体瞬间传送穿墙
  private maxDelta: number = 0.1; 

  constructor() {
    this.reset();
  }

  /**
   * 重置时间状态
   * 通常在 Game.start() 时调用，防止暂停太久后第一帧跳变
   */
  reset() {
    this.lastTime = performance.now();
    this.delta = 0;
    this.elapsed = 0;
    this.frameCount = 0;
  }

  /**
   * 每一帧更新时间
   * @param timestamp requestAnimationFrame 传入的时间戳 (毫秒)
   */
  update(timestamp: number) {
    // 1. 计算原始差值 (毫秒 -> 秒)
    let rawDelta = (timestamp - this.lastTime) / 1000;

    // 2. 处理第一帧的边界情况
    if (rawDelta < 0) rawDelta = 0;

    // 3. 安全钳制 (防止切后台导致的巨大跳变)
    if (rawDelta > this.maxDelta) {
      rawDelta = this.maxDelta;
    }

    // 4. 应用时间缩放 (实现慢动作的关键)
    this.delta = rawDelta * this.timeScale;

    // 5. 更新累计状态
    this.elapsed += this.delta;
    this.lastTime = timestamp;
    this.frameCount++;
  }

  /**
   * 获取当前 FPS (简易估算)
   */
  get fps(): number {
    return this.delta > 0 ? Math.round(1 / this.delta) : 0;
  }
}