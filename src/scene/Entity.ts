import { Vector3 as ThreeVector3, Quaternion as ThreeQuaternion, Matrix4 } from "three";
import type { Vector3, Quaternion } from "../types";

// 定义渲染所需的配置数据
export interface MeshConfig {
  geometryId: string; // 例如 'box', 'sphere', 'ship_model_v1'
}

export class Entity {
  public id: string;
  public name: string = "";
  public active: boolean = true;
  
  // --- 1. 空间变换数据 (逻辑层负责) ---
  public position: Vector3 = { x: 0, y: 0, z: 0 };
  public rotation: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
  public scale: Vector3 = { x: 1, y: 1, z: 1 };

  // --- 2. 渲染描述数据 (逻辑层负责描述) ---
  public meshConfig: MeshConfig | null = null;
  public visible: boolean = true;

  // --- 3. 渲染层挂载点 (Render Proxy) ---
  public _rendererData: any = null;

  // --- 4. 场景图 (父子关系) ---
  public children: Entity[] = [];
  public parent: Entity | null = null;
  public scene: any | null = null; // Should be Scene but causes circular dependency

  // Helper objects for calculations to avoid re-allocation
  private static _v1 = new ThreeVector3();
  private static _m1 = new Matrix4();
  private static _q1 = new ThreeQuaternion();

  constructor() {
    this.id = crypto.randomUUID();
  }

  /**
   * Rotates the entity to face a point in world space.
   * @param target The world space position to look at.
   */
  public lookAt(target: ThreeVector3): void {
    Entity._v1.set(this.position.x, this.position.y, this.position.z);
    Entity._m1.lookAt(Entity._v1, target, new ThreeVector3(0, 1, 0));
    Entity._q1.setFromRotationMatrix(Entity._m1);
    this.rotation.x = Entity._q1.x;
    this.rotation.y = Entity._q1.y;
    this.rotation.z = Entity._q1.z;
    this.rotation.w = Entity._q1.w;
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