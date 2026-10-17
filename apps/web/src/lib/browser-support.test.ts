import { describe, expect, it } from 'vitest';
import { detectFeatures, isSupported } from './browser-support';

const ok = { mediaRecorder: true, fetchStreams: true };

const UA = {
  chrome:
    'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
  chromeOld:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0',
  edgeOld:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/100.0.0.0',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36',
  samsungOld:
    'Mozilla/5.0 (Linux; Android 10; SM-A105F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/12.0 Chrome/79.0.3945.136 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  firefoxOld: 'Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  safari164:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
  safari163:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15',
  ios17:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  ios16_4:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1',
  ios15:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
  chromeOnIos15:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/150.0.0.0 Mobile/15E148 Safari/604.1',
  unknown: 'SomeNewBrowser/1.0',
};

describe('isSupported', () => {
  it.each([
    'chrome',
    'edge',
    'samsung',
    'firefox',
    'safariMac',
    'safari164',
    'ios17',
    'ios16_4',
  ] as const)('accepts %s with the features', (name) => {
    expect(isSupported(UA[name], ok)).toBe(true);
  });

  it.each([
    'chromeOld',
    'edgeOld',
    'samsungOld',
    'firefoxOld',
    'safari163',
    'ios15',
    'chromeOnIos15',
  ] as const)('rejects %s, which is older than the floor', (name) => {
    expect(isSupported(UA[name], ok)).toBe(false);
  });

  it('rejects a current browser that lacks recording', () => {
    expect(isSupported(UA.chrome, { ...ok, mediaRecorder: false })).toBe(false);
  });

  it('rejects a current browser that lacks streamed fetch', () => {
    expect(isSupported(UA.firefox, { ...ok, fetchStreams: false })).toBe(false);
  });

  it('lets an unknown browser through when it has the features', () => {
    expect(isSupported(UA.unknown, ok)).toBe(true);
    expect(isSupported('', ok)).toBe(true);
  });

  it('judges Edge by its own version, not the Chrome number inside it', () => {
    expect(isSupported(UA.edgeOld, ok)).toBe(false);
  });
});

describe('detectFeatures', () => {
  it('reads the features from an environment', () => {
    class R {
      get body() {
        return null;
      }
    }
    expect(
      detectFeatures({ MediaRecorder: class {}, ReadableStream: class {}, Response: R }),
    ).toEqual(ok);
  });

  it('reports missing features', () => {
    expect(detectFeatures({})).toEqual({ mediaRecorder: false, fetchStreams: false });
  });

  it('needs Response.body, not only Response', () => {
    const features = detectFeatures({
      MediaRecorder: class {},
      ReadableStream: class {},
      Response: class {},
    });
    expect(features.fetchStreams).toBe(false);
  });
});
