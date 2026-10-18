/** Keys the app writes to sessionStorage start with this. Sign out removes all of them (BB-71). */
export const SESSION_KEY_PREFIX = 'bb:';

/** Remove every `bb:` key, so the next learner on a shared device sees nothing from the last one. */
export function clearSessionKeys(storage: Pick<Storage, 'length' | 'key' | 'removeItem'>): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(SESSION_KEY_PREFIX)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}

/** Same, for the real sessionStorage. Safe where storage is blocked. */
export function clearBrowserSession(): void {
  try {
    clearSessionKeys(window.sessionStorage);
  } catch {
    // Storage blocked: there is nothing of ours to clear.
  }
}

/** Idle limits for a learner. The server timeout needs BB-7 to match (30 minutes). */
export const IDLE_WARN_MS = 25 * 60_000;
export const IDLE_SIGN_OUT_MS = 30 * 60_000;
