import { describe, it, expect, beforeEach } from 'vitest';
import { Time } from '../../src/core/Time';

describe('Time System', () => {
  let time: Time;

  beforeEach(() => {
    time = new Time();
  });

  it('should calculate delta correctly', () => {
    time.reset();
    time.update(1000); // 第一帧
    time.update(1100); // 100毫秒后
    
    // 0.1秒
    expect(time.delta).toBeCloseTo(0.1); 
    expect(time.elapsed).toBeCloseTo(0.2);
  });

  it('should clamp huge delta (prevention of wall-hack)', () => {
    time.reset();
    time.update(1000);
    time.update(5000); // 过了4秒（比如切后台）
    
    // 应该被限制在 maxDelta (比如 0.1)
    expect(time.delta).toBe(0.1); 
  });
  
  it('should support time scale (slow motion)', () => {
    time.timeScale = 0.5; // 半速
    time.update(1000);
    time.update(1100); // 实际过了0.1秒
    
    // 逻辑上应该只过了0.05秒
    expect(time.delta).toBe(0.05);
  });
});