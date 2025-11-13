import { spawnSync } from "node:child_process";
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

const runPowerShellParser = (
    script: string,
    identifier: string
): ParseOutcome => {
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

    const result = spawnSync(
        "pwsh",
        [
            "-NoLogo",
            "-NoProfile",
            "-File",
            validateScriptPath,
            identifier,
        ],
        {
            input: script,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
        }
    );

    if (result.error) {
        if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(missingPwshMessage);
        }
        throw new Error(
            `Failed to invoke PowerShell parser for ${identifier}: ${result.error.message}`
        );
    }

    if (result.status && result.status !== 0) {
        return {
            ok: false,
            exitCode: result.status,
            stdout: result.stdout?.trim() ?? "",
            stderr: result.stderr?.trim() ?? "",
        };
    }

    return { ok: true };
};

export function isPowerShellParsable(
    script: string,
    identifier: string
): boolean {
    if (!shouldRunValidation()) {
        return true;
    }
    const outcome = runPowerShellParser(script, identifier);
    return outcome.ok;
}

export function assertPowerShellParses(
    script: string,
    identifier: string
): void {
    if (!shouldRunValidation()) {
        return;
    }

    const outcome = runPowerShellParser(script, identifier);
    if (!outcome.ok) {
        const message = [outcome.stderr, outcome.stdout]
            .filter((chunk) => chunk.length > 0)
            .join("\n\n");
        throw new Error(
            `PowerShell parser reported errors (exit ${outcome.exitCode}) for ${identifier}:\n${message}`
        );
    }
}
