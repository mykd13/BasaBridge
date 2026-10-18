import { currentResolver } from './context';
import { createEngineHandlers } from './handlers';

export { configureEngine } from './context';
export type { ContextResolver, EngineContext } from './context';

/** The handlers the route files delegate to. They read the configured resolver on every call. */
export const engine = createEngineHandlers(currentResolver);
