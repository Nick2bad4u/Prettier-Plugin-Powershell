// @ts-nocheck

import { performance } from "node:perf_hooks";
import prettier from "prettier";

const pluginPath = "./dist/index.cjs";

const buildScript = (functionCount) =>
    Array.from(
        { length: functionCount },
        (_, index) =>
            `function Test-${index} { param([string]$Name) Write-Output $Name }`
    ).join("\n");

const formatOnce = async (source) =>
    prettier.format(source, {
        parser: "powershell",
        plugins: [pluginPath],
    });

const runScenario = async (functionCount, iterations) => {
    const script = buildScript(functionCount);
    const sizeKb = Buffer.byteLength(script, "utf8") / 1024;

    await formatOnce(script);

    const times = [];
    for (let index = 0; index < iterations; index += 1) {
        const start = performance.now();
        await formatOnce(script);
        times.push(performance.now() - start);
    }

    const average =
        times.reduce((total, current) => total + current, 0) / times.length;

    return {
        averageMs: Number(average.toFixed(2)),
        functionCount,
        iterations,
        sizeKb: Number(sizeKb.toFixed(2)),
        throughputKbPerSec: Number((sizeKb / (average / 1000)).toFixed(2)),
    };
};

const scenarios = [
    { functionCount: 25, iterations: 20 },
    { functionCount: 100, iterations: 10 },
    { functionCount: 250, iterations: 5 },
];

const results = [];
for (const scenario of scenarios) {
    const result = await runScenario(
        scenario.functionCount,
        scenario.iterations
    );
    results.push(result);
}

console.table(results);
