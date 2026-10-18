import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MicGate } from './mic-gate';
import { useMicrophone } from './use-microphone';

vi.mock('./use-microphone', () => ({ useMicrophone: vi.fn() }));

const base = {
  level: 0,
  upload: 'idle',
  start: () => {},
  stop: () => {},
  restart: () => {},
  noMicrophone: () => {},
};

// The shell around every page already has the one main landmark, the header and the brand.
describe('MicGate inside the student shell', () => {
  it.each(['ready', 'requesting', 'recording', 'finished', 'denied', 'unsupported', 'lost'])(
    'has one h1 and no main or header of its own while %s',
    (phase) => {
      vi.mocked(useMicrophone).mockReturnValue({ ...base, phase } as never);
      const html = renderToStaticMarkup(<MicGate />);
      expect(html).not.toMatch(/<main[\s>]/);
      expect(html).not.toMatch(/<header[\s>]/);
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    },
  );
});
