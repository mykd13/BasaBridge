import { describe, expect, it } from 'vitest';
import { DEV_USER_IDS, devRoleFromEnv } from './session';

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

describe('DEV_USER_IDS', () => {
  it('uses a different valid uuid for each role', () => {
    const ids = Object.values(DEV_USER_IDS);
    for (const id of ids)
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
