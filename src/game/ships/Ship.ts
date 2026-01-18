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

    protected drag: number = 0.5;
    protected angularDrag: number = 0.2;

    // --- 共有状态 ---
    public maxHealth: number = 100;
    public health: number = 100;
    public shield: number = 50;

    // --- 控制输入信号 (范围 -1.0 到 1.0) ---
    // 这些变量代表了"飞行员"当前的意图
    protected inputThrottle: number = 0; // -1(倒车) ~ 1(全速)
    protected inputPitch: number = 0;    // -1(下) ~ 1(上)
    protected inputYaw: number = 0;      // -1(左) ~ 1(右)
    protected inputRoll: number = 0;     // -1(左滚) ~ 1(右滚)
    protected isFiring: boolean = false; // 是否正在开火

    /**
     * 供 Controller 调用的指令方法
     */
    public setControlInput(throttle: number, pitch: number, yaw: number, roll: number) {
        this.inputThrottle = throttle;
        this.inputPitch = pitch;
        this.inputYaw = yaw;
        this.inputRoll = roll;
    }

    /**
     * Forward throttle input in [0, 1].
     * Negative throttle (brake/reverse intent) returns 0 for effects like thrusters.
     */
    public getForwardThrottle01(): number {
        return Math.max(0, Math.min(1, this.inputThrottle));
    }

    public setFiring(firing: boolean) {
        this.isFiring = firing;
    }

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
        // 调用子类的特定逻辑
        this.onUpdate(delta);

        // 根据输入更新加速度
        this.acceleration = this.inputThrottle * this.maxAcceleration;
        vec3.set(
            this.angularAcceleration,
            this.inputPitch * this.maxAngularAcceleration[0],
            this.inputYaw * this.maxAngularAcceleration[1],
            this.inputRoll * this.maxAngularAcceleration[2]
        );
        this.applyPhysics(delta);
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