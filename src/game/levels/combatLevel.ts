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
import type { Scene } from "@scene";
import { Planet } from "../objects/Planet";
import { handleCelestialCollisions } from "../collision/CelestialCollision";
import { Meteor } from "@game/objects/meteor";
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
    scene.mainCamera.position[0] = 0;
    scene.mainCamera.position[1] = 0;
    scene.mainCamera.position[2] = 1;
    scene.mainCamera.lookAt(vec3.fromValues(0, 0, -1)); // Look at the origin

    // Add celestial bodies for ambience (visible on start screen too)
    this.spawnCelestials(scene);
  }

  private spawnCelestials(scene: Scene): void {
    const mercury = new Planet("mercury_planet", {
      position: vec3.fromValues(150, 0, 400),
      scale: 30,
      spinSpeed: 0.02,
      hitRadius: 150,
    });
    scene.add(mercury);

    // Mercury meteor ring
    const ring_meteor_count = 300;
    for (let i = 0; i < ring_meteor_count; i++) {
      const baseAngle = (i / ring_meteor_count) * Math.PI * 2;
      // 给角度一点抖动，避免等间距“刻度盘”效果
      const angleJitter = (Math.random() * 2 - 1) * (Math.PI * 2 / ring_meteor_count) * 0.55;
      const angle = baseAngle + angleJitter;

      // 环的“厚度”：半径随机扰动 + 垂直厚度
      const ringRadius = 300;
      const ringThickness = 40;
      const radius = ringRadius + (Math.random() * 2 - 1) * ringThickness;
      const height = (Math.random() * 2 - 1) * 25;

      const pos = vec3.fromValues(
        Math.cos(angle) * radius + mercury.position[0],
        height + mercury.position[1],
        Math.sin(angle) * radius + mercury.position[2]
      );

      // 速度：主要是切向（绕行星），但加入一点径向/上下漂移
      const tangentSpeed = 3 + Math.random() * 6;
      const radialDrift = (Math.random() * 2 - 1) * 1.2;
      const verticalDrift = (Math.random() * 2 - 1) * 0.6;

      const tangent = vec3.fromValues(-Math.sin(angle), 0, Math.cos(angle));
      const radial = vec3.fromValues(Math.cos(angle), 0, Math.sin(angle));
      const vel = vec3.create();
      vec3.scaleAndAdd(vel, vel, tangent, tangentSpeed);
      vec3.scaleAndAdd(vel, vel, radial, radialDrift);
      vel[1] += verticalDrift;

      const m = new Meteor(Meteor.randomModelId(), {
        position: pos,
        velocity: vel,
        // 视觉随机大小（避免全都一样）
        scale: 6 + Math.random() * 500,
        hitRadius: 8 + Math.random() * 6,
        spinSpeed: (Math.random() * 2 - 1) * 0.5,
        maxDistanceFromOrigin: 1000,
      });
      scene.add(m);
    }

    const lava_planet = new Planet("lava_planet", {
      position: vec3.fromValues(-300, 100, 120),
      scale: 150,
      spinSpeed: 0.01,
      hitRadius: 150,
    });
    scene.add(lava_planet);

    // Meteors drifting across the combat space
    // for (let i = 0; i < meteorCount; i++) {
    //   const pos = vec3.fromValues(
    //     (Math.random() * 2 - 1) * 100,
    //     (Math.random() * 2 - 1) * 100,
    //     (Math.random() * 2 - 1) * 100
    //   );

    //   const vel = vec3.fromValues(
    //     (Math.random() * 2 - 1) * 5,
    //     (Math.random() * 2 - 1) * 2,
    //     (Math.random() * 2 - 1) * 3
    //   );

    //   const m = new Meteor(Meteor.randomModelId(), {
    //     position: pos,
    //     velocity: vel,
    //     scale: Math.random()*1000,
    //     hitRadius: 6,
    //     spinSpeed: (Math.random() * 2 - 1) * 0.5,
    //     maxDistanceFromOrigin: 800,
    //   });
    //   scene.add(m);
    // }
  }

  onExit(): void {
    console.log("Exiting Combat Level");
    if (this.crosshair) this.crosshair.destroy();
    if (this.healthBar) this.healthBar.destroy();
    if (this.startScreen) this.startScreen.destroy();
  }

  initMap(scene: Scene){
    void scene;
  }

  startGame(game: Game) {
    const scene = game.getScene();

    // Create and add the player's ship
    // const challenger = new Challenger();

    // scene.add(challenger);
    const xfighter = new XFighter(game);
    scene.add(xfighter);
    scene.addShipId(xfighter.id);

    // const tfighter = new TFighter(game);
    // scene.addShipId(tfighter.id);
    // tfighter.position = vec3.fromValues(20, -20, 80);
    // tfighter.lookAt(xfighter.position);
    // scene.add(tfighter);


    // Set up the free camera controller
    // const cameraController = new FreeCameraController(game, scene.mainCamera);
    this.cameraController = new ShipCameraController(game, scene.mainCamera, xfighter);
    this.playerController = new PlayerController(game);
    this.playerController.possess(xfighter);

    this.enemyController = new EnemyController(game, xfighter);
        const enemy_count = 5;
    for (let i = 0; i < enemy_count; i++) {
      const tfighter = new TFighter(game);
      scene.addShipId(tfighter.id);
      // 随机分布在玩家周围一个大球壳上
      const radius = 150;
      const phi = Math.acos(1 - 2 * Math.random());
      const theta = Math.random() * Math.PI * 2;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      tfighter.position = vec3.fromValues(x, y, z);
      tfighter.lookAt(xfighter.position);
      scene.add(tfighter);
      this.enemyController.addEnemy(tfighter);
    }
    // this.enemyController.addEnemy(tfighter);

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

  onPostUpdate(game: Game, delta: number): void {
    if (this.gameState !== 'playing') return;
    handleCelestialCollisions(game, delta);
  }
}