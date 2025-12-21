import { vec3 } from "gl-matrix";
import { Challenger } from "./Challenger";

export class Ship extends Challenger {
    // 摄像机锚点（第一人称）
    public cockpitOffset: vec3 = vec3.fromValues(0, 1.5, -1.5); 
    // 第一人称视角时，摄像机向下俯视的角度（弧度）
    public firstPersonPitchDown: number = -0.5;
    // 摄像机锚点（第三人称，后上方）
    public thirdPersonOffset: vec3 = vec3.fromValues(0, 4.0, -6.5);
    // 第三人称视角时，摄像机向下俯视的角度（弧度）
    public thirdPersonPitchDown: number = 0.2;

    constructor() {
        super();
    }
}