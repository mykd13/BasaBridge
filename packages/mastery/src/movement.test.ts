import { describe, expect, it } from 'vitest';
import { applyReadiness } from './ability';

describe('applyReadiness', () => {
  it('moves one level up or down', () => {
    expect(applyReadiness(10, { up: true, down: false })).toEqual({ level: 11, moved: 'up' });
    expect(applyReadiness(10, { up: false, down: true })).toEqual({ level: 9, moved: 'down' });
    expect(applyReadiness(10, { up: false, down: false })).toEqual({ level: 10, moved: 'none' });
  });

  it('stays inside the level table', () => {
    expect(applyReadiness(100, { up: true, down: false })).toEqual({ level: 100, moved: 'none' });
    expect(applyReadiness(1, { up: false, down: true })).toEqual({ level: 1, moved: 'none' });
  });

  it('prefers up when both are somehow set', () => {
    expect(applyReadiness(10, { up: true, down: true }).moved).toBe('up');
  });
});
