import { Camera } from "./Camera";
import { Entity } from "./Entity";

export class Scene {
  // =============================
  //  核心数据
  // =============================

  /**
   * 场景的主摄像机
   * 它是场景唯一的观察者
   */
  public camera: Camera;

  /**
   * 所有的游戏实体 (飞船、子弹、陨石)
   * Renderer 会遍历这个数组来决定画什么
   */
  public entities: Entity[] = [];

  // =============================
  //  内部缓冲 (用于安全的增删)
  // =============================
  
  // 等待添加的实体队列
  private pendingAdd: Entity[] = [];
  
  // 等待移除的实体 ID 集合
  private pendingRemove: Set<string> = new Set();

  constructor() {
    // 初始化相机，默认全屏
    // 具体的宽高后续会被 Game.onResize 修正
    this.camera = new Camera(window.innerWidth, window.innerHeight);
  }

  // =============================
  //  生命周期 (Life Cycle)
  // =============================

  /**
   * 更新场景状态 (由 Game loop 调用)
   * @param delta 上一帧的时间间隔(秒)
   */
  public update(delta: number) {
    // 1. 处理本帧新增的实体 (避免在遍历过程中修改数组)
    if (this.pendingAdd.length > 0) {
      this.entities.push(...this.pendingAdd);
      this.pendingAdd = [];
    }

    // 2. 处理本帧移除的实体
    if (this.pendingRemove.size > 0) {
      this.entities = this.entities.filter(e => !this.pendingRemove.has(e.id));
      this.pendingRemove.clear();
    }

    // 3. 更新所有实体的逻辑
    // 使用倒序遍历也是一种防止移除时索引错乱的常用技巧，但这里我们用 filter 统一处理了
    for (const entity of this.entities) {
      if (entity.active) {
        entity.update(delta);
      }
    }
  }

  // =============================
  //  实体管理 (Entity Management)
  // =============================

  /**
   * 添加实体到场景
   */
  public add(entity: Entity) {
    // 放入缓冲队列，下一帧 update 开始时才会真正进入 lists
    // 这样做可以防止在 update 循环中 add 导致死循环或索引错误
    this.pendingAdd.push(entity);
  }

  /**
   * 从场景移除实体
   */
  public remove(entity: Entity) {
    // 标记为不活跃，Renderer 也就不会画它了
    entity.active = false; 
    // 加入移除队列，下一帧彻底从数组中删除
    this.pendingRemove.add(entity.id);
  }

  /**
   * 清空场景 (用于切换关卡)
   */
  public clear() {
    this.entities = [];
    this.pendingAdd = [];
    this.pendingRemove.clear();
  }
}