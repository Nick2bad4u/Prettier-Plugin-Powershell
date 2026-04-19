import type { ChildProcess } from "node:child_process";

import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";

interface MockProcessHooks {
    onMessage?: (
        proc: Readonly<MockProcess>,
        respond: (response: Readonly<MockResponse>) => void
    ) => void;
}

type MockResponse = { message: string; type: "ERROR" } | { type: "OK" };

class MockProcess extends EventTarget {
    public readonly kill = vi.fn<() => boolean>();
    public readonly stderr: PassThrough;
    public readonly stdin: PassThrough;
    public readonly stdout: PassThrough;

    private buffer = Buffer.alloc(0);
    private dataCollected = 0;
    private expectedDataLength = 0;
    private readonly hooks: MockProcessHooks | undefined;
    private readonly listenerMap = new Map<
        (...detail: readonly unknown[]) => void,
        (event: Readonly<Event>) => void
    >();
    private readonly responses: MockResponse[];
    private totalLength = 0;

    public constructor(
        responses: readonly Readonly<MockResponse>[],
        hooks?: Readonly<MockProcessHooks>
    ) {
        super();
        this.responses = [...responses];
        this.hooks = hooks;
        this.stdin = new PassThrough();
        this.stdout = new PassThrough();
        this.stderr = new PassThrough();
    }

    /**
     * Node.js EventEmitter compatibility alias for `on`.
     *
     * @param eventName - Event name to subscribe to
     * @param listener - Listener callback
     *
     * @returns The current process instance for chaining
     */
    public addListener(
        eventName: string,
        listener: (...detail: readonly unknown[]) => void
    ): this {
        return this.on(eventName, listener);
    }

    public emit(eventName: string, ...detail: readonly unknown[]): boolean {
        const event = new Event(eventName) as Event & {
            detail: readonly unknown[];
        };
        Object.defineProperty(event, "detail", {
            configurable: false,
            enumerable: false,
            value: detail,
            writable: false,
        });

        return this.dispatchEvent(event);
    }

    public off(
        eventName: string,
        listener: (...detail: readonly unknown[]) => void
    ): this {
        const mapped = this.listenerMap.get(listener);

        if (mapped) {
            this.removeEventListener(eventName, mapped);
            this.listenerMap.delete(listener);
        }

        return this;
    }

    public on(
        eventName: string,
        listener: (...detail: readonly unknown[]) => void
    ): this {
        const mapped = (event: Readonly<Event>): void => {
            const customEvent = event as Event & { detail: readonly unknown[] };
            listener(...customEvent.detail);
        };
        this.listenerMap.set(listener, mapped);
        this.addEventListener(eventName, mapped);

        return this;
    }

    public once(
        eventName: string,
        listener: (...detail: readonly unknown[]) => void
    ): this {
        const wrapped = (...detail: readonly unknown[]): void => {
            this.off(eventName, wrapped);
            listener(...detail);
        };

        return this.on(eventName, wrapped);
    }

    /**
     * Node.js EventEmitter compatibility alias for `off`.
     *
     * @param eventName - Event name to unsubscribe from
     * @param listener - Listener callback
     *
     * @returns The current process instance for chaining
     */
    public removeListener(
        eventName: string,
        listener: (...detail: readonly unknown[]) => void
    ): this {
        return this.off(eventName, listener);
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
            const respond = (response: Readonly<MockResponse>): void => {
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

    private scheduleResponse(response: Readonly<MockResponse>): void {
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
    responses: readonly Readonly<MockResponse>[],
    onCreate?: (proc: Readonly<ChildProcess & MockProcess>) => void,
    hooks?: Readonly<MockProcessHooks>
) {
    return vi.fn<() => ChildProcess & MockProcess>(() => {
        const proc = new MockProcess(
            responses,
            hooks
        ) as unknown as ChildProcess & MockProcess;
        proc.startConsumingInput();

        onCreate?.(proc);

        return proc;
    });
}

/**
 * Installs a typed runtime mock for node:child_process that overrides spawn.
 *
 * @param spawnMock - Mock implementation used for child_process.spawn
 */
const mockChildProcessModule = (spawnMock: unknown): void => {
    vi.doMock(import("node:child_process"), async (importOriginal) => {
        const actual = await importOriginal();
        const typedSpawn = spawnMock as typeof actual.spawn;

        return {
            ...actual,
            default: {
                ...actual.default,
                spawn: typedSpawn,
            },
            spawn: typedSpawn,
        };
    });
};

const { env: testEnv } = process;
const originalEnv = { ...testEnv };

const replaceTestEnvironment = (
    overrides: Readonly<NodeJS.ProcessEnv>
): void => {
    for (const key of Object.keys(testEnv)) {
        testEnv[key] = undefined;
    }

    Object.assign(testEnv, originalEnv, overrides);
};

const resetTestState = (): void => {
    replaceTestEnvironment({});
    vi.clearAllMocks();
    vi.resetModules();
    vi.doUnmock("node:child_process");
    process.removeAllListeners("error");
    process.removeAllListeners("exit");
};

const withTestCleanup = async (action: () => Promise<void>): Promise<void> => {
    try {
        await action();
    } finally {
        resetTestState();
    }
};

const requireCreatedProcess = (
    processRef: null | Readonly<ChildProcess & MockProcess>
): Readonly<ChildProcess & MockProcess> => {
    if (processRef === null) {
        throw new Error("Expected created process to be available");
    }

    return processRef;
};

describe("powershell syntax utilities", () => {
    it("skips validation when POWERSHELL_VERIFY_SYNTAX is 0", async () => {
        expect.hasAssertions();

        resetTestState();

        await withTestCleanup(async () => {
            replaceTestEnvironment({
                POWERSHELL_VERIFY_SYNTAX: "0",
            });

            const spawnMock = vi.fn<() => ChildProcess>();
            mockChildProcessModule(spawnMock);

            const { assertPowerShellParses, isPowerShellParsable } =
                await import("./powershell.js");

            await expect(
                isPowerShellParsable("Write-Host 'hello'", "disabled")
            ).resolves.toBeTruthy();
            await expect(
                assertPowerShellParses("Write-Host 'hello'", "disabled")
            ).resolves.toBeUndefined();

            expect(spawnMock).not.toHaveBeenCalled();
        });
    });

    it("validates scripts using the persistent process", async () => {
        expect.hasAssertions();

        resetTestState();

        await withTestCleanup(async () => {
            replaceTestEnvironment({
                POWERSHELL_VERIFY_SYNTAX: "1",
            });

            const spawnMock = createSpawnMock([{ type: "OK" }]);
            mockChildProcessModule(spawnMock);

            const { isPowerShellParsable } = await import("./powershell.js");

            await expect(
                isPowerShellParsable("Write-Host 'ok'", "success")
            ).resolves.toBeTruthy();

            expect(spawnMock).toHaveBeenCalledOnce();
        });
    });

    it("throws when PowerShell reports errors", async () => {
        expect.hasAssertions();

        resetTestState();

        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = createSpawnMock([
            { message: "Line 1: unexpected token", type: "ERROR" },
        ]);
        mockChildProcessModule(spawnMock);

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("bad script", "error-case")
        ).rejects.toThrow(
            /PowerShell parser reported errors \(exit 1\) for error-case/v
        );
    });

    it("returns false from isPowerShellParsable when parser reports errors", async () => {
        expect.hasAssertions();

        resetTestState();

        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = createSpawnMock([
            { message: "Syntax failure", type: "ERROR" },
        ]);
        mockChildProcessModule(spawnMock);

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("bad script", "error-return")
        ).resolves.toBeFalsy();
    });

    it("limits validation invocations using POWERSHELL_MAX_SYNTAX_CHECKS", async () => {
        expect.hasAssertions();

        resetTestState();

        replaceTestEnvironment({
            POWERSHELL_MAX_SYNTAX_CHECKS: "1",
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = createSpawnMock([{ type: "OK" }]);
        mockChildProcessModule(spawnMock);

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
        expect.hasAssertions();

        resetTestState();

        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = vi.fn<() => never>(() => {
            const error = new Error("not found") as NodeJS.ErrnoException;
            error.code = "ENOENT";
            throw error;
        });
        mockChildProcessModule(spawnMock);

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'hi'", "missing-pwsh")
        ).rejects.toThrow(
            "PowerShell executable 'pwsh' was not found. Install PowerShell 7+ or set POWERSHELL_VERIFY_SYNTAX=0 to disable syntax validation."
        );
    });

    it("wraps unexpected spawn errors with additional context", async () => {
        expect.hasAssertions();

        resetTestState();

        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = vi.fn<() => never>(() => {
            throw new Error("spawn failure");
        });
        mockChildProcessModule(spawnMock);

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'hi'", "spawn-error")
        ).rejects.toThrow(
            "Failed to spawn persistent PowerShell process: spawn failure"
        );
    });

    it("throws when process stdio streams are unavailable", async () => {
        expect.hasAssertions();

        resetTestState();

        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        const spawnMock = vi.fn<() => ChildProcess>(
            () =>
                Object.assign(new EventTarget(), {
                    stderr: null,
                    stdin: null,
                    stdout: null,
                }) as unknown as ChildProcess
        );
        mockChildProcessModule(spawnMock);

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'hi'", "no-stdio")
        ).rejects.toThrow("Failed to access PowerShell process stdio");
    });

    it("rejects pending validations when the process emits an error", async () => {
        expect.hasAssertions();

        resetTestState();

        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        let createdProcess: null | Readonly<ChildProcess & MockProcess> = null;
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
        mockChildProcessModule(spawnMock);

        const { assertPowerShellParses } = await import("./powershell.js");

        const parsePromise = assertPowerShellParses(
            "Write-Host 'fail'",
            "process-error"
        );

        expect(createdProcess).not.toBeNull();

        const processRef = requireCreatedProcess(createdProcess);

        processRef.emit("error", new Error("simulated failure"));

        await expect(parsePromise).rejects.toThrow(
            "PowerShell process error: simulated failure"
        );
    });

    it("handles chunked stdout responses from PowerShell", async () => {
        expect.hasAssertions();

        resetTestState();

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
        mockChildProcessModule(spawnMock);

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'chunks'", "chunked-response")
        ).resolves.toBeTruthy();
    });

    it("rejects pending validations when the process exits unexpectedly", async () => {
        expect.hasAssertions();

        resetTestState();

        replaceTestEnvironment({
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        let createdProcess: null | Readonly<ChildProcess & MockProcess> = null;
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
        mockChildProcessModule(spawnMock);

        const { assertPowerShellParses } = await import("./powershell.js");

        const parsePromise = assertPowerShellParses(
            "Write-Host 'fail'",
            "process-exit"
        );

        expect(createdProcess).not.toBeNull();

        const processRef = requireCreatedProcess(createdProcess);
        processRef.emit("exit", 1);

        await expect(parsePromise).rejects.toThrow(
            "PowerShell process exited unexpectedly with code 1"
        );
    });

    it("rejects when writing to the PowerShell stdin stream fails", async () => {
        expect.hasAssertions();

        resetTestState();

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
        mockChildProcessModule(spawnMock);

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'fail'", "stdin-failure")
        ).rejects.toThrow("stdin write failure");
    });

    it("traces diagnostic output when POWERSHELL_SYNTAX_TRACE is enabled", async () => {
        expect.hasAssertions();

        resetTestState();

        const logs: string[] = [];
        const logSpy = vi
            .spyOn(console, "log")
            .mockImplementation((message) => {
                logs.push(String(message));
            });
        const errorSpy = vi.spyOn(console, "error").mockReturnValue(undefined);

        replaceTestEnvironment({
            POWERSHELL_SYNTAX_TRACE: "1",
            POWERSHELL_VERIFY_SYNTAX: "1",
        });

        let createdProcess: null | Readonly<ChildProcess & MockProcess> = null;
        const spawnMock = createSpawnMock([{ type: "OK" }], (proc) => {
            createdProcess = proc;
        });
        mockChildProcessModule(spawnMock);

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'trace'", "trace-case")
        ).resolves.toBeTruthy();

        expect(logs.some((entry) => entry.includes("invoke"))).toBeTruthy();

        expect(createdProcess).not.toBeNull();

        const processRef = requireCreatedProcess(createdProcess);
        const stderrStream = processRef.stderr as PassThrough;

        stderrStream.emit("data", Buffer.from("warning", "utf8"));
        processRef.emit("error", new Error("boom"));
        processRef.emit("exit", 0);

        // Drain the microtask queue so that the async continuations of
        // monitorPersistentProcessError / monitorPersistentProcessExit (which
        // use `await once(proc, "error")` internally) run *before* the spies
        // are restored.  Without this flush the console.error calls happen
        // after mockRestore() and leak into the test runner's stderr stream.
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
