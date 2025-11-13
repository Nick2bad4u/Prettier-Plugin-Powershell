import { spawn, type ChildProcess } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const shouldVerify = process.env.POWERSHELL_VERIFY_SYNTAX !== "0";
const shouldTrace = process.env.POWERSHELL_SYNTAX_TRACE === "1";
const maxChecksEnv = process.env.POWERSHELL_MAX_SYNTAX_CHECKS;
const defaultMaxChecks = shouldVerify
    ? maxChecksEnv !== undefined
        ? Number.parseInt(maxChecksEnv, 10)
        : -1
    : 0;

let checksRemaining = Number.isNaN(defaultMaxChecks)
    ? Number.POSITIVE_INFINITY
    : defaultMaxChecks < 0
      ? Number.POSITIVE_INFINITY
      : defaultMaxChecks;

let totalInvocations = 0;

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

const validateScriptPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "validate-syntax.ps1"
);

const missingPwshMessage =
    "PowerShell executable 'pwsh' was not found. Install PowerShell 7+ or set POWERSHELL_VERIFY_SYNTAX=0 to disable syntax validation.";

type ParseOutcome =
    | { ok: true }
    | {
          ok: false;
          exitCode: number;
          stdout: string;
          stderr: string;
      };

// Persistent PowerShell process for syntax validation
let persistentProcess: ChildProcess | null = null;
let pendingValidations = new Map<
    number,
    {
        resolve: (outcome: ParseOutcome) => void;
        reject: (error: Error) => void;
    }
>();
let validationCounter = 0;
let responseBuffer = Buffer.alloc(0);

function initPersistentProcess(): void {
    if (persistentProcess) {
        return;
    }

    try {
        persistentProcess = spawn(
            "pwsh",
            ["-NoLogo", "-NoProfile", "-File", validateScriptPath, "-StreamMode"],
            {
                stdio: ["pipe", "pipe", "pipe"],
            }
        );
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(missingPwshMessage);
        }
        throw new Error(
            `Failed to spawn persistent PowerShell process: ${(error as Error).message}`
        );
    }

    if (!persistentProcess.stdin || !persistentProcess.stdout || !persistentProcess.stderr) {
        throw new Error("Failed to access PowerShell process stdio");
    }

    persistentProcess.on("error", (error) => {
        if (shouldTrace) {
            console.error("[powershell-syntax] Process error:", error);
        }
        // Reject all pending validations
        for (const pending of pendingValidations.values()) {
            pending.reject(new Error(`PowerShell process error: ${error.message}`));
        }
        pendingValidations.clear();
        persistentProcess = null;
    });

    persistentProcess.on("exit", (code) => {
        if (shouldTrace) {
            console.log(`[powershell-syntax] Process exited with code ${code}`);
        }
        // Reject all pending validations
        for (const pending of pendingValidations.values()) {
            pending.reject(new Error(`PowerShell process exited unexpectedly with code ${code}`));
        }
        pendingValidations.clear();
        persistentProcess = null;
    });

    // Read responses from stdout
    persistentProcess.stdout.on("data", (chunk: Buffer) => {
        responseBuffer = Buffer.concat([responseBuffer, chunk]);

        // Process complete messages
        while (responseBuffer.length >= 4) {
            const responseLength = responseBuffer.readInt32LE(0);
            if (responseBuffer.length < 4 + responseLength) {
                // Not enough data yet
                break;
            }

            const responseData = responseBuffer.subarray(4, 4 + responseLength);
            responseBuffer = responseBuffer.subarray(4 + responseLength);

            const response = responseData.toString("utf8");
            const lines = response.split("\n");

            if (lines[0] === "OK") {
                // Success - find and resolve the oldest pending validation
                const [[id, pending]] = pendingValidations.entries();
                pendingValidations.delete(id);
                pending.resolve({ ok: true });
            } else if (lines[0] === "ERROR") {
                // Error - extract error message
                const errorMessage = lines.slice(1).join("\n");
                const [[id, pending]] = pendingValidations.entries();
                pendingValidations.delete(id);
                pending.resolve({
                    ok: false,
                    exitCode: 1,
                    stdout: "",
                    stderr: errorMessage,
                });
            }
        }
    });

    // Log stderr for debugging
    if (shouldTrace) {
        persistentProcess.stderr.on("data", (chunk: Buffer) => {
            console.error("[powershell-syntax] stderr:", chunk.toString("utf8"));
        });
    }

    // Cleanup on process exit
    process.on("exit", () => {
        if (persistentProcess) {
            persistentProcess.kill();
        }
    });
}

const runPowerShellParser = async (
    script: string,
    identifier: string
): Promise<ParseOutcome> => {
    return new Promise((resolve, reject) => {
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
            reject(error);
            return;
        }

        if (!persistentProcess || !persistentProcess.stdin) {
            reject(new Error("PowerShell process not available"));
            return;
        }

        const validationId = validationCounter++;
        pendingValidations.set(validationId, { resolve, reject });

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
            reject(error);
        }
    });
};

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
