import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/f11/*.test.ts', 'tests/vitest/*.test.ts'], environment: 'node' } });
