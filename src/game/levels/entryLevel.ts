import type { Level } from "./level";
import type { Game } from "@core/Game";
import { FreeCameraController } from "../cameracontrollers/FreeCameraController";
import { ShipCameraController } from "../cameracontrollers/ShipCameraController";
import { vec3 } from "gl-matrix";
import { Challenger } from "../ships/Challenger";
import { PlayerController } from "../gamecontrollers/PlayerController";
import { XFighter } from "../ships/x-fighter";
import { TrailParticleEmitter } from "../effects/TrailParticleEmitter";
import { Crosshair } from "../ui/Crosshair";
import { HealthBar } from "../ui/HealthBar";

export class entryLevel implements Level {

  private cameraController!: FreeCameraController;
  private playerController!: PlayerController;
  private crosshair!: Crosshair;
  private healthBar!: HealthBar;

  constructor() {
  }

  onEnter(game: Game): void {
    console.log("Entering Entry Level");
    const scene = game.getScene();

    scene.background = "sky_galaxy";

    // Set the initial camera position and orientation for this level
    scene.mainCamera.position[0] = 7;
    scene.mainCamera.position[1] = 1;
    scene.mainCamera.position[2] = 8;
    scene.mainCamera.lookAt(vec3.fromValues(0, 0, 0)); // Look at the origin


    // Create and add the player's ship
    // const challenger = new Challenger();

    // scene.add(challenger);
    const xfighter = new XFighter();
    scene.add(xfighter);

    // Create and attach the particle emitter
    const particleEmitter = new TrailParticleEmitter();
    xfighter.children.push(particleEmitter);
    particleEmitter.parent = xfighter;
    scene.add(particleEmitter);

    // Set up the free camera controller
    // const cameraController = new FreeCameraController(game, scene.mainCamera);
    this.cameraController = new ShipCameraController(game, scene.mainCamera, xfighter);
    this.playerController = new PlayerController(game);
    this.playerController.possess(xfighter);

    // Initialize UI
    this.crosshair = new Crosshair(game);
    this.healthBar = new HealthBar(game);
    this.healthBar.setTarget(xfighter);
  }

  onExit(): void {
    console.log("Exiting Entry Level");
    if (this.crosshair) {
      this.crosshair.destroy();
    }
    if (this.healthBar) {
      this.healthBar.destroy();
    }
  }

  onUpdate(game: Game, delta: number): void {
    this.cameraController.update(delta);
    this.playerController.update(delta);
    if (this.crosshair) {
      this.crosshair.update(delta);
    }
    if (this.healthBar) {
        this.healthBar.update(delta);
    }
  }
}