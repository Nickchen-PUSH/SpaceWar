export * from "./UIElement";
export * from "./UISprite";
export * from "./UIManager";
export * from "./UIRect";
export * from "./UIText";
// StartScreen is game-specific logic, maybe keep it out of core UI lib?
// But for convenience let's keep core clean. 
// Actually StartScreen is in src/game/ui, not src/ui. 
// So src/ui/index.ts should NOT export StartScreen.
