import type { CameraView } from "@game/cameracontrollers";
import { Ship } from "./Ship";
import { vec3 } from "gl-matrix";
import { ThrusterFlame } from "../effects/ThrusterFlame";
import { TrailParticleEmitter } from "../effects/TrailParticleEmitter";


export class XFighter extends Ship {
    protected maxSpeed: number = 100;  // [m/s]
    protected maxAcceleration: number = 20;  // [m/s²]
    protected maxAngularSpeed: number = 10.0;  // [rad/s]
    protected maxAngularAcceleration: vec3 = vec3.fromValues(10, 10, 10);  // [rad/s²] 每个轴的最大角加速度[pitch, yaw, roll]


    protected cameraView: CameraView = {
        cockpitOffset: vec3.fromValues(0, 0.85, -0.9),
        firstPersonPitchDown: -0.25,
        thirdPersonOffset: vec3.fromValues(0, 4, -15),
        thirdPersonPitchDown: 0
    }

    constructor() {
        super("XFighter", {
            geometryId: 'ship_x-wing'
        });

        const thrusterFlame = new ThrusterFlame([
            // Single nozzle offset; tweak to match the model if needed
            vec3.fromValues(1.5, 0.7, -6),
            vec3.fromValues(-1.5, 0.7, -6),
            vec3.fromValues(1.5, -0.7, -6),
            vec3.fromValues(-1.5, -0.7, -6)
        ]);
        thrusterFlame.baseWidth = 0.5;
        thrusterFlame.maxLength = 3;
        thrusterFlame.parent = this;
        this.children.push(thrusterFlame);

        const particleEmitter = new TrailParticleEmitter();
        this.children.push(particleEmitter);
        particleEmitter.parent = this;
    }

    protected onUpdate(_delta: number): void {
        void _delta;
        // 这里可以添加 XFighter 特有的更新逻辑
    }
}
