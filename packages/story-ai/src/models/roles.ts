/**
 * Which model each AI role uses, and what it falls back to (docs/PLAN.md section 7, BB-73).
 * Model names come only from the environment (ADR 0002). Nothing defaults in code.
 * Reasons name the variable that is wrong, never its value.
 */

export const MODEL_ROLES = ['story', 'verifier', 'notes'] as const;
export type ModelRole = (typeof MODEL_ROLES)[number];

/** A primary model and the model tried when it fails or times out. Always two different models. */
export interface ModelChain {
  primary: string;
  fallback: string;
}

export interface ModelRolesConfig {
  roles: Record<ModelRole, ModelChain>;
  /** How long one model call may take before the fallback is tried. */
  timeoutMs: number;
}

/** Used when MODEL_TIMEOUT_MS is not set. A pipeline setting, not a level rule. */
export const DEFAULT_MODEL_TIMEOUT_MS = 60_000;

const ENV_NAMES: Record<ModelRole, { primary: string; fallback: string }> = {
  story: { primary: 'STORY_MODEL', fallback: 'STORY_FALLBACK_MODEL' },
  verifier: { primary: 'VERIFIER_MODEL', fallback: 'VERIFIER_FALLBACK_MODEL' },
  notes: { primary: 'NOTES_MODEL', fallback: 'NOTES_FALLBACK_MODEL' },
};

/** AI Gateway model string, `provider/model`. Same shape BB-15 checks for STORY_MODEL. */
const MODEL_NAME = /^[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/** Gateway names are compared without case, so `google/Gem-X` and `google/gem-x` count as the same model. */
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export type ModelRolesResult =
  { ok: true; config: ModelRolesConfig } | { ok: false; reasons: string[] };

/**
 * Reads and checks every role's models. Fails when a name is missing or malformed, when a fallback
 * equals its primary, or when either verifier model equals either story model, so a fallback swap
 * can never make the generator check its own work.
 */
export function loadModelRoles(
  env: Record<string, string | undefined> = process.env,
): ModelRolesResult {
  const reasons: string[] = [];
  const read = (name: string): string => {
    const value = env[name]?.trim() ?? '';
    if (value === '') reasons.push(`${name} is not set.`);
    else if (!MODEL_NAME.test(value)) reasons.push(`${name} must look like provider/model.`);
    return value;
  };

  const roles = {} as Record<ModelRole, ModelChain>;
  for (const role of MODEL_ROLES) {
    const names = ENV_NAMES[role];
    const chain = { primary: read(names.primary), fallback: read(names.fallback) };
    if (chain.primary !== '' && chain.fallback !== '' && same(chain.primary, chain.fallback)) {
      reasons.push(`${names.fallback} must be a different model from ${names.primary}.`);
    }
    roles[role] = chain;
  }

  for (const v of ['primary', 'fallback'] as const) {
    for (const s of ['primary', 'fallback'] as const) {
      const verifier = roles.verifier[v];
      const story = roles.story[s];
      if (verifier !== '' && story !== '' && same(verifier, story)) {
        reasons.push(
          `${ENV_NAMES.verifier[v]} must be a different model from ${ENV_NAMES.story[s]}.`,
        );
      }
    }
  }

  let timeoutMs = DEFAULT_MODEL_TIMEOUT_MS;
  const rawTimeout = env.MODEL_TIMEOUT_MS?.trim();
  if (rawTimeout) {
    const n = Number(rawTimeout);
    if (Number.isInteger(n) && n > 0) timeoutMs = n;
    else reasons.push('MODEL_TIMEOUT_MS must be a whole number of milliseconds above 0.');
  }

  return reasons.length > 0 ? { ok: false, reasons } : { ok: true, config: { roles, timeoutMs } };
}

/** Thrown at startup when the model settings are unsafe or incomplete. */
export class ModelConfigError extends Error {
  readonly reasons: string[];
  constructor(reasons: string[]) {
    super(`Model settings are not valid: ${reasons.join(' ')}`);
    this.name = 'ModelConfigError';
    this.reasons = reasons;
  }
}

/**
 * Call once when the server starts. Throws ModelConfigError with every problem listed, so a bad
 * configuration stops the app instead of reaching a learner.
 */
export function assertModelRoles(
  env: Record<string, string | undefined> = process.env,
): ModelRolesConfig {
  const result = loadModelRoles(env);
  if (!result.ok) throw new ModelConfigError(result.reasons);
  return result.config;
}
