import prettier from "prettier";
import { readFileSync } from "fs";
import { performance } from "perf_hooks";

// Generate a large PowerShell script for benchmarking
function generateLargeScript(size) {
    const functions = [];
    for (let i = 0; i < size; i++) {
        functions.push(`
function Test-Function${i} {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [int]$Value = ${i}
    )

    begin {
        $global:counter = 0
    }

    process {
        if ($Name -like "*test*" -and $Value -gt 10) {
            $result = Get-Process | Where-Object { $_.Id -gt 100 }
            $formatted = "Count: {0}" -f $result.Count
            Write-Output $formatted 2>&1 > output.log
        } elseif ($Value -eq ${i} -or $Name -match "^test") {
            $data = @{
                Name = $Name
                Value = $Value
                Result = if ($Value -gt 50) { "High" } else { "Low" }
            }
            return $data
        }
    }

    end {
        $global:counter++
    }
}
`);
    }
    return functions.join("\n");
}

async function benchmark() {
    console.log("PowerShell Formatter Benchmark");
    console.log("================================\n");

    const sizes = [10, 50, 100, 200];
    const results = [];

    for (const size of sizes) {
        const script = generateLargeScript(size);
        const scriptSize = Buffer.byteLength(script, "utf8");

        // Warm-up
        await prettier.format(script, {
            parser: "powershell",
            plugins: ["./dist/index.cjs"],
        });

        // Benchmark
        const iterations = 5;
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await prettier.format(script, {
                parser: "powershell",
                plugins: ["./dist/index.cjs"],
            });
            const end = performance.now();
            times.push(end - start);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        results.push({
            functions: size,
            scriptSizeKB: (scriptSize / 1024).toFixed(2),
            avgTimeMs: avgTime.toFixed(2),
            minTimeMs: minTime.toFixed(2),
            maxTimeMs: maxTime.toFixed(2),
            throughputKBperSec: (scriptSize / 1024 / (avgTime / 1000)).toFixed(2),
        });
    }

    console.log("Results:");
    console.log("--------");
    console.table(results);

    console.log("\nPerformance Summary:");
    const lastResult = results[results.length - 1];
    console.log(`✓ Formatted ${lastResult.functions} functions (${lastResult.scriptSizeKB} KB) in ${lastResult.avgTimeMs}ms`);
    console.log(`✓ Throughput: ${lastResult.throughputKBperSec} KB/sec`);
    console.log(`✓ Min time: ${lastResult.minTimeMs}ms, Max time: ${lastResult.maxTimeMs}ms`);
}

benchmark().catch(console.error);
