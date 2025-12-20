import { Vector3 } from "three";
import type { Level } from "../../types";
import type { Game } from "../../core/Game";
import { RotatingShip } from "../entities/RotatingShip";

export class entryLevel implements Level {
  private cameraOrbitRadius: number = 50;
  private cameraOrbitSpeed: number = 0.5;

  onEnter(game: Game): void {
    console.log("Entering Entry Level");
    const scene = game.getScene();

    // Set the initial camera position and orientation for this level
    scene.mainCamera.position.x = 0;
    scene.mainCamera.position.y = 20;
    scene.mainCamera.position.z = this.cameraOrbitRadius;
    scene.mainCamera.lookAt(new Vector3(0, 0, 0)); // Look at the origin

    // Create and add the player's ship
    const ship = new RotatingShip();
    ship.name = "playerShip";
    ship.meshConfig = {
      geometryId: "spaceship"
    };

    scene.add(ship);
  }

  onExit(): void {
    console.log("Exiting Entry Level");
  }

  onUpdate(game: Game, delta: number): void {
    const scene = game.getScene();
    const time = game.getTime();
    
    // Calculate new position for orbiting camera
    const angle = time.elapsed * this.cameraOrbitSpeed;
    scene.mainCamera.position.x = Math.sin(angle) * this.cameraOrbitRadius;
    scene.mainCamera.position.z = Math.cos(angle) * this.cameraOrbitRadius;
    scene.mainCamera.lookAt(new Vector3(0, 0, 0)); // Always look at the ship at the origin
  }
}