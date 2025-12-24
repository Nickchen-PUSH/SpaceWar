import { Debug, LogChannel } from "../core/Debug";
import { vec3, quat, mat4 } from "gl-matrix";

// 定义渲染所需的配置数据
export interface MeshConfig {
  geometryId: string; // 例如 'box', 'sphere', 'ship_model_v1'
}
const TEMP_MAT4 = mat4.create();
const UP_VECTOR = vec3.fromValues(0, 1, 0);
export abstract class Entity {
  public id: string;
  public name: string = "";
  public active: boolean = true;

  // --- 1. 空间变换数据 (逻辑层负责) ---
  public position: vec3 = vec3.create();
  public rotation: quat = quat.create();
  public scale: vec3 = vec3.fromValues(1, 1, 1);

  // --- 2. 渲染描述数据 (逻辑层负责描述) ---
  public meshConfig: MeshConfig | null = null;
  public visible: boolean = true;

  // --- 3. 渲染层挂载点 (Render Proxy) ---
  public _rendererData: any = null;
  public _hasWarnedMissingMesh: boolean = false;

  // --- 4. 场景图 (父子关系) ---
  public children: Entity[] = [];
  public parent: Entity | null = null;

  // =============================
  // 物理属性
  // =============================
  protected isStatic: boolean = false; // 是否为静态物体（不受力学影响）

  // --- 基础机动参数 (由子类在构造函数中定义) ---
  protected maxSpeed: number = 0;  // [m/s]
  protected maxAcceleration: number = 0;  // [m/s²]
  protected maxAngularSpeed: number = 0;  // [rad/s]
  protected maxAngularAcceleration: vec3 = vec3.fromValues(0, 0, 0);  // [rad/s²] 每个轴的最大角加速度[pitch, yaw, roll]

  // --- 阻理设置 ---
  protected drag: number = 1;  // 阻力系数（0.95-0.99），用于在松开按键时让飞船平滑减速。
  protected angularDrag: number = 1;  // 角阻力系数

  // --- 共有状态 ---
  public velocity: vec3 = vec3.create();  // [m/s] 线速度
  public angularVelocity: vec3 = vec3.create();  // [rad/s] 每个轴的角速度[pitch, yaw, roll]
  public acceleration: number = 0;  // 线加速度[m/s²]
  public angularAcceleration: vec3 = vec3.create();  // [rad/s²] 每个轴的角加速度[pitch, yaw, roll]

  constructor() {
    this.id = crypto.randomUUID();
  }

  /**
   * Rotates the entity to face a point in world space.
   * @param target The world space position to look at.
   */
  public lookAt(target: vec3): void {
    if (vec3.distance(this.position, target) < 0.00001) {
      return;
    }
    mat4.lookAt(TEMP_MAT4, this.position, target, UP_VECTOR);
    mat4.getRotation(this.rotation, TEMP_MAT4);
    quat.invert(this.rotation, this.rotation);
    Debug.log(LogChannel.System, `Entity ${this.name} is looking at ${target}`);
    Debug.log(LogChannel.System, `New rotation quaternion: ${this.rotation}`);
  }

  public getFront(): vec3 {
    const front = vec3.fromValues(0, 0, 1);
    vec3.transformQuat(front, front, this.rotation);
    vec3.normalize(front, front);
    return front;
  }

  public rotateX(rad: number) {
    // quat.rotateX 的逻辑是: out = a * rotX
    // 对于四元数，右乘表示 "在当前姿态基础上，叠加一个局部旋转"
    quat.rotateX(this.rotation, this.rotation, rad);
  }

  public rotateY(rad: number) {
    quat.rotateY(this.rotation, this.rotation, rad);
  }

  public rotateZ(rad: number) {
    quat.rotateZ(this.rotation, this.rotation, rad);
  }

  /**
   * 绕世界坐标轴旋转 (通常用于平台、自转的星球)
   * @param axis 世界轴 (需要归一化)
   * @param rad 弧度
   */
  public rotateOnWorldAxis(axis: vec3, rad: number) {
    // 这是一个常见的坑：gl-matrix 没有直接提供 "左乘 (Global)" 的简便函数
    // 所以我们需要手动构建旋转，然后左乘：New = Rot * Old

    // 1. 创建临时的轴角旋转四元数 (建议提取为模块级变量避免GC)
    const tempQ = quat.create();
    quat.setAxisAngle(tempQ, axis, rad);

    // 2. 左乘: multiply(out, A, B) => out = A * B
    // A 是新旋转, B 是老旋转
    quat.multiply(this.rotation, tempQ, this.rotation);
  }

  /**
   * 按照物理规则更新实体状态
   */

  protected applyPhysics(delta: number): void {
    if (this.isStatic) return;

    // 更新线速度
    const accelerationVec = vec3.create();
    vec3.scale(accelerationVec, this.getFront(), this.acceleration);
    vec3.scaleAndAdd(this.velocity, this.velocity, accelerationVec, delta);

    // 应用阻力
    vec3.scale(this.velocity, this.velocity, Math.pow(this.drag, delta));

    // 限制最大速度
    const speed = vec3.length(this.velocity);
    if (speed > this.maxSpeed) {
      vec3.scale(this.velocity, this.velocity, this.maxSpeed / speed);
    }

    // 最小正方向速度为 0，不可以直接倒退
    const forwardDot = vec3.dot(this.velocity, this.getFront());
    if (forwardDot < 0) {
      const forwardComponent = vec3.create();
      vec3.scale(forwardComponent, this.getFront(), forwardDot);
      vec3.subtract(this.velocity, this.velocity, forwardComponent);
    }

    // 更新位置
    vec3.scaleAndAdd(this.position, this.position, this.velocity, delta);

    // 更新角速度
    const angularAccDelta = vec3.create();
    vec3.scale(angularAccDelta, this.angularAcceleration, delta);
    vec3.add(this.angularVelocity, this.angularVelocity, angularAccDelta);

    // 应用角阻力
    vec3.scale(this.angularVelocity, this.angularVelocity, Math.pow(this.angularDrag, delta));

    // 限制最大角速度
    const angularSpeed = vec3.length(this.angularVelocity);
    if (angularSpeed > this.maxAngularSpeed) {
      vec3.scale(this.angularVelocity, this.angularVelocity, this.maxAngularSpeed / angularSpeed);
    }

    if (angularSpeed > 0) {
      // 根据角速度更新旋转
      const deltaRotation = quat.create();
      const axis = vec3.create();
      vec3.normalize(axis, this.angularVelocity);
      const angle = angularSpeed * delta;
      quat.setAxisAngle(deltaRotation, axis, angle);
      quat.multiply(this.rotation, this.rotation, deltaRotation);
    }
  }

  /**
   * 逻辑更新 (在 Game loop 中调用)
   */
  update(delta: number): void {
    if (!this.active) return;

    // 首先应用物理更新，确保当前实体的位置在本帧是正确的
    this.applyPhysics(delta);

    // 然后递归更新子节点，子节点可以依赖父节点更新后的状态
    for (const child of this.children) {
      child.update(delta);
    }
  }
}