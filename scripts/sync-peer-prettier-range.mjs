#!/usr/bin/env node

/**
 * Keep `peerDependencies.prettier` aligned with the currently installed
 * `devDependencies.prettier` upper range.
 *
 * Why: npm does not support `$prettier` indirection in `peerDependencies` (that
 * syntax is supported for `overrides` only), so we synchronize the top-end
 * range explicitly after dependency updates.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * The file path to the package.json file, resolved from the current module's
 * URL. This is used to read and update the package.json file for synchronizing
 * the peer dependency range for prettier.
 *
 * @type {string}
 *
 * @param {string} packageJsonPath - The file path to the package.json file.
 *
 * @see fileURLToPath
 * @see URL
 */
const packageJsonPath = fileURLToPath(
    new URL("../package.json", import.meta.url)
);
/**
 * The minimum supported range for prettier in peer dependencies. This is used
 * as a fallback when the existing peer range is not a valid string or cannot be
 * parsed to determine a floor candidate. This ensures that the peer dependency
 * range does not fall below a certain baseline, which is important for
 * maintaining compatibility with supported versions of prettier.
 *
 * @type {string}
 *
 * @see resolvePeerFloorRange
 */
const minimumSupportedPrettierRange = "^3.0.0";

/**
 * Read and parse package.json.
 *
 * @type {() => Promise<Record<string, unknown>>}
 *
 * @returns {Promise<Record<string, unknown>>}
 *
 * @throws {TypeError} If reading or parsing package.json fails, an error is
 *   thrown with a descriptive message.
 *
 * @see readFile
 * @see fileURLToPath
 */
const readPackageJson = async () => {
    try {
        /** @type {string} */
        const packageJsonContent = await readFile(packageJsonPath, "utf8");
        /** @type {Record<string, unknown>} */
        return JSON.parse(packageJsonContent);
        /** @type {Error} */
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new TypeError(
            `Failed to read package.json at ${packageJsonPath}: ${message}`,
            { cause: error }
        );
    }
};

/**
 * Resolve a floor range from an existing peer range when possible. Falls back
 * to repository baseline.
 *
 * @type {(existingPeerRange: unknown) => string}
 *
 * @param {unknown} existingPeerRange
 *
 * @returns {string}
 */
const resolvePeerFloorRange = (existingPeerRange) => {
    if (typeof existingPeerRange !== "string") {
        return minimumSupportedPrettierRange;
    }

    /** @type {string[]} */
    const [floorCandidate] = existingPeerRange
        .split("||")
        .map((part) => part.trim());

    if (!floorCandidate) {
        return minimumSupportedPrettierRange;
    }

    /** @type {string} */
    return floorCandidate;
};

/**
 * Check whether an unknown runtime value is a non-null object record.
 *
 * @type {(value: unknown) => value is Record<string, unknown>}
 *
 * @param {unknown} value
 *
 * @returns {value is Record<string, unknown>}
 *
 * @throws {TypeError} If the value is not a non-null object, an error is thrown
 *   with a descriptive message.
 */
const isRecord = (value) => typeof value === "object" && value !== null;

const main = async () => {
    /** @type {Record<string, unknown>} */
    const packageJson = await readPackageJson();

    /** @type {unknown} */
    const devDependencies = packageJson["devDependencies"];
    /** @type {unknown} */
    const peerDependencies = packageJson["peerDependencies"];

    if (!isRecord(devDependencies) || !isRecord(peerDependencies)) {
        /** @type {string} */
        throw new TypeError(
            "Expected package.json to include object-valued devDependencies and peerDependencies"
        );
    }

    /** @type {unknown} */
    const devDependencyPrettierRange = devDependencies["prettier"];

    if (
        typeof devDependencyPrettierRange !== "string" ||
        devDependencyPrettierRange.trim().length === 0
    ) {
        throw new TypeError(
            "Expected devDependencies.prettier to be a non-empty string range"
        );
    }

    /** @type {string} */
    const peerFloorRange = resolvePeerFloorRange(peerDependencies["prettier"]);
    /** @type {string} */
    const nextPeerPrettierRange = `${peerFloorRange} || ${devDependencyPrettierRange}`;

    /** @type {string} */
    if (peerDependencies["prettier"] === nextPeerPrettierRange) {
        /** @type {string} */
        console.log(
            `peerDependencies.prettier already aligned: ${nextPeerPrettierRange}`
        );
        /** @type {void} */
        return;
    }

    peerDependencies["prettier"] = nextPeerPrettierRange;
    try {
        /** @type {string} */
        await writeFile(
            /** @type {string} */
            packageJsonPath,
            `${JSON.stringify(packageJson, null, 4)}\n`,
            "utf8"
        );
        /** @type {string} */
        console.log(
            `Updated peerDependencies.prettier to: ${nextPeerPrettierRange}`
        );
    } catch (error) {
        /** @type {Error} */
        throw new TypeError(
            `Failed to write updated package.json with new peerDependencies.prettier: ${error}`,
            { cause: error }
        );
    }
};

/**
 * Execute the synchronization process, handling any errors gracefully. Errors
 * are logged to the console, and the process exits with a non-zero code to
 * indicate failure.
 *
 * @type {() => Promise<void>}
 *
 * @returns {Promise<void>}
 *
 * @throws {Error} If any step of the synchronization process fails, an error is
 *   thrown with a descriptive message.
 * @throws {TypeError} If reading or writing package.json fails, or if the
 *   expected structure of package.json is not met.
 *
 * @see writeFile
 * @see readPackageJson
 * @see isRecord
 * @see resolvePeerFloorRange
 * @see main
 */
try {
    await main();
} catch (error) {
    /** @type {Error} */
    console.error("Failed to synchronize peerDependencies.prettier:", error);
    /** @type {number} */
    process.exitCode = 1;
}
