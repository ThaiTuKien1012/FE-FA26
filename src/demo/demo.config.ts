/** API remains the default; standalone data is always opt-in. */
export const DEMO_MODE = import.meta.env?.VITE_DATA_MODE === 'mock';
