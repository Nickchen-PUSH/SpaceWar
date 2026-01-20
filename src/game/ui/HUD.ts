import * as THREE from "three";
import { vec3 } from "gl-matrix";

import type { Game } from "@core/Game";
import type { Ship } from "../ships/Ship";
import type { EnemyController } from "../gamecontrollers/EnemyController";
import { UIRect, UISprite, UIText, type UIElement } from "../../ui";

type ScreenProjection = {
  uiX: number;
  uiY: number;
  inFront: boolean;
  ndcX: number;
  ndcY: number;
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getRendererCameras(game: Game): { camera: THREE.PerspectiveCamera; uiCamera: THREE.OrthographicCamera } | null {
  const r = game.getRenderer() as any;
  if (!r) return null;
  if (r.camera && r.uiCamera) {
    return { camera: r.camera as THREE.PerspectiveCamera, uiCamera: r.uiCamera as THREE.OrthographicCamera };
  }
  return null;
}

function worldToUI(game: Game, world: vec3): ScreenProjection | null {
  const cams = getRendererCameras(game);
  if (!cams) return null;

  const { camera, uiCamera } = cams;

  const worldV = new THREE.Vector3(world[0], world[1], world[2]);
  const camPos = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  camera.getWorldDirection(camDir);

  const toTarget = worldV.clone().sub(camPos);
  const inFront = toTarget.dot(camDir) > 0;

  const ndc = worldV.clone().project(camera);
  const uiX = ndc.x * uiCamera.right;
  const uiY = ndc.y * uiCamera.top;

  return { uiX, uiY, inFront, ndcX: ndc.x, ndcY: ndc.y };
}

class EnemyMarker {
  public readonly root: UIElement;

  private game: Game;

  private readonly boxSize = 50;
  private readonly box: UISprite;

  private readonly tri: UIText;
  private readonly hp: UIText;
  private readonly arrow: UIText;

  constructor(game: Game) {
    this.game = game;
    this.root = new UIRect(0, 0, 0, 0);

    // Enemy box is a single `white_block` sprite (full rectangle marker).
    this.box = new UISprite("white_block");
    this.box.setSize(this.boxSize, this.boxSize);
    this.box.setPosition(0, 0);
    this.box.opacity = 0.9;

    this.tri = new UIText("▼", 30);
    this.tri.setColor("#ff2b2b");
    this.tri.setPosition(0, this.boxSize / 2 + 12);

    this.hp = new UIText("", 14);
    this.hp.setColor("#ffffff");
    this.hp.setPosition(0, this.boxSize / 2 + 28);

    this.arrow = new UIText("▶", 35);
    this.arrow.setColor("#ff2b2b");
    this.arrow.visible = false;

    this.root.addChild(this.box);
    this.root.addChild(this.tri);
    this.root.addChild(this.hp);
    this.root.addChild(this.arrow);

    this.game.getUIManager().addElement(this.root);
  }

  public update(
    screen: { uiX: number; uiY: number },
    opts: {
      visible: boolean;
      offscreenArrow?: { uiX: number; uiY: number; angleRad: number };
      hpText?: string;
      isNearest?: boolean;
      scale?: number;
    }
  ) {
    this.root.visible = opts.visible;
    if (!opts.visible) return;

    this.root.setPosition(screen.uiX, screen.uiY);

    // Styling: nearest enemy is highlighted.
    if (opts.isNearest) {
      this.setBoxOpacity(1.0);
      this.tri.setColor("#ffd43b");
      this.arrow.setColor("#ffd43b");
      this.hp.setColor("#ffd43b");
      this.root.zIndex = 2;
    } else {
      this.setBoxOpacity(0.8);
      this.tri.setColor("#ff2b2b");
      this.arrow.setColor("#ff2b2b");
      this.hp.setColor("#ffffff");
      this.root.zIndex = 1;
    }

    if (opts.hpText !== undefined) {
      this.hp.setText(opts.hpText);
    }

    const hasArrow = !!opts.offscreenArrow;

    // Distance-based scaling is only for on-screen box markers.
    const scale = !hasArrow ? (opts.scale ?? 1) : 1;
    this.root.setScale(scale, scale);

    // On-screen: show box + triangle + hp.
    this.box.visible = !hasArrow;
    this.tri.visible = !hasArrow;
    this.hp.visible = !hasArrow;

    // Off-screen: show arrow on screen edge (arrow itself is positioned in absolute UI coords).
    this.arrow.visible = hasArrow;
    if (opts.offscreenArrow) {
      this.arrow.setPosition(opts.offscreenArrow.uiX - screen.uiX, opts.offscreenArrow.uiY - screen.uiY);
      this.arrow.rotation = opts.offscreenArrow.angleRad;
    }
  }

  private setBoxOpacity(opacity: number) {
    this.box.opacity = opacity;
  }

  public destroy(): void {
    this.game.getUIManager().removeElement(this.root);
  }
}

export class HUD {
  private game: Game;
  private player: Ship;
  private enemyController: EnemyController;

  private disposed: boolean = false;

  private readonly root: UIElement;
  private readonly panelBg: UIRect;

  private readonly lineHealth: UIText;
  private readonly lineSpeed: UIText;
  private readonly lineHeading: UIText;
  private readonly lineEnemies: UIText;

  // --- Key guide (right side) ---
  private readonly keyGuideBg: UIRect;
  private readonly keyGuideTitle: UIText;
  private readonly keyGuideLines: UIText[];
  private readonly keyGuideWidth: number = 280;
  private readonly keyGuideRow: number = 20;

  // Optional label injected by level logic (waves, reinforcements, etc.).
  private waveText: string | null = null;

  // --- Center message (big toast) ---
  private readonly centerMsgRoot: UIElement;
  private readonly centerMsgBg: UIRect;
  private readonly centerMsgShadow: UIText;
  private readonly centerMsgText: UIText;
  private centerMsgRemaining: number = 0;
  private centerMsgDuration: number = 0;

  // --- Crosshair ---
  private readonly crosshair: UISprite;
  private readonly crosshairHit: UISprite;
  private readonly crosshairMargin: number = 20;
  private readonly crosshairForwardDistance: number = 400;

  private readonly hitFlashDuration: number = 0.12;
  private hitFlashRemaining: number = 0;
  private readonly killFlashDuration: number = 0.52;
  private killFlashRemaining: number = 0;
  private onHudHit?: (ev: CustomEvent<any>) => void;
  private onHudKill?: (ev: CustomEvent<any>) => void;

  // --- Health bar (bottom-left) ---
  private readonly healthContainer: UIElement;
  private readonly healthBg: UIRect;
  private readonly healthFill: UIRect;
  private readonly healthBarWidth: number = 220;
  private readonly healthBarHeight: number = 18;
  private readonly healthBarPadding: number = 2;

  private readonly markerByEnemyId = new Map<string, EnemyMarker>();

  constructor(
    game: Game,
    player: Ship,
    enemyController: EnemyController
  ) {
    this.game = game;
    this.player = player;
    this.enemyController = enemyController;

    this.root = new UIRect(0, 0, 0, 0);
    // NOTE: In ThreeRenderer, zIndex is used directly as world-space Z in the UI scene.
    // uiCamera sits at z=10, so large zIndex values can put UI at/behind the camera plane.
    this.root.zIndex = 0;

    // --- Status panel (top-left) ---
    this.panelBg = new UIRect(0.06, 0.06, 0.08, 0.55);
    this.panelBg.setSize(280, 120);
    this.root.addChild(this.panelBg);

    this.lineHealth = new UIText("HP:", 16);
    this.lineSpeed = new UIText("SPD:", 16);
    this.lineHeading = new UIText("HDG:", 16);
    this.lineEnemies = new UIText("ENM:", 16);

    this.lineHealth.setColor("#e6edf3");
    this.lineSpeed.setColor("#e6edf3");
    this.lineHeading.setColor("#e6edf3");
    this.lineEnemies.setColor("#e6edf3");

    this.root.addChild(this.lineHealth);
    this.root.addChild(this.lineSpeed);
    this.root.addChild(this.lineHeading);
    this.root.addChild(this.lineEnemies);

    // --- Key guide (top-right) ---
    this.keyGuideBg = new UIRect(0.06, 0.06, 0.08, 0.55);
    this.keyGuideBg.setSize(this.keyGuideWidth, 180);
    this.root.addChild(this.keyGuideBg);

    this.keyGuideTitle = new UIText("按键指引", 16);
    this.keyGuideTitle.setColor("#e6edf3");
    this.root.addChild(this.keyGuideTitle);

    const lines = [
      "W / S: 油门 (加速 / 减速)",
      "A / D: 偏航 (Yaw)",
      "↑ / ↓: 俯仰 (Pitch)",
      "← / →: 翻滚 (Roll)",
      "Space: 开火",
    ];

    this.keyGuideLines = lines.map((t) => {
      const line = new UIText(t, 14);
      line.setColor("#e6edf3");
      this.root.addChild(line);
      return line;
    });

    // --- Crosshair ---
    this.crosshair = new UISprite("crosshair");
    this.crosshair.setSize(64, 64);
    this.crosshair.opacity = 1;
    this.crosshair.zIndex = 1;
    this.root.addChild(this.crosshair);

    // Hit-confirm overlay (normally hidden)
    this.crosshairHit = new UISprite("crosshair-hit");
    this.crosshairHit.setSize(64, 64);
    this.crosshairHit.opacity = 0.95;
    this.crosshairHit.zIndex = 2;
    this.crosshairHit.visible = false;
    this.root.addChild(this.crosshairHit);

    // --- Health bar ---
    this.healthContainer = new UIRect(0, 0, 0, 0);
    this.healthContainer.zIndex = 0;

    this.healthBg = new UIRect(0.1, 0.1, 0.1, 0.8);
    this.healthBg.setSize(this.healthBarWidth + this.healthBarPadding * 2, this.healthBarHeight + this.healthBarPadding * 2);
    this.healthContainer.addChild(this.healthBg);

    this.healthFill = new UIRect(0.2, 0.8, 0.2, 1.0);
    this.healthFill.setSize(this.healthBarWidth, this.healthBarHeight);
    this.healthContainer.addChild(this.healthFill);

    this.root.addChild(this.healthContainer);

    // --- Center big message ---
    this.centerMsgRoot = new UIRect(0, 0, 0, 0);
    this.centerMsgRoot.zIndex = 10;

    this.centerMsgBg = new UIRect(0, 0, 0, 0.0);
    this.centerMsgBg.zIndex = 0;

    // Shadow first (drawn behind)
    this.centerMsgShadow = new UIText("", 68);
    this.centerMsgShadow.setColor("#000000");
    this.centerMsgShadow.zIndex = 1;
    this.centerMsgShadow.opacity = 0;

    this.centerMsgText = new UIText("", 68);
    this.centerMsgText.setColor("#ffd43b");
    this.centerMsgText.zIndex = 2;
    this.centerMsgText.opacity = 0;

    this.centerMsgRoot.addChild(this.centerMsgBg);
    this.centerMsgRoot.addChild(this.centerMsgShadow);
    this.centerMsgRoot.addChild(this.centerMsgText);
    this.centerMsgRoot.visible = false;
    this.root.addChild(this.centerMsgRoot);

    this.game.getUIManager().addElement(this.root);

    this.onHudHit = () => {
      this.hitFlashRemaining = this.hitFlashDuration;
    };
    this.game.on("hud:hit", this.onHudHit);

    this.onHudKill = () => {
      this.killFlashRemaining = this.killFlashDuration;
      // Also keep a base hit flash so the kill feels "snappy".
      this.hitFlashRemaining = Math.max(this.hitFlashRemaining, this.hitFlashDuration);
    };
    this.game.on("hud:kill", this.onHudKill);
  }

  public setWaveText(text: string | null): void {
    this.waveText = text;
  }

  public showCenterMessage(text: string, durationSeconds: number = 1.8): void {
    const t = (text ?? "").trim();
    if (!t) return;

    this.centerMsgText.setText(t);
    this.centerMsgShadow.setText(t);

    this.centerMsgDuration = Math.max(0.6, durationSeconds);
    this.centerMsgRemaining = this.centerMsgDuration;
    this.centerMsgRoot.visible = true;
  }

  public update(delta: number): void {
    if (this.disposed) return;

    // Auto-hide/remove HUD when player is dead.
    if (!this.player.active || this.player.health <= 0) {
      this.destroy();
      return;
    }

    this.hitFlashRemaining = Math.max(0, this.hitFlashRemaining - delta);
    this.killFlashRemaining = Math.max(0, this.killFlashRemaining - delta);

    const cams = getRendererCameras(this.game);
    if (!cams) return;

    this.updatePanelText();
    this.layoutPanel(cams.uiCamera);
    this.layoutKeyGuide(cams.uiCamera);
    this.layoutHealthBar(cams.uiCamera);
    this.updateHealthBar();
    this.updateCrosshair(cams.uiCamera);
    this.updateCenterMessage(delta);
    this.updateEnemyMarkers(cams);
  }

  private layoutKeyGuide(uiCamera: THREE.OrthographicCamera): void {
    const margin = 18;
    const panelW = this.keyGuideBg.size[0];

    const row = this.keyGuideRow;
    const titleTopPadding = 22;
    const lineTopPadding = 46;
    const bottomPadding = 16;

    // Auto-fit panel height to content.
    const panelH = lineTopPadding + this.keyGuideLines.length * row + bottomPadding;
    this.keyGuideBg.setSize(panelW, panelH);

    const x = uiCamera.right - panelW / 2 - margin;
    const y = uiCamera.top - panelH / 2 - margin;
    this.keyGuideBg.setPosition(x, y);

    const left = x - panelW / 2 + 14;
    const top = y + panelH / 2;

    this.keyGuideTitle.setPosition(left + this.keyGuideTitle.size[0] / 2, top - titleTopPadding);

    for (let i = 0; i < this.keyGuideLines.length; i++) {
      const line = this.keyGuideLines[i];
      line.setPosition(left + line.size[0] / 2, top - lineTopPadding - i * row);
    }
  }

  private updateCenterMessage(delta: number): void {
    if (!this.centerMsgRoot.visible) return;

    this.centerMsgRemaining = Math.max(0, this.centerMsgRemaining - delta);
    const remaining = this.centerMsgRemaining;
    const duration = Math.max(0.001, this.centerMsgDuration);
    const t = remaining / duration; // 1 -> 0

    if (remaining <= 0) {
      this.centerMsgRoot.visible = false;
      this.centerMsgText.opacity = 0;
      this.centerMsgShadow.opacity = 0;
      this.centerMsgBg.setColor(0, 0, 0, 0);
      return;
    }

    // Fade in/out (simple envelope)
    const fadeIn = 0.18;
    const fadeOut = 0.28;
    let alpha = 1;
    const elapsed = 1 - t;

    if (elapsed < fadeIn) {
      alpha = clamp(elapsed / fadeIn, 0, 1);
    } else if (t < fadeOut) {
      alpha = clamp(t / fadeOut, 0, 1);
    }

    // Slight pop-in scale then settle.
    const pop = 1.12;
    const settle = 1.0;
    const scaleT = clamp(elapsed / 0.22, 0, 1);
    const s = pop + (settle - pop) * scaleT;

    this.centerMsgRoot.setPosition(0, 0);
    this.centerMsgRoot.setScale(s, s);

    // Layout: background box + text centered.
    const paddingX = 2;
    const paddingY = 2;
    const w = Math.max(this.centerMsgText.size[0], this.centerMsgShadow.size[0]);
    const h = Math.max(this.centerMsgText.size[1], this.centerMsgShadow.size[1]);
    this.centerMsgBg.setSize(w + paddingX, h + paddingY);
    this.centerMsgBg.setPosition(0, 0);
    this.centerMsgBg.setColor(0, 0, 0, 0.35 * alpha);

    // Shadow offset a bit for contrast.
    this.centerMsgShadow.setPosition(3, -3);
    this.centerMsgShadow.opacity = 0.65 * alpha;

    this.centerMsgText.setPosition(0, 0);
    this.centerMsgText.opacity = alpha;
  }

  private layoutPanel(uiCamera: THREE.OrthographicCamera): void {
    const margin = 18;
    const panelW = this.panelBg.size[0];
    const panelH = this.panelBg.size[1];

    const x = uiCamera.left + panelW / 2 + margin;
    const y = uiCamera.top - panelH / 2 - margin;

    this.panelBg.setPosition(x, y);

    // Text positions are relative to root, so we place them near panel.
    const left = x - panelW / 2 + 14;
    const top = y + panelH / 2 - 24;
    const row = 24;

    // UIText is center-anchored in our renderer, so to left-align to `left` we add half the text width.
    this.lineHealth.setPosition(left + this.lineHealth.size[0] / 2, top);
    this.lineSpeed.setPosition(left + this.lineSpeed.size[0] / 2, top - row);
    this.lineHeading.setPosition(left + this.lineHeading.size[0] / 2, top - row * 2);
    this.lineEnemies.setPosition(left + this.lineEnemies.size[0] / 2, top - row * 3);
  }

  private updatePanelText(): void {
    const hp = Math.max(0, this.player.health);
    const hpMax = Math.max(1, this.player.maxHealth);
    const hpPct = (hp / hpMax) * 100;

    const speed = vec3.length(this.player.velocity);

    const front = this.player.getFront();
    const headingDeg = (Math.atan2(front[0], front[2]) * 180 / Math.PI + 360) % 360;
    const pitchDeg = Math.asin(clamp(front[1], -1, 1)) * 180 / Math.PI;

    const enemyCount = this.enemyController.getAliveEnemies().length;

    this.lineHealth.setText(`HP: ${hp.toFixed(0)} / ${hpMax.toFixed(0)} (${hpPct.toFixed(0)}%)`);
    this.lineSpeed.setText(`SPD: ${speed.toFixed(1)} m/s`);
    this.lineHeading.setText(`HDG: ${headingDeg.toFixed(0)}°  PITCH: ${pitchDeg.toFixed(0)}°`);
    const prefix = this.waveText ? `${this.waveText}  ` : "";
    this.lineEnemies.setText(`${prefix}ENM: ${enemyCount}`);
  }

  private layoutHealthBar(uiCamera: THREE.OrthographicCamera): void {
    const margin = 18;
    const x = uiCamera.left + (this.healthBarWidth / 2) + margin + this.healthBarPadding;
    const y = uiCamera.bottom + (this.healthBarHeight / 2) + margin + this.healthBarPadding;
    this.healthContainer.setPosition(x, y);
  }

  private updateHealthBar(): void {
    const hp = Math.max(0, this.player.health);
    const hpMax = Math.max(1, this.player.maxHealth);
    const healthPct = clamp(hp / hpMax, 0, 1);

    if (healthPct > 0.6) {
      this.healthFill.setColor(0.2, 0.8, 0.2, 1.0);
    } else if (healthPct > 0.3) {
      this.healthFill.setColor(0.8, 0.8, 0.2, 1.0);
    } else {
      this.healthFill.setColor(0.8, 0.2, 0.2, 1.0);
    }

    this.healthFill.setScale(healthPct, 1);
    this.healthFill.setPosition((this.healthBarWidth / 2) * (healthPct - 1), 0);
  }

  private updateCrosshair(uiCamera: THREE.OrthographicCamera): void {
    const front = this.player.getFront();
    const aimWorld = vec3.create();
    vec3.scaleAndAdd(aimWorld, this.player.position, front, this.crosshairForwardDistance);

    const proj = worldToUI(this.game, aimWorld);
    if (!proj) {
      this.crosshair.visible = false;
      this.crosshairHit.visible = false;
      return;
    }
    this.crosshair.visible = true;

    // Clamp to screen bounds so it never disappears.
    const left = uiCamera.left + this.crosshairMargin;
    const right = uiCamera.right - this.crosshairMargin;
    const top = uiCamera.top - this.crosshairMargin;
    const bottom = uiCamera.bottom + this.crosshairMargin;

    const x = clamp(proj.uiX, left, right);
    const y = clamp(proj.uiY, bottom, top);
    this.crosshair.setPosition(x, y);

    const showKill = this.killFlashRemaining > 0;
    const showHit = this.hitFlashRemaining > 0;
    const showOverlay = showKill || showHit;

    this.crosshairHit.visible = showOverlay;
    if (showOverlay) {
      this.crosshairHit.setPosition(x, y);

      if (showKill) {
        const t = this.killFlashRemaining / this.killFlashDuration;
        const scale = 1 + 0.45 * t;
        this.crosshairHit.setScale(scale, scale);
        this.crosshairHit.opacity = 0.75 + 0.25 * t;
      } else {
        const t = this.hitFlashRemaining / this.hitFlashDuration;
        const scale = 1 + 0.20 * t;
        this.crosshairHit.setScale(scale, scale);
        this.crosshairHit.opacity = 0.65 + 0.30 * t;
      }
    }
  }

  private updateEnemyMarkers(cams: { camera: THREE.PerspectiveCamera; uiCamera: THREE.OrthographicCamera }): void {
    const enemies = this.enemyController.getEnemies();

    // Find nearest alive enemy.
    let nearest: Ship | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const e of enemies) {
      if (!e || !e.active || !e.visible) continue;
      const d = vec3.distance(e.position, this.player.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    }

    const margin = 26;
    const left = cams.uiCamera.left + margin;
    const right = cams.uiCamera.right - margin;
    const top = cams.uiCamera.top - margin;
    const bottom = cams.uiCamera.bottom + margin;

    const visited = new Set<string>();

    for (const enemy of enemies) {
      if (!enemy) continue;
      visited.add(enemy.id);

      if (!enemy.active || !enemy.visible) {
        const marker = this.markerByEnemyId.get(enemy.id);
        if (marker) marker.update({ uiX: 0, uiY: 0 }, { visible: false });
        continue;
      }

      let marker = this.markerByEnemyId.get(enemy.id);
      if (!marker) {
        marker = new EnemyMarker(this.game);
        this.markerByEnemyId.set(enemy.id, marker);
      }

      const headOffset = Math.max(6, enemy.hitRadius * 0.35);
      const worldPos = vec3.fromValues(enemy.position[0], enemy.position[1] + headOffset, enemy.position[2]);

      const dist = vec3.distance(enemy.position, this.player.position);
      // Near enemies appear larger; far enemies appear smaller.
      const nearDist = 100;
      const farDist = 300;
      const maxScale = 1.5;
      const minScale = 0.50;
      const tScale = clamp((dist - nearDist) / (farDist - nearDist), 0, 1);
      const scale = lerp(maxScale, minScale, tScale);

      const proj = worldToUI(this.game, worldPos);
      if (!proj) {
        marker.update({ uiX: 0, uiY: 0 }, { visible: false });
        continue;
      }

      const onScreen = proj.inFront && proj.ndcX >= -1 && proj.ndcX <= 1 && proj.ndcY >= -1 && proj.ndcY <= 1;
      const isNearest = nearest?.id === enemy.id;
      const hpText = `${Math.max(0, Math.ceil(enemy.health))}`;

      if (onScreen) {
        marker.update({ uiX: proj.uiX, uiY: proj.uiY }, { visible: true, hpText, isNearest, scale });
        continue;
      }

      // Off-screen arrow: direction in UI space.
      let dirX = proj.uiX;
      let dirY = proj.uiY;
      if (!proj.inFront) {
        // Behind the camera: flip direction so arrow points "backwards" toward target.
        dirX = -dirX;
        dirY = -dirY;
      }

      const len = Math.hypot(dirX, dirY);
      const nx = len > 0.0001 ? dirX / len : 1;
      const ny = len > 0.0001 ? dirY / len : 0;

      const tX = nx !== 0 ? ((nx > 0 ? right : left) / nx) : Number.POSITIVE_INFINITY;
      const tY = ny !== 0 ? ((ny > 0 ? top : bottom) / ny) : Number.POSITIVE_INFINITY;
      const t = Math.min(tX, tY);

      const edgeX = clamp(nx * t, left, right);
      const edgeY = clamp(ny * t, bottom, top);

      const angle = Math.atan2(ny, nx);

      marker.update(
        { uiX: 0, uiY: 0 },
        {
          visible: true,
          hpText,
          isNearest,
          offscreenArrow: { uiX: edgeX, uiY: edgeY, angleRad: angle },
        }
      );
    }

    // Cleanup markers for removed enemies.
    for (const [id, marker] of this.markerByEnemyId) {
      if (!visited.has(id)) {
        marker.destroy();
        this.markerByEnemyId.delete(id);
      }
    }
  }

  public destroy(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.onHudHit) {
      this.game.off("hud:hit", this.onHudHit);
      this.onHudHit = undefined;
    }
    if (this.onHudKill) {
      this.game.off("hud:kill", this.onHudKill);
      this.onHudKill = undefined;
    }

    // Ensure everything is hidden immediately.
    this.root.visible = false;
    this.game.getUIManager().removeElement(this.root);

    for (const marker of this.markerByEnemyId.values()) {
      marker.destroy();
    }
    this.markerByEnemyId.clear();
  }
}
