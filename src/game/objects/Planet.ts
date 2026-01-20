import { vec3 } from "gl-matrix";
import { CelestialBody } from "./CelestialBody";

export type PlanetModelId = "earth" | "lava_planet" | "mercury_planet";

export interface PlanetOptions {
  position?: vec3;
  scale?: number;
  hitRadius?: number;
  spinSpeed?: number; // rad/s
}

export class Planet extends CelestialBody {
  public readonly modelId: PlanetModelId;

  constructor(modelId: PlanetModelId, options: PlanetOptions = {}) {
    super(
      "Planet",
      { geometryId: modelId },
      {
        position: options.position,
        scale: options.scale ?? 0.6,
        hitRadius: options.hitRadius ?? 30,
        // 行星默认慢速自转
        spinSpeed: options.spinSpeed ?? 0.15,
        spinSpace: "world",
        // 行星通常不需要阻尼
        drag: 1,
        angularDrag: 1,
        // 静态：不做平移/角速度积分，但依旧允许 spin
        isStatic: true,
      }
    );

    this.modelId = modelId;
  }
}
