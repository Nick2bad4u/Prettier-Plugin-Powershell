import { performance } from "node:perf_hooks";

const { format } = /** @type {{ format: typeof import("prettier").format }} */ (
    await import("prettier")
);
const pluginPath = "./dist/index.cjs";

/**
 * Generates a PowerShell script with the specified number of test functions.
 *
 * @param {number} functionCount - The number of functions to generate in the
 *   script.
 *
 * @returns {string} The generated PowerShell script as a string.
 */
const buildScript = (functionCount) =>
    Array.from(
        { length: functionCount },
        (_, index) =>
            `function Test-${index} { param([string]$Name) Write-Output $Name }`
    ).join("\n");

/**
 * Formats a PowerShell script source string using Prettier and the plugin.
 *
 * @param {string} source - The PowerShell script source to format.
 *
 * @returns {Promise<string>} A promise that resolves to the formatted script.
 */
const formatOnce = async (source) =>
    format(source, {
        parser: "powershell",
        plugins: [pluginPath],
    });

/**
 * Runs a benchmark scenario by formatting a generated PowerShell script
 * multiple times and measuring performance.
 *
 * @param {number} functionCount - The number of functions to generate in the
 *   script.
 * @param {number} iterations - The number of times to format the script for
 *   benchmarking.
 *
 * @returns {Promise<object>} An object containing average time, function count,
 *   iterations, script size, and throughput.
 */
const runScenario = async (functionCount, iterations) => {
    const script = buildScript(functionCount);
    const sizeKb = Buffer.byteLength(script, "utf8") / 1024;

    await formatOnce(script);

    const times = await Promise.all(
        Array.from({ length: iterations }, async () => {
            const start = performance.now();
            await formatOnce(script);
            return performance.now() - start;
        })
    );

    // eslint-disable-next-line math/prefer-math-sum-precise -- doesn't exist yet
    const total = times.reduce((a, b) => a + b, 0);
    const average = total / times.length;

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

const results = await Promise.all(
    scenarios.map(async (scenario) =>
        runScenario(scenario.functionCount, scenario.iterations)
    )
);

console.table(results);
