import type { CameraView } from "../cameracontrollers";
import { Ship } from "./Ship";
import { Bullet } from "../objects/Bullet";
import { vec3 } from "gl-matrix";
import type { Game } from "@core/Game";
import { ThrusterFlame } from "../effects/ThrusterFlame";
import { TrailParticleEmitter } from "../effects/TrailParticleEmitter";
import { Debug, LogChannel } from "../../core/Debug";


export class XFighter extends Ship {
    protected maxSpeed: number = 500;  // [m/s]
    protected maxAcceleration: number = 50;  // [m/s²]
    protected maxAngularSpeed: number = 5.0;  // [rad/s]
    protected maxAngularAcceleration: vec3 = vec3.fromValues(3, 2, 7);  // [rad/s²] 每个轴的最大角加速度[pitch, yaw, roll]
    
    public maxhealth: number = 100;
    public health: number = 100;
    // 碰撞半径（球形）
    public hitRadius: number = 2.0;

    // 子弹间隔
    private fireCooldown = 0.5;
    private fireTimer = 0;


    protected cameraView: CameraView = {
        cockpitOffset: vec3.fromValues(0, 0.88, -0.7),
        firstPersonPitchDown: -0.1,
        thirdPersonOffset: vec3.fromValues(0, 4, -15),
        thirdPersonPitchDown: -0.2
    }

    constructor(game: Game) {
        super(game,
            "XFighter", {
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

    protected onUpdate(delta: number): void {
        // 发射间隔
        this.fireTimer += delta;
        
        if (this.isFiring && this.fireTimer >= this.fireCooldown) {
            this.fire();
            this.fireTimer = 0;
        }
        this.isFiring = false;
    }

    private fire(): void {
        const muzzleOffset = vec3.fromValues(0, 0, 4);
        const worldMuzzle = vec3.create();
        vec3.transformQuat(worldMuzzle, muzzleOffset, this.rotation);
        vec3.add(worldMuzzle, worldMuzzle, this.position);

        // const shipFront = this.getFront();
        // Debug.log(LogChannel.GameLogic, `Ship front: ${shipFront[0].toFixed(2)}, ${shipFront[1].toFixed(2)}, ${shipFront[2].toFixed(2)}`);
        // const cameraFront = this.game.getScene().mainCamera.getFront();
        // Debug.log(LogChannel.GameLogic, `Camera front: ${cameraFront[0].toFixed(2)}, ${cameraFront[1].toFixed(2)}, ${cameraFront[2].toFixed(2)}`);
        // const bulletFront = vec3.create();
        // vec3.normalize(bulletFront, this.velocity);
        // Debug.log(LogChannel.GameLogic, `Bullet front: ${bulletFront[0].toFixed(2)}, ${bulletFront[1].toFixed(2)}, ${bulletFront[2].toFixed(2)}`);
        
        // // 获取摄像机正向（世界空间）
        // const camera = this.game.getScene().mainCamera;
        // const cameraFrontWorld = camera.getFront();

        // // 用飞船的旋转辅助：将摄像机正向转换到飞船局部空间，再变回世界空间
        // // 这样可以考虑飞船的roll
        // const shipRotationInv = quat.create();
        // quat.invert(shipRotationInv, this.rotation);
        // const localFront = vec3.create();
        // vec3.transformQuat(localFront, cameraFrontWorld, shipRotationInv);

        // // 再变回世界空间（其实就是 cameraFrontWorld，但这样能兼容各种姿态）
        // const finalFront = vec3.create();
        // vec3.transformQuat(finalFront, localFront, this.rotation);
        // vec3.normalize(finalFront, finalFront);
        // 子弹方向应由飞船自身朝向决定（不受摄像机影响）
        const finalFront = this.getFront();

        Debug.log(LogChannel.GameLogic, `XFighter firing bullet from ${vec3.str(worldMuzzle)} towards ${vec3.str(finalFront)}`);
        const bullet = new Bullet(
            worldMuzzle,
            finalFront,
            this,
            this.game
        );
        this.game.getScene().add(bullet);
    }
}
