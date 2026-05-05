// @ts-nocheck

import { performance } from "node:perf_hooks";

const { format } = await import("prettier");
const pluginPath = "./dist/index.cjs";

const buildComplexScript = (count) =>
    Array.from({ length: count }, (_, index) => {
        const functionName = `Invoke-Profile${index}`;

        return `function ${functionName} { param([string]$Name) if ($Name) { Write-Output $Name } }`;
    }).join("\n");

const measure = async (count) => {
    const source = buildComplexScript(count);
    const bytes = Buffer.byteLength(source, "utf8");

    const start = performance.now();
    await format(source, {
        parser: "powershell",
        plugins: [pluginPath],
    });
    const elapsed = performance.now() - start;

    return {
        bytes,
        count,
        elapsedMs: Number(elapsed.toFixed(2)),
        kbPerSec: Number((bytes / 1024 / (elapsed / 1000)).toFixed(2)),
    };
};

const profiles = [
    50,
    250,
    1000,
];
const output = await Promise.all(profiles.map(async (count) => measure(count)));

console.table(output);
