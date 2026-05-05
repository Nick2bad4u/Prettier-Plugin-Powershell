import { performance } from "node:perf_hooks";

const { format } = await import("prettier");
const pluginPath = "./dist/index.cjs";

const buildScript = (functionCount) =>
    Array.from(
        { length: functionCount },
        (_, index) =>
            `function Test-${index} { param([string]$Name) Write-Output $Name }`
    ).join("\n");

const formatOnce = async (source) =>
    format(source, {
        parser: "powershell",
        plugins: [pluginPath],
    });

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

    const average = Math.sumPrecise(times) / times.length;

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
