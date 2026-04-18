import type { ChildProcess } from "node:child_process";

import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

interface MockProcessHooks {
    onMessage?: (
        proc: MockProcess,
        respond: (response: MockResponse) => void
    ) => void;
}

type MockResponse = { message: string; type: "ERROR" } | { type: "OK" };

class MockProcess extends EventTarget {
    public readonly kill = vi.fn();
    public readonly stderr: PassThrough;
    public readonly stdin: PassThrough;
    public readonly stdout: PassThrough;

    private buffer = Buffer.alloc(0);
    private dataCollected = 0;
    private expectedDataLength = 0;
    private readonly hooks: MockProcessHooks | undefined;
    private readonly responses: MockResponse[];
    private totalLength = 0;

    constructor(responses: MockResponse[], hooks?: MockProcessHooks) {
        super();
        this.responses = [...responses];
        this.hooks = hooks;
        this.stdin = new PassThrough();
        this.stdout = new PassThrough();
        this.stderr = new PassThrough();
    }

    public emit(eventName: string, ...detail: unknown[]): boolean {
        const event = new Event(eventName) as Event & { detail: unknown[] };
        Object.defineProperty(event, "detail", {
            configurable: false,
            enumerable: false,
            value: detail,
            writable: false,
        });

        return this.dispatchEvent(event);
    }

    public on(
        eventName: string,
        listener: (...detail: unknown[]) => void
    ): this {
        this.addEventListener(eventName, (event) => {
            const customEvent = event as Event & { detail: unknown[] };
            listener(...customEvent.detail);
        });

        return this;
    }

    public startConsumingInput(): void {
        void this.consumeInput();
    }

    private async consumeInput(): Promise<void> {
        for await (const chunk of this.stdin) {
            this.buffer = Buffer.concat([
                this.buffer,
                Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
            ]);
            this.processBuffer();
        }
    }

    private finishBufferedMessage(): void {
        this.totalLength = 0;
        this.expectedDataLength = 0;
        this.dataCollected = 0;

        if (this.hooks?.onMessage) {
            const respond = (response: MockResponse): void => {
                this.scheduleResponse(response);
            };
            this.hooks.onMessage(this, respond);
            return;
        }

        const response = this.responses.shift() ?? {
            type: "OK" as const,
        };
        this.scheduleResponse(response);
    }

    private processBuffer(): void {
        while (this.buffer.length > 0) {
            if (this.totalLength === 0) {
                if (this.buffer.length < 4) {
                    return;
                }
                this.totalLength = this.buffer.readInt32LE(0);
                this.buffer = this.buffer.subarray(4);
            } else if (this.expectedDataLength === 0) {
                if (this.buffer.length < 4) {
                    return;
                }
                const identifierLength = this.buffer.readInt32LE(0);
                this.buffer = this.buffer.subarray(4);
                const scriptLength = this.totalLength - 4 - identifierLength;
                this.expectedDataLength = identifierLength + scriptLength; // Identifier + script
                this.dataCollected = 0;
            } else {
                const remaining = this.expectedDataLength - this.dataCollected;
                const toConsume = Math.min(remaining, this.buffer.length);
                this.buffer = this.buffer.subarray(toConsume);
                this.dataCollected += toConsume;

                if (this.dataCollected < this.expectedDataLength) {
                    return;
                }

                this.finishBufferedMessage();
            }
        }
    }

    private scheduleResponse(response: MockResponse): void {
        setTimeout(() => {
            const payload =
                response.type === "OK"
                    ? Buffer.from("OK\n", "utf8")
                    : Buffer.from(`ERROR\n${response.message}\n`, "utf8");
            const length = Buffer.alloc(4);
            length.writeInt32LE(payload.length, 0);
            this.stdout.push(Buffer.concat([length, payload]));
        }, 0);
    }
}

function createSpawnMock(
    responses: MockResponse[],
    onCreate?: (proc: ChildProcess & MockProcess) => void,
    hooks?: MockProcessHooks
) {
    return vi.fn(() => {
        const proc = new MockProcess(
            responses,
            hooks
        ) as unknown as ChildProcess & MockProcess;
        proc.startConsumingInput();

        onCreate?.(proc);

        return proc;
    });
}

const { env: testEnv } = process;
const originalEnv = { ...testEnv };

const replaceTestEnvironment = (overrides: NodeJS.ProcessEnv): void => {
    for (const key of Object.keys(testEnv)) {
        testEnv[key] = undefined;
    }

    Object.assign(testEnv, originalEnv, overrides);
};

afterEach(() => {
    replaceTestEnvironment({});
    vi.clearAllMocks();
    vi.resetModules();
    vi.unmock("node:child_process");
    process.removeAllListeners("exit");
});

describe("powerShell syntax utilities", () => {
    it("skips validation when POWERSHELL_VERIFY_SYNTAX is 0", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "0",
        });

        const spawnMock = vi.fn();
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { assertPowerShellParses, isPowerShellParsable } = await import(
            "./powershell.js"
        );

        await expect(
            isPowerShellParsable("Write-Host 'hello'", "disabled")
        ).resolves.toBeTruthy();
        await expect(
            assertPowerShellParses("Write-Host 'hello'", "disabled")
        ).resolves.toBeUndefined();

        expect(spawnMock).not.toHaveBeenCalled();
    });

    it("validates scripts using the persistent process", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = createSpawnMock([{ type: "OK" }]);
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'ok'", "success")
        ).resolves.toBeTruthy();

        expect(spawnMock).toHaveBeenCalledOnce();
    });

    it("throws when PowerShell reports errors", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = createSpawnMock([
            { message: "Line 1: unexpected token", type: "ERROR" },
        ]);
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("bad script", "error-case")
        ).rejects.toThrow(
            /PowerShell parser reported errors \(exit 1\) for error-case/v
        );
    });

    it("returns false from isPowerShellParsable when parser reports errors", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = createSpawnMock([
            { message: "Syntax failure", type: "ERROR" },
        ]);
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("bad script", "error-return")
        ).resolves.toBeFalsy();
    });

    it("limits validation invocations using POWERSHELL_MAX_SYNTAX_CHECKS", async () => {
        replaceTestEnvironment({
            POWERSHELL_MAX_SYNTAX_CHECKS: "1",
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = createSpawnMock([{ type: "OK" }]);
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'first'", "limited-1")
        ).resolves.toBeTruthy();
        await expect(
            isPowerShellParsable("Write-Host 'second'", "limited-2")
        ).resolves.toBeTruthy();

        expect(spawnMock).toHaveBeenCalledOnce();
    });

    it("throws informative error when pwsh executable is missing", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = vi.fn(() => {
            const error = new Error("not found") as NodeJS.ErrnoException;
            error.code = "ENOENT";
            throw error;
        });
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'hi'", "missing-pwsh")
        ).rejects.toThrow(
            "PowerShell executable 'pwsh' was not found. Install PowerShell 7+ or set POWERSHELL_VERIFY_SYNTAX=0 to disable syntax validation."
        );
    });

    it("wraps unexpected spawn errors with additional context", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = vi.fn(() => {
            throw new Error("spawn failure");
        });
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'hi'", "spawn-error")
        ).rejects.toThrow(
            "Failed to spawn persistent PowerShell process: spawn failure"
        );
    });

    it("throws when process stdio streams are unavailable", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = vi.fn(
            () =>
                Object.assign(new EventTarget(), {
                    stderr: null,
                    stdin: null,
                    stdout: null,
                }) as unknown as ChildProcess
        );
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'hi'", "no-stdio")
        ).rejects.toThrow("Failed to access PowerShell process stdio");
    });

    it("rejects pending validations when the process emits an error", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        let createdProcess: (ChildProcess & MockProcess) | null = null;
        const spawnMock = createSpawnMock(
            [],
            (proc) => {
                createdProcess = proc;
            },
            {
                onMessage: () => {
                    // Leave validation pending so the process error handler triggers rejection.
                },
            }
        );
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        const parsePromise = assertPowerShellParses(
            "Write-Host 'fail'",
            "process-error"
        );

        expect(createdProcess).not.toBeNull();

        createdProcess!.emit("error", new Error("simulated failure"));

        await expect(parsePromise).rejects.toThrow(
            "PowerShell process error: simulated failure"
        );
    });

    it("handles chunked stdout responses from PowerShell", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = createSpawnMock([], undefined, {
            onMessage: (proc) => {
                const payload = Buffer.from("OK\n", "utf8");
                const length = Buffer.alloc(4);
                length.writeInt32LE(payload.length, 0);

                // Emit length in two chunks to force the parser to wait for remaining bytes.
                proc.stdout.push(length.subarray(0, 2));
                setTimeout(() => {
                    proc.stdout.push(
                        Buffer.concat([
                            length.subarray(2),
                            payload.subarray(0, 1),
                        ])
                    );
                    setTimeout(() => {
                        proc.stdout.push(payload.subarray(1));
                    }, 0);
                }, 0);
            },
        });
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'chunks'", "chunked-response")
        ).resolves.toBeTruthy();
    });

    it("rejects pending validations when the process exits unexpectedly", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        let createdProcess: (ChildProcess & MockProcess) | null = null;
        const spawnMock = createSpawnMock(
            [],
            (proc) => {
                createdProcess = proc;
            },
            {
                onMessage: () => {
                    // Keep validation pending.
                },
            }
        );
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        const parsePromise = assertPowerShellParses(
            "Write-Host 'fail'",
            "process-exit"
        );

        expect(createdProcess).not.toBeNull();

        const processRef = createdProcess!;
        processRef.emit("exit", 1);

        await expect(parsePromise).rejects.toThrow(
            "PowerShell process exited unexpectedly with code 1"
        );
    });

    it("rejects when writing to the PowerShell stdin stream fails", async () => {
        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = createSpawnMock([{ type: "OK" }], (proc) => {
            // Force the first write to throw to exercise the error branch.
            const failingWrite = (): never => {
                throw new Error("stdin write failure");
            };
            proc.stdin.write = failingWrite as typeof proc.stdin.write;
        });
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'fail'", "stdin-failure")
        ).rejects.toThrow("stdin write failure");
    });

    it("traces diagnostic output when POWERSHELL_SYNTAX_TRACE is enabled", async () => {
        const logs: string[] = [];
        const errors: string[] = [];
        const logSpy = vi
            .spyOn(console, "log")
            .mockImplementation((message) => {
                logs.push(String(message));
            });
        const errorSpy = vi
            .spyOn(console, "error")
            .mockImplementation((message) => {
                errors.push(String(message));
            });

        replaceTestEnvironment({
            POWERSHELL_SYNTAX_TRACE: "1",
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        let createdProcess: (ChildProcess & MockProcess) | null = null;
        const spawnMock = createSpawnMock([{ type: "OK" }], (proc) => {
            createdProcess = proc;
        });
        vi.doMock(import("node:child_process"), () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'trace'", "trace-case")
        ).resolves.toBeTruthy();

        expect(logs.some((entry) => entry.includes("invoke"))).toBeTruthy();

        expect(createdProcess).not.toBeNull();

        const processRef = createdProcess!;

        processRef.stderr.emit("data", Buffer.from("warning", "utf8"));
        processRef.emit("error", new Error("boom"));
        processRef.emit("exit", 0);

        expect(errors.length).toBeGreaterThanOrEqual(1);

        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
