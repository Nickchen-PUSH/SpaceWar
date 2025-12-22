import type { Level } from "./level";
import type { Game } from "@core/Game";
import { FreeCameraController } from "../cameracontrollers/FreeCameraController";
import { ShipCameraController } from "../cameracontrollers/ShipCameraController";
import { vec3 } from "gl-matrix";
import { Challenger } from "../ships/Challenger";
import { PlayerController } from "../gamecontrollers/PlayerController";

export class entryLevel implements Level {

  private cameraController!: ShipCameraController;
  private playerController!: PlayerController;

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
    const challenger = new Challenger();

    scene.add(challenger);

    // Set up the free camera controller
    // const cameraController = new FreeCameraController(game, scene.mainCamera);
    this.cameraController = new ShipCameraController(game, scene.mainCamera, challenger);
    this.playerController = new PlayerController(game);
    this.playerController.possess(challenger);
  }

  onExit(): void {
    console.log("Exiting Entry Level");
  }

  onUpdate(game: Game, delta: number): void {
    this.cameraController.update(delta);
    this.playerController.update(delta);
  }
}