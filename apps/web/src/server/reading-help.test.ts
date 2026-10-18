import { describe, expect, it } from 'vitest';
import { isNotWired } from './errors';
import { getMyReadingHelp, saveMyReadingHelp } from './reading-help';

describe('reading help server stubs', () => {
  it('are not wired until BB-10', async () => {
    await expect(getMyReadingHelp()).rejects.toSatisfy(isNotWired);
    await expect(saveMyReadingHelp({ highContrast: true })).rejects.toSatisfy(isNotWired);
  });

  it('reject a bad shape before anything else', async () => {
    await expect(saveMyReadingHelp({ textSize: 'huge' })).rejects.not.toSatisfy(isNotWired);
  });
});
