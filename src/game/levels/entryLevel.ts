import type { Level } from "../../types";

export class entryLevel implements Level {
    onEnter(game: any): void {
        console.log("Entering Entry Level");
        // 初始化关卡内容，例如创建实体、设置场景等
    }

    onUpdate(delta: number): void {
        // 每帧更新关卡逻辑
    }

    onExit(): void {
        console.log("Exiting Entry Level");
        // 清理关卡内容，例如销毁实体、释放资源等
    }
}