// @ts-nocheck

import { performance } from "node:perf_hooks";
import prettier from "prettier";

const pluginPath = "./dist/index.cjs";

const buildPipelineScript = (segments) =>
    Array.from(
        { length: segments },
        (_, index) => `Get-Process | Where-Object { $_.Id -gt ${index} }`
    ).join("\n");

const profileParser = async () => {
    const testCases = [
        { name: "small", segments: 20 },
        { name: "medium", segments: 200 },
        { name: "large", segments: 1000 },
    ];

    const rows = [];

    for (const testCase of testCases) {
        const source = buildPipelineScript(testCase.segments);
        const sizeKb = Buffer.byteLength(source, "utf8") / 1024;

        const start = performance.now();
        await prettier.format(source, {
            parser: "powershell",
            plugins: [pluginPath],
        });
        const duration = performance.now() - start;

        rows.push({
            case: testCase.name,
            ms: Number(duration.toFixed(2)),
            segments: testCase.segments,
            sizeKb: Number(sizeKb.toFixed(2)),
        });
    }

    console.table(rows);
};

await profileParser();
