import { vec3 } from "gl-matrix";
import { Entity } from "../../scene";
import type { CameraView } from "../cameracontrollers";
import type { MeshConfig } from "../../scene";
import { Debug, LogChannel } from "../../core/Debug";

export abstract class Ship extends Entity {

    protected cameraView: CameraView = {
        cockpitOffset: vec3.fromValues(0, 1, 3),
        firstPersonPitchDown: 0.1,
        thirdPersonOffset: vec3.fromValues(0, 3, -8),
        thirdPersonPitchDown: 0.2
    }

    // --- 基础机动参数 (由子类在构造函数中定义) ---
    protected abstract maxSpeed: number;
    protected abstract acceleration: number;
    protected abstract turnSpeed: number;

    // --- 阻理设置 ---
    protected drag: number = 0.95;  // 阻力系数（0.95-0.99），用于在松开按键时让飞船平滑减速。
    protected angularDrag: number = 0.9;  // 角阻力系数

    // --- 共有状态 ---
    public velocity: vec3 = vec3.create();
    public angularVelocity: vec3 = vec3.create();
    public health: number = 100;
    public shield: number = 50;

    constructor(name: string, meshConfig: MeshConfig) {
        super();
        this.name = name;
        this.meshConfig = meshConfig;
    }

    /**
     * 每一帧的更新逻辑
     * 我们在这里处理通用的物理模拟
     */
    public update(delta: number): void {
        // 1. 调用子类的特定逻辑（如 AI 决策或读取输入）
        this.onUpdate(delta);

        // 2. 物理模拟：应用线速度
        vec3.scaleAndAdd(this.position, this.position, this.velocity, delta);
        // 应用阻力
        vec3.scale(this.velocity, this.velocity, this.drag);

        // 3. 物理模拟：应用角速度（旋转）
        if (vec3.length(this.angularVelocity) > 0.001) {
            this.rotateX(this.angularVelocity[0] * delta);
            this.rotateY(this.angularVelocity[1] * delta);
            this.rotateZ(this.angularVelocity[2] * delta);
            // 应用旋转阻力
            vec3.scale(this.angularVelocity, this.angularVelocity, this.angularDrag);
        }
    }

    /**
     * 强制子类实现的钩子函数
     * 子类在这里修改 velocity 和 angularVelocity
     */
    protected abstract onUpdate(delta: number): void;

    /**
     * 受到伤害的逻辑
     */
    public takeDamage(amount: number) {
        if (this.shield > 0) {
            this.shield -= amount;
            if (this.shield < 0) {
                this.health += this.shield; // 剩余伤害扣血
                this.shield = 0;
            }
        } else {
            this.health -= amount;
        }

        if (this.health <= 0) {
            this.onDestroyed();
        }
    }

    protected onDestroyed() {
        // 触发爆炸逻辑
        Debug.log(LogChannel.GameLogic, `${this.name} was destroyed!`);
    }

    public getCameraViewConfig(): CameraView {
        return this.cameraView;
    }
}