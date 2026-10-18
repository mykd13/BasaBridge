import { describe, expect, it } from 'vitest';
import { devRoleFromEnv } from './session';

describe('devRoleFromEnv', () => {
  it('returns the role named by BB_DEV_ROLE outside production', () => {
    expect(devRoleFromEnv({ NODE_ENV: 'development', BB_DEV_ROLE: 'parent' })).toBe('parent');
    expect(devRoleFromEnv({ BB_DEV_ROLE: 'student' })).toBe('student');
  });

  it('ignores the override in production', () => {
    expect(devRoleFromEnv({ NODE_ENV: 'production', BB_DEV_ROLE: 'student' })).toBeNull();
  });

  it('returns null when it is missing or not a role', () => {
    expect(devRoleFromEnv({})).toBeNull();
    expect(devRoleFromEnv({ BB_DEV_ROLE: 'admin' })).toBeNull();
  });
});
