/**
 * Structured logs (BB-39). One JSON object per line, so Vercel logs and log drains can filter by
 * field. Every field passes through `redact` before it is written.
 */
import { redact } from './redact';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'alert';

export type LogFields = Record<string, unknown>;

/** Receives each finished line. The default writes to the console, which Vercel captures. */
export type LogSink = (level: LogLevel, line: string) => void;

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  /** For conditions a person must look at. Alert lines are what log drains route on. */
  alert(event: string, fields?: LogFields): void;
  /** A logger that adds these fields to every line. */
  child(fields: LogFields): Logger;
}

export interface LoggerOptions {
  service: string;
  sink?: LogSink;
  base?: LogFields;
  now?: () => Date;
}

export const consoleSink: LogSink = (level, line) => {
  if (level === 'error' || level === 'alert') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

/**
 * `event` is a short dotted code such as `ai.call` or `request.error`. Put details in fields,
 * never in the event name, so the redactor can see them.
 */
export function createLogger(options: LoggerOptions): Logger {
  const sink = options.sink ?? consoleSink;
  const now = options.now ?? (() => new Date());
  const base = options.base ?? {};

  const write = (level: LogLevel, event: string, fields: LogFields = {}) => {
    const safe = redact({ ...base, ...fields }) as LogFields;
    const line = JSON.stringify({
      ...safe,
      at: now().toISOString(),
      level,
      service: options.service,
      event,
    });
    try {
      sink(level, line);
    } catch {
      // Logging must never break the request that logs.
    }
  };

  return {
    debug: (e, f) => write('debug', e, f),
    info: (e, f) => write('info', e, f),
    warn: (e, f) => write('warn', e, f),
    error: (e, f) => write('error', e, f),
    alert: (e, f) => write('alert', e, f),
    child: (fields) => createLogger({ ...options, base: { ...base, ...fields } }),
  };
}

/** Collects lines in memory. For tests. */
export function memorySink(): LogSink & { lines: { level: LogLevel; line: string }[] } {
  const lines: { level: LogLevel; line: string }[] = [];
  const sink = ((level: LogLevel, line: string) => {
    lines.push({ level, line });
  }) as LogSink & { lines: typeof lines };
  sink.lines = lines;
  return sink;
}
