import { defineWorkspace } from 'vitest/config';

// Use project config file paths so each project's vitest.config.ts is loaded
// This ensures resolve aliases from each project are applied correctly
export default defineWorkspace([
  'apps/api/vitest.config.ts',
  'apps/web/vitest.config.ts',
]);
