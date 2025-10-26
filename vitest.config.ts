import { defineConfig } from 'vitest/config';
import { coverageConfigDefaults } from 'vitest/config';
import {
  type UserConfigFnObject,
} from "vite";
export default defineConfig(({ }) => {
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
        'node_modules/**',
        ...coverageConfigDefaults.exclude,
      ],
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    pool: 'threads', // Use worker threads for better performance
    poolOptions: {
      threads: {
        isolate: true,
        maxThreads: Math.max(1, Number(process.env['MAX_THREADS'] ?? (process.env['CI'] ? '1' : '4'))), // Scaled down for smaller project
        minThreads: 1,
        singleThread: Boolean(process.env['CI']),
        useAtomics: true,
      },
    },
    reporters: ['default', 'hanging-process'],
    slowTestThreshold: 300,
    testTimeout: 15000,
    typecheck: {
      enabled: true,
      checker: 'tsc',
      tsconfig: './tsconfig.json',
    },
  },
};
}) satisfies UserConfigFnObject as UserConfigFnObject;
