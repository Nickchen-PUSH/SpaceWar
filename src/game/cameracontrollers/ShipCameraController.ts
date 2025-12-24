import { vec3, quat } from "gl-matrix";
import { Game } from "../../core/Game";
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

  public mode: CameraMode = CameraMode.ThirdPerson;

  // --- 新增平滑过渡相关变量 ---
  private transitionTime: number = 0.5; // 过渡时长（秒）
  private transitionProgress: number = 1; // 0=开始，1=结束
  private fromPos: vec3 = vec3.create();
  private toPos: vec3 = vec3.create();
  private fromRot: quat = quat.create();
  private toRot: quat = quat.create();
  private transitioning: boolean = false;

  constructor(game: Game, camera: Camera, target: Ship) {
    this.game = game;
    this.camera = camera;
    this.target = target;
  }

  update(delta: number) {
    const input = this.game.getInput();

    // 触发切换
    if (input.getKeyDown("KeyV")) {
      // 记录切换前的相机位置和旋转
      vec3.copy(this.fromPos, this.camera.position);
      quat.copy(this.fromRot, this.camera.rotation);

      // 计算切换后的目标位置和旋转
      const nextMode =
        this.mode === CameraMode.FirstPerson
          ? CameraMode.ThirdPerson
          : CameraMode.FirstPerson;
      const offset =
        nextMode === CameraMode.FirstPerson
          ? this.target.getCameraViewConfig().cockpitOffset
          : this.target.getCameraViewConfig().thirdPersonOffset;
      vec3.transformQuat(this.toPos, offset, this.target.rotation);
      vec3.add(this.toPos, this.target.position, this.toPos);

      quat.copy(this.toRot, this.target.rotation);
      quat.rotateY(this.toRot, this.toRot, Math.PI);
      if (nextMode === CameraMode.FirstPerson && this.target.getCameraViewConfig().firstPersonPitchDown !== 0) {
        quat.rotateX(this.toRot, this.toRot, -this.target.getCameraViewConfig().firstPersonPitchDown);
      }
      if (nextMode === CameraMode.ThirdPerson && this.target.getCameraViewConfig().thirdPersonPitchDown !== 0) {
        quat.rotateX(this.toRot, this.toRot, -this.target.getCameraViewConfig().thirdPersonPitchDown);
      }

      this.transitionProgress = 0;
      this.transitioning = true;
      this.mode = nextMode;
    }

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

    // 平滑过渡
    if (this.transitioning) {
      this.transitionProgress += delta / this.transitionTime;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.transitioning = false;
      }
      // 插值
      vec3.lerp(this.camera.position, this.fromPos, targetPos, this.transitionProgress);
      quat.slerp(this.camera.rotation, this.fromRot, targetRot, this.transitionProgress);
    } else {
      // 正常跟随
      vec3.copy(this.camera.position, targetPos);
      quat.copy(this.camera.rotation, targetRot);
    }
  }
}