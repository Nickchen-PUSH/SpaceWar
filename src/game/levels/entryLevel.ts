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
import { StartScreen } from "../ui/StartScreen";

type GameState = 'waiting' | 'playing';

export class entryLevel implements Level {

  private cameraController!: ShipCameraController;
  private playerController!: PlayerController;
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

    // Show Start Screen
    this.startScreen = new StartScreen(game);
    this.gameState = 'waiting';

    // 初始相机位置 (稍微远一点，或者就在原点)
    scene.mainCamera.position[0] = 0;
    scene.mainCamera.position[1] = 0;
    scene.mainCamera.position[2] = 20;
    scene.mainCamera.lookAt(vec3.fromValues(0, 0, 0));
  }

  private startGame(game: Game) {
    const scene = game.getScene();

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
    if (this.crosshair) this.crosshair.destroy();
    if (this.healthBar) this.healthBar.destroy();
    if (this.startScreen) this.startScreen.destroy();
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
        if (this.crosshair) this.crosshair.update(delta);
        if (this.healthBar) this.healthBar.update(delta);
    }
  }
}