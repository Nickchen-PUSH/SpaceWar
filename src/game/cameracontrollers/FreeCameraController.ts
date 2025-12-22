// src/game/FreeCameraController.ts
import { vec3, quat } from "gl-matrix";
import { Game } from "../../core/Game";
import { Entity } from "../../scene/Entity";
import { Debug, LogChannel } from "../../core/Debug";
import type { Camera } from "scene";

export class FreeCameraController extends Entity {
    private camera: Camera;
    private game: Game;

    // 参数配置
    public moveSpeed: number = 10.0;     // 移动速度
    public shiftMultiplier: number = 3.0; // 按住 Shift 的加速倍率
    public lookSpeed: number = 0.02;    // 鼠标灵敏度 (弧度/像素)

    // 内部状态 (欧拉角 - 弧度)
    private yaw: number = 0;   // 左右旋转 (绕世界 Y)
    private pitch: number = 0; // 上下抬头 (绕局部 X)

    // 标记是否启用 (比如按住右键才启用)
    public enabled: boolean = true;

    constructor(game: Game, camera: Camera) {
        super();
        this.game = game;
        this.camera = camera;

        // 初始化 Yaw/Pitch (防止开启瞬间视角跳变)
        // 从 camera.rotation 反解出欧拉角
        const forward = vec3.fromValues(0, 0, -1);
        vec3.transformQuat(forward, forward, this.camera.rotation);
        vec3.normalize(forward, forward);
        this.yaw = Math.atan2(-forward[0], -forward[2]);
        this.pitch = Math.asin(Math.max(-1, Math.min(1, forward[1])));

        // Debug.log(LogChannel.System, `FreeCameraController initialized. Yaw: ${this.yaw}, Pitch: ${this.pitch}, camera rotation: ${this.camera.rotation}`);
    }

    update(delta: number) {
        if (!this.enabled) return;

        const input = this.game.getInput();

        // 1. 鼠标旋转控制 (通常按住鼠标右键启用)
        // 0:左键, 1:中键, 2:右键
        if (input.getMouseButton(0)) {
            const mouseDelta = input.getMouseDelta();

            // 左右动 -> 改变 Yaw (注意方向取反)
            this.yaw -= mouseDelta.x * this.lookSpeed;
            // 上下动 -> 改变 Pitch
            this.pitch -= mouseDelta.y * this.lookSpeed;

            // 限制抬头低头角度 (防止脖子折断，比如限制在 -89度 到 89度)
            const limit = Math.PI / 2 - 0.1;
            this.pitch = Math.max(-limit, Math.min(limit, this.pitch));

            // --- 核心数学：从欧拉角重构四元数 ---
            // 这样能保证没有 Roll (永远不会歪着头看世界)
            // Order: Y (Yaw) -> X (Pitch) -> Z (0)
            quat.fromEuler(
                this.camera.rotation,
                this.pitch * (180 / Math.PI), // gl-matrix 的 fromEuler 需要角度
                this.yaw * (180 / Math.PI),
                0
            );
            Debug.log(LogChannel.System, `Camera rotation updated. New rotation: ${this.camera.rotation}`);
        }

        // 2. 键盘移动控制
        // 计算当前速度
        let currentSpeed = this.moveSpeed * delta;
        if (input.getKey("ShiftLeft")) {
            currentSpeed *= this.shiftMultiplier;
        }

        const moveDir = vec3.create();

        // W/S - 前后 (沿着相机朝向)
        if (input.getKey("KeyW") || input.getKey("ArrowUp")) vec3.add(moveDir, moveDir, [0, 0, -1]);
        if (input.getKey("KeyS") || input.getKey("ArrowDown")) vec3.add(moveDir, moveDir, [0, 0, 1]);

        // A/D - 左右 (沿着相机右向量)
        if (input.getKey("KeyA") || input.getKey("ArrowLeft")) vec3.add(moveDir, moveDir, [-1, 0, 0]);
        if (input.getKey("KeyD") || input.getKey("ArrowRight")) vec3.add(moveDir, moveDir, [1, 0, 0]);

        // Q/E - 垂直升降 (沿着世界 Y 轴，像电梯一样)
        // 这比沿着相机 Y 轴飞更符合 Inspector 的习惯
        const worldUp = vec3.fromValues(0, 1, 0);
        if (input.getKey("KeyE") || input.getKey("Space")) vec3.scaleAndAdd(this.camera.position, this.camera.position, worldUp, currentSpeed);
        if (input.getKey("KeyQ") || input.getKey("ControlLeft")) vec3.scaleAndAdd(this.camera.position, this.camera.position, worldUp, -currentSpeed);

        // 3. 应用水平移动
        // 需要把本地的 moveDir 变换到世界空间，但忽略 Y 轴分量? 
        // 不，自由相机通常就是"看着哪里往哪里飞"
        if (vec3.length(moveDir) > 0) {
            vec3.normalize(moveDir, moveDir);
            // 将移动向量应用相机的旋转
            vec3.transformQuat(moveDir, moveDir, this.camera.rotation);

            vec3.scaleAndAdd(this.camera.position, this.camera.position, moveDir, currentSpeed);
        }
    }
}