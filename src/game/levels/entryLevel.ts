import type { Level } from "../../types";
import type { Game } from "@core/Game";
import { Ship } from "../ships/Ship";
// import { FreeCameraController } from "../FreeCameraController";
import { CameraController } from "../CameraController";
import { vec3 } from "gl-matrix";

export class entryLevel implements Level {

  constructor() {
  }

  onEnter(game: Game): void {
    console.log("Entering Entry Level");
    const scene = game.getScene();

    // Set the initial camera position and orientation for this level
    scene.mainCamera.position[0] = 7;
    scene.mainCamera.position[1] = 1;
    scene.mainCamera.position[2] = 8;
    scene.mainCamera.lookAt(vec3.fromValues(0, 0, 0)); // Look at the origin


    // Create and add the player's ship
    const ship = new Ship();
    ship.position[0] = 0;
    ship.position[1] = 0;
    ship.position[2] = 0;
    ship.name = "playerShip";
    ship.meshConfig = {
      geometryId: "spaceship"
    };

    scene.add(ship);

    // Set up the free camera controller
    // const cameraController = new FreeCameraController(game, scene.mainCamera);
    const cameraController = new CameraController(game, scene.mainCamera, ship);

    scene.add(cameraController);

  }

  onExit(): void {
    console.log("Exiting Entry Level");
  }

  onUpdate(game: Game, delta: number): void {

  }
}