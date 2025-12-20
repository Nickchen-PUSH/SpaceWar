import { Entity } from "../../scene/Entity";

export class RotatingShip extends Entity {
  private turnSpeed: number; // Radians per second
  private rollSpeed: number; // Radians per second

  constructor(turnSpeed: number = Math.PI / 2, rollSpeed: number = Math.PI) {
    super();
    this.turnSpeed = turnSpeed;
    this.rollSpeed = rollSpeed;
  }

  public update(deltaTime: number): void {
    // Rotate around Y axis (turning)
    // this.rotateY(this.turnSpeed * deltaTime);
    // Rotate around Z axis (rolling)
    // this.rotateZ(this.rollSpeed * deltaTime);
  }

  public getTurnSpeed(): number {
    return this.turnSpeed;
  }

  public getRollSpeed(): number {
    return this.rollSpeed;
  }

  public setTurnSpeed(speed: number): void {
    this.turnSpeed = speed;
  }

  public setRollSpeed(speed: number): void {
    this.rollSpeed = speed;
  }
}
