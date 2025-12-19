import type { Vector3 } from "../types"; // 假设我们在 types/index.ts 定义了 Vector3

export class Camera {
    // =============================
    //  基础变换数据 (Transform)
    // =============================

    // 摄像机的位置
    public position: Vector3 = { x: 0, y: 10, z: 20 };

    // 摄像机的观察目标 (LookAt)
    public target: Vector3 = { x: 0, y: 0, z: 0 };

    // 摄像机的上方朝向 (通常是 Y 轴正方向)
    public up: Vector3 = { x: 0, y: 1, z: 0 };

    // =============================
    //  投影参数 (Projection)
    // =============================

    /** 垂直视野角度 (Field of View)，单位：度 */
    public fov: number = 45;

    /** 宽高比 (Width / Height) */
    public aspect: number = 1;

    /** 近裁剪面 (最近能看多近) */
    public near: number = 0.1;

    /** 远裁剪面 (最远能看多远) */
    public far: number = 2000;

    // =============================
    //  状态标记 (Optimization)
    // =============================

    /** * 脏标记：当参数发生变化时设为 true。
     * Renderer 检测到 true 时才会调用 updateProjectionMatrix()，避免每帧重复计算。
     */
    public isDirty: boolean = true;

    constructor(width: number, height: number) {
        this.resize(width, height);
    }

    // =============================
    //  操作方法 (Methods)
    // =============================

    /**
     * 当窗口大小变化时调用
     */
    public resize(width: number, height: number) {
        if (height === 0) height = 1;
        this.aspect = width / height;
        this.isDirty = true; // 宽高比变了，投影矩阵必须重算
    }

    /**
     * 设置位置
     */
    public setPosition(x: number, y: number, z: number) {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        // 位置改变不需要重算投影矩阵(Projection)，只需要重算视图矩阵(View)
        // 但在 Three.js 中，position 是直接同步的，通常不用手动调 updateMatrix
        // 这里的 isDirty 主要是留给未来原生 WebGL 实现用的
    }

    /**
     * 设置观察点
     */
    public lookAt(x: number, y: number, z: number) {
        this.target.x = x;
        this.target.y = y;
        this.target.z = z;
    }

    /**
     * 缩放视野 (比如加速时的视觉效果)
     */
    public setFov(fov: number) {
        this.fov = fov;
        this.isDirty = true;
    }


}