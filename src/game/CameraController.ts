import { vec3, quat } from "gl-matrix";
import { Game } from "../core/Game";
import { Entity } from "../scene/Entity";
import { Ship } from "./ships/Ship";
import type { Camera } from "../scene/Camera";

export const CameraMode = {
  FirstPerson: 0,
  ThirdPerson: 1
} as const;

export type CameraMode = typeof CameraMode[keyof typeof CameraMode];

export class CameraController extends Entity {
  private camera: Camera;
  private game: Game;
  private target: Entity; // 跟随目标（如飞船）

  public mode: CameraMode = CameraMode.ThirdPerson;


  constructor(game: Game, camera: Camera, target: Entity) {
    super();
    this.game = game;
    this.camera = camera;
    this.target = target;
  }

  update(delta: number) {
    const input = this.game.getInput();

    if (input.getKeyDown("ControlLeft")) {
      this.mode =
        this.mode === CameraMode.FirstPerson
          ? CameraMode.ThirdPerson
          : CameraMode.FirstPerson;
    }

    if (!(this.target instanceof Ship)) return;

    // 获取锚点
    const offset =
      this.mode === CameraMode.FirstPerson
        ? this.target.cockpitOffset
        : this.target.thirdPersonOffset;

    // 计算相机世界位置：target.position + (target.rotation * offset)
    const worldOffset = vec3.create();
    vec3.transformQuat(worldOffset, offset, this.target.rotation);
    vec3.add(this.camera.position, this.target.position, worldOffset);

    // 相机朝向机头
    quat.copy(this.camera.rotation, this.target.rotation);
    // 模型前向修正：绕 Y 轴旋转 180°（π）
    quat.rotateY(this.camera.rotation, this.camera.rotation, Math.PI);

    // （可选）第一人称略微向上仰视一点
    if (this.mode === CameraMode.FirstPerson && this.target.firstPersonPitchDown !== 0) {
      quat.rotateX(this.camera.rotation, this.camera.rotation, -this.target.firstPersonPitchDown);
    }

    // （可选）第三人称略微向下俯视一点
    if (this.mode === CameraMode.ThirdPerson && this.target.thirdPersonPitchDown !== 0) {
      quat.rotateX(this.camera.rotation, this.camera.rotation, -this.target.thirdPersonPitchDown);
    }
  }
}