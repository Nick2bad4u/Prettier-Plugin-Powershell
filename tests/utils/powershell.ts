import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { env: processEnvironment } = process;

const shouldVerify = processEnvironment.POWERSHELL_VERIFY_SYNTAX !== "0";
const shouldTrace = processEnvironment.POWERSHELL_SYNTAX_TRACE === "1";
const maxChecksEnv = processEnvironment.POWERSHELL_MAX_SYNTAX_CHECKS;

const resolveChecksRemaining = (): number => {
    if (!shouldVerify) {
        return 0;
    }

    if (maxChecksEnv === undefined) {
        return Number.POSITIVE_INFINITY;
    }

    const parsed = Number.parseInt(maxChecksEnv, 10);

    return Number.isNaN(parsed) || parsed < 0
        ? Number.POSITIVE_INFINITY
        : parsed;
};

let checksRemaining = resolveChecksRemaining();

let totalInvocations = 0;

const { platform } = process;

const powerShellExecutable = (() => {
    const configuredExecutable = processEnvironment.POWERSHELL_EXECUTABLE;

    if (configuredExecutable !== undefined && configuredExecutable.length > 0) {
        return configuredExecutable;
    }

    const candidates =
        platform === "win32"
            ? [
                  String.raw`C:\Program Files\PowerShell\7\pwsh.exe`,
                  String.raw`C:\Program Files\PowerShell\7-preview\pwsh.exe`,
              ]
            : [
                  "/usr/bin/pwsh",
                  "/usr/local/bin/pwsh",
                  "/opt/microsoft/powershell/7/pwsh",
              ];

    const [firstCandidate] = candidates;

    return (
        candidates.find((candidate) => existsSync(candidate)) ?? firstCandidate
    );
})();

const shouldRunValidation = (): boolean => {
    if (!shouldVerify) {
        return false;
    }
    if (checksRemaining === Number.POSITIVE_INFINITY) {
        return true;
    }
    if (checksRemaining > 0) {
        checksRemaining -= 1;
        return true;
    }
    return false;
};

const validateScriptPath = fileURLToPath(
    new URL("validate-syntax.ps1", import.meta.url)
);

const missingPwshMessage =
    "PowerShell executable 'pwsh' was not found. Install PowerShell 7+ or set POWERSHELL_VERIFY_SYNTAX=0 to disable syntax validation.";

type ParseOutcome =
    | {
          exitCode: number;
          ok: false;
          stderr: string;
          stdout: string;
      }
    | { ok: true };

// Persistent PowerShell process for syntax validation
let persistentProcess: ChildProcess | null = null;
const pendingValidations = new Map<
    number,
    {
        reject: (error: Readonly<Error>) => void;
        resolve: (outcome: Readonly<ParseOutcome>) => void;
    }
>();
let validationCounter = 0;
let responseBuffer = Buffer.alloc(0);

const rejectAllPendingValidations = (message: string): void => {
    for (const pending of pendingValidations.values()) {
        pending.reject(new Error(message));
    }

    pendingValidations.clear();
    persistentProcess = null;
};

const processResponseBuffer = (): void => {
    while (responseBuffer.length >= 4) {
        const responseLength = responseBuffer.readInt32LE(0);
        const fullMessageLength = 4 + responseLength;

        if (responseBuffer.length < fullMessageLength) {
            return;
        }

        const responseData = responseBuffer.subarray(4, fullMessageLength);
        responseBuffer = responseBuffer.subarray(fullMessageLength);

        const oldestPendingEntry = pendingValidations.entries().next().value as
            | [
                  number,
                  {
                      reject: (error: Readonly<Error>) => void;
                      resolve: (outcome: Readonly<ParseOutcome>) => void;
                  },
              ]
            | undefined;

        if (oldestPendingEntry === undefined) {
            return;
        }

        const [id, pending] = oldestPendingEntry;
        const response = responseData.toString("utf8");
        const lines = response.split("\n");

        pendingValidations.delete(id);

        if (lines[0] === "OK") {
            pending.resolve({ ok: true });
        } else if (lines[0] === "ERROR") {
            pending.resolve({
                exitCode: 1,
                ok: false,
                stderr: lines.slice(1).join("\n"),
                stdout: "",
            });
        }
    }
};

const monitorPersistentProcessError = async (
    proc: Readonly<ChildProcess>
): Promise<void> => {
    let error: unknown = undefined;

    try {
        [error] = await once(proc, "error");
    } catch (caughtError) {
        error = caughtError;
    }

    if (shouldTrace) {
        console.error("[powershell-syntax] Process error:", error);
    }

    const message =
        error instanceof Error
            ? `PowerShell process error: ${error.message}`
            : `PowerShell process error: ${String(error)}`;

    rejectAllPendingValidations(message);
};

const monitorPersistentProcessExit = async (
    proc: Readonly<ChildProcess>
): Promise<void> => {
    let code: unknown = undefined;

    try {
        [code] = await once(proc, "exit");
    } catch (caughtError) {
        if (shouldTrace) {
            console.error(
                "[powershell-syntax] Failed while waiting for process exit:",
                caughtError
            );
        }

        return;
    }

    if (shouldTrace) {
        console.log(
            `[powershell-syntax] Process exited with code ${String(code)}`
        );
    }

    rejectAllPendingValidations(
        `PowerShell process exited unexpectedly with code ${String(code)}`
    );
};

const monitorPersistentProcessStdout = async (
    stdout: Readonly<NonNullable<ChildProcess["stdout"]>>
): Promise<void> => {
    for await (const chunk of stdout) {
        responseBuffer = Buffer.concat([
            responseBuffer,
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
        ]);
        processResponseBuffer();
    }
};

const monitorPersistentProcessStderr = async (
    stderr: Readonly<NonNullable<ChildProcess["stderr"]>>
): Promise<void> => {
    for await (const chunk of stderr) {
        console.error(
            "[powershell-syntax] stderr:",
            Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk)
        );
    }
};

const cleanupPersistentProcessOnExit = async (): Promise<void> => {
    await once(process, "exit");

    if (persistentProcess) {
        persistentProcess.kill();
    }
};

void cleanupPersistentProcessOnExit();

function initPersistentProcess(): void {
    if (persistentProcess) {
        return;
    }

    try {
        persistentProcess = spawn(
            powerShellExecutable,
            [
                "-NoLogo",
                "-NoProfile",
                "-File",
                validateScriptPath,
                "-StreamMode",
            ],
            {
                stdio: [
                    "pipe",
                    "pipe",
                    "pipe",
                ],
            }
        );
    } catch (error) {
        if (error instanceof Error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                throw new Error(missingPwshMessage, {
                    cause: error,
                });
            }

            throw new Error(
                `Failed to spawn persistent PowerShell process: ${error.message}`,
                {
                    cause: error,
                }
            );
        }

        throw new Error(
            `Failed to spawn persistent PowerShell process: ${String(error)}`,
            {
                cause: error,
            }
        );
    }

    if (
        !persistentProcess.stdin ||
        !persistentProcess.stdout ||
        !persistentProcess.stderr
    ) {
        throw new Error("Failed to access PowerShell process stdio");
    }

    void monitorPersistentProcessError(persistentProcess);
    void monitorPersistentProcessExit(persistentProcess);
    void monitorPersistentProcessStdout(persistentProcess.stdout);

    if (shouldTrace) {
        void monitorPersistentProcessStderr(persistentProcess.stderr);
    }
}

const runPowerShellParser = async (
    script: string,
    identifier: string
): Promise<ParseOutcome> =>
    new Promise((resolve, reject) => {
        totalInvocations += 1;
        if (shouldTrace) {
            const remaining =
                checksRemaining === Number.POSITIVE_INFINITY
                    ? "inf"
                    : checksRemaining.toString();
            console.log(
                `[powershell-syntax] invoke #${totalInvocations} ${identifier} (remaining=${remaining})`
            );
        }

        try {
            initPersistentProcess();
        } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
        }

        if (!persistentProcess?.stdin) {
            reject(new Error("PowerShell process not available"));
            return;
        }

        const validationId = validationCounter++;
        pendingValidations.set(validationId, { reject, resolve });

        // Encode message: [length][id_length][identifier][script]
        const identifierBuffer = Buffer.from(identifier, "utf8");
        const scriptBuffer = Buffer.from(script, "utf8");

        const idLengthBuffer = Buffer.alloc(4);
        idLengthBuffer.writeInt32LE(identifierBuffer.length, 0);

        const totalLength = 4 + identifierBuffer.length + scriptBuffer.length;
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeInt32LE(totalLength, 0);

        // Write message
        try {
            persistentProcess.stdin.write(lengthBuffer);
            persistentProcess.stdin.write(idLengthBuffer);
            persistentProcess.stdin.write(identifierBuffer);
            persistentProcess.stdin.write(scriptBuffer);
        } catch (error) {
            pendingValidations.delete(validationId);
            reject(error instanceof Error ? error : new Error(String(error)));
        }
    });

export async function assertPowerShellParses(
    script: string,
    identifier: string
): Promise<void> {
    if (!shouldRunValidation()) {
        return;
    }

    const outcome = await runPowerShellParser(script, identifier);
    if (!outcome.ok) {
        const message = [outcome.stderr, outcome.stdout]
            .filter((chunk) => chunk.length > 0)
            .join("\n\n");
        throw new Error(
            `PowerShell parser reported errors (exit ${outcome.exitCode}) for ${identifier}:\n${message}`
        );
    }
}

export async function isPowerShellParsable(
    script: string,
    identifier: string
): Promise<boolean> {
    if (!shouldRunValidation()) {
        return true;
    }
    const outcome = await runPowerShellParser(script, identifier);
    return outcome.ok;
}
