import type { Game } from "../../core/Game"; 

export interface Level {
  onEnter(game: Game): void;
  onUpdate(game: Game, delta: number): void;
  /** Called after Scene.update each frame (good for collisions). */
  onPostUpdate?(game: Game, delta: number): void;
  onExit(): void;
}