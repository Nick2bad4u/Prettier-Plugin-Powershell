import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

type MockResponse = { type: "OK" } | { type: "ERROR"; message: string };

type MockProcessHooks = {
    onMessage?: (
        proc: MockProcess,
        respond: (response: MockResponse) => void
    ) => void;
};

class MockProcess extends EventEmitter {
    public readonly stdin: PassThrough;
    public readonly stdout: PassThrough;
    public readonly stderr: PassThrough;
    public readonly kill = vi.fn();

    private readonly responses: MockResponse[];
    private readonly hooks: MockProcessHooks | undefined;
    private buffer = Buffer.alloc(0);
    private totalLength = 0;
    private expectedDataLength = 0;
    private dataCollected = 0;

    constructor(responses: MockResponse[], hooks?: MockProcessHooks) {
        super();
        this.responses = [...responses];
        this.hooks = hooks;
        this.stdin = new PassThrough();
        this.stdout = new PassThrough();
        this.stderr = new PassThrough();

        this.stdin.on("data", (chunk: Buffer) => {
            this.buffer = Buffer.concat([this.buffer, chunk]);
            this.processBuffer();
        });
    }

    private processBuffer(): void {
        while (this.buffer.length > 0) {
            if (this.totalLength === 0) {
                if (this.buffer.length < 4) {
                    return;
                }
                this.totalLength = this.buffer.readInt32LE(0);
                this.buffer = this.buffer.subarray(4);
                continue;
            }

            if (this.expectedDataLength === 0) {
                if (this.buffer.length < 4) {
                    return;
                }
                const identifierLength = this.buffer.readInt32LE(0);
                this.buffer = this.buffer.subarray(4);
                const scriptLength = this.totalLength - 4 - identifierLength;
                this.expectedDataLength = identifierLength + scriptLength; // identifier + script
                this.dataCollected = 0;
                continue;
            }

            if (this.buffer.length === 0) {
                return;
            }

            const remaining = this.expectedDataLength - this.dataCollected;
            const toConsume = Math.min(remaining, this.buffer.length);
            this.buffer = this.buffer.subarray(toConsume);
            this.dataCollected += toConsume;

            if (this.dataCollected < this.expectedDataLength) {
                return;
            }

            // Message complete
            this.totalLength = 0;
            this.expectedDataLength = 0;
            this.dataCollected = 0;

            if (this.hooks?.onMessage) {
                const respond = (response: MockResponse): void => {
                    this.scheduleResponse(response);
                };
                this.hooks.onMessage(this, respond);
            } else {
                const response = this.responses.shift() ?? {
                    type: "OK" as const,
                };
                this.scheduleResponse(response);
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
            this.stdout.push(length);
            this.stdout.push(payload);
        }, 0);
    }
}

function createSpawnMock(
    responses: MockResponse[],
    onCreate?: (proc: MockProcess & ChildProcess) => void,
    hooks?: MockProcessHooks
) {
    return vi.fn(() => {
        const proc = new MockProcess(
            responses,
            hooks
        ) as unknown as MockProcess & ChildProcess;
        onCreate?.(proc);
        return proc;
    });
}

const originalEnv = { ...process.env };

afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    vi.resetModules();
    vi.unmock("node:child_process");
    process.removeAllListeners("exit");
});

describe("PowerShell syntax utilities", () => {
    it("skips validation when POWERSHELL_VERIFY_SYNTAX is 0", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "0",
        };

        const spawnMock = vi.fn();
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { assertPowerShellParses, isPowerShellParsable } = await import(
            "./powershell.js"
        );

        await expect(
            isPowerShellParsable("Write-Host 'hello'", "disabled")
        ).resolves.toBe(true);
        await expect(
            assertPowerShellParses("Write-Host 'hello'", "disabled")
        ).resolves.toBeUndefined();

        expect(spawnMock).not.toHaveBeenCalled();
    });

    it("validates scripts using the persistent process", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        const spawnMock = createSpawnMock([{ type: "OK" }]);
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'ok'", "success")
        ).resolves.toBe(true);

        expect(spawnMock).toHaveBeenCalledTimes(1);
    });

    it("throws when PowerShell reports errors", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        const spawnMock = createSpawnMock([
            { type: "ERROR", message: "Line 1: unexpected token" },
        ]);
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("bad script", "error-case")
        ).rejects.toThrow(
            /PowerShell parser reported errors \(exit 1\) for error-case/
        );
    });

    it("returns false from isPowerShellParsable when parser reports errors", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        const spawnMock = createSpawnMock([
            { type: "ERROR", message: "Syntax failure" },
        ]);
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("bad script", "error-return")
        ).resolves.toBe(false);
    });

    it("limits validation invocations using POWERSHELL_MAX_SYNTAX_CHECKS", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
            POWERSHELL_MAX_SYNTAX_CHECKS: "1",
        };

        const spawnMock = createSpawnMock([{ type: "OK" }]);
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'first'", "limited-1")
        ).resolves.toBe(true);
        await expect(
            isPowerShellParsable("Write-Host 'second'", "limited-2")
        ).resolves.toBe(true);

        expect(spawnMock).toHaveBeenCalledTimes(1);
    });

    it("throws informative error when pwsh executable is missing", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        const spawnMock = vi.fn(() => {
            const error = new Error("not found") as NodeJS.ErrnoException;
            error.code = "ENOENT";
            throw error;
        });
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'hi'", "missing-pwsh")
        ).rejects.toThrow(
            "PowerShell executable 'pwsh' was not found. Install PowerShell 7+ or set POWERSHELL_VERIFY_SYNTAX=0 to disable syntax validation."
        );
    });

    it("wraps unexpected spawn errors with additional context", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        const spawnMock = vi.fn(() => {
            throw new Error("spawn failure");
        });
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'hi'", "spawn-error")
        ).rejects.toThrow(
            "Failed to spawn persistent PowerShell process: spawn failure"
        );
    });

    it("throws when process stdio streams are unavailable", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        const spawnMock = vi.fn(() => {
            const base = new EventEmitter();
            const proc = Object.assign(base, {
                stdin: null,
                stdout: null,
                stderr: null,
            }) as unknown as ChildProcess;
            return proc;
        });
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        await expect(
            assertPowerShellParses("Write-Host 'hi'", "no-stdio")
        ).rejects.toThrow("Failed to access PowerShell process stdio");
    });

    it("rejects pending validations when the process emits an error", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        let createdProcess: (MockProcess & ChildProcess) | null = null;
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
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { assertPowerShellParses } = await import("./powershell.js");

        const parsePromise = assertPowerShellParses(
            "Write-Host 'fail'",
            "process-error"
        );

        expect(createdProcess).not.toBeNull();
        const processRef = createdProcess!;
        processRef.emit("error", new Error("simulated failure"));

        await expect(parsePromise).rejects.toThrow(
            "PowerShell process error: simulated failure"
        );
    });

    it("handles chunked stdout responses from PowerShell", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        const spawnMock = createSpawnMock([], undefined, {
            onMessage: (proc) => {
                const payload = Buffer.from("OK\n", "utf8");
                const length = Buffer.alloc(4);
                length.writeInt32LE(payload.length, 0);

                // Emit length in two chunks to force the parser to wait for remaining bytes.
                proc.stdout.push(length.subarray(0, 2));
                setTimeout(() => {
                    proc.stdout.push(length.subarray(2));
                    // Emit payload in two parts as well.
                    proc.stdout.push(payload.subarray(0, 1));
                    setTimeout(() => {
                        proc.stdout.push(payload.subarray(1));
                    }, 0);
                }, 0);
            },
        });
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'chunks'", "chunked-response")
        ).resolves.toBe(true);
    });

    it("rejects pending validations when the process exits unexpectedly", async () => {
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        let createdProcess: (MockProcess & ChildProcess) | null = null;
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
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

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
        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
        };

        const spawnMock = createSpawnMock([{ type: "OK" }], (proc) => {
            // Force the first write to throw to exercise the error branch.
            const failingWrite = (...args: unknown[]): never => {
                void args;
                throw new Error("stdin write failure");
            };
            proc.stdin.write = failingWrite as typeof proc.stdin.write;
        });
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

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

        process.env = {
            ...originalEnv,
            POWERSHELL_VERIFY_SYNTAX: "1",
            POWERSHELL_SYNTAX_TRACE: "1",
        };

        let createdProcess: (MockProcess & ChildProcess) | null = null;
        const spawnMock = createSpawnMock([{ type: "OK" }], (proc) => {
            createdProcess = proc;
        });
        vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

        const { isPowerShellParsable } = await import("./powershell.js");

        await expect(
            isPowerShellParsable("Write-Host 'trace'", "trace-case")
        ).resolves.toBe(true);

        expect(logs.some((entry) => entry.includes("invoke"))).toBe(true);

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
