/**
 * Decides whether a browser can run the reading flow (BB-71). The list lives in docs/devices.md.
 * Features decide first: a browser that lacks recording or streamed fetch is unsupported whatever
 * its name says. The user agent only rejects a browser we recognise as older than the floor, so an
 * unknown browser with the features is allowed. Bump the floors when docs/devices.md changes.
 */
export interface BrowserFeatures {
  mediaRecorder: boolean;
  fetchStreams: boolean;
}

/** Oldest major version supported for each browser family. */
export const MIN_VERSIONS = {
  chrome: 130,
  edge: 130,
  samsung: 28,
  firefox: 115,
} as const;

/** Safari 16.4 on iOS and macOS. Every browser on iOS runs WebKit, so the iOS version counts for all of them. */
export const MIN_SAFARI: readonly [number, number] = [16, 4];

/** Check the features in the running browser. Pass `globalThis` or a stand-in. */
export function detectFeatures(
  env: {
    MediaRecorder?: unknown;
    ReadableStream?: unknown;
    Response?: unknown;
  } = globalThis,
): BrowserFeatures {
  const prototype =
    typeof env.Response === 'function' ? (env.Response as { prototype?: object }).prototype : null;
  return {
    mediaRecorder: typeof env.MediaRecorder === 'function',
    fetchStreams: typeof env.ReadableStream === 'function' && !!prototype && 'body' in prototype,
  };
}

function major(match: RegExpMatchArray | null): number | null {
  return match?.[1] ? Number.parseInt(match[1], 10) : null;
}

function belowFloor(ua: string): boolean {
  // Order matters: Edge, Samsung and Opera also say "Chrome". Chrome on iOS says "CriOS".
  const iosVersion = ua.match(/\b(?:iPhone )?OS (\d+)[_.](\d+)/);
  if (/\b(iPhone|iPad|iPod)\b/.test(ua) && iosVersion?.[1] && iosVersion[2]) {
    return isBefore(Number(iosVersion[1]), Number(iosVersion[2]), MIN_SAFARI);
  }
  const edge = major(ua.match(/\bEdg(?:e|A|iOS)?\/(\d+)/));
  if (edge !== null) return edge < MIN_VERSIONS.edge;
  const samsung = major(ua.match(/\bSamsungBrowser\/(\d+)/));
  if (samsung !== null) return samsung < MIN_VERSIONS.samsung;
  const firefox = major(ua.match(/\bFirefox\/(\d+)/));
  if (firefox !== null) return firefox < MIN_VERSIONS.firefox;
  const chrome = major(ua.match(/\bChrome\/(\d+)/));
  if (chrome !== null) return chrome < MIN_VERSIONS.chrome;
  const safari = ua.match(/\bVersion\/(\d+)(?:\.(\d+))?.*\bSafari\//);
  if (safari?.[1]) return isBefore(Number(safari[1]), Number(safari[2] ?? 0), MIN_SAFARI);
  return false;
}

function isBefore(maj: number, min: number, floor: readonly [number, number]): boolean {
  return maj < floor[0] || (maj === floor[0] && min < floor[1]);
}

export function isSupported(ua: string, features: BrowserFeatures): boolean {
  if (!features.mediaRecorder || !features.fetchStreams) return false;
  return !belowFloor(ua);
}
