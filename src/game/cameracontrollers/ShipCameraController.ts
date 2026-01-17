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

  // 过渡参数
  private transitionTime: number = 0;
  private readonly transitionDuration: number = 0.3; // 过渡时长（秒）

  // 过渡状态变量
  private inTransition: boolean = false;
  private startPos: vec3 = vec3.create();
  private endPos: vec3 = vec3.create();
  private startRot: quat = quat.create();
  private endRot: quat = quat.create();


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
    this.camera.lookAt(this.target.position);

    // 第一帧或切换视角时，启动平滑过渡
    if (this.firstFrame) {
      this.transitionTime = 0;
      this.startPos = vec3.clone(this.camera.position);
      this.startRot = quat.clone(this.camera.rotation);
      this.endPos = vec3.clone(targetPos);
      this.endRot = quat.clone(targetRot);
      this.firstFrame = false;
      this.inTransition = true;
      this.camera.lookAt(this.target.position);
      return;
    }

    // 按键V切换模式
    if (input.getKeyDown("KeyV")) {
      this.transitionTime = 0;
      this.startPos = vec3.clone(this.camera.position);
      this.startRot = quat.clone(this.camera.rotation)
      // 第一人称、第三人称互换
      this.mode =
        this.mode === CameraMode.FirstPerson
          ? CameraMode.ThirdPerson
          : CameraMode.FirstPerson;

      // 计算目标点和旋转
      const offset =
        this.mode === CameraMode.FirstPerson
          ? this.target.getCameraViewConfig().cockpitOffset
          : this.target.getCameraViewConfig().thirdPersonOffset;
      const targetPos = vec3.create();
      vec3.transformQuat(targetPos, offset, this.target.rotation);
      vec3.add(targetPos, this.target.position, targetPos);
      const targetRot = quat.clone(this.target.rotation);
      this.camera.lookAt(this.target.position);
      this.endPos = targetPos;
      this.endRot = targetRot;
      this.inTransition = true;
      return;
    }
    // 平滑过渡逻辑
    if (this.inTransition) {
      this.transitionTime += delta;
      const t = Math.min(this.transitionTime / this.transitionDuration, 1);
      vec3.lerp(this.camera.position, this.startPos, this.endPos, t);
      quat.slerp(this.camera.rotation, this.startRot, this.endRot, t);
      this.camera.lookAt(this.target.position);

      if (t >= 1) {
        this.inTransition = false;
      }
    }

    this.camera.acceleration = this.target.acceleration;
    vec3.copy(this.camera.angularAcceleration, this.target.angularAcceleration);
    
    Debug.log(LogChannel.GameLogic, `[CameraController] position=`, this.camera.position);
    Debug.log(LogChannel.GameLogic, `[CameraController] velocity=`, this.camera.velocity);
    Debug.log(LogChannel.GameLogic, `[CameraController] acceleration=`, this.camera.acceleration);
    Debug.log(LogChannel.GameLogic, `[Ship] position=`, this.target.position);
    Debug.log(LogChannel.GameLogic, `[Ship] velocity=`, this.target.velocity);
    Debug.log(LogChannel.GameLogic, `[Ship] acceleration=`, this.target.acceleration);
  }
}