import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { withIntl } from '@/i18n/test-intl';
import { IDLE_SIGN_OUT_MS, IDLE_WARN_MS } from '@/lib/shared-device';
import { IdleSignOut } from './IdleSignOut';

describe('IdleSignOut', () => {
  it('warns at 25 minutes and signs out at 30', () => {
    expect(IDLE_WARN_MS).toBe(25 * 60 * 1000);
    expect(IDLE_SIGN_OUT_MS).toBe(30 * 60 * 1000);
  });

  it('shows nothing until the learner has been idle', () => {
    expect(renderToStaticMarkup(withIntl(<IdleSignOut />))).toBe('');
  });
});
