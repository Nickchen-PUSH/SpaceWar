import type { CameraView } from "@game/cameracontrollers";
import { Ship } from "./Ship";
import { vec3 } from "gl-matrix";
import type { Game } from "@core/Game";
import { Debug, LogChannel } from "@core/Debug";
import { Bullet } from "@game/objects/Bullet";

export class TFighter extends Ship {
    protected maxSpeed: number = 400;  // [m/s]
    protected maxAcceleration: number = 40;  // [m/s²]
    protected maxAngularSpeed: number = 5.0;  // [rad/s]
    protected maxAngularAcceleration: vec3 = vec3.fromValues(5, 5, 5);  // [rad/s²] 每个轴的最大角加速度[pitch, yaw, roll]

    public maxHealth: number = 40;
    public health: number = 40;
    public shield: number = 10;

    // 碰撞半径（球形）
    public hitRadius: number = 8.0;

    // 子弹间隔
    private fireCooldown = 1.0;
    private fireTimer = 0;

    protected cameraView: CameraView = {
        cockpitOffset: vec3.fromValues(0, 0.88, -0.7),
        firstPersonPitchDown: -0.1,
        thirdPersonOffset: vec3.fromValues(0, 4, -15),
        thirdPersonPitchDown: -0.2
    }

    constructor(game: Game) {
        super(game,
            "TFighter", {
            geometryId: 'ship_t-fighter',
        });
        this.setScale(0.01);

        // const thrusterFlame = new ThrusterFlame([
        //     vec3.fromValues(0, 0.1, -1.6),
        // ]);
        // thrusterFlame.baseWidth = 0.22;
        // thrusterFlame.maxLength = 2.4;
        // thrusterFlame.parent = this;
        // this.children.push(thrusterFlame);
        // tie fighter has no visible thruster flame
    }

    protected onUpdate(_delta: number): void {
        void _delta;
        // 这里可以添加 TFighter 特有的更新逻辑
        this.fireTimer += _delta;
        
        if (this.isFiring && this.fireTimer >= this.fireCooldown) {
            this.fire();
            this.fireTimer = 0;
        }
        this.isFiring = false;
    }

    private fire(): void {
            const muzzleOffset = vec3.fromValues(0, 0, 0);
            const worldMuzzle = vec3.create();
            vec3.transformQuat(worldMuzzle, muzzleOffset, this.rotation);
            vec3.add(worldMuzzle, worldMuzzle, this.position);
    
            // 子弹方向应由飞船自身朝向决定（不受摄像机影响）
            const finalFront = this.getFront();
            Debug.log(LogChannel.GameLogic, `TFighter firing bullet from ${vec3.str(worldMuzzle)} towards ${vec3.str(finalFront)}`);
    
            const bullet = new  Bullet(
                worldMuzzle,
                finalFront,
                this,
                this.game
            );
            this.game.getScene().add(bullet);
        }
}
