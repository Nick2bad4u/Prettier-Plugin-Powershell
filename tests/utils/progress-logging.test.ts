import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

async function loadProgressModule() {
    const module = await import("./progress.js");
    return {
        createProgressTracker: module.createProgressTracker,
    };
}

afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    vi.resetModules();
});

describe("Progress logging behaviour", () => {
    it("logs progress for first run and completion when enabled", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_PROPERTY_PROGRESS: "1",
        };
        vi.resetModules();
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        const { createProgressTracker } = await loadProgressModule();
        const tracker = createProgressTracker("log-test", 3);

        tracker.advance(); // first run logs
        tracker.advance(); // no log
        tracker.advance(); // final run logs
        tracker.complete();

        expect(logSpy).toHaveBeenCalledWith("[progress] log-test run 1/3");
        expect(logSpy).toHaveBeenCalledWith("[progress] log-test run 3/3");
        expect(logSpy).toHaveBeenCalledWith(
            "[progress] log-test completed after 3 runs"
        );

        logSpy.mockRestore();
    });

    it("logs at configured interval without total hint", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_PROPERTY_PROGRESS: "1",
            POWERSHELL_PROPERTY_PROGRESS_INTERVAL: "2",
        };
        vi.resetModules();
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        const { createProgressTracker } = await loadProgressModule();
        const tracker = createProgressTracker("interval-test");

        tracker.advance(); // logs
        tracker.advance(); // interval hit, logs
        tracker.advance(); // no log
        tracker.advance(); // interval hit again, logs

        const messages = logSpy.mock.calls.map(([message]) => String(message));
        expect(messages).toEqual([
            "[progress] interval-test run 1",
            "[progress] interval-test run 2",
            "[progress] interval-test run 4",
        ]);

        logSpy.mockRestore();
    });

    it("defaults to interval of 50 for invalid environment values", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_PROPERTY_PROGRESS: "1",
            POWERSHELL_PROPERTY_PROGRESS_INTERVAL: "invalid",
        };
        vi.resetModules();
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        const { createProgressTracker } = await loadProgressModule();
        const tracker = createProgressTracker("invalid-interval");

        for (let i = 0; i < 50; i += 1) {
            tracker.advance();
        }

        const messages = logSpy.mock.calls.map(([message]) => String(message));
        expect(messages).toContain("[progress] invalid-interval run 1");
        expect(messages).toContain("[progress] invalid-interval run 50");

        logSpy.mockRestore();
    });

    it("treats zero interval as invalid and falls back to default", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_PROPERTY_PROGRESS: "1",
            POWERSHELL_PROPERTY_PROGRESS_INTERVAL: "0",
        };
        vi.resetModules();
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        const { createProgressTracker } = await loadProgressModule();
        const tracker = createProgressTracker("zero-interval");

        for (let i = 0; i < 50; i += 1) {
            tracker.advance();
        }

        const messages = logSpy.mock.calls.map(([message]) => String(message));
        expect(messages).toContain("[progress] zero-interval run 1");
        expect(messages).toContain("[progress] zero-interval run 50");

        logSpy.mockRestore();
    });
});
