import { describe, expect, it } from "vitest";

import { createProgressTracker, withProgress } from "./progress.js";

describe("Progress utilities", () => {
    describe("createProgressTracker", () => {
        it("creates a tracker that counts advances", () => {
            const tracker = createProgressTracker("test");
            expect(tracker.advance()).toBe(1);
            expect(tracker.advance()).toBe(2);
            expect(tracker.advance()).toBe(3);
        });

        it("accepts totalHint parameter", () => {
            const tracker = createProgressTracker("test", 10);
            expect(tracker.advance()).toBe(1);
            expect(tracker.advance()).toBe(2);
        });

        it("has complete method", () => {
            const tracker = createProgressTracker("test");
            expect(typeof tracker.complete).toBe("function");
            tracker.complete(); // Should not throw
        });

        it("continues counting after many advances", () => {
            const tracker = createProgressTracker("test");
            for (let i = 0; i < 100; i++) {
                tracker.advance();
            }
            expect(tracker.advance()).toBe(101);
        });
    });

    describe("withProgress", () => {
        it("executes action and returns result", async () => {
            const result = await withProgress("test", 5, (tracker) => {
                tracker.advance();
                return "done";
            });

            expect(result).toBe("done");
        });

        it("propagates errors from action", async () => {
            await expect(
                withProgress("test", 5, () => {
                    throw new Error("test error");
                })
            ).rejects.toThrow("test error");
        });

        it("supports synchronous actions", async () => {
            const result = await withProgress("test", 5, (tracker) => {
                tracker.advance();
                return "sync result";
            });

            expect(result).toBe("sync result");
        });

        it("supports async actions", async () => {
            const result = await withProgress("test", 5, async (tracker) => {
                tracker.advance();
                await Promise.resolve();
                return "async result";
            });

            expect(result).toBe("async result");
        });

        it("passes tracker to action", async () => {
            let count = 0;

            await withProgress("test", 5, (tracker) => {
                count = tracker.advance();
                return "done";
            });

            expect(count).toBe(1);
        });

        it("allows tracker to be advanced multiple times", async () => {
            let finalCount = 0;

            await withProgress("test", 10, (tracker) => {
                for (let i = 0; i < 5; i++) {
                    finalCount = tracker.advance();
                }
                return "done";
            });

            expect(finalCount).toBe(5);
        });
    });
});
