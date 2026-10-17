/**
 * Server-only entry for audio handling (BB-30). It pulls in node:crypto, so import it as
 * `@basabridge/speech/audio-server` from route handlers and jobs, never from client code.
 * The root `@basabridge/speech` entry stays free of Node modules.
 */
export * from './audio-store';
export * from './audio';
