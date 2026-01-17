import { vec3, quat, mat4 } from "gl-matrix";
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

const TEMP_MAT4 = mat4.create();
const UP_VECTOR = vec3.fromValues(0, 1, 0);
const ZERO_VEC3 = vec3.fromValues(0, 0, 0);
const FIRST_PERSON_YAW_FLIP = quat.setAxisAngle(quat.create(), UP_VECTOR, Math.PI);

export class ShipCameraController {
  private camera: Camera;
  private game: Game;
  private target: Ship;

  private firstFrame: boolean = true;

  public mode: CameraMode = CameraMode.ThirdPerson;

  // 过渡参数
  private transitionTime: number = 0;
  private readonly transitionDuration: number = 0.3; // 过渡时长（秒）

  // 跟随平滑参数 (越大越“跟手”)
  private readonly positionSharpness: number = 18;
  private readonly rotationSharpness: number = 20;

  // 过渡状态变量
  private inTransition: boolean = false;
  private startPos: vec3 = vec3.create();
  private endPos: vec3 = vec3.create();
  private startRot: quat = quat.create();
  private endRot: quat = quat.create();

  // 缓存对象，避免每帧 GC
  private desiredPos: vec3 = vec3.create();
  private desiredRot: quat = quat.create();
  private predictedPos: vec3 = vec3.create();
  private predictedRot: quat = quat.create();
  private tempAxis: vec3 = vec3.create();
  private tempDeltaRot: quat = quat.create();
  private tempUp: vec3 = vec3.create();

  constructor(game: Game, camera: Camera, target: Ship) {
    this.game = game;
    this.camera = camera;
    this.target = target;
  }

  update(delta: number) {
    const input = this.game.getInput();

    // 计算目标位置/旋转（包含预测，减小一帧滞后）
    this.computeDesiredPose(delta, this.desiredPos, this.desiredRot);

    // 第一帧或切换视角时，启动平滑过渡
    if (this.firstFrame) {
      this.transitionTime = 0;
      vec3.copy(this.startPos, this.camera.position);
      quat.copy(this.startRot, this.camera.rotation);
      vec3.copy(this.endPos, this.desiredPos);
      quat.copy(this.endRot, this.desiredRot);
      this.firstFrame = false;
      this.inTransition = true;
      this.applyPoseImmediate(this.endPos, this.endRot);
      return;
    }

    // 按键V切换模式
    if (input.getKeyDown("KeyV")) {
      this.transitionTime = 0;
      vec3.copy(this.startPos, this.camera.position);
      quat.copy(this.startRot, this.camera.rotation);
      // 第一人称、第三人称互换
      this.mode =
        this.mode === CameraMode.FirstPerson
          ? CameraMode.ThirdPerson
          : CameraMode.FirstPerson;

      // 计算目标点和旋转
      this.computeDesiredPose(delta, this.endPos, this.endRot);
      this.inTransition = true;
    }

    // 过渡期间：目标点需要每帧更新，确保与飞船同步
    if (this.inTransition) {
      this.computeDesiredPose(delta, this.endPos, this.endRot);
    }

    // 平滑过渡逻辑
    if (this.inTransition) {
      if (this.mode === CameraMode.FirstPerson) {
        // 第一人称不允许滞后，直接贴到座舱
        this.applyPoseImmediate(this.endPos, this.endRot);
        this.inTransition = false;
      } else {
        this.transitionTime += delta;
        const t = Math.min(this.transitionTime / this.transitionDuration, 1);
        vec3.lerp(this.camera.position, this.startPos, this.endPos, t);
        quat.slerp(this.camera.rotation, this.startRot, this.endRot, t);
        if (t >= 1) {
          this.inTransition = false;
        }
      }
    } else if (this.mode === CameraMode.FirstPerson) {
      // 第一人称：严格绑定到座舱位置，避免加速时穿模
      this.applyPoseImmediate(this.desiredPos, this.desiredRot);
    } else {
      // 常规跟随逻辑（指数平滑）
      const posT = 1 - Math.exp(-this.positionSharpness * delta);
      const rotT = 1 - Math.exp(-this.rotationSharpness * delta);
      vec3.lerp(this.camera.position, this.camera.position, this.desiredPos, posT);
      quat.slerp(this.camera.rotation, this.camera.rotation, this.desiredRot, rotT);
    }

    // 相机作为“跟随体”，不参与物理模拟
    this.camera.acceleration = 0;
    vec3.copy(this.camera.angularAcceleration, ZERO_VEC3);
    vec3.copy(this.camera.velocity, ZERO_VEC3);
    vec3.copy(this.camera.angularVelocity, ZERO_VEC3);
  }

  private computeDesiredPose(delta: number, outPos: vec3, outRot: quat) {
    const view = this.target.getCameraViewConfig();

    // 预测下一帧飞船状态，减少相机滞后
    vec3.scaleAndAdd(this.predictedPos, this.target.position, this.target.velocity, delta);
    if (this.target.acceleration !== 0) {
      const accelVec = vec3.create();
      vec3.scale(accelVec, this.target.getFront(), this.target.acceleration);
      vec3.scaleAndAdd(this.predictedPos, this.predictedPos, accelVec, 0.5 * delta * delta);
    }

    const angularSpeed = vec3.length(this.target.angularVelocity);
    if (angularSpeed > 0) {
      vec3.normalize(this.tempAxis, this.target.angularVelocity);
      quat.setAxisAngle(this.tempDeltaRot, this.tempAxis, angularSpeed * delta);
      quat.multiply(this.predictedRot, this.target.rotation, this.tempDeltaRot);
    } else {
      quat.copy(this.predictedRot, this.target.rotation);
    }

    const offset =
      this.mode === CameraMode.FirstPerson
        ? view.cockpitOffset
        : view.thirdPersonOffset;

    vec3.transformQuat(outPos, offset, this.predictedRot);
    vec3.add(outPos, this.predictedPos, outPos);

    if (this.mode === CameraMode.FirstPerson) {
      // 相机前向为 -Z，需要绕 Y 轴翻转才能与飞船前向(+Z)一致
      quat.multiply(outRot, this.predictedRot, FIRST_PERSON_YAW_FLIP);
      if (view.firstPersonPitchDown !== 0) {
        quat.rotateX(outRot, outRot, -view.firstPersonPitchDown);
      }
      return;
    }

    // 第三人称：使用飞船自身的上方向作为 up，避免越过 90° 时翻转
    vec3.transformQuat(this.tempUp, UP_VECTOR, this.predictedRot);
    vec3.normalize(this.tempUp, this.tempUp);
    mat4.lookAt(TEMP_MAT4, outPos, this.predictedPos, this.tempUp);
    mat4.getRotation(outRot, TEMP_MAT4);
    quat.invert(outRot, outRot);
    if (view.thirdPersonPitchDown !== 0) {
      quat.rotateX(outRot, outRot, -view.thirdPersonPitchDown);
    }
  }

  private applyPoseImmediate(pos: vec3, rot: quat) {
    vec3.copy(this.camera.position, pos);
    quat.copy(this.camera.rotation, rot);
  }
}