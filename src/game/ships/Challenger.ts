import type { CameraView } from "@game/cameracontrollers";
import { Ship } from "./Ship";
import { vec3 } from "gl-matrix";

export class Challenger extends Ship {
    protected maxSpeed: number = 100;  // [m/s]
    protected maxAcceleration: number = 20;  // [m/s²]
    protected maxAngularSpeed: number = 10.0;  // [rad/s]
    protected maxAngularAcceleration: vec3 = vec3.fromValues(10, 10, 10);  // [rad/s²] 每个轴的最大角加速度[pitch, yaw, roll]


    protected cameraView: CameraView = {
        cockpitOffset: vec3.fromValues(0, 1, 3),
        firstPersonPitchDown: 0.1,
        thirdPersonOffset: vec3.fromValues(0, 3, -8),
        thirdPersonPitchDown: 0.2
    }

    constructor() {
        super("Challenger", {
            geometryId: 'ship_challenger_v1'
        });
    }

    protected onUpdate(delta: number): void {
        // 这里可以添加 Challenger 特有的更新逻辑
    }
}
