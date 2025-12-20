import * as THREE from "three";
import { Entity } from "../../scene/Entity";

export class RotatingShip extends Entity {
  private threeQuaternion = new THREE.Quaternion();
  private axisOfRotation = new THREE.Vector3(0, 1, 0);

  constructor() {
    super(); // The base Entity class now auto-generates an ID
  }

  update(delta: number): void {
    // Original rotation logic, commented out to make the ship stationary
    // // Convert our plain quaternion to a THREE.Quaternion
    // this.threeQuaternion.set(this.rotation.x, this.rotation.y, this.rotation.z, this.rotation.w);

    // // Create a delta rotation
    // const deltaRotation = new THREE.Quaternion();
    // deltaRotation.setFromAxisAngle(this.axisOfRotation, delta * 1.0);

    // // Apply the delta rotation
    // this.threeQuaternion.multiply(deltaRotation);

    // // Convert back to our plain object
    // this.rotation.x = this.threeQuaternion.x;
    // this.rotation.y = this.threeQuaternion.y;
    // this.rotation.z = this.threeQuaternion.z;
    // this.rotation.w = this.threeQuaternion.w;

    super.update(delta);
  }
}
