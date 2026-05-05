#!/usr/bin/env node
/**
 * Post-build script to fix .d.cts export syntax for proper CJS type
 * compatibility. Converts `export { plugin as default }` to `export = plugin;`
 * in .d.cts files.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve("dist");
const ctsFile = resolve(distDir, "index.d.cts");

try {
    let content = readFileSync(ctsFile, "utf-8");

    // Replace ESM export syntax with CJS export syntax
    content = content.replace(
        /export\s*\{\s*plugin\s+as\s+default\s*\};?/,
        "export = plugin;"
    );

    writeFileSync(ctsFile, content, "utf-8");
    console.log("✓ Fixed .d.cts exports syntax for CJS compatibility");
} catch (error) {
    console.error("Error fixing .d.cts file:", error.message);
    process.exit(1);
}
