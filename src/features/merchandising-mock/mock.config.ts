import { DEMO_MODE } from '../../demo/demo.config';
/** Explicit opt-in; never silently replaces backend-connected screens. */
export const MERCHANDISING_MOCK_ENABLED = DEMO_MODE || import.meta.env?.VITE_ENABLE_MERCHANDISING_MOCK === 'true';
