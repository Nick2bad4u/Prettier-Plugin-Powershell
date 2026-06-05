import { performance } from "node:perf_hooks";

const { format } = await import("prettier");
const pluginPath = "./dist/index.cjs";

/**
 * Builds a PowerShell pipeline script with the specified number of segments.
 *
 * @param {number} segments - The number of pipeline segments to generate.
 *
 * @returns {string} The generated PowerShell script as a string.
 */
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

    const rows = await Promise.all(
        testCases.map(async (testCase) => {
            const source = buildPipelineScript(testCase.segments);
            const sizeKb = Buffer.byteLength(source, "utf8") / 1024;

            const start = performance.now();
            await format(source, {
                parser: "powershell",
                plugins: [pluginPath],
            });
            const duration = performance.now() - start;

            return {
                case: testCase.name,
                ms: Number(duration.toFixed(2)),
                segments: testCase.segments,
                sizeKb: Number(sizeKb.toFixed(2)),
            };
        })
    );

    process.stdout.write(`${JSON.stringify(rows, null, 4)}\n`);
};

await profileParser();
