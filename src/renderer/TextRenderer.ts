import type { Renderer } from "./Renderer";
import { Scene } from "../scene/Scene";

export class TextRenderer implements Renderer {
  init() {}
  resize() {}

  render(scene: Scene) {
    console.clear();
    console.log(`=== FRAME START ===`);
    console.log(`Cam Pos: ${JSON.stringify(scene.camera.position)}`);
    console.log(`Entities: ${scene.entities.length}`);
    
    scene.entities.forEach(e => {
        // 简单的可视化：打印 ID 和 坐标
        console.log(`[${e.id}] pos:(${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)})`);
    });
    console.log(`=== FRAME END ===`);
  }
}