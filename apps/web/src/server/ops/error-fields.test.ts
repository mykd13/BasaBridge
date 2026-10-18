import { describe, expect, it } from 'vitest';
import { safeErrorFields } from './error-fields';

describe('safeErrorFields', () => {
  it('returns the class and digest and nothing from the message or stack', () => {
    const err = Object.assign(new TypeError('story: the fox, learner maria_s said hello'), {
      digest: 'abc123',
    });
    const fields = safeErrorFields(err);
    expect(fields).toEqual({ errorClass: 'TypeError', digest: 'abc123' });
    expect(JSON.stringify(fields)).not.toContain('maria');
  });

  it('survives values that are not errors', () => {
    expect(safeErrorFields('maria_s')).toEqual({ errorClass: 'Error', digest: undefined });
    expect(safeErrorFields(null)).toEqual({ errorClass: 'Error', digest: undefined });
    expect(safeErrorFields({ name: 'bad name with spaces' }).errorClass).toBe('Error');
  });
});
