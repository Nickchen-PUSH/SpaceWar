import { describe, it, expect, vi } from 'vitest';
import { Game } from '../../src/core/Game';
import { AssetLoader } from '../../src/core/AssetLoader';
import { MockRenderer } from '../mocks/MockRenderer';
import { Entity } from '../../src/scene/Entity';

describe('Game Core Loop', () => {
    it('should update entities and call renderer', () => {
        // 1. 组装引擎 (使用伪造的 Renderer)
        const mockRenderer = new MockRenderer();
        const loader = new AssetLoader();
        const game = new Game(mockRenderer, loader);

        // 2. 注入一个测试实体
        const testEntity = new Entity('test_box');
        testEntity.position.x = 0;
        // 劫持 update 方法来模拟移动逻辑
        testEntity.update = (delta: number) => {
            testEntity.position.x += 10 * delta; // 速度 10/s
        };

        // 3. 模拟 DOM 环境 (如果你用了 document，Vitest 需要配置 environment: jsdom)
        // 或者我们手动 hack 一下 loop，不真正调用 game.start() 里的 rAF
        // 直接手动调用私有的 loop 方法进行测试

        // 模拟时间流逝: 0s -> 0.1s -> 0.2s
        // 由于 loop 是私有的，我们可以用 (game as any).loop(timestamp) 来暴力测试
        (game as any).running = true;
        (game as any).time.reset();

        // 第 1 帧 (初始化)
        (game as any).loop(1000);

        game.getScene().add(testEntity);
        // 第 2 帧 (过了 0.1s)
        (game as any).loop(1100);

        // --- 验证时刻 ---

        // 1. 验证渲染器是否被调用
        expect(mockRenderer.renderCount).toBeGreaterThan(0);

        // 2. 验证场景是否被传给了渲染器
        expect(mockRenderer.lastSceneReceived).toBe(game.getScene());

        // 3. 验证实体位置是否更新 (逻辑层是否工作)
        // 0.1秒 * 10速度 = 1.0位移
        expect(testEntity.position.x).toBeCloseTo(1.0);
    });
});