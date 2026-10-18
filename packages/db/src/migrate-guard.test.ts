import { describe, expect, it } from 'vitest';
import { migrationAllowed } from './migrate-guard';

const url = 'postgres://user:pass@localhost:5432/db';

describe('migrationAllowed', () => {
  it('runs in a production build', () => {
    expect(migrationAllowed({ VERCEL_ENV: 'production', DATABASE_URL: url })).toEqual({
      run: true,
    });
  });

  it('runs locally and in CI, where VERCEL_ENV is not set', () => {
    expect(migrationAllowed({ DATABASE_URL: url })).toEqual({ run: true });
  });

  it('never runs in a preview build, even with a database URL', () => {
    const d = migrationAllowed({ VERCEL_ENV: 'preview', DATABASE_URL: url });
    expect(d.run).toBe(false);
  });

  it('refuses without a database URL', () => {
    expect(migrationAllowed({ VERCEL_ENV: 'production' }).run).toBe(false);
    expect(migrationAllowed({}).run).toBe(false);
  });
});
