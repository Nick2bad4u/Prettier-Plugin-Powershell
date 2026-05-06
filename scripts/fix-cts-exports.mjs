#!/usr/bin/env node

/**
 * Post-build script to fix .d.cts export syntax for proper CJS type
 * compatibility. Converts `export { plugin as default }` to `export = plugin;`
 * in .d.cts files.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve("dist");
const ctsFile = resolve(distDir, "index.d.cts");
const cjsFile = resolve(distDir, "index.cjs");

const CJS_SOURCE_MAP_LINE = "//# sourceMappingURL=index.cjs.map";

/**
 * Deduplicates source map footer lines and removes legacy compatibility append.
 *
 * @param {string} content
 *
 * @returns {string}
 */
const sanitizeCjsOutput = (content) => {
    const withoutLegacyCompat = content.replaceAll(
        /\n?module\.exports\s*=\s*module\.exports\.default;\s*\n?/g,
        "\n"
    );

    const normalized = withoutLegacyCompat
        .split(/\r?\n/)
        .filter((line) => line.trim() !== CJS_SOURCE_MAP_LINE)
        .join("\n")
        .trimEnd();

    return `${normalized}\n${CJS_SOURCE_MAP_LINE}\n`;
};

try {
    let content = readFileSync(ctsFile, "utf-8");

    // Replace ESM export syntax with CJS export syntax
    content = content.replace(
        /export\s*\{\s*plugin\s+as\s+default\s*\};?/,
        "export = plugin;"
    );

    writeFileSync(ctsFile, content, "utf-8");

    if (existsSync(cjsFile)) {
        const cjsContent = readFileSync(cjsFile, "utf-8");
        const sanitizedCjs = sanitizeCjsOutput(cjsContent);
        writeFileSync(cjsFile, sanitizedCjs, "utf-8");
    }

    console.log("✓ Fixed .d.cts exports syntax for CJS compatibility");
} catch (error) {
    console.error("Error fixing .d.cts file:", error.message);
    process.exit(1);
}
