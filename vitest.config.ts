import { coverageConfigDefaults, defineConfig } from "vitest/config";

const vitestConfig: ReturnType<typeof defineConfig> = defineConfig(() => {
    const timeoutSetting = Number.parseInt(
        globalThis.process.env.POWERSHELL_TEST_TIMEOUT_MS ?? "120000",
        10
    );
    const testTimeout =
        Number.isFinite(timeoutSetting) && timeoutSetting > 0
            ? timeoutSetting
            : 120_000;

    // In Vitest 4, poolOptions was removed and all options are now top-level.
    // maxWorkers replaces poolOptions.threads.maxThreads (and singleThread: true
    // is now expressed as maxWorkers: 1).  minWorkers and useAtomics were removed.
    const maxWorkers = Boolean(globalThis.process.env.CI)
        ? 1
        : Math.max(16, Number(globalThis.process.env.MAX_THREADS ?? "4"));

    return {
        test: {
            clearMocks: true,
            coverage: {
                // 'all' was removed in Vitest 4; use 'include' to specify which
                // source files to track for coverage reporting.
                include: ["src/**/*.ts"],
                clean: true,
                exclude: [
                    "**/*.config.*",
                    "**/*.d.ts",
                    "**/*.test.*",
                    "**/*.spec.*",
                    "**/*.bench.*",
                    "**/.cache/**",
                    "**/.stryker-tmp/**",
                    "coverage/**",
                    "tests/**",
                    "node_modules/**",
                    ...coverageConfigDefaults.exclude,
                ],
                provider: "v8" as const,
                reporter: [
                    "text",
                    "json",
                    "lcov",
                    "html",
                ],
                reportsDirectory: "./coverage",
                thresholds: {
                    branches: 95,
                    functions: 95,
                    lines: 95,
                    statements: 95,
                },
            },
            environment: "node",
            globals: false,
            hookTimeout: testTimeout,
            include: ["tests/**/*.test.ts"],
            // In Vitest 4, isolate and maxWorkers are top-level options.
            isolate: true,
            maxWorkers,
            pool: "threads",
            reporters: ["default", "hanging-process"],
            resetMocks: true,
            restoreMocks: true,
            slowTestThreshold: 300,
            teardownTimeout: testTimeout,
            testTimeout,
            typecheck: {
                checker: "tsc",
                enabled: true,
                tsconfig: "./tsconfig.json",
            },
        },
    };
});

export default vitestConfig;
