import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Input } from '../../src/core/Input';

describe('Input System', () => {
  let input: Input;

  beforeEach(() => {
    input = new Input();
    input.init(window);
  });

  afterEach(() => {
    input.dispose();
  });

  it('tracks key states across frames', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));

    expect(input.getKey('KeyW')).toBe(true);
    expect(input.getKeyDown('KeyW')).toBe(true);
    expect(input.getKeyUp('KeyW')).toBe(false);

    input.clearFrame();
    expect(input.getKeyDown('KeyW')).toBe(false);
    expect(input.getKey('KeyW')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(input.getKey('KeyW')).toBe(false);
    expect(input.getKeyUp('KeyW')).toBe(true);

    input.clearFrame();
    expect(input.getKeyUp('KeyW')).toBe(false);
  });

  it('ignores repeated keydown events', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    input.clearFrame();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', repeat: true }));

    expect(input.getKey('KeyA')).toBe(true);
    expect(input.getKeyDown('KeyA')).toBe(false);
  });

  it('handles axes and mouse state', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    expect(input.getAxis('KeyA', 'KeyD')).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    expect(input.getAxis('KeyA', 'KeyD')).toBe(0);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    expect(input.getAxisVertical('KeyS', 'KeyW')).toBe(1);

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 240 }));
    expect(input.getMousePosition()).toEqual({ x: 120, y: 240 });

    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    expect(input.getMouseButton(0)).toBe(true);
    expect(input.getMouseButtonDown(0)).toBe(true);

    input.clearFrame();
    expect(input.getMouseButtonDown(0)).toBe(false);
    expect(input.getMouseButton(0)).toBe(true);

    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(input.getMouseButton(0)).toBe(false);
  });
});
