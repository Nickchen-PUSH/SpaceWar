import type { CameraView } from "@game/cameracontrollers";
import { Ship } from "./Ship";
import { vec3 } from "gl-matrix";

export class Challenger extends Ship {
    protected maxSpeed: number = 150;
    protected acceleration: number = 50;
    protected maxAngularSpeed: number = 1.0;

    protected cameraView: CameraView ={
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
