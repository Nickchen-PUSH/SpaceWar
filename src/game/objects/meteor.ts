import { vec3 } from "gl-matrix";
import { CelestialBody } from "./CelestialBody";

export type MeteorModelId = "meteor_a" | "meteor_b" | "meteor_c" | "meteor_d";

export interface MeteorOptions {
	position?: vec3;
	velocity?: vec3;

	/** 视觉缩放：不同模型单位可能不一致，默认给一个偏小的值。 */
	scale?: number;

	/** 碰撞半径（球形）。 */
	hitRadius?: number;

	/** 自转速度 (rad/s)。 */
	spinSpeed?: number;

	/** 超出原点距离后自动销毁。 */
	maxDistanceFromOrigin?: number;
}

export class Meteor extends CelestialBody {
	public readonly modelId: MeteorModelId;

	constructor(modelId: MeteorModelId, options: MeteorOptions = {}) {
		super(
			"Meteor",
			{ geometryId: modelId },
			{
				position: options.position,
				velocity: options.velocity,
				hitRadius: options.hitRadius ?? 6,
				spinSpeed: options.spinSpeed ?? (Math.random() * 2 - 1) * 0.6,
				spinSpace: "world",
				drag: 1,
				angularDrag: 1,
				maxDistanceFromOrigin: options.maxDistanceFromOrigin,
				scale: options.scale ?? 0.02,
			}
		);

		this.modelId = modelId;
	}

	public static randomModelId(): MeteorModelId {
		const ids: MeteorModelId[] = ["meteor_a", "meteor_b", "meteor_c", "meteor_d"];
		return ids[Math.floor(Math.random() * ids.length)]!;
	}
}

