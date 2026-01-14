import { Debug, LogChannel } from "../../core/Debug";
import { vec3, quat } from "gl-matrix";
import { Game } from "../../core/Game";
import { Entity } from "../../scene/Entity";
import { Ship } from "../ships/Ship";
import type { Camera } from "../../scene/Camera";

export const CameraMode = {
  FirstPerson: 0,
  ThirdPerson: 1
} as const;

export type CameraView = {
  // 摄像机锚点（第一人称）
  cockpitOffset: vec3
  // 第一人称视角时，摄像机向下俯视的角度（弧度）
  firstPersonPitchDown: number
  // 摄像机锚点（第三人称，后上方）
  thirdPersonOffset: vec3
  // 第三人称视角时，摄像机向下俯视的角度（弧度）
  thirdPersonPitchDown: number
}

export type CameraMode = typeof CameraMode[keyof typeof CameraMode];

export class ShipCameraController {
  private camera: Camera;
  private game: Game;
  private target: Ship;

  private firstFrame: boolean = true;

  public mode: CameraMode = CameraMode.ThirdPerson;

  constructor(game: Game, camera: Camera, target: Ship) {
    this.game = game;
    this.camera = camera;
    this.target = target;
  }

  update(delta: number) {
    const input = this.game.getInput();

    // 计算目标 offset/rotation
    const offset =
      this.mode === CameraMode.FirstPerson
        ? this.target.getCameraViewConfig().cockpitOffset
        : this.target.getCameraViewConfig().thirdPersonOffset;
    const targetPos = vec3.create();
    vec3.transformQuat(targetPos, offset, this.target.rotation);
    vec3.add(targetPos, this.target.position, targetPos);

    const targetRot = quat.clone(this.target.rotation);
    quat.rotateY(targetRot, targetRot, Math.PI);
    if (this.mode === CameraMode.FirstPerson && this.target.getCameraViewConfig().firstPersonPitchDown !== 0) {
      quat.rotateX(targetRot, targetRot, -this.target.getCameraViewConfig().firstPersonPitchDown);
    }
    if (this.mode === CameraMode.ThirdPerson && this.target.getCameraViewConfig().thirdPersonPitchDown !== 0) {
      quat.rotateX(targetRot, targetRot, -this.target.getCameraViewConfig().thirdPersonPitchDown);
    }

    // 第一帧或切换视角时，直接跳转到目标位置和朝向
    if (this.firstFrame || input.getKeyDown("KeyV")) {
      vec3.copy(this.camera.position, targetPos);
      quat.copy(this.camera.rotation, targetRot);
      vec3.set(this.camera.velocity, 0, 0, 0);
      vec3.set(this.camera.angularVelocity, 0, 0, 0);
      this.camera.acceleration = 0;
      vec3.set(this.camera.angularAcceleration, 0, 0, 0);

      // 切换模式
      if (input.getKeyDown("KeyV")) {
        this.mode =
          this.mode === CameraMode.FirstPerson
            ? CameraMode.ThirdPerson
            : CameraMode.FirstPerson;
      }
      this.firstFrame = false;
      return;
    }
    this.camera.acceleration = this.target.acceleration;
    vec3.copy(this.camera.angularAcceleration, this.target.angularAcceleration);
    this.camera.update(delta);
    
    if (this.target.acceleration > 0)
      Debug.log(LogChannel.GameLogic, `[CameraController] camera.acceleration=`, this.camera.acceleration, "velocity=", this.camera.velocity);
      Debug.log(LogChannel.GameLogic, `[Ship] ship.acceleration=`, this.target.acceleration, "velocity=", this.target.velocity);
  }
}