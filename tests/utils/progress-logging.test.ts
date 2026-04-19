import { describe, expect, it, vi } from "vitest";

async function loadProgressModule() {
    const module = await import("./progress.js");
    return {
        createProgressTracker: module.createProgressTracker,
    };
}

const resetVitestState = (): void => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
};

const withCleanup = async (action: () => Promise<void>): Promise<void> => {
    try {
        await action();
    } finally {
        resetVitestState();
    }
};

describe("progress logging behaviour", () => {
    it("logs progress for first run and completion when enabled", async () => {
        expect.hasAssertions();

        await withCleanup(async () => {
            vi.stubEnv("POWERSHELL_PROPERTY_PROGRESS", "1");
            vi.resetModules();
            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            const { createProgressTracker } = await loadProgressModule();
            const tracker = createProgressTracker("log-test", 3);

            tracker.advance(); // First run logs
            tracker.advance(); // no log
            tracker.advance(); // Final run logs
            tracker.complete();

            expect(logSpy).toHaveBeenCalledWith("[progress] log-test run 1/3");
            expect(logSpy).toHaveBeenCalledWith("[progress] log-test run 3/3");
            expect(logSpy).toHaveBeenCalledWith(
                "[progress] log-test completed after 3 runs"
            );

            logSpy.mockRestore();
        });
    });

    it("logs at configured interval without total hint", async () => {
        expect.hasAssertions();

        await withCleanup(async () => {
            vi.stubEnv("POWERSHELL_PROPERTY_PROGRESS", "1");
            vi.stubEnv("POWERSHELL_PROPERTY_PROGRESS_INTERVAL", "2");
            vi.resetModules();
            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            const { createProgressTracker } = await loadProgressModule();
            const tracker = createProgressTracker("interval-test");

            tracker.advance(); // Logs
            tracker.advance(); // Interval hit, logs
            tracker.advance(); // no log
            tracker.advance(); // Interval hit again, logs

            const messages = logSpy.mock.calls.map(([message]) =>
                String(message)
            );

            expect(messages).toStrictEqual([
                "[progress] interval-test run 1",
                "[progress] interval-test run 2",
                "[progress] interval-test run 4",
            ]);

            logSpy.mockRestore();
        });
    });

    it("defaults to interval of 50 for invalid environment values", async () => {
        expect.hasAssertions();

        await withCleanup(async () => {
            vi.stubEnv("POWERSHELL_PROPERTY_PROGRESS", "1");
            vi.stubEnv("POWERSHELL_PROPERTY_PROGRESS_INTERVAL", "invalid");
            vi.resetModules();
            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            const { createProgressTracker } = await loadProgressModule();
            const tracker = createProgressTracker("invalid-interval");

            for (let i = 0; i < 50; i += 1) {
                tracker.advance();
            }

            const messages = logSpy.mock.calls.map(([message]) =>
                String(message)
            );

            expect(messages).toContain("[progress] invalid-interval run 1");
            expect(messages).toContain("[progress] invalid-interval run 50");

            logSpy.mockRestore();
        });
    });

    it("treats zero interval as invalid and falls back to default", async () => {
        expect.hasAssertions();

        await withCleanup(async () => {
            vi.stubEnv("POWERSHELL_PROPERTY_PROGRESS", "1");
            vi.stubEnv("POWERSHELL_PROPERTY_PROGRESS_INTERVAL", "0");
            vi.resetModules();
            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            const { createProgressTracker } = await loadProgressModule();
            const tracker = createProgressTracker("zero-interval");

            for (let i = 0; i < 50; i += 1) {
                tracker.advance();
            }

            const messages = logSpy.mock.calls.map(([message]) =>
                String(message)
            );

            expect(messages).toContain("[progress] zero-interval run 1");
            expect(messages).toContain("[progress] zero-interval run 50");

            logSpy.mockRestore();
        });
    });
});
