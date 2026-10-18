import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGS } from '@/i18n/types';
import { PROVIDERS, PROVIDER_VAR_PATTERN, listedEnvVars } from './providers';

const exampleEnv = readFileSync(new URL('../../../../example.env', import.meta.url), 'utf8');

/** Variable names in example.env, including ones that are commented out as examples. */
function envNames(): string[] {
  return [...exampleEnv.matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]!);
}

describe('provider list', () => {
  it('lists every *_PROVIDER and *_MODEL variable in example.env', () => {
    const listed = listedEnvVars();
    const missing = envNames().filter(
      (name) => PROVIDER_VAR_PATTERN.test(name) && !listed.has(name),
    );
    expect(missing, 'Add each of these to an entry in providers.ts').toEqual([]);
  });

  it('finds the variables it is meant to check', () => {
    const names = envNames().filter((n) => PROVIDER_VAR_PATTERN.test(n));
    expect(names).toEqual(
      expect.arrayContaining(['STORY_MODEL', 'VERIFIER_MODEL', 'NOTES_MODEL', 'SPEECH_PROVIDER']),
    );
  });

  it('covers the five services in the privacy review', () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual([
      'ai-gateway-gemini',
      'azure-speech-tts',
      'speech-recognition',
      'vercel-postgres',
      'email',
    ]);
    const gemini = PROVIDERS.find((p) => p.id === 'ai-gateway-gemini');
    expect(gemini?.envVars).toEqual(
      expect.arrayContaining(['STORY_MODEL', 'VERIFIER_MODEL', 'NOTES_MODEL']),
    );
    expect(gemini?.flag).toBe('model_choices');
  });

  it('says what each provider sees and never sees, in both languages', () => {
    for (const provider of PROVIDERS) {
      for (const lang of LANGS) {
        for (const field of ['name', 'purpose', 'sees', 'neverSees'] as const) {
          expect(provider[field][lang].trim(), `${provider.id} ${field} ${lang}`).not.toBe('');
        }
      }
    }
  });

  it('never lets a model provider see names, usernames or audio (golden rule 2)', () => {
    const gemini = PROVIDERS.find((p) => p.id === 'ai-gateway-gemini')!;
    expect(gemini.neverSees.en).toMatch(/names/i);
    expect(gemini.neverSees.en).toMatch(/usernames/i);
    expect(gemini.neverSees.en).toMatch(/audio/i);
    expect(gemini.sees.en).not.toMatch(/audio|username/i);
  });

  it('uses no em or en dashes', () => {
    expect(JSON.stringify(PROVIDERS)).not.toMatch(/[–—]/);
  });
});
