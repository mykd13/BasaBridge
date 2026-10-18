import { describe, expect, it } from 'vitest';
import { noteConfidence, phrasingFor, SURENESS_LINES, surenessLine } from './sureness';

describe('phrasingFor', () => {
  it('leaves out low, says medium as a possibility and states high', () => {
    expect(phrasingFor('low')).toBe('leave_out');
    expect(phrasingFor('medium')).toBe('possible');
    expect(phrasingFor('high')).toBe('state');
  });
});

describe('noteConfidence', () => {
  it('is null when nothing is clear enough to mention', () => {
    expect(noteConfidence([])).toBeNull();
    expect(noteConfidence(['low', 'low'])).toBeNull();
  });

  it('takes the weakest pattern mentioned, so a guess never sounds sure', () => {
    expect(noteConfidence(['high', 'medium'])).toBe('medium');
    expect(noteConfidence(['high', 'low'])).toBe('high');
    expect(noteConfidence(['high', 'high'])).toBe('high');
  });
});

describe('surenessLine', () => {
  it('gives the child and the parent their own line for each case', () => {
    expect(surenessLine(['high'], 'child')).toBe(SURENESS_LINES.child.high);
    expect(surenessLine(['high', 'medium'], 'parent')).toBe(SURENESS_LINES.parent.medium);
    expect(surenessLine(['low'], 'child')).toBe(SURENESS_LINES.child.none);
    expect(surenessLine([], 'parent')).toBe(SURENESS_LINES.parent.none);
  });

  it('never puts a number in a child line', () => {
    for (const line of Object.values(SURENESS_LINES.child)) expect(line).not.toMatch(/\d/);
  });
});
