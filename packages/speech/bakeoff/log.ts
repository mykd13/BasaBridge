/**
 * The only logger the harness uses. It accepts a fixed set of fields so that audio, transcript
 * text, passage text and reader codes cannot end up in a log by accident (AGENTS.md rule 2).
 */

export interface LogFields {
  recordingId?: string;
  provider?: string;
  mode?: string;
  transport?: string;
  status?: string;
  ms?: number;
  count?: number;
  ageBand?: string;
  firstLanguage?: string;
  device?: string;
  noise?: string;
}

const ALLOWED = new Set<string>([
  'recordingId',
  'provider',
  'mode',
  'transport',
  'status',
  'ms',
  'count',
  'ageBand',
  'firstLanguage',
  'device',
  'noise',
]);

export function formatLog(event: string, fields: LogFields = {}): string {
  const parts = Object.entries(fields)
    .filter(([k, v]) => ALLOWED.has(k) && v !== undefined)
    .map(([k, v]) => `${k}=${String(v).replace(/\s+/g, '_').slice(0, 40)}`);
  return [event, ...parts].join(' ');
}

export function log(event: string, fields: LogFields = {}): void {
  console.log(formatLog(event, fields));
}

/** Errors from vendors carry only a status. Bodies can echo request content, so they are dropped. */
export class ProviderError extends Error {
  readonly status: string;
  constructor(status: string | number) {
    super(`provider error ${status}`);
    this.status = String(status);
  }
}

/** Throws a ProviderError for a failed response. Prints the body only with BAKEOFF_DEBUG=1. */
export async function ensureOk(res: Response, where: string): Promise<void> {
  if (res.ok) return;
  if (process.env.BAKEOFF_DEBUG === '1') {
    const body = await res.text().catch(() => '');
    console.error(`[debug] ${where} ${res.status} ${body.slice(0, 300)}`);
  }
  throw new ProviderError(res.status);
}
