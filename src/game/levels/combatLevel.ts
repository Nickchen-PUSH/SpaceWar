import type { Level } from "./level";
import type { Game } from "@core/Game";
import { ShipCameraController } from "../cameracontrollers/ShipCameraController";
import { vec3 } from "gl-matrix";
import { PlayerController } from "../gamecontrollers/PlayerController";
import { XFighter } from "../ships/x-fighter";
import { EnemyController } from "../gamecontrollers/EnemyController";
import { TFighter } from "../ships/t-fighter";
import { Crosshair } from "../ui/Crosshair";
import { HealthBar } from "../ui/HealthBar";
import { StartScreen } from "../ui/StartScreen";
type GameState = 'waiting' | 'playing';

export class combatLevel implements Level {

  private cameraController!: ShipCameraController;
  private playerController!: PlayerController;
  private enemyController!: EnemyController;
  private crosshair!: Crosshair;
  private healthBar!: HealthBar;
  private startScreen!: StartScreen;
  private gameState: GameState = 'waiting';

  constructor() {
  }

  onEnter(game: Game): void {
    console.log("Entering Entry Level");
    const scene = game.getScene();

    scene.background = "sky_galaxy";
    this.startScreen = new StartScreen(game);
    this.gameState = 'waiting';
    // Set the initial camera position and orientation for this level
    scene.mainCamera.position[0] = 7;
    scene.mainCamera.position[1] = 1;
    scene.mainCamera.position[2] = 8;
    scene.mainCamera.lookAt(vec3.fromValues(0, 0, 0)); // Look at the origin
  }

  onExit(): void {
    console.log("Exiting Combat Level");
    if (this.crosshair) this.crosshair.destroy();
    if (this.healthBar) this.healthBar.destroy();
    if (this.startScreen) this.startScreen.destroy();
  }

  startGame(game: Game) {
    const scene = game.getScene();

    // Create and add the player's ship
    // const challenger = new Challenger();

    // scene.add(challenger);
    const xfighter = new XFighter(game);
    scene.add(xfighter);
    scene.addShipId(xfighter.id);

    const tfighter = new TFighter(game);
    scene.addShipId(tfighter.id);
    tfighter.position = vec3.fromValues(20, -20, 80);
    tfighter.lookAt(xfighter.position);
    scene.add(tfighter);

    // Set up the free camera controller
    // const cameraController = new FreeCameraController(game, scene.mainCamera);
    this.cameraController = new ShipCameraController(game, scene.mainCamera, xfighter);
    this.playerController = new PlayerController(game);
    this.playerController.possess(xfighter);

    this.enemyController = new EnemyController(game, xfighter);
    this.enemyController.addEnemy(tfighter);

    this.crosshair = new Crosshair(game);
    this.healthBar = new HealthBar(game);
    this.healthBar.setTarget(xfighter);
  }

  onUpdate(game: Game, delta: number): void {
    if (this.gameState === 'waiting') {
      if (game.getInput().isAnyKeyDown()) {
        this.startScreen.destroy();
        this.startGame(game);
        this.gameState = 'playing';
      }
      return;
    }

    if (this.gameState === 'playing') {
      this.cameraController.update(delta);
      this.playerController.update(delta);
      this.enemyController.update(delta);
      if (this.crosshair) this.crosshair.update(delta);
      if (this.healthBar) this.healthBar.update(delta);
    }
  }
}