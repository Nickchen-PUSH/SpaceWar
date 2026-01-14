// 定义所有的日志通道 (模块)
// 使用字符串枚举，方便在控制台阅读
export const LogChannel = {
  System: "System",
  Input: "Input",
  Rendering: "Rendering",
  Physics: "Physics",
  GameLogic: "GameLogic",
  Asset: "Asset",
  Net: "Net" // 如果有多人联机
} as const;
export type LogChannel = (typeof LogChannel)[keyof typeof LogChannel];

export class Debug {
  // 存储哪些通道是开启的
  // 使用 Set 实现 O(1) 复杂度的快速查找
  private static activeChannels: Set<LogChannel> = new Set([
    LogChannel.System, // 默认只开启系统日志
    // LogChannel.Input, // 开发物理时解注这一行
    LogChannel.GameLogic,
  ]);

  // 为每个通道配置颜色 (可选，为了好看)
  private static channelColors: Record<LogChannel, string> = {
    [LogChannel.System]: "#888888",
    [LogChannel.Input]: "#FFD700",    // 金色
    [LogChannel.Rendering]: "#00BFFF", // 深蓝
    [LogChannel.Physics]: "#FF4500",   // 橙红
    [LogChannel.GameLogic]: "#32CD32", // 绿色
    [LogChannel.Asset]: "#DA70D6",     // 紫色
    [LogChannel.Net]: "#00FFFF",
  };

  /**
   * 打印日志
   * @param channel 所属模块
   * @param message 消息内容
   * @param optionalParams 其他对象数据
   */
  public static log(channel: LogChannel, message: string, ...optionalParams: any[]) {
    if (!this.activeChannels.has(channel)) return;

    const color = this.channelColors[channel] || "#000";
    
    // 使用 %c 语法添加 CSS 样式
    console.log(
      `%c[${channel}]%c ${message}`, 
      `color: ${color}; font-weight: bold;`, // 标签样式
      `color: inherit;`,                      // 内容样式
      ...optionalParams
    );
  }

  public static warn(channel: LogChannel, message: string, ...optionalParams: any[]) {
    // 警告通常总是显示的，或者你可以加一个 enableWarnings 开关
    console.warn(`[${channel}] ${message}`, ...optionalParams);
  }

  public static error(channel: LogChannel, message: string, ...optionalParams: any[]) {
    console.error(`[${channel}] ${message}`, ...optionalParams);
  }

  // =================================
  //  控制接口 (Runtime Control)
  // =================================

  public static enable(channel: LogChannel) {
    this.activeChannels.add(channel);
    console.log(`✅ Enabled logging for: ${channel}`);
  }

  public static disable(channel: LogChannel) {
    this.activeChannels.delete(channel);
    console.log(`❌ Disabled logging for: ${channel}`);
  }

  public static toggle(channel: LogChannel) {
    if (this.activeChannels.has(channel)) {
      this.disable(channel);
    } else {
      this.enable(channel);
    }
  }

  public static enableAll() {
    Object.values(LogChannel).forEach(c => this.activeChannels.add(c as LogChannel));
  }
  
  public static disableAll() {
    this.activeChannels.clear();
  }
}

// 把它挂载到 window 对象上，方便在浏览器控制台直接调用
(window as any).Debug = Debug;
(window as any).LogChannel = LogChannel;