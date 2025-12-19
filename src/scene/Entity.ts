import type { Vector3, Quaternion } from "../types";

// 定义渲染所需的配置数据
export interface MeshConfig {
  geometryId: string; // 例如 'box', 'sphere', 'ship_model_v1'
  materialId: string; // 例如 'red_paint', 'metal_texture'
  color?: number;     // 可选的颜色覆盖
}

export class Entity {
  public id: string;
  public active: boolean = true;
  
  // --- 1. 空间变换数据 (逻辑层负责) ---
  public position: Vector3 = { x: 0, y: 0, z: 0 };
  public rotation: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
  public scale: Vector3 = { x: 1, y: 1, z: 1 };

  // --- 2. 渲染描述数据 (逻辑层负责描述) ---
  // 这只是数据，不是真正的 3D 对象
  public meshConfig: MeshConfig | null = null;
  public visible: boolean = true;

  // --- 3. 渲染层挂载点 (Render Proxy) ---
  // 重要：逻辑层不要动这个变量！这是留给 Renderer 存放它自己的对象的。
  // 在 ThreeRenderer 里，这里会存放 THREE.Mesh
  // 在 WebGPURenderer 里，这里可能存放一个 Buffer 的索引
  public _rendererData: any = null;

  // --- 4. 场景图 (父子关系) ---
  public children: Entity[] = [];
  public parent: Entity | null = null;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * 设置模型外观
   */
  setMesh(geometryId: string, materialId: string) {
    this.meshConfig = { geometryId, materialId };
  }

  /**
   * 添加子节点 (比如飞船挂载炮塔)
   */
  add(child: Entity) {
    child.parent = this;
    this.children.push(child);
  }

  /**
   * 逻辑更新 (在 Game loop 中调用)
   */
  update(delta: number) {
    if (!this.active) return;
    
    // 这里处理逻辑，比如：
    // this.position.z -= 10 * delta; (向前飞)

    // 递归更新子节点
    for (const child of this.children) {
      child.update(delta);
    }
  }
  
  // 辅助方法：设置位置
  setPosition(x: number, y: number, z: number) {
    this.position.x = x; this.position.y = y; this.position.z = z;
  }
}