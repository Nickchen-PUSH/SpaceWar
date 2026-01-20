import { vec3 } from "gl-matrix";
import type { Game } from "@core/Game";
import type { Scene } from "@scene";
import { ExplosionEmitter } from "@game/effects/ExplosionEmitter";
import { Bullet } from "@game/objects/Bullet";
import { CelestialBody } from "@game/objects/CelestialBody";
import { Meteor } from "@game/objects/meteor";
import { Planet } from "@game/objects/Planet";
import { Ship } from "@game/ships/Ship";

const TEMP_VEC3 = vec3.create();
const TEMP_VEC3_B = vec3.create();

// Per-ship cooldown to prevent taking damage every frame while overlapping.
const shipDamageCooldown: Map<string, number> = new Map();
// Per-pair cooldown to avoid ship-ship collision spamming damage.
const shipPairDamageCooldown: Map<string, number> = new Map();

function sphereOverlap(aPos: vec3, aR: number, bPos: vec3, bR: number): { hit: boolean; dist: number } {
  const dist = vec3.distance(aPos, bPos);
  return { hit: dist < aR + bR, dist };
}

function resolvePenetration(movable: Ship, obstaclePos: vec3, obstacleRadius: number, dist: number): void {
  const r = movable.hitRadius + obstacleRadius;
  const penetration = r - dist;
  if (penetration <= 0) return;

  // normal from obstacle -> ship
  vec3.subtract(TEMP_VEC3, movable.position, obstaclePos);
  const len = vec3.length(TEMP_VEC3);
  if (len < 1e-6) {
    vec3.set(TEMP_VEC3, 0, 1, 0);
  } else {
    vec3.scale(TEMP_VEC3, TEMP_VEC3, 1 / len);
  }

  // Push ship out slightly beyond surface
  vec3.scaleAndAdd(movable.position, movable.position, TEMP_VEC3, penetration + 0.02);

  // Remove inward velocity component (simple bounce-damp)
  const vn = vec3.dot(movable.velocity, TEMP_VEC3);
  if (vn < 0) {
    vec3.scaleAndAdd(movable.velocity, movable.velocity, TEMP_VEC3, -vn * 1.15);
  }
}

function spawnExplosion(scene: Scene, at: vec3): void {
  const exp = new ExplosionEmitter();
  vec3.copy(exp.position, at);
  scene.add(exp);
}

function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

function applyShipPairDamageOnce(a: Ship, b: Ship, delta: number, amountA: number, amountB: number): void {
  const key = pairKey(a.id, b.id);
  const remain = shipPairDamageCooldown.get(key) ?? 0;
  if (remain > 0) return;

  a.takeDamage(amountA);
  b.takeDamage(amountB);
  shipPairDamageCooldown.set(key, 0.55);
  void delta;
}

function resolveShipShipPenetration(a: Ship, b: Ship, dist: number): vec3 {
  // normal from a -> b
  vec3.subtract(TEMP_VEC3, b.position, a.position);
  const len = vec3.length(TEMP_VEC3);
  if (len < 1e-6) {
    vec3.set(TEMP_VEC3, 1, 0, 0);
  } else {
    vec3.scale(TEMP_VEC3, TEMP_VEC3, 1 / len);
  }

  const targetDist = a.hitRadius + b.hitRadius;
  const penetration = targetDist - dist;
  if (penetration <= 0) return TEMP_VEC3;

  // Push both out equally
  const push = penetration * 0.5 + 0.02;
  vec3.scaleAndAdd(a.position, a.position, TEMP_VEC3, -push);
  vec3.scaleAndAdd(b.position, b.position, TEMP_VEC3, push);
  return TEMP_VEC3;
}

function resolveShipShipVelocity(a: Ship, b: Ship, normal: vec3): number {
  // relative velocity along normal (a->b)
  vec3.subtract(TEMP_VEC3_B, b.velocity, a.velocity);
  const vn = vec3.dot(TEMP_VEC3_B, normal);
  if (vn >= 0) return 0;

  // Impulse for equal masses
  const restitution = 0.25;
  const j = -(1 + restitution) * vn / 2;
  vec3.scaleAndAdd(a.velocity, a.velocity, normal, -j);
  vec3.scaleAndAdd(b.velocity, b.velocity, normal, j);
  return -vn; // impact speed
}

function applyShipDamageOnce(ship: Ship, delta: number, amount: number): void {
  void delta;
  const remain = shipDamageCooldown.get(ship.id) ?? 0;
  if (remain > 0) return;

  ship.takeDamage(amount);
  shipDamageCooldown.set(ship.id, 0.4);
}

export function handleCelestialCollisions(game: Game, delta: number): void {
  const scene = game.getScene();

  // Update cooldowns for ships that didn't collide this frame too
  for (const [id, remain] of shipDamageCooldown.entries()) {
    const next = Math.max(0, remain - delta);
    if (next <= 0) shipDamageCooldown.delete(id);
    else shipDamageCooldown.set(id, next);
  }

  for (const [key, remain] of shipPairDamageCooldown.entries()) {
    const next = Math.max(0, remain - delta);
    if (next <= 0) shipPairDamageCooldown.delete(key);
    else shipPairDamageCooldown.set(key, next);
  }

  const ships: Ship[] = [];
  for (const shipId of scene.ships) {
    const entity = scene.entities.find(e => e.id === shipId);
    if (entity && entity.active && entity instanceof Ship) {
      ships.push(entity);
    }
  }

  const bullets: Bullet[] = scene.entities.filter(e => e.active && e instanceof Bullet) as Bullet[];
  const bodies: CelestialBody[] = scene.entities.filter(e => e.active && e instanceof CelestialBody) as CelestialBody[];

  // Bullet vs CelestialBody
  for (const bullet of bullets) {
    for (const body of bodies) {
      const { hit } = sphereOverlap(bullet.position, bullet.hitRadius, body.position, body.hitRadius);
      if (!hit) continue;

      // Planets absorb bullets; meteors can explode.
      if (body instanceof Meteor) {
        spawnExplosion(scene, body.position);
        body.destroy();        
      }
      break;
    }
  }

  // Ship vs CelestialBody
  for (const ship of ships) {
    for (const body of bodies) {
      const { hit, dist } = sphereOverlap(ship.position, ship.hitRadius, body.position, body.hitRadius);
      if (!hit) continue;

      resolvePenetration(ship, body.position, body.hitRadius, dist);

      if (body instanceof Planet) {
        applyShipDamageOnce(ship, delta, 18);
      } else if (body instanceof Meteor) {
        applyShipDamageOnce(ship, delta, 12);
        spawnExplosion(scene, body.position);
        body.destroy();
      } else {
        applyShipDamageOnce(ship, delta, 10);
      }
    }
  }

  // Ship vs Ship
  for (let i = 0; i < ships.length; i++) {
    const a = ships[i]!;
    for (let j = i + 1; j < ships.length; j++) {
      const b = ships[j]!;
      if (!a.active || !b.active) continue;

      const { hit, dist } = sphereOverlap(a.position, a.hitRadius, b.position, b.hitRadius);
      if (!hit) continue;

      const normal = resolveShipShipPenetration(a, b, dist);
      const impactSpeed = resolveShipShipVelocity(a, b, normal);

      // Impact damage based on speed (tuned small by default)
      if (impactSpeed > 2) {
        const damage = Math.min(35, Math.max(6, impactSpeed * 1.2));
        applyShipPairDamageOnce(a, b, delta, damage, damage);
      }
    }
  }
}
