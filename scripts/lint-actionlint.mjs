#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cwd, exit } from "node:process";

/**
 * Runs actionlint when available and returns its exit code. If actionlint is
 * unavailable in the environment, this script logs a clear skip message and
 * exits successfully so broader lint pipelines can continue.
 */
function runActionlint() {
    const args = ["-shellcheck="];

    const result = spawnSync("actionlint", args, {
        cwd: cwd(),
        encoding: "utf8",
        shell: true,
        stdio: "inherit",
    });

    if (result.error?.code === "ENOENT") {
        console.warn(
            "[lint:actions] actionlint not found in PATH; skipping workflow lint."
        );
        return 0;
    }

    const status = result.status;
    if (typeof status === "number") {
        return status;
    }

    console.error(
        "[lint:actions] actionlint did not return a status code; failing defensively."
    );
    return 1;
}

exit(runActionlint());
