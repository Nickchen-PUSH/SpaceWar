
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

import type { Game } from "../core/Game"; 

export interface Level {
  onEnter(game: Game): void;
  onUpdate(delta: number): void;
  onExit(): void;
}