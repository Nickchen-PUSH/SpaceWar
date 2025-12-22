import type { Game } from "../../core/Game"; 

export interface Level {
  onEnter(game: Game): void;
  onUpdate(game: Game, delta: number): void;
  onExit(): void;
}