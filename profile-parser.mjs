import { readFileSync } from "fs";
import { performance } from "perf_hooks";
import prettier from "prettier";

// Profile parser on large files
async function profileParser() {
    console.log("\n📊 Parser Profiling Report");
    console.log("=" .repeat(60));

    // Generate test scripts of varying sizes
    const testCases = [
        { name: "Small (1KB)", size: 1, script: generateScript(10) },
        { name: "Medium (10KB)", size: 10, script: generateScript(100) },
        { name: "Large (50KB)", size: 50, script: generateScript(500) },
        { name: "Very Large (100KB)", size: 100, script: generateScript(1000) },
        { name: "Huge (500KB)", size: 500, script: generateScript(5000) },
    ];

    const results = [];

    for (const testCase of testCases) {
        const actualSize = Buffer.byteLength(testCase.script, "utf8") / 1024;

        // Warm-up
        await prettier.format(testCase.script, {
            parser: "powershell",
            plugins: ["./dist/index.cjs"],
        });

        // Measure parsing time
        const iterations = testCase.size > 100 ? 3 : 10;
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await prettier.format(testCase.script, {
                parser: "powershell",
                plugins: ["./dist/index.cjs"],
            });
            const end = performance.now();
            times.push(end - start);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const throughput = (actualSize / (avgTime / 1000)).toFixed(2);

        results.push({
            Test: testCase.name,
            "Size (KB)": actualSize.toFixed(2),
            "Avg (ms)": avgTime.toFixed(2),
            "Min (ms)": minTime.toFixed(2),
            "Max (ms)": maxTime.toFixed(2),
            "KB/sec": throughput,
        });
    }

    console.table(results);

    // Memory profiling
    console.log("\n💾 Memory Usage Analysis");
    console.log("=" .repeat(60));

    const memBefore = process.memoryUsage();
    const largeScript = generateScript(10000);

    await prettier.format(largeScript, {
        parser: "powershell",
        plugins: ["./dist/index.cjs"],
    });

    const memAfter = process.memoryUsage();

    console.log("Before formatting:");
    console.log(
        `  Heap Used: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(
        `  Heap Total: ${(memBefore.heapTotal / 1024 / 1024).toFixed(2)} MB`
    );

    console.log("\nAfter formatting large file (1MB):");
    console.log(
        `  Heap Used: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(
        `  Heap Total: ${(memAfter.heapTotal / 1024 / 1024).toFixed(2)} MB`
    );

    const heapDelta = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
    console.log(`  Delta: ${heapDelta.toFixed(2)} MB`);

    // GC and check for leaks
    if (global.gc) {
        global.gc();
        const memAfterGC = process.memoryUsage();
        console.log("\nAfter garbage collection:");
        console.log(
            `  Heap Used: ${(memAfterGC.heapUsed / 1024 / 1024).toFixed(2)} MB`
        );
    }

    console.log("\n✅ Profiling complete!");
    console.log("\nRecommendations:");
    console.log("  • Files under 50KB: Excellent performance");
    console.log("  • Files 50-200KB: Good performance");
    console.log("  • Files over 200KB: Consider splitting");
}

function generateScript(functionCount) {
    const functions = [];

    for (let i = 0; i < functionCount; i++) {
        functions.push(`
function Test-Function${i} {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter()]
        [int]$Value = ${i},

        [ValidateSet('Option1', 'Option2', 'Option3')]
        [string]$Choice = 'Option1'
    )

    begin {
        Write-Verbose "Starting Test-Function${i}"
        $global:Counter${i} = 0
    }

    process {
        try {
            if ($Name -like "*test*" -and $Value -gt 10 -and $Choice -eq 'Option1') {
                $result = Get-Process |
                    Where-Object { $_.CPU -gt 100 } |
                    Select-Object Name, CPU, Id |
                    Sort-Object CPU -Descending

                $formatted = "Count: {0}, Value: {1}" -f $result.Count, $Value
                Write-Output $formatted 2>&1 > "output${i}.log"
            } elseif ($Value -eq ${i} -or $Name -match "^test") {
                $data = @{
                    Name = $Name
                    Value = $Value
                    Choice = $Choice
                    Result = if ($Value -gt 50) { "High" } else { "Low" }
                    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                }

                $global:Counter${i}++
                return $data
            }
        } catch {
            Write-Error "Error in Test-Function${i}: $_"
            throw
        }
    }

    end {
        Write-Verbose "Completed Test-Function${i}"
        Write-Output "Processed $global:Counter${i} items"
    }
}
`);
    }

    return functions.join("\n");
}

// Run profiling
profileParser().catch(console.error);
