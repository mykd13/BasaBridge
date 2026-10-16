/** Minimal WAV reader for 16-bit PCM files. */

export interface Wav {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  /** Raw PCM samples, little endian. */
  pcm: Uint8Array;
  seconds: number;
}

export function readWav(bytes: Uint8Array): Wav {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o: number) => String.fromCharCode(...bytes.subarray(o, o + 4));
  if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')
    throw new Error('not a WAV file');
  let offset = 12;
  let fmt: { channels: number; sampleRate: number; bits: number; format: number } | null = null;
  while (offset + 8 <= bytes.length) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        format: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === 'data') {
      if (!fmt) throw new Error('WAV data before fmt');
      if (fmt.format !== 1 || fmt.bits !== 16) throw new Error('WAV must be 16-bit PCM');
      const pcm = bytes.subarray(body, Math.min(body + size, bytes.length));
      return {
        sampleRate: fmt.sampleRate,
        channels: fmt.channels,
        bitsPerSample: fmt.bits,
        pcm,
        seconds: pcm.length / (fmt.sampleRate * fmt.channels * 2),
      };
    }
    offset = body + size + (size % 2);
  }
  throw new Error('WAV has no data chunk');
}

/** Build a WAV file from 16-bit mono PCM. Used by tests and the synthetic self-test. */
export function writeWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);
  const put = (o: number, s: string) => [...s].forEach((ch, i) => (out[o + i] = ch.charCodeAt(0)));
  put(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  put(8, 'WAVE');
  put(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  put(36, 'data');
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

/** Split PCM into chunks of the given length, for real-time streaming. */
export function* chunks(wav: Wav, ms: number): Generator<Uint8Array<ArrayBuffer>> {
  const size = Math.max(2, Math.round((wav.sampleRate * wav.channels * 2 * ms) / 1000) & ~1);
  for (let o = 0; o < wav.pcm.length; o += size) yield wav.pcm.slice(o, o + size);
}
