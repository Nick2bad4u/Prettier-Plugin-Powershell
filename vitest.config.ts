import { defineConfig } from 'vitest/config';
import { coverageConfigDefaults } from 'vitest/config';
import {
  type UserConfigFnObject,
} from "vite";
export default defineConfig(({ }) => {
  const timeoutSetting = Number.parseInt(process.env["POWERSHELL_TEST_TIMEOUT_MS"] ?? "120000", 10);
  const testTimeout = Number.isFinite(timeoutSetting) && timeoutSetting > 0 ? timeoutSetting : 120_000;
  return {
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    environment: 'node', // Changed from jsdom to node since we don't need DOM
    coverage: {
      all: true, // Include all source files in coverage
      clean: true,
      exclude: [
        '**/*.config.*',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.bench.*',
        '**/.cache/**',
        '**/.stryker-tmp/**',
        'coverage/**',
        'tests/**',
        'node_modules/**',
        ...coverageConfigDefaults.exclude,
      ],
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
    pool: 'threads', // Use worker threads for better performance
    poolOptions: {
      threads: {
        isolate: true,
        maxThreads: Math.max(16, Number(process.env['MAX_THREADS'] ?? (process.env['CI'] ? '1' : '4'))), // Scaled down for smaller project
        minThreads: 1,
        singleThread: Boolean(process.env['CI']),
        useAtomics: true,
      },
    },
    reporters: ['default', 'hanging-process'],
    slowTestThreshold: 300,
    testTimeout,
    typecheck: {
      enabled: true,
      checker: 'tsc',
      tsconfig: './tsconfig.json',
    },
  },
};
}) satisfies UserConfigFnObject as UserConfigFnObject;
