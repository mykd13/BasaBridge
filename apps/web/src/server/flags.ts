/**
 * Feature flags (BB-65). Server only: never import this from a client component.
 *
 * Every flag has a safe default in code. A missing row, a bad value or a failed database read
 * all fall back to that default, so the app never runs a risky feature by accident.
 * Changes go through setFlag, which logs each one. See docs/feature-flags.md.
 */
import { createDbFromEnv, readFlagRows, writeFlag, type Db } from '@basabridge/db';

export interface ModelChoices {
  story: string;
  verifier: string;
  notes: string;
}

interface FlagDef<T> {
  /** The safe setting. Used when no row exists or the stored value is invalid. */
  default: T;
  /** Returns the value when it is valid, or undefined. */
  parse: (raw: unknown) => T | undefined;
  description: string;
}

const bool = (raw: unknown) => (typeof raw === 'boolean' ? raw : undefined);

const MODEL_ID = /^[a-z0-9-]+\/[a-z0-9.-]+$/i;

function parseModelChoices(raw: unknown): ModelChoices | null | undefined {
  if (raw === null) return null;
  if (!raw || typeof raw !== 'object') return undefined;
  const { story, verifier, notes } = raw as Record<string, unknown>;
  const ok = [story, verifier, notes].every((m) => typeof m === 'string' && MODEL_ID.test(m));
  if (!ok || story === verifier) return undefined;
  return { story, verifier, notes } as ModelChoices;
}

export const FLAGS = {
  microphone: {
    default: true,
    parse: bool,
    description:
      'Kill switch for voice recording and reading analysis for everyone. The under-13 guardian gate (BB-8) is enforced in code and no flag can turn it off.',
  },
  listen_then_read: {
    default: false,
    parse: bool,
    description: 'Offer to play the story aloud before the learner reads it (ADR 0004).',
  },
  spoken_instructions: {
    default: false,
    parse: bool,
    description: 'Allow spoken interface instructions (ADR 0004).',
  },
  placement: {
    default: false,
    parse: bool,
    description: 'Run the placement test for new learners (docs/PLAN.md 6.2).',
  },
  model_choices: {
    default: null,
    parse: parseModelChoices,
    description:
      'Override STORY_MODEL, VERIFIER_MODEL and NOTES_MODEL. null means use the environment variables. The verifier must differ from the story model.',
  },
} satisfies Record<string, FlagDef<unknown>>;

export type FlagKey = keyof typeof FLAGS;
export type FlagValues = {
  [K in FlagKey]: (typeof FLAGS)[K]['default'] | ReturnType<(typeof FLAGS)[K]['parse']>;
};
export type Flags = { [K in FlagKey]: Exclude<FlagValues[K], undefined> };

export function defaultFlags(): Flags {
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(FLAGS)) out[key] = def.default;
  return out as Flags;
}

/** Keys already warned about, so a bad stored value logs once, not on every refresh. */
const warnedInvalid = new Set<string>();

/** Turns stored rows into flag values. Unknown keys are ignored; bad values fall back to the default. */
export function resolveFlags(rows: { key: string; value: unknown }[]): Flags {
  const out = defaultFlags() as Record<string, unknown>;
  for (const { key, value } of rows) {
    const def = (FLAGS as Record<string, FlagDef<unknown>>)[key];
    if (!def) continue;
    const parsed = def.parse(value);
    if (parsed === undefined) {
      if (!warnedInvalid.has(key)) {
        warnedInvalid.add(key);
        console.warn(`[flags] invalid stored value for ${key}, using the default`);
      }
      continue;
    }
    out[key] = parsed;
  }
  return out as Flags;
}

/** How long a read is reused. A change takes effect within this time, with no deploy. */
export const FLAG_CACHE_MS = 30_000;

let shared: Db | undefined;
let cache: { at: number; flags: Flags } | undefined;
/** After a failed read, the defaults are reused briefly so an outage does not hit the database on every request. */
const FAILURE_CACHE_MS = 5_000;
let failedAt: number | undefined;

function getDb(): Db {
  shared ??= createDbFromEnv().db as unknown as Db;
  return shared;
}

/** Loads all flags. On any failure it returns the safe defaults, reused for 5 seconds. */
export async function loadFlags(
  read: () => Promise<{ key: string; value: unknown }[]> = () => readFlagRows(getDb()),
  now: number = Date.now(),
): Promise<Flags> {
  if (cache && now - cache.at < FLAG_CACHE_MS) return cache.flags;
  if (failedAt !== undefined && now - failedAt < FAILURE_CACHE_MS) return defaultFlags();
  try {
    const flags = resolveFlags(await read());
    cache = { at: now, flags };
    failedAt = undefined;
    return flags;
  } catch {
    failedAt = now;
    console.warn('[flags] could not read flags, using the safe defaults');
    return defaultFlags();
  }
}

export async function getFlag<K extends FlagKey>(key: K): Promise<Flags[K]> {
  return (await loadFlags())[key];
}

/**
 * Changes a flag and logs who did it. Refuses unknown keys and invalid values.
 * `actorUserId` is null for a script run by the team.
 */
export async function setFlag<K extends FlagKey>(
  key: K,
  value: Flags[K],
  actorUserId: string | null,
  db?: Db,
): Promise<void> {
  const def = (FLAGS as Record<string, FlagDef<unknown>>)[key];
  if (!def) throw new Error(`Unknown flag: ${String(key)}`);
  const parsed = def.parse(value);
  if (parsed === undefined) throw new Error(`Invalid value for flag ${String(key)}`);
  await writeFlag(db ?? getDb(), key, parsed, actorUserId);
  cache = undefined;
  failedAt = undefined;
}

/** For tests only. */
export function clearFlagCache(): void {
  cache = undefined;
  failedAt = undefined;
  warnedInvalid.clear();
}
