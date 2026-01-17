import type { CameraView } from "@game/cameracontrollers";
import { Ship } from "./Ship";
import { vec3 } from "gl-matrix";

export class TFighter extends Ship {
    protected maxSpeed: number = 100;  // [m/s]
    protected maxAcceleration: number = 20;  // [m/s²]
    protected maxAngularSpeed: number = 10.0;  // [rad/s]
    protected maxAngularAcceleration: vec3 = vec3.fromValues(10, 10, 10);  // [rad/s²] 每个轴的最大角加速度[pitch, yaw, roll]


    protected cameraView: CameraView = {
        cockpitOffset: vec3.fromValues(0, 0.85, -1),
        firstPersonPitchDown: 0,
        thirdPersonOffset: vec3.fromValues(0, 3, -10),
        thirdPersonPitchDown: 0.2
    }

    constructor() {
        super("TFighter", {
            geometryId: 'ship_t-fighter'
        });
        this.setScale(0.015);
    }

    protected onUpdate(delta: number): void {
        // 这里可以添加 TFighter 特有的更新逻辑
    }
}
