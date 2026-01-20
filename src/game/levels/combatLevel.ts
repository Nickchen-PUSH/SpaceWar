import type { Level } from "./level";
import type { Game } from "@core/Game";
import { ShipCameraController } from "../cameracontrollers/ShipCameraController";
import { vec3 } from "gl-matrix";
import { PlayerController } from "../gamecontrollers/PlayerController";
import { XFighter } from "../ships/x-fighter";
import { EnemyController } from "../gamecontrollers/EnemyController";
import { TFighter } from "../ships/t-fighter";
import { StartScreen } from "../ui/StartScreen";
import { HUD } from "../ui/HUD";
import type { Scene } from "@scene";
import { Planet } from "../objects/Planet";
import { handleCelestialCollisions } from "../collision/CelestialCollision";
import { Meteor } from "@game/objects/meteor";
import { GameOverScreen } from "../ui/GameOverScreen";
type GameState = 'waiting' | 'playing' | 'failed';

type EncounterPhase = 'intermission' | 'spawning' | 'cleanup' | 'victory';

export class combatLevel implements Level {

  private cameraController!: ShipCameraController;
  private playerController!: PlayerController;
  private enemyController!: EnemyController;
  private startScreen!: StartScreen;
  private hud!: HUD;
  private gameOverScreen?: GameOverScreen;
  private gameState: GameState = 'waiting';

  // --- Encounter pacing ---
  private playerShip!: XFighter;
  private encounterPhase: EncounterPhase = 'intermission';
  private waveNumber: number = 0;
  private phaseTimer: number = 0;
  private waveSpawnCooldown: number = 0;
  private waveReinforcementTimer: number = 0;
  private waveToSpawn: number = 0;
  private waveSpawned: number = 0;
  private waveMaxAlive: number = 0;
  private readonly maxWaves: number = 6;

  constructor() {
  }

  onEnter(game: Game): void {
    console.log("Entering Entry Level");
    const scene = game.getScene();

    // Ensure a clean restart when re-entering this level.
    scene.clear();

    scene.background = "sky_galaxy";
    this.startScreen = new StartScreen(game);
    this.gameState = 'waiting';
    this.gameOverScreen = undefined;
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
    if (this.startScreen) this.startScreen.destroy();
    if (this.hud) this.hud.destroy();
    if (this.gameOverScreen) this.gameOverScreen.destroy();
  }

  initMap(scene: Scene){
    void scene;
  }

  startGame(game: Game) {
    const scene = game.getScene();

    // Create and add the player's ship
    // const challenger = new Challenger();

    // scene.add(challenger);
    const playerFighter = new XFighter(game);
    scene.add(playerFighter);
    scene.addShipId(playerFighter.id);

    this.playerShip = playerFighter;

    // const tfighter = new TFighter(game);
    // scene.addShipId(tfighter.id);
    // tfighter.position = vec3.fromValues(20, -20, 80);
    // tfighter.lookAt(xfighter.position);
    // scene.add(tfighter);


    // Set up the free camera controller
    // const cameraController = new FreeCameraController(game, scene.mainCamera);
    this.cameraController = new ShipCameraController(game, scene.mainCamera, playerFighter);
    this.playerController = new PlayerController(game);
    this.playerController.possess(playerFighter);

    this.enemyController = new EnemyController(game, playerFighter);
    this.hud = new HUD(game, playerFighter, this.enemyController);

    // Start encounter pacing (instead of spawning everything instantly).
    this.beginIntermission(2.0);
  }

  private beginIntermission(seconds: number): void {
    this.encounterPhase = 'intermission';
    this.phaseTimer = Math.max(0, seconds);
    this.waveSpawnCooldown = 0;
    this.waveReinforcementTimer = 0;
    this.waveToSpawn = 0;
    this.waveSpawned = 0;
    this.waveMaxAlive = 0;
    this.updateHudWaveText();
  }

  private startNextWave(): void {
    this.waveNumber += 1;
    this.encounterPhase = 'spawning';
    this.phaseTimer = 0;

    // Difficulty scaling: more total enemies and a higher "max alive" cap over time.
    const base = 3;
    const growth = 2;
    const bossBonus = (this.waveNumber % 3 === 0) ? 2 : 0;
    this.waveToSpawn = Math.min(14, base + (this.waveNumber - 1) * growth + bossBonus);
    this.waveMaxAlive = Math.min(7, 2 + Math.floor((this.waveNumber - 1) / 2));
    this.waveSpawned = 0;

    // Spawn cadence gets slightly faster.
    this.waveSpawnCooldown = 0.9;
    this.waveReinforcementTimer = 0;

    console.log(`[combatLevel] Wave ${this.waveNumber} incoming (spawn ${this.waveToSpawn}, maxAlive ${this.waveMaxAlive})`);
    this.hud?.showCenterMessage(`WAVE ${this.waveNumber}`, 1.6);
    this.updateHudWaveText();
  }

  private updateEncounter(game: Game, delta: number): void {
    // If player is gone, stop spawning new enemies.
    if (!this.playerShip || !this.playerShip.active) {
      if (this.hud) this.hud.setWaveText('PLAYER DOWN');
      return;
    }

    // Keep enemy list from growing unbounded (controller filters alive, but we can prune refs).
    // This is safe because ships are removed from the Scene on destruction.
    const alive = this.enemyController.getAliveEnemies().length;

    switch (this.encounterPhase) {
      case 'intermission': {
        this.phaseTimer -= delta;
        if (this.phaseTimer <= 0) {
          if (this.waveNumber >= this.maxWaves) {
            this.encounterPhase = 'victory';
            this.hud?.showCenterMessage('VICTORY', 2.4);
            this.updateHudWaveText();
          } else {
            this.startNextWave();
          }
        }
        break;
      }
      case 'spawning': {
        // Spawn gradually until waveToSpawn is reached.
        this.waveSpawnCooldown -= delta;
        this.waveReinforcementTimer += delta;

        const canSpawnMore = this.waveSpawned < this.waveToSpawn;
        const underAliveCap = alive < this.waveMaxAlive;

        if (canSpawnMore && underAliveCap && this.waveSpawnCooldown <= 0) {
          const burst = (this.waveNumber >= 4 && Math.random() < 0.25) ? 2 : 1;
          for (let i = 0; i < burst; i++) {
            if (this.waveSpawned >= this.waveToSpawn) break;
            if (this.enemyController.getAliveEnemies().length >= this.waveMaxAlive) break;
            this.spawnEnemyForWave(game, this.waveSpawned, this.waveToSpawn);
            this.waveSpawned += 1;
          }

          // Next spawn in ~0.6-1.1s depending on wave.
          const faster = Math.max(0, (this.waveNumber - 1) * 0.06);
          this.waveSpawnCooldown = Math.max(0.45, 0.95 - faster) + Math.random() * 0.25;
        }

        // When we've spawned the wave quota, switch to cleanup.
        if (this.waveSpawned >= this.waveToSpawn) {
          this.encounterPhase = 'cleanup';
          this.phaseTimer = 0;
          this.waveReinforcementTimer = 0;
          this.updateHudWaveText();
        }
        break;
      }
      case 'cleanup': {
        this.phaseTimer += delta;
        this.waveReinforcementTimer += delta;

        // If the player takes too long, send occasional reinforcements to keep pressure.
        if (alive > 0 && this.waveReinforcementTimer > 18) {
          this.waveReinforcementTimer = 0;

          const reinforcements = Math.random() < 0.5 ? 1 : 2;
          console.log(`[combatLevel] Reinforcements arriving (+${reinforcements})`);
          this.hud?.showCenterMessage('REINFORCEMENTS', 1.4);
          for (let i = 0; i < reinforcements; i++) {
            this.spawnEnemyReinforcement(game);
          }
        }

        // Wave cleared.
        if (alive === 0) {
          if (this.waveNumber >= this.maxWaves) {
            this.encounterPhase = 'victory';
            console.log('[combatLevel] Victory: all waves cleared');
            this.hud?.showCenterMessage('VICTORY', 2.4);
            this.updateHudWaveText();
          } else {
            // Short breather between waves.
            this.beginIntermission(3.0);
          }
        }
        break;
      }
      case 'victory': {
        // Nothing to do; keep HUD label.
        break;
      }
    }
  }

  private spawnEnemyForWave(game: Game, index: number, total: number): void {
    const scene = game.getScene();
    const playerPos = this.playerShip.position;

    // Pick a spawn pattern based on wave and index.
    const pattern = (this.waveNumber % 3);
    const radius = 80 + this.waveNumber * 18;

    const front = this.playerShip.getFront();
    const worldUp = vec3.fromValues(0, 1, 0);
    const right = vec3.create();
    vec3.cross(right, worldUp, front);
    if (vec3.length(right) < 1e-5) vec3.set(right, 1, 0, 0);
    vec3.normalize(right, right);

    const up = vec3.create();
    vec3.cross(up, front, right);
    vec3.normalize(up, up);

    const pos = vec3.create();

    if (pattern === 0) {
      // Ring: distributed on a sphere shell.
      const t = (index / Math.max(1, total)) * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random());
      const x = radius * Math.sin(phi) * Math.cos(t);
      const y = (radius * 0.35) * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(t);
      vec3.set(pos, playerPos[0] + x, playerPos[1] + y, playerPos[2] + z);
    } else if (pattern === 1) {
      // Pincer: left/right, slightly behind.
      const side = (index % 2 === 0) ? -1 : 1;
      const sideOffset = 90 + Math.random() * 60;
      const backOffset = -120 - Math.random() * 80;
      const heightOffset = (Math.random() * 2 - 1) * 40;

      vec3.copy(pos, playerPos);
      vec3.scaleAndAdd(pos, pos, right, side * sideOffset);
      vec3.scaleAndAdd(pos, pos, front, backOffset);
      vec3.scaleAndAdd(pos, pos, up, heightOffset);
    } else {
      // Frontline: spawn ahead with slight spread.
      const spreadX = (Math.random() * 2 - 1) * 110;
      const spreadY = (Math.random() * 2 - 1) * 50;
      const forwardOffset = 170 + Math.random() * 120;
      vec3.copy(pos, playerPos);
      vec3.scaleAndAdd(pos, pos, front, forwardOffset);
      vec3.scaleAndAdd(pos, pos, right, spreadX);
      vec3.scaleAndAdd(pos, pos, up, spreadY);
    }

    // Add some jitter so it doesn't look too grid-like.
    pos[0] += (Math.random() * 2 - 1) * 15;
    pos[1] += (Math.random() * 2 - 1) * 10;
    pos[2] += (Math.random() * 2 - 1) * 15;

    const isAce = (this.waveNumber >= 3 && Math.random() < 0.18) || (this.waveNumber % 3 === 0 && index === 0);

    const enemy = new TFighter(game);
    if (isAce) {
      enemy.name = 'Ace TFighter';
      enemy.maxHealth = 160;
      enemy.health = 160;
      enemy.shield = 60;
      enemy.hitRadius = Math.max(enemy.hitRadius, 10);
      enemy.setScale(0.012);
    } else {
      // Small scaling with wave.
      const hpBoost = Math.min(30, (this.waveNumber - 1) * 6);
      enemy.maxHealth = enemy.maxHealth + hpBoost;
      enemy.health = enemy.maxHealth;
      enemy.shield = enemy.shield + Math.floor(hpBoost * 0.25);
    }

    vec3.copy(enemy.position, pos);
    enemy.lookAt(playerPos);

    scene.addShipId(enemy.id);
    scene.add(enemy);
    this.enemyController.addEnemy(enemy);
  }

  private spawnEnemyReinforcement(game: Game): void {
    const scene = game.getScene();
    const playerPos = this.playerShip.position;
    const front = this.playerShip.getFront();
    const worldUp = vec3.fromValues(0, 1, 0);
    const right = vec3.create();
    vec3.cross(right, worldUp, front);
    if (vec3.length(right) < 1e-5) vec3.set(right, 1, 0, 0);
    vec3.normalize(right, right);

    const pos = vec3.create();
    vec3.copy(pos, playerPos);
    // Prefer behind/side so it feels like a surprise.
    vec3.scaleAndAdd(pos, pos, front, -180 - Math.random() * 80);
    vec3.scaleAndAdd(pos, pos, right, (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 60));
    pos[1] += (Math.random() * 2 - 1) * 35;

    const enemy = new TFighter(game);
    // Reinforcements are slightly tougher late-game.
    const hpBoost = Math.min(35, this.waveNumber * 6);
    enemy.maxHealth = enemy.maxHealth + hpBoost;
    enemy.health = enemy.maxHealth;
    enemy.shield = enemy.shield + Math.floor(hpBoost * 0.25);

    vec3.copy(enemy.position, pos);
    enemy.lookAt(playerPos);
    scene.addShipId(enemy.id);
    scene.add(enemy);
    this.enemyController.addEnemy(enemy);
  }

  private updateHudWaveText(): void {
    if (!this.hud) return;

    if (this.encounterPhase === 'victory') {
      this.hud.setWaveText('VICTORY');
      return;
    }

    if (this.encounterPhase === 'intermission') {
      const next = Math.min(this.maxWaves, this.waveNumber + 1);
      this.hud.setWaveText(`WAVE ${next} in ${Math.max(0, Math.ceil(this.phaseTimer))}s`);
      return;
    }

    if (this.encounterPhase === 'spawning') {
      this.hud.setWaveText(`WAVE ${this.waveNumber} (spawning)`);
      return;
    }

    if (this.encounterPhase === 'cleanup') {
      this.hud.setWaveText(`WAVE ${this.waveNumber}`);
      return;
    }

    this.hud.setWaveText(null);
  }

  onUpdate(game: Game, delta: number): void {
    if (this.gameState === 'waiting') {
      this.startScreen.update(delta);
      if (game.getInput().isAnyKeyDown()) {
        this.startScreen.destroy();
        this.startGame(game);
        this.gameState = 'playing';
      }
      return;
    }

    if (this.gameState === 'failed') {
      this.gameOverScreen?.update(delta);

      // Ask whether to retry: explicit confirm key.
      // if (game.getInput().getKeyDown('KeyR')) {
      //   game.levelManager.changeLevel(new combatLevel());
      // }
      return;
    }

    if (this.gameState === 'playing') {
      // Failure condition: player ship destroyed.
      if (!this.playerShip || !this.playerShip.active || this.playerShip.health <= 0) {
        // Remove HUD immediately on game over.
        if (this.hud) {
          this.hud.destroy();
          // HUD is created only after startGame(); make it falsy to avoid further updates.
          this.hud = undefined as unknown as HUD;
        }
        if (!this.gameOverScreen) {
          // HUD may self-destroy when the player dies; show a dedicated overlay instead.
          this.gameOverScreen = new GameOverScreen(game);
        }
        this.gameState = 'failed';
        return;
      }

      this.cameraController.update(delta);
      this.playerController.update(delta);
      this.enemyController.update(delta);
      if (this.hud) this.hud.update(delta);

      // Encounter pacing (waves / reinforcements)
      this.updateEncounter(game, delta);
      // Keep HUD countdown text fresh
      this.updateHudWaveText();
    }
  }

  onPostUpdate(game: Game, delta: number): void {
    if (this.gameState !== 'playing') return;
    handleCelestialCollisions(game, delta);
  }
}