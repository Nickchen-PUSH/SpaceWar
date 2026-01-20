import type { Level } from "./level";
import type { Game } from "@core/Game";
import { ShipCameraController } from "../cameracontrollers/ShipCameraController";
import { EnemyController } from "../gamecontrollers/EnemyController";
import { vec3 } from "gl-matrix";
import { PlayerController } from "../gamecontrollers/PlayerController";
import { XFighter } from "../ships/x-fighter";
import { TFighter } from "../ships/t-fighter";
import { StartScreen } from "../ui/StartScreen";
import { HUD } from "../ui/HUD";
import { Planet } from "../objects/Planet";
import { Meteor } from "../objects/meteor";
import type { Scene } from "@scene";
import { handleCelestialCollisions } from "../collision/CelestialCollision";

type GameState = 'waiting' | 'playing';

export class entryLevel implements Level {

  private cameraController!: ShipCameraController;
  private playerController!: PlayerController;
  private enemyController!: EnemyController;
  private startScreen!: StartScreen;
  private hud!: HUD;
  
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

    // Add some celestial bodies for ambience (visible on start screen too)
    this.spawnCelestials(scene);
  }

  private spawnCelestials(scene: Scene): void {
    // Planets
    const earth = new Planet("earth", {
      position: vec3.fromValues(-40, -10, -120),
      scale: 1.2,
      spinSpeed: 0.12,
      hitRadius: 40,
    });
    scene.add(earth);

    const lava = new Planet("lava_planet", {
      position: vec3.fromValues(55, 20, -180),
      scale: 0.9,
      spinSpeed: 0.18,
      hitRadius: 35,
    });
    scene.add(lava);

    // Meteors ring / field
    const meteorCount = 28;
    const radius = 85;
    for (let i = 0; i < meteorCount; i++) {
      const a = (i / meteorCount) * Math.PI * 2;
      const r = radius + (Math.random() * 2 - 1) * 18;
      const y = (Math.random() * 2 - 1) * 18;
      const pos = vec3.fromValues(Math.cos(a) * r, y, Math.sin(a) * r);

      // Give a subtle tangential drift
      const tangent = vec3.fromValues(-Math.sin(a), 0, Math.cos(a));
      vec3.normalize(tangent, tangent);
      const vel = vec3.create();
      vec3.scale(vel, tangent, 6 + Math.random() * 6);

      const m = new Meteor(Meteor.randomModelId(), {
        position: pos,
        velocity: vel,
        scale: 0.02 + Math.random() * 0.015,
        hitRadius: 6,
        spinSpeed: (Math.random() * 2 - 1) * 0.9,
        maxDistanceFromOrigin: 600,
      });
      scene.add(m);
    }
  }

  private startGame(game: Game) {
    const scene = game.getScene();

    // Create and add the player's ship
    // const challenger = new Challenger();
    // scene.add(challenger);
    const tfighter = new TFighter(game);
    tfighter.position = vec3.fromValues(20, 0, 0);
    scene.add(tfighter);
    scene.addShipId(tfighter.id);
  
    const xfighter = new XFighter(game);
    scene.add(xfighter);
    scene.addShipId(xfighter.id);

    // Set up the free camera controller
    // const cameraController = new FreeCameraController(game, scene.mainCamera);
    this.cameraController = new ShipCameraController(game, scene.mainCamera, xfighter);
    this.playerController = new PlayerController(game);
    this.playerController.possess(xfighter);
    this.enemyController = new EnemyController(game, xfighter);
    this.enemyController.addEnemy(tfighter);

    // Initialize UI
    this.hud = new HUD(game, xfighter, this.enemyController);
  }

  onExit(): void {
    console.log("Exiting Entry Level");
    if (this.startScreen) this.startScreen.destroy();
    if (this.hud) this.hud.destroy();
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
      if (this.hud) this.hud.update(delta);
    }
  }

  onPostUpdate(game: Game, delta: number): void {
    if (this.gameState !== 'playing') return;
    handleCelestialCollisions(game, delta);
  }
}