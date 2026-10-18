import { describe, expect, it, vi } from 'vitest';
import { clearSessionKeys } from './shared-device';
import { signOutAndReload } from './sign-out-client';
import { NO_STORE_SOURCE } from './no-store';

function fakeStorage(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    keys: () => [...map.keys()],
  };
}

describe('clearSessionKeys', () => {
  it('removes every bb: key and leaves the rest', () => {
    const s = fakeStorage({ 'bb:a': '1', 'bb:b': '2', other: '3', 'xbb:c': '4' });
    clearSessionKeys(s);
    expect(s.keys()).toEqual(['other', 'xbb:c']);
  });
});

describe('signOutAndReload', () => {
  it('ends the session, then loads sign in', async () => {
    const order: string[] = [];
    await signOutAndReload(
      async () => void order.push('end'),
      (url) => void order.push(`go ${url}`),
    );
    expect(order).toEqual(['end', 'go /sign-in']);
  });

  it('still loads sign in when ending the session fails', async () => {
    const go = vi.fn();
    await expect(
      signOutAndReload(async () => {
        throw new Error('offline');
      }, go),
    ).rejects.toThrow('offline');
    expect(go).toHaveBeenCalledWith('/sign-in');
  });
});

describe('no-store source', () => {
  // A Next header source is /<regex>. Next anchors it, so the test does the same.
  const matches = (path: string) => new RegExp(`^${NO_STORE_SOURCE}$`).test(path);

  it('covers learner pages, parent pages, API routes and pages added later', () => {
    for (const path of [
      '/home',
      '/read/analysis',
      '/learn/a/b',
      '/parent/x/levels',
      '/api/learn/words/check',
      '/brand-new-page',
    ]) {
      expect(matches(path), path).toBe(true);
    }
  });

  it('leaves out only the public pages and static assets', () => {
    for (const path of [
      '/',
      '/sign-in',
      '/sign-up',
      '/_next/static/chunks/a.js',
      '/_next/image',
      '/favicon.ico',
    ]) {
      expect(matches(path), path).toBe(false);
    }
    expect(matches('/sign-in-help')).toBe(true);
  });
});
