import { Debug, LogChannel } from "../core/Debug";
import { vec3, quat, mat4 } from "gl-matrix";

// 定义渲染所需的配置数据
export interface MeshConfig {
  geometryId: string; // 例如 'box', 'sphere', 'ship_model_v1'
}
const TEMP_MAT4 = mat4.create();
const UP_VECTOR = vec3.fromValues(0, 1, 0);
export class Entity {
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
  public scene: any | null = null; // Should be Scene but causes circular dependency

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
    const front = vec3.fromValues(0, 0, -1);
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
   * 逻辑更新 (在 Game loop 中调用)
   */
  update(delta: number): void {
    if (!this.active) return;

    // 递归更新子节点
    for (const child of this.children) {
      child.update(delta);
    }
  }
}