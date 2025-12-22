import type { Level } from "./level";
import type { Game } from "@core/Game";
import { FreeCameraController } from "../cameracontrollers/FreeCameraController";
import { CameraController } from "../cameracontrollers/CameraController";
import { vec3 } from "gl-matrix";
import { Challenger } from "../../game/ships/Challenger";

export class entryLevel implements Level {

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
    const cameraController = new CameraController(game, scene.mainCamera, challenger);
    scene.add(cameraController);

  }

  onExit(): void {
    console.log("Exiting Entry Level");
  }

  onUpdate(game: Game, delta: number): void {

  }
}