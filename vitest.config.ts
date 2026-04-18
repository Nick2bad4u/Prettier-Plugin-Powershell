import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig(() => {
    const timeoutSetting = Number.parseInt(
        globalThis.process.env.POWERSHELL_TEST_TIMEOUT_MS ?? "120000",
        10
    );
    const testTimeout =
        Number.isFinite(timeoutSetting) && timeoutSetting > 0
            ? timeoutSetting
            : 120_000;

    const maxThreads = Math.max(
        16,
        Number(
            globalThis.process.env.MAX_THREADS ??
                (globalThis.process.env.CI ? "1" : "4")
        )
    );

    return {
        test: {
            clearMocks: true,
            coverage: {
                all: true,
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
                provider: "v8",
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
            pool: "threads",
            poolOptions: {
                threads: {
                    isolate: true,
                    maxThreads,
                    minThreads: 1,
                    singleThread: Boolean(globalThis.process.env.CI),
                    useAtomics: true,
                },
            },
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
